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
        """生成正确的公共访问URL"""
        # 使用Django媒体代理而不是直接访问MinIO
        # 这解决了浏览器访问MinIO时的网络连接问题
        clean_name = name.lstrip('/')
        from django.urls import reverse
        from django.conf import settings
        
        # 获取Django服务的基础URL
        # 优先使用容器内可访问的地址用于Next.js图片优化
        base_url = getattr(settings, 'WAGTAILADMIN_BASE_URL', 'http://authoring:8000')
        base_url = base_url.rstrip('/')
        
        # 使用媒体代理URL
        return f"{base_url}/api/media/proxy/{clean_name}"
    
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
