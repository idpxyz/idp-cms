import math, re, json, base64, time, hashlib
from datetime import datetime, timedelta, timezone as dt_timezone
from difflib import SequenceMatcher
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.response import Response
from django.core.cache import cache
from apps.core.site_utils import get_site_from_request
from apps.searchapp.client import get_client, index_name_for
from apps.searchapp.queries import build_query
from apps.news.models.article import ArticlePage
from wagtail.models import Site
from ..utils.rate_limit import FEED_RATE_LIMIT
from apps.core.flags import flag


def _normalize_text(text: str) -> str:
    if not text:
        return ""
    t = text.lower()
    t = re.sub(r"\s+", " ", t)
    t = re.sub(r"[^\w\u4e00-\u9fff ]+", "", t)
    return t.strip()


def _slugify(text: str) -> str:
    base = _normalize_text(text)
    base = re.sub(r"\s+", "-", base)
    h = hashlib.md5(base.encode("utf-8")).hexdigest()[:6]
    return (base[:48] + ("-" if base else "") + h) or h


def _compute_hot_score(item: dict) -> float:
    """强时效热度分：短窗权重更高，并施加更强时间衰减（6h半衰期）。"""
    pop_1h = float(item.get("pop_1h", 0.0))
    pop_24h = float(item.get("pop_24h", 0.0))
    ctr_1h = float(item.get("ctr_1h", 0.0))
    quality = float(item.get("quality_score", 1.0))
    # 新鲜度
    recency = 1.0
    try:
        pt = item.get("publish_at") or item.get("publish_time")
        if isinstance(pt, str) and len(pt) >= 10:
            ts = pt.replace("Z", "+00:00")
            dt = datetime.fromisoformat(ts)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=dt_timezone.utc)
            now = datetime.now(dt_timezone.utc)
            age_h = max(0.0, (now - dt).total_seconds()/3600.0)
            recency = math.pow(0.5, age_h/6.0)  # 6h 半衰期
    except Exception:
        recency = 1.0
    # 爆发度
    burst = max(0.0, pop_1h - 0.2*pop_24h)
    return 0.5*pop_1h + 0.2*burst + 0.15*ctr_1h + 0.1*quality + 0.05*recency


def _cluster_by_title(items: list, similarity: float = 0.88) -> list:
    """返回簇列表，每簇结构：{"rep": item, "items": [...], "slug": cluster_slug}。"""
    clusters = []
    for it in items:
        key_url = (it.get("canonical_url") or it.get("url") or "").strip().lower()
        norm_title = _normalize_text(it.get("title", ""))
        placed = False
        # URL优先
        if key_url:
            for cl in clusters:
                if cl.get("key_url") and cl["key_url"] == key_url:
                    cl["items"].append(it)
                    if it.get("hot_score", 0) > cl["rep"].get("hot_score", 0):
                        cl["rep"] = it
                    placed = True
                    break
            if placed:
                continue
        # 标题相似
        for cl in clusters:
            try:
                sim = SequenceMatcher(None, norm_title, cl["norm_title"]).ratio()
            except Exception:
                sim = 0.0
            if sim >= similarity:
                cl["items"].append(it)
                if it.get("hot_score", 0) > cl["rep"].get("hot_score", 0):
                    cl["rep"] = it
                    cl["norm_title"] = norm_title
                placed = True
                break
        if not placed:
            clusters.append({
                "rep": it,
                "items": [it],
                "key_url": key_url or None,
                "norm_title": norm_title,
            })
    for cl in clusters:
        rep = cl["rep"]
        cl["slug"] = _slugify(rep.get("title", "topic"))
    return clusters


@api_view(["GET"])
@throttle_classes([])
@FEED_RATE_LIMIT
def hot(request):
    site = get_site_from_request(request)
    size = max(1, min(int(request.query_params.get("size", 10)), 50))
    hours = int(request.query_params.get("hours", 168))
    buckets = (request.query_params.get("buckets") or "1h,6h,24h").split(",")
    region = request.query_params.get("region")
    lang = request.query_params.get("lang")
    diversity = request.query_params.get("diversity", "med")
    cursor_token = request.query_params.get("cursor")

    # 解析游标（基于offset）
    start_offset = 0
    if cursor_token:
        try:
            payload = json.loads(base64.urlsafe_b64decode(cursor_token.encode()).decode())
            start_offset = max(0, int(payload.get("offset", 0)))
        except Exception:
            start_offset = 0

    client = get_client()
    index = index_name_for(site)
    # 提高 ES 候选量，缓解多样性与去重后的空集风险
    elastic_size = max(size*20, 600)
    body = build_query(
        "recommend_default",
        site=site,
        channels=["hot"],
        hours=hours,
        size=elastic_size,
    )

    candidates = []
    total_hits = 0
    import time as _t
    t0 = _t.time()
    try:
        resp = client.search(index=index, body=body, request_timeout=6)
        total_hits = resp.get("hits", {}).get("total", {}).get("value", 0)
        for h in resp.get("hits", {}).get("hits", []):
            src = h.get("_source", {})
            item = {"id": h.get("_id"), **src}
            if not item.get("publish_at") and item.get("publish_time"):
                item["publish_at"] = item["publish_time"]
            candidates.append(item)
        if total_hits == 0 or not candidates:
            raise RuntimeError("Empty ES hits for hot")
    except Exception:
        # DB回退
        try:
            site_obj = Site.objects.get(hostname=site)
            qs = ArticlePage.objects.live().descendant_of(site_obj.root_page)
        except Exception:
            qs = ArticlePage.objects.live()
        try:
            since = datetime.now(dt_timezone.utc) - timedelta(hours=hours)
            qs = qs.filter(first_published_at__gte=since)
        except Exception:
            pass
        pages = list(qs.order_by('-first_published_at')[:elastic_size])
        for p in pages:
            candidates.append({
                "id": str(p.id),
                "article_id": str(p.id),
                "title": p.title,
                "publish_time": p.first_published_at.isoformat() if getattr(p,'first_published_at',None) else None,
                "publish_at": p.first_published_at.isoformat() if getattr(p,'first_published_at',None) else None,
                "channel": getattr(p, 'channel_slug', 'recommend'),
                "topic": getattr(p, 'topic_slug', ''),
                "author": getattr(p, 'author_name', ''),
                "quality_score": 1.0,
                "ctr_1h": 0.0,
                "pop_1h": 0.0,
                "pop_24h": 0.0,
            })

    # 轻量 region/lang 过滤
    def _match_region(x: dict) -> bool:
        if not region:
            return True
        val = str(x.get("region") or x.get("locale") or "").lower()
        return (val.startswith(region.lower()) or val == region.lower()) if val else True

    def _match_lang(x: dict) -> bool:
        if not lang:
            return True
        val = str(x.get("lang") or x.get("language") or x.get("locale") or "").lower()
        return (val.startswith(lang.lower()) or val == lang.lower()) if val else True

    candidates = [c for c in candidates if _match_region(c) and _match_lang(c)]

    # 打分
    for c in candidates:
        c["hot_score"] = _compute_hot_score(c)

    # 分桶混排（简化：基于 publish_at 时差和 pop_1h 标记）
    now = datetime.now(dt_timezone.utc)
    def _age_hours(it: dict) -> float:
        try:
            pt = it.get("publish_at") or it.get("publish_time")
            if isinstance(pt, str) and len(pt) >= 10:
                ts = pt.replace("Z", "+00:00")
                dt = datetime.fromisoformat(ts)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=dt_timezone.utc)
                return max(0.0, (now - dt).total_seconds()/3600.0)
        except Exception:
            pass
        return 9999.0

    b1, b6, b24, brest = [], [], [], []
    for it in candidates:
        age = _age_hours(it)
        if age <= 1.0:
            b1.append(it)
        elif age <= 6.0:
            b6.append(it)
        elif age <= 24.0:
            b24.append(it)
        else:
            brest.append(it)

    for arr in (b1, b6, b24, brest):
        arr.sort(key=lambda x: x.get("hot_score", 0), reverse=True)

    # 聚类，限制同簇≤2
    clustered = _cluster_by_title(b1 + b6 + b24 + brest, similarity=0.88)
    # 生成平铺列表，簇内按 hot_score 取最多2条
    flattened = []
    for cl in clustered:
        items = sorted(cl["items"], key=lambda x: x.get("hot_score", 0), reverse=True)[:2]
        for it in items:
            it["cluster_slug"] = cl["slug"]
            flattened.append(it)

    # 排除指定簇（跨模块去重）
    try:
        exclude_clusters = request.query_params.getlist("exclude_cluster_ids") or []
    except Exception:
        exclude_clusters = []
    if exclude_clusters:
        ex = set([str(x) for x in exclude_clusters])
        flattened = [x for x in flattened if str(x.get("cluster_slug")) not in ex]

    # 多样性：来源/频道约束
    def _apply_diversity(items: list) -> list:
        if not items:
            return items
        seen_source = set()
        seen_channel = set()
        out = []
        for it in items:
            src = (it.get("source") or "").strip().lower()
            ch = (it.get("channel") or "").strip().lower()
            allow = True
            if diversity in ("med", "high") and src and src in seen_source:
                allow = False
            if diversity == "high" and ch and ch in seen_channel:
                allow = False
            if allow:
                out.append(it)
                if src:
                    seen_source.add(src)
                if ch:
                    seen_channel.add(ch)
            if len(out) >= (start_offset + size):
                break
        return out

    diversified = _apply_diversity(flattened)
    # 若多样性约束过强导致空列表，放宽约束
    if not diversified:
        diversified = flattened
    # 若排除簇导致空列表，忽略排除重试（保证最小可用）
    if not diversified and exclude_clusters:
        # 重建不带排除的平铺列表
        retry_flattened = []
        for cl in clustered:
            top2 = sorted(cl["items"], key=lambda v: v.get("hot_score", 0), reverse=True)[:2]
            for it in top2:
                it["cluster_slug"] = cl["slug"]
                retry_flattened.append(it)
        diversified = _apply_diversity(retry_flattened)
        if not diversified:
            diversified = retry_flattened[:]

    # 稳定排序：hot_score 降序 + 标题
    diversified.sort(key=lambda x: (-(x.get("hot_score", 0) or 0), (x.get("title") or "")))

    # 游标分页
    end = start_offset + size
    page = diversified[start_offset:end]

    # 填充 slug
    ids = [str(it.get("article_id") or it.get("id")) for it in page]
    try:
        articles_with_slug = ArticlePage.objects.filter(id__in=ids).values("id","slug")
        slug_map = {str(a["id"]): a["slug"] for a in articles_with_slug}
        for it in page:
            k = str(it.get("article_id") or it.get("id"))
            it["slug"] = slug_map.get(k, it.get("slug", ""))
    except Exception:
        for it in page:
            it["slug"] = it.get("slug", "")

    next_cursor = None
    if end < len(diversified):
        token = base64.urlsafe_b64encode(json.dumps({"offset": end}).encode()).decode()
        next_cursor = token

    t1 = _t.time()
    debug = {
        "site": site,
        "hours": hours,
        "buckets": buckets,
        "total_candidates": len(candidates),
        "clusters": len(clustered),
        "diversified": len(diversified),
        "has_next": bool(next_cursor),
        "perf_ms": int((t1 - t0) * 1000)
    }

    payload = {"items": page, "next_cursor": next_cursor}
    if flag("features.debug_enabled", False):
        payload["debug"] = debug
    # Redis 短缓存：首屏且无排除簇时缓存一分钟
    try:
        if start_offset == 0 and not exclude_clusters:
            ck = f"hot:v1:{site}:{region or '-'}:{lang or '-'}:{hours}:{buckets}:{diversity}:{size}"
            cache.set(ck, payload, timeout=60)
    except Exception:
        pass
    return Response(payload)


