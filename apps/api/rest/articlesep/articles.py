"""
核心文章API端点

包含文章列表和文章详情的API实现
"""

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from wagtail.rich_text import expand_db_html

from apps.news.models import ArticlePage
from apps.core.site_utils import get_site_from_request
from ..utils import (
    validate_site_parameter,
    apply_field_filtering,
    apply_include_expansion,
    apply_filtering,
    apply_ordering,
    generate_cache_key,
    generate_etag,
    generate_surrogate_keys
)
from ..utils.rate_limit import ARTICLES_RATE_LIMIT
from ..utils.cache_performance import monitor_cache_performance


@api_view(["GET"])
@ARTICLES_RATE_LIMIT
@monitor_cache_performance("articles_list")
def articles_list(request):
    """
    获取文章列表
    
    支持参数：
    - site: 站点标识（主机名或site_id）
    - fields: 字段白名单选择
    - include: 关联展开
    - channel: 频道过滤
    - region: 地区过滤
    - categories: 分类过滤（多选，逗号分隔）
    - topics: 专题过滤（多选，逗号分隔）
    - q: 搜索关键词
    - is_featured: 是否置顶推荐
    - is_hero: 是否首页轮播
    - since: 时间过滤
    - order: 排序
    - page: 分页
    - size: 每页大小
    """
    try:
        # 1. 验证站点参数
        site = validate_site_parameter(request)
        if not site:
            return Response(
                {"error": "Invalid or missing site parameter"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 2. 获取查询参数
        fields = request.query_params.get("fields", "").split(",") if request.query_params.get("fields") else []
        includes = request.query_params.get("include", "").split(",") if request.query_params.get("include") else []
        page = int(request.query_params.get("page", 1))
        size = min(int(request.query_params.get("size", 20)), 100)  # 限制最大100条
        
        # 3. 构建基础查询 - 性能优化版本
        queryset = ArticlePage.objects.live().filter(path__startswith=site.root_page.path)
        
        # 4. 应用过滤
        queryset = apply_filtering(queryset, request.query_params)
        
        # 5. 应用排序
        queryset = apply_ordering(queryset, request.query_params.get("order", "-publish_at"))
        
        # 6. 性能优化：预取关联数据，避免N+1查询
        queryset = queryset.select_related('channel', 'region', 'cover').prefetch_related('topics', 'tags', 'categories')
        
        # 7. 分页 - 优化版本，避免重复count查询
        total_count = queryset.count()
        start = (page - 1) * size
        end = start + size
        articles = queryset[start:end]
        
        # 8. 序列化数据 - 批量处理，避免重复数据库查询
        serialized_articles = []
        for article in articles:
            article_data = {
                "id": article.id,
                "title": article.title,
                "slug": article.slug,
                "excerpt": getattr(article, 'introduction', ''),
                "publish_at": article.first_published_at.isoformat() if article.first_published_at else None,
                "updated_at": article.last_published_at.isoformat() if article.last_published_at else None,
                "channel_slug": getattr(article.channel, 'slug', '') if article.channel else '',
                "region": getattr(article.region, 'name', '') if article.region else '',
                "topic_slug": '',  # topics是多对多字段，暂时留空
                "topic_title": '',  # topics是多对多字段，暂时留空
                "category_names": article.get_category_names() if hasattr(article, 'get_category_names') else [],
                "is_featured": getattr(article, 'is_featured', False),
                "is_hero": getattr(article, 'is_hero', False),
                "weight": getattr(article, 'weight', 0),
                "allow_aggregate": getattr(article, 'allow_aggregate', True),
                "canonical_url": getattr(article, 'canonical_url', ''),
                "source_site": site.id if hasattr(article, 'source_site') and article.source_site else site.id
            }
            
            # 应用字段过滤
            if fields:
                article_data = apply_field_filtering(article_data, fields)
            
            # 应用关联展开
            if includes:
                article_data = apply_include_expansion(article_data, includes, article, site)
            
            serialized_articles.append(article_data)
        
        # 9. 构建响应 - 使用已计算的total_count
        response_data = {
            "items": serialized_articles,
            "pagination": {
                "page": page,
                "size": size,
                "total": total_count,
                "has_next": end < total_count,
                "has_prev": page > 1
            },
            "meta": {
                "site": site.hostname,
                "site_id": site.id
            }
        }
        
        # 10. 检查条件请求
        from ..utils import should_return_304, get_last_modified, generate_etag_with_cache
        
        # 获取最后修改时间
        last_modified = get_last_modified(articles)
        
        # 生成缓存键
        cache_key = f"articles_list:{site.id}:{page}:{size}"
        
        # 生成ETag（优先使用时间戳）
        etag = generate_etag_with_cache(cache_key, response_data, last_modified, 120)
        
        # 检查是否应该返回304
        if should_return_304(request, etag):
            response = Response(status=status.HTTP_304_NOT_MODIFIED)
            response["ETag"] = f'"{etag}"'
            return response
        
        # 11. 生成缓存相关头部
        response = Response(response_data)
        
        # Cache-Control
        response["Cache-Control"] = "public, s-maxage=120, stale-while-revalidate=60"
        
        # ETag
        response["ETag"] = f'"{etag}"'
        
        # Last-Modified
        if last_modified:
            response["Last-Modified"] = last_modified.strftime('%a, %d %b %Y %H:%M:%S GMT')
        
        # Surrogate-Key
        surrogate_keys = generate_surrogate_keys(site, articles)
        response["Surrogate-Key"] = " ".join(surrogate_keys)
        
        return response
        
    except Exception as e:
        return Response(
            {"error": f"Internal server error: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["GET"])
@ARTICLES_RATE_LIMIT
@monitor_cache_performance("article_detail")
def article_detail(request, slug):
    """
    获取文章详情
    
    支持参数：
    - site: 站点标识（主机名或site_id）
    - fields: 字段白名单选择
    - include: 关联展开
    """
    try:
        # 1. 验证站点参数
        site = validate_site_parameter(request)
        if not site:
            return Response(
                {"error": "Invalid or missing site parameter"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 2. 获取查询参数
        fields = request.query_params.get("fields", "").split(",") if request.query_params.get("fields") else []
        includes = request.query_params.get("include", "").split(",") if request.query_params.get("include") else []
        
        # 3. 查询文章 - 性能优化版本（同时兼容 slug 或 数字ID）
        queryset = ArticlePage.objects.live().descendant_of(
            site.root_page
        ).select_related(
            'channel', 'region'
        ).prefetch_related('tags')
        
        article = None
        try:
            # 优先按 slug 精确匹配
            article = queryset.get(slug=slug)
        except ArticlePage.DoesNotExist:
            # 若 slug 看起来是数字，则按ID回退
            if str(slug).isdigit():
                try:
                    article = queryset.get(id=int(slug))
                except ArticlePage.DoesNotExist:
                    article = None
            else:
                article = None
        
        if not article:
            return Response(
                {"error": "Article not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # 4. 序列化数据 - 使用预取的关联数据
        article_data = {
            "id": article.id,
            "title": article.title,
            "slug": article.slug,
            "excerpt": getattr(article, 'introduction', ''),
            "body": expand_db_html(article.body).replace('http://authoring:8000', 'http://192.168.8.195:8000') if hasattr(article, 'body') and article.body else '',
            "publish_at": article.first_published_at.isoformat() if article.first_published_at else None,
            "updated_at": article.last_published_at.isoformat() if article.last_published_at else None,
            "channel_slug": getattr(article.channel, 'slug', '') if article.channel else '',
            "region": getattr(article.region, 'name', '') if article.region else '',
            "is_featured": getattr(article, 'is_featured', False),
            "weight": getattr(article, 'weight', 0),
            "allow_aggregate": getattr(article, 'allow_aggregate', True),
            "canonical_url": getattr(article, 'canonical_url', ''),
            "source_site": site.id if hasattr(article, 'source_site') and article.source_site else site.id,
            "author_name": getattr(article, 'author_name', ''),
            "has_video": getattr(article, 'has_video', False),
            "language": getattr(article.language, 'code', 'zh') if hasattr(article, 'language') and article.language else 'zh'
        }
        
        # 应用字段过滤
        if fields:
            article_data = apply_field_filtering(article_data, fields)
        
        # 应用关联展开
        if includes:
            article_data = apply_include_expansion(article_data, includes, article, site)
        
        # 5. 构建响应
        response_data = {
            "article": article_data,
            "meta": {
                "site": site.hostname,
                "site_id": site.id
            }
        }
        
        # 6. 检查条件请求
        from ..utils import should_return_304, get_last_modified, generate_etag_with_cache
        
        # 获取最后修改时间
        last_modified = get_last_modified(article)
        
        # 生成缓存键
        cache_key = f"article_detail:{site.id}:{article.slug}"
        
        # 生成ETag（优先使用时间戳）
        etag = generate_etag_with_cache(cache_key, response_data, last_modified, 120)
        
        # 检查是否应该返回304
        if should_return_304(request, etag):
            response = Response(status=status.HTTP_304_NOT_MODIFIED)
            response["ETag"] = f'"{etag}"'
            return response
        
        # 7. 生成缓存相关头部
        response = Response(response_data)
        
        # Cache-Control
        response["Cache-Control"] = "public, s-maxage=120, stale-while-revalidate=60"
        
        # ETag
        response["ETag"] = f'"{etag}"'
        
        # Last-Modified
        if last_modified:
            response["Last-Modified"] = f"{last_modified.strftime('%a, %d %b %Y %H:%M:%S GMT')}"
        
        # Surrogate-Key
        surrogate_keys = generate_surrogate_keys(site, [article])
        response["Surrogate-Key"] = " ".join(surrogate_keys)
        
        return response
        
    except Exception as e:
        return Response(
            {"error": f"Internal server error: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
