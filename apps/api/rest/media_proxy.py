"""
媒体文件代理视图
解决浏览器访问MinIO时的网络连接问题
"""
import requests
from django.http import HttpResponse, Http404
from django.views.decorators.http import require_http_methods
from django.views.decorators.cache import cache_control
from django.conf import settings
import os


@require_http_methods(["GET", "HEAD"])
@cache_control(max_age=3600, public=True)  # 缓存1小时
def media_proxy(request, file_path):
    """
    代理访问MinIO中的媒体文件
    
    URL格式: /api/media/proxy/{file_path}
    实际访问: http://minio:9000/idp-media-prod-public/{file_path}
    """
    try:
        # 清理文件路径 - 移除可能存在的 aivoya/ 前缀以保持路径一致性
        clean_file_path = file_path
        if file_path.startswith('aivoya/'):
            clean_file_path = file_path[7:]  # 移除 'aivoya/' 前缀
        
        # 构建内部MinIO访问URL
        minio_url = f"http://minio:9000/idp-media-prod-public/{clean_file_path}"
        
        # 添加调试日志
        import logging
        logger = logging.getLogger(__name__)
        
        # 记录请求详情帮助追踪来源
        user_agent = request.META.get('HTTP_USER_AGENT', 'Unknown')
        referer = request.META.get('HTTP_REFERER', 'No Referer')
        remote_addr = request.META.get('REMOTE_ADDR', 'Unknown IP')
        
        logger.info(f"媒体代理请求: {file_path}")
        logger.info(f"  -> MinIO URL: {minio_url}")
        logger.info(f"  -> User-Agent: {user_agent}")
        logger.info(f"  -> Referer: {referer}")
        logger.info(f"  -> Remote IP: {remote_addr}")
        
        # 从MinIO获取文件
        response = requests.get(minio_url, stream=True, timeout=10)
        
        logger.info(f"MinIO响应: {response.status_code}")
        
        if response.status_code == 404:
            logger.warning(f"文件不存在: {file_path}")
            raise Http404("媒体文件不存在")
        elif response.status_code != 200:
            logger.warning(f"访问失败: {response.status_code} for {file_path}")
            raise Http404("媒体文件访问失败")
        
        # 创建代理响应
        content_type = response.headers.get('content-type', 'application/octet-stream')
        proxy_response = HttpResponse(
            response.content,
            content_type=content_type
        )
        
        # 设置缓存头
        if 'etag' in response.headers:
            proxy_response['ETag'] = response.headers['etag']
        if 'last-modified' in response.headers:
            proxy_response['Last-Modified'] = response.headers['last-modified']
        if 'content-length' in response.headers:
            proxy_response['Content-Length'] = response.headers['content-length']
            
        # 设置CORS头
        proxy_response['Access-Control-Allow-Origin'] = '*'
        proxy_response['Access-Control-Allow-Methods'] = 'GET, HEAD'
        proxy_response['Access-Control-Allow-Headers'] = 'Content-Type'
        
        return proxy_response
        
    except requests.exceptions.RequestException as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"网络请求失败: {e}")
        raise Http404("媒体文件访问失败")
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"媒体代理处理错误: {e}")
        raise Http404("媒体文件处理错误")
