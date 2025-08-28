"""
安全中间件

添加安全相关的HTTP响应头，提高API安全性
"""

from django.conf import settings


class SecurityHeadersMiddleware:
    """
    安全响应头中间件
    
    添加以下安全头：
    - X-Content-Type-Options
    - X-Frame-Options
    - X-XSS-Protection
    - Referrer-Policy
    - Content-Security-Policy
    - Strict-Transport-Security (HTTPS)
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        
        # 从设置中获取安全配置
        self.security_headers = getattr(settings, 'SECURITY_HEADERS', {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Content-Security-Policy': self._get_csp_policy(),
            'Permissions-Policy': self._get_permissions_policy(),
        })
        
        # HTTPS相关头
        if getattr(settings, 'SECURE_SSL_REDIRECT', False):
            self.security_headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    
    def __call__(self, request):
        response = self.get_response(request)
        return self.add_security_headers(response)
    
    def add_security_headers(self, response):
        """添加安全响应头"""
        for header, value in self.security_headers.items():
            if value:
                response[header] = value
        
        return response
    
    def _get_csp_policy(self):
        """获取内容安全策略"""
        return (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self'; "
            "media-src 'self'; "
            "object-src 'none'; "
            "base-uri 'self'; "
            "form-action 'self'; "
            "frame-ancestors 'none';"
        )
    
    def _get_permissions_policy(self):
        """获取权限策略"""
        return (
            "geolocation=(), "
            "microphone=(), "
            "camera=(), "
            "payment=(), "
            "usb=(), "
            "magnetometer=(), "
            "gyroscope=(), "
            "accelerometer=(), "
            "ambient-light-sensor=(), "
            "autoplay=(), "
            "encrypted-media=(), "
            "picture-in-picture=()"
        )


class APIVersionMiddleware:
    """
    API版本控制中间件
    
    支持通过请求头或URL参数指定API版本
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.default_version = getattr(settings, 'API_DEFAULT_VERSION', 'v1')
        self.supported_versions = getattr(settings, 'API_SUPPORTED_VERSIONS', ['v1'])
    
    def __call__(self, request):
        # 从请求头获取版本
        version = request.META.get('HTTP_X_API_VERSION')
        
        # 从URL参数获取版本
        if not version:
            version = request.GET.get('version')
        
        # 从Accept头获取版本
        if not version:
            accept = request.META.get('HTTP_ACCEPT', '')
            if 'application/vnd.api+' in accept:
                # 解析Accept头中的版本
                import re
                match = re.search(r'application/vnd\.api\+(\w+)', accept)
                if match:
                    version = match.group(1)
        
        # 验证版本
        if version and version not in self.supported_versions:
            version = self.default_version
        
        # 设置默认版本
        if not version:
            version = self.default_version
        
        # 将版本信息添加到请求对象
        request.api_version = version
        
        response = self.get_response(request)
        
        # 在响应头中添加版本信息
        response['X-API-Version'] = version
        
        return response


# 简化的安全装饰器
def secure_headers(view_func):
    """为单个视图添加安全头的装饰器"""
    def wrapper(request, *args, **kwargs):
        response = view_func(request, *args, **kwargs)
        
        # 添加基本安全头
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        
        return response
    
    return wrapper


def api_version_required(version):
    """要求特定API版本的装饰器"""
    def decorator(view_func):
        def wrapper(request, *args, **kwargs):
            if not hasattr(request, 'api_version'):
                request.api_version = 'v1'
            
            if request.api_version != version:
                from rest_framework.response import Response
                from rest_framework import status
                return Response(
                    {"error": f"API version {version} required, got {request.api_version}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            return view_func(request, *args, **kwargs)
        
        return wrapper
    return decorator
