"""
自定义存储后端类
支持公共和私有媒体文件的分离存储
"""
import os
from storages.backends.s3boto3 import S3Boto3Storage
from django.conf import settings


class PublicMediaStorage(S3Boto3Storage):
    """公共媒体文件存储后端"""
    bucket_name = "idp-media-prod-public"
    default_acl = None
    querystring_auth = False
    file_overwrite = False
    
    def __init__(self, **settings_dict):
        super().__init__(**settings_dict)
        # 使用环境变量配置MinIO连接
        self.access_key = os.getenv("MINIO_ACCESS_KEY")
        self.secret_key = os.getenv("MINIO_SECRET_KEY")
        self.endpoint_url = os.getenv("MINIO_ENDPOINT")
        self.region_name = "us-east-1"
        
        # 公共访问域名配置 - 支持多种访问场景
        public_domain = os.getenv("MINIO_PUBLIC_DOMAIN", "localhost:9002")
        self.custom_domain = f"{public_domain}/{self.bucket_name}"
        
        # 内部访问域名（容器间通信）
        self.internal_domain = f"minio:9000/{self.bucket_name}"
        
        # 公共文件配置
        self.default_acl = None
        self.querystring_auth = False
        self.url_protocol = "http:"
        self.addressing_style = "path"
        self.signature_version = "s3v4"
        self.verify = False
        self.use_ssl = False
    
    def url(self, name):
        """
        生成媒体文件的公共访问URL
        
        使用统一的URL配置管理器，并智能判断请求类型
        """
        from apps.core.url_config import URLConfig
        
        # 智能判断是否应该使用内部URL
        for_internal = self._should_use_internal_url()
        return URLConfig.build_media_proxy_url(name, for_internal=for_internal)
    
    def _should_use_internal_url(self):
        """
        智能判断是否应该使用内部URL
        
        判断逻辑：
        1. 如果是API请求且来自内部服务 → 使用内部URL
        2. 如果是浏览器访问或Admin访问 → 使用外部URL
        3. 默认情况 → 使用外部URL（更安全）
        
        Returns:
            bool: True表示使用内部URL，False表示使用外部URL
        """
        import threading
        
        try:
            # 尝试获取当前请求
            current_request = getattr(threading.current_thread(), 'request', None)
            
            if current_request and hasattr(current_request, 'META'):
                user_agent = current_request.META.get('HTTP_USER_AGENT', '').lower()
                http_host = current_request.META.get('HTTP_HOST', '')
                request_path = getattr(current_request, 'path', '')
                
                # 判断是否为浏览器访问
                is_browser = any(browser in user_agent for browser in [
                    'mozilla', 'chrome', 'safari', 'firefox', 'edge', 'webkit'
                ])
                
                # 判断是否为Admin访问
                is_admin_path = (
                    '/admin' in request_path or 
                    '/cms' in request_path or 
                    request_path.startswith('/admin')
                )
                
                # 判断是否为localhost访问
                is_localhost = 'localhost' in http_host or '127.0.0.1' in http_host
                
                # 决策逻辑：
                # 1. 浏览器访问localhost → 使用外部URL
                # 2. Admin访问 → 使用外部URL  
                # 3. API请求且非localhost → 使用内部URL
                # 4. 其他情况 → 使用外部URL（默认安全策略）
                
                if is_browser and is_localhost:
                    return False  # 浏览器访问localhost，使用外部URL
                elif is_admin_path:
                    return False  # Admin访问，使用外部URL
                elif not is_browser and not is_localhost:
                    return True   # API请求且非localhost，使用内部URL
                else:
                    return False  # 默认使用外部URL
                    
        except Exception:
            # 异常情况下使用外部URL（更安全）
            pass
        
        # 默认使用外部URL
        return False
    
    def internal_url(self, name):
        """生成容器内部访问URL（用于服务间通信）"""
        clean_name = name.lstrip('/')
        return f"http://{self.internal_domain}/{clean_name}"
    
    def get_available_name(self, name, max_length=None):
        """重写文件名生成，使用我们的路径生成器"""
        from apps.core.media_paths import build_media_path
        
        # 如果传入的是完整路径，直接使用
        if '/' in name and name.count('/') >= 5:
            return name
        
        # 否则使用我们的路径生成器
        # 创建一个临时实例来生成路径
        class TempInstance:
            def __init__(self):
                self.collection = None
                # 尝试从文件名推断是否是变体
                if self._is_rendition_filename(name):
                    self.file_category = 'renditions'
                else:
                    self.file_category = 'originals'
                    
            def _is_rendition_filename(self, filename):
                """从文件名判断是否是变体文件"""
                # Wagtail 变体文件名通常包含过滤器信息
                # 例如: image.max-300x250.png, image.fill-100x100.jpg
                import re
                rendition_patterns = [
                    r'\.max-\d+x\d+\.',      # .max-300x250.
                    r'\.min-\d+x\d+\.',      # .min-300x250.
                    r'\.width-\d+\.',        # .width-300.
                    r'\.height-\d+\.',       # .height-250.
                    r'\.fill-\d+x\d+\.',     # .fill-300x250.
                    r'\.original\.',         # .original.
                ]
                
                for pattern in rendition_patterns:
                    if re.search(pattern, filename):
                        return True
                return False
        
        temp_instance = TempInstance()
        return build_media_path(temp_instance, name)


class PrivateMediaStorage(S3Boto3Storage):
    """私有媒体文件存储后端"""
    bucket_name = "idp-media-prod-private"
    default_acl = "private"
    querystring_auth = True
    file_overwrite = False
    
    def __init__(self, **settings_dict):
        super().__init__(**settings_dict)
        # 使用环境变量配置MinIO连接
        self.access_key = os.getenv("MINIO_ACCESS_KEY")
        self.secret_key = os.getenv("MINIO_SECRET_KEY")
        self.endpoint_url = os.getenv("MINIO_ENDPOINT")
        self.region_name = "us-east-1"
        
        # 私有文件配置
        self.default_acl = "private"
        self.querystring_auth = True
        self.url_protocol = "http:"
        self.addressing_style = "path"
        self.signature_version = "s3v4"
        self.verify = False
        self.use_ssl = False
    
    def get_available_name(self, name, max_length=None):
        """重写文件名生成，使用我们的路径生成器"""
        from apps.core.media_paths import build_media_path
        
        # 如果传入的是完整路径，直接使用
        if '/' in name and name.count('/') >= 5:
            return name
        
        # 否则使用我们的路径生成器
        # 创建一个临时实例来生成路径
        class TempInstance:
            def __init__(self):
                self.collection = None
                # 尝试从文件名推断是否是变体
                if self._is_rendition_filename(name):
                    self.file_category = 'renditions'
                else:
                    self.file_category = 'originals'
                    
            def _is_rendition_filename(self, filename):
                """从文件名判断是否是变体文件"""
                # Wagtail 变体文件名通常包含过滤器信息
                # 例如: image.max-300x250.png, image.fill-100x100.jpg
                import re
                rendition_patterns = [
                    r'\.max-\d+x\d+\.',      # .max-300x250.
                    r'\.min-\d+x\d+\.',      # .min-300x250.
                    r'\.width-\d+\.',        # .width-300.
                    r'\.height-\d+\.',       # .height-250.
                    r'\.fill-\d+x\d+\.',     # .fill-300x250.
                    r'\.original\.',         # .original.
                ]
                
                for pattern in rendition_patterns:
                    if re.search(pattern, filename):
                        return True
                return False
        
        temp_instance = TempInstance()
        return build_media_path(temp_instance, name)
