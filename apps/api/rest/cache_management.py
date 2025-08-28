"""
缓存管理API模块
提供缓存统计、清理和监控功能
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from apps.api.utils.cache_utils import (
    get_cache_stats, 
    clear_all_caches, 
    invalidate_cache_pattern
)
import logging

logger = logging.getLogger(__name__)

@api_view(["GET"])
@permission_classes([IsAdminUser])
def cache_stats(request):
    """获取缓存统计信息"""
    try:
        stats = {}
        
        # 获取所有缓存的统计信息
        for cache_name in ['default', 'api']:
            stats[cache_name] = get_cache_stats(cache_name)
        
        return Response({
            "success": True,
            "data": stats,
            "timestamp": stats['api']['timestamp']
        })
        
    except Exception as e:
        logger.error(f"获取缓存统计失败: {e}")
        return Response(
            {"error": "获取缓存统计失败", "detail": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(["POST"])
@permission_classes([IsAdminUser])
def clear_cache(request):
    """清空所有缓存"""
    try:
        success = clear_all_caches()
        
        if success:
            return Response({
                "success": True,
                "message": "所有缓存已清空",
                "timestamp": get_cache_stats('api')['timestamp']
            })
        else:
            return Response(
                {"error": "清空缓存失败"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
    except Exception as e:
        logger.error(f"清空缓存失败: {e}")
        return Response(
            {"error": "清空缓存失败", "detail": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(["POST"])
@permission_classes([IsAdminUser])
def invalidate_pattern(request):
    """按模式失效缓存"""
    try:
        pattern = request.data.get('pattern')
        cache_alias = request.data.get('cache_alias', 'api')
        
        if not pattern:
            return Response(
                {"error": "缓存模式不能为空"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        invalidate_cache_pattern(pattern, cache_alias)
        
        return Response({
            "success": True,
            "message": f"缓存模式 '{pattern}' 已失效",
            "cache_alias": cache_alias,
            "timestamp": get_cache_stats(cache_alias)['timestamp']
        })
        
    except Exception as e:
        logger.error(f"失效缓存模式失败: {e}")
        return Response(
            {"error": "失效缓存模式失败", "detail": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(["GET"])
@permission_classes([IsAdminUser])
def cache_health(request):
    """缓存健康检查"""
    try:
        # 检查缓存连接
        cache_alias = request.query_params.get('cache_alias', 'api')
        stats = get_cache_stats(cache_alias)
        
        # 判断缓存是否健康
        is_healthy = (
            stats.get('hit_rate', 0) > 0.5 and  # 命中率 > 50%
            stats.get('memory_usage', 0) < 0.9   # 内存使用 < 90%
        )
        
        return Response({
            "success": True,
            "healthy": is_healthy,
            "stats": stats,
            "timestamp": stats.get('timestamp')
        })
        
    except Exception as e:
        logger.error(f"缓存健康检查失败: {e}")
        return Response(
            {"error": "缓存健康检查失败", "detail": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
