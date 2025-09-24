"""
门户聚合API端点

包含门户聚合文章的API实现
"""

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from apps.core.site_utils import get_site_from_request
from apps.searchapp.client import get_client
from apps.searchapp.simple_index import get_index_name
from ..utils import apply_field_filtering, generate_etag
from ..utils.rate_limit import PORTAL_ARTICLES_RATE_LIMIT


@api_view(["GET"])
@PORTAL_ARTICLES_RATE_LIMIT
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
        categories = request.query_params.get("categories")  # 逗号分隔
        page = max(1, int(request.query_params.get("page", 1)))
        size = min(int(request.query_params.get("size", 20)), 100)
        start_from = (page - 1) * size

        # 2. 站点与索引
        site = get_site_from_request(request)
        client = get_client()
        index = get_index_name(site)  # 🎯 使用简化索引

        # 3. OpenSearch 查询构建
        must = []
        if channel:
            must.append({"term": {"primary_channel_slug.keyword": channel}})
        if categories:
            cats = [c.strip() for c in categories.split(',') if c.strip()]
            if cats:
                must.append({"terms": {"categories": cats}})
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

        # 5. 序列化 - 增强图片数据获取
        items = []
        article_ids = []
        
        # 收集文章ID用于批量查询图片
        for h in hits.get("hits", []):
            s = h.get("_source", {})
            article_id = s.get("article_id") or h.get("_id")
            article_ids.append(article_id)
        
        # 批量查询文章的封面图片和统计数据
        article_data = {}
        if article_ids:
            from apps.news.models.article import ArticlePage
            articles_query = ArticlePage.objects.filter(
                id__in=article_ids
            ).select_related('cover').values(
                'id', 'cover__file', 'cover__title',
                'view_count', 'comment_count', 'like_count', 'favorite_count', 'reading_time',
                'author_name', 'is_featured', 'weight'
            )
            
            # 使用存储后端统一生成媒体URL，避免硬编码 /media 前缀
            from apps.core.storages import PublicMediaStorage
            storage = PublicMediaStorage()

            for article in articles_query:
                article_id = str(article['id'])
                data = {
                    'view_count': article['view_count'] or 0,
                    'comment_count': article['comment_count'] or 0,
                    'like_count': article['like_count'] or 0,
                    'favorite_count': article['favorite_count'] or 0,
                    'reading_time': article['reading_time'] or 1,
                    'author_name': article['author_name'] or '',
                    'is_featured': article['is_featured'] or False,
                    'weight': article['weight'] or 0,
                    'cover_url': '',
                    'cover_title': ''
                }
                
                # 处理封面图片
                if article['cover__file']:
                    data['cover_url'] = storage.url(article['cover__file'])
                    data['cover_title'] = article['cover__title'] or ''
                
                article_data[article_id] = data
        
        # 构建响应项目
        for h in hits.get("hits", []):
            s = h.get("_source", {})
            article_id = s.get("article_id") or h.get("_id")
            
            # 获取文章数据（图片和统计信息）
            data = article_data.get(str(article_id), {})
            cover_url = data.get('cover_url', '')
            
            item = {
                "id": article_id,
                "title": s.get("title"),
                "slug": s.get("slug"),
                "excerpt": s.get("summary") or "",
                "cover_url": cover_url,  # 从数据库获取实际图片
                "image_url": cover_url,  # 兼容性字段
                "publish_at": s.get("first_published_at") or s.get("publish_time"),
                "channel_slug": s.get("primary_channel_slug") or s.get("channel"),
                "region": s.get("region"),
                "source_site": site,
                "source_url": s.get("url") or "",
                "canonical_url": s.get("url") or "",
                "author": data.get('author_name') or s.get("author"),  # 优先使用数据库中的作者
                "has_video": s.get("has_video", False),  # 添加视频标识
                "is_featured": data.get('is_featured', False),  # 添加推荐标识
                "weight": data.get('weight', 0),  # 添加权重字段
                # 统计数据
                "view_count": data.get('view_count', 0),
                "comment_count": data.get('comment_count', 0), 
                "like_count": data.get('like_count', 0),
                "favorite_count": data.get('favorite_count', 0),
                "reading_time": data.get('reading_time', 1),
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
        etag = generate_etag(response_data)
        response["ETag"] = f'"{etag}"'
        response["Surrogate-Key"] = "portal:aggregation articles:all"
        return response

    except Exception as e:
        return Response({"error": f"Internal server error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
