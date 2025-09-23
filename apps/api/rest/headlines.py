import math, re, time, hashlib, json, base64
from datetime import datetime, timezone as dt_timezone, timedelta
from difflib import SequenceMatcher
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.response import Response
from django.core.cache import cache
from django.conf import settings
from apps.searchapp.client import get_client, index_name_for
from apps.searchapp.queries import build_query
from apps.core.site_utils import get_site_from_request
from apps.news.models.article import ArticlePage
from wagtail.models import Site
from ..utils.rate_limit import FEED_RATE_LIMIT
from apps.core.flags import flag
from ..utils.modern_cache import (
    ModernCacheStrategy, ModernCacheManager, SmartCacheKey, CacheHeaders,
    BreakingNewsDetector, ContentType, CacheLayer,
    get_cache_time, generate_cache_key, should_cache
)


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



def _compute_headline_score(item: dict) -> float:
    pop_1h = float(item.get("pop_1h", 0.0))
    pop_24h = float(item.get("pop_24h", 0.0))
    quality = float(item.get("quality_score", 1.0))
    # 新鲜度：按发布时间指数衰减（12h半衰期）
    recency = 1.0
    try:
        pt = item.get("publish_at") or item.get("publish_time")
        if isinstance(pt, str) and len(pt) >= 10:
            ts = pt.replace("Z", "+00:00")
            dt = datetime.fromisoformat(ts)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=dt_timezone.utc)
            now = datetime.now(dt_timezone.utc)
            age_hours = max(0.0, (now - dt).total_seconds() / 3600.0)
            # 半衰期 12h 的指数衰减
            recency = math.pow(0.5, age_hours / 12.0)
        elif isinstance(pt, (int, float)):
            now = time.time()
            age_hours = max(0.0, (now - float(pt)) / 3600.0)
            recency = math.pow(0.5, age_hours / 12.0)
    except Exception:
        recency = 1.0

    # 爆发度：短窗增量 - 长窗基线的一部分
    burst = max(0.0, pop_1h - 0.25 * pop_24h)
    
    # 头条算法：优先考虑内容质量和多样性，降低时间敏感度
    if pop_1h == 0.0 and pop_24h == 0.0:
        import hashlib
        
        # 频道多样性因子：确保不同频道有相对均等的机会
        channel = item.get("channel", "default")
        # 🔧 处理channel可能是字典的情况
        if isinstance(channel, dict):
            channel_slug = channel.get("slug", "default")
        else:
            channel_slug = str(channel) if channel else "default"
        channel_hash = int(hashlib.md5(channel_slug.encode()).hexdigest(), 16) % 10000
        diversity_boost = 0.8 + (channel_hash / 10000) * 0.4  # 0.8-1.2范围，更大变化
        
        # 时间衰减更温和：7天内的文章都有机会成为头条
        age_penalty = 1.0
        try:
            if isinstance(item.get("publish_at") or item.get("publish_time"), str):
                from datetime import datetime, timezone as dt_timezone
                pt_str = item.get("publish_at") or item.get("publish_time")
                pt = datetime.fromisoformat(pt_str.replace("Z", "+00:00"))
                if pt.tzinfo is None:
                    pt = pt.replace(tzinfo=dt_timezone.utc)
                age_days = (datetime.now(dt_timezone.utc) - pt).total_seconds() / 86400.0
                # 7天内线性衰减，7天后保持0.3的基础分
                age_penalty = max(0.3, 1.0 - (age_days / 7.0) * 0.7)
        except Exception:
            age_penalty = 1.0
        
        # 重新平衡权重：质量50% + 多样性40% + 时间10%
        score = (0.5 * quality * diversity_boost + 0.4 * diversity_boost + 0.1 * age_penalty)
    else:
        # 有流行度数据时使用原有算法
        score = 0.55 * pop_1h + 0.25 * burst + 0.15 * quality + 0.05 * recency
    
    return score


def _cluster_items(items: list, similarity: float = 0.92) -> list:
    clusters = []  # 每项：{"rep": item, "items": [item,...], "key": str}
    for it in items:
        key = it.get("canonical_url") or it.get("url") or None
        if key:
            key = key.strip().lower()
        norm_title = _normalize_text(it.get("title", ""))

        placed = False
        # 1) URL 级聚类
        if key:
            for cl in clusters:
                if cl.get("key") and cl["key"] == key:
                    cl["items"].append(it)
                    # 更新代表为更高分者
                    if it.get("headline_score", 0) > cl["rep"].get("headline_score", 0):
                        cl["rep"] = it
                    placed = True
                    break
            if placed:
                continue

        # 2) 标题相似度聚类
        for cl in clusters:
            rep_title = _normalize_text(cl["rep"].get("title", ""))
            try:
                sim = SequenceMatcher(None, norm_title, rep_title).ratio()
            except Exception:
                sim = 0.0
            if sim >= similarity:
                cl["items"].append(it)
                if it.get("headline_score", 0) > cl["rep"].get("headline_score", 0):
                    cl["rep"] = it
                placed = True
                break

        if not placed:
            clusters.append({"rep": it, "items": [it], "key": key})

    # 返回各簇代表，并附上来源数量
    out = []
    for cl in clusters:
        rep = dict(cl["rep"])  # 复制，避免污染
        rep["more_sources"] = max(0, len(cl["items"]) - 1)
        rep["cluster_slug"] = _slugify(rep.get("title", "topic"))
        out.append(rep)
    return out


@api_view(["GET"])
@throttle_classes([])  # 复用自定义限流
@FEED_RATE_LIMIT
def headlines(request):
    site = get_site_from_request(request)
    size = max(1, min(int(request.query_params.get("size", 8)), 30))
    hours = int(request.query_params.get("hours", 24))  # 默认24小时窗口
    region = request.query_params.get("region")
    lang = request.query_params.get("lang")
    diversity = request.query_params.get("diversity", "med")
    req_channels = request.query_params.getlist("channel") or []
    req_channels = [ch for ch in req_channels if ch]
    exclude_clusters = request.query_params.getlist("exclude_cluster_ids") or []
    cursor_token = request.query_params.get("cursor")
    start_offset = 0
    if cursor_token:
        try:
            payload = json.loads(base64.urlsafe_b64decode(cursor_token.encode()).decode())
            start_offset = max(0, int(payload.get("offset", 0)))
        except Exception:
            start_offset = 0

    # 会话级去重（跨模块）
    session_id = request.headers.get("X-Session-ID") or request.headers.get("X-AB-Session") or "anon"
    seen_cache_key = f"feed:seen:{site}:{session_id}"
    cached_seen = cache.get(seen_cache_key, [])
    cached_seen = [str(x) for x in (cached_seen or [])]
    combined_seen = list(dict.fromkeys(cached_seen))

    # 召回候选：优先 hot/trending 渠道，放大上限，后续聚类压缩
    import time as _t
    t0 = _t.time()
    client = get_client()
    index = index_name_for(site)
    # 提高 ES 候选量，缓解多样性与去重后的空集风险
    elastic_size = max(size * 40, 400)
    
    # 🎯 根据模式选择查询模板
    mode = request.query_params.get("mode", "").lower()
    if mode == "topstories":
        query_template = "topstories_default"
    elif mode == "hero":
        query_template = "hero_default"
    else:
        query_template = "recommend_default"
    
    # 🎯 根据模式设置频道筛选策略
    if mode == "topstories":
        # TopStories模式：如果没有指定频道，则不限制频道（传递None或空列表让查询模板处理）
        query_channels = req_channels if req_channels else []
    elif mode == "hero":
        # Hero模式：不限制频道，获取所有标记为Hero的内容
        query_channels = []
    else:
        # 普通模式：使用默认的热门频道
        query_channels = req_channels if req_channels else ["hot", "trending"]
    
    body = build_query(
        query_template,
        site=site,
        channels=query_channels,
        hours=hours,
        seen_ids=cached_seen,
        size=elastic_size,
    )

    candidates = []
    total_hits = 0
    returned_hits = 0
    try:
        resp = client.search(index=index, body=body, request_timeout=5)
        total_hits = resp.get("hits", {}).get("total", {}).get("value", 0)
        for h in resp.get("hits", {}).get("hits", []):
            returned_hits += 1
            src = h.get("_source", {})
            if str(h.get("_id")) in combined_seen:
                continue
            item = {"id": h.get("_id"), **src}
            # 兜底 publish_at
            if not item.get("publish_at") and item.get("publish_time"):
                item["publish_at"] = item["publish_time"]
            
            # 添加封面图片信息（从数据库获取）
            cover_url = None
            try:
                article_id = item.get("article_id") or item.get("id")
                if article_id:
                    # 从数据库获取文章封面
                    try:
                        article = ArticlePage.objects.get(id=int(article_id))
                        if article.cover:
                            cover_url = f"http://192.168.8.195:8000/api/media/proxy/{article.cover.file.name}"
                    except (ArticlePage.DoesNotExist, ValueError):
                        pass
            except Exception:
                pass
            
            # 添加图片字段
            item["image_url"] = cover_url
            item["cover"] = {"url": cover_url} if cover_url else None
            
            candidates.append(item)
        # 若ES无结果，进入DB回退
        if total_hits == 0 or not candidates:
            raise RuntimeError("Empty ES hits for headlines")
    except Exception:
        # DB回退：取最近 hours 内的文章
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
        
        # DB 回退时按 channel 过滤（若传入）
        if req_channels:
            try:
                qs = qs.filter(channel__slug__in=req_channels)
            except Exception:
                pass
        
        pages = list(qs.order_by('-first_published_at')[:elastic_size])
        if not pages:
            # 扩大时间窗至7天确保有内容
            try:
                since7 = datetime.now(dt_timezone.utc) - timedelta(hours=24*7)
                qs7 = qs.filter(first_published_at__gte=since7)
                pages = list(qs7.order_by('-first_published_at')[:elastic_size])
            except Exception:
                pages = []
        if not pages:
            # 回退到全站，并应用相同时间窗策略
            qsg = ArticlePage.objects.live()
            try:
                since = datetime.now(dt_timezone.utc) - timedelta(hours=hours)
                qsg = qsg.filter(first_published_at__gte=since)
            except Exception:
                pass
            pages = list(qsg.order_by('-first_published_at')[:elastic_size])
            if not pages:
                try:
                    since7 = datetime.now(dt_timezone.utc) - timedelta(hours=24*7)
                    qsg7 = ArticlePage.objects.live().filter(first_published_at__gte=since7)
                    pages = list(qsg7.order_by('-first_published_at')[:elastic_size])
                except Exception:
                    pages = list(ArticlePage.objects.live().order_by('-first_published_at')[:elastic_size])
        for p in pages:
            # 获取封面图片URL
            cover_url = None
            if p.cover:
                try:
                    # 使用媒体代理URL
                    cover_url = f"http://192.168.8.195:8000/api/media/proxy/{p.cover.file.name}"
                except Exception:
                    pass
            
            item = {
                "id": str(p.id),
                "article_id": str(p.id),
                "title": p.title,
                "slug": p.slug,
                "publish_time": p.first_published_at.isoformat() if getattr(p, 'first_published_at', None) else None,
                "publish_at": p.first_published_at.isoformat() if getattr(p, 'first_published_at', None) else None,
                "channel": {
                    "id": str(p.channel.id) if p.channel else 'recommend',
                    "name": p.channel.name if p.channel else '首页',
                    "slug": p.channel.slug if p.channel else 'recommend'
                } if p.channel else {
                    "id": 'recommend',
                    "name": '首页', 
                    "slug": 'recommend'
                },
                "topic": getattr(p, 'topic_slug', ''),
                "author": getattr(p, 'author_name', ''),
                "image_url": cover_url,  # 添加图片URL
                "cover": {"url": cover_url} if cover_url else None,  # 添加cover对象
                "quality_score": 1.0,
                "ctr_1h": 0.0,
                "pop_1h": 0.0,
                "pop_24h": 0.0,
            }
            if item["id"] in combined_seen:
                continue
            candidates.append(item)

    # 区域/语言轻量过滤（若字段存在）
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

    # 打分（爆发+新鲜+质量）
    for c in candidates:
        c["headline_score"] = _compute_headline_score(c)

    candidates.sort(key=lambda x: x.get("headline_score", 0), reverse=True)

    # 聚类（故事级）
    clustered = _cluster_items(candidates, similarity=0.88)

    # 基于多样性与排除列表进行筛选
    # 同簇唯一已由聚类保证；此处限制来源(source)/频道(channel)重复，同时加入主题/类别配额
    def _apply_diversity(items: list) -> list:
        if not items:
            return items
        seen_source = set()
        seen_channel = set()
        seen_topic = set()
        topic_quota = 1 if diversity == "high" else 2  # 每主题最多条数
        topic_count = {}
        out = []
        for it in items:
            src = (it.get("source") or "").strip().lower()
            # 🔧 处理channel可能是字典的情况
            channel = it.get("channel") or ""
            if isinstance(channel, dict):
                ch = (channel.get("slug") or "").strip().lower()
            else:
                ch = str(channel).strip().lower()
            topic = (it.get("topic") or it.get("cluster_slug") or "").strip().lower()
            allow = True
            if diversity in ("med", "high") and src and src in seen_source:
                allow = False
            if diversity == "high" and ch and ch in seen_channel:
                allow = False
            if topic:
                cnt = topic_count.get(topic, 0)
                if cnt >= topic_quota:
                    allow = False
            if allow:
                out.append(it)
                if src:
                    seen_source.add(src)
                if ch:
                    seen_channel.add(ch)
                if topic:
                    topic_count[topic] = topic_count.get(topic, 0) + 1
            if len(out) >= (start_offset + size):
                break
        return out

    filtered = [x for x in clustered if x.get("cluster_slug") not in set(exclude_clusters)]
    # 先按爆发度排序再做 MMR 多样性选取
    def _burst_score(it: dict) -> float:
        p1 = float(it.get("pop_1h", 0.0))
        p24 = float(it.get("pop_24h", 0.0))
        quality = float(it.get("quality_score", 1.0))
        burst = max(0.0, p1 - 0.25 * p24)
        return 0.6 * p1 + 0.25 * burst + 0.15 * quality
    base_sorted = sorted(filtered, key=_burst_score, reverse=True)

    # 简易 MMR：在已选集合上惩罚与已选的语义/类别相似（这里用频道与主题近似）
    def _similarity(a: dict, b: dict) -> float:
        # 🔧 处理channel可能是字典的情况
        def get_channel_slug(item):
            channel = item.get("channel") or ""
            if isinstance(channel, dict):
                return channel.get("slug") or ""
            return str(channel)
        
        ch_a = get_channel_slug(a).lower()
        ch_b = get_channel_slug(b).lower()
        sa = (ch_a + "|" + (a.get("topic") or a.get("cluster_slug") or "")).lower()
        sb = (ch_b + "|" + (b.get("topic") or b.get("cluster_slug") or "")).lower()
        return 1.0 if sa == sb else (0.5 if ch_a == ch_b else 0.0)

    lam = 0.7 if diversity == "high" else 0.5  # 多样性权重
    selected = []
    for cand in base_sorted:
        # 计算 MMR 分数：基分 - λ*与已选最高相似
        if not selected:
            selected.append(cand)
            continue
        sim_penalty = max((_similarity(cand, s) for s in selected), default=0.0)
        score = _burst_score(cand) - lam * sim_penalty
        cand["_mmr_score"] = score
        # 插入保持按 mmr 排序，简单处理
        selected.append(cand)
        selected.sort(key=lambda x: x.get("_mmr_score", _burst_score(x)), reverse=True)
        # 截断
        if len(selected) > (start_offset + size) * 3:
            selected = selected[: (start_offset + size) * 3]

    filtered = _apply_diversity(selected)
    # 若多样性过滤后数量不足，放宽规则以保证最小可用
    if len(filtered) < size:
        # 先放宽到按频道最多2条
        max_per_channel = 2 if diversity == "high" else 3
        by_channel = {}
        relaxed = []
        for it in [x for x in clustered if x.get("cluster_slug") not in set(exclude_clusters)]:
            # 🔧 处理channel可能是字典的情况
            channel = it.get("channel") or ""
            if isinstance(channel, dict):
                ch = (channel.get("slug") or "").strip().lower()
            else:
                ch = str(channel).strip().lower()
            cnt = by_channel.get(ch, 0)
            if cnt < max_per_channel:
                relaxed.append(it)
                by_channel[ch] = cnt + 1
            if len(relaxed) >= (start_offset + size):
                break
        if relaxed:
            filtered = relaxed
    # 若仍不足，直接使用未限制的聚类结果（仍遵守排除列表）
    if len(filtered) < size:
        filtered = [x for x in clustered if x.get("cluster_slug") not in set(exclude_clusters)]

    # 现代化缓存策略
    cache_key = None
    content_type = ContentType.NORMAL
    
    if start_offset == 0 and not exclude_clusters:
        # 1. 智能检测内容类型
        request_data = {
            'diversity': diversity,
            'hours': hours,
            'channels': req_channels,
            'region': region,
            'lang': lang
        }
        content_type = ModernCacheStrategy.detect_content_type(request_data)
        
        # 2. 生成现代缓存key
        cache_params = {
            'hours': hours,
            'diversity': diversity, 
            'size': size,
            'region': region,
            'lang': lang,
            'channels': req_channels
        }
        
        session_id = request.headers.get('X-Session-ID')
        user_id = session_id if session_id and session_id.startswith('user_') else None
        
        cache_key = generate_cache_key(
            content_type, CacheLayer.BACKEND, site, cache_params, user_id
        )
        
        # 3. 检查缓存
        if should_cache(content_type, CacheLayer.BACKEND):
            cached = ModernCacheManager.get(cache_key)
            if cached:
                response = Response(cached)
                # 设置现代响应头
                for key, value in CacheHeaders.generate_response_headers(content_type).items():
                    response[key] = value
                return response

    # 游标分页
    end = start_offset + size
    top = filtered[start_offset:end]

    t1 = _t.time()
    debug = {
        "site": site,
        "hours": hours,
        "total_hits": total_hits,
        "returned_hits": returned_hits,
        "candidates": len(candidates),
        "clusters": len(clustered),
        "perf_ms": int((t1 - t0) * 1000)
    }

    # 更新会话级 seen：合并并截断
    new_seen = combined_seen + [str(t.get("id") or t.get("article_id")) for t in top]
    # 去重并保留最近500
    new_seen = list(dict.fromkeys(new_seen))[-500:]
    cache.set(seen_cache_key, new_seen, timeout=6*3600)

    # 计算趋势：基于 1h/24h 与新鲜度
    def _trend(it: dict) -> str:
        p1 = float(it.get("pop_1h", 0.0))
        p24 = float(it.get("pop_24h", 0.0))
        if p24 <= 1e-6 and p1 > 0:
            return "up"
        ratio = p1 / max(1e-6, p24)
        return "up" if ratio >= 1.2 else ("down" if ratio <= 0.6 and p1 < p24 else "stable")

    for item in top:
        item["trend"] = _trend(item)

    next_cursor = None
    if end < len(filtered):
        token = base64.urlsafe_b64encode(json.dumps({"offset": end}).encode()).decode()
        next_cursor = token

    # 动态检测突发新闻
    if BreakingNewsDetector.detect(top):
        content_type = ContentType.BREAKING
    
    # 获取缓存时间
    cache_time = get_cache_time(content_type, CacheLayer.BACKEND)
    
    payload = {
        "items": top, 
        "next_cursor": next_cursor,
        "content_type": content_type.value,
        "cache_strategy": {
            "type": content_type.value,
            "backend_ttl": cache_time,
            "gateway_ttl": get_cache_time(content_type, CacheLayer.GATEWAY),
            "cdn_ttl": get_cache_time(content_type, CacheLayer.CDN)
        }
    }
    
    if flag("features.debug_enabled", False):
        payload["debug"] = debug
    
    # 现代化缓存设置
    if cache_key and should_cache(content_type, CacheLayer.BACKEND):
        ModernCacheManager.set(cache_key, payload, cache_time, content_type)
    
    # 构建响应
    response = Response(payload)
    
    # 设置现代响应头
    for key, value in CacheHeaders.generate_response_headers(content_type).items():
        response[key] = value
    
    return response


