"""
核心中间件
"""
import threading
import logging
import uuid
from django.utils.deprecation import MiddlewareMixin


class CorrelationIdMiddleware(MiddlewareMixin):
    """
    关联ID中间件：为每个请求分配唯一的关联ID
    用于日志追踪和请求链路追踪
    """
    
    def process_request(self, request):
        """处理请求开始时"""
        # 从请求头获取或生成新的关联ID
        correlation_id = (
            request.META.get('HTTP_X_CORRELATION_ID') or
            request.META.get('HTTP_X_REQUEST_ID') or
            str(uuid.uuid4())
        )
        
        # 将关联ID附加到请求对象
        request.correlation_id = correlation_id
        
        # 设置响应头
        request.correlation_id_for_response = correlation_id
        
        return None
    
    def process_response(self, request, response):
        """处理请求结束时"""
        # 将关联ID添加到响应头
        if hasattr(request, 'correlation_id_for_response'):
            response['X-Correlation-ID'] = request.correlation_id_for_response
        
        return response
    
    def process_exception(self, request, exception):
        """处理异常时"""
        # 异常时也不需要特殊处理
        return None


class ThreadLocalRequestMiddleware(MiddlewareMixin):
    """
    中间件：将当前请求存储到线程本地存储中
    这样其他组件（如存储类）就能访问到当前请求的信息
    """
    
    def process_request(self, request):
        """处理请求开始时"""
        # 将请求对象存储到当前线程
        threading.current_thread().request = request
        return None
    
    def process_response(self, request, response):
        """处理请求结束时"""
        # 清理线程本地存储
        if hasattr(threading.current_thread(), 'request'):
            delattr(threading.current_thread(), 'request')
        return response
    
    def process_exception(self, request, exception):
        """处理异常时"""
        # 清理线程本地存储
        if hasattr(threading.current_thread(), 'request'):
            delattr(threading.current_thread(), 'request')
        return None


class RequestLogContextFilter(logging.Filter):
    """
    日志过滤器：为日志记录添加请求上下文信息
    """
    
    def filter(self, record):
        """
        为日志记录添加请求相关信息
        """
        try:
            current_request = getattr(threading.current_thread(), 'request', None)
            if current_request:
                # 提供correlation_id字段（日志格式需要）
                record.correlation_id = getattr(current_request, 'correlation_id', 'N/A')
                record.request_id = getattr(current_request, 'META', {}).get('HTTP_X_REQUEST_ID', 'N/A')
                record.user_id = getattr(current_request.user, 'id', 'anonymous') if hasattr(current_request, 'user') else 'N/A'
                record.ip_address = current_request.META.get('REMOTE_ADDR', 'N/A')
            else:
                # 没有请求上下文时的默认值
                record.correlation_id = 'N/A'
                record.request_id = 'N/A'
                record.user_id = 'N/A'
                record.ip_address = 'N/A'
        except Exception:
            # 异常时的默认值
            record.correlation_id = 'N/A'
            record.request_id = 'N/A'
            record.user_id = 'N/A'
            record.ip_address = 'N/A'
        
        return True