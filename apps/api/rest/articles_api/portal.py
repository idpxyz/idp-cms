"""
门户聚合API端点

包含门户聚合文章功能
"""

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from apps.core.site_utils import get_site_from_request
from apps.searchapp.client import get_client
from apps.searchapp.simple_index import get_index_name
from ..utils import apply_field_filtering, generate_etag
from ...utils.rate_limit import PORTAL_ARTICLES_RATE_LIMIT


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
        index = get_index_name(site)

        # 3. OpenSearch 查询构建
        must = []
        if channel:
            must.append({"term": {"primary_channel_slug": channel}})
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
        etag = generate_etag(response_data)
        response["ETag"] = f'"{etag}"'
        response["Surrogate-Key"] = "portal:aggregation articles:all"
        return response

    except Exception as e:
        return Response({"error": f"Internal server error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
