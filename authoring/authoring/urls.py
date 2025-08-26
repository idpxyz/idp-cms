from django.contrib import admin
from django.urls import path, include
from wagtail import urls as wagtail_urls
from wagtail.admin import urls as wagtailadmin_urls
from wagtail.documents import urls as wagtaildocs_urls

# 保留必要的API
from apps.api.rest.feed import feed
from apps.api.rest.track import track
from apps.api.rest.site_info import site_info, site_features, check_feature, site_theme
from apps.api.rest.cache_management import (
    cache_stats, clear_cache, invalidate_pattern, 
    cache_health
)

# 新的文章API
from apps.api.rest.articles import (
    articles_list, article_detail, channels_list, regions_list, 
    portal_articles, site_settings
)

# 新的缓存失效API
from apps.api.rest.revalidate import revalidate, revalidate_status

urlpatterns = [
    path("admin/", include(wagtailadmin_urls)),
    path("documents/", include(wagtaildocs_urls)),
    path("django-admin/", admin.site.urls),
    
    # 保留核心功能
    path("api/feed", feed),
    path("api/track", track),
    
    # Site Configuration API
    path("api/site/info", site_info),
    path("api/site/features", site_features),
    path("api/site/check-feature", check_feature),
    path("api/site/theme", site_theme),
    
    # Cache Management API
    path("api/cache/stats", cache_stats),
    path("api/cache/clear", clear_cache),
    path("api/cache/invalidate", invalidate_pattern),
    path("api/cache/health", cache_health),
    
    # 新的文章API - 核心功能
    path("api/articles", articles_list),
    path("api/articles/<str:slug>", article_detail),
    path("api/channels", channels_list),
    path("api/regions", regions_list),
    path("api/portal/articles", portal_articles),
    path("api/site-settings", site_settings),
    
    # 新的缓存失效API - Webhook支持
    path("api/revalidate", revalidate),
    path("api/revalidate/status", revalidate_status),
    
    path("", include(wagtail_urls)),
]
