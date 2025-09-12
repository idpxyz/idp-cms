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
from apps.api.rest.headlines import headlines
from apps.api.rest.hot import hot
from apps.api.rest.aggregations import agg_headlines, agg_hot
from apps.api.rest.test_api import test_headlines, test_hot
from apps.api.rest.topics import topics, topic_detail
from apps.api.rest.track import track
from apps.api.rest.analytics import analytics
from apps.api.rest.site_info import site_info, site_features, check_feature, site_theme
from apps.api.rest.cache_management import cache_stats, clear_cache, invalidate_pattern, cache_health
from apps.api.utils.cache_performance import cache_performance_stats, reset_cache_stats
from apps.api.rest.articles import (
    articles_list, article_detail, channels_list, regions_list, 
    portal_articles, site_settings
)
from apps.api.rest.revalidate import revalidate, revalidate_status
from apps.api.rest import cdn_config
from apps.api.rest.crawler_api import (
    bulk_create_articles, check_duplicate_articles, get_site_info
)
from apps.api.rest.tags import top_tags as api_top_tags, tag_articles as api_tag_articles
from apps.api.rest.monitoring import monitoring_dashboard, monitoring_health
from apps.api.rest.analytics_stream import analytics_stream, analytics_stream_stats
from apps.api.rest.simple_sse import simple_sse
from apps.api.rest.basic_sse import basic_sse
from apps.api.rest.mock_analytics_stream import mock_analytics_stream

# 核心应用视图导入
from apps.core.views import (
    health_check, system_info, security_status,
    storage_health_check, storage_metrics, simple_health_check, trigger_monitoring,
    liveness_probe, readiness_check, startup_check,
)

urlpatterns = [
    # 健康检查和系统信息
    path("health/", health_check, name="health-check"),
    path("health/liveness/", liveness_probe, name="liveness-probe"),
    path("health/readiness/", readiness_check, name="readiness-check"),
    path("health/startup/", startup_check, name="startup-check"),
    path("health/storage/", storage_health_check, name="storage-health-check"),
    path("health/simple/", simple_health_check, name="simple-health-check"),
    path("system/", system_info, name="system-info"),
    path("security/", security_status, name="security-status"),
    
    # 存储监控 API
    path("api/storage/metrics/", storage_metrics, name="storage-metrics"),
    path("api/storage/monitor/", trigger_monitoring, name="trigger-monitoring"),
    
    # 监控仪表板 API
    path("api/monitoring/dashboard/", monitoring_dashboard, name="monitoring-dashboard"),
    path("api/monitoring/health/", monitoring_health, name="monitoring-health"),
    path("api/analytics/stream/", analytics_stream, name="analytics-stream"),
    path("api/analytics/stream/stats/", analytics_stream_stats, name="analytics-stream-stats"),
    path("api/test/sse/", simple_sse, name="simple-sse"),
    path("api/basic/sse/", basic_sse, name="basic-sse"),
    path("api/mock/analytics/stream/", mock_analytics_stream, name="mock-analytics-stream"),
    
    # 管理后台
    path("admin/", include(wagtailadmin_urls)),
    path("documents/", include(wagtaildocs_urls)),
    path("django-admin/", admin.site.urls),
    
    # 核心API
    path("api/feed/", feed, name="api-feed"),
    path("api/headlines/", headlines, name="api-headlines"),
    path("api/hot/", hot, name="api-hot"),
    path("api/agg/headlines/", agg_headlines, name="api-agg-headlines"),
    path("api/agg/hot/", agg_hot, name="api-agg-hot"),
    
    # 测试API
    path("api/test/headlines/", test_headlines, name="api-test-headlines"),
    path("api/test/hot/", test_hot, name="api-test-hot"),
    path("api/topics/", topics, name="api-topics"),
    path("api/topics/<slug:slug>/", topic_detail, name="api-topic-detail"),
    path("api/track/", track, name="api-track"),
    path("api/analytics/", analytics, name="api-analytics"),
    
    # 站点配置API
    path("api/site/info/", site_info, name="api-site-info"),
    path("api/site/features/", site_features, name="api-site-features"), 
    path("api/site/check-feature/", check_feature, name="api-check-feature"),
    path("api/site/theme/", site_theme, name="api-site-theme"),
    
    # 缓存管理API
    path("api/cache/stats/", cache_stats, name="api-cache-stats"),
    path("api/cache/clear/", clear_cache, name="api-cache-clear"),
    path("api/cache/invalidate/", invalidate_pattern, name="api-cache-invalidate"),
    path("api/cache/health/", cache_health, name="api-cache-health"),
    
    # 缓存性能测试API
    path("api/cache/performance/", cache_performance_stats, name="api-cache-performance"),
    path("api/cache/reset-stats/", reset_cache_stats, name="api-cache-reset-stats"),
    
    # 文章API
    path("api/articles/", articles_list, name="api-articles-list"),
    path("api/articles/<str:slug>/", article_detail, name="api-article-detail"),
    path("api/channels/", channels_list, name="api-channels-list"),
    path("api/regions/", regions_list, name="api-regions-list"),
    path("api/portal/articles/", portal_articles, name="api-portal-articles"),
    path("api/site-settings/", site_settings, name="api-site-settings"),
    # 标签API
    path("api/tags/top/", api_top_tags, name="api-top-tags"),
    path("api/tags/<slug:tag_slug>/", api_tag_articles, name="api-tag-articles"),
    
    # 缓存失效API
    path("api/revalidate/", revalidate, name="api-revalidate"),
    path("api/revalidate/status/", revalidate_status, name="api-revalidate-status"),
    
    # CDN配置API
    path("api/cdn/config/<str:site>/", cdn_config.get_site_cdn_config, name="api-cdn-config"),
    path("api/cdn/purge/", cdn_config.purge_site_cache, name="api-cdn-purge"),
    path("api/cdn/health/<str:site>/", cdn_config.get_site_cdn_health, name="api-cdn-health"),
    path("api/cdn/metrics/<str:site>/", cdn_config.get_site_cdn_metrics, name="api-cdn-metrics"),
    path("api/cdn/status/", cdn_config.get_all_cdn_status, name="api-cdn-status"),
    path("api/cdn/validate/", cdn_config.validate_cdn_config, name="api-cdn-validate"),
    path("api/cdn/providers/", cdn_config.get_cdn_providers, name="api-cdn-providers"),
    path("api/cdn/types/", cdn_config.get_supported_cdn_types, name="api-cdn-types"),
    
    # 媒体文件API
    path("api/media/", include("apps.media.urls")),
    
    # 爬虫数据写入API
    path("api/crawler/articles/bulk/", bulk_create_articles, name="api-crawler-bulk-articles"),
    path("api/crawler/articles/check-duplicates/", check_duplicate_articles, name="api-crawler-check-duplicates"),
    path("api/crawler/sites/info/", get_site_info, name="api-crawler-site-info"),
    
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