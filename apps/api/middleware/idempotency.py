"""
Django幂等性中间件
支持基于Idempotency-Key头的请求去重
"""

import json
import time
import hashlib
from django.core.cache import cache
import logging
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings


class IdempotencyMiddleware(MiddlewareMixin):
    """
    幂等性中间件
    - 检查请求头中的Idempotency-Key
    - 对于POST/PUT/PATCH请求，如果key已存在则返回缓存的响应
    - 支持配置缓存时间和存储后端
    """
    
    IDEMPOTENT_METHODS = ['POST', 'PUT', 'PATCH']
    CACHE_PREFIX = 'idempotency'
    DEFAULT_TTL = 3600  # 1小时
    MAX_CACHE_BYTES = 256 * 1024  # 仅缓存不超过256KB的响应
    logger = logging.getLogger(__name__)
    
    def process_request(self, request):
        """处理请求，检查幂等键（兜底保护：任何异常不阻断请求）"""
        try:
            # 只处理幂等方法
            if request.method not in self.IDEMPOTENT_METHODS:
                return None
            
            # 只处理API路径，且仅处理JSON请求
            if not self._is_api_request(request):
                return None
            content_type = request.META.get('CONTENT_TYPE', '')
            if 'application/json' not in content_type:
                return None
            
            # 获取幂等键
            idempotency_key = request.META.get('HTTP_IDEMPOTENCY_KEY')
            if not idempotency_key:
                return None
            
            # 生成缓存键
            cache_key = self._generate_cache_key(request, idempotency_key)
            
            # 检查是否已有缓存响应
            try:
                cached_response = cache.get(cache_key)
                if cached_response:
                    return self._create_response_from_cache(cached_response)
            except Exception:
                # 缓存异常时忽略，继续请求流程
                self.logger.exception("Idempotency cache get failed")
                pass
            
            # 标记请求需要缓存响应
            request._idempotency_key = idempotency_key
            request._idempotency_cache_key = cache_key
            
            return None
        except Exception:
            self.logger.exception("Idempotency process_request failed")
            return None
    
    def process_response(self, request, response):
        """处理响应，缓存成功的响应（兜底保护：异常不影响原响应）"""
        try:
            # 检查是否需要缓存响应
            if not hasattr(request, '_idempotency_key'):
                return response
            
            # 只缓存成功响应
            if not (200 <= response.status_code < 300):
                return response
            
            # 仅缓存JSON响应，且大小受限
            content_type = response.get('Content-Type', '')
            content_bytes = None
            # JsonResponse 直接读取
            if hasattr(response, 'content') and response.get('Content-Type', '').startswith('application/json'):
                content_bytes = response.content
            # DRF Response：不调用 render，使用 JSONRenderer 渲染到字符串
            if content_bytes is None:
                try:
                    from rest_framework.response import Response as DRFResponse
                    from rest_framework.renderers import JSONRenderer
                    if isinstance(response, DRFResponse) and hasattr(response, 'data'):
                        rendered = JSONRenderer().render(response.data)
                        content_bytes = bytes(rendered)
                        content_type = 'application/json; charset=utf-8'
                except Exception:
                    content_bytes = None

            if content_bytes is None:
                return response

            if len(content_bytes) > self.MAX_CACHE_BYTES:
                return response

            if 'application/json' not in content_type:
                # 尝试判断字节是否为JSON
                try:
                    _ = json.loads(content_bytes.decode('utf-8'))
                except Exception:
                    return response

            cache_data = {
                'status_code': response.status_code,
                'content': content_bytes.decode('utf-8', errors='ignore'),
                'headers': self._safe_headers(response),
                'timestamp': time.time(),
            }

            try:
                cache.set(
                    request._idempotency_cache_key,
                    cache_data,
                    timeout=self.DEFAULT_TTL
                )
                # 添加幂等性标头
                response['X-Idempotency-Replayed'] = 'false'
            except Exception:
                # 缓存失败不影响正常响应
                self.logger.exception("Idempotency cache set failed")
                pass
            
            return response
        except Exception:
            self.logger.exception("Idempotency process_response failed")
            return response
    
    def _is_api_request(self, request):
        """判断是否为API请求"""
        path = request.path or ''
        # 严格限定仅处理 /api/*
        return path.startswith('/api/')
    
    def _generate_cache_key(self, request, idempotency_key):
        """生成缓存键"""
        # 包含请求方法、路径、用户ID和幂等键
        try:
            user_id = request.user.id if getattr(request, 'user', None) and request.user.is_authenticated else 'anonymous'
        except Exception:
            user_id = 'anonymous'
        
        # 对于POST/PUT/PATCH，还包含请求体的哈希
        body_hash = ''
        # 仅当Content-Length合理时再计算哈希，避免大包体开销
        try:
            content_length = int(request.META.get('CONTENT_LENGTH') or 0)
        except Exception:
            content_length = 0
        if content_length and content_length <= self.MAX_CACHE_BYTES:
            try:
                if hasattr(request, 'body') and request.body:
                    body_hash = hashlib.md5(request.body).hexdigest()[:8]
            except Exception:
                body_hash = ''
        
        # 规避路径中的特殊字符
        safe_path = (request.path or '').replace(':', '_')
        key_components = [
            self.CACHE_PREFIX,
            request.method,
            safe_path,
            str(user_id),
            idempotency_key,
            body_hash,
        ]
        
        return ':'.join(filter(None, key_components))
    
    def _create_response_from_cache(self, cached_data):
        """从缓存数据创建响应"""
        try:
            payload = json.loads(cached_data.get('content') or '')
            response = JsonResponse(payload, status=cached_data.get('status_code', 200), safe=False)
        except Exception:
            # 若非JSON，直接返回原始内容
            from django.http import HttpResponse
            response = HttpResponse(cached_data.get('content', ''), status=cached_data.get('status_code', 200), content_type='application/json; charset=utf-8')
        
        # 恢复原始头部
        for key, value in (cached_data.get('headers') or {}).items():
            if key and key.lower() not in ['content-length', 'content-type', 'set-cookie']:
                try:
                    response[key] = value
                except Exception:
                    pass
        
        # 标记为重放响应
        response['X-Idempotency-Replayed'] = 'true'
        response['X-Idempotency-Timestamp'] = str(cached_data.get('timestamp', time.time()))
        
        return response

    def _safe_headers(self, response):
        try:
            headers = {}
            for k, v in response.items():
                if k.lower() not in ['content-length', 'set-cookie']:
                    headers[k] = str(v)
            return headers
        except Exception:
            return {}


class RetryableErrorMiddleware(MiddlewareMixin):
    """
    可重试错误中间件
    为5xx错误和429限流错误添加Retry-After头
    """
    
    def process_response(self, request, response):
        """处理响应，添加重试头"""
        status_code = response.status_code
        
        # 5xx服务器错误
        if 500 <= status_code < 600:
            # 根据错误类型设置不同的重试时间
            retry_after = self._calculate_retry_after(status_code)
            response['Retry-After'] = str(retry_after)
            response['X-Retryable'] = 'true'
        
        # 429限流错误
        elif status_code == 429:
            # 如果没有设置Retry-After，添加默认值
            if 'Retry-After' not in response:
                response['Retry-After'] = '60'  # 60秒
            response['X-Retryable'] = 'true'
        
        # 网关错误（可能是上游服务问题）
        elif status_code in [502, 503, 504]:
            response['Retry-After'] = '30'
            response['X-Retryable'] = 'true'
        
        return response
    
    def _calculate_retry_after(self, status_code):
        """计算重试等待时间"""
        retry_times = {
            500: 10,  # 内部服务器错误，10秒后重试
            502: 30,  # 网关错误，30秒后重试
            503: 60,  # 服务不可用，60秒后重试
            504: 30,  # 网关超时，30秒后重试
        }
        
        return retry_times.get(status_code, 60)


class CircuitBreakerResponseMiddleware(MiddlewareMixin):
    """
    熔断器响应中间件
    为熔断器开启状态提供标准响应
    """
    
    def process_exception(self, request, exception):
        """处理熔断器异常"""
        # 检查是否为熔断器异常
        if hasattr(exception, '__class__') and 'CircuitBreaker' in str(exception.__class__):
            return JsonResponse({
                'success': False,
                'message': 'Service temporarily unavailable',
                'error': {
                    'code': 'CIRCUIT_BREAKER_OPEN',
                    'message': 'The service is temporarily unavailable due to high error rate',
                    'retry_after': 60,
                },
                'meta': {
                    'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S.%fZ'),
                    'request_id': getattr(request, 'correlation_id', 'unknown'),
                    'version': '1.0',
                }
            }, status=503, headers={
                'Retry-After': '60',
                'X-Circuit-Breaker': 'open',
            })
        
        return None
