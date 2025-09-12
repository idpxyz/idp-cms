from django.db import models
from django.db.models import JSONField
from wagtail.snippets.models import register_snippet
from wagtail.admin.panels import FieldPanel
from django.utils.translation import gettext_lazy as _

@register_snippet
class CDNProvider(models.Model):
    """CDN服务提供商模型"""
    name = models.CharField(max_length=100, verbose_name=_("CDN名称"))
    provider_type = models.CharField(
        max_length=50, 
        choices=[
            ('aliyun', '阿里云CDN'),
            ('tencent', '腾讯云CDN'),
            ('baidu', '百度云CDN'),
            ('cloudflare', 'Cloudflare'),
            ('aws', 'AWS CloudFront'),
            ('azure', 'Azure CDN'),
            ('custom', '自定义CDN'),
        ],
        verbose_name=_("CDN类型")
    )
    api_key = models.CharField(max_length=255, verbose_name=_("API密钥"))
    api_secret = models.CharField(max_length=255, verbose_name=_("API密钥"))
    endpoint_url = models.URLField(verbose_name=_("API端点"))
    is_active = models.BooleanField(default=True, verbose_name=_("是否启用"))
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("创建时间"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("更新时间"))
    
    class Meta:
        verbose_name = _("CDN服务提供商")
        verbose_name_plural = _("CDN服务提供商")
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.get_provider_type_display()})"
    
    # Wagtail管理面板
    panels = [
        FieldPanel('name'),
        FieldPanel('provider_type'),
        FieldPanel('api_key'),
        FieldPanel('api_secret'),
        FieldPanel('endpoint_url'),
        FieldPanel('is_active'),
    ]


@register_snippet
class SiteCDNConfig(models.Model):
    """站点CDN配置模型"""
    site = models.OneToOneField('wagtailcore.Site', on_delete=models.CASCADE, verbose_name=_("站点"))
    cdn_provider = models.ForeignKey(CDNProvider, on_delete=models.CASCADE, verbose_name=_("CDN服务提供商"))
    
    # CDN域名配置
    cdn_domain = models.CharField(max_length=255, verbose_name=_("CDN域名"))
    cdn_ssl_enabled = models.BooleanField(default=True, verbose_name=_("启用HTTPS"))
    
    # 缓存策略
    cache_strategy = models.CharField(
        max_length=50,
        choices=[
            ('aggressive', '激进缓存'),
            ('balanced', '平衡缓存'),
            ('conservative', '保守缓存'),
        ],
        default='balanced',
        verbose_name=_("缓存策略")
    )
    
    # 地区配置
    regions = models.ManyToManyField('Region', blank=True, verbose_name=_("服务地区"))
    
    # 自定义配置
    custom_config = models.JSONField(default=dict, verbose_name=_("自定义配置"))
    
    # 状态和统计
    is_active = models.BooleanField(default=True, verbose_name=_("是否启用"))
    last_cache_purge = models.DateTimeField(null=True, blank=True, verbose_name=_("最后缓存清除时间"))
    cache_hit_rate = models.FloatField(default=0.0, verbose_name=_("缓存命中率"))
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("创建时间"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("更新时间"))
    
    class Meta:
        verbose_name = _("站点CDN配置")
        verbose_name_plural = _("站点CDN配置")
    
    def __str__(self):
        return f"{self.site.site_name} - {self.cdn_provider.name} CDN配置"
    
    def get_cache_timeout(self):
        """获取缓存超时时间"""
        strategy_timeouts = {
            'aggressive': 3600,    # 1小时
            'balanced': 1800,      # 30分钟
            'conservative': 900,   # 15分钟
        }
        return strategy_timeouts.get(self.cache_strategy, 1800)
    
    def get_surrogate_keys(self):
        """获取Surrogate-Key缓存标签"""
        keys = [f"site:{self.site.hostname}"]
        
        # 添加地区标签
        for region in self.regions.all():
            keys.append(f"region:{region.slug}")
        
        # 添加CDN提供商标签
        keys.append(f"cdn:{self.cdn_provider.provider_type}")
        
        return keys
    
    # Wagtail管理面板
    panels = [
        FieldPanel('site'),
        FieldPanel('cdn_provider'),
        FieldPanel('cdn_domain'),
        FieldPanel('cdn_ssl_enabled'),
        FieldPanel('cache_strategy'),
        FieldPanel('regions'),
        FieldPanel('custom_config'),
        FieldPanel('is_active'),
    ]
