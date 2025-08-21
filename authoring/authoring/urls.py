from django.contrib import admin
from django.urls import path, include
from wagtail import urls as wagtail_urls
from wagtail.admin import urls as wagtailadmin_urls
from wagtail.documents import urls as wagtaildocs_urls
from apps.api.rest.feed import feed
from apps.api.rest.track import track
from apps.api.rest.ai_tools import ai_tools, ai_tool_detail, ai_tool_categories
from apps.api.rest.ai_news import ai_news, ai_news_detail, ai_news_categories, ai_news_hot
from apps.api.rest.ai_tutorials import ai_tutorials, ai_tutorial_detail, ai_tutorial_categories, ai_tutorial_difficulties

urlpatterns = [
    path("admin/", include(wagtailadmin_urls)),
    path("documents/", include(wagtaildocs_urls)),
    path("django-admin/", admin.site.urls),
    path("api/feed", feed),
    path("api/track", track),
    
    # AI Tools API
    path("api/ai-tools", ai_tools),
    path("api/ai-tools/categories", ai_tool_categories),
    path("api/ai-tools/<int:tool_id>", ai_tool_detail),
    
    # AI News API
    path("api/ai-news", ai_news),
    path("api/ai-news/categories", ai_news_categories),
    path("api/ai-news/hot", ai_news_hot),
    path("api/ai-news/<int:news_id>", ai_news_detail),
    
    # AI Tutorials API
    path("api/ai-tutorials", ai_tutorials),
    path("api/ai-tutorials/categories", ai_tutorial_categories),
    path("api/ai-tutorials/difficulties", ai_tutorial_difficulties),
    path("api/ai-tutorials/<int:tutorial_id>", ai_tutorial_detail),
    path("", include(wagtail_urls)),
]
