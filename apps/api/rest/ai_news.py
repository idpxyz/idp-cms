from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.db.models import Q, Case, When, Value, IntegerField
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from apps.ai_news.models import AINewsPage
from apps.api.utils.cache_utils import smart_cache, invalidate_news_cache
import json
import logging

logger = logging.getLogger(__name__)

@api_view(["GET"])
@permission_classes([AllowAny])
@smart_cache(timeout=300, key_prefix="news_list")  # 缓存5分钟
def ai_news(request):
    """获取AI资讯列表"""
    try:
        # 获取查询参数
        page = int(request.GET.get('page', 1))
        size = int(request.GET.get('size', 10))
        category = request.GET.get('category')
        search = request.GET.get('search')
        is_hot = request.GET.get('is_hot')
        is_top = request.GET.get('is_top')
        
        # 构建查询 - 优化：使用prefetch_related避免N+1查询
        queryset = AINewsPage.objects.live().public().prefetch_related(
            'tags', 'category'  # 预加载tags和category，避免N+1查询
        ).order_by('-last_published_at')
        
        # 应用过滤条件
        if category:
            # 支持通过slug或name过滤
            if category in ['technology', 'product', 'investment', 'research', 'policy', 'industry', 'startup', 'academic']:
                queryset = queryset.filter(category__slug=category)
            else:
                queryset = queryset.filter(category__name__icontains=category)
        if search:
            # 使用jieba分词进行全文搜索
            from apps.api.utils.search_utils import apply_search
            queryset = apply_search(queryset, search, fields=[
                ('title', 10),        # 标题匹配权重最高
                ('introduction', 5),   # 简介匹配权重其次
                ('body', 1)           # 正文匹配权重最低
            ])
        if is_hot is not None:
            queryset = queryset.filter(is_hot=is_hot.lower() == 'true')
        if is_top is not None:
            queryset = queryset.filter(is_top=is_top.lower() == 'true')
        
        # 分页
        start = (page - 1) * size
        end = start + size
        news_list = queryset[start:end]
        
        # 序列化数据 - 优化：使用预加载的数据，避免额外查询
        news_data = []
        for news in news_list:
            news_data.append({
                "id": news.id,
                "title": news.title,
                "introduction": news.introduction,
                "category": news.category.slug if news.category else '',  # 使用slug保持兼容性
                "category_name": news.category.name if news.category else '',  # 添加中文名称
                "source": news.source,
                "read_count": news.read_count,
                "is_hot": news.is_hot,
                "is_top": news.is_top,
                "tags": [tag.name for tag in news.tags.all()],  # 现在使用预加载的数据
                "url": news.get_url(),
                "last_published_at": news.last_published_at.isoformat() if news.last_published_at else None,
            })
        
        # 计算总数和分页信息
        total_count = queryset.count()
        total_pages = (total_count + size - 1) // size
        
        # 获取分类统计 - 基于当前查询条件，确保与分页数据一致
        from django.db.models import Count
        
        # 如果指定了分类，只统计该分类；否则统计所有分类
        if category:
            # 只统计当前分类
            category_stats = queryset.values('category__name').annotate(
                count=Count('id')
            )
        else:
            # 统计所有分类（基于所有公开的新闻）
            category_stats = AINewsPage.objects.live().public().values('category__name').annotate(
                count=Count('id')
            )
        
        # 调试：打印所有实际存在的分类值
        print(f"DEBUG: 数据库中实际存在的分类值: {list(category_stats.values_list('category__name', flat=True))}")
        
        # 转换为前端期望的格式，使用中文名称作为键
        categories = {}
        for item in category_stats:
            category_name = item['category__name']
            if category_name:  # 跳过空分类
                categories[category_name] = item['count']
        
        # 调试：打印最终的分类统计
        print(f"DEBUG: 最终分类统计: {categories}")
        
        response_data = {
            "results": news_data,
            "count": total_count,  # Total number of items
            "page_count": len(news_data),  # Number of items in current page
            "page": page,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1,
            "categories": categories,
            "filters": {
                "category": category,
                "search": search,
                "is_hot": is_hot,
                "is_top": is_top,
            }
        }
        
        return Response(response_data)
        
    except Exception as e:
        logger.error(f"获取AI资讯列表失败: {e}")
        return Response(
            {"error": "获取AI资讯列表失败", "detail": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(["GET"])
@permission_classes([AllowAny])
@smart_cache(timeout=600, key_prefix="news_detail")  # 缓存10分钟
def ai_news_detail(request, news_id):
    """获取AI资讯详情"""
    try:
        # 获取新闻详情
        news = AINewsPage.objects.live().public().get(id=news_id)
        
        # 获取相关资讯 - 优化：预加载tags和category避免N+1查询
        related_news = AINewsPage.objects.live().public().prefetch_related(
            'tags', 'category'
        ).filter(
            category=news.category
        ).exclude(id=news_id)[:6]
        
        # 序列化相关资讯
        related_news_data = []
        for related in related_news:
            related_news_data.append({
                "id": related.id,
                "title": related.title,
                "introduction": related.introduction,
                "category": related.category.slug if related.category else '',
                "category_name": related.category.name if related.category else '',
                "source": related.source,
                "read_count": related.read_count,
                "tags": [tag.name for tag in related.tags.all()],
                "url": related.get_url(),
                "last_published_at": related.last_published_at.isoformat() if related.last_published_at else None,
            })
        
        # 构建响应数据
        response_data = {
            "id": news.id,
            "title": news.title,
            "introduction": news.introduction,
            "content": news.body,
            "category": news.category.slug if news.category else '',
            "category_name": news.category.name if news.category else '',
            "source": news.source,
            "read_count": news.read_count,
            "is_hot": news.is_hot,
            "is_top": news.is_top,
            "tags": [tag.name for tag in news.tags.all()],
            "url": news.get_url(),
            "last_published_at": news.last_published_at.isoformat() if news.last_published_at else None,
            "related_news": related_news_data
        }
        
        return Response(response_data)
        
    except AINewsPage.DoesNotExist:
        return Response(
            {"error": "资讯不存在"},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"获取AI资讯详情失败: {e}")
        return Response(
            {"error": "获取AI资讯详情失败", "detail": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(["POST"])
@permission_classes([AllowAny])
def update_read_count(request, news_id):
    """更新新闻阅读数"""
    try:
        # 获取新闻
        news = AINewsPage.objects.live().public().get(id=news_id)
        
        # 更新阅读数
        news.read_count += 1
        news.save(update_fields=['read_count'])
        
        # 失效相关缓存
        invalidate_news_cache(news_id)
        
        return Response({
            "success": True,
            "message": "阅读数更新成功",
            "new_read_count": news.read_count
        })
        
    except AINewsPage.DoesNotExist:
        return Response(
            {"error": "新闻不存在"},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"更新阅读数失败: {e}")
        return Response(
            {"error": "更新阅读数失败", "detail": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(["GET"])
@permission_classes([AllowAny])
@smart_cache(timeout=300, key_prefix="news_hot")  # 缓存5分钟
def ai_news_hot(request):
    """获取热门AI资讯"""
    try:
        # 优化：预加载tags和category避免N+1查询
        hot_news = AINewsPage.objects.live().public().prefetch_related(
            'tags', 'category'
        ).filter(is_hot=True).order_by('-read_count')[:10]
        
        # 序列化数据
        hot_news_data = []
        for news in hot_news:
            hot_news_data.append({
                "id": news.id,
                "title": news.title,
                "introduction": news.introduction,
                "category": news.category.slug if news.category else '',
                "category_name": news.category.name if news.category else '',
                "source": news.source,
                "read_count": news.read_count,
                "tags": [tag.name for tag in news.tags.all()],
                "url": news.get_url(),
                "last_published_at": news.last_published_at.isoformat() if news.last_published_at else None,
            })
        
        return Response({
            "results": hot_news_data,
            "count": len(hot_news_data)
        })
        
    except Exception as e:
        logger.error(f"获取热门AI资讯失败: {e}")
        return Response(
            {"error": "获取热门AI资讯失败", "detail": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(["GET"])
@permission_classes([AllowAny])
@smart_cache(timeout=600, key_prefix="news_categories_v2")  # 缓存10分钟
def ai_news_categories(request):
    """获取AI资讯分类"""
    try:
        from django.db.models import Count
        
        # 获取分类统计
        category_stats = AINewsPage.objects.live().public().values('category__name', 'category__slug').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # 转换为前端期望的格式
        categories = []
        for item in category_stats:
            category_name = item['category__name']
            category_slug = item['category__slug']
            if not category_name:  # Skip empty categories
                continue
                
            # 使用分类名称的哈希值作为唯一ID
            import hashlib
            category_hash = hashlib.md5(category_name.encode()).hexdigest()[:8]
            
            categories.append({
                "id": f"cat_{category_hash}",
                "name": category_name,
                "slug": category_slug,
                "description": f"{category_name}相关的AI资讯",  # 添加描述字段
                "count": item['count']
            })
        
        # 按照count降序排序
        categories.sort(key=lambda x: x['count'], reverse=True)
        
        return Response({
            "categories": categories,
            "total": len(categories)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"获取AI资讯分类失败: {e}")
        return Response(
            {"error": "获取AI资讯分类失败", "detail": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
