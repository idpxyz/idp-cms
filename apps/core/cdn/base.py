"""
CDN服务提供商抽象基类

定义所有CDN服务提供商必须实现的接口
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any
from django.conf import settings


class BaseCDNProvider(ABC):
    """CDN服务提供商抽象基类"""
    
    def __init__(self, config: Dict[str, Any]):
        """
        初始化CDN服务提供商
        
        Args:
            config: 配置字典，包含API密钥、端点等信息
        """
        self.config = config
        self.api_key = config.get('api_key')
        self.api_secret = config.get('api_secret')
        self.endpoint_url = config.get('endpoint_url')
        self.domain = config.get('domain')
        
        # 验证必要配置
        if not all([self.api_key, self.api_secret, self.endpoint_url]):
            raise ValueError("Missing required CDN configuration: api_key, api_secret, endpoint_url")
    
    @abstractmethod
    def purge_cache(self, urls: List[str]) -> bool:
        """
        清除CDN缓存
        
        Args:
            urls: 需要清除缓存的URL列表
            
        Returns:
            bool: 是否成功清除缓存
        """
        pass
    
    @abstractmethod
    def get_cache_status(self, url: str) -> Dict[str, Any]:
        """
        获取缓存状态
        
        Args:
            url: 要检查的URL
            
        Returns:
            Dict: 缓存状态信息
        """
        pass
    
    @abstractmethod
    def get_performance_metrics(self) -> Dict[str, Any]:
        """
        获取性能指标
        
        Returns:
            Dict: 性能指标数据
        """
        pass
    
    def update_cache_headers(self, url: str, headers: Dict[str, str]) -> bool:
        """
        更新缓存头（可选实现）
        
        Args:
            url: 要更新的URL
            headers: 新的缓存头
            
        Returns:
            bool: 是否成功更新
        """
        # 默认实现，子类可以重写
        return True
    
    def get_health_status(self) -> Dict[str, Any]:
        """
        获取健康状态
        
        Returns:
            Dict: 健康状态信息
        """
        try:
            # 尝试获取性能指标来检查连接
            metrics = self.get_performance_metrics()
            return {
                'status': 'healthy',
                'provider': self.__class__.__name__,
                'domain': self.domain,
                'last_check': metrics.get('timestamp'),
                'metrics_available': bool(metrics)
            }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'provider': self.__class__.__name__,
                'domain': self.domain,
                'error': str(e),
                'last_check': None
            }
    
    def validate_config(self) -> bool:
        """
        验证配置是否有效
        
        Returns:
            bool: 配置是否有效
        """
        try:
            # 尝试连接API
            self.get_performance_metrics()
            return True
        except Exception:
            return False
    
    def get_provider_info(self) -> Dict[str, Any]:
        """
        获取提供商信息
        
        Returns:
            Dict: 提供商信息
        """
        return {
            'name': self.__class__.__name__,
            'type': self.config.get('provider_type', 'unknown'),
            'domain': self.domain,
            'endpoint': self.endpoint_url,
            'config_valid': self.validate_config(),
            'health_status': self.get_health_status()
        }
