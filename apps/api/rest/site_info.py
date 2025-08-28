"""
站点信息API端点

展示如何使用新的配置管理系统获取站点特定的配置和功能
"""

from rest_framework.decorators import api_view
from rest_framework.response import Response
from apps.core.site_utils import (
    get_site_from_request, 
    get_site_features, 
    get_site_ui_config,
    get_site_cache_timeout,
    get_site_max_articles,
    is_feature_enabled
)
from apps.core.site_config import get_site_config
from apps.core.site_utils import CONFIG_SYSTEM_AVAILABLE

@api_view(["GET"])
def site_info(request):
    """
    获取当前站点的配置信息
    
    返回站点的功能特性、UI配置、性能设置等信息
    """
    site = get_site_from_request(request)
    
    # 获取站点功能特性
    features = get_site_features(site)
    
    # 获取UI配置
    ui_config = get_site_ui_config(site)
    
    # 获取性能配置
    cache_timeout = get_site_cache_timeout(site)
    max_articles = get_site_max_articles(site)
    
    response_data = {
        "site_id": site,
        "config_system_available": CONFIG_SYSTEM_AVAILABLE,
        "features": features,
        "ui": ui_config,
        "performance": {
            "cache_timeout": cache_timeout,
            "max_articles_per_page": max_articles,
        },
        "debug": {
            "host": request.get_host(),
            "user_agent": request.META.get('HTTP_USER_AGENT', ''),
        }
    }
    
    # 如果配置系统可用，提供更详细的信息
    if CONFIG_SYSTEM_AVAILABLE:
        try:
            full_config = get_site_config(site)
            response_data.update({
                "site_name": full_config.site_name,
                "site_url": full_config.site_url,
                "description": full_config.description,
                "content": {
                    "default_language": full_config.content.default_language,
                    "supported_languages": full_config.content.supported_languages,
                    "timezone": full_config.content.timezone,
                },
                "seo": {
                    "meta_title": full_config.seo.meta_title,
                    "meta_description": full_config.seo.meta_description,
                    "meta_keywords": full_config.seo.meta_keywords,
                },
                "analytics": {
                    "google_analytics_id": full_config.analytics.google_analytics_id,
                    "track_user_behavior": full_config.analytics.track_user_behavior,
                },
                "custom": full_config.custom,
                "version": full_config.version,
                "updated_at": full_config.updated_at,
            })
        except Exception as e:
            response_data["config_error"] = str(e)
    
    return Response(response_data)

@api_view(["GET"])
def site_features(request):
    """
    获取站点功能特性
    
    返回当前站点支持的功能列表
    """
    site = get_site_from_request(request)
    features = get_site_features(site)
    
    # 添加功能描述
    feature_descriptions = {
        "ai_recommendation": "AI智能推荐功能",
        "search_enabled": "搜索功能",
        "analytics_enabled": "数据分析功能",
        "comments_enabled": "评论功能", 
        "user_registration": "用户注册功能",
        "social_login": "社交登录功能",
        "api_access": "API访问功能",
    }
    
    enabled_features = []
    disabled_features = []
    
    for feature, enabled in features.items():
        feature_info = {
            "name": feature,
            "description": feature_descriptions.get(feature, feature),
            "enabled": enabled
        }
        
        if enabled:
            enabled_features.append(feature_info)
        else:
            disabled_features.append(feature_info)
    
    return Response({
        "site_id": site,
        "enabled_features": enabled_features,
        "disabled_features": disabled_features,
        "total_features": len(features),
        "enabled_count": len(enabled_features),
    })

@api_view(["POST"])
def check_feature(request):
    """
    检查特定功能是否启用
    
    POST数据: {"feature": "feature_name"}
    """
    site = get_site_from_request(request)
    feature = request.data.get('feature')
    
    if not feature:
        return Response({
            "error": "请提供feature参数"
        }, status=400)
    
    enabled = is_feature_enabled(site, feature)
    
    return Response({
        "site_id": site,
        "feature": feature,
        "enabled": enabled,
        "message": f"功能 '{feature}' 在站点 '{site}' 中{'已启用' if enabled else '未启用'}"
    })

@api_view(["GET"])
def site_theme(request):
    """
    获取站点主题和UI配置
    
    返回前端可用的主题配置信息
    """
    site = get_site_from_request(request)
    ui_config = get_site_ui_config(site)
    
    # 构建CSS变量
    css_variables = {
        "--primary-color": ui_config['primary_color'],
        "--secondary-color": ui_config['secondary_color'],
        "--font-family": ui_config['font_family'],
    }
    
    return Response({
        "site_id": site,
        "theme": ui_config['theme'],
        "colors": {
            "primary": ui_config['primary_color'],
            "secondary": ui_config['secondary_color'],
        },
        "typography": {
            "font_family": ui_config['font_family'],
        },
        "assets": {
            "logo_url": ui_config['logo_url'],
        },
        "features": {
            "dark_mode_enabled": ui_config['dark_mode_enabled'],
        },
        "css_variables": css_variables,
        "usage_example": {
            "css": f"""
:root {{
    {'; '.join(f'{k}: {v}' for k, v in css_variables.items())};
}}

.btn-primary {{
    background-color: var(--primary-color);
    font-family: var(--font-family);
}}
            """.strip()
        }
    })
