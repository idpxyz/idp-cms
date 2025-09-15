import base64, json, time
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.response import Response
from django.conf import settings
from django.core.cache import cache
from apps.searchapp.client import get_client, index_name_for
from apps.searchapp.queries import build_query
from apps.core.flags import flag, ab_bucket
from apps.core.site_utils import get_site_from_request
from .features import fetch_agg_features
from .rank import score_and_diversify
from .anonymous_recommendation import get_anonymous_recommendation_config
from ..utils.rate_limit import FEED_RATE_LIMIT
from apps.news.models.article import ArticlePage
import re
from django.utils import timezone
from datetime import timedelta
from wagtail.models import Site
import logging

def score_and_diversify_anonymous(candidates, agg_features, sort_by="final_score", strategy=None):
    """
    匿名用户个性化排序和多样性控制
    """
    from collections import defaultdict
    
    # 获取策略配置
    diversity_boost = strategy.get("diversity_boost", 0.2) if strategy else 0.2
    channel_weights = strategy.get("weights", {}) if strategy else {}
    
    # 计算个性化分数
    for c in candidates:
        # 基础分数
        base_score = c.get("score", 0.0)
        
        # CTR分数
        ctr = agg_features.get(c["id"], {}).get("ctr_1h", c.get("ctr_1h", 0.0))
        
        # 质量分数
        quality = c.get("quality_score", 1.0)
        
        # 频道权重分数
        channel = c.get("channel", "unknown")
        channel_weight = channel_weights.get(channel, 1.0)
        
        # 计算最终分数
        c["final_score"] = (
            0.4 * base_score +           # 基础召回分数
            0.3 * ctr +                  # CTR分数
            0.2 * quality +              # 质量分数
            0.1 * channel_weight         # 频道权重分数
        )
    
    # 根据指定字段排序
    sort_field = sort_by
    if sort_field == "popularity":
        sort_field = "pop_24h"
    elif sort_field == "hot":
        sort_field = "pop_1h"
    elif sort_field == "ctr":
        sort_field = "ctr_24h"
    
    candidates.sort(key=lambda x: x.get(sort_field, 0), reverse=True)
    
    # 多样性控制 - 根据策略类型调整限制
    strategy_type = strategy.get("type", "unknown") if strategy else "unknown"
    
    if strategy_type == "cold_start":
        # 冷启动：优先内容质量，最小多样性限制
        limit_author = 999    # 基本不限制优质作者
        limit_topic = 999     # 基本不限制话题
        limit_channel = 999   # 基本不限制频道
    elif strategy_type == "hybrid":
        # 混合策略：中等多样性控制
        limit_author = 50     # 放宽作者限制
        limit_topic = 100     # 放宽话题限制
        limit_channel = 50    # 放宽频道限制
    else:
        # 个性化或其他：放宽多样性控制
        limit_author = 20     # 放宽作者限制
        limit_topic = 30      # 放宽话题限制
        limit_channel = 20    # 放宽频道限制
    
    seen_author = defaultdict(int)
    seen_topic = defaultdict(int)
    seen_channel = defaultdict(int)
    
    result = []
    for c in candidates:
        author = c.get("author") or "unknown"
        topic = c.get("topic") or "unknown"
        channel = c.get("channel") or "unknown"
        
        # 检查多样性限制 - 对unknown作者和话题不进行限制
        if ((author != "unknown" and seen_author[author] >= limit_author) or 
            (topic != "unknown" and seen_topic[topic] >= limit_topic) or
            seen_channel[channel] >= limit_channel):
            continue
        
        # 添加多样性奖励
        diversity_bonus = 0
        if seen_author[author] == 0:  # 新作者
            diversity_bonus += diversity_boost * 0.3
        if seen_topic[topic] == 0:    # 新话题
            diversity_bonus += diversity_boost * 0.3
        if seen_channel[channel] == 0:  # 新频道
            diversity_bonus += diversity_boost * 0.4
        
        c["final_score"] += diversity_bonus
        
        result.append(c)
        seen_author[author] += 1
        seen_topic[topic] += 1
        seen_channel[channel] += 1
        
        if len(result) >= 9999:  # 基本不限制结果数量
            break
    
    # 按最终分数重新排序
    result.sort(key=lambda x: x.get("final_score", 0), reverse=True)
    
    return result

def encode_cursor(payload: dict) -> str:
    return base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()

def decode_cursor(token: str|None) -> dict:
    if not token: return {}
    return json.loads(base64.urlsafe_b64decode(token.encode()).decode())

@api_view(["GET"])
@throttle_classes([])  # 使用自定义端点限流，禁用DRF默认Anon/User限流避免429
@FEED_RATE_LIMIT
def feed(request):
    # 使用智能站点识别
    site = get_site_from_request(request)
    size = int(request.query_params.get("size", 20))
    cursor = decode_cursor(request.query_params.get("cursor"))
    seen_ids = cursor.get("seen", [])
    # 会话级跨模块去重：合并 session 已展示ID 与 cursor.seen
    session_id = request.headers.get("X-Session-ID") or request.headers.get("X-AB-Session") or "anon"
    seen_cache_key = f"feed:seen:{site}:{session_id}"
    cached_seen = cache.get(seen_cache_key, [])
    # 统一转字符串保证一致性
    def _as_str_list(xs):
        out = []
        for x in xs or []:
            try:
                out.append(str(x))
            except Exception:
                pass
        return out
    cached_seen = _as_str_list(cached_seen)
    seen_ids = _as_str_list(seen_ids)
    combined_seen = []
    for x in cached_seen + seen_ids:
        if x not in combined_seen:
            combined_seen.append(x)

    # 检查是否为匿名用户
    is_anonymous = not request.user.is_authenticated
    
    if is_anonymous:
        # 匿名用户使用智能推荐系统
        try:
            rec_config = get_anonymous_recommendation_config(request, site)
            strategy = rec_config["strategy"]
            profile = rec_config["profile"]
            
            # 使用个性化频道配置，若请求显式传入channel则优先使用请求参数
            req_channels = request.query_params.getlist("channel")
            channels = req_channels if req_channels else strategy.get("channels", [])
            
            # 根据策略类型选择模板
            if strategy["type"] == "cold_start":
                template = "anonymous_cold_start"  # 冷启动专用模板
            else:
                template = "recommend_default"  # 其他情况使用默认模板
            
            # 根据策略调整参数，但尊重用户显式设置的hours参数
            user_hours = request.query_params.get("hours")
            if user_hours:
                hours = int(user_hours)  # 用户显式设置则使用用户参数
            elif strategy["type"] == "cold_start":
                hours = 720  # 冷启动用户看30天内的内容，确保有足够数据
            elif strategy["type"] == "hybrid":
                hours = 48  # 混合策略看48小时
            else:
                hours = flag("recall.window_hours", 72)  # 个性化策略使用默认时间窗
                
        except Exception as e:
            # 如果匿名推荐系统出错，回退到默认逻辑
            print(f"Anonymous recommendation error: {e}")
            template = request.query_params.get("template", "recommend_default")
            channels = request.query_params.getlist("channel") or ["society","tech","finance"]
            hours = flag("recall.window_hours", 72)
            strategy = {"type": "fallback"}
            profile = {"user_type": "anonymous", "confidence_score": 0.0}
    else:
        # 已登录用户使用原有逻辑
        template = request.query_params.get("template", "recommend_default")
        channels = request.query_params.getlist("channel") or ["society","tech","finance"]
        # 尊重用户显式设置的hours参数
        user_hours = request.query_params.get("hours")
        hours = int(user_hours) if user_hours else flag("recall.window_hours", 72)
        strategy = {"type": "authenticated"}
        profile = {"user_type": "authenticated", "confidence_score": 1.0}

    sort_by = request.query_params.get("sort", "final_score")

    # AB：10%使用更窄 24h 窗
    session = request.headers.get("X-AB-Session", "anon")
    if ab_bucket("feed.24h-window", key=session, percent=10):
        hours = min(hours, 24)

    client = get_client()
    idx = index_name_for(site)
    # 为了支持分页，Elasticsearch查询需要返回更多文章
    # 每页20篇，但我们需要查询更多来支持分页
    elasticsearch_size = max(size * 5, 500)  # 至少查询500篇，或者5倍于请求数量
    body = build_query(template, site=site, channels=channels, hours=hours, seen_ids=seen_ids, size=elasticsearch_size)

    candidates = []
    total_hits = 0
    returned_hits = 0
    try:
        resp = client.search(index=idx, body=body)
        total_hits = resp.get("hits", {}).get("total", {}).get("value", 0)
        returned_hits = len(resp.get("hits", {}).get("hits", []))
        for h in resp.get("hits",{}).get("hits",[]):
            if h["_id"] not in combined_seen:
                item = {"id": h["_id"], "score": h.get("_score", 0.0), **h["_source"]}
                # 确保前端兼容性：如果publish_at为空，使用publish_time
                if not item.get("publish_at") and item.get("publish_time"):
                    item["publish_at"] = item["publish_time"]
                candidates.append(item)
        # 如果ES无结果，回退到DB
        if total_hits == 0 or not candidates:
            raise RuntimeError("Empty ES hits, fallback to DB")
    except Exception as e:
        logging.getLogger(__name__).warning(f"OpenSearch fallback to DB: {e}")
        try:
            site_obj = Site.objects.get(hostname=site)
            qs = ArticlePage.objects.live().descendant_of(site_obj.root_page)
        except Exception:
            qs = ArticlePage.objects.live()
        # 时间窗过滤：尊重hours
        try:
            if hours:
                since = timezone.now() - timedelta(hours=int(hours))
                qs = qs.filter(first_published_at__gte=since)
        except Exception:
            pass
        pages = list(qs.order_by('-first_published_at')[:elasticsearch_size])
        if not pages:
            # 回退到全站并适度放宽时间窗
            qs_global = ArticlePage.objects.live()
            try:
                if hours:
                    since = timezone.now() - timedelta(hours=int(hours))
                    qs_global = qs_global.filter(first_published_at__gte=since)
            except Exception:
                pass
            pages = list(qs_global.order_by('-first_published_at')[:elasticsearch_size])
        if not pages:
            # 最后回退：不加时间窗，确保至少返回一些内容
            pages = list(ArticlePage.objects.live().order_by('-first_published_at')[:elasticsearch_size])
        for p in pages:
            pid = str(p.id)
            if pid in combined_seen:
                continue
            candidates.append({
                "id": pid,
                "article_id": pid,
                "title": p.title,
                "publish_time": p.first_published_at.isoformat() if getattr(p, 'first_published_at', None) else None,
                "publish_at": p.first_published_at.isoformat() if getattr(p, 'first_published_at', None) else None,
                "channel": getattr(p, 'channel_slug', 'recommend'),
                "topic": getattr(p, 'topic_slug', ''),
                "author": getattr(p, 'author_name', ''),
                "quality_score": 1.0,
                "ctr_1h": 0.0,
                "pop_1h": 0.0,
                "pop_24h": 0.0,
                "score": 0.0,
            })
        total_hits = len(candidates)
        returned_hits = len(candidates)
    

    agg = fetch_agg_features([c["id"] for c in candidates], site=site)
    
    # 根据用户类型调整排序策略
    if is_anonymous and strategy.get("type") != "fallback":
        # 匿名用户使用个性化排序
        ranked = score_and_diversify_anonymous(candidates, agg, sort_by=sort_by, strategy=strategy)
    else:
        # 已登录用户或回退情况使用原有排序
        ranked = score_and_diversify(candidates, agg, sort_by=sort_by)

    # 后端去重（跨模块更稳妥）：优先使用 canonical_url/url 其后是 (site, slug/id)，最后退化到规范化title
    def _dedup_key(item: dict) -> str:
        url = (item.get("canonical_url") or item.get("url") or "").strip().lower()
        if url:
            return f"url:{url}"
        slug = (str(item.get("slug") or "").strip().lower())
        if slug:
            return f"slug:{site}:{slug}"
        any_id = str(item.get("article_id") or item.get("id") or "").strip()
        if any_id:
            return f"id:{site}:{any_id}"
        title = (item.get("title") or "").strip().lower()
        if title:
            title_norm = re.sub(r"\W+", "", title)
            return f"title:{site}:{title_norm}"
        return f"row:{id(item)}"

    dedup_seen = set()
    dedup_ranked = []
    for r in ranked:
        k = _dedup_key(r)
        if k in dedup_seen:
            continue
        dedup_seen.add(k)
        dedup_ranked.append(r)

    # 截取到请求的size
    ranked = dedup_ranked[:size]

    # 为每个文章添加slug字段（用于前端链接生成）
    article_ids = [r.get("article_id") or r["id"] for r in ranked]
    try:
        # 批量查询文章的slug
        articles_with_slug = ArticlePage.objects.filter(
            id__in=article_ids
        ).values('id', 'slug')
        
        # 创建id到slug的映射
        slug_map = {str(article['id']): article['slug'] for article in articles_with_slug}
        
        # 为每个ranked项添加slug
        for item in ranked:
            item_id = str(item.get("article_id") or item["id"])
            item["slug"] = slug_map.get(item_id, "")
    except Exception as e:
        # 如果查询失败，记录错误但不影响主要功能
        print(f"Warning: Failed to fetch article slugs: {e}")
        for item in ranked:
            item["slug"] = ""

    # 生成next_cursor的逻辑：基于返回文章数量判断
    # 当返回的文章数量小于请求的size时，说明没有更多数据了
    all_seen_ids = combined_seen + [str(r.get("id")) for r in ranked]
    cursor_seen_ids = all_seen_ids[-500:]  # 只保留最近500个用于cursor
    
    next_cursor = ""
    if ranked and len(ranked) == size:
        # 只有当返回数量等于请求数量时，才可能有更多数据
        next_cursor = encode_cursor({
          "seen": cursor_seen_ids,
          "ts": int(time.time()*1000)
        })
    
    # 更新会话级 seen 缓存
    cache.set(seen_cache_key, cursor_seen_ids, timeout=6*3600)

    debug_info = {
        "hours": hours, 
        "template": template, 
        "sort_by": sort_by,
        "opensearch_stats": {
            "total_hits": total_hits,
            "returned_hits": returned_hits,
            "elasticsearch_size": elasticsearch_size,
            "candidates_count": len(candidates),
            "ranked_count": len(ranked),
            "cached_seen_count": len(cached_seen),
            "incoming_seen_count": len(seen_ids),
            "combined_seen_count": len(combined_seen),
            "total_seen_after": len(combined_seen) + len(ranked),
            "has_next_cursor": bool(next_cursor)
        },
        "site": site,
        "host": request.get_host(),
        "user_type": "anonymous" if is_anonymous else "authenticated",
        "strategy_type": strategy.get("type", "unknown"),
        "channels": channels,
        "confidence_score": profile.get("confidence_score", 0.0)
    }
    
    return Response({
        "items": ranked, 
        "next_cursor": next_cursor, 
        "debug": debug_info
    })
