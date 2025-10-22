"""
站点识别和管理工具
"""
from django.conf import settings
from django.core.cache import cache
from wagtail.models import Site
import logging

logger = logging.getLogger(__name__)

# 导入配置管理器
try:
    from .site_config import get_site_config, get_site_setting
    CONFIG_SYSTEM_AVAILABLE = True
except ImportError:
    CONFIG_SYSTEM_AVAILABLE = False
    logger.warning("配置管理系统不可用，使用传统配置方式")

# 站点映射配置
SITE_MAPPINGS = {
    # 开发环境
    'localhost': 'localhost',
    '127.0.0.1': 'localhost',
    'localhost:3000': 'localhost',
    'localhost:3001': 'localhost',
    'localhost:8000': 'localhost',
    
    # Docker内部服务名（通过代理访问时）
    'authoring': 'localhost',
    'authoring:8000': 'localhost',
    '172.28.1.30': 'localhost',
    '172.28.1.30:8000': 'localhost',
    
    # 生产站点
    'aivoya.com': 'aivoya.com',
    'beijing.aivoya.com': 'beijing.aivoya.com',
    'shanghai.aivoya.com': 'shanghai.aivoya.com',
    'shenzhen.aivoya.com': 'shenzhen.aivoya.com',
    'hangzhou.aivoya.com': 'hangzhou.aivoya.com',
    
    # 可能的其他域名
    '192.168.8.195': 'localhost',
    '192.168.8.195:8000': 'localhost',
    
    # 今日湖北生产服务器IP
    '8.133.22.7': 'localhost',
    '8.133.22.7:8000': 'localhost',
    '121.40.167.71': 'localhost',
    '121.40.167.71:8000': 'localhost',
}

def get_site_identifier_from_host(host: str) -> str:
    """
    从Host header获取站点标识符
    
    Args:
        host: 请求的Host header值
        
    Returns:
        str: 站点标识符
    """
    if not host:
        return settings.SITE_HOSTNAME
    
    # 移除端口号
    host_without_port = host.split(':')[0].lower()
    
    # 直接匹配
    if host in SITE_MAPPINGS:
        return SITE_MAPPINGS[host]
    
    # 无端口匹配
    if host_without_port in SITE_MAPPINGS:
        return SITE_MAPPINGS[host_without_port]
    
    # 如果没有找到映射，使用原始host（去除端口）
    logger.warning(f"No site mapping found for host: {host}, using: {host_without_port}")
    return host_without_port

def get_site_from_request(request) -> str:
    """
    从Django请求对象获取站点标识符
    
    优先级:
    1. URL参数 ?site=
    2. Host header
    3. 默认配置
    
    Args:
        request: Django request对象
        
    Returns:
        str: 站点标识符
    """
    # 优先使用URL参数
    site_param = getattr(request, 'query_params', getattr(request, 'GET', {})).get('site')
    if site_param:
        return site_param
    
    # 使用Host header
    host = request.get_host()
    if host:
        return get_site_identifier_from_host(host)
    
    # fallback到默认配置
    return getattr(settings, 'SITE_HOSTNAME', 'localhost')

def get_wagtail_site_from_request(request):
    """
    获取对应的Wagtail Site对象
    
    Args:
        request: Django request对象
        
    Returns:
        Site: Wagtail Site对象
    """
    cache_key = f"wagtail_site_{request.get_host()}"
    site = cache.get(cache_key)
    
    if site is None:
        try:
            # 尝试使用Wagtail的站点查找
            site = Site.find_for_request(request)
        except Site.DoesNotExist:
            # 如果找不到，使用默认站点
            try:
                site = Site.objects.get(is_default_site=True)
            except Site.DoesNotExist:
                # 如果连默认站点都没有，创建一个
                site = Site.objects.first()
                if not site:
                    logger.error("No Wagtail sites found in database")
                    return None
        
        # 缓存结果5分钟
        cache.set(cache_key, site, 300)
    
    return site

def normalize_site_identifier(site: str) -> str:
    """
    规范化站点标识符，确保一致性
    
    Args:
        site: 站点标识符
        
    Returns:
        str: 规范化的站点标识符
    """
    if not site:
        return getattr(settings, 'SITE_HOSTNAME', 'localhost')
    
    # 转小写并移除特殊字符
    normalized = site.lower().replace(':', '_').replace('.', '_').replace('-', '_')
    
    # 映射特殊情况
    mapping = {
        'localhost': 'localhost',
        '127_0_0_1': 'localhost',
        'site_a_local': 'site_a_local',
        'site_b_local': 'site_b_local',
        'portal_local': 'portal_local',
    }
    
    return mapping.get(normalized, normalized)

def get_available_sites() -> dict:
    """
    获取所有可用的站点配置
    
    Returns:
        dict: 站点配置字典
    """
    if CONFIG_SYSTEM_AVAILABLE:
        try:
            from .site_config import config_manager
            configs = config_manager.get_all_configs()
            
            result = {}
            for site_id, config in configs.items():
                result[site_id] = {
                    'name': config.site_name,
                    'domains': [config.site_url.replace('https://', '').replace('http://', '')],
                    'description': config.description,
                    'is_default': site_id == 'localhost',
                }
            return result
            
        except Exception as e:
            logger.warning(f"无法从配置系统获取站点信息: {e}")
    
    # 回退到传统配置
    return {
        'localhost': {
            'name': 'Localhost Development',
            'domains': ['localhost', '127.0.0.1', 'localhost:3000', 'localhost:8000'],
            'description': '开发环境站点',
            'is_default': True,
        },
        'aivoya.com': {
            'name': 'AI新闻主门户',
            'domains': ['aivoya.com'],
            'description': '统一门户入口',
            'is_default': False,
        },
        'beijing.aivoya.com': {
            'name': 'BeijingAI新闻',
            'domains': ['beijing.aivoya.com'],
            'description': '北京地区AI科技新闻站点',
            'is_default': False,
        },
        'shanghai.aivoya.com': {
            'name': 'ShanghaiAI新闻',
            'domains': ['shanghai.aivoya.com'],
            'description': '上海地区AI科技新闻站点',
            'is_default': False,
        },
        'shenzhen.aivoya.com': {
            'name': 'ShenzhenAI新闻',
            'domains': ['shenzhen.aivoya.com'],
            'description': '深圳地区AI科技新闻站点',
            'is_default': False,
        },
        'hangzhou.aivoya.com': {
            'name': 'HangzhouAI新闻',
            'domains': ['hangzhou.aivoya.com'],
            'description': '杭州地区AI科技新闻站点',
            'is_default': False,
        }
    }

# 新的配置相关函数
def get_site_cache_timeout(site_id: str) -> int:
    """获取站点缓存超时时间"""
    if CONFIG_SYSTEM_AVAILABLE:
        return get_site_setting(site_id, 'performance', 'cache_timeout', 300)
    return 300

def get_site_max_articles(site_id: str) -> int:
    """获取站点最大文章数"""
    if CONFIG_SYSTEM_AVAILABLE:
        return get_site_setting(site_id, 'performance', 'max_articles_per_page', 20)
    return 20

def get_site_features(site_id: str) -> dict:
    """获取站点功能特性"""
    if CONFIG_SYSTEM_AVAILABLE:
        try:
            config = get_site_config(site_id)
            return {
                'ai_recommendation': config.features.ai_recommendation,
                'search_enabled': config.features.search_enabled,
                'analytics_enabled': config.features.analytics_enabled,
                'comments_enabled': config.features.comments_enabled,
                'user_registration': config.features.user_registration,
                'social_login': config.features.social_login,
                'api_access': config.features.api_access,
            }
        except Exception as e:
            logger.warning(f"无法获取站点功能特性: {e}")
    
    # 默认功能配置
    return {
        'ai_recommendation': True,
        'search_enabled': True,
        'analytics_enabled': True,
        'comments_enabled': False,
        'user_registration': True,
        'social_login': False,
        'api_access': True,
    }

def is_feature_enabled(site_id: str, feature: str) -> bool:
    """检查站点功能是否启用"""
    features = get_site_features(site_id)
    return features.get(feature, False)

def get_site_ui_config(site_id: str) -> dict:
    """获取站点UI配置"""
    if CONFIG_SYSTEM_AVAILABLE:
        try:
            config = get_site_config(site_id)
            return {
                'theme': config.ui.theme,
                'primary_color': config.ui.primary_color,
                'secondary_color': config.ui.secondary_color,
                'font_family': config.ui.font_family,
                'logo_url': config.ui.logo_url,
                'dark_mode_enabled': config.ui.dark_mode_enabled,
            }
        except Exception as e:
            logger.warning(f"无法获取站点UI配置: {e}")
    
    # 默认UI配置
    return {
        'theme': 'default',
        'primary_color': '#3B82F6',
        'secondary_color': '#6B7280',
        'font_family': 'Inter, sans-serif',
        'logo_url': '',
        'dark_mode_enabled': True,
    }
