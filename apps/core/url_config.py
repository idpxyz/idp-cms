"""
统一的URL配置管理器
解决地址管理混乱的问题，提供基于环境变量的统一配置
"""
import os
from django.conf import settings


class URLConfig:
    """
    统一的URL配置管理器
    
    核心原则:
    1. 环境变量驱动 - 所有URL通过环境变量配置
    2. 单一配置源 - 统一的URL配置管理
    3. 自动适配 - 根据环境自动选择合适的URL
    4. 简化逻辑 - 移除复杂的请求检测
    """
    
    @classmethod
    def get_media_base_url(cls):
        """
        获取媒体文件的基础URL（用于浏览器访问）
        
        优先级:
        1. MEDIA_BASE_URL 环境变量
        2. DJANGO_BASE_URL 环境变量  
        3. 默认值 http://localhost:8000
        
        Returns:
            str: 媒体文件基础URL
        """
        return (
            os.getenv('MEDIA_BASE_URL') or
            os.getenv('DJANGO_BASE_URL') or
            'http://localhost:8000'
        )
    
    @classmethod
    def get_media_internal_url(cls):
        """
        获取媒体文件的内部URL（用于服务间通信）
        
        优先级:
        1. MEDIA_INTERNAL_URL 环境变量
        2. DJANGO_INTERNAL_URL 环境变量
        3. 默认值 http://authoring:8000
        
        Returns:
            str: 媒体文件内部URL
        """
        return (
            os.getenv('MEDIA_INTERNAL_URL') or
            os.getenv('DJANGO_INTERNAL_URL') or
            'http://authoring:8000'
        )
    
    @classmethod
    def get_media_url(cls, for_internal=False):
        """
        获取媒体文件URL
        
        Args:
            for_internal (bool): 是否用于内部服务间通信
            
        Returns:
            str: 媒体文件URL
        """
        if for_internal:
            return cls.get_media_internal_url()
        else:
            return cls.get_media_base_url()
    
    @classmethod
    def get_django_base_url(cls):
        """
        获取Django服务的基础URL
        
        Returns:
            str: Django基础URL
        """
        return (
            os.getenv('DJANGO_BASE_URL') or
            'http://localhost:8000'
        )
    
    @classmethod
    def get_django_internal_url(cls):
        """
        获取Django服务的内部URL
        
        Returns:
            str: Django内部URL
        """
        return (
            os.getenv('DJANGO_INTERNAL_URL') or
            'http://authoring:8000'
        )
    
    @classmethod
    def get_frontend_base_url(cls):
        """
        获取前端服务的基础URL
        
        Returns:
            str: 前端基础URL
        """
        return (
            os.getenv('FRONTEND_BASE_URL') or
            'http://localhost:3000'
        )
    
    @classmethod
    def build_media_proxy_url(cls, file_path, for_internal=False):
        """
        构建媒体代理URL
        
        Args:
            file_path (str): 文件路径
            for_internal (bool): 是否用于内部通信
            
        Returns:
            str: 完整的媒体代理URL
        """
        base_url = cls.get_media_url(for_internal=for_internal)
        clean_path = file_path.lstrip('/')
        return f"{base_url.rstrip('/')}/api/media/proxy/{clean_path}"
    
    @classmethod
    def get_config_summary(cls):
        """
        获取当前配置摘要（用于调试）
        
        Returns:
            dict: 配置摘要
        """
        return {
            'media_base_url': cls.get_media_base_url(),
            'media_internal_url': cls.get_media_internal_url(),
            'django_base_url': cls.get_django_base_url(),
            'django_internal_url': cls.get_django_internal_url(),
            'frontend_base_url': cls.get_frontend_base_url(),
        }


# 便捷的函数接口
def get_media_url(for_internal=False):
    """便捷函数：获取媒体URL"""
    return URLConfig.get_media_url(for_internal=for_internal)


def build_media_proxy_url(file_path, for_internal=False):
    """便捷函数：构建媒体代理URL"""
    return URLConfig.build_media_proxy_url(file_path, for_internal=for_internal)
