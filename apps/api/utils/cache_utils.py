"""
缓存工具模块
提供智能缓存装饰器和缓存管理功能
"""
import hashlib
import json
import logging
from functools import wraps
from typing import Any, Callable, Dict, List, Optional, Union
from django.core.cache import caches
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

# 获取API专用缓存实例
try:
    api_cache = caches['api']
except KeyError:
    # 如果没有配置api缓存，使用default缓存
    api_cache = caches['default']

class CacheKeyBuilder:
    """缓存键构建器"""
    
    @staticmethod
    def build_key(prefix: str, *args, **kwargs) -> str:
        """构建缓存键"""
        # 将参数转换为字符串并排序
        key_parts = [prefix]
        
        # 添加位置参数
        for arg in args:
            if arg is not None:
                key_parts.append(str(arg))
        
        # 添加关键字参数（排序以确保一致性）
        for key in sorted(kwargs.keys()):
            value = kwargs[key]
            if value is not None:
                key_parts.append(f"{key}:{value}")
        
        # 使用MD5生成固定长度的键
        key_string = "|".join(key_parts)
        return hashlib.md5(key_string.encode()).hexdigest()

def smart_cache(
    timeout: int = 600,
    key_prefix: str = "api",
    cache_alias: str = "api",
    invalidate_on_update: bool = True,
    cache_condition: Optional[Callable] = None
):
    """
    智能缓存装饰器
    
    Args:
        timeout: 缓存超时时间（秒）
        key_prefix: 缓存键前缀
        cache_alias: 使用的缓存别名
        invalidate_on_update: 是否在更新时自动失效相关缓存
        cache_condition: 缓存条件函数，返回True时才缓存
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # 构建缓存键
            cache_key = CacheKeyBuilder.build_key(key_prefix, func.__name__, *args, **kwargs)
            
            # 获取缓存实例
            cache = caches[cache_alias]
            
            # 检查缓存条件
            if cache_condition and not cache_condition(*args, **kwargs):
                return func(*args, **kwargs)
            
            # 尝试从缓存获取
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache HIT: {cache_key}")
                # 如果缓存的是数据，需要重新创建Response对象
                # 检查第一个参数是否是request对象（Django view的第一个参数）
                if args and hasattr(args[0], 'method'):
                    # 这是一个Django view，需要返回Response对象
                    from rest_framework.response import Response
                    return Response(cached_result)
                return cached_result
            
            # 缓存未命中，执行函数
            logger.debug(f"Cache MISS: {cache_key}")
            result = func(*args, **kwargs)
            
            # 缓存结果 - 修复：确保Response对象被正确渲染
            try:
                # 如果是Django REST Framework的Response对象，需要先渲染
                if hasattr(result, 'data') and hasattr(result, 'render'):
                    # 这是一个Response对象，缓存其data属性
                    cache_data = result.data
                    cache.set(cache_key, cache_data, timeout)
                    logger.debug(f"Cache SET: {cache_key} (TTL: {timeout}s)")
                else:
                    # 普通数据，直接缓存
                    cache.set(cache_key, result, timeout)
                    logger.debug(f"Cache SET: {cache_key} (TTL: {timeout}s)")
            except Exception as e:
                logger.warning(f"Failed to cache result: {e}")
            
            return result
        return wrapper
    return decorator

def invalidate_cache_pattern(pattern: str, cache_alias: str = "api"):
    """
    按模式失效缓存
    
    Args:
        pattern: 缓存键模式（支持通配符）
        cache_alias: 缓存别名
    """
    try:
        cache = caches[cache_alias]
        if hasattr(cache, 'delete_pattern'):
            cache.delete_pattern(pattern)
            logger.info(f"Invalidated cache pattern: {pattern}")
        else:
            # 对于不支持delete_pattern的缓存后端，记录警告
            logger.warning(f"Cache backend doesn't support pattern deletion: {pattern}")
    except Exception as e:
        logger.error(f"Failed to invalidate cache pattern {pattern}: {e}")

# 旧的AI相关缓存失效函数已移除，使用新的revalidate API

def get_cache_stats(cache_alias: str = "api") -> Dict[str, Any]:
    """
    获取缓存统计信息
    
    Args:
        cache_alias: 缓存别名
    
    Returns:
        缓存统计信息字典
    """
    try:
        cache = caches[cache_alias]
        stats = {
            "cache_alias": cache_alias,
            "backend": cache.__class__.__name__,
            "timestamp": timezone.now().isoformat(),
        }
        
        # 尝试获取Redis特定统计信息
        if hasattr(cache, '_client'):
            try:
                redis_client = cache._client
                info = redis_client.info()
                stats.update({
                    "redis_version": info.get("redis_version"),
                    "used_memory_human": info.get("used_memory_human"),
                    "connected_clients": info.get("connected_clients"),
                    "total_commands_processed": info.get("total_commands_processed"),
                })
            except Exception as e:
                stats["redis_info_error"] = str(e)
        
        return stats
    except Exception as e:
        return {
            "cache_alias": cache_alias,
            "error": str(e),
            "timestamp": timezone.now().isoformat(),
        }

def clear_all_caches():
    """清空所有缓存"""
    try:
        for cache_name in settings.CACHES.keys():
            cache = caches[cache_name]
            cache.clear()
            logger.info(f"Cleared cache: {cache_name}")
        return True
    except Exception as e:
        logger.error(f"Failed to clear caches: {e}")
        return False
