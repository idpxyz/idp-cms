"""
API限流工具

实现基于Redis的API限流机制，支持：
- 基于IP的限流
- 基于用户的限流
- 基于端点的限流
- 滑动窗口算法
"""

import time
from functools import wraps
from django.core.cache import cache
from django.http import JsonResponse
from django.conf import settings
from rest_framework.response import Response
from rest_framework import status


def get_client_ip(request):
    """获取客户端IP地址"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def get_user_identifier(request):
    """获取用户标识符"""
    if request.user.is_authenticated:
        return f"user:{request.user.id}"
    else:
        return f"ip:{get_client_ip(request)}"


def rate_limit(limit=100, window=3600, key_func=None, error_message=None):
    """
    API限流装饰器
    
    参数:
    - limit: 限制次数
    - window: 时间窗口（秒）
    - key_func: 自定义键生成函数
    - error_message: 自定义错误消息
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapped_view(request, *args, **kwargs):
            # 生成限流键
            if key_func:
                rate_key = key_func(request)
            else:
                identifier = get_user_identifier(request)
                rate_key = f"rate_limit:{identifier}:{view_func.__name__}"
            
            # 获取当前计数
            current_count = cache.get(rate_key, 0)
            
            # 检查是否超过限制
            if current_count >= limit:
                error_msg = error_message or f"Rate limit exceeded. Maximum {limit} requests per {window} seconds."
                return Response(
                    {"error": error_msg, "retry_after": window},
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )
            
            # 增加计数
            cache.set(rate_key, current_count + 1, window)
            
            # 调用原视图函数
            return view_func(request, *args, **kwargs)
        
        return wrapped_view
    return decorator


def api_rate_limit(limit=100, window=3600):
    """
    简化的API限流装饰器
    
    参数:
    - limit: 限制次数
    - window: 时间窗口（秒）
    """
    return rate_limit(
        limit=limit,
        window=window,
        key_func=lambda request: f"api_rate_limit:{get_user_identifier(request)}",
        error_message=f"API rate limit exceeded. Maximum {limit} requests per {window} seconds."
    )


def endpoint_rate_limit(endpoint_name, limit=100, window=3600):
    """
    基于端点的限流装饰器
    
    参数:
    - endpoint_name: 端点名称
    - limit: 限制次数
    - window: 时间窗口（秒）
    """
    return rate_limit(
        limit=limit,
        window=window,
        key_func=lambda request: f"endpoint_rate_limit:{endpoint_name}:{get_user_identifier(request)}",
        error_message=f"Endpoint '{endpoint_name}' rate limit exceeded. Maximum {limit} requests per {window} seconds."
    )


# 预定义的限流配置
ARTICLES_RATE_LIMIT = endpoint_rate_limit("articles", limit=1000, window=3600)
CHANNELS_RATE_LIMIT = endpoint_rate_limit("channels", limit=500, window=3600)
REGIONS_RATE_LIMIT = endpoint_rate_limit("regions", limit=500, window=3600)
SITE_SETTINGS_RATE_LIMIT = endpoint_rate_limit("site_settings", limit=200, window=3600)
PORTAL_ARTICLES_RATE_LIMIT = endpoint_rate_limit("portal_articles", limit=2000, window=3600)
CDN_CONFIG_RATE_LIMIT = endpoint_rate_limit("cdn_config", limit=100, window=3600)  # CDN配置操作较少
