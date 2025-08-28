"""
CORS中间件

实现跨域资源共享支持，允许前端应用访问API
"""

import re
from django.http import HttpResponse
from django.conf import settings


class CORSMiddleware:
    """
    简单的CORS中间件
    
    支持：
    - 预检请求处理
    - 允许的域名配置
    - 允许的HTTP方法
    - 允许的请求头
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        
        # 从设置中获取CORS配置
        self.allowed_origins = getattr(settings, 'CORS_ALLOWED_ORIGINS', [
            'http://localhost:3000',  # Next.js开发服务器
            'http://localhost:8000',  # Django开发服务器
            'https://yourdomain.com',  # 生产域名
        ])
        
        self.allowed_methods = getattr(settings, 'CORS_ALLOWED_METHODS', [
            'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'
        ])
        
        self.allowed_headers = getattr(settings, 'CORS_ALLOWED_HEADERS', [
            'Content-Type', 'Authorization', 'X-Requested-With',
            'Accept', 'Origin', 'Cache-Control', 'X-File-Name'
        ])
        
        self.expose_headers = getattr(settings, 'CORS_EXPOSE_HEADERS', [
            'Content-Length', 'X-Total-Count', 'X-Page-Count',
            'ETag', 'Surrogate-Key', 'Cache-Control'
        ])
        
        self.max_age = getattr(settings, 'CORS_MAX_AGE', 86400)  # 24小时
        
        # 编译正则表达式以提高性能
        self.allowed_origins_patterns = [
            re.compile(pattern) if '*' in pattern else None
            for pattern in self.allowed_origins
        ]
    
    def __call__(self, request):
        # 处理预检请求
        if request.method == 'OPTIONS':
            return self.handle_preflight(request)
        
        # 处理实际请求
        response = self.get_response(request)
        return self.add_cors_headers(request, response)
    
    def handle_preflight(self, request):
        """处理预检请求"""
        origin = request.META.get('HTTP_ORIGIN', '')
        
        # 检查是否允许该域名
        if not self.is_origin_allowed(origin):
            return HttpResponse(status=403)
        
        # 创建预检响应
        response = HttpResponse()
        response['Access-Control-Allow-Origin'] = origin
        response['Access-Control-Allow-Methods'] = ', '.join(self.allowed_methods)
        response['Access-Control-Allow-Headers'] = ', '.join(self.allowed_headers)
        response['Access-Control-Max-Age'] = str(self.max_age)
        response['Access-Control-Allow-Credentials'] = 'true'
        
        return response
    
    def add_cors_headers(self, request, response):
        """添加CORS响应头"""
        origin = request.META.get('HTTP_ORIGIN', '')
        
        # 检查是否允许该域名
        if self.is_origin_allowed(origin):
            response['Access-Control-Allow-Origin'] = origin
            response['Access-Control-Allow-Credentials'] = 'true'
        
        # 添加其他CORS头
        response['Access-Control-Expose-Headers'] = ', '.join(self.expose_headers)
        
        return response
    
    def is_origin_allowed(self, origin):
        """检查域名是否被允许"""
        if not origin:
            return False
        
        # 检查精确匹配
        if origin in self.allowed_origins:
            return True
        
        # 检查通配符匹配
        for i, pattern in enumerate(self.allowed_origins_patterns):
            if pattern and pattern.match(origin):
                return True
        
        return False


# 简化的CORS装饰器
def cors_enabled(view_func):
    """为单个视图启用CORS的装饰器"""
    def wrapper(request, *args, **kwargs):
        response = view_func(request, *args, **kwargs)
        
        # 添加基本的CORS头
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        
        return response
    
    return wrapper
