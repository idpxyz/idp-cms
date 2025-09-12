from django.db import models
from wagtail.snippets.models import register_snippet
from wagtail.admin.panels import FieldPanel

@register_snippet
class Timezone(models.Model):
    """
    时区模型
    用于管理可用的时区
    """
    name = models.CharField(max_length=100, verbose_name="时区名称")
    value = models.CharField(max_length=50, unique=True, verbose_name="时区值")
    offset = models.CharField(max_length=20, verbose_name="时区偏移")
    description = models.TextField(blank=True, verbose_name="时区描述")
    is_active = models.BooleanField(default=True, verbose_name="是否启用")
    order = models.IntegerField(default=0, verbose_name="排序")
    created_at = models.DateTimeField(auto_now_add=True, null=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, null=True, verbose_name="更新时间")
    
    panels = [
        FieldPanel('name'),
        FieldPanel('value'),
        FieldPanel('offset'),
        FieldPanel('description'),
        FieldPanel('is_active'),
        FieldPanel('order'),
    ]
    
    class Meta:
        verbose_name = "时区"
        verbose_name_plural = "时区"
        ordering = ['order', 'name']
        db_table = "core_timezone"
    
    def __str__(self):
        return f"{self.name} ({self.value})"


@register_snippet
class DateFormat(models.Model):
    """
    日期格式模型
    用于管理可用的日期格式
    """
    name = models.CharField(max_length=50, verbose_name="格式名称")
    format_string = models.CharField(max_length=50, unique=True, verbose_name="格式字符串")
    example = models.CharField(max_length=50, verbose_name="示例")
    description = models.TextField(blank=True, verbose_name="格式描述")
    is_active = models.BooleanField(default=True, verbose_name="是否启用")
    order = models.IntegerField(default=0, verbose_name="排序")
    created_at = models.DateTimeField(auto_now_add=True, null=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, null=True, verbose_name="更新时间")
    
    panels = [
        FieldPanel('name'),
        FieldPanel('format_string'),
        FieldPanel('example'),
        FieldPanel('description'),
        FieldPanel('is_active'),
        FieldPanel('order'),
    ]
    
    class Meta:
        verbose_name = "日期格式"
        verbose_name_plural = "日期格式"
        ordering = ['order', 'name']
        db_table = "core_date_format"
    
    def __str__(self):
        return f"{self.name} ({self.format_string})"
