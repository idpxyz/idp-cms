"""
Hero文章API端点

包含Hero轮播推荐文章的API实现
"""

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from apps.core.site_utils import get_site_from_request


@api_view(["GET"])
def hero_articles(request):
    """
    Hero 轮播推荐文章接口
    
    专门为首页 Hero Carousel 优化的接口
    返回高权重、精选的文章，必须有图片
    
    支持参数：
    - site: 站点过滤 (必需)
    - limit: 返回数量 (默认5)
    """
    try:
        # 获取站点标识
        site_identifier = get_site_from_request(request)
        limit = min(int(request.GET.get("limit", 5)), 10)  # 最多10条
        
        # 构建查询：高权重 + 精选文章
        from apps.news.models.article import ArticlePage
        
        # 科学的Hero选择策略：多样性 + 权重 + 时效性
        from django.utils import timezone
        import datetime
        
        # 1. Hero标记的文章（必须有封面）
        high_weight_articles = ArticlePage.objects.filter(
            live=True,
            is_hero=True,
            cover__isnull=False,
            weight__gte=0
        ).select_related('cover', 'channel').order_by(
            '-weight', '-first_published_at'
        )[:limit]
        
        # 简化逻辑：如果高权重文章不足，直接补充其他精选文章
        hero_articles = list(high_weight_articles)
        # 不再回退到无封面或默认静态图，保持严格质量
        
        # 构建响应数据
        items = []
        from apps.core.signals_media import NEWS_IMAGE_RENDITIONS
        for article in hero_articles:
            # 严格要求封面存在
            if not article.cover:
                continue
            # 使用Hero规格渲染图，优先桌面端
            try:
                hero_spec = NEWS_IMAGE_RENDITIONS.get('hero_desktop', 'fill-1200x600|jpegquality-85')
                rendition = article.cover.get_rendition(hero_spec)
                image_url = rendition.url
            except Exception:
                try:
                    mobile_spec = NEWS_IMAGE_RENDITIONS.get('hero_mobile', 'fill-800x400|jpegquality-85')
                    rendition = article.cover.get_rendition(mobile_spec)
                    image_url = rendition.url
                except Exception:
                    # 无法生成渲染图则跳过该文章
                    continue
                
            item = {
                "id": str(article.id),
                "title": article.title,
                "slug": article.slug,
                "excerpt": getattr(article, 'excerpt', '') or "",
                "image_url": image_url,
                "cover_url": image_url,
                "publish_at": article.first_published_at.isoformat() if article.first_published_at else None,
                "publish_time": article.first_published_at.isoformat() if article.first_published_at else None,
                "author": getattr(article, 'author_name', '') or "",
                "source": site_identifier or "官方",
                "channel": {
                    "id": getattr(article.channel, 'slug', '') or "news",
                    "name": getattr(article.channel, 'name', '') or "新闻",
                    "slug": getattr(article.channel, 'slug', '') or "news"
                } if article.channel else None,
                "tags": [],  # 可以后续扩展
                "is_featured": True,  # 所有都是精选文章
                "is_breaking": (getattr(article, 'weight', 0) or 0) >= 90,  # 权重>=90视为突发新闻（约top 10%）
                "is_live": False,  # 可以后续扩展
                "is_event_mode": (getattr(article, 'weight', 0) or 0) >= 95,  # 权重>=95视为重大事件（约top 5%）
                "media_type": "image",
                "weight": getattr(article, 'weight', 0) or 0,
                # 统计数据
                "view_count": getattr(article, 'view_count', 0) or 0,
                "comment_count": getattr(article, 'comment_count', 0) or 0,
                "like_count": getattr(article, 'like_count', 0) or 0,
                "favorite_count": getattr(article, 'favorite_count', 0) or 0,
                "reading_time": getattr(article, 'reading_time', 1) or 1,  # 简化：不调用calculate方法
            }
            items.append(item)
        
        return Response({
            "success": True,
            "items": items,
            "total": len(items),
            "debug": {
                "site": site_identifier,
                "strategy": "multi_tier_selection",
                "limit": limit,
                "actual_returned": len(items),
                "selection_breakdown": {
                    "high_weight_articles": len([item for item in items if item["weight"] >= 70]),
                    "recent_articles": len([item for item in items if item["weight"] < 70]),
                    "breaking_news": len([item for item in items if item["is_breaking"]]),
                    "major_events": len([item for item in items if item["is_event_mode"]]),
                },
                "channel_diversity": len(set(item["channel"]["slug"] if item["channel"] else "none" for item in items)),
                "weight_range": {
                    "min": min([item["weight"] for item in items]) if items else 0,
                    "max": max([item["weight"] for item in items]) if items else 0,
                    "avg": sum([item["weight"] for item in items]) / len(items) if items else 0
                }
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Hero articles API error: {str(e)}", exc_info=True)
        return Response({
            "success": False,
            "error": "获取Hero文章失败",
            "message": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
