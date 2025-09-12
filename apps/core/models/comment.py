from django.db import models
from django.conf import settings
from wagtail.models import Page
from django.utils.translation import gettext_lazy as _
from modelcluster.fields import ParentalKey
from modelcluster.models import ClusterableModel
from wagtail.admin.panels import FieldPanel, MultiFieldPanel
from wagtail.snippets.models import register_snippet

@register_snippet
class Comment(ClusterableModel):
    """
    评论模型
    """
    page = ParentalKey(
        'wagtailcore.Page',
        on_delete=models.CASCADE,
        related_name='comments',
        verbose_name=_("页面")
    )
    
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='comments',
        verbose_name=_("作者")
    )
    
    author_name = models.CharField(
        max_length=100,
        verbose_name=_("作者名称"),
        help_text=_("未登录用户的显示名称")
    )
    
    author_email = models.EmailField(
        verbose_name=_("作者邮箱"),
        help_text=_("用于接收回复通知")
    )
    
    content = models.TextField(
        verbose_name=_("评论内容")
    )
    
    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='replies',
        verbose_name=_("父评论")
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("创建时间")
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name=_("更新时间")
    )
    
    STATUS_CHOICES = [
        ('pending', _('待审核')),
        ('approved', _('已通过')),
        ('rejected', _('已拒绝')),
        ('spam', _('垃圾评论')),
    ]
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name=_("状态")
    )
    
    is_public = models.BooleanField(
        default=False,
        verbose_name=_("是否公开"),
        help_text=_("只有公开的评论才会显示")
    )
    
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name=_("IP地址")
    )
    
    user_agent = models.TextField(
        blank=True,
        verbose_name=_("User Agent")
    )
    
    spam_score = models.FloatField(
        default=0.0,
        verbose_name=_("垃圾评论得分"),
        help_text=_("自动检测的垃圾评论可能性得分")
    )
    
    # Wagtail管理面板配置
    panels = [
        MultiFieldPanel([
            FieldPanel('page'),
            FieldPanel('author'),
            FieldPanel('author_name'),
            FieldPanel('author_email'),
        ], heading=_("作者信息")),
        
        MultiFieldPanel([
            FieldPanel('content'),
            FieldPanel('parent'),
        ], heading=_("评论内容")),
        
        MultiFieldPanel([
            FieldPanel('status'),
            FieldPanel('is_public'),
            FieldPanel('spam_score'),
        ], heading=_("状态管理")),
        
        MultiFieldPanel([
            FieldPanel('ip_address'),
            FieldPanel('user_agent'),
        ], heading=_("技术信息")),
    ]
    
    class Meta:
        verbose_name = _("评论")
        verbose_name_plural = _("评论")
        ordering = ['-created_at']
        db_table = 'core_comment'
        
    def __str__(self):
        return f"评论 by {self.author_name} on {self.page.title}"
    
    def approve(self):
        """通过评论"""
        self.status = 'approved'
        self.is_public = True
        self.save()
        
    def reject(self):
        """拒绝评论"""
        self.status = 'rejected'
        self.is_public = False
        self.save()
        
    def mark_as_spam(self):
        """标记为垃圾评论"""
        self.status = 'spam'
        self.is_public = False
        self.save()
