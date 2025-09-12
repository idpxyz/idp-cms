from django.db import models
from django.db.models import JSONField
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from wagtail.snippets.models import register_snippet
from wagtail.admin.panels import FieldPanel, MultiFieldPanel, HelpPanel

@register_snippet
class Theme(models.Model):
    """
    主题模型
    用于管理可用的UI主题
    """
    name = models.CharField(max_length=50, verbose_name="主题名称")
    key = models.CharField(max_length=50, unique=True, verbose_name="主题标识")
    description = models.TextField(blank=True, verbose_name="主题描述")
    preview_image = models.URLField(blank=True, verbose_name="预览图片URL")
    is_active = models.BooleanField(default=True, verbose_name="是否启用")
    order = models.IntegerField(default=0, verbose_name="排序")
    configuration = models.JSONField(default=dict, blank=True, verbose_name="主题配置")
    created_at = models.DateTimeField(auto_now_add=True, null=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, null=True, verbose_name="更新时间")
    
    panels = [
        FieldPanel('name'),
        FieldPanel('key'),
        FieldPanel('description'),
        FieldPanel('preview_image'),
        FieldPanel('is_active'),
        FieldPanel('order'),
        FieldPanel('configuration'),
    ]
    
    class Meta:
        verbose_name = "主题"
        verbose_name_plural = "主题"
        ordering = ['order', 'name']
        db_table = "core_theme"
    
    def __str__(self):
        return f"🎨 {self.name} - {self.key}"
    
    def theme_preview(self):
        """
        返回主题预览HTML
        """
        config = self.configuration or {}
        primary_color = config.get('primary_color', '#007cba')
        secondary_color = config.get('secondary_color', '#666666')
        background_color = config.get('background_color', '#ffffff')
        
        return format_html(
            '<div style="display: flex; align-items: center; gap: 10px;">'
            '<div style="width: 60px; height: 40px; border-radius: 4px; background: linear-gradient(135deg, {} 0%, {} 100%); border: 1px solid #ddd;"></div>'
            '<div>'
            '<div style="font-weight: 500; color: {};">{}</div>'
            '<div style="font-size: 12px; color: #666;">{}</div>'
            '</div>'
            '</div>',
            primary_color,
            secondary_color,
            primary_color,
            self.name,
            self.description[:50] + '...' if len(self.description) > 50 else self.description
        )
    theme_preview.short_description = "主题预览"


@register_snippet
class Font(models.Model):
    """
    字体模型
    用于管理可用的字体
    """
    name = models.CharField(max_length=100, verbose_name="字体名称")
    css_value = models.CharField(max_length=200, verbose_name="CSS值")
    category = models.CharField(max_length=50, verbose_name="字体分类")
    description = models.TextField(blank=True, verbose_name="字体描述")
    is_active = models.BooleanField(default=True, verbose_name="是否启用")
    order = models.IntegerField(default=0, verbose_name="排序")
    created_at = models.DateTimeField(auto_now_add=True, null=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, null=True, verbose_name="更新时间")
    
    panels = [
        MultiFieldPanel([
            HelpPanel(content=mark_safe('<div id="font-preview-area"></div>')),
            FieldPanel('name'),
            FieldPanel('css_value'),
        ], heading="字体基本信息"),
        MultiFieldPanel([
            FieldPanel('category'),
            FieldPanel('description'),
        ], heading="分类描述"),
        MultiFieldPanel([
            FieldPanel('is_active'),
            FieldPanel('order'),
        ], heading="显示设置"),
    ]
    
    class Meta:
        verbose_name = "字体"
        verbose_name_plural = "字体"
        ordering = ['order', 'name']
        db_table = "core_font"
    
    def __str__(self):
        return f"🔤 {self.name} - {self.css_value}"
    
    def font_preview(self):
        """
        返回字体预览HTML
        """
        preview_text = "字体预览 Font Preview 1234567890"
        return format_html(
            '<div style="font-family: {}; font-size: 16px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9; margin: 4px 0;">'
            '<div style="font-weight: normal;">{}</div>'
            '<div style="font-weight: bold; margin-top: 4px;">字体预览 Font Preview (Bold)</div>'
            '<div style="font-style: italic; margin-top: 4px; color: #666;">字体预览 Font Preview (Italic)</div>'
            '<div style="font-size: 12px; color: #888; margin-top: 4px;">CSS: {}</div>'
            '</div>',
            self.css_value,
            preview_text,
            self.css_value
        )
    font_preview.short_description = "字体效果预览"
    
    def admin_display_name(self):
        """
        在admin列表中显示带字体效果的名称
        """
        return format_html(
            '<span style="font-family: {}; font-size: 14px; font-weight: 500;">{}</span>'
            '<br><small style="color: #666; font-family: inherit;">{}</small>',
            self.css_value,
            self.name,
            self.css_value
        )
    admin_display_name.short_description = "字体名称"
