from typing import List, Optional
from datetime import datetime, timezone as dt_timezone, timedelta
from celery import shared_task
from config.celery import app
from django.core.cache import cache
from django.conf import settings

from apps.searchapp.client import get_client, index_name_for
from apps.searchapp.queries import build_query
from apps.api.rest.headlines import _cluster_items, _compute_headline_score
from apps.api.rest.hot import _cluster_by_title, _compute_hot_score


def _match_region(item: dict, region: Optional[str]) -> bool:
    if not region:
        return True
    val = str(item.get("region") or item.get("locale") or "").lower()
    return (val.startswith(region.lower()) or val == region.lower()) if val else True


def _match_lang(item: dict, lang: Optional[str]) -> bool:
    if not lang:
        return True
    val = str(item.get("lang") or item.get("language") or item.get("locale") or "").lower()
    return (val.startswith(lang.lower()) or val == lang.lower()) if val else True


def _apply_headline_diversity(items: List[dict], diversity: str, limit: int) -> List[dict]:
    if not items:
        return []
    
    # 对于headlines，采用多轮筛选策略确保多样性
    if diversity == "high":
        return _apply_headlines_high_diversity(items, limit)
    elif diversity == "med":
        return _apply_headlines_med_diversity(items, limit)
    else:
        return items[:limit]

def _apply_headlines_high_diversity(items: List[dict], limit: int) -> List[dict]:
    """
    高多样性策略：仿照今日头条的做法
    - 确保至少3-4个不同频道有内容
    - 避免单一频道超过50%占比
    - 优先保证热门内容，但平衡频道分布
    """
    if not items:
        return []
    
    # 按频道分组并排序
    by_channel = {}
    for item in items:
        channel = (item.get("channel") or "default").strip().lower()
        if channel not in by_channel:
            by_channel[channel] = []
        by_channel[channel].append(item)
    
    # 每个频道按评分排序
    for channel in by_channel:
        by_channel[channel].sort(key=lambda x: x.get("headline_score", 0), reverse=True)
    
    result = []
    channel_count = {}  # 跟踪每个频道已选择的数量
    max_per_channel = max(1, limit // 2)  # 单个频道最多占一半
    
    # 多轮选择：确保平衡
    for round_num in range(max_per_channel):
        round_added = 0
        
        # 按频道最佳剩余文章的评分排序
        available_channels = []
        for channel, items_list in by_channel.items():
            current_count = channel_count.get(channel, 0)
            if current_count < max_per_channel and current_count < len(items_list):
                best_remaining = items_list[current_count]
                available_channels.append((channel, best_remaining))
        
        # 按评分排序
        available_channels.sort(key=lambda x: x[1].get("headline_score", 0), reverse=True)
        
        # 选择这一轮的文章
        for channel, item in available_channels:
            if len(result) >= limit:
                break
            result.append(item)
            channel_count[channel] = channel_count.get(channel, 0) + 1
            round_added += 1
        
        # 如果这轮没有新增，跳出
        if round_added == 0:
            break
    
    print(f"Headlines diversity: {len(by_channel)} channels, {len(result)} items, distribution: {channel_count}")
    return result

def _apply_headlines_med_diversity(items: List[dict], limit: int) -> List[dict]:
    """
    中等多样性策略：每个频道最多2条，避免单一来源
    """
    seen_source = set()
    seen_channel = {}  # channel -> count
    out: List[dict] = []
    
    for it in items:
        src = (it.get("source") or "").strip().lower()
        ch = (it.get("channel") or "").strip().lower()
        
        allow = True
        # 避免相同来源
        if src and src in seen_source:
            allow = False
        # 每个频道最多2条
        if ch and seen_channel.get(ch, 0) >= 2:
            allow = False
            
        if allow:
            out.append(it)
            if src:
                seen_source.add(src)
            if ch:
                seen_channel[ch] = seen_channel.get(ch, 0) + 1
        
        if len(out) >= limit:
            break
    
    return out


@app.task(autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def compute_headlines(
    site: Optional[str] = None,
    *,
    hours: int = 24,
    region: Optional[str] = None,
    lang: Optional[str] = None,
    diversity: str = "med",
    precompute_size: int = 200,  # 增加预计算大小支持更多换一换
):
    """
    Precompute site-wide headlines and store into Redis cache for fast reads.
    Stores under key: agg:headlines:v1:{site}:{region}:{lang}:{hours}:{diversity}
    """
    site = site or settings.SITE_HOSTNAME

    client = get_client()
    index = index_name_for(site)
    elastic_size = max(precompute_size * 40, 400)
    body = build_query(
        "recommend_default",
        site=site,
        channels=[],  # 空数组表示查询所有频道
        hours=hours,
        seen_ids=[],
        size=elastic_size,
    )

    candidates: List[dict] = []
    try:
        resp = client.search(index=index, body=body, request_timeout=5)
        for h in resp.get("hits", {}).get("hits", []):
            src = h.get("_source", {})
            item = {"id": h.get("_id"), **src}
            if not item.get("publish_at") and item.get("publish_time"):
                item["publish_at"] = item["publish_time"]
            candidates.append(item)
    except Exception:
        # Fallback: none (precompute can skip on failure)
        candidates = []

    # Filter and score
    candidates = [c for c in candidates if _match_region(c, region) and _match_lang(c, lang)]
    for c in candidates:
        c["headline_score"] = _compute_headline_score(c)
    candidates.sort(key=lambda x: x.get("headline_score", 0.0), reverse=True)

    # Cluster and diversify
    clustered = _cluster_items(candidates, similarity=0.88)
    diversified = _apply_headline_diversity(clustered, diversity=diversity, limit=max(precompute_size * 2, 160))
    
    # 对于头条新闻，优先保证多样性，即使数量少一些
    # 只有在多样性结果为空时才回退到原始结果
    if len(diversified) == 0:
        diversified = clustered[: max(precompute_size, 80)]  # 减少回退数量

    cache_key = f"agg:headlines:v1:{site}:{(region or '-')}:{(lang or '-')}:{hours}:{diversity}"
    cache.set(cache_key, {"items": diversified}, timeout=60)
    return {"ok": True, "site": site, "count": len(diversified)}


def _apply_hot_diversity(items: List[dict], diversity: str, limit: int) -> List[dict]:
    if not items:
        return []
    seen_source = set()
    seen_channel = set()
    out: List[dict] = []
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
        if len(out) >= limit:
            break
    return out


@app.task(autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def compute_hot(
    site: Optional[str] = None,
    *,
    hours: int = 168,
    region: Optional[str] = None,
    lang: Optional[str] = None,
    diversity: str = "med",
    precompute_size: int = 120,
    buckets: str = "1h,6h,24h",
):
    """
    Precompute site-wide hot items and store into Redis cache for fast reads.
    Stores under key: agg:hot:v1:{site}:{region}:{lang}:{hours}:{buckets}:{diversity}
    """
    site = site or settings.SITE_HOSTNAME

    client = get_client()
    index = index_name_for(site)
    elastic_size = max(precompute_size * 20, 600)
    body = build_query(
        "recommend_default",
        site=site,
        channels=["hot"],
        hours=hours,
        size=elastic_size,
    )

    candidates: List[dict] = []
    try:
        resp = client.search(index=index, body=body, request_timeout=6)
        for h in resp.get("hits", {}).get("hits", []):
            src = h.get("_source", {})
            item = {"id": h.get("_id"), **src}
            if not item.get("publish_at") and item.get("publish_time"):
                item["publish_at"] = item["publish_time"]
            candidates.append(item)
    except Exception:
        candidates = []

    candidates = [c for c in candidates if _match_region(c, region) and _match_lang(c, lang)]
    for c in candidates:
        c["hot_score"] = _compute_hot_score(c)

    # Bucketize by recency and sort inside each bucket by hot_score
    now = datetime.now(dt_timezone.utc)

    def _age_hours(it: dict) -> float:
        try:
            pt = it.get("publish_at") or it.get("publish_time")
            if isinstance(pt, str) and len(pt) >= 10:
                ts = pt.replace("Z", "+00:00")
                dt = datetime.fromisoformat(ts)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=dt_timezone.utc)
                return max(0.0, (now - dt).total_seconds() / 3600.0)
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

    clustered = _cluster_by_title(b1 + b6 + b24 + brest, similarity=0.88)
    flattened: List[dict] = []
    for cl in clustered:
        top2 = sorted(cl["items"], key=lambda x: x.get("hot_score", 0), reverse=True)[:2]
        for it in top2:
            it["cluster_slug"] = cl["slug"]
            flattened.append(it)

    diversified = _apply_hot_diversity(flattened, diversity=diversity, limit=max(precompute_size * 2, 200))
    if not diversified:
        diversified = flattened[: max(precompute_size * 2, 200)]

    cache_key = f"agg:hot:v1:{site}:{(region or '-')}:{(lang or '-')}:{hours}:{buckets}:{diversity}"
    cache.set(cache_key, {"items": diversified}, timeout=60)
    return {"ok": True, "site": site, "count": len(diversified)}


