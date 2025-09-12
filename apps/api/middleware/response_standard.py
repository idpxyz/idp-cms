"""
Django API响应标准化中间件
统一API响应格式，添加元数据和错误处理
"""

import json
import time
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings
from rest_framework.response import Response


class APIResponseStandardMiddleware(MiddlewareMixin):
    """
    API响应标准化中间件
    - 为所有API响应添加统一格式
    - 添加响应元数据（时间戳、请求ID、执行时间等）
    - 统一错误格式
    """
    
    def process_request(self, request):
        """在请求处理前记录开始时间"""
        request._api_start_time = time.time()
        return None
    
    def process_response(self, request, response):
        """处理响应，添加标准化格式"""
        # 只处理API路径的响应
        if not self._is_api_request(request):
            return response
        
        # 只处理JSON响应
        if not isinstance(response, (JsonResponse, Response)):
            return response
        
        # 计算执行时间
        execution_time = None
        if hasattr(request, '_api_start_time'):
            execution_time = round((time.time() - request._api_start_time) * 1000, 2)
        
        # 获取请求ID
        request_id = getattr(request, 'correlation_id', None) or getattr(request, 'META', {}).get('HTTP_X_REQUEST_ID', 'unknown')
        
        try:
            # 解析原始响应数据
            if isinstance(response, JsonResponse):
                original_data = json.loads(response.content.decode('utf-8'))
            else:  # DRF Response
                original_data = response.data
            
            # 检查是否已经是标准格式
            if isinstance(original_data, dict) and 'success' in original_data:
                # 已经是标准格式，只添加元数据
                if 'meta' not in original_data:
                    original_data['meta'] = {}
                
                from datetime import datetime
                original_data['meta'].update({
                    'timestamp': datetime.now().isoformat() + 'Z',
                    'request_id': request_id,
                    'version': '1.0',
                })
                
                if execution_time is not None:
                    original_data['meta']['execution_time_ms'] = execution_time
                
            else:
                # 转换为标准格式
                standardized_data = self._standardize_response(
                    original_data, 
                    response.status_code,
                    request_id,
                    execution_time
                )
                original_data = standardized_data
            
            # 更新响应
            if isinstance(response, JsonResponse):
                response.content = json.dumps(original_data, ensure_ascii=False).encode('utf-8')
            else:  # DRF Response
                response.data = original_data
                
        except Exception as e:
            # 如果标准化失败，记录错误但不影响原响应
            print(f"API response standardization failed: {e}")
        
        return response
    
    def _is_api_request(self, request):
        """判断是否为API请求"""
        path = request.path
        return (
            path.startswith('/api/') or
            path.startswith('/admin/api/') or
            'api' in path
        )
    
    def _standardize_response(self, data, status_code, request_id, execution_time):
        """将响应转换为标准格式"""
        is_success = 200 <= status_code < 300
        
        # 基础响应结构
        from datetime import datetime
        standardized = {
            'success': is_success,
            'message': self._get_default_message(status_code, is_success),
            'meta': {
                'timestamp': datetime.now().isoformat() + 'Z',
                'request_id': request_id,
                'version': '1.0',
            }
        }
        
        if execution_time is not None:
            standardized['meta']['execution_time_ms'] = execution_time
        
        # 处理成功响应
        if is_success:
            # 检查是否为分页响应
            if isinstance(data, dict) and ('results' in data or 'items' in data):
                # 分页响应
                items = data.get('results', data.get('items', []))
                standardized['data'] = items
                
                # 添加分页信息
                if any(key in data for key in ['count', 'total', 'next', 'previous']):
                    standardized['pagination'] = self._extract_pagination_info(data)
            else:
                # 普通数据响应
                standardized['data'] = data
        else:
            # 处理错误响应
            standardized['error'] = self._format_error(data, status_code)
        
        # 添加调试信息（仅开发环境）
        if settings.DEBUG and isinstance(data, dict):
            debug_info = data.get('debug')
            if debug_info:
                standardized['debug'] = debug_info
        
        return standardized
    
    def _get_default_message(self, status_code, is_success):
        """获取默认响应消息"""
        if is_success:
            return 'Success'
        
        error_messages = {
            400: 'Bad Request',
            401: 'Unauthorized',
            403: 'Forbidden',
            404: 'Not Found',
            405: 'Method Not Allowed',
            429: 'Too Many Requests',
            500: 'Internal Server Error',
            502: 'Bad Gateway',
            503: 'Service Unavailable',
            504: 'Gateway Timeout',
        }
        
        return error_messages.get(status_code, f'Error {status_code}')
    
    def _extract_pagination_info(self, data):
        """提取分页信息"""
        pagination = {}
        
        # 处理Django分页器格式
        if 'count' in data:
            pagination['total'] = data['count']
        elif 'total' in data:
            pagination['total'] = data['total']
        
        if 'next' in data:
            pagination['next_cursor'] = data['next']
            pagination['has_next'] = data['next'] is not None
        
        if 'previous' in data:
            pagination['prev_cursor'] = data['previous']
            pagination['has_prev'] = data['previous'] is not None
        
        # 尝试提取页码信息
        if 'page' in data:
            pagination['page'] = data['page']
        if 'page_size' in data:
            pagination['size'] = data['page_size']
        elif 'size' in data:
            pagination['size'] = data['size']
        
        return pagination
    
    def _format_error(self, data, status_code):
        """格式化错误信息"""
        error = {
            'code': f'HTTP_{status_code}',
            'message': str(data) if isinstance(data, str) else 'An error occurred',
        }
        
        # 处理DRF验证错误
        if isinstance(data, dict):
            if 'detail' in data:
                error['message'] = data['detail']
            elif 'error' in data:
                error['message'] = data['error']
            elif 'message' in data:
                error['message'] = data['message']
            
            # 字段验证错误
            field_errors = {}
            for key, value in data.items():
                if key not in ['detail', 'error', 'message'] and isinstance(value, (list, str)):
                    if isinstance(value, list):
                        field_errors[key] = value
                    else:
                        field_errors[key] = [value]
            
            if field_errors:
                error['field_errors'] = field_errors
        
        return error
