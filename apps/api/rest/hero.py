"""
Hero API - 专用的Hero轮播数据端点
简单、快速的Hero内容获取，无需复杂算法
"""

from datetime import datetime, timedelta
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.response import Response
from django.core.cache import cache
from django.conf import settings
from apps.core.site_utils import get_site_from_request
from apps.news.models.article import ArticlePage
from wagtail.models import Site
from ..utils.rate_limit import FEED_RATE_LIMIT
from apps.core.flags import flag


@api_view(["GET"])
@throttle_classes([])  # 使用自定义限流
@FEED_RATE_LIMIT
def hero_items(request):
    """
    Hero轮播API - 简单直接的Hero内容获取
    
    参数:
    - size: 返回数量，默认5，最大10
    - site: 站点域名
    
    🎯 Hero内容无时间限制：只要标记为is_hero=True的活跃文章都会显示
    
    返回:
    - items: Hero项目列表
    - total: 总数量
    - cache_info: 缓存信息
    """
    site = get_site_from_request(request)
    size = max(1, min(int(request.query_params.get("size", 5)), 10))
    # 🎯 Hero不应该受时间限制 - 移除hours参数
    # hours = int(request.query_params.get("hours", 168))  # 已移除
    
    # 获取站点名称（处理字符串和对象两种情况）
    site_name = site.hostname if hasattr(site, 'hostname') else str(site)
    
    # 构建缓存key（移除hours参数）
    cache_key = f"hero_items:{site_name}:{size}"
    
    # 尝试从缓存获取（开发环境也启用缓存，避免重复生成图片）
    cached_data = cache.get(cache_key)
    if cached_data:  # ✅ 开发环境也使用缓存，提升 LCP 性能
        return Response({
            **cached_data,
            'cache_info': {
                'hit': True,
                'ttl': 300,
                'type': 'hero_simple',
                'key': cache_key,
                'debug_mode': settings.DEBUG
            }
        })
    
    # 🎯 Hero不受时间限制，只要是标记为Hero的活跃文章就显示
    # cutoff_time = datetime.now() - timedelta(hours=hours)  # 已移除
    
    try:
        # 🎯 简单的数据库查询，无需OpenSearch，无时间限制
        hero_articles = ArticlePage.objects.filter(
            is_hero=True,
            live=True
            # first_published_at__gte=cutoff_time  # 已移除时间限制
        ).select_related(
            'channel', 'cover'
        ).prefetch_related(
            'tags', 'topics'
        ).order_by('-first_published_at')[:size]
        
        items = []
        for article in hero_articles:
            # 确保有封面图片
            image_url = None
            if article.cover:
                try:
                    # 🚀 LCP 优化：平衡性能和质量
                    # 响应式尺寸：900x450 WebP @ 82% quality (~120-180KB，性能与质量的最佳平衡）
                    # 足够清晰，同时保持快速加载
                    image_url = article.cover.get_rendition('fill-900x450|format-webp|webpquality-82').url
                except:
                    # 如果WebP渲染失败，尝试使用旧的规格作为备用
                    try:
                        image_url = article.cover.get_rendition('width-800').url
                    except:
                        # 最后备用：使用原图
                        image_url = article.cover.file.url if article.cover.file else None
            
            # 跳过没有封面图的文章
            if not image_url:
                continue
                
            # 构建Hero项目数据
            item = {
                'id': str(article.id),
                'article_id': str(article.id),
                'title': article.title,
                'excerpt': article.search_description or article.excerpt or '',
                'image_url': image_url,
                'publish_time': article.first_published_at.isoformat() if article.first_published_at else '',
                'publish_at': article.first_published_at.isoformat() if article.first_published_at else '',
                'slug': article.slug,
                'author': getattr(article, 'author_name', '') or '',
                'source': getattr(article, 'source', '') or '本站',
                'is_breaking': getattr(article, 'is_breaking', False),
                'is_live': getattr(article, 'is_live', False),
                'is_event_mode': getattr(article, 'is_event_mode', False),
                'has_video': getattr(article, 'has_video', False),
                'tags': [tag.name for tag in article.tags.all()] if hasattr(article, 'tags') else [],
            }
            
            # 添加频道信息
            if article.channel:
                item['channel'] = {
                    'id': article.channel.slug,
                    'name': article.channel.name,
                    'slug': article.channel.slug
                }
            
            # 添加主题信息（topics是多对多关系）
            if hasattr(article, 'topics') and article.topics.exists():
                first_topic = article.topics.first()
                if first_topic:
                    item['topic'] = {
                        'id': first_topic.slug if hasattr(first_topic, 'slug') else str(first_topic.id),
                        'name': first_topic.title if hasattr(first_topic, 'title') else first_topic.name,
                        'slug': first_topic.slug if hasattr(first_topic, 'slug') else str(first_topic.id)
                    }
            # 如果没有专题，可以从标签中推断主题
            elif hasattr(article, 'tags') and article.tags.exists():
                first_tag = article.tags.first()
                if first_tag:
                    item['topic'] = {
                        'id': first_tag.slug if hasattr(first_tag, 'slug') else str(first_tag.id),
                        'name': first_tag.name,
                        'slug': first_tag.slug if hasattr(first_tag, 'slug') else str(first_tag.id)
                    }
            
            items.append(item)
        
        # 构建响应数据
        response_data = {
            'items': items,
            'total': len(items),
            'debug': {
                'site': site_name,
                'no_time_limit': True,  # 标识Hero无时间限制
                'requested_size': size,
                'returned_size': len(items),
                'query_type': 'database_direct',
                'api_version': 'hero_v2'  # 版本号更新
            }
        }
        
        # 缓存结果（5分钟）
        cache.set(cache_key, response_data, 300)
        
        # 添加缓存信息
        response_data['cache_info'] = {
            'hit': False,
            'ttl': 300,
            'type': 'hero_simple',
            'key': cache_key
        }
        
        return Response(response_data)
        
    except Exception as e:
        # 错误处理
        error_response = {
            'items': [],
            'total': 0,
            'error': {
                'message': 'Failed to fetch hero items',
                'type': 'database_error',
                'debug': str(e) if settings.DEBUG else None
            },
            'debug': {
                'site': site_name,
                'no_time_limit': True,  # 标识Hero无时间限制
                'requested_size': size,
                'api_version': 'hero_v2'  # 版本号更新
            }
        }
        
        return Response(error_response, status=500)
