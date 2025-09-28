"""
专题API端点 - 重构版本

整合了两种专题功能：
1. 基于数据库的 Topic 模型（新功能）
2. 基于聚类算法的热门话题（保留原有功能）

支持向后兼容和新的专题管理功能
"""

import re, math, hashlib, json, base64
from difflib import SequenceMatcher
from datetime import datetime, timedelta, timezone as dt_timezone
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q, Count, Prefetch
from django.core.cache import cache
from django.utils import timezone

# Import models
from apps.core.site_utils import get_site_from_request
from apps.searchapp.client import get_client, index_name_for
from apps.searchapp.queries import build_query
from apps.news.models import ArticlePage, Topic
from wagtail.models import Site

# Import serializers and utilities
from apps.api.serializers.taxonomy import TopicSerializer, TopicDetailSerializer
from .utils import (
    validate_site_parameter,
    apply_field_filtering,
    generate_cache_key,
    generate_etag,
    generate_surrogate_keys
)
from ..utils.rate_limit import FEED_RATE_LIMIT as TOPIC_RATE_LIMIT
from ..utils.cache_performance import monitor_cache_performance
import logging

logger = logging.getLogger(__name__)


# ==================== 聚类算法函数 (保留原有功能) ====================

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


# ==================== 新的专题 API (基于 Topic 模型) ====================

@api_view(["GET"])
@TOPIC_RATE_LIMIT
@monitor_cache_performance("topics_list")
def topics_list(request):
    """
    获取专题列表（基于数据库 Topic 模型）
    
    支持参数：
    - site: 站点标识（主机名或site_id）
    - fields: 字段白名单选择
    - active_only: 仅显示启用的专题（默认true）
    - featured_only: 仅显示推荐专题（默认false）
    - order: 排序方式（-is_featured, order, -created_at, title）
    - limit: 限制数量
    - search: 搜索关键词（标题和摘要）
    """
    try:
        # 1. 验证站点参数
        site = validate_site_parameter(request)
        if not site:
            return Response({
                "error": "Invalid site parameter"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 2. 获取查询参数
        fields = request.query_params.get('fields', '').split(',') if request.query_params.get('fields') else None
        active_only = request.query_params.get('active_only', 'true').lower() == 'true'
        featured_only = request.query_params.get('featured_only', 'false').lower() == 'true'
        order_by = request.query_params.get('order', '-is_featured')
        limit = request.query_params.get('limit')
        search_query = request.query_params.get('search', '').strip()
        
        # 3. 生成缓存键
        cache_params = {
            'site_id': site.id,
            'fields': ','.join(fields) if fields else '',
            'active_only': active_only,
            'featured_only': featured_only,
            'order': order_by,
            'limit': limit or '',
            'search': search_query
        }
        cache_key = generate_cache_key("topics_list", cache_params)
        
        # 4. 尝试从缓存获取
        cached_result = cache.get(cache_key)
        if cached_result:
            response = Response(cached_result)
            response['X-Cache'] = 'HIT'
            response['ETag'] = generate_etag(cached_result)
            response['Cache-Control'] = 'public, max-age=600'  # 10分钟缓存
            response['Surrogate-Key'] = f'topics site-{site.id}'
            return response
        
        # 5. 构建查询
        queryset = Topic.objects.filter(sites=site)
        
        # 激活状态过滤
        if active_only:
            queryset = queryset.filter(is_active=True)
            
            # 检查时间范围
            now = timezone.now()
            queryset = queryset.filter(
                Q(start_date__isnull=True) | Q(start_date__lte=now)
            ).filter(
                Q(end_date__isnull=True) | Q(end_date__gte=now)
            )
        
        # 推荐专题过滤
        if featured_only:
            queryset = queryset.filter(is_featured=True)
        
        # 搜索功能
        if search_query:
            queryset = queryset.filter(
                Q(title__icontains=search_query) |
                Q(summary__icontains=search_query)
            )
        
        # 6. 性能优化 - 预加载相关数据
        queryset = queryset.prefetch_related(
            'sites',
            Prefetch('articles', queryset=ArticlePage.objects.filter(live=True))
        )
        
        # 7. 排序
        if order_by == '-is_featured':
            queryset = queryset.order_by('-is_featured', 'order', '-created_at')
        elif order_by == 'order':
            queryset = queryset.order_by('order', 'title')
        elif order_by == '-created_at':
            queryset = queryset.order_by('-created_at')
        elif order_by == 'title':
            queryset = queryset.order_by('title')
        elif order_by == 'articles_count':
            queryset = queryset.annotate(
                articles_count=Count('articles', filter=Q(articles__live=True))
            ).order_by('-articles_count')
        else:
            queryset = queryset.order_by('-is_featured', 'order', '-created_at')
        
        # 8. 限制数量
        if limit:
            try:
                limit_int = min(int(limit), 500)  # 最大500条
                queryset = queryset[:limit_int]
            except (ValueError, TypeError):
                pass
        
        # 9. 序列化
        serializer = TopicSerializer(
            queryset, 
            many=True, 
            context={'request': request}
        )
        result_data = serializer.data
        
        # 10. 字段过滤
        if fields:
            result_data = [
                apply_field_filtering(item, fields) for item in result_data
            ]
        
        # 11. 构建响应
        response_data = {
            "results": result_data,
            "count": len(result_data),
            "site": {
                "hostname": site.hostname,
                "site_name": site.site_name
            }
        }
        
        # 12. 缓存结果
        cache.set(cache_key, response_data, 600)  # 缓存10分钟
        
        # 13. 设置响应头
        response = Response(response_data)
        response['X-Cache'] = 'MISS'
        response['ETag'] = generate_etag(response_data)
        response['Cache-Control'] = 'public, max-age=600'
        response['Surrogate-Key'] = f'topics site-{site.id}'
        
        return response
        
    except Exception as e:
        logger.error(f"Topics list API error: {str(e)}", exc_info=True)
        return Response({
            "error": "Internal server error"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@TOPIC_RATE_LIMIT
@monitor_cache_performance("topic_detail")
def topic_detail_db(request, slug):
    """
    获取专题详情（基于数据库 Topic 模型）
    
    支持参数：
    - site: 站点标识
    - fields: 字段白名单选择
    - include_articles: 是否包含文章列表（默认true）
    - articles_limit: 文章数量限制（默认20）
    """
    try:
        # 1. 验证站点参数
        site = validate_site_parameter(request)
        if not site:
            return Response({
                "error": "Invalid site parameter"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 2. 获取查询参数
        fields = request.query_params.get('fields', '').split(',') if request.query_params.get('fields') else None
        include_articles = request.query_params.get('include_articles', 'true').lower() == 'true'
        articles_limit = request.query_params.get('articles_limit', '20')
        
        # 3. 生成缓存键
        cache_params = {
            'site_id': site.id,
            'slug': slug,
            'fields': ','.join(fields) if fields else '',
            'include_articles': include_articles,
            'articles_limit': articles_limit
        }
        cache_key = generate_cache_key("topic_detail_db", cache_params)
        
        # 4. 尝试从缓存获取
        cached_result = cache.get(cache_key)
        if cached_result:
            response = Response(cached_result)
            response['X-Cache'] = 'HIT'
            response['ETag'] = generate_etag(cached_result)
            response['Cache-Control'] = 'public, max-age=900'  # 15分钟缓存
            response['Surrogate-Key'] = f'topics site-{site.id} topic-{slug}'
            return response
        
        # 5. 查询专题
        try:
            from django.db.models import Q
            now = timezone.now()
            topic = Topic.objects.prefetch_related(
                'sites',
                'template'
            ).filter(
                slug=slug, 
                sites=site, 
                is_active=True
            ).filter(
                # 检查时间范围 - 开始时间为空或已开始
                Q(start_date__isnull=True) | Q(start_date__lte=now)
            ).filter(
                # 结束时间为空或未结束
                Q(end_date__isnull=True) | Q(end_date__gte=now)
            ).first()
            
            if not topic:
                return Response({
                    "error": f"Topic '{slug}' not found or not available"
                }, status=status.HTTP_404_NOT_FOUND)
        
        except Exception as e:
            logger.error(f"Error retrieving topic '{slug}': {str(e)}")
            return Response({
                "error": "Internal server error"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # 6. 序列化
        serializer = TopicDetailSerializer(
            topic, 
            context={'request': request}
        )
        result_data = serializer.data
        
        # 7. 字段过滤
        if fields:
            result_data = apply_field_filtering(result_data, fields)
        
        # 8. 构建响应
        response_data = {
            "topic": result_data,
            "site": {
                "hostname": site.hostname,
                "site_name": site.site_name
            }
        }
        
        # 9. 缓存结果
        cache.set(cache_key, response_data, 900)  # 缓存15分钟
        
        # 10. 设置响应头
        response = Response(response_data)
        response['X-Cache'] = 'MISS'
        response['ETag'] = generate_etag(response_data)
        response['Cache-Control'] = 'public, max-age=900'
        response['Surrogate-Key'] = f'topics site-{site.id} topic-{slug}'
        
        return response
        
    except Exception as e:
        logger.error(f"Topic detail API error: {str(e)}", exc_info=True)
        return Response({
            "error": "Internal server error"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ==================== 热门话题 API (保留原有聚类功能，向后兼容) ====================

@api_view(["GET"])
@throttle_classes([])
@TOPIC_RATE_LIMIT
@monitor_cache_performance("topics_trending")
def topics_trending(request):
    """
    热门话题聚合（基于聚类算法，保留原有功能）
    
    这是原有的 topics 端点功能，用于生成基于内容聚类的热门话题
    """
    try:
        site = get_site_from_request(request)
        size = max(1, min(int(request.query_params.get("size", 20)), 100))
        hours = int(request.query_params.get("hours", 72))
        channels = request.query_params.getlist("channel") or []
        region = request.query_params.get("region")
        lang = request.query_params.get("lang")
        cursor_param = request.query_params.get("cursor")
        start_offset = 0
        
        # 缓存键
        cache_params = {
            'site': site, 'size': size, 'hours': hours,
            'channels': ','.join(channels), 'region': region or '',
            'lang': lang or '', 'cursor': cursor_param or ''
        }
        cache_key = generate_cache_key("topics_trending", cache_params)
        
        cached_result = cache.get(cache_key)
        if cached_result:
            response = Response(cached_result)
            response['X-Cache'] = 'HIT'
            return response
        
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
        
        result_data = {"items": page_items, "next_cursor": next_cursor}
        
        # 缓存结果
        cache.set(cache_key, result_data, 300)  # 缓存5分钟
        
        response = Response(result_data)
        response['X-Cache'] = 'MISS'
        return response
        
    except Exception as e:
        logger.error(f"Topics trending API error: {str(e)}", exc_info=True)
        return Response({
            "error": "Internal server error"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@throttle_classes([])
@TOPIC_RATE_LIMIT  
@monitor_cache_performance("topic_detail_trending")
def topic_detail_trending(request, slug: str):
    """
    热门话题详情（基于聚类算法，保留原有功能）
    """
    try:
        site = get_site_from_request(request)
        hours = int(request.query_params.get("hours", 72))
        channels = request.query_params.getlist("channel") or []
        region = request.query_params.get("region")
        lang = request.query_params.get("lang")
        
        # 缓存键
        cache_params = {
            'site': site, 'slug': slug, 'hours': hours,
            'channels': ','.join(channels), 'region': region or '',
            'lang': lang or ''
        }
        cache_key = generate_cache_key("topic_detail_trending", cache_params)
        
        cached_result = cache.get(cache_key)
        if cached_result:
            response = Response(cached_result)
            response['X-Cache'] = 'HIT'
            return response

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
        
        # 缓存结果
        cache.set(cache_key, detail, 300)  # 缓存5分钟
        
        response = Response(detail)
        response['X-Cache'] = 'MISS'
        return response
        
    except Exception as e:
        logger.error(f"Topic detail trending API error: {str(e)}", exc_info=True)
        return Response({
            "error": "Internal server error"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ==================== 向后兼容的端点别名 ====================

@api_view(["GET"])
@TOPIC_RATE_LIMIT
@monitor_cache_performance("topic_articles")
def topic_articles_db(request, slug):
    """
    获取专题的相关文章（基于数据库 Topic 模型）
    
    支持参数：
    - site: 站点标识
    - limit: 文章数量限制（默认12）
    - ordering: 排序方式（默认-first_published_at）
    - tags: 标签过滤
    """
    try:
        # 1. 验证站点参数
        site = validate_site_parameter(request)
        if not site:
            return Response({
                "error": "Invalid site parameter"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 2. 获取查询参数
        limit = int(request.query_params.get('limit', '12'))
        ordering = request.query_params.get('ordering', '-first_published_at')
        tags_filter = request.query_params.get('tags')
        
        # 3. 查询专题
        try:
            from django.db.models import Q
            now = timezone.now()
            topic = Topic.objects.prefetch_related('sites').filter(
                slug=slug, 
                sites=site, 
                is_active=True
            ).filter(
                Q(start_date__isnull=True) | Q(start_date__lte=now)
            ).filter(
                Q(end_date__isnull=True) | Q(end_date__gte=now)
            ).first()
            
            if not topic:
                return Response({
                    "results": [],
                    "count": 0,
                    "error": f"Topic '{slug}' not found or not available"
                }, status=status.HTTP_404_NOT_FOUND)
        
        except Exception as e:
            logger.error(f"Error retrieving topic '{slug}': {str(e)}")
            return Response({
                "error": "Internal server error"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # 4. 构建文章查询集
        from apps.news.models import ArticlePage
        articles_queryset = ArticlePage.objects.filter(
            topics=topic, 
            live=True
        )
        
        # 5. 应用标签过滤
        if tags_filter:
            articles_queryset = articles_queryset.filter(tags__name__icontains=tags_filter)
        
        # 6. 应用排序
        if ordering:
            try:
                articles_queryset = articles_queryset.order_by(ordering)
            except Exception:
                # 如果排序字段无效，使用默认排序
                articles_queryset = articles_queryset.order_by('-first_published_at')
        else:
            # 默认排序：特色文章优先，然后按权重和发布时间
            articles_queryset = articles_queryset.order_by(
                '-is_featured',
                '-weight', 
                '-first_published_at'
            )
        
        # 7. 应用限制（在排序和过滤之后）
        articles_queryset = articles_queryset[:limit]
        
        # 8. 序列化文章数据（简化版本，避免标签序列化问题）
        articles_data = []
        for article in articles_queryset:
            article_dict = {
                "id": article.id,
                "title": article.title,
                "slug": article.slug,
                "excerpt": article.excerpt,
                "author_name": article.author_name,
                "first_published_at": article.first_published_at.isoformat() if article.first_published_at else None,
                "is_featured": article.is_featured,
                "weight": article.weight,
                "reading_time": getattr(article, 'reading_time', None),
                "view_count": getattr(article, 'view_count', 0),
            }
            
            # 安全地获取封面图片
            if hasattr(article, 'cover') and article.cover:
                try:
                    article_dict["cover_url"] = article.cover.get_rendition('original').url
                except:
                    article_dict["cover_url"] = None
            else:
                article_dict["cover_url"] = None
            
            articles_data.append(article_dict)
        
        response_data = {
            "results": articles_data,
            "count": len(articles_data),
            "topic": {
                "slug": topic.slug,
                "title": topic.title,
                "summary": topic.summary
            }
        }
        
        # 9. 设置响应头
        response = Response(response_data)
        response['Cache-Control'] = 'public, max-age=300'  # 5分钟缓存
        response['Surrogate-Key'] = f'topic-articles topic-{slug} site-{site.id}'
        
        return response
        
    except Exception as e:
        logger.error(f"Topic articles API error: {str(e)}", exc_info=True)
        return Response({
            "results": [],
            "count": 0,
            "error": "Internal server error"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# 保持原有路由的向后兼容
topics = topics_trending  # 原有的 topics 端点指向 trending
topic_detail = topic_detail_trending  # 原有的 topic_detail 端点指向 trending