"""
Web用户系统URL配置
"""
from django.urls import path
from apps.api.rest.web_auth import (
    register, login, logout, profile, update_profile, 
    change_password, verify_token, refresh_token
)
from apps.api.rest.web_users_data import (
    get_reading_history, add_reading_history, delete_reading_history,
    get_user_favorites, add_favorite, remove_favorite,
    get_user_comments, add_comment, delete_comment,
    toggle_interaction, get_user_stats, check_interactions,
    get_article_stats, toggle_article_like, toggle_article_favorite
)

app_name = 'web_users'

urlpatterns = [
    # 认证相关
    path('auth/register/', register, name='register'),
    path('auth/login/', login, name='login'),
    path('auth/logout/', logout, name='logout'),
    path('auth/profile/', profile, name='profile'),
    path('auth/update-profile/', update_profile, name='update_profile'),
    path('auth/change-password/', change_password, name='change_password'),
    path('auth/verify-token/', verify_token, name='verify_token'),
    path('auth/refresh-token/', refresh_token, name='refresh_token'),
    
    # 阅读历史
    path('history/', get_reading_history, name='get_reading_history'),
    path('history/add/', add_reading_history, name='add_reading_history'),
    path('history/<int:history_id>/delete/', delete_reading_history, name='delete_reading_history'),
    
    # 收藏管理
    path('favorites/', get_user_favorites, name='get_user_favorites'),
    path('favorites/add/', add_favorite, name='add_favorite'),
    path('favorites/<str:article_id>/remove/', remove_favorite, name='remove_favorite'),
    
    # 评论管理
    path('comments/', get_user_comments, name='get_user_comments'),
    path('comments/add/', add_comment, name='add_comment'),
    path('comments/<int:comment_id>/delete/', delete_comment, name='delete_comment'),
    
    # 用户互动
    path('interactions/toggle/', toggle_interaction, name='toggle_interaction'),
    path('interactions/check/', check_interactions, name='check_interactions'),
    
    # 用户统计
    path('stats/', get_user_stats, name='get_user_stats'),
    
    # 文章互动统计
    path('articles/<str:article_id>/stats/', get_article_stats, name='get_article_stats'),
    path('articles/<str:article_id>/like/', toggle_article_like, name='toggle_article_like'),
    path('articles/<str:article_id>/favorite/', toggle_article_favorite, name='toggle_article_favorite'),
]
