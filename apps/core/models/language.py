from django.db import models
from wagtail.snippets.models import register_snippet
from wagtail.admin.panels import FieldPanel

@register_snippet
class Language(models.Model):
    """
    语言模型
    用于管理支持的语言
    """
    code = models.CharField(max_length=10, unique=True, verbose_name="语言代码")
    name = models.CharField(max_length=50, verbose_name="语言名称")
    native_name = models.CharField(max_length=50, verbose_name="本地语言名称")
    is_active = models.BooleanField(default=True, verbose_name="是否启用")
    order = models.IntegerField(default=0, verbose_name="排序")
    created_at = models.DateTimeField(auto_now_add=True, null=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, null=True, verbose_name="更新时间")
    
    panels = [
        FieldPanel('code'),
        FieldPanel('name'),
        FieldPanel('native_name'),
        FieldPanel('is_active'),
        FieldPanel('order'),
    ]
    
    class Meta:
        verbose_name = "语言"
        verbose_name_plural = "语言"
        ordering = ['order', 'code']
        db_table = "core_language"
    
    def __str__(self):
        return f"{self.name} ({self.code})"