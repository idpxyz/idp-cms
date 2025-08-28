"""
主URL配置

定义整个项目的URL路由
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from wagtail import urls as wagtail_urls
from wagtail.admin import urls as wagtailadmin_urls
from wagtail.documents import urls as wagtaildocs_urls

# API导入
from apps.api.rest.feed import feed
from apps.api.rest.track import track
from apps.api.rest.site_info import site_info, site_features, check_feature, site_theme
from apps.api.rest.cache_management import cache_stats, clear_cache, invalidate_pattern, cache_health
from apps.api.utils.cache_performance import cache_performance_stats, reset_cache_stats
from apps.api.rest.articles import (
    articles_list, article_detail, channels_list, regions_list, 
    portal_articles, site_settings
)
from apps.api.rest.revalidate import revalidate, revalidate_status
from apps.api.rest import cdn_config

urlpatterns = [
    # 管理后台
    path("admin/", include(wagtailadmin_urls)),
    path("documents/", include(wagtaildocs_urls)),
    path("django-admin/", admin.site.urls),
    
    # 核心API
    path("api/feed", feed, name="api-feed"),
    path("api/track", track, name="api-track"),
    
    # 站点配置API
    path("api/site/info", site_info, name="api-site-info"),
    path("api/site/features", site_features, name="api-site-features"), 
    path("api/site/check-feature", check_feature, name="api-check-feature"),
    path("api/site/theme", site_theme, name="api-site-theme"),
    
    # 缓存管理API
    path("api/cache/stats", cache_stats, name="api-cache-stats"),
    path("api/cache/clear", clear_cache, name="api-cache-clear"),
    path("api/cache/invalidate", invalidate_pattern, name="api-cache-invalidate"),
    path("api/cache/health", cache_health, name="api-cache-health"),
    
    # 缓存性能测试API
    path("api/cache/performance", cache_performance_stats, name="api-cache-performance"),
    path("api/cache/reset-stats", reset_cache_stats, name="api-cache-reset-stats"),
    
    # 文章API
    path("api/articles/", articles_list, name="api-articles-list"),
    path("api/articles/<str:slug>/", article_detail, name="api-article-detail"),
    path("api/channels", channels_list, name="api-channels-list"),
    path("api/regions", regions_list, name="api-regions-list"),
    path("api/portal/articles", portal_articles, name="api-portal-articles"),
    path("api/site-settings", site_settings, name="api-site-settings"),
    
    # 缓存失效API
    path("api/revalidate", revalidate, name="api-revalidate"),
    path("api/revalidate/status", revalidate_status, name="api-revalidate-status"),
    
    # CDN配置API
    path("api/cdn/config/<str:site>/", cdn_config.get_site_cdn_config, name="api-cdn-config"),
    path("api/cdn/purge/", cdn_config.purge_site_cache, name="api-cdn-purge"),
    path("api/cdn/health/<str:site>/", cdn_config.get_site_cdn_health, name="api-cdn-health"),
    path("api/cdn/metrics/<str:site>/", cdn_config.get_site_cdn_metrics, name="api-cdn-metrics"),
    path("api/cdn/status/", cdn_config.get_all_cdn_status, name="api-cdn-status"),
    path("api/cdn/validate/", cdn_config.validate_cdn_config, name="api-cdn-validate"),
    path("api/cdn/providers/", cdn_config.get_cdn_providers, name="api-cdn-providers"),
    path("api/cdn/types/", cdn_config.get_supported_cdn_types, name="api-cdn-types"),
    
    # Wagtail页面（必须放在最后）
    path("", include(wagtail_urls)),
]

# 开发环境静态文件服务
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# 调试配置
if settings.DEBUG:
    try:
        import debug_toolbar
        urlpatterns = [
            path("__debug__/", include(debug_toolbar.urls)),
        ] + urlpatterns
    except ImportError:
        pass