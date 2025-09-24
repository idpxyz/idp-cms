from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from apps.api.rest.utils import validate_site_parameter
from apps.searchapp.client import get_client
from apps.searchapp.simple_index import get_index_name  # 🎯 使用简化索引


@api_view(["GET"])
def search_os(request):
    """
    OpenSearch 驱动的站内搜索
    支持参数：site, q, channel, categories, since, order(rel|time|hot), page, size
    """
    try:
        # 1) 站点
        site = validate_site_parameter(request)
        if not site:
            return Response({"error": "Invalid or missing site parameter"}, status=status.HTTP_400_BAD_REQUEST)

        # 2) 参数
        q = request.query_params.get("q", "").strip()
        channel = request.query_params.get("channel")
        categories_param = request.query_params.get("categories")
        since = request.query_params.get("since")  # e.g. 24h, 7d
        order = (request.query_params.get("order") or "rel").lower()
        page = max(1, int(request.query_params.get("page", 1)))
        size = min(int(request.query_params.get("size", 20)), 100)
        start_from = (page - 1) * size

        # 3) 构建查询
        must = []
        filters = []

        # 关键词
        if q:
            must.append({
                "multi_match": {
                    "query": q,
                    "fields": ["title^5", "summary^2", "body"],
                    "type": "best_fields"
                }
            })

        # 频道过滤
        if channel:
            filters.append({"term": {"primary_channel_slug.keyword": channel}})

        # 分类过滤
        if categories_param:
            cats = [c.strip() for c in categories_param.split(',') if c.strip()]
            if cats:
                filters.append({"terms": {"categories": cats}})

        # 时间过滤
        if since:
            import datetime
            from django.utils import timezone
            now = timezone.now()
            gte = None
            try:
                # 确保 since 是字符串
                since_str = str(since) if since else ""
                if since_str.endswith('h'):
                    hours = int(since_str[:-1])
                    gte = now - datetime.timedelta(hours=hours)
                elif since_str.endswith('d'):
                    days = int(since_str[:-1])
                    gte = now - datetime.timedelta(days=days)
                elif since_str:
                    # ISO8601
                    gte = datetime.datetime.fromisoformat(since_str.replace('Z', '+00:00'))
            except Exception:
                gte = None
            if gte:
                filters.append({
                    "range": {"first_published_at": {"gte": gte.isoformat()}}
                })

        query = {"bool": {}}
        if must:
            query["bool"]["must"] = must
        else:
            query["bool"]["must"] = [{"match_all": {}}]
        if filters:
            query["bool"]["filter"] = filters

        # 排序
        sort = []
        if order in ("time", "-first_published_at"):
            sort = [{"first_published_at": {"order": "desc"}}, {"article_id": {"order": "desc"}}]
        elif order in ("hot", "-pop_24h"):
            sort = [{"pop_24h": {"order": "desc"}}, {"first_published_at": {"order": "desc"}}]
        else:
            # 相关度
            sort = [{"_score": {"order": "desc"}}, {"first_published_at": {"order": "desc"}}]

        body = {
            "query": query,
            "sort": sort,
            "from": start_from,
            "size": size,
            "track_total_hits": True,
        }

        # 4) 执行查询
        client = get_client()
        index = get_index_name(site.hostname)  # 🎯 使用简化索引
        res = client.search(index=index, body=body)

        hits = res.get("hits", {})
        total = hits.get("total", {}).get("value", 0)
        items = []
        for h in hits.get("hits", []):
            s = h.get("_source", {})
            items.append({
                "id": s.get("article_id") or h.get("_id"),
                "title": s.get("title"),
                "slug": s.get("slug"),
                "excerpt": s.get("summary") or "",
                "cover": None,
                "publish_at": s.get("first_published_at") or s.get("publish_time"),
                "channel": {"slug": s.get("primary_channel_slug") or s.get("channel"), "name": s.get("primary_channel_slug")},
                "region": s.get("region"),
                "is_featured": False,
            })

        response_data = {
            "items": items,
            "pagination": {
                "page": page,
                "size": size,
                "total": total,
                "has_next": (page * size) < total,
                "has_prev": page > 1,
            },
            "meta": {"site": site.hostname if site else None},
        }

        return Response(response_data)

    except Exception as e:
        return Response({"error": f"Internal server error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


