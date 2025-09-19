from django.contrib import admin
from .models import WebUser, UserProfile, ReadingHistory, UserComment, UserFavorite, UserInteraction


@admin.register(WebUser)
class WebUserAdmin(admin.ModelAdmin):
    list_display = ['username', 'email', 'nickname', 'is_active', 'is_verified', 'date_joined', 'last_login']
    list_filter = ['is_active', 'is_verified', 'date_joined']
    search_fields = ['username', 'email', 'nickname']
    readonly_fields = ['password_hash', 'date_joined', 'last_login']
    
    fieldsets = (
        ('基本信息', {
            'fields': ('username', 'email', 'nickname', 'avatar', 'bio')
        }),
        ('状态', {
            'fields': ('is_active', 'is_verified')
        }),
        ('时间戳', {
            'fields': ('date_joined', 'last_login'),
            'classes': ('collapse',)
        }),
        ('设置', {
            'fields': ('reading_preferences', 'notification_settings'),
            'classes': ('collapse',)
        }),
    )


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'location', 'articles_read', 'comments_count', 'favorites_count']
    search_fields = ['user__username', 'user__email', 'location']


@admin.register(ReadingHistory)
class ReadingHistoryAdmin(admin.ModelAdmin):
    list_display = ['user', 'article_title', 'article_channel', 'read_time', 'read_duration', 'read_progress']
    list_filter = ['article_channel', 'read_time']
    search_fields = ['user__username', 'article_title', 'article_channel']


@admin.register(UserComment)
class UserCommentAdmin(admin.ModelAdmin):
    list_display = ['user', 'article_title', 'content_preview', 'status', 'likes', 'created_at']
    list_filter = ['status', 'article_channel', 'created_at']
    search_fields = ['user__username', 'article_title', 'content']
    actions = ['approve_comments', 'reject_comments']
    
    def content_preview(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_preview.short_description = '评论内容'
    
    def approve_comments(self, request, queryset):
        queryset.update(status='approved')
    approve_comments.short_description = '批准选中的评论'
    
    def reject_comments(self, request, queryset):
        queryset.update(status='rejected')
    reject_comments.short_description = '拒绝选中的评论'


@admin.register(UserFavorite)
class UserFavoriteAdmin(admin.ModelAdmin):
    list_display = ['user', 'article_title', 'article_channel', 'created_at']
    list_filter = ['article_channel', 'created_at']
    search_fields = ['user__username', 'article_title', 'article_channel']


@admin.register(UserInteraction)
class UserInteractionAdmin(admin.ModelAdmin):
    list_display = ['user', 'target_type', 'target_id', 'interaction_type', 'created_at']
    list_filter = ['target_type', 'interaction_type', 'created_at']
    search_fields = ['user__username', 'target_id']
