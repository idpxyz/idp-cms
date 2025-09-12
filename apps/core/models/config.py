from django.db import models
from django import forms
from django.db.models import JSONField
from wagtail.snippets.models import register_snippet
from wagtail.admin.panels import FieldPanel

@register_snippet
class CustomConfigItem(models.Model):
    """
    自定义配置项模型
    用于管理站点的自定义配置
    """
    name = models.CharField(max_length=100, verbose_name="配置名称")
    key = models.CharField(max_length=100, unique=True, verbose_name="配置键")
    config_type = models.CharField(max_length=20, default='string', verbose_name="配置类型")
    default_value = models.TextField(blank=True, verbose_name="默认值")
    description = models.TextField(blank=True, verbose_name="配置描述")
    is_active = models.BooleanField(default=True, verbose_name="是否启用")
    order = models.IntegerField(default=0, verbose_name="排序")
    value = models.JSONField(default=dict, blank=True, verbose_name="配置值")
    created_at = models.DateTimeField(auto_now_add=True, null=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, null=True, verbose_name="更新时间")
    
    panels = [
        FieldPanel('name'),
        FieldPanel('key'),
        FieldPanel('config_type', widget=forms.Select(choices=[
            ('boolean', '布尔值'),
            ('string', '字符串'),
            ('integer', '整数'),
            ('float', '浮点数'),
            ('json', 'JSON对象'),
        ])),
        FieldPanel('default_value'),
        FieldPanel('description'),
        FieldPanel('is_active'),
        FieldPanel('order'),
        FieldPanel('value'),
    ]
    
    class Meta:
        verbose_name = "自定义配置项"
        verbose_name_plural = "自定义配置项"
        ordering = ['order', 'name']
        db_table = "core_custom_config_item"
    
    def __str__(self):
        return f"{self.name} ({self.key})"
