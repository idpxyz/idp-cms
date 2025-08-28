"""
缓存性能测试工具

测试和监控缓存系统的性能指标：
- 缓存命中率
- 响应时间
- 内存使用情况
- 缓存键分布
"""

import time
import json
from collections import defaultdict
from django.core.cache import cache
from django.http import JsonResponse
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view


class CachePerformanceMonitor:
    """缓存性能监控器"""
    
    def __init__(self):
        self.stats = {
            'total_requests': 0,
            'cache_hits': 0,
            'cache_misses': 0,
            'response_times': [],
            'cache_keys': defaultdict(int),
            'endpoints': defaultdict(lambda: {
                'total': 0,
                'hits': 0,
                'misses': 0,
                'avg_response_time': 0
            })
        }
    
    def record_request(self, endpoint, response_time, cache_hit=True):
        """记录请求统计"""
        self.stats['total_requests'] += 1
        self.stats['response_times'].append(response_time)
        
        if cache_hit:
            self.stats['cache_hits'] += 1
        else:
            self.stats['cache_misses'] += 1
        
        # 更新端点统计
        self.stats['endpoints'][endpoint]['total'] += 1
        if cache_hit:
            self.stats['endpoints'][endpoint]['hits'] += 1
        else:
            self.stats['endpoints'][endpoint]['misses'] += 1
        
        # 计算平均响应时间
        endpoint_stats = self.stats['endpoints'][endpoint]
        if endpoint_stats['total'] > 0:
            endpoint_stats['avg_response_time'] = sum(self.stats['response_times']) / len(self.stats['response_times'])
    
    def record_cache_key(self, key):
        """记录缓存键使用情况"""
        self.stats['cache_keys'][key] += 1
    
    def get_hit_rate(self):
        """获取缓存命中率"""
        total = self.stats['total_requests']
        if total == 0:
            return 0.0
        return (self.stats['cache_hits'] / total) * 100
    
    def get_avg_response_time(self):
        """获取平均响应时间"""
        if not self.stats['response_times']:
            return 0.0
        return sum(self.stats['response_times']) / len(self.stats['response_times'])
    
    def get_stats(self):
        """获取完整统计信息"""
        return {
            'overall': {
                'total_requests': self.stats['total_requests'],
                'cache_hits': self.stats['cache_hits'],
                'cache_misses': self.stats['cache_misses'],
                'hit_rate': f"{self.get_hit_rate():.2f}%",
                'avg_response_time': f"{self.get_avg_response_time():.3f}s"
            },
            'endpoints': dict(self.stats['endpoints']),
            'top_cache_keys': dict(sorted(
                self.stats['cache_keys'].items(), 
                key=lambda x: x[1], 
                reverse=True
            )[:10])
        }
    
    def reset_stats(self):
        """重置统计信息"""
        self.stats = {
            'total_requests': 0,
            'cache_hits': 0,
            'cache_misses': 0,
            'response_times': [],
            'cache_keys': defaultdict(int),
            'endpoints': defaultdict(lambda: {
                'total': 0,
                'hits': 0,
                'misses': 0,
                'avg_response_time': 0
            })
        }


# 全局监控器实例
cache_monitor = CachePerformanceMonitor()


def monitor_cache_performance(endpoint_name):
    """缓存性能监控装饰器"""
    def decorator(view_func):
        def wrapper(request, *args, **kwargs):
            start_time = time.time()
            
            # 检查是否有缓存
            cache_key = f"api_cache:{endpoint_name}:{request.path}:{request.GET.urlencode()}"
            cached_response = cache.get(cache_key)
            
            if cached_response:
                # 缓存命中
                cache_monitor.record_request(endpoint_name, time.time() - start_time, cache_hit=True)
                cache_monitor.record_cache_key(cache_key)
                
                # 从缓存数据重建响应
                try:
                    from rest_framework.response import Response
                    response = Response(
                        data=cached_response['data'],
                        status=cached_response['status_code']
                    )
                    
                    # 恢复响应头
                    for key, value in cached_response['headers'].items():
                        response[key] = value
                    
                    return response
                except Exception as e:
                    # 如果重建失败，继续执行原视图函数
                    pass
            
            # 缓存未命中，执行视图函数
            response = view_func(request, *args, **kwargs)
            
            # 记录性能数据
            response_time = time.time() - start_time
            cache_monitor.record_request(endpoint_name, response_time, cache_hit=False)
            cache_monitor.record_cache_key(cache_key)
            
            # 缓存响应（如果状态码是200）
            if response.status_code == 200:
                # 只缓存响应数据，不缓存整个响应对象
                try:
                    # 尝试获取响应内容
                    if hasattr(response, 'data'):
                        cache_data = {
                            'status_code': response.status_code,
                            'data': response.data,
                            'headers': dict(response.headers),
                            'content_type': response.get('Content-Type', 'application/json')
                        }
                        cache.set(cache_key, cache_data, timeout=120)  # 2分钟缓存
                except Exception as e:
                    # 如果缓存失败，记录但不影响正常响应
                    pass
            
            return response
        
        return wrapper
    return decorator


@api_view(["GET"])
def cache_performance_stats(request):
    """获取缓存性能统计"""
    try:
        stats = cache_monitor.get_stats()
        
        response = Response({
            "cache_performance": stats,
            "recommendations": generate_cache_recommendations(stats)
        })
        
        # 添加缓存头
        response["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response["Pragma"] = "no-cache"
        response["Expires"] = "0"
        
        return response
        
    except Exception as e:
        return Response(
            {"error": f"Failed to get cache stats: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["POST"])
def reset_cache_stats(request):
    """重置缓存统计"""
    try:
        cache_monitor.reset_stats()
        return Response({"message": "Cache statistics reset successfully"})
        
    except Exception as e:
        return Response(
            {"error": f"Failed to reset cache stats: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def generate_cache_recommendations(stats):
    """生成缓存优化建议"""
    recommendations = []
    
    overall = stats['overall']
    hit_rate = float(overall['hit_rate'].rstrip('%'))
    
    if hit_rate < 50:
        recommendations.append({
            "type": "warning",
            "message": "缓存命中率较低，建议增加缓存时间或优化缓存键策略"
        })
    
    if hit_rate < 30:
        recommendations.append({
            "type": "critical",
            "message": "缓存命中率过低，可能存在缓存失效策略问题"
        })
    
    if hit_rate > 80:
        recommendations.append({
            "type": "success",
            "message": "缓存命中率良好，系统性能优秀"
        })
    
    # 检查响应时间
    avg_response_time = float(overall['avg_response_time'].rstrip('s'))
    if avg_response_time > 1.0:
        recommendations.append({
            "type": "warning",
            "message": "平均响应时间较长，建议优化数据库查询或增加缓存"
        })
    
    # 检查端点性能
    for endpoint, endpoint_stats in stats['endpoints'].items():
        if endpoint_stats['total'] > 0:
            endpoint_hit_rate = (endpoint_stats['hits'] / endpoint_stats['total']) * 100
            if endpoint_hit_rate < 40:
                recommendations.append({
                    "type": "info",
                    "message": f"端点 '{endpoint}' 缓存命中率较低 ({endpoint_hit_rate:.1f}%)"
                })
    
    return recommendations


# 缓存性能测试函数
def test_cache_performance():
    """测试缓存性能"""
    test_results = []
    
    # 测试缓存设置
    start_time = time.time()
    cache.set('test_key', 'test_value', timeout=60)
    set_time = time.time() - start_time
    test_results.append(f"缓存设置时间: {set_time:.4f}s")
    
    # 测试缓存获取
    start_time = time.time()
    cached_value = cache.get('test_key')
    get_time = time.time() - start_time
    test_results.append(f"缓存获取时间: {get_time:.4f}s")
    
    # 测试缓存命中
    if cached_value == 'test_value':
        test_results.append("缓存命中: ✅")
    else:
        test_results.append("缓存命中: ❌")
    
    # 测试缓存删除
    start_time = time.time()
    cache.delete('test_key')
    delete_time = time.time() - start_time
    test_results.append(f"缓存删除时间: {delete_time:.4f}s")
    
    return test_results
