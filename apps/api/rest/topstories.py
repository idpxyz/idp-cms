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
    """计算TopStory评分 - 增强版：优先显示新内容"""
    pop_1h = float(item.get("pop_1h", 0.0))
    pop_24h = float(item.get("pop_24h", 0.0))
    quality = float(item.get("quality_score", 1.0))
    weight = float(item.get("weight", 0.0))  # 编辑权重
    
    # 新鲜度：缩短半衰期，让新文章优势更明显（6h半衰期）
    recency = 1.0
    hours_ago = 0
    try:
        pt = item.get("publish_at") or item.get("publish_time") or item.get("first_published_at")
        if isinstance(pt, str) and len(pt) >= 10:
            ts = pt.replace("Z", "+00:00")
            dt = datetime.fromisoformat(ts)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=dt_timezone.utc)
            now = datetime.now(dt_timezone.utc)
            hours_ago = (now - dt).total_seconds() / 3600
            recency = math.exp(-hours_ago * math.log(2) / 6)  # 🎯 缩短到6h半衰期
    except Exception:
        recency = 0.5
        hours_ago = 24  # 默认认为24小时前
    
    # 热度评分：基于用户行为数据
    popularity_score = pop_1h * 0.4 + pop_24h * 0.3
    
    # 编辑权重评分：归一化到0-1，权重200+为满分
    editorial_score = min(weight / 200.0, 1.0)
    
    # 🎯 新文章额外加成：24小时内的文章获得额外权重
    freshness_bonus = 1.0
    if hours_ago <= 24:  # 24小时内
        if hours_ago <= 6:   # 6小时内，最高加成
            freshness_bonus = 1.5
        elif hours_ago <= 12:  # 12小时内，中等加成
            freshness_bonus = 1.3
        else:  # 24小时内，轻微加成
            freshness_bonus = 1.2
    
    # 综合评分：提高新鲜度权重，确保新文章优先显示
    # 基础分 + 新鲜度加成，然后乘以质量系数
    base_score = popularity_score + editorial_score * 0.5
    score = base_score * quality * recency * freshness_bonus
    
    return max(0.0, score)


def _enrich_with_images(items: list, site) -> list:
    """
    为文章列表补充图片URL
    优先使用封面图片，如果没有则从正文提取第一张图片
    """
    if not items:
        return items
    
    # 收集需要补充图片的文章 slug
    slugs_need_cover = []
    for item in items:
        if not item.get("image_url") and item.get("slug"):
            slugs_need_cover.append(item.get("slug"))
    
    # 如果所有文章都已有图片，直接返回
    if not slugs_need_cover:
        return items
    
    # 批量查询数据库补充图片
    from apps.news.models import ArticlePage
    from wagtail.images import get_image_model
    import re
    
    slug_to_cover = {}
    try:
        Image = get_image_model()
        
        # 查询文章的封面 ID 和正文
        qs = ArticlePage.objects.filter(
            slug__in=slugs_need_cover
        ).values('slug', 'cover_id', 'body')
        
        # 获取所有封面图片 ID
        cover_ids = [row.get('cover_id') for row in qs if row.get('cover_id')]
        
        # 批量获取图片 URL
        id_to_url = {}
        if cover_ids:
            for img in Image.objects.filter(id__in=cover_ids).only("id", "file"):
                try:
                    # 使用媒体代理URL
                    from apps.core.url_config import URLConfig
                    file_path = str(img.file.name)
                    id_to_url[img.id] = URLConfig.build_media_proxy_url(file_path, for_internal=False)
                except Exception:
                    pass
        
        # 构建 slug -> image_url 映射
        for row in qs:
            url = id_to_url.get(row.get("cover_id"), "")
            if not url:
                # 从正文提取第一张图片
                body_html = str(row.get("body") or "")
                m = re.search(r'embedtype="image"[^>]*id="(\d+)"', body_html, re.I)
                if m:
                    # 从 Wagtail embed 标签提取图片 ID
                    try:
                        img_id = int(m.group(1))
                        img = Image.objects.filter(id=img_id).only("id", "file").first()
                        if img:
                            file_path = str(img.file.name)
                            url = URLConfig.build_media_proxy_url(file_path, for_internal=False)
                    except Exception:
                        pass
                
                if not url:
                    # 尝试提取普通 img 标签
                    m = re.search(r'<img[^>]*src=["\']([^"\']+)["\']', body_html, re.I)
                    if m:
                        url = m.group(1)
            
            if url:
                slug_to_cover[row["slug"]] = url
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"补充图片URL失败: {e}")
    
    # 将图片URL添加到文章项中
    for item in items:
        if not item.get("image_url"):
            slug = item.get("slug", "")
            cover_url = slug_to_cover.get(slug, "")
            item["image_url"] = cover_url if cover_url else "/images/default-covers/default.svg"
    
    return items


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
    
    # 尝试从缓存获取（开发环境也启用缓存，避免重复OpenSearch查询）
    cached_data = cache.get(cache_key)
    if cached_data:  # ✅ 开发环境也使用缓存，提升 LCP 性能
        return Response({
            **cached_data,
            'cache_info': {
                'hit': True,
                'ttl': get_cache_time('hot', 'backend'),
                'type': 'topstories_complex',
                'debug_mode': settings.DEBUG
            }
        })
    
    # 召回候选：使用OpenSearch
    import time as _t
    t0 = _t.time()
    client = get_client()
    index = index_name_for(site_name)
    
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
        
        # 首先收集所有候选项，然后智能处理seen列表
        all_items = []
        for h in resp.get("hits", {}).get("hits", []):
            returned_hits += 1
            src = h.get("_source", {})
                
            item = {"id": h.get("_id"), **src}
            
            # 兜底 publish_at
            if not item.get("publish_at") and item.get("publish_time"):
                item["publish_at"] = item["publish_time"]
            
            # 计算TopStory评分
            item["topstory_score"] = _compute_topstory_score(item)
            
            # 标记是否已seen
            item["_is_seen"] = str(h.get("_id")) in combined_seen
            all_items.append(item)
        
        # 优先选择未seen的，但如果未seen的不够，则包含一些seen的
        unseen_items = [item for item in all_items if not item["_is_seen"]]
        seen_items = [item for item in all_items if item["_is_seen"]]
        
        # 确保至少有size/2个候选项（即使包含seen的）
        min_candidates = max(size // 2, 3)
        if len(unseen_items) >= min_candidates:
            candidates = unseen_items
        else:
            # 需要补充一些seen的项目
            needed = min_candidates - len(unseen_items)
            candidates = unseen_items + seen_items[:needed]
        
        # 移除临时标记
        for item in candidates:
            item.pop("_is_seen", None)
        
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
            
            # 🎯 优先处理高权重文章（权重>100的重要文章）
            high_priority_items = [item for item in clustered if item.get("weight", 0) > 100]
            regular_items = [item for item in clustered if item.get("weight", 0) <= 100]
            
            # 先添加高权重文章，不受多样性限制
            for item in high_priority_items[:3]:  # 最多3篇高权重文章
                final_items.append(item)
                if len(final_items) >= size:
                    break
            
            # 然后按多样性规则添加常规文章
            for item in regular_items:
                if len(final_items) >= size:
                    break
                    
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
                
                # 限制同频道、同主题的数量（但不影响已添加的高权重文章）
                def get_channel_slug(x):
                    ch = x.get("channel", {})
                    return ch.get("slug", "") if isinstance(ch, dict) else str(ch) if ch else ""

                def get_topic_slug(x):
                    tp = x.get("topic", {})
                    return tp.get("slug", "") if isinstance(tp, dict) else str(tp) if tp else ""

                # 只对常规权重文章统计多样性
                regular_final_items = [x for x in final_items if x.get("weight", 0) <= 100]
                channel_count = sum(1 for x in regular_final_items if get_channel_slug(x) == channel)
                topic_count = sum(1 for x in regular_final_items if get_topic_slug(x) == topic)
                
                if channel_count < 2 and topic_count < 2:
                    final_items.append(item)
                elif len(final_items) < size * 0.8:  # 80%填满后放宽限制
                    final_items.append(item)
                    
        else:
            # 中低多样性：主要按评分排序
            final_items = clustered[:size]
        
        t2 = _t.time()
        
        # 🖼️ 补充图片URL（类似 Portal API 的逻辑）
        final_items = _enrich_with_images(final_items, site)
        
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
