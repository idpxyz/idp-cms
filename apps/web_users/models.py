"""
网站前端用户模型

这个应用专门处理网站前端用户的认证和数据管理，
与Wagtail的后台用户系统完全分离。
"""
from django.db import models
from django.contrib.auth.hashers import make_password, check_password
from django.utils import timezone


class WebUser(models.Model):
    """网站前端用户基础模型"""
    
    # 基本认证信息
    username = models.CharField('用户名', max_length=150, unique=True)
    email = models.EmailField('邮箱', unique=True)
    password_hash = models.CharField('密码哈希', max_length=128)
    
    # 个人信息
    nickname = models.CharField('昵称', max_length=50, blank=True)
    avatar = models.URLField('头像', blank=True)
    bio = models.TextField('个人简介', blank=True)
    
    # 用户偏好设置
    reading_preferences = models.JSONField('阅读偏好', default=dict)
    notification_settings = models.JSONField('通知设置', default=dict)
    
    # 状态管理
    is_active = models.BooleanField('激活状态', default=True)
    is_verified = models.BooleanField('邮箱已验证', default=False)
    
    # 时间戳
    date_joined = models.DateTimeField('注册时间', auto_now_add=True)
    last_login = models.DateTimeField('最后登录', null=True, blank=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)
    
    class Meta:
        db_table = 'web_users'
        verbose_name = '网站用户'
        verbose_name_plural = '网站用户'
        ordering = ['-date_joined']
    
    def __str__(self):
        return self.nickname or self.username
    
    def set_password(self, raw_password):
        """设置密码"""
        self.password_hash = make_password(raw_password)
    
    def check_password(self, raw_password):
        """验证密码"""
        return check_password(raw_password, self.password_hash)
    
    def update_last_login(self):
        """更新最后登录时间"""
        self.last_login = timezone.now()
        self.save(update_fields=['last_login'])


class UserProfile(models.Model):
    """用户档案扩展"""
    
    user = models.OneToOneField(WebUser, on_delete=models.CASCADE, related_name='profile')
    
    # 扩展个人信息
    birth_date = models.DateField('出生日期', null=True, blank=True)
    location = models.CharField('所在地', max_length=100, blank=True)
    phone = models.CharField('手机号码', max_length=20, blank=True)
    
    # 兴趣偏好
    preferred_channels = models.JSONField('偏好频道', default=list)
    preferred_categories = models.JSONField('偏好分类', default=list)
    
    # 统计信息
    articles_read = models.IntegerField('阅读文章数', default=0)
    comments_count = models.IntegerField('评论数', default=0)
    favorites_count = models.IntegerField('收藏数', default=0)
    
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)
    
    class Meta:
        db_table = 'web_user_profiles'
        verbose_name = '用户档案'
        verbose_name_plural = '用户档案'
    
    def __str__(self):
        return f'{self.user.username} 的档案'


class ReadingHistory(models.Model):
    """阅读历史记录"""
    
    user = models.ForeignKey(WebUser, on_delete=models.CASCADE, related_name='reading_history')
    article_id = models.CharField('文章ID', max_length=100)
    article_title = models.CharField('文章标题', max_length=200)
    article_slug = models.SlugField('文章链接')
    article_channel = models.CharField('文章频道', max_length=50)
    
    # 阅读信息
    read_time = models.DateTimeField('阅读时间', auto_now_add=True)
    read_duration = models.IntegerField('阅读时长(秒)', default=0)
    read_progress = models.IntegerField('阅读进度(%)', default=0)
    
    class Meta:
        db_table = 'web_reading_history'
        verbose_name = '阅读历史'
        verbose_name_plural = '阅读历史'
        ordering = ['-read_time']
        unique_together = ['user', 'article_id']
    
    def __str__(self):
        return f'{self.user.username} 阅读 {self.article_title}'


class UserComment(models.Model):
    """用户评论"""
    
    STATUS_CHOICES = [
        ('pending', '审核中'),
        ('published', '已发布'),
        ('rejected', '已拒绝'),
    ]
    
    user = models.ForeignKey(WebUser, on_delete=models.CASCADE, related_name='comments')
    article_id = models.CharField('文章ID', max_length=100)
    article_title = models.CharField('文章标题', max_length=200)
    article_slug = models.SlugField('文章链接')
    article_channel = models.CharField('文章频道', max_length=50)
    
    # 评论内容
    content = models.TextField('评论内容')
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, 
                              related_name='replies', verbose_name='父评论')
    
    # 父评论信息（用于显示）
    parent_content = models.TextField('父评论内容', blank=True)
    parent_author = models.CharField('父评论作者', max_length=150, blank=True)
    
    # 状态和统计
    status = models.CharField('状态', max_length=20, choices=STATUS_CHOICES, default='pending')
    likes = models.IntegerField('点赞数', default=0)
    
    # 时间戳
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    updated_at = models.DateTimeField('更新时间', auto_now=True)
    
    class Meta:
        db_table = 'web_user_comments'
        verbose_name = '用户评论'
        verbose_name_plural = '用户评论'
        ordering = ['-created_at']
    
    def __str__(self):
        return f'{self.user.username}: {self.content[:50]}...'


class UserFavorite(models.Model):
    """用户收藏"""
    
    user = models.ForeignKey(WebUser, on_delete=models.CASCADE, related_name='favorites')
    article_id = models.CharField('文章ID', max_length=100)
    article_title = models.CharField('文章标题', max_length=200)
    article_slug = models.SlugField('文章链接')
    article_channel = models.CharField('文章频道', max_length=50)
    article_excerpt = models.TextField('文章摘要', blank=True)
    article_image_url = models.URLField('文章图片', blank=True)
    article_publish_time = models.DateTimeField('文章发布时间', null=True)
    
    created_at = models.DateTimeField('收藏时间', auto_now_add=True)
    
    class Meta:
        db_table = 'web_user_favorites'
        verbose_name = '用户收藏'
        verbose_name_plural = '用户收藏'
        ordering = ['-created_at']
        unique_together = ['user', 'article_id']
    
    def __str__(self):
        return f'{self.user.username} 收藏 {self.article_title}'


class UserInteraction(models.Model):
    """用户互动记录（点赞等）"""
    
    INTERACTION_TYPES = [
        ('like', '点赞'),
        ('dislike', '踩'),
        ('share', '分享'),
        ('view', '查看'),
    ]
    
    user = models.ForeignKey(WebUser, on_delete=models.CASCADE, related_name='interactions')
    target_type = models.CharField('目标类型', max_length=20, choices=[
        ('article', '文章'),
        ('comment', '评论'),
    ])
    target_id = models.CharField('目标ID', max_length=100)
    interaction_type = models.CharField('互动类型', max_length=20, choices=INTERACTION_TYPES)
    
    created_at = models.DateTimeField('创建时间', auto_now_add=True)
    
    class Meta:
        db_table = 'web_user_interactions'
        verbose_name = '用户互动'
        verbose_name_plural = '用户互动'
        ordering = ['-created_at']
        unique_together = ['user', 'target_type', 'target_id', 'interaction_type']
    
    def __str__(self):
        return f'{self.user.username} {self.get_interaction_type_display()} {self.target_type}#{self.target_id}'
