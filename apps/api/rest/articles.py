"""
文章API端点 - 新设计规范实现

实现设计文档中要求的REST API规范：
- 支持字段白名单选择
- 支持关联展开
- 支持多种过滤和排序
- 实现缓存策略
"""

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from apps.news.models import ArticlePage
from apps.core.models import Channel, Region, SiteSettings
from apps.core.site_utils import get_site_from_request
from apps.searchapp.client import get_client
from apps.searchapp.alias import read_alias
from .utils import (
    validate_site_parameter,
    apply_field_filtering,
    apply_include_expansion,
    apply_filtering,
    apply_ordering,
    generate_cache_key,
    generate_etag,
    generate_surrogate_keys
)
from ..utils.rate_limit import (
    ARTICLES_RATE_LIMIT,
    CHANNELS_RATE_LIMIT,
    REGIONS_RATE_LIMIT,
    SITE_SETTINGS_RATE_LIMIT,
    PORTAL_ARTICLES_RATE_LIMIT
)
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
    - q: 搜索关键词
    - is_featured: 是否置顶
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
        queryset = queryset.select_related('channel', 'region').prefetch_related('tags')
        
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
                "is_featured": getattr(article, 'is_featured', False),
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
        
        # 9. 检查条件请求
        from .utils import should_return_304, get_last_modified, generate_etag_with_cache
        
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
        
        # 10. 生成缓存相关头部
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
            "body": str(article.body) if hasattr(article, 'body') else '',
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
        from .utils import should_return_304, get_last_modified, generate_etag_with_cache
        
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


@api_view(["GET"])
@CHANNELS_RATE_LIMIT
@monitor_cache_performance("channels_list")
def channels_list(request):
    """
    获取频道列表
    
    支持参数：
    - site: 站点标识（主机名或site_id）
    - fields: 字段白名单选择
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
        
        # 3. 查询频道 - 性能优化版本
        channels = Channel.objects.filter(sites=site).select_related().order_by('order', 'name')
        
        # 4. 序列化数据 - 批量处理
        serialized_channels = [
            {
                "id": channel.id,
                "slug": channel.slug,
                "name": channel.name,
                "order": getattr(channel, 'order', 0)
            }
            for channel in channels
        ]
        
        # 应用字段过滤
        if fields:
            serialized_channels = [
                apply_field_filtering(channel_data, fields) 
                for channel_data in serialized_channels
            ]
        
        # 5. 构建响应
        response_data = {
            "channels": serialized_channels,
            "meta": {
                "site": site.hostname,
                "site_id": site.id,
                "total": len(serialized_channels)
            }
        }
        
        # 6. 生成缓存相关头部
        response = Response(response_data)
        
        # Cache-Control
        response["Cache-Control"] = "public, s-maxage=300, stale-while-revalidate=60"
        
        # ETag
        etag = generate_etag(response_data)
        response["ETag"] = f'"{etag}"'
        
        # Surrogate-Key
        surrogate_keys = [f"site:{site.hostname}", "channels:all"]
        response["Surrogate-Key"] = " ".join(surrogate_keys)
        
        return response
        
    except Exception as e:
        return Response(
            {"error": f"Internal server error: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["GET"])
def regions_list(request):
    """
    获取地区列表
    
    支持参数：
    - site: 站点标识（主机名或site_id）
    - fields: 字段白名单选择
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
        
        # 3. 查询地区
        regions = Region.objects.filter(sites=site).order_by('order', 'name')
        
        # 4. 序列化数据
        serialized_regions = []
        for region in regions:
            region_data = {
                "id": region.id,
                "slug": region.slug,
                "name": region.name,
                "order": getattr(region, 'order', 0)
            }
            
            # 应用字段过滤
            if fields:
                region_data = apply_field_filtering(region_data, fields)
            
            serialized_regions.append(region_data)
        
        # 5. 构建响应
        response_data = {
            "regions": serialized_regions,
            "meta": {
                "site": site.hostname,
                "site_id": site.id,
                "total": len(serialized_regions)
            }
        }
        
        # 6. 生成缓存相关头部
        response = Response(response_data)
        
        # Cache-Control
        response["Cache-Control"] = "public, s-maxage=300, stale-while-revalidate=60"
        
        # ETag
        etag = generate_etag(response_data)
        response["ETag"] = f'"{etag}"'
        
        # Surrogate-Key
        surrogate_keys = [f"site:{site.hostname}", "regions:all"]
        response["Surrogate-Key"] = " ".join(surrogate_keys)
        
        return response
        
    except Exception as e:
        return Response(
            {"error": f"Internal server error: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["GET"])
def portal_articles(request):
    """
    门户聚合文章接口
    
    只返回摘要，不返回正文，用于门户聚合展示
    支持参数：
    - allow_aggregate: 是否允许聚合（默认true）
    - fields: 字段白名单选择
    - channel: 频道过滤
    - region: 地区过滤
    - q: 搜索关键词
    - is_featured: 是否置顶
    - since: 时间过滤
    - order: 排序
    - page: 分页
    - size: 每页大小
    """
    try:
        # 1. 参数
        allow_aggregate = request.query_params.get("allow_aggregate", "true").lower() == "true"
        fields = request.query_params.get("fields", "").split(",") if request.query_params.get("fields") else []
        channel = request.query_params.get("channel")
        page = max(1, int(request.query_params.get("page", 1)))
        size = min(int(request.query_params.get("size", 20)), 100)
        start_from = (page - 1) * size

        # 2. 站点与索引
        site = get_site_from_request(request)
        client = get_client()
        index = read_alias(site)

        # 3. OpenSearch 查询构建
        must = []
        if channel:
            must.append({"term": {"primary_channel_slug.keyword": channel}})
        body = {
            "query": {"bool": {"must": must or [{"match_all": {}}]}},
            "sort": [{"first_published_at": {"order": "desc"}}, {"article_id": {"order": "desc"}}],
            "from": start_from,
            "size": size,
            "track_total_hits": True,
        }

        # 4. 执行查询
        res = client.search(index=index, body=body)
        hits = res.get("hits", {})
        total = hits.get("total", {}).get("value", 0)

        # 5. 序列化
        items = []
        for h in hits.get("hits", []):
            s = h.get("_source", {})
            item = {
                "id": s.get("article_id") or h.get("_id"),
                "title": s.get("title"),
                "slug": s.get("slug"),
                "excerpt": s.get("summary") or "",
                "cover_url": "",  # 可后续扩展
                "publish_at": s.get("first_published_at") or s.get("publish_time"),
                "channel_slug": s.get("primary_channel_slug") or s.get("channel"),
                "region": s.get("region"),
                "source_site": site,
                "source_url": s.get("url") or "",
                "canonical_url": s.get("url") or "",
            }
            if fields:
                item = apply_field_filtering(item, fields)
            items.append(item)

        # 6. 响应
        response_data = {
            "items": items,
            "pagination": {
                "page": page,
                "size": size,
                "total": total,
                "has_next": (page * size) < total,
                "has_prev": page > 1,
            },
            "meta": {"type": "portal_aggregation", "allow_aggregate": allow_aggregate, "site": site},
        }

        response = Response(response_data)
        response["Cache-Control"] = "public, s-maxage=120, stale-while-revalidate=60"
        from .utils import generate_etag
        etag = generate_etag(response_data)
        response["ETag"] = f'"{etag}"'
        response["Surrogate-Key"] = "portal:aggregation articles:all"
        return response

    except Exception as e:
        return Response({"error": f"Internal server error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@SITE_SETTINGS_RATE_LIMIT
@monitor_cache_performance("site_settings")
def site_settings(request):
    """
    获取站点配置
    
    支持参数：
    - site: 站点标识（主机名或site_id）
    """
    try:
        # 1. 验证站点参数
        site = validate_site_parameter(request)
        if not site:
            return Response(
                {"error": "Invalid or missing site parameter"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 2. 获取站点配置
        try:
            settings = SiteSettings.get_for_site(site)
        except SiteSettings.DoesNotExist:
            # 如果站点配置不存在，创建默认配置
            settings = SiteSettings.objects.create(
                site=site,
                brand_name=site.site_name,
                theme_key="localsite-default",
                layout_key="layout-localsite-grid",
                brand_tokens={
                    "primary": "#3B82F6",
                    "secondary": "#6B7280",
                    "font": "Inter, sans-serif",
                    "radius": "0.5rem",
                    "shadow": "0 1px 3px rgba(0,0,0,0.1)"
                },
                modules={
                    "home": ["hero", "top-news", "channels"],
                    "sidebar": ["rank", "ad"]
                }
            )
        
        # 3. 构建前端规划需要的数据结构
        site_settings_data = {
            "site_id": site.id,
            "site_name": site.site_name,
            "hostname": site.hostname,
            "port": site.port,
            "is_default_site": site.is_default_site,
            "root_page_id": site.root_page_id,
            
            # 前端布局配置（核心）
            "theme_key": settings.theme_key,
            "layout_key": settings.layout_key,
            "brand_tokens": settings.brand_tokens or {
                "primary": settings.primary_color,
                "secondary": settings.secondary_color,
                "font": settings.font_family,
                "radius": "0.5rem",
                "shadow": "0 1px 3px rgba(0,0,0,0.1)"
            },
            "modules": settings.modules or {
                "home": ["hero", "top-news", "channels"],
                "sidebar": ["rank", "ad"]
            },
            
            # 品牌配置
            "brand": {
                "name": settings.brand_name or site.site_name,
                "logo_url": settings.brand_logo or settings.logo_url or "",
                "description": settings.brand_description or ""
            },
            
            # SEO配置  
            "seo": {
                # 站点级SEO
                "site_title": settings.site_title or site.site_name,
                "site_description": settings.site_description or "",
                "site_keywords": getattr(settings, 'site_keywords', ''),
                
                # 页面级SEO模板
                "page_title_template": getattr(settings, 'page_title_template', '{title} - {site_name}'),
                "page_description_template": getattr(settings, 'page_description_template', ''),
                "auto_seo_enabled": getattr(settings, 'auto_seo_enabled', True)
            },
            
            # 分析配置
            "analytics": {
                "google_analytics_id": settings.google_analytics_id or "",
                "track_user_behavior": getattr(settings, 'track_user_behavior', True)
            },
            
            # 功能开关
            "features": {
                "recommendation": settings.recommendation,
                "search_enabled": settings.search_enabled,
                "comments_enabled": settings.comments_enabled,
                "user_registration": settings.user_registration,
                "social_login": settings.social_login,
                "content_moderation": settings.content_moderation,
                "api_access": settings.api_access,
                "rss_feed": settings.rss_feed,
                "sitemap": settings.sitemap
            },
            
            # 页脚配置
            "footer": {
                "links": [],  # TODO: 实现页脚链接
                "copyright": f"© 2024 {settings.brand_name or site.site_name}. All rights reserved."
            }
        }
        
        # 4. 构建响应
        response_data = {
            "settings": site_settings_data,
            "meta": {
                "site": site.hostname,
                "site_id": site.id,
                "theme_key": settings.theme_key,
                "layout_key": settings.layout_key
            }
        }
        
        # 5. 生成缓存相关头部
        response = Response(response_data)
        
        # Cache-Control
        response["Cache-Control"] = "public, s-maxage=600, stale-while-revalidate=300"
        
        # ETag
        etag = generate_etag(response_data)
        response["ETag"] = f'"{etag}"'
        
        # Surrogate-Key - 包含前端布局相关的标签
        surrogate_keys = [
            f"site:{site.hostname}", 
            "settings:all",
            f"theme:{settings.theme_key}",
            f"layout:{settings.layout_key}"
        ]
        response["Surrogate-Key"] = " ".join(surrogate_keys)
        
        return response
        
    except Exception as e:
        return Response(
            {"error": f"Internal server error: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
