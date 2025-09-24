from django.db.models import Count
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.response import Response
from ..utils.rate_limit import FEED_RATE_LIMIT as TAG_RATE_LIMIT
from apps.core.site_utils import get_site_from_request
from apps.searchapp.client import get_client
from apps.searchapp.simple_index import get_index_name  # 🎯 使用简化索引


@api_view(["GET"])
@throttle_classes([])
@TAG_RATE_LIMIT
def top_tags(request):
    """
    OpenSearch terms 聚合热门标签
    参数：size（默认30）
    """
    try:
        size = max(1, min(int(request.query_params.get("size", 30)), 200))
    except Exception:
        size = 30
    site_obj = get_site_from_request(request)
    site = site_obj.hostname if site_obj else None
    client = get_client()
    index = get_index_name(site or "localhost")  # 🎯 使用简化索引
    body = {
        "size": 0,
        "aggs": {"top_tags": {"terms": {"field": "tags", "size": size}}}
    }
    try:
        res = client.search(index=index, body=body)
        buckets = res.get("aggregations", {}).get("top_tags", {}).get("buckets", [])
        data = [{"name": b.get("key"), "slug": b.get("key"), "count": b.get("doc_count", 0)} for b in buckets]
    except Exception:
        data = []
    return Response({"tags": data})


@api_view(["GET"])
@throttle_classes([])
@TAG_RATE_LIMIT
def tag_articles(request, tag_slug: str):
    """
    使用 OpenSearch 查询指定标签的文章（按 first_published_at 降序）。
    参数：size（默认20，最大100），page（默认1）
    """
    try:
        size = max(1, min(int(request.query_params.get("size", 20)), 100))
    except Exception:
        size = 20
    try:
        page = max(1, int(request.query_params.get("page", 1)))
    except Exception:
        page = 1
    from_ = (page - 1) * size

    site_obj = get_site_from_request(request)
    site = site_obj.hostname if site_obj else None
    client = get_client()
    index = get_index_name(site or "localhost")  # 🎯 使用简化索引

    body = {
        "query": {"bool": {"must": [{"term": {"tags": tag_slug}}]}},
        "sort": [{"first_published_at": {"order": "desc"}}, {"article_id": {"order": "desc"}}],
        "from": from_,
        "size": size,
        "track_total_hits": True,
    }
    try:
        res = client.search(index=index, body=body)
        hits = res.get("hits", {})
        total = hits.get("total", {}).get("value", 0)
        items = []
        for h in hits.get("hits", []):
            s = h.get("_source", {})
            items.append({
                "id": s.get("article_id") or h.get("_id"),
                "slug": s.get("slug"),
                "title": s.get("title"),
                "excerpt": s.get("summary") or "",
                "publish_at": s.get("first_published_at") or s.get("publish_time"),
                "channel": s.get("primary_channel_slug") or s.get("channel"),
            })
    except Exception:
        total, items = 0, []

    return Response({"tag": tag_slug, "total": total, "page": page, "size": size, "hits": items})
