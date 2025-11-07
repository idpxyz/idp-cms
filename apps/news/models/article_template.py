"""
文章模板模型
允许用户创建和管理可重用的文章模板
"""

from django.db import models
from django.utils.translation import gettext_lazy as _
from wagtail.admin.panels import FieldPanel, MultiFieldPanel
from wagtail.snippets.models import register_snippet
from wagtail.fields import RichTextField
from modelcluster.models import ClusterableModel


@register_snippet
class ArticleTemplate(ClusterableModel):
    """
    文章模板
    用于快速创建具有预定义结构和内容的文章
    """
    
    TEMPLATE_TYPE_CHOICES = [
        ('news', '📰 新闻稿'),
        ('interview', '🎤 专访'),
        ('review', '📝 评论'),
        ('feature', '✨ 特写'),
        ('announcement', '📢 公告'),
        ('tutorial', '📚 教程'),
        ('other', '📄 其他'),
    ]
    
    # 基本信息
    name = models.CharField(
        max_length=200,
        verbose_name=_("模板名称"),
        help_text=_("为模板起一个易于识别的名称")
    )
    
    template_type = models.CharField(
        max_length=50,
        choices=TEMPLATE_TYPE_CHOICES,
        default='news',
        verbose_name=_("模板类型"),
        help_text=_("选择模板适用的文章类型")
    )
    
    description = models.TextField(
        blank=True,
        verbose_name=_("模板描述"),
        help_text=_("说明此模板的用途和使用场景")
    )
    
    # 文章内容模板
    title_template = models.CharField(
        max_length=500,
        blank=True,
        verbose_name=_("标题模板"),
        help_text=_("例如：【{类别}】{主题} - {副标题}")
    )
    
    excerpt_template = models.TextField(
        blank=True,
        verbose_name=_("摘要模板"),
        help_text=_("文章摘要的默认文本或结构")
    )
    
    body_template = RichTextField(
        blank=True,
        verbose_name=_("正文模板"),
        help_text=_("文章正文的默认结构，可包含占位符")
    )
    
    # 默认设置
    default_channel = models.ForeignKey(
        'core.Channel',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name=_("默认频道"),
        help_text=_("使用此模板创建文章时的默认频道")
    )
    
    default_tags = models.CharField(
        max_length=500,
        blank=True,
        verbose_name=_("默认标签"),
        help_text=_("使用此模板时自动添加的标签，用逗号分隔")
    )
    
    default_author_name = models.CharField(
        max_length=200,
        blank=True,
        verbose_name=_("默认作者"),
        help_text=_("使用此模板时的默认作者名称")
    )
    
    # 元信息
    is_active = models.BooleanField(
        default=True,
        verbose_name=_("启用"),
        help_text=_("禁用后将不再显示在模板列表中")
    )
    
    usage_count = models.IntegerField(
        default=0,
        verbose_name=_("使用次数"),
        help_text=_("记录此模板被使用的次数")
    )
    
    created_by = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_templates',
        verbose_name=_("创建者")
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("创建时间")
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name=_("更新时间")
    )
    
    panels = [
        MultiFieldPanel([
            FieldPanel('name'),
            FieldPanel('template_type'),
            FieldPanel('description'),
            FieldPanel('is_active'),
        ], heading=_("基本信息")),
        
        MultiFieldPanel([
            FieldPanel('title_template'),
            FieldPanel('excerpt_template'),
            FieldPanel('body_template'),
        ], heading=_("内容模板")),
        
        MultiFieldPanel([
            FieldPanel('default_channel'),
            FieldPanel('default_tags'),
            FieldPanel('default_author_name'),
        ], heading=_("默认设置")),
    ]
    
    class Meta:
        verbose_name = _("文章模板")
        verbose_name_plural = _("文章模板")
        ordering = ['-usage_count', '-created_at']
    
    def __str__(self):
        return f"{self.get_template_type_display()} - {self.name}"
    
    def increment_usage(self):
        """增加使用计数"""
        self.usage_count += 1
        self.save(update_fields=['usage_count'])
    
    @classmethod
    def get_popular_templates(cls, limit=5):
        """获取最常用的模板"""
        return cls.objects.filter(is_active=True).order_by('-usage_count')[:limit]
    
    @classmethod
    def get_templates_by_type(cls, template_type):
        """按类型获取模板"""
        return cls.objects.filter(is_active=True, template_type=template_type)

