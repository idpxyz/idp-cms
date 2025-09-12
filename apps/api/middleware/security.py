"""
安全中间件 - 增强生产环境安全性
"""

import re
from django.http import HttpResponseForbidden, HttpResponse
from django.conf import settings
from django.core.cache import cache
from django.utils.deprecation import MiddlewareMixin
from django.utils import timezone
from datetime import timedelta
import hashlib
import json


class SecureHeadersMiddleware(MiddlewareMixin):
    """
    安全头中间件 - 添加各种安全相关的HTTP头
    """
    
    def process_response(self, request, response):
        # 基础安全头
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # 现代安全头
        response['Cross-Origin-Opener-Policy'] = 'same-origin-allow-popups'
        response['Cross-Origin-Embedder-Policy'] = 'require-corp'
        response['Cross-Origin-Resource-Policy'] = 'same-origin'
        
        # 内容安全策略
        csp_policy = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self'",
            "connect-src 'self'",
            "media-src 'self'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'"
        ]
        response['Content-Security-Policy'] = '; '.join(csp_policy)
        
        # 权限策略
        response['Permissions-Policy'] = (
            'geolocation=(), microphone=(), camera=(), '
            'payment=(), usb=(), magnetometer=(), gyroscope=()'
        )
        
        # 移除可能泄露信息的头
        response.pop('Server', None)
        response.pop('X-Powered-By', None)
        
        return response


class RateLimitMiddleware(MiddlewareMixin):
    """
    访问频率限制中间件 - 防止暴力攻击和滥用
    """
    
    def process_request(self, request):
        # 获取客户端标识
        client_ip = self._get_client_ip(request)
        user_id = self._get_user_id(request)
        
        # 检查IP限制
        if not self._check_ip_rate_limit(client_ip):
            return HttpResponseForbidden("IP访问频率过高，请稍后再试")
        
        # 检查用户限制
        if user_id and not self._check_user_rate_limit(user_id):
            return HttpResponseForbidden("用户访问频率过高，请稍后再试")
        
        # 检查API端点限制
        if not self._check_endpoint_rate_limit(request, client_ip, user_id):
            return HttpResponseForbidden("API访问频率过高，请稍后再试")
        
        return None
    
    def _get_client_ip(self, request):
        """获取真实客户端IP"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')
    
    def _get_user_id(self, request):
        """获取用户ID"""
        if hasattr(request, 'user') and request.user.is_authenticated:
            return str(request.user.id)
        return None
    
    def _check_ip_rate_limit(self, client_ip):
        """检查IP访问频率"""
        cache_key = f"rate_limit_ip:{client_ip}"
        current_count = cache.get(cache_key, 0)
        
        if current_count >= 1000:  # 每小时1000次请求
            return False
        
        cache.set(cache_key, current_count + 1, 3600)  # 1小时过期
        return True
    
    def _check_user_rate_limit(self, user_id):
        """检查用户访问频率"""
        cache_key = f"rate_limit_user:{user_id}"
        current_count = cache.get(cache_key, 0)
        
        if current_count >= 500:  # 每小时500次请求
            return False
        
        cache.set(cache_key, current_count + 1, 3600)  # 1小时过期
        return True
    
    def _check_endpoint_rate_limit(self, request, client_ip, user_id):
        """检查特定端点的访问频率"""
        path = request.path
        method = request.method
        
        # 登录端点特殊限制
        if path.endswith('/login/') and method == 'POST':
            cache_key = f"rate_limit_login:{client_ip}"
            current_count = cache.get(cache_key, 0)
            
            if current_count >= 5:  # 每小时5次登录尝试
                return False
            
            cache.set(cache_key, current_count + 1, 3600)
        
        # API端点限制
        elif path.startswith('/api/'):
            cache_key = f"rate_limit_api:{client_ip}:{path}"
            current_count = cache.get(cache_key, 0)
            
            if current_count >= 100000:  # 每小时100000次API调用（开发环境，基本无限制）
                return False
            
            cache.set(cache_key, current_count + 1, 3600)
        
        return True


class SecurityMiddleware(MiddlewareMixin):
    """
    综合安全中间件 - 整合各种安全检查
    """
    
    def process_request(self, request):
        # 检查可疑请求
        if self._is_suspicious_request(request):
            return HttpResponseForbidden("请求被拒绝")
        
        # 检查恶意用户代理
        if self._is_malicious_user_agent(request):
            return HttpResponseForbidden("请求被拒绝")
        
        # 检查请求大小
        if self._is_request_too_large(request):
            return HttpResponseForbidden("请求过大")
        
        return None
    
    def _is_suspicious_request(self, request):
        """检查可疑请求"""
        # 检查SQL注入模式
        sql_patterns = [
            r"(\b(union|select|insert|update|delete|drop|create|alter)\b)",
            r"(\b(script|javascript|vbscript|expression)\b)",
            r"(\b(exec|execute|eval|system)\b)",
            r"(\b(union\s+select|select\s+union)\b)",
        ]
        
        # 检查请求参数
        for key, value in request.GET.items():
            if isinstance(value, str):
                for pattern in sql_patterns:
                    if re.search(pattern, value, re.IGNORECASE):
                        return True
        
        # 检查POST数据
        if request.method == 'POST':
            for key, value in request.POST.items():
                if isinstance(value, str):
                    for pattern in sql_patterns:
                        if re.search(pattern, value, re.IGNORECASE):
                            return True
        
        return False
    
    def _is_malicious_user_agent(self, request):
        """检查恶意用户代理"""
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        malicious_patterns = [
            r"sqlmap",
            r"nikto",
            r"nmap",
            r"scanner",
            r"bot",
            r"crawler",
            r"spider",
            r"curl",
            r"wget",
            r"python-requests",
        ]
        
        for pattern in malicious_patterns:
            if re.search(pattern, user_agent, re.IGNORECASE):
                return True
        
        return False
    
    def _is_request_too_large(self, request):
        """检查请求大小"""
        content_length = request.META.get('CONTENT_LENGTH', 0)
        if content_length and int(content_length) > 10 * 1024 * 1024:  # 10MB
            return True
        return False


class AuditLogMiddleware(MiddlewareMixin):
    """
    审计日志中间件 - 记录重要操作
    """
    
    def process_request(self, request):
        # 记录敏感操作
        if self._is_sensitive_operation(request):
            self._log_sensitive_operation(request)
        
        return None
    
    def _is_sensitive_operation(self, request):
        """判断是否为敏感操作"""
        sensitive_paths = [
            '/admin/',
            '/api/auth/',
            '/api/users/',
            '/api/sites/',
        ]
        
        return any(request.path.startswith(path) for path in sensitive_paths)
    
    def _log_sensitive_operation(self, request):
        """记录敏感操作"""
        log_data = {
            'timestamp': timezone.now().isoformat(),
            'ip': self._get_client_ip(request),
            'user': getattr(request.user, 'username', 'anonymous'),
            'method': request.method,
            'path': request.path,
            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
            'referer': request.META.get('HTTP_REFERER', ''),
        }
        
        # 记录到日志文件或数据库
        import logging
        logger = logging.getLogger('security.audit')
        logger.info(f"Sensitive operation: {json.dumps(log_data)}")
    
    def _get_client_ip(self, request):
        """获取客户端IP"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR')


# 装饰器函数
def secure_headers(view_func):
    """安全头装饰器"""
    def wrapped_view(request, *args, **kwargs):
        response = view_func(request, *args, **kwargs)
        middleware = SecureHeadersMiddleware()
        return middleware.process_response(request, response)
    return wrapped_view


def rate_limit(limit_type='ip', max_requests=100, window=3600):
    """访问频率限制装饰器"""
    def decorator(view_func):
        def wrapped_view(request, *args, **kwargs):
            if limit_type == 'ip':
                identifier = request.META.get('REMOTE_ADDR')
            elif limit_type == 'user':
                identifier = str(request.user.id) if request.user.is_authenticated else 'anonymous'
            else:
                identifier = 'default'
            
            cache_key = f"rate_limit_{limit_type}:{identifier}"
            current_count = cache.get(cache_key, 0)
            
            if current_count >= max_requests:
                return HttpResponseForbidden("访问频率过高，请稍后再试")
            
            cache.set(cache_key, current_count + 1, window)
            return view_func(request, *args, **kwargs)
        return wrapped_view
    return decorator
