import re, math, hashlib, json, base64
from difflib import SequenceMatcher
from datetime import datetime, timedelta, timezone as dt_timezone
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.response import Response
from django.core.cache import cache
from apps.core.site_utils import get_site_from_request
from apps.searchapp.client import get_client, index_name_for
from apps.searchapp.queries import build_query
from apps.news.models.article import ArticlePage
from wagtail.models import Site
from ..utils.rate_limit import FEED_RATE_LIMIT as TOPIC_RATE_LIMIT


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
    # 限长，附哈希避免冲突
    h = hashlib.md5(base.encode('utf-8')).hexdigest()[:6]
    return (base[:48] + ("-" if base else "") + h) or h


def _compute_doc_score(item: dict) -> float:
    pop_1h = float(item.get("pop_1h", 0.0))
    pop_24h = float(item.get("pop_24h", 0.0))
    ctr_1h = float(item.get("ctr_1h", 0.0))
    quality = float(item.get("quality_score", 1.0))
    # 新鲜度（12h半衰期）
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
            recency = math.pow(0.5, age_h/12.0)
    except Exception:
        recency = 1.0
    return 0.45*pop_1h + 0.2*pop_24h + 0.2*ctr_1h + 0.1*quality + 0.05*recency


def _cluster_items(items: list, title_similarity: float = 0.88) -> list:
    clusters = []  # {rep, items, key, title_norm, slug}
    for it in items:
        key = (it.get("canonical_url") or it.get("url") or None)
        if key:
            key = key.strip().lower()
        norm_title = _normalize_text(it.get("title", ""))
        it_score = it.get("topic_score") or _compute_doc_score(it)
        it["topic_score"] = it_score

        placed = False
        # URL exact cluster
        if key:
            for cl in clusters:
                if cl.get("key") and cl["key"] == key:
                    cl["items"].append(it)
                    if it_score > cl["rep"].get("topic_score", 0):
                        cl["rep"] = it
                    placed = True
                    break
            if placed:
                continue

        # Title similarity cluster
        for cl in clusters:
            try:
                sim = SequenceMatcher(None, norm_title, cl["title_norm"]).ratio()
            except Exception:
                sim = 0.0
            if sim >= title_similarity:
                cl["items"].append(it)
                if it_score > cl["rep"].get("topic_score", 0):
                    cl["rep"] = it
                    cl["title_norm"] = norm_title
                placed = True
                break

        if not placed:
            clusters.append({
                "rep": it,
                "items": [it],
                "key": key,
                "title_norm": norm_title,
            })

    # finalize（聚类级指标聚合）
    out = []
    for cl in clusters:
        rep = dict(cl["rep"])  # shallow copy
        items_in_cluster = cl["items"] if isinstance(cl.get("items"), list) else [cl.get("rep")]
        count = len(items_in_cluster)
        pop_1h_sum = 0.0
        pop_24h_sum = 0.0
        ctr_1h_sum = 0.0
        quality_sum = 0.0
        recency_sum = 0.0
        for x in items_in_cluster:
            pop_1h_sum += float(x.get("pop_1h", 0.0))
            pop_24h_sum += float(x.get("pop_24h", 0.0))
            ctr_1h_sum += float(x.get("ctr_1h", 0.0))
            quality_sum += float(x.get("quality_score", 1.0))
            # 近似复用文档新鲜度
            recency_sum += float(_compute_doc_score({**x, "pop_1h": 0.0, "pop_24h": 0.0, "ctr_1h": 0.0, "quality_score": 0.0}) * 10.0)

        rep["articles_count"] = count
        rep["more_sources"] = max(0, count - 1)
        rep["topic_slug"] = _slugify(rep.get("title", "topic"))
        # 聚类级指标（平均值）
        if count > 0:
            rep["cluster_pop_1h"] = pop_1h_sum / count
            rep["cluster_pop_24h"] = pop_24h_sum / count
            rep["cluster_ctr_1h"] = ctr_1h_sum / count
            rep["cluster_quality"] = quality_sum / count
            rep["cluster_recency"] = recency_sum / count
        out.append(rep)
    return out


def _fetch_candidates(site: str, hours: int, channels: list[str], size: int) -> list:
    client = get_client()
    index = index_name_for(site)
    body = build_query(
        "recommend_default",
        site=site,
        channels=channels or [],  # 传空数组以移除频道过滤
        hours=hours,
        size=max(size*20, 400)
    )
    items = []
    total_hits = 0
    try:
        resp = client.search(index=index, body=body, request_timeout=6)
        total_hits = resp.get("hits", {}).get("total", {}).get("value", 0)
        for h in resp.get("hits", {}).get("hits", []):
            src = h.get("_source", {})
            item = {"id": h.get("_id"), **src}
            if not item.get("publish_at") and item.get("publish_time"):
                item["publish_at"] = item["publish_time"]
            items.append(item)
        # 如果ES成功但没有命中，转DB回退
        if total_hits == 0 or not items:
            raise RuntimeError("Empty hits")
    except Exception:
        # Fallback: DB recent pages
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
        pages = list(qs.order_by('-first_published_at')[:max(size*20, 400)])
        for p in pages:
            items.append({
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
    return items


@api_view(["GET"])
@throttle_classes([])
@TOPIC_RATE_LIMIT
def topics(request):
    site = get_site_from_request(request)
    size = max(1, min(int(request.query_params.get("size", 20)), 100))
    hours = int(request.query_params.get("hours", 72))
    channels = request.query_params.getlist("channel") or []
    region = request.query_params.get("region")
    lang = request.query_params.get("lang")
    cursor_param = request.query_params.get("cursor")
    start_offset = 0
    if cursor_param:
        try:
            decoded = base64.urlsafe_b64decode(cursor_param.encode("utf-8"))
            payload = json.loads(decoded.decode("utf-8"))
            start_offset = max(0, int(payload.get("offset", 0)))
        except Exception:
            start_offset = 0

    items = _fetch_candidates(site, hours, channels, size)
    # 轻量过滤 region/lang（若字段存在）
    if region:
        region_lc = str(region).lower()
        def _match_region(x: dict) -> bool:
            val = str(x.get("region") or x.get("locale") or "").lower()
            return (val.startswith(region_lc) or val == region_lc) if val else True
        items = [x for x in items if _match_region(x)]
    if lang:
        lang_lc = str(lang).lower()
        def _match_lang(x: dict) -> bool:
            val = str(x.get("lang") or x.get("language") or x.get("locale") or "").lower()
            return (val.startswith(lang_lc) or val == lang_lc) if val else True
        items = [x for x in items if _match_lang(x)]
    # score docs
    for it in items:
        it["topic_score"] = _compute_doc_score(it)
    items.sort(key=lambda x: x.get("topic_score", 0), reverse=True)

    clustered = _cluster_items(items)

    # 聚合到主题热度
    topics_out = []
    for rep in clustered:
        # 改进热度：代表分 + 来源贡献 + 聚类近期热度（轻权重）
        heat = (
            float(rep.get("topic_score", 0.0))
            + 3.0 * float(rep.get("more_sources", 0.0))
            + 0.8 * float(rep.get("cluster_pop_1h", rep.get("pop_1h", 0.0)))
            + 0.4 * float(rep.get("cluster_ctr_1h", rep.get("ctr_1h", 0.0)))
        )
        # 趋势判断：1h vs 24h 对比 + 新鲜度
        c1 = float(rep.get("cluster_pop_1h", rep.get("pop_1h", 0.0)))
        c24 = float(rep.get("cluster_pop_24h", rep.get("pop_24h", 0.0)))
        rec = float(rep.get("cluster_recency", 0.0))
        if c24 <= 1e-6 and c1 > 0:
            trend = "up"
        else:
            ratio = c1 / max(1e-6, c24)
            if ratio >= 1.2 or (rec > 0.5 and c1 > 0.2):
                trend = "up"
            elif ratio <= 0.6 and c1 < c24:
                trend = "down"
            else:
                trend = "stable"
        topics_out.append({
            "slug": rep.get("topic_slug"),
            "title": rep.get("title"),
            "heat": round(min(100.0, max(10.0, heat))),
            "trend": trend,
            "articles_count": rep.get("articles_count", 1)
        })

    # 排序稳定：热度降序 + 标题
    topics_out.sort(key=lambda x: (-(x.get("heat", 0) or 0), (x.get("title") or "")))

    # 游标分页
    end = start_offset + size
    page_items = topics_out[start_offset:end]
    next_cursor = None
    if end < len(topics_out):
        payload = json.dumps({"offset": end}).encode("utf-8")
        next_cursor = base64.urlsafe_b64encode(payload).decode("utf-8")
    return Response({"items": page_items, "next_cursor": next_cursor})


@api_view(["GET"])
@throttle_classes([])
@TOPIC_RATE_LIMIT
def topic_detail(request, slug: str):
    site = get_site_from_request(request)
    hours = int(request.query_params.get("hours", 72))
    channels = request.query_params.getlist("channel") or []
    region = request.query_params.get("region")
    lang = request.query_params.get("lang")

    items = _fetch_candidates(site, hours, channels, size=50)
    if region:
        region_lc = str(region).lower()
        def _match_region(x: dict) -> bool:
            val = str(x.get("region") or x.get("locale") or "").lower()
            return (val.startswith(region_lc) or val == region_lc) if val else True
        items = [x for x in items if _match_region(x)]
    if lang:
        lang_lc = str(lang).lower()
        def _match_lang(x: dict) -> bool:
            val = str(x.get("lang") or x.get("language") or x.get("locale") or "").lower()
            return (val.startswith(lang_lc) or val == lang_lc) if val else True
        items = [x for x in items if _match_lang(x)]
    for it in items:
        it["topic_score"] = _compute_doc_score(it)
    items.sort(key=lambda x: x.get("topic_score", 0), reverse=True)
    clustered = _cluster_items(items)

    found = None
    for rep in clustered:
        if rep.get("topic_slug") == slug:
            found = rep
            break

    if not found and clustered:
        found = clustered[0]

    if not found:
        return Response({"items": [], "topic": None})

    # Build article list (top N from this cluster by score/title sim)
    # For simplicity, reconstruct the cluster by title similarity around rep
    rep_title_norm = _normalize_text(found.get("title", ""))
    related = []
    for it in items:
        try:
            sim = SequenceMatcher(None, rep_title_norm, _normalize_text(it.get("title",""))).ratio()
        except Exception:
            sim = 0.0
        if sim >= 0.86:
            related.append(it)
    related = sorted(related, key=lambda x: x.get("topic_score", 0), reverse=True)[:50]

    # Attach slugs for links
    ids = [str(it.get("article_id") or it.get("id")) for it in related]
    try:
        articles_with_slug = ArticlePage.objects.filter(id__in=ids).values("id","slug")
        slug_map = {str(a["id"]): a["slug"] for a in articles_with_slug}
        for it in related:
            k = str(it.get("article_id") or it.get("id"))
            it["slug"] = slug_map.get(k, "")
    except Exception:
        for it in related:
            it["slug"] = it.get("slug", "")

    detail = {
        "slug": found.get("topic_slug"),
        "title": found.get("title"),
        "heat": round(min(100.0, max(10.0, found.get("topic_score",0) + 3.0*found.get("more_sources",0)))),
        "articles": related,
        "count": len(related)
    }
    return Response(detail)


