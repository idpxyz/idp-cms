"""
监控仪表板API
提供系统关键指标的汇总视图
"""

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.cache import cache_control
from rest_framework.decorators import api_view, throttle_classes
import time
import json
from datetime import datetime, timedelta

from apps.api.utils.cache_performance import cache_monitor
from apps.api.utils.cache_utils import get_cache_stats
from django.core.cache import cache


@api_view(['GET'])
@throttle_classes([])
@cache_control(max_age=30)  # 30秒缓存
def monitoring_dashboard(request):
    """
    监控仪表板 - 汇总关键系统指标
    """
    try:
        # 1. 缓存性能指标
        cache_stats = cache_monitor.get_stats()
        
        # 2. 聚合API响应性能测试
        import time
        start_time = time.time()
        
        try:
            from apps.api.rest.aggregations import agg_headlines
            from django.test import RequestFactory
            factory = RequestFactory()
            request = factory.get('/api/agg/headlines/?size=1')
            response = agg_headlines(request)
            headlines_healthy = response.status_code == 200
            headlines_response_time = time.time() - start_time
        except Exception:
            headlines_healthy = False
            headlines_response_time = 0
        
        start_time = time.time()
        try:
            from apps.api.rest.aggregations import agg_hot
            request = factory.get('/api/agg/hot/?size=1')
            response = agg_hot(request)
            hot_healthy = response.status_code == 200
            hot_response_time = time.time() - start_time
        except Exception:
            hot_healthy = False
            hot_response_time = 0
        
        # 3. 系统状态
        current_time = datetime.now()
        
        dashboard = {
            "timestamp": current_time.isoformat(),
            "system_status": "healthy",
            
            # 缓存性能
            "cache_performance": {
                "overall_hit_rate": cache_stats.get('overall', {}).get('hit_rate', '0%'),
                "total_requests": cache_stats.get('overall', {}).get('total_requests', 0),
                "avg_response_time": cache_stats.get('overall', {}).get('avg_response_time', '0s'),
                "cache_hits": cache_stats.get('overall', {}).get('cache_hits', 0),
                "cache_misses": cache_stats.get('overall', {}).get('cache_misses', 0),
            },
            
            # 聚合API健康状态
            "aggregation_apis": {
                "headlines_healthy": headlines_healthy,
                "headlines_response_time": f"{headlines_response_time:.3f}s",
                "hot_healthy": hot_healthy,
                "hot_response_time": f"{hot_response_time:.3f}s",
                "overall_health": "good" if (headlines_healthy and hot_healthy) else "degraded"
            },
            
            # 端点性能（前5个）
            "top_endpoints": _get_top_endpoints(cache_stats),
            
            # 系统建议
            "recommendations": _generate_recommendations(cache_stats, headlines_healthy, hot_healthy)
        }
        
        return JsonResponse(dashboard)
        
    except Exception as e:
        return JsonResponse({
            "error": f"Failed to generate monitoring dashboard: {str(e)}",
            "timestamp": datetime.now().isoformat(),
            "system_status": "error"
        }, status=500)


def _get_top_endpoints(cache_stats):
    """获取访问量最高的端点"""
    endpoints = cache_stats.get('endpoints', {})
    
    # 按总请求数排序，取前5个
    sorted_endpoints = sorted(
        endpoints.items(), 
        key=lambda x: x[1].get('total', 0), 
        reverse=True
    )[:5]
    
    result = []
    for endpoint, stats in sorted_endpoints:
        hit_rate = 0
        if stats.get('total', 0) > 0:
            hit_rate = (stats.get('hits', 0) / stats.get('total', 0)) * 100
            
        result.append({
            "endpoint": endpoint,
            "total_requests": stats.get('total', 0),
            "hit_rate": f"{hit_rate:.1f}%",
            "avg_response_time": f"{stats.get('avg_response_time', 0):.3f}s"
        })
    
    return result


def _generate_recommendations(cache_stats, headlines_healthy, hot_healthy):
    """生成系统优化建议"""
    recommendations = []
    
    # 检查整体缓存命中率
    overall = cache_stats.get('overall', {})
    hit_rate_str = overall.get('hit_rate', '0%')
    hit_rate = float(hit_rate_str.rstrip('%')) if hit_rate_str != '0%' else 0
    
    if hit_rate < 70:
        recommendations.append({
            "type": "warning",
            "message": f"缓存命中率较低 ({hit_rate:.1f}%)，建议检查缓存策略"
        })
    elif hit_rate > 90:
        recommendations.append({
            "type": "success", 
            "message": f"缓存命中率优秀 ({hit_rate:.1f}%)"
        })
    
    # 检查聚合API健康状态
    if not headlines_healthy:
        recommendations.append({
            "type": "error",
            "message": "今日头条API异常，需要立即检查"
        })
    
    if not hot_healthy:
        recommendations.append({
            "type": "error", 
            "message": "热门文章API异常，需要立即检查"
        })
    
    # 检查响应时间
    avg_time_str = overall.get('avg_response_time', '0s')
    if avg_time_str != '0s':
        avg_time = float(avg_time_str.rstrip('s'))
        if avg_time > 0.1:  # 100ms
            recommendations.append({
                "type": "warning",
                "message": f"平均响应时间较高 ({avg_time:.3f}s)，建议优化"
            })
        elif avg_time < 0.05:  # 50ms
            recommendations.append({
                "type": "success",
                "message": f"响应时间优秀 ({avg_time:.3f}s)"
            })
    
    if not recommendations:
        recommendations.append({
            "type": "info",
            "message": "系统运行正常，无特别建议"
        })
    
    return recommendations


@api_view(['GET'])
@throttle_classes([])
def monitoring_health(request):
    """
    简化的健康检查端点
    """
    try:
        # 快速检查关键组件
        try:
            from apps.api.rest.aggregations import agg_headlines, agg_hot
            from django.test import RequestFactory
            factory = RequestFactory()
            
            # 测试头条API
            request = factory.get('/api/agg/headlines/?size=1')
            headlines_response = agg_headlines(request)
            headlines_ok = headlines_response.status_code == 200
            
            # 测试热门API
            request = factory.get('/api/agg/hot/?size=1') 
            hot_response = agg_hot(request)
            hot_ok = hot_response.status_code == 200
            
            status = "healthy" if (headlines_ok and hot_ok) else "degraded"
            
        except Exception:
            headlines_ok = False
            hot_ok = False
            status = "error"
        
        return JsonResponse({
            "status": status,
            "timestamp": datetime.now().isoformat(),
            "components": {
                "headlines_api": "up" if headlines_ok else "down",
                "hot_api": "up" if hot_ok else "down"
            }
        })
        
    except Exception as e:
        return JsonResponse({
            "status": "error",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }, status=500)
