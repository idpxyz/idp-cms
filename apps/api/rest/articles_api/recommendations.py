"""
文章推荐API端点

包含基于文章的智能推荐功能
"""

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from apps.news.models import ArticlePage
from apps.core.models import Channel
from ..utils import (
    validate_site_parameter,
    apply_field_filtering,
    apply_include_expansion,
    generate_etag
)
from ...utils.rate_limit import ARTICLES_RATE_LIMIT
from ...utils.cache_performance import monitor_cache_performance


@api_view(["GET"])
@ARTICLES_RATE_LIMIT
@monitor_cache_performance("article_recommendations")
def article_recommendations(request, article_slug):
    """
    基于文章的智能推荐接口
    
    为当前文章推荐相关文章，使用多种推荐策略：
    1. 同频道相关文章 (40%)
    2. 同标签相关文章 (30%) 
    3. 热门文章推荐 (20%)
    4. 最新文章推荐 (10%)
    
    支持参数：
    - site: 站点标识（主机名或site_id）
    - limit: 返回数量，默认6，最大20
    - exclude_id: 排除的文章ID（通常是当前文章）
    - fields: 字段白名单选择
    - include: 关联展开
    """
    try:
        # 1. 验证站点参数
        site = validate_site_parameter(request)
        if not site:
            return Response(
                {"error": "Invalid or missing site parameter"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 2. 获取查询参数
        fields = request.query_params.get("fields", "").split(",") if request.query_params.get("fields") else []
        includes = request.query_params.get("include", "").split(",") if request.query_params.get("include") else []
        limit = min(int(request.query_params.get("limit", 6)), 20)  # 限制最大20条
        exclude_id = request.query_params.get("exclude_id")
        
        # 3. 获取当前文章信息
        try:
            # 简化查询，先不限制站点层次结构
            current_article = ArticlePage.objects.live().select_related('channel').prefetch_related('tags').get(slug=article_slug)
        except ArticlePage.DoesNotExist:
            return Response(
                {"error": "Article not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # 4. 构建推荐查询 - 智能多策略推荐
        base_queryset = ArticlePage.objects.live().filter(
            path__startswith=site.root_page.path
        ).exclude(id=current_article.id)
        
        # 排除指定ID
        if exclude_id:
            try:
                base_queryset = base_queryset.exclude(id=int(exclude_id))
            except (ValueError, TypeError):
                pass
        
        # 5. 多策略推荐算法
        recommendations = []
        
        # 策略1: 同频道推荐 (40% = 2-3篇)
        if current_article.channel:
            channel_limit = max(1, int(limit * 0.4))
            channel_articles = base_queryset.filter(
                channel=current_article.channel
            ).select_related('channel', 'cover').order_by(
                '-is_featured',  # 精选优先
                '-weight',       # 高权重优先
                '-first_published_at'  # 最新优先
            )[:channel_limit]
            
            recommendations.extend(list(channel_articles))
        
        # 策略2: 同标签推荐 (30% = 1-2篇)
        if hasattr(current_article, 'tags') and current_article.tags.exists():
            tag_limit = max(1, int(limit * 0.3))
            current_tags = list(current_article.tags.all())
            
            if current_tags:
                # 排除已推荐的文章
                exclude_ids = [art.id for art in recommendations] + [current_article.id]
                if exclude_id:
                    try:
                        exclude_ids.append(int(exclude_id))
                    except (ValueError, TypeError):
                        pass
                
                tag_articles = base_queryset.filter(
                    tags__in=current_tags
                ).exclude(
                    id__in=exclude_ids
                ).select_related('channel', 'cover').distinct().order_by(
                    '-weight', '-first_published_at'
                )[:tag_limit]
                
                recommendations.extend(list(tag_articles))
        
        # 策略3: 热门文章补充 (20% = 1篇)
        if len(recommendations) < limit:
            hot_limit = max(1, int(limit * 0.2))
            exclude_ids = [art.id for art in recommendations] + [current_article.id]
            if exclude_id:
                try:
                    exclude_ids.append(int(exclude_id))
                except (ValueError, TypeError):
                    pass
            
            hot_articles = base_queryset.exclude(
                id__in=exclude_ids
            ).filter(
                is_featured=True  # 热门/精选文章
            ).select_related('channel', 'cover').order_by(
                '-weight', '-first_published_at'
            )[:hot_limit]
            
            recommendations.extend(list(hot_articles))
        
        # 策略4: 最新文章补充 (10% = 1篇，填满剩余位置)
        if len(recommendations) < limit:
            remaining = limit - len(recommendations)
            exclude_ids = [art.id for art in recommendations] + [current_article.id]
            if exclude_id:
                try:
                    exclude_ids.append(int(exclude_id))
                except (ValueError, TypeError):
                    pass
            
            recent_articles = base_queryset.exclude(
                id__in=exclude_ids
            ).select_related('channel', 'cover').order_by(
                '-first_published_at'
            )[:remaining]
            
            recommendations.extend(list(recent_articles))
        
        # 6. 限制最终结果数量
        recommendations = recommendations[:limit]
        
        # 7. 序列化推荐文章
        serialized_articles = []
        for article in recommendations:
            article_data = {
                "id": article.id,
                "title": article.title,
                "slug": article.slug,
                "excerpt": getattr(article, 'introduction', ''),
                "publish_at": article.first_published_at.isoformat() if article.first_published_at else None,
                "channel_slug": getattr(article.channel, 'slug', '') if article.channel else '',
                "is_featured": getattr(article, 'is_featured', False),
                "weight": getattr(article, 'weight', 0),
                # 推荐理由
                "recommendation_reason": _get_recommendation_reason(article, current_article)
            }
            
            # 应用字段过滤
            if fields:
                article_data = apply_field_filtering(article_data, fields)
            
            # 应用关联展开
            if includes:
                article_data = apply_include_expansion(article_data, includes, article, site)
            
            serialized_articles.append(article_data)
        
        # 8. 构建响应
        response_data = {
            "recommendations": serialized_articles,
            "meta": {
                "article_slug": article_slug,
                "article_id": current_article.id,
                "total": len(serialized_articles),
                "limit": limit,
                "strategy": "multi_strategy_v1",
                "site": site.hostname,
                "site_id": site.id
            }
        }
        
        # 9. 生成缓存相关头部
        response = Response(response_data)
        
        # Cache-Control: 推荐缓存较短，保证内容新鲜
        response["Cache-Control"] = "public, s-maxage=300, stale-while-revalidate=150"
        
        # ETag
        etag = generate_etag(response_data)
        response["ETag"] = f'"{etag}"'
        
        # Surrogate-Key
        surrogate_keys = [
            f"site:{site.hostname}", 
            f"article:{article_slug}",
            "recommendations"
        ]
        if current_article.channel:
            surrogate_keys.append(f"channel:{current_article.channel.slug}")
        response["Surrogate-Key"] = " ".join(surrogate_keys)
        
        return response
        
    except Exception as e:
        return Response(
            {"error": f"Internal server error: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def _get_recommendation_reason(recommended_article, current_article):
    """
    获取推荐理由
    
    Args:
        recommended_article: 被推荐的文章
        current_article: 当前文章
        
    Returns:
        str: 推荐理由文本
    """
    reasons = []
    
    # 同频道
    if (recommended_article.channel and current_article.channel and 
        recommended_article.channel.id == current_article.channel.id):
        reasons.append(f"同频道·{recommended_article.channel.name}")
    
    # 精选文章
    if getattr(recommended_article, 'is_featured', False):
        reasons.append("编辑精选")
    
    # 高权重
    if getattr(recommended_article, 'weight', 0) > 50:
        reasons.append("热门文章")
    
    # 同标签 (这里可能需要更复杂的逻辑来检查标签重叠)
    if (hasattr(current_article, 'tags') and hasattr(recommended_article, 'tags') and
        current_article.tags.exists() and recommended_article.tags.exists()):
        # 简化检查：有标签重叠
        current_tag_ids = set(current_article.tags.values_list('id', flat=True))
        recommended_tag_ids = set(recommended_article.tags.values_list('id', flat=True))
        if current_tag_ids & recommended_tag_ids:  # 有交集
            reasons.append("相关话题")
    
    # 如果没有特殊原因，基于时间
    if not reasons:
        from django.utils import timezone
        import datetime
        if (recommended_article.first_published_at and 
            recommended_article.first_published_at > timezone.now() - datetime.timedelta(days=1)):
            reasons.append("最新发布")
        else:
            reasons.append("相关内容")
    
    return " • ".join(reasons) if reasons else "推荐内容"
