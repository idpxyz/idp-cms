"""
统一的站点配置管理系统

这个模块提供了一个中心化的站点配置管理框架，支持：
- 层级化配置（全局 → 站点 → 用户）
- 动态配置加载和缓存
- 配置验证和类型安全
- 环境变量覆盖
- 热重载支持
"""

import os
import json
import re
from typing import Dict, Any, Optional, Union, List, TypeVar, Generic
from dataclasses import dataclass, field, asdict
from django.core.cache import cache
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

T = TypeVar('T')

@dataclass
class SiteFeatures:
    """站点功能特性配置"""
    recommendation: bool = True
    search_enabled: bool = True
    analytics_enabled: bool = True
    comments_enabled: bool = False
    user_registration: bool = True
    social_login: bool = False
    content_moderation: bool = False
    api_access: bool = True
    rss_feed: bool = True
    sitemap: bool = True

@dataclass
class SitePerformance:
    """站点性能配置"""
    cache_timeout: int = 300  # 5分钟
    max_articles_per_page: int = 20
    max_search_results: int = 100
    api_rate_limit: int = 1000  # 每小时
    image_compression: bool = True
    cdn_enabled: bool = False
    lazy_loading: bool = True

@dataclass
class SiteContent:
    """站点内容配置"""
    default_language: str = "zh"
    supported_languages: List[str] = field(default_factory=lambda: ["zh", "en"])
    timezone: str = "Asia/Shanghai"
    date_format: str = "%Y-%m-%d"
    content_retention_days: int = 365
    auto_publish: bool = False
    content_approval_required: bool = False
    allow_aggregate: bool = True

@dataclass
class SiteUI:
    """站点UI配置"""
    theme: str = "default"
    primary_color: str = "#3B82F6"  # blue-500
    secondary_color: str = "#6B7280"  # gray-500
    font_family: str = "Inter, sans-serif"
    logo_url: str = ""
    favicon_url: str = ""
    show_breadcrumbs: bool = True
    show_reading_time: bool = True
    dark_mode_enabled: bool = True

@dataclass
class SiteAnalytics:
    """站点分析配置"""
    google_analytics_id: str = ""
    baidu_analytics_id: str = ""
    track_user_behavior: bool = True
    track_performance: bool = True
    retention_days: int = 90
    export_enabled: bool = True

@dataclass
class SiteSEO:
    """站点SEO配置"""
    default_title: str = ""
    default_description: str = ""
    default_keywords: str = ""
    robots_txt_enabled: bool = True
    sitemap: bool = True
    structured_data: bool = True
    social_meta_tags: bool = True

@dataclass
class SiteConfig:
    """完整的站点配置"""
    site_id: str
    site_name: str
    site_url: str = ""
    description: str = ""
    
    # 功能配置
    features: SiteFeatures = field(default_factory=SiteFeatures)
    performance: SitePerformance = field(default_factory=SitePerformance)
    content: SiteContent = field(default_factory=SiteContent)
    ui: SiteUI = field(default_factory=SiteUI)
    analytics: SiteAnalytics = field(default_factory=SiteAnalytics)
    seo: SiteSEO = field(default_factory=SiteSEO)
    
    # 自定义配置
    custom: Dict[str, Any] = field(default_factory=dict)
    
    # 元数据
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    version: str = "1.0"

class ConfigLoader:
    """配置加载器 - 基于数据库"""
    
    def load_from_database(self, site_id: str) -> Optional[Dict[str, Any]]:
        """从数据库加载配置"""
        try:
            from wagtail.models import Site
            from .models import SiteSettings
            
            site = Site.objects.get(hostname=site_id)
            settings = SiteSettings.get_for_site(site)
            return self._serialize_settings(settings)
        except Site.DoesNotExist:
            logger.warning(f"Site {site_id} not found in database")
            return None
        except Exception as e:
            logger.error(f"Failed to load config from database for {site_id}: {e}")
            return None
    
    def _serialize_settings(self, settings) -> Dict[str, Any]:
        """将SiteSettings对象序列化为字典"""
        # 基础信息
        config = {
            'site_id': settings.site.hostname,
            'site_name': settings.site.site_name,
            'site_url': f"http{'s' if settings.is_production_site else ''}://{settings.site.hostname}",
            'description': settings.brand_description or f"{settings.site.site_name} 站点配置",
        }
        
        # 功能特性
        config['features'] = {
            'recommendation': settings.recommendation,
            'search_enabled': settings.search_enabled,
            'analytics_enabled': settings.track_user_behavior,
            'comments_enabled': settings.comments_enabled,
            'user_registration': settings.user_registration,
            'social_login': settings.social_login,
            'content_moderation': settings.content_moderation,
            'api_access': settings.api_access,
            'rss_feed': settings.rss_feed,
            'sitemap': settings.sitemap,
        }
        
        # 性能配置
        config['performance'] = {
            'cache_timeout': settings.cache_timeout,
            'max_articles_per_page': settings.max_articles_per_page,
            'max_search_results': settings.max_search_results,
            'api_rate_limit': settings.api_rate_limit,
            'image_compression': settings.image_compression,
            'cdn_enabled': settings.cdn_enabled,
            'lazy_loading': settings.lazy_loading,
        }
        
        # 内容配置
        config['content'] = {
            'default_language': settings.default_language,
            'supported_languages': settings.supported_languages,
            'timezone': settings.timezone,
            'date_format': settings.date_format,
            'content_retention_days': settings.content_retention_days,
            'auto_publish': settings.auto_publish,
            'content_approval_required': settings.content_approval_required,
        }
        
        # UI配置
        config['ui'] = {
            'theme': settings.theme,
            'primary_color': settings.primary_color,
            'secondary_color': settings.secondary_color,
            'font_family': settings.font_family,
            'logo_url': settings.logo_url,
            'favicon_url': settings.favicon_url,
            'show_breadcrumbs': settings.show_breadcrumbs,
            'show_reading_time': settings.show_reading_time,
            'dark_mode_enabled': settings.dark_mode_enabled,
        }
        
        # 分析配置
        config['analytics'] = {
            'google_analytics_id': settings.google_analytics_id,
            'baidu_analytics_id': settings.baidu_analytics_id,
            'track_user_behavior': settings.track_user_behavior,
            'track_performance': settings.track_performance,
            'retention_days': settings.retention_days,
            'export_enabled': settings.export_enabled,
        }
        
        # SEO配置
        config['seo'] = {
            # 站点级SEO
            'site_title': settings.site_title or settings.site.site_name,
            'site_description': settings.site_description or settings.brand_description,
            'site_keywords': getattr(settings, 'site_keywords', ''),
            
            # 页面级SEO模板
            'page_title_template': getattr(settings, 'page_title_template', '{title} - {site_name}'),
            'page_description_template': getattr(settings, 'page_description_template', ''),
            'auto_seo_enabled': getattr(settings, 'auto_seo_enabled', True),
            
            # SEO功能
            'robots_txt_enabled': settings.robots_txt_enabled,
            'sitemap': settings.sitemap,
            'structured_data': settings.structured_data,
            'social_meta_tags': settings.social_meta_tags,
        }
        
        # 自定义配置
        config['custom'] = {
            'debug_mode': not settings.is_production_site,
            'show_debug_info': not settings.is_production_site,
            'enable_hot_reload': not settings.is_production_site,
            'log_level': "DEBUG" if not settings.is_production_site else "INFO",
            'region': settings.region,
            'region_order': settings.region_order,
        }
        
        # 元数据
        config['created_at'] = settings.created_at.isoformat()
        config['updated_at'] = settings.updated_at.isoformat()
        config['version'] = "2.0"  # 数据库版本
        
        return config
        
    def save_to_database(self, site_id: str, config: Dict[str, Any]) -> bool:
        """保存配置到数据库"""
        try:
            from wagtail.models import Site
            from .models import SiteSettings
            
            site = Site.objects.get(hostname=site_id)
            settings, created = SiteSettings.objects.get_or_create(site=site)
            
            # 更新配置字段
            self._update_settings_from_config(settings, config)
            settings.save()
            
            logger.info(f"Saved config to database for {site_id}")
            return True
        except Site.DoesNotExist:
            logger.error(f"Site {site_id} not found in database")
            return False
        except Exception as e:
            logger.error(f"Failed to save config to database for {site_id}: {e}")
            return False
    
    def _update_settings_from_config(self, settings, config: Dict[str, Any]):
        """从配置字典更新SiteSettings对象"""
        # 功能特性
        if 'features' in config:
            features = config['features']
            settings.recommendation = features.get('recommendation', True)
            settings.search_enabled = features.get('search_enabled', True)
            settings.comments_enabled = features.get('comments_enabled', False)
            settings.user_registration = features.get('user_registration', True)
            settings.social_login = features.get('social_login', False)
            settings.content_moderation = features.get('content_moderation', False)
            settings.api_access = features.get('api_access', True)
            settings.rss_feed = features.get('rss_feed', True)
            settings.sitemap = features.get('sitemap', True)
        
        # 性能配置
        if 'performance' in config:
            performance = config['performance']
            settings.cache_timeout = performance.get('cache_timeout', 300)
            settings.max_articles_per_page = performance.get('max_articles_per_page', 20)
            settings.max_search_results = performance.get('max_search_results', 100)
            settings.api_rate_limit = performance.get('api_rate_limit', 1000)
            settings.image_compression = performance.get('image_compression', True)
            settings.cdn_enabled = performance.get('cdn_enabled', False)
            settings.lazy_loading = performance.get('lazy_loading', True)
        
        # UI配置
        if 'ui' in config:
            ui = config['ui']
            settings.theme = ui.get('theme', 'default')
            settings.primary_color = ui.get('primary_color', '#3B82F6')
            settings.secondary_color = ui.get('secondary_color', '#6B7280')
            settings.font_family = ui.get('font_family', 'Inter, sans-serif')
            settings.logo_url = ui.get('logo_url', '')
            settings.favicon_url = ui.get('favicon_url', '')
            settings.show_breadcrumbs = ui.get('show_breadcrumbs', True)
            settings.show_reading_time = ui.get('show_reading_time', True)
            settings.dark_mode_enabled = ui.get('dark_mode_enabled', True)
        
        # SEO配置
        if 'seo' in config:
            seo = config['seo']
            settings.default_title = seo.get('default_title', '')
            settings.default_description = seo.get('default_description', '')
            settings.default_keywords = seo.get('default_keywords', '')
            settings.robots_txt_enabled = seo.get('robots_txt_enabled', True)
            settings.structured_data = seo.get('structured_data', True)
            settings.social_meta_tags = seo.get('social_meta_tags', True)
        
        # 分析配置
        if 'analytics' in config:
            analytics = config['analytics']
            settings.google_analytics_id = analytics.get('google_analytics_id', '')
            settings.baidu_analytics_id = analytics.get('baidu_analytics_id', '')
            settings.track_user_behavior = analytics.get('track_user_behavior', True)
            settings.track_performance = analytics.get('track_performance', True)
            settings.retention_days = analytics.get('retention_days', 90)
            settings.export_enabled = analytics.get('export_enabled', True)
        
        # 内容配置
        if 'content' in config:
            content = config['content']
            settings.default_language = content.get('default_language', 'zh')
            settings.supported_languages = content.get('supported_languages', ['zh', 'en'])
            settings.timezone = content.get('timezone', 'Asia/Shanghai')
            settings.date_format = content.get('date_format', '%Y-%m-%d')
            settings.content_retention_days = content.get('content_retention_days', 365)
            settings.auto_publish = content.get('auto_publish', False)
            settings.content_approval_required = content.get('content_approval_required', False)
            settings.allow_aggregate = content.get('allow_aggregate', True)
        
        # 自定义配置
        if 'custom' in config:
            custom = config['custom']
            settings.region = custom.get('region', '')
            settings.region_order = custom.get('region_order', 0)

class SiteConfigManager:
    """站点配置管理器"""
    
    def __init__(self):
        self.loader = ConfigLoader()
        self._cache_prefix = "site_config"
        self._cache_timeout = 300  # 5分钟
        
    def get_config(self, site_id: str, use_cache: bool = True) -> SiteConfig:
        """获取站点配置"""
        cache_key = f"{self._cache_prefix}:{site_id}"
        
        if use_cache:
            cached_config = cache.get(cache_key)
            if cached_config:
                return cached_config
        
        # 加载配置
        config_data = self._load_site_config(site_id)
        config = self._create_site_config(site_id, config_data)
        
        # 缓存配置
        if use_cache:
            cache.set(cache_key, config, self._cache_timeout)
            
        return config
    
    def update_config(self, site_id: str, updates: Dict[str, Any]) -> bool:
        """更新站点配置"""
        try:
            # 获取当前配置
            current_config = self.get_config(site_id, use_cache=False)
            config_dict = asdict(current_config)
            
            # 应用更新
            config_dict = self._deep_update(config_dict, updates)
            config_dict['updated_at'] = self._get_current_timestamp()
            
            # 验证配置
            if not self._validate_config(config_dict):
                return False
            
            # 保存到数据库
            if self.loader.save_to_database(site_id, config_dict):
                # 清除缓存
                cache_key = f"{self._cache_prefix}:{site_id}"
                cache.delete(cache_key)
                logger.info(f"Updated config in database for site: {site_id}")
                return True
            else:
                logger.error(f"Failed to save config to database for site: {site_id}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to update config for {site_id}: {e}")
            
        return False
    
    def create_config(self, site_id: str, config_data: Optional[Dict[str, Any]] = None) -> SiteConfig:
        """创建新的站点配置"""
        config_data = config_data or {}
        config_data.update({
            'site_id': site_id,
            'created_at': self._get_current_timestamp(),
            'updated_at': self._get_current_timestamp()
        })
        
        config = self._create_site_config(site_id, config_data)
        
        # 保存到数据库
        if self.loader.save_to_database(site_id, asdict(config)):
            logger.info(f"Created config in database for site: {site_id}")
        else:
            logger.error(f"Failed to create config in database for site: {site_id}")
        
        return config
    
    def delete_config(self, site_id: str) -> bool:
        """删除站点配置"""
        try:
            from .models import SiteSettings
            from wagtail.models import Site
            
            site = Site.objects.get(hostname=site_id)
            settings = SiteSettings.objects.get(site=site)
            settings.delete()
            
            # 清除缓存
            cache_key = f"{self._cache_prefix}:{site_id}"
            cache.delete(cache_key)
            
            logger.info(f"Deleted config for site: {site_id}")
            return True
            
        except Site.DoesNotExist:
            logger.error(f"Site {site_id} not found")
            return False
        except SiteSettings.DoesNotExist:
            logger.error(f"SiteSettings for {site_id} not found")
            return False
        except Exception as e:
            logger.error(f"Failed to delete config for {site_id}: {e}")
            return False
    
    def get_all_configs(self) -> Dict[str, SiteConfig]:
        """获取所有站点的配置"""
        try:
            from wagtail.models import Site
            from .models import SiteSettings
            
            configs = {}
            sites = Site.objects.all()
            
            for site in sites:
                try:
                    config = self.get_config(site.hostname, use_cache=False)
                    configs[site.hostname] = config
                except Exception as e:
                    logger.error(f"Failed to load config for {site.hostname}: {e}")
                    continue
            
            return configs
            
        except Exception as e:
            logger.error(f"Failed to get all configs: {e}")
            return {}
    
    def list_sites(self) -> List[str]:
        """列出所有可用的站点ID"""
        try:
            from wagtail.models import Site
            return list(Site.objects.values_list('hostname', flat=True))
        except Exception as e:
            logger.error(f"Failed to list sites: {e}")
            return []
    
    def _load_site_config(self, site_id: str) -> Dict[str, Any]:
        """加载站点配置数据"""
        # 从数据库加载配置
        config_data = self.loader.load_from_database(site_id) or {}
        
        if config_data:
            logger.info(f"Loaded config from database for {site_id}")
        else:
            logger.warning(f"No config found in database for {site_id}")
        
        # 应用环境变量覆盖
        env_overrides = self._get_env_overrides(site_id)
        config_data = self._deep_update(config_data, env_overrides)
        
        # 应用默认值
        default_config = self._get_default_config(site_id)
        config_data = self._deep_update(default_config, config_data)
        
        return config_data
    
    def _create_site_config(self, site_id: str, config_data: Dict[str, Any]) -> SiteConfig:
        """创建SiteConfig对象"""
        try:
            # 确保必需字段存在
            config_data.setdefault('site_id', site_id)
            config_data.setdefault('site_name', site_id.replace('_', ' ').title())
            
            # 创建嵌套对象
            features_data = config_data.pop('features', {})
            performance_data = config_data.pop('performance', {})
            content_data = config_data.pop('content', {})
            ui_data = config_data.pop('ui', {})
            analytics_data = config_data.pop('analytics', {})
            seo_data = config_data.pop('seo', {})
            
            return SiteConfig(
                **config_data,
                features=SiteFeatures(**features_data),
                performance=SitePerformance(**performance_data),
                content=SiteContent(**content_data),
                ui=SiteUI(**ui_data),
                analytics=SiteAnalytics(**analytics_data),
                seo=SiteSEO(**seo_data)
            )
            
        except Exception as e:
            logger.error(f"Failed to create SiteConfig for {site_id}: {e}")
            # 返回默认配置
            return SiteConfig(site_id=site_id, site_name=site_id.replace('_', ' ').title())
    
    def _get_default_config(self, site_id: str) -> Dict[str, Any]:
        """获取默认配置"""
        return {
            'site_id': site_id,
            'site_name': site_id.replace('_', ' ').title(),
            'site_url': f"http://{site_id}",
            'description': f"Site {site_id}",
        }
    
    def _get_env_overrides(self, site_id: str) -> Dict[str, Any]:
        """从环境变量获取配置覆盖"""
        overrides = {}
        
        # 支持的环境变量格式：SITE_{SITE_ID}_{SECTION}_{KEY}
        prefix = f"SITE_{site_id.upper().replace('-', '_').replace('.', '_')}_"
        
        for key, value in os.environ.items():
            if key.startswith(prefix):
                # 解析键路径
                path = key[len(prefix):].lower().split('_')
                
                # 设置嵌套值
                current = overrides
                for part in path[:-1]:
                    if part not in current:
                        current[part] = {}
                    current = current[part]
                
                # 转换值类型
                current[path[-1]] = self._convert_env_value(value)
        
        return overrides
    
    def _convert_env_value(self, value: str) -> Any:
        """转换环境变量值"""
        # 布尔值
        if value.lower() in ('true', 'false'):
            return value.lower() == 'true'
        
        # 数字
        try:
            if '.' in value:
                return float(value)
            return int(value)
        except ValueError:
            pass
        
        # JSON
        if value.startswith(('{', '[')):
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                pass
        
        # 字符串
        return value
    
    def _deep_update(self, base: Dict[str, Any], updates: Dict[str, Any]) -> Dict[str, Any]:
        """深度更新字典"""
        result = base.copy()
        
        for key, value in updates.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._deep_update(result[key], value)
            else:
                result[key] = value
                
        return result
    
    def _validate_config(self, config: Dict[str, Any]) -> bool:
        """验证配置"""
        try:
            # 基本验证
            required_fields = ['site_id', 'site_name']
            for field in required_fields:
                if field not in config or not config[field]:
                    logger.error(f"Missing required field: {field}")
                    return False
            
            # 类型验证
            if 'performance' in config:
                perf = config['performance']
                if 'cache_timeout' in perf and not isinstance(perf['cache_timeout'], int):
                    logger.error("cache_timeout must be an integer")
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"Config validation error: {e}")
            return False
    
    def _get_current_timestamp(self) -> str:
        """获取当前时间戳"""
        from datetime import datetime
        return datetime.now().isoformat()

# 全局配置管理器实例
config_manager = SiteConfigManager()

# 便捷函数
def get_site_config(site_id: str) -> SiteConfig:
    """获取站点配置的便捷函数"""
    return config_manager.get_config(site_id)

def update_site_config(site_id: str, updates: Dict[str, Any]) -> bool:
    """更新站点配置的便捷函数"""
    return config_manager.update_config(site_id, updates)

def get_site_feature(site_id: str, feature: str, default: Any = None) -> Any:
    """获取站点特定功能配置"""
    config = get_site_config(site_id)
    return getattr(config.features, feature, default)

def get_site_setting(site_id: str, section: str, key: str, default: Any = None) -> Any:
    """获取站点特定设置"""
    config = get_site_config(site_id)
    section_obj = getattr(config, section, None)
    if section_obj:
        return getattr(section_obj, key, default)
    return default


# =============================================================================
# 配置验证系统
# =============================================================================

class ConfigValidationError(Exception):
    """配置验证错误"""
    pass

class ConfigValidator:
    """配置验证器"""
    
    def __init__(self):
        self.errors = []
    
    def validate_site_config(self, config: SiteConfig, site_id: str) -> bool:
        """验证站点配置"""
        self.errors = []
        
        # 验证基本信息
        self._validate_basic_info(config, site_id)
        
        # 验证URL格式
        self._validate_urls(config)
        
        # 验证特性配置
        self._validate_features(config.features)
        
        # 验证性能配置
        self._validate_performance(config.performance)
        
        # 验证UI配置
        self._validate_ui(config.ui)
        
        # 验证内容配置
        self._validate_content(config.content)
        
        # 验证SEO配置
        self._validate_seo(config.seo)
        
        # 验证分析配置
        self._validate_analytics(config.analytics)
        
        return len(self.errors) == 0
    
    def _validate_basic_info(self, config: SiteConfig, site_id: str):
        """验证基本信息"""
        if not config.site_name:
            self.errors.append(f"站点名称不能为空 (site_id: {site_id})")
        
        if not config.site_url:
            self.errors.append(f"站点URL不能为空 (site_id: {site_id})")
        
        if not re.match(r'^[a-zA-Z0-9\-_.]+$', site_id):
            self.errors.append(f"站点ID格式无效: {site_id}")
    
    def _validate_urls(self, config: SiteConfig):
        """验证URL格式"""
        url_pattern = re.compile(
            r'^https?://'  # http:// or https://
            r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain...
            r'localhost|'  # localhost...
            r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
            r'(?::\d+)?'  # optional port
            r'(?:/?|[/?]\S+)$', re.IGNORECASE)
        
        if config.site_url and not url_pattern.match(config.site_url):
            self.errors.append(f"站点URL格式无效: {config.site_url}")
        
        if config.ui.logo_url and config.ui.logo_url.startswith('http') and not url_pattern.match(config.ui.logo_url):
            self.errors.append(f"Logo URL格式无效: {config.ui.logo_url}")
    
    def _validate_features(self, features: SiteFeatures):
        """验证特性配置"""
        # 这里可以添加特性间的依赖验证
        if features.social_login and not features.user_registration:
            self.errors.append("启用社交登录需要先启用用户注册")
    
    def _validate_performance(self, performance: SitePerformance):
        """验证性能配置"""
        if performance.cache_timeout < 0:
            self.errors.append("缓存超时时间不能为负数")
        
        if performance.max_articles_per_page < 1 or performance.max_articles_per_page > 100:
            self.errors.append("每页文章数量应在1-100之间")
    
    def _validate_ui(self, ui: SiteUI):
        """验证UI配置"""
        # 验证颜色格式
        color_pattern = re.compile(r'^#[0-9A-Fa-f]{6}$')
        
        if ui.primary_color and not color_pattern.match(ui.primary_color):
            self.errors.append(f"主色调格式无效: {ui.primary_color}")
        
        if ui.secondary_color and not color_pattern.match(ui.secondary_color):
            self.errors.append(f"辅助色调格式无效: {ui.secondary_color}")
    
    def _validate_content(self, content: SiteContent):
        """验证内容配置"""
        valid_languages = ['zh', 'en', 'ja', 'ko', 'fr', 'de', 'es', 'pt', 'ru']
        
        if content.default_language not in valid_languages:
            self.errors.append(f"默认语言无效: {content.default_language}")
        
        for lang in content.supported_languages:
            if lang not in valid_languages:
                self.errors.append(f"支持的语言无效: {lang}")
    
    def _validate_seo(self, seo: SiteSEO):
        """验证SEO配置"""
        if seo.meta_title and len(seo.meta_title) > 60:
            self.errors.append("SEO标题长度不应超过60个字符")
        
        if seo.meta_description and len(seo.meta_description) > 160:
            self.errors.append("SEO描述长度不应超过160个字符")
    
    def _validate_analytics(self, analytics: SiteAnalytics):
        """验证分析配置"""
        if analytics.google_analytics_id:
            # 验证GA ID格式 (GA4: G-XXXXXXXXXX, Universal: UA-XXXXXXXX-X)
            ga_pattern = re.compile(r'^(G-[A-Z0-9]{10}|UA-\d{8}-\d)$')
            if not ga_pattern.match(analytics.google_analytics_id):
                self.errors.append(f"Google Analytics ID格式无效: {analytics.google_analytics_id}")
    
    def get_errors(self) -> List[str]:
        """获取验证错误列表"""
        return self.errors.copy()
    
    def get_error_summary(self) -> str:
        """获取错误摘要"""
        if not self.errors:
            return "配置验证通过"
        
        return f"发现 {len(self.errors)} 个配置错误:\n" + "\n".join(f"- {error}" for error in self.errors)


def validate_site_config(site_id: str) -> Dict[str, Any]:
    """验证站点配置并返回结果"""
    validator = ConfigValidator()
    
    try:
        config = get_site_config(site_id)
        is_valid = validator.validate_site_config(config, site_id)
        
        return {
            'site_id': site_id,
            'is_valid': is_valid,
            'errors': validator.get_errors(),
            'error_count': len(validator.get_errors()),
            'summary': validator.get_error_summary()
        }
    except Exception as e:
        return {
            'site_id': site_id,
            'is_valid': False,
            'errors': [f"配置加载失败: {str(e)}"],
            'error_count': 1,
            'summary': f"配置加载失败: {str(e)}"
        }


def validate_all_sites() -> Dict[str, Any]:
    """验证所有站点配置"""
    results = {}
    total_errors = 0
    
    try:
        from wagtail.models import Site
        sites = Site.objects.all()
        
        for site in sites:
            try:
                result = validate_site_config(site.hostname)
                results[site.hostname] = result
                total_errors += result['error_count']
            except Exception as e:
                logger.error(f"Failed to validate config for {site.hostname}: {e}")
                continue
    except Exception as e:
        logger.error(f"Failed to get sites for validation: {e}")
    
    return {
        'results': results,
        'total_sites': len(results),
        'total_errors': total_errors,
        'all_valid': total_errors == 0
    }
