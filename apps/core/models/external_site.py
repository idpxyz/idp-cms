from django.db import models
from wagtail.snippets.models import register_snippet
from wagtail.admin.panels import FieldPanel
from django.utils.translation import gettext_lazy as _

@register_snippet
class ExternalSite(models.Model):
    """外部网站配置（简化版）"""
    name = models.CharField(max_length=100, verbose_name=_("网站名称"))
    domain = models.URLField(verbose_name=_("网站域名"))
    is_active = models.BooleanField(default=True, verbose_name=_("是否启用"))
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("创建时间"))
    
    class Meta:
        verbose_name = _("外部网站")
        verbose_name_plural = _("外部网站")
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.domain})"
    
    @property
    def display_name(self):
        return f"外部: {self.name}"
    
    panels = [
        FieldPanel('name'),
        FieldPanel('domain'),
        FieldPanel('is_active'),
    ]
