"""
CDN管理器

提供统一的CDN操作接口，包括缓存管理、性能监控、健康检查等
"""

from typing import Dict, List, Any, Optional
from django.core.cache import cache
from django.utils import timezone
from .factory import CDNFactory
from apps.core.models import SiteCDNConfig, CDNProvider


class CDNManager:
    """CDN管理器"""
    
    def __init__(self):
        self.cache_timeout = 300  # 5分钟缓存
    
    def get_site_cdn_config(self, site_hostname: str) -> Optional[SiteCDNConfig]:
        """
        获取站点的CDN配置
        
        Args:
            site_hostname: 站点主机名
            
        Returns:
            SiteCDNConfig: CDN配置对象，如果不存在则返回None
        """
        cache_key = f"cdn_config:{site_hostname}"
        
        # 尝试从缓存获取
        cdn_config = cache.get(cache_key)
        if cdn_config:
            return cdn_config
        
        try:
            # 从数据库获取
            cdn_config = SiteCDNConfig.objects.select_related(
                'site', 'cdn_provider'
            ).get(site__hostname=site_hostname, is_active=True)
            
            # 缓存结果
            cache.set(cache_key, cdn_config, self.cache_timeout)
            return cdn_config
            
        except SiteCDNConfig.DoesNotExist:
            return None
    
    def create_cdn_provider(self, site_hostname: str) -> Optional[Any]:
        """
        为指定站点创建CDN服务提供商实例
        
        Args:
            site_hostname: 站点主机名
            
        Returns:
            BaseCDNProvider: CDN服务提供商实例，如果配置不存在则返回None
        """
        cdn_config = self.get_site_cdn_config(site_hostname)
        if not cdn_config:
            return None
        
        try:
            # 创建CDN服务提供商实例
            provider = CDNFactory.create_provider(
                cdn_config.cdn_provider.provider_type,
                {
                    'api_key': cdn_config.cdn_provider.api_key,
                    'api_secret': cdn_config.cdn_provider.api_secret,
                    'endpoint_url': cdn_config.cdn_provider.endpoint_url,
                    'domain': cdn_config.cdn_domain,
                    'provider_type': cdn_config.cdn_provider.provider_type,
                }
            )
            
            return provider
            
        except Exception as e:
            print(f"Failed to create CDN provider for {site_hostname}: {e}")
            return None
    
    def purge_site_cache(self, site_hostname: str, urls: List[str]) -> Dict[str, Any]:
        """
        清除站点CDN缓存
        
        Args:
            site_hostname: 站点主机名
            urls: 需要清除缓存的URL列表
            
        Returns:
            Dict: 操作结果
        """
        try:
            provider = self.create_cdn_provider(site_hostname)
            if not provider:
                return {
                    'success': False,
                    'error': 'CDN provider not found or not configured',
                    'site': site_hostname
                }
            
            # 清除缓存
            success = provider.purge_cache(urls)
            
            if success:
                # 更新最后清除时间
                cdn_config = self.get_site_cdn_config(site_hostname)
                if cdn_config:
                    cdn_config.last_cache_purge = timezone.now()
                    cdn_config.save()
                
                # 清除配置缓存
                cache.delete(f"cdn_config:{site_hostname}")
                
                return {
                    'success': True,
                    'message': 'Cache purge initiated successfully',
                    'site': site_hostname,
                    'urls': urls,
                    'provider': provider.__class__.__name__,
                    'timestamp': timezone.now().isoformat()
                }
            else:
                return {
                    'success': False,
                    'error': 'Failed to purge cache',
                    'site': site_hostname,
                    'urls': urls
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Cache purge failed: {str(e)}',
                'site': site_hostname,
                'urls': urls
            }
    
    def get_site_performance_metrics(self, site_hostname: str) -> Dict[str, Any]:
        """
        获取站点CDN性能指标
        
        Args:
            site_hostname: 站点主机名
            
        Returns:
            Dict: 性能指标数据
        """
        try:
            provider = self.create_cdn_provider(site_hostname)
            if not provider:
                return {
                    'success': False,
                    'error': 'CDN provider not found or not configured',
                    'site': site_hostname
                }
            
            # 获取性能指标
            metrics = provider.get_performance_metrics()
            
            # 更新缓存命中率
            cdn_config = self.get_site_cdn_config(site_hostname)
            if cdn_config and metrics.get('success'):
                # 这里可以根据实际指标计算缓存命中率
                # 暂时使用默认值
                cdn_config.cache_hit_rate = 85.0  # 示例值
                cdn_config.save()
            
            return {
                'success': True,
                'site': site_hostname,
                'metrics': metrics,
                'timestamp': timezone.now().isoformat()
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Failed to get performance metrics: {str(e)}',
                'site': site_hostname
            }
    
    def get_site_health_status(self, site_hostname: str) -> Dict[str, Any]:
        """
        获取站点CDN健康状态
        
        Args:
            site_hostname: 站点主机名
            
        Returns:
            Dict: 健康状态信息
        """
        try:
            provider = self.create_cdn_provider(site_hostname)
            if not provider:
                return {
                    'success': False,
                    'error': 'CDN provider not found or not configured',
                    'site': site_hostname,
                    'status': 'unknown'
                }
            
            # 获取健康状态
            health_status = provider.get_health_status()
            
            return {
                'success': True,
                'site': site_hostname,
                'health': health_status,
                'timestamp': timezone.now().isoformat()
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Failed to get health status: {str(e)}',
                'site': site_hostname,
                'status': 'error'
            }
    
    def get_all_sites_cdn_status(self) -> List[Dict[str, Any]]:
        """
        获取所有站点的CDN状态
        
        Returns:
            List: 所有站点的CDN状态列表
        """
        sites_status = []
        
        try:
            # 获取所有启用的CDN配置
            cdn_configs = SiteCDNConfig.objects.filter(
                is_active=True
            ).select_related('site', 'cdn_provider')
            
            for cdn_config in cdn_configs:
                try:
                    # 创建CDN服务提供商实例
                    provider = CDNFactory.create_provider(
                        cdn_config.cdn_provider.provider_type,
                        {
                            'api_key': cdn_config.cdn_provider.api_key,
                            'api_secret': cdn_config.cdn_provider.api_secret,
                            'endpoint_url': cdn_config.cdn_provider.endpoint_url,
                            'domain': cdn_config.cdn_domain,
                            'provider_type': cdn_config.cdn_provider.provider_type,
                        }
                    )
                    
                    # 获取健康状态
                    health_status = provider.get_health_status()
                    
                    sites_status.append({
                        'site': cdn_config.site.hostname,
                        'site_name': cdn_config.site.site_name,
                        'cdn_provider': cdn_config.cdn_provider.name,
                        'cdn_type': cdn_config.cdn_provider.provider_type,
                        'cdn_domain': cdn_config.cdn_domain,
                        'cache_strategy': cdn_config.cache_strategy,
                        'is_active': cdn_config.is_active,
                        'last_cache_purge': cdn_config.last_cache_purge.isoformat() if cdn_config.last_cache_purge else None,
                        'cache_hit_rate': cdn_config.cache_hit_rate,
                        'health_status': health_status,
                        'regions': [r.name for r in cdn_config.regions.all()],
                    })
                    
                except Exception as e:
                    sites_status.append({
                        'site': cdn_config.site.hostname,
                        'site_name': cdn_config.site.site_name,
                        'cdn_provider': cdn_config.cdn_provider.name,
                        'cdn_type': cdn_config.cdn_provider.provider_type,
                        'cdn_domain': cdn_config.cdn_domain,
                        'error': str(e),
                        'health_status': 'error'
                    })
            
        except Exception as e:
            print(f"Failed to get all sites CDN status: {e}")
        
        return sites_status
    
    def validate_cdn_config(self, site_hostname: str) -> Dict[str, Any]:
        """
        验证站点CDN配置
        
        Args:
            site_hostname: 站点主机名
            
        Returns:
            Dict: 验证结果
        """
        try:
            provider = self.create_cdn_provider(site_hostname)
            if not provider:
                return {
                    'success': False,
                    'error': 'CDN provider not found or not configured',
                    'site': site_hostname
                }
            
            # 验证配置
            config_valid = provider.validate_config()
            
            # 获取提供商信息
            provider_info = provider.get_provider_info()
            
            return {
                'success': True,
                'site': site_hostname,
                'config_valid': config_valid,
                'provider_info': provider_info,
                'timestamp': timezone.now().isoformat()
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Failed to validate CDN config: {str(e)}',
                'site': site_hostname
            }
