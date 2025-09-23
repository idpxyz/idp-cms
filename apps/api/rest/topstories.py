"""
TopStories API - 专用的头条新闻数据端点
包含复杂的推荐算法、聚类去重、多样性控制等
"""

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
    """文本标准化"""
    if not text:
        return ""
    t = text.lower()
    t = re.sub(r"\s+", " ", t)
    t = re.sub(r"[^\w\u4e00-\u9fff ]+", "", t)
    return t.strip()


def _slugify(text: str) -> str:
    """生成slug"""
    base = _normalize_text(text)
    base = re.sub(r"\s+", "-", base)
    h = hashlib.md5(base.encode("utf-8")).hexdigest()[:6]
    return (base[:48] + ("-" if base else "") + h) or h


def _compute_topstory_score(item: dict) -> float:
    """计算TopStory评分"""
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
            hours_ago = (now - dt).total_seconds() / 3600
            recency = math.exp(-hours_ago * math.log(2) / 12)  # 12h半衰期
    except Exception:
        recency = 0.5
    
    # 综合评分：爆发度 + 质量 + 新鲜度
    score = (pop_1h * 0.4 + pop_24h * 0.3) * quality * recency
    return max(0.0, score)


def _cluster_items(items: list, similarity: float = 0.92) -> list:
    """聚类去重算法"""
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
                    if it.get("topstory_score", 0) > cl["rep"].get("topstory_score", 0):
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
                if it.get("topstory_score", 0) > cl["rep"].get("topstory_score", 0):
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
@throttle_classes([])  # 使用自定义限流
@FEED_RATE_LIMIT
def topstories(request):
    """
    TopStories API - 复杂的头条新闻推荐
    
    参数:
    - size: 返回数量，默认9，最大30
    - hours: 时间窗口（小时），默认24
    - diversity: 多样性级别 (high/med/low)，默认high
    - exclude_cluster_ids: 排除的聚类ID列表
    - site: 站点域名
    
    返回:
    - items: TopStories项目列表
    - debug: 调试信息
    """
    site = get_site_from_request(request)
    size = max(1, min(int(request.query_params.get("size", 9)), 30))
    hours = int(request.query_params.get("hours", 24))
    diversity = request.query_params.get("diversity", "high")
    exclude_clusters = request.query_params.getlist("exclude_cluster_ids") or []
    
    # 获取站点名称（处理字符串和对象两种情况）
    site_name = site.hostname if hasattr(site, 'hostname') else str(site)
    
    # 会话级去重
    session_id = request.headers.get("X-Session-ID") or request.headers.get("X-AB-Session") or "anon"
    seen_cache_key = f"topstories:seen:{site_name}:{session_id}"
    cached_seen = cache.get(seen_cache_key, [])
    cached_seen = [str(x) for x in (cached_seen or [])]
    combined_seen = list(dict.fromkeys(cached_seen))
    
    # 构建缓存key
    cache_params = f"{size}:{hours}:{diversity}:{len(exclude_clusters)}:{len(combined_seen)}"
    cache_key = f"topstories:{site_name}:{hashlib.md5(cache_params.encode()).hexdigest()[:8]}"
    
    # 尝试从缓存获取
    cached_data = cache.get(cache_key)
    if cached_data and not settings.DEBUG:
        return Response({
            **cached_data,
            'cache_info': {
                'hit': True,
                'ttl': get_cache_time('hot', 'backend'),
                'type': 'topstories_complex'
            }
        })
    
    # 召回候选：使用OpenSearch
    import time as _t
    t0 = _t.time()
    client = get_client()
    index = index_name_for(site)
    
    # 提高ES候选量，缓解多样性与去重后的空集风险
    elastic_size = max(size * 40, 400)
    
    # 🎯 使用专门的TopStories查询模板
    query_template = "topstories_default"
    
    # TopStories模式：不限制频道，获取全站最佳内容
    query_channels = []
    
    # TopStories只获取非Hero内容 (is_hero=false)
    non_hero_filter = {"term": {"is_hero": False}}
    
    body = build_query(
        query_template,
        site=site,
        channels=query_channels,
        hours=hours,
        seen_ids=combined_seen,
        size=elastic_size,
        extra_filters=[non_hero_filter]  # 只要非Hero内容
    )
    
    candidates = []
    total_hits = 0
    returned_hits = 0
    
    try:
        resp = client.search(index=index, body=body, request_timeout=8)
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
            
            # 计算TopStory评分
            item["topstory_score"] = _compute_topstory_score(item)
            
            candidates.append(item)
        
        t1 = _t.time()
        
        # 按评分排序
        candidates.sort(key=lambda x: x.get("topstory_score", 0), reverse=True)
        
        # 聚类去重
        similarity_threshold = {"high": 0.95, "med": 0.92, "low": 0.88}.get(diversity, 0.92)
        clustered = _cluster_items(candidates, similarity_threshold)
        
        # 排除指定的聚类
        if exclude_clusters:
            clustered = [item for item in clustered if item.get("cluster_slug") not in exclude_clusters]
        
        # 多样性采样
        if diversity == "high":
            # 高多样性：确保频道、主题分散
            final_items = []
            used_channels = set()
            used_topics = set()
            
            for item in clustered:
                # 处理channel可能是字符串或字典的情况
                channel_obj = item.get("channel", {})
                if isinstance(channel_obj, dict):
                    channel = channel_obj.get("slug", "")
                else:
                    channel = str(channel_obj) if channel_obj else ""
                
                # 处理topic可能是字符串或字典的情况  
                topic_obj = item.get("topic", {})
                if isinstance(topic_obj, dict):
                    topic = topic_obj.get("slug", "")
                else:
                    topic = str(topic_obj) if topic_obj else ""
                
                # 限制同频道、同主题的数量
                def get_channel_slug(x):
                    ch = x.get("channel", {})
                    return ch.get("slug", "") if isinstance(ch, dict) else str(ch) if ch else ""
                
                def get_topic_slug(x):
                    tp = x.get("topic", {})
                    return tp.get("slug", "") if isinstance(tp, dict) else str(tp) if tp else ""
                
                channel_count = sum(1 for x in final_items if get_channel_slug(x) == channel)
                topic_count = sum(1 for x in final_items if get_topic_slug(x) == topic)
                
                if channel_count < 2 and topic_count < 2:
                    final_items.append(item)
                elif len(final_items) < size * 0.8:  # 80%填满后放宽限制
                    final_items.append(item)
                
                if len(final_items) >= size:
                    break
                    
        else:
            # 中低多样性：主要按评分排序
            final_items = clustered[:size]
        
        t2 = _t.time()
        
        # 构建响应数据
        response_data = {
            'items': final_items,
            'debug': {
                'site': site_name,
                'hours': hours,
                'diversity': diversity,
                'total_hits': total_hits,
                'returned_hits': returned_hits,
                'candidates': len(candidates),
                'clusters': len(clustered),
                'final_count': len(final_items),
                'exclude_clusters_count': len(exclude_clusters),
                'seen_count': len(combined_seen),
                'timing': {
                    'opensearch_ms': round((t1 - t0) * 1000, 2),
                    'processing_ms': round((t2 - t1) * 1000, 2),
                    'total_ms': round((t2 - t0) * 1000, 2)
                },
                'api_version': 'topstories_v1'
            }
        }
        
        # 缓存结果（使用热点新闻的缓存策略）
        cache_ttl = get_cache_time('hot', 'backend')
        cache.set(cache_key, response_data, cache_ttl)
        
        # 更新已看过的内容
        new_seen = [str(item.get("id")) for item in final_items]
        updated_seen = list(dict.fromkeys(combined_seen + new_seen))[-200:]  # 保留最近200个
        cache.set(seen_cache_key, updated_seen, 3600)  # 1小时
        
        # 添加缓存信息
        response_data['cache_info'] = {
            'hit': False,
            'ttl': cache_ttl,
            'type': 'topstories_complex',
            'key': cache_key
        }
        
        return Response(response_data)
        
    except Exception as e:
        # 错误处理
        error_response = {
            'items': [],
            'error': {
                'message': 'Failed to fetch topstories',
                'type': 'opensearch_error',
                'debug': str(e) if settings.DEBUG else None
            },
            'debug': {
                'site': site_name,
                'hours': hours,
                'diversity': diversity,
                'api_version': 'topstories_v1'
            }
        }
        
        return Response(error_response, status=500)
