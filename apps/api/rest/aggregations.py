import base64, json
from typing import Optional
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.response import Response
from django.core.cache import cache
from apps.core.site_utils import get_site_from_request
from ..utils.rate_limit import FEED_RATE_LIMIT
from apps.api.tasks.aggregations import compute_headlines as task_compute_headlines, compute_hot as task_compute_hot
from apps.searchapp.client import get_client, index_name_for
from apps.searchapp.queries import build_query
from apps.api.rest.hot import _compute_hot_score, _slugify


def _parse_cursor(cursor_token: Optional[str]) -> int:
    if not cursor_token:
        return 0
    try:
        payload = json.loads(base64.urlsafe_b64decode(cursor_token.encode()).decode())
        return max(0, int(payload.get("offset", 0)))
    except Exception:
        return 0


@api_view(["GET"])
@throttle_classes([])
@FEED_RATE_LIMIT
def agg_headlines(request):
    site = get_site_from_request(request)
    size = max(1, min(int(request.query_params.get("size", 8)), 50))
    hours = int(request.query_params.get("hours", 24))
    region = request.query_params.get("region")
    lang = request.query_params.get("lang")
    diversity = request.query_params.get("diversity", "med")
    cursor_token = request.query_params.get("cursor")
    exclude_clusters = request.query_params.getlist("exclude_cluster_ids") or []
    
    # 支持换一换功能的offset参数
    offset = int(request.query_params.get("offset", 0))

    cache_key = f"agg:headlines:v1:{site}:{(region or '-')}:{(lang or '-')}:{hours}:{diversity}"
    payload = cache.get(cache_key)
    if not payload:
        # Synchronous compute fallback to fill cache quickly
        try:
            task_compute_headlines(site=site, hours=hours, region=region, lang=lang, diversity=diversity)
        except Exception:
            pass
        payload = cache.get(cache_key) or {"items": []}

    items = payload.get("items") or []
    if exclude_clusters:
        ex = set([str(x) for x in exclude_clusters])
        items = [x for x in items if str(x.get("cluster_slug")) not in ex]

    # 应用cursor和offset
    start_offset = _parse_cursor(cursor_token) + offset
    end = start_offset + size
    page = items[start_offset:end]
    next_cursor = None
    if end < len(items):
        token = base64.urlsafe_b64encode(json.dumps({"offset": end}).encode()).decode()
        next_cursor = token

    # Keep response shape close to existing Next aggregated endpoint
    return Response({"headlines": page, "next_cursor": next_cursor})


@api_view(["GET"])
@throttle_classes([])
@FEED_RATE_LIMIT
def agg_hot(request):
    site = get_site_from_request(request)
    size = max(1, min(int(request.query_params.get("size", 20)), 100))
    hours = int(request.query_params.get("hours", 168))
    buckets = (request.query_params.get("buckets") or "1h,6h,24h").strip()
    region = request.query_params.get("region")
    lang = request.query_params.get("lang")
    diversity = request.query_params.get("diversity", "med")
    cursor_token = request.query_params.get("cursor")
    exclude_clusters = request.query_params.getlist("exclude_cluster_ids") or []

    start_offset = _parse_cursor(cursor_token)

    cache_key = f"agg:hot:v1:{site}:{(region or '-')}:{(lang or '-')}:{hours}:{buckets}:{diversity}"
    payload = cache.get(cache_key)
    if not payload:
        # Trigger async precompute and provide a lightweight immediate fallback
        try:
            task_compute_hot.delay(site=site, hours=hours, region=region, lang=lang, diversity=diversity, buckets=buckets)
        except Exception:
            pass
        payload = {"items": _quick_hot_fallback(site, hours, region, lang, diversity, min(size * 3, 90))}

    items = payload.get("items") or []
    if exclude_clusters:
        ex = set([str(x) for x in exclude_clusters])
        items = [x for x in items if str(x.get("cluster_slug")) not in ex]

    end = start_offset + size
    page = items[start_offset:end]
    next_cursor = None
    if end < len(items):
        token = base64.urlsafe_b64encode(json.dumps({"offset": end}).encode()).decode()
        next_cursor = token

    return Response({"items": page, "next_cursor": next_cursor})


def _quick_hot_fallback(site: str, hours: int, region: str | None, lang: str | None, diversity: str, fetch_size: int) -> list:
    """
    Lightweight hot fallback: single ES query, score+sort, no expensive clustering.
    Returns a flat list with cluster_slug synthesized from title for basic de-dupe downstream.
    """
    try:
        client = get_client()
        index = index_name_for(site)
        body = build_query(
            "recommend_default",
            site=site,
            channels=["hot"],
            hours=hours,
            size=max(fetch_size, 30),
        )
        resp = client.search(index=index, body=body, request_timeout=4)
        items = []
        for h in resp.get("hits", {}).get("hits", []):
            src = h.get("_source", {})
            item = {"id": h.get("_id"), **src}
            if not item.get("publish_at") and item.get("publish_time"):
                item["publish_at"] = item["publish_time"]
            items.append(item)
        # Filter region/lang if provided
        if region:
            rlow = region.lower()
            items = [x for x in items if (str(x.get("region") or x.get("locale") or "").lower().startswith(rlow))]
        if lang:
            llow = lang.lower()
            items = [x for x in items if (str(x.get("lang") or x.get("language") or x.get("locale") or "").lower().startswith(llow))]
        # Score and sort
        for it in items:
            it["hot_score"] = _compute_hot_score(it)
            # synthesize cluster slug for downstream uniqueness
            it["cluster_slug"] = _slugify(it.get("title", "topic"))
        items.sort(key=lambda x: (-(x.get("hot_score", 0) or 0), (x.get("title") or "")))
        return items[:fetch_size]
    except Exception:
        return []


