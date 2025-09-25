"""
站点设置API端点

包含站点配置功能
"""

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from apps.core.models import SiteSettings
from ..utils import validate_site_parameter, generate_etag
from ...utils.rate_limit import SITE_SETTINGS_RATE_LIMIT
from ...utils.cache_performance import monitor_cache_performance


@api_view(["GET"])
@SITE_SETTINGS_RATE_LIMIT
@monitor_cache_performance("site_settings")
def site_settings(request):
    """
    获取站点配置
    
    支持参数：
    - site: 站点标识（主机名或site_id）
    """
    try:
        # 1. 验证站点参数
        site = validate_site_parameter(request)
        if not site:
            return Response(
                {"error": "Invalid or missing site parameter"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 2. 获取站点配置
        try:
            settings = SiteSettings.get_for_site(site)
        except SiteSettings.DoesNotExist:
            # 如果站点配置不存在，创建默认配置
            settings = SiteSettings.objects.create(
                site=site,
                brand_name=site.site_name,
                theme_key="localsite-default",
                layout_key="layout-localsite-grid",
                brand_tokens={
                    "primary": "#3B82F6",
                    "secondary": "#6B7280",
                    "font": "Inter, sans-serif",
                    "radius": "0.5rem",
                    "shadow": "0 1px 3px rgba(0,0,0,0.1)"
                },
                modules={
                    "home": ["hero", "top-news", "channels"],
                    "sidebar": ["rank", "ad"]
                }
            )
        
        # 3. 构建前端规划需要的数据结构
        site_settings_data = {
            "site_id": site.id,
            "site_name": site.site_name,
            "hostname": site.hostname,
            "port": site.port,
            "is_default_site": site.is_default_site,
            "root_page_id": site.root_page_id,
            
            # 前端布局配置（核心）
            "theme_key": settings.theme_key,
            "layout_key": settings.layout_key,
            "brand_tokens": settings.brand_tokens or {
                "primary": settings.primary_color,
                "secondary": settings.secondary_color,
                "font": settings.font_family,
                "radius": "0.5rem",
                "shadow": "0 1px 3px rgba(0,0,0,0.1)"
            },
            "modules": settings.modules or {
                "home": ["hero", "top-news", "channels"],
                "sidebar": ["rank", "ad"]
            },
            
            # 品牌配置
            "brand": {
                "name": settings.brand_name or site.site_name,
                "logo_url": settings.brand_logo or settings.logo_url or "",
                "description": settings.brand_description or ""
            },
            
            # SEO配置  
            "seo": {
                # 站点级SEO
                "site_title": settings.site_title or site.site_name,
                "site_description": settings.site_description or "",
                "site_keywords": getattr(settings, 'site_keywords', ''),
                
                # 页面级SEO模板
                "page_title_template": getattr(settings, 'page_title_template', '{title} - {site_name}'),
                "page_description_template": getattr(settings, 'page_description_template', ''),
                "auto_seo_enabled": getattr(settings, 'auto_seo_enabled', True)
            },
            
            # 分析配置
            "analytics": {
                "google_analytics_id": settings.google_analytics_id or "",
                "track_user_behavior": getattr(settings, 'track_user_behavior', True)
            },
            
            # 功能开关
            "features": {
                "recommendation": settings.recommendation,
                "search_enabled": settings.search_enabled,
                "comments_enabled": settings.comments_enabled,
                "user_registration": settings.user_registration,
                "social_login": settings.social_login,
                "content_moderation": settings.content_moderation,
                "api_access": settings.api_access,
                "rss_feed": settings.rss_feed,
                "sitemap": settings.sitemap
            },
            
            # 页脚配置
            "footer": {
                "links": [],  # TODO: 实现页脚链接
                "copyright": f"© 2024 {settings.brand_name or site.site_name}. All rights reserved."
            }
        }
        
        # 4. 构建响应
        response_data = {
            "settings": site_settings_data,
            "meta": {
                "site": site.hostname,
                "site_id": site.id,
                "theme_key": settings.theme_key,
                "layout_key": settings.layout_key
            }
        }
        
        # 5. 生成缓存相关头部
        response = Response(response_data)
        
        # Cache-Control
        response["Cache-Control"] = "public, s-maxage=600, stale-while-revalidate=300"
        
        # ETag
        etag = generate_etag(response_data)
        response["ETag"] = f'"{etag}"'
        
        # Surrogate-Key - 包含前端布局相关的标签
        surrogate_keys = [
            f"site:{site.hostname}", 
            "settings:all",
            f"theme:{settings.theme_key}",
            f"layout:{settings.layout_key}"
        ]
        response["Surrogate-Key"] = " ".join(surrogate_keys)
        
        return response
        
    except Exception as e:
        return Response(
            {"error": f"Internal server error: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
