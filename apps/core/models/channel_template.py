from django.db import models
from wagtail.snippets.models import register_snippet
from wagtail.admin.panels import FieldPanel, MultiFieldPanel
from modelcluster.models import ClusterableModel
import os
from django.conf import settings


@register_snippet
class ChannelTemplate(ClusterableModel):
    """
    🎨 频道模板管理 - 简化版
    只管理模板文件和频道的对应关系
    """
    
    name = models.CharField(
        max_length=100, 
        verbose_name="模板名称",
        help_text="如：社会新闻模板"
    )
    
    slug = models.SlugField(
        unique=True,
        verbose_name="模板标识", 
        help_text="如：social，用于匹配频道slug"
    )
    
    file_name = models.CharField(
        max_length=100,
        verbose_name="模板文件名",
        help_text="如：SocialTemplate.tsx"
    )
    
    description = models.TextField(
        blank=True,
        verbose_name="描述"
    )
    
    is_active = models.BooleanField(
        default=True,
        verbose_name="是否启用"
    )
    
    is_default = models.BooleanField(
        default=False,
        verbose_name="是否为默认模板"
    )
    
    order = models.IntegerField(
        default=0,
        verbose_name="排序"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    panels = [
        MultiFieldPanel([
            FieldPanel('name'),
            FieldPanel('slug'),
            FieldPanel('file_name'),
            FieldPanel('description'),
        ], heading="基本信息"),
        
        MultiFieldPanel([
            FieldPanel('is_active'),
            FieldPanel('is_default'),
            FieldPanel('order'),
        ], heading="状态设置"),
    ]
    
    class Meta:
        verbose_name = "频道模板"
        verbose_name_plural = "频道模板"
        ordering = ['order', 'name']
    
    def __str__(self):
        return self.name
    
    @property
    def file_exists(self):
        """检查模板文件是否存在"""
        template_dir = os.path.join(
            settings.BASE_DIR, 
            'sites', 'app', 'portal', 'templates', 'channels'
        )
        file_path = os.path.join(template_dir, self.file_name)
        return os.path.exists(file_path)
    
    @classmethod
    def get_available_templates(cls):
        """获取可用模板"""
        return cls.objects.filter(is_active=True).order_by('order', 'name')
    
    @classmethod
    def get_default_template(cls):
        """获取默认模板"""
        return cls.objects.filter(is_default=True, is_active=True).first()
