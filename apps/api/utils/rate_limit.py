"""
API限流工具

实现基于Redis的API限流机制，支持：
- 基于IP的限流
- 基于用户的限流
- 基于端点的限流
- 滑动窗口算法
"""

import time
import os
from functools import wraps
from django.core.cache import cache
from django.http import JsonResponse
from django.conf import settings
from rest_framework.response import Response
from rest_framework import status


def _rate_limit_disabled():
    """在开发/本地阶段禁用限流：
    - settings.DEBUG 为 True
    - settings.DISABLE_RATE_LIMIT 为 True
    - 环境变量 DISABLE_RATE_LIMIT=1
    """
    try:
        if getattr(settings, 'DEBUG', False):
            return True
        if getattr(settings, 'DISABLE_RATE_LIMIT', False):
            return True
    except Exception:
        pass
    return os.environ.get('DISABLE_RATE_LIMIT', '0') == '1'


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
    if hasattr(request, 'user') and getattr(request.user, 'is_authenticated', False):
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
            # 开发/本地禁用限流
            if _rate_limit_disabled():
                return view_func(request, *args, **kwargs)

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
    def key_func(request):
        user_part = get_user_identifier(request)
        # 合并频道与站点作为限流粒度，避免跨频道串扰
        site = getattr(request, 'query_params', {}).get('site') if hasattr(request, 'query_params') else None
        channel = getattr(request, 'query_params', {}).get('channel') if hasattr(request, 'query_params') else None
        return f"endpoint_rate_limit:{endpoint_name}:{site or 'default'}:{channel or 'all'}:{user_part}"

    return rate_limit(
        limit=limit,
        window=window,
        key_func=key_func,
        error_message=f"Endpoint '{endpoint_name}' rate limit exceeded. Maximum {limit} requests per {window} seconds."
    )


# 预定义的限流配置 - 针对新闻网站优化
ARTICLES_RATE_LIMIT = endpoint_rate_limit("articles", limit=10000, window=3600)  # 大幅提高限制
CHANNELS_RATE_LIMIT = endpoint_rate_limit("channels", limit=5000, window=3600)   # 频道访问更频繁
REGIONS_RATE_LIMIT = endpoint_rate_limit("regions", limit=5000, window=3600)     # 地区切换频繁
SITE_SETTINGS_RATE_LIMIT = endpoint_rate_limit("site_settings", limit=2000, window=3600)  # 站点设置访问频繁
PORTAL_ARTICLES_RATE_LIMIT = endpoint_rate_limit("portal_articles", limit=20000, window=3600)  # 门户文章访问最频繁
# 放宽Feed限流并按site+channel维度限流，避免全局撞桶
FEED_RATE_LIMIT = endpoint_rate_limit("feed", limit=60000, window=3600)
CDN_CONFIG_RATE_LIMIT = endpoint_rate_limit("cdn_config", limit=1000, window=3600)  # CDN配置也需要提高
