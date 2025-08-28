"""
CDN服务提供商工厂类

负责创建和管理不同CDN服务提供商的实例
"""

from typing import Dict, Any, Type
from .base import BaseCDNProvider


class CDNFactory:
    """CDN服务提供商工厂类"""
    
    # 注册的CDN提供商类
    _providers: Dict[str, Type[BaseCDNProvider]] = {}
    
    @classmethod
    def register_provider(cls, provider_type: str, provider_class: Type[BaseCDNProvider]):
        """
        注册CDN服务提供商
        
        Args:
            provider_type: 提供商类型标识
            provider_class: 提供商类
        """
        cls._providers[provider_type] = provider_class
    
    @classmethod
    def create_provider(cls, provider_type: str, config: Dict[str, Any]) -> BaseCDNProvider:
        """
        创建CDN服务提供商实例
        
        Args:
            provider_type: 提供商类型
            config: 配置信息
            
        Returns:
            BaseCDNProvider: CDN服务提供商实例
            
        Raises:
            ValueError: 不支持的提供商类型
        """
        if provider_type not in cls._providers:
            raise ValueError(f"Unsupported CDN provider type: {provider_type}")
        
        provider_class = cls._providers[provider_type]
        return provider_class(config)
    
    @classmethod
    def get_supported_providers(cls) -> list:
        """
        获取支持的CDN提供商类型列表
        
        Returns:
            list: 支持的提供商类型列表
        """
        return list(cls._providers.keys())
    
    @classmethod
    def is_provider_supported(cls, provider_type: str) -> bool:
        """
        检查是否支持指定的CDN提供商类型
        
        Args:
            provider_type: 提供商类型
            
        Returns:
            bool: 是否支持
        """
        return provider_type in cls._providers


# 注册内置的CDN提供商
def register_builtin_providers():
    """注册内置的CDN提供商"""
    try:
        # 阿里云CDN
        from .aliyun import AliyunCDNProvider
        CDNFactory.register_provider('aliyun', AliyunCDNProvider)
    except ImportError:
        pass
    
    try:
        # 腾讯云CDN
        from .tencent import TencentCDNProvider
        CDNFactory.register_provider('tencent', TencentCDNProvider)
    except ImportError:
        pass
    
    try:
        # 百度云CDN
        from .baidu import BaiduCDNProvider
        CDNFactory.register_provider('baidu', BaiduCDNProvider)
    except ImportError:
        pass
    
    try:
        # Cloudflare
        from .cloudflare import CloudflareCDNProvider
        CDNFactory.register_provider('cloudflare', CloudflareCDNProvider)
    except ImportError:
        pass
    
    try:
        # AWS CloudFront
        from .aws import AWSCloudFrontProvider
        CDNFactory.register_provider('aws', AWSCloudFrontProvider)
    except ImportError:
        pass
    
    try:
        # Azure CDN
        from .azure import AzureCDNProvider
        CDNFactory.register_provider('azure', AzureCDNProvider)
    except ImportError:
        pass


# 在模块导入时注册内置提供商
register_builtin_providers()
