"""
分类API端点

实现分类系统的完整API支持：
- 支持树状结构展示
- 支持站点和频道过滤
- 支持层级过滤
- 集成缓存策略
"""

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q, Count, Prefetch
from django.core.cache import cache
from apps.core.models import Category, Channel
from apps.api.serializers.taxonomy import (
    CategorySerializer,
    CategoryTreeSerializer,
    CategoryDetailSerializer
)
from .utils import (
    validate_site_parameter,
    apply_field_filtering,
    generate_cache_key,
    generate_etag,
    generate_surrogate_keys
)
from ..utils.rate_limit import CHANNELS_RATE_LIMIT as CATEGORY_RATE_LIMIT
from ..utils.cache_performance import monitor_cache_performance
import logging

logger = logging.getLogger(__name__)


@api_view(["GET"])
def categories_list(request):
    """
    获取分类列表 - 参考search_os的简洁实现
    """
    # 1) 站点验证
    site = validate_site_parameter(request)
    if not site:
        return Response({"error": "Invalid or missing site parameter"}, status=status.HTTP_400_BAD_REQUEST)
    
    # 2) 查询分类
    from apps.core.models import Category
    categories = Category.objects.filter(sites=site, is_active=True).order_by('order', 'name')
    
    # 3) 构建响应
    results = []
    for cat in categories:
        results.append({
            "id": cat.id,
            "name": cat.name,
            "slug": cat.slug,
            "description": cat.description or "",
            "is_active": cat.is_active
        })
    
    return Response({
        "count": len(results),
        "results": results
    })


def _original_categories_list(request):
    """
    原始分类列表函数 - 备份
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
        channel_param = request.query_params.get('channel')
        level = request.query_params.get('level')
        parent_param = request.query_params.get('parent')
        active_only = request.query_params.get('active_only', 'true').lower() == 'true'
        format_type = request.query_params.get('format', 'flat')
        order_by = request.query_params.get('order', 'order')
        limit = request.query_params.get('limit')
        
        # 3. 生成缓存键
        cache_params = {
            'site_id': site.id,
            'fields': ','.join(fields) if fields else '',
            'channel': channel_param or '',
            'level': level or '',
            'parent': parent_param or '',
            'active_only': active_only,
            'format': format_type,
            'order': order_by,
            'limit': limit or ''
        }
        cache_key = generate_cache_key("categories_list", cache_params)
        
        # 4. 尝试从缓存获取
        cached_result = cache.get(cache_key)
        if cached_result:
            response = Response(cached_result)
            response['X-Cache'] = 'HIT'
            response['ETag'] = generate_etag(cached_result)
            response['Cache-Control'] = 'public, max-age=300'  # 5分钟缓存
            response['Surrogate-Key'] = f'categories site-{site.id}'
            return response
        
        # 5. 构建查询
        queryset = Category.objects.filter(sites=site)
        
        # 激活状态过滤
        if active_only:
            queryset = queryset.filter(is_active=True)
        
        # 频道过滤
        if channel_param:
            try:
                if channel_param.isdigit():
                    channel = Channel.objects.get(id=int(channel_param), sites=site)
                else:
                    channel = Channel.objects.get(slug=channel_param, sites=site)
                queryset = queryset.filter(channels=channel)
            except Channel.DoesNotExist:
                return Response({
                    "error": f"Channel '{channel_param}' not found"
                }, status=status.HTTP_404_NOT_FOUND)
        
        # 层级过滤
        if level:
            try:
                level_int = int(level)
                if level_int == 1:
                    queryset = queryset.filter(parent=None)
                elif level_int == 2:
                    queryset = queryset.filter(
                        Q(parent=None) | 
                        Q(parent__parent=None)
                    )
                elif level_int > 2:
                    # 通过递归查询实现多层级过滤
                    def get_level_filter(current_level):
                        if current_level == 1:
                            return Q(parent=None)
                        else:
                            parent_q = get_level_filter(current_level - 1)
                            return Q(parent__in=Category.objects.filter(parent_q))
                    
                    queryset = queryset.filter(get_level_filter(level_int))
            except (ValueError, TypeError):
                return Response({
                    "error": "Invalid level parameter"
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # 父分类过滤
        if parent_param:
            try:
                if parent_param.isdigit():
                    parent_category = Category.objects.get(id=int(parent_param), sites=site)
                else:
                    parent_category = Category.objects.get(slug=parent_param, sites=site)
                queryset = queryset.filter(parent=parent_category)
            except Category.DoesNotExist:
                return Response({
                    "error": f"Parent category '{parent_param}' not found"
                }, status=status.HTTP_404_NOT_FOUND)
        
        # 6. 性能优化 - 预加载相关数据
        from apps.news.models import ArticlePage
        queryset = queryset.select_related('parent').prefetch_related(
            'channels',
            'children'
        )
        
        # 7. 排序
        if order_by == 'order':
            queryset = queryset.order_by('order', 'name')
        elif order_by == 'name':
            queryset = queryset.order_by('name')
        elif order_by == '-created_at':
            queryset = queryset.order_by('-created_at')
        elif order_by == 'articles_count':
            # 文章数量排序比较复杂，暂时用简单排序
            queryset = queryset.order_by('order', 'name')
        else:
            queryset = queryset.order_by('order', 'name')
        
        # 8. 限制数量
        if limit:
            try:
                limit_int = min(int(limit), 1000)  # 最大1000条
                queryset = queryset[:limit_int]
            except (ValueError, TypeError):
                pass
        
        # 9. 序列化
        if format_type == 'tree':
            # 只获取顶级分类用于树状展示
            root_categories = queryset.filter(parent=None)
            serializer = CategoryTreeSerializer(
                root_categories, 
                many=True, 
                context={'request': request}
            )
        else:
            serializer = CategorySerializer(
                queryset, 
                many=True, 
                context={'request': request}
            )
        
        result_data = serializer.data
        
        # 10. 字段过滤
        if fields and format_type != 'tree':  # 树状格式不支持字段过滤
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
            },
            "format": format_type
        }
        
        # 12. 缓存结果
        cache.set(cache_key, response_data, 300)  # 缓存5分钟
        
        # 13. 设置响应头
        response = Response(response_data)
        response['X-Cache'] = 'MISS'
        response['ETag'] = generate_etag(response_data)
        response['Cache-Control'] = 'public, max-age=300'
        response['Surrogate-Key'] = f'categories site-{site.id}'
        
        return response
        
    except Exception as e:
        logger.error(f"Categories list API error: {str(e)}", exc_info=True)
        return Response({
            "error": "Internal server error"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@CATEGORY_RATE_LIMIT
@monitor_cache_performance("category_detail")
def category_detail(request, slug):
    """
    获取分类详情
    
    支持参数：
    - site: 站点标识
    - fields: 字段白名单选择
    - include_articles: 是否包含文章列表（默认false）
    - articles_limit: 文章数量限制（默认10）
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
        include_articles = request.query_params.get('include_articles', 'false').lower() == 'true'
        articles_limit = request.query_params.get('articles_limit', '10')
        
        # 3. 生成缓存键
        cache_params = {
            'site_id': site.id,
            'slug': slug,
            'fields': ','.join(fields) if fields else '',
            'include_articles': include_articles,
            'articles_limit': articles_limit
        }
        cache_key = generate_cache_key("category_detail", cache_params)
        
        # 4. 尝试从缓存获取
        cached_result = cache.get(cache_key)
        if cached_result:
            response = Response(cached_result)
            response['X-Cache'] = 'HIT'
            response['ETag'] = generate_etag(cached_result)
            response['Cache-Control'] = 'public, max-age=600'  # 10分钟缓存
            response['Surrogate-Key'] = f'categories site-{site.id} category-{slug}'
            return response
        
        # 5. 查询分类
        try:
            category = Category.objects.select_related('parent').prefetch_related(
                'channels',
                'children',
                'articles'
            ).get(slug=slug, sites=site, is_active=True)
        except Category.DoesNotExist:
            return Response({
                "error": f"Category '{slug}' not found"
            }, status=status.HTTP_404_NOT_FOUND)
        
        # 6. 序列化
        serializer = CategoryDetailSerializer(
            category, 
            context={'request': request}
        )
        result_data = serializer.data
        
        # 7. 字段过滤
        if fields:
            result_data = apply_field_filtering(result_data, fields)
        
        # 8. 构建响应
        response_data = {
            "category": result_data,
            "site": {
                "hostname": site.hostname,
                "site_name": site.site_name
            }
        }
        
        # 9. 缓存结果
        cache.set(cache_key, response_data, 600)  # 缓存10分钟
        
        # 10. 设置响应头
        response = Response(response_data)
        response['X-Cache'] = 'MISS'
        response['ETag'] = generate_etag(response_data)
        response['Cache-Control'] = 'public, max-age=600'
        response['Surrogate-Key'] = f'categories site-{site.id} category-{slug}'
        
        return response
        
    except Exception as e:
        logger.error(f"Category detail API error: {str(e)}", exc_info=True)
        return Response({
            "error": "Internal server error"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@CATEGORY_RATE_LIMIT
@monitor_cache_performance("categories_tree")
def categories_tree(request):
    """
    获取完整的分类树结构
    
    支持参数：
    - site: 站点标识
    - channel: 频道过滤
    - max_depth: 最大深度（默认无限制）
    - include_counts: 是否包含文章统计（默认true）
    """
    try:
        # 1. 验证站点参数
        site = validate_site_parameter(request)
        if not site:
            return Response({
                "error": "Invalid site parameter"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 2. 获取查询参数
        channel_param = request.query_params.get('channel')
        max_depth = request.query_params.get('max_depth')
        include_counts = request.query_params.get('include_counts', 'true').lower() == 'true'
        
        # 3. 生成缓存键
        cache_params = {
            'site_id': site.id,
            'channel': channel_param or '',
            'max_depth': max_depth or '',
            'include_counts': include_counts
        }
        cache_key = generate_cache_key("categories_tree", cache_params)
        
        # 4. 尝试从缓存获取
        cached_result = cache.get(cache_key)
        if cached_result:
            response = Response(cached_result)
            response['X-Cache'] = 'HIT'
            response['ETag'] = generate_etag(cached_result)
            response['Cache-Control'] = 'public, max-age=900'  # 15分钟缓存
            response['Surrogate-Key'] = f'categories site-{site.id}'
            return response
        
        # 5. 构建查询
        queryset = Category.objects.filter(
            sites=site, 
            is_active=True,
            parent=None  # 只获取顶级分类
        )
        
        # 频道过滤
        if channel_param:
            try:
                if channel_param.isdigit():
                    channel = Channel.objects.get(id=int(channel_param), sites=site)
                else:
                    channel = Channel.objects.get(slug=channel_param, sites=site)
                queryset = queryset.filter(channels=channel)
            except Channel.DoesNotExist:
                return Response({
                    "error": f"Channel '{channel_param}' not found"
                }, status=status.HTTP_404_NOT_FOUND)
        
        # 6. 性能优化 - 递归预加载
        queryset = queryset.select_related('parent').prefetch_related(
            'channels',
            'children__children__children',  # 预加载3层
            'articles'
        ).order_by('order', 'name')
        
        # 7. 序列化
        serializer = CategoryTreeSerializer(
            queryset,
            many=True,
            context={
                'request': request,
                'max_depth': int(max_depth) if max_depth and max_depth.isdigit() else None,
                'include_counts': include_counts
            }
        )
        
        # 8. 构建响应
        response_data = {
            "tree": serializer.data,
            "site": {
                "hostname": site.hostname,
                "site_name": site.site_name
            },
            "metadata": {
                "max_depth": int(max_depth) if max_depth and max_depth.isdigit() else "unlimited",
                "include_counts": include_counts,
                "total_root_categories": len(serializer.data)
            }
        }
        
        # 9. 缓存结果
        cache.set(cache_key, response_data, 900)  # 缓存15分钟
        
        # 10. 设置响应头
        response = Response(response_data)
        response['X-Cache'] = 'MISS'
        response['ETag'] = generate_etag(response_data)
        response['Cache-Control'] = 'public, max-age=900'
        response['Surrogate-Key'] = f'categories site-{site.id}'
        
        return response
        
    except Exception as e:
        logger.error(f"Categories tree API error: {str(e)}", exc_info=True)
        return Response({
            "error": "Internal server error"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
