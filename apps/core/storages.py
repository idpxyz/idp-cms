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
        
        # 公共访问域名配置
        public_domain = os.getenv("MINIO_PUBLIC_DOMAIN", "localhost:9002")
        self.custom_domain = f"{public_domain}/{self.bucket_name}"
        
        # 公共文件配置
        self.default_acl = None
        self.querystring_auth = False
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
