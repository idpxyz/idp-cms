from django.db import models
from django import forms
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from django.db.models import JSONField
from wagtail.models import Site
from wagtail.snippets.models import register_snippet
from wagtail.admin.panels import FieldPanel, MultiFieldPanel, TabbedInterface, ObjectList, HelpPanel
from wagtail.admin.widgets import AdminDateTimeInput
from django.forms import widgets
import re
import json

@register_snippet
class SiteSettings(models.Model):
    """站点配置
    存储每个站点的具体配置信息，包括功能开关、UI主题、SEO设置等
    """
    site = models.OneToOneField(Site, on_delete=models.CASCADE,
                               related_name='settings', verbose_name="关联站点")
    
    # 品牌配置
    brand_name = models.CharField(max_length=100, verbose_name="品牌名称")
    brand_description = models.TextField(blank=True, verbose_name="品牌描述")
    
    # 品牌图片配置 - 混合方案：既支持图片上传也支持URL
    brand_logo_image = models.ForeignKey(
        'wagtailimages.Image',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='+',
        verbose_name="品牌Logo图片",
        help_text="推荐尺寸：200x60px，支持PNG/SVG格式"
    )
    brand_logo = models.URLField(blank=True, verbose_name="品牌Logo URL",
                               help_text="当未上传图片时使用，或作为外部图片链接")
    
    site_logo_image = models.ForeignKey(
        'wagtailimages.Image',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='+',
        verbose_name="站点Logo图片",
        help_text="推荐尺寸：150x40px，支持PNG/SVG格式"
    )
    logo_url = models.URLField(blank=True, verbose_name="站点Logo URL",
                              help_text="当未上传图片时使用，或作为外部图片链接")
    
    favicon_image = models.ForeignKey(
        'wagtailimages.Image',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='+',
        verbose_name="网站图标图片",
        help_text="推荐尺寸：32x32px或16x16px，ICO/PNG格式"
    )
    favicon_url = models.URLField(blank=True, verbose_name="网站图标URL",
                                 help_text="当未上传图片时使用，或作为外部图片链接")
    
    # 功能开关
    recommendation = models.BooleanField(default=True, verbose_name="推荐系统")
    search_enabled = models.BooleanField(default=True, verbose_name="搜索功能")
    comments_enabled = models.BooleanField(default=False, verbose_name="评论功能")
    user_registration = models.BooleanField(default=True, verbose_name="用户注册")
    social_login = models.BooleanField(default=False, verbose_name="社交登录")
    content_moderation = models.BooleanField(default=False, verbose_name="内容审核")
    api_access = models.BooleanField(default=True, verbose_name="API访问")
    rss_feed = models.BooleanField(default=True, verbose_name="RSS订阅")
    sitemap = models.BooleanField(default=True, verbose_name="站点地图")
    
    # 内容配置
    default_language = models.ForeignKey(
        'Language',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='default_sites',
        verbose_name="默认语言",
        help_text="网站的主要语言，用于内容显示和SEO"
    )
    supported_languages = models.ManyToManyField('Language', blank=True, 
                                               related_name='supported_sites',
                                               verbose_name="支持的语言",
                                               help_text="网站支持的所有语言，影响多语言功能")
    timezone = models.ForeignKey(
        'Timezone',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        verbose_name="时区",
        help_text="网站使用的时区，影响时间显示"
    )
    date_format = models.ForeignKey(
        'DateFormat',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        verbose_name="日期格式",
        help_text="日期显示格式，如：2023-12-25"
    )
    content_retention_days = models.IntegerField(default=365, verbose_name="内容保留天数")
    auto_publish = models.BooleanField(default=False, verbose_name="自动发布")
    content_approval_required = models.BooleanField(default=False, verbose_name="需要内容审核")
    allow_aggregate = models.BooleanField(default=True, verbose_name="允许内容聚合")
    
    # 性能配置
    cache_timeout = models.IntegerField(default=300, verbose_name="缓存超时时间(秒)")
    max_articles_per_page = models.IntegerField(default=20, verbose_name="每页文章数")
    max_search_results = models.IntegerField(default=100, verbose_name="最大搜索结果数")
    api_rate_limit = models.IntegerField(default=1000, verbose_name="API速率限制")
    image_compression = models.BooleanField(default=True, verbose_name="图片压缩")
    cdn_enabled = models.BooleanField(default=False, verbose_name="启用CDN")
    lazy_loading = models.BooleanField(default=True, verbose_name="延迟加载")
    
    # 自定义配置
    custom_settings = models.JSONField(default=dict, blank=True, verbose_name="自定义配置")
    custom_config = models.ManyToManyField('CustomConfigItem', blank=True, verbose_name="自定义配置项",
                                         help_text="选择此站点启用的自定义配置项")
    
    # UI配置
    theme = models.ForeignKey(
        'Theme',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        verbose_name="主题",
        help_text="选择预设的UI主题样式"
    )
    primary_color = models.CharField(max_length=7, default="#3B82F6", verbose_name="主色调")
    secondary_color = models.CharField(max_length=7, default="#6B7280", verbose_name="辅助色")
    font_family = models.ForeignKey(
        'Font',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        verbose_name="字体",
        help_text="选择预设的字体样式"
    )
    show_author = models.BooleanField(default=True, verbose_name="显示作者")
    show_date = models.BooleanField(default=True, verbose_name="显示日期")
    show_breadcrumbs = models.BooleanField(default=True, verbose_name="显示面包屑")
    show_reading_time = models.BooleanField(default=True, verbose_name="显示阅读时间")
    dark_mode_enabled = models.BooleanField(default=True, verbose_name="深色模式")
    
    # SEO配置
    # 站点级别的基础SEO信息
    site_title = models.CharField(max_length=200, blank=True, verbose_name="站点标题", 
                                help_text="站点的主标题，用于首页和全局SEO")
    site_description = models.TextField(blank=True, verbose_name="站点描述",
                                      help_text="站点的主描述，用于首页和全局SEO")
    site_keywords = models.TextField(blank=True, verbose_name="站点关键词",
                                   help_text="站点的核心关键词，用于首页SEO")
    
    # 页面级别的默认SEO模板
    page_title_template = models.CharField(max_length=200, blank=True, verbose_name="页面标题模板",
                                         help_text="页面标题模板，如：{title} - {site_name}")
    page_description_template = models.TextField(blank=True, verbose_name="页面描述模板",
                                                help_text="页面描述的默认模板")
    
    # SEO功能开关
    auto_seo_enabled = models.BooleanField(default=True, verbose_name="启用自动SEO",
                                         help_text="是否自动生成页面的SEO信息")
    robots_txt_enabled = models.BooleanField(default=True, verbose_name="启用robots.txt")
    structured_data = models.BooleanField(default=True, verbose_name="结构化数据")
    social_meta_tags = models.BooleanField(default=True, verbose_name="社交元标签")
    
    # 分析配置
    google_analytics_id = models.CharField(max_length=50, blank=True, verbose_name="Google Analytics ID")
    baidu_analytics_id = models.CharField(max_length=50, blank=True, verbose_name="百度统计ID")
    track_user_behavior = models.BooleanField(default=True, verbose_name="跟踪用户行为")
    track_performance = models.BooleanField(default=True, verbose_name="跟踪性能")
    retention_days = models.IntegerField(default=90, verbose_name="数据保留天数")
    export_enabled = models.BooleanField(default=True, verbose_name="允许数据导出")

    # 区域特定配置
    region = models.ForeignKey('Region', on_delete=models.SET_NULL, null=True, blank=True, verbose_name="所属区域")
    region_order = models.IntegerField(default=0, verbose_name="区域排序")

    # 前端布局配置
    theme_key = models.CharField(max_length=64, default="localsite-default", verbose_name="主题标识", 
                               help_text="主题标识，如：portal, localsite-default, magazine")
    theme_version = models.CharField(max_length=16, default="1.0.0", verbose_name="主题版本",
                                   help_text="语义化版本号，如：1.0.0, 2.1.3")
    layout_key = models.CharField(max_length=64, default="layout-localsite-grid", verbose_name="布局标识",
                                help_text="布局标识，如：layout-portal-classic, layout-localsite-grid")
    brand_tokens = models.JSONField(default=dict, verbose_name="品牌设计令牌",
                                  help_text="品牌设计令牌，JSON格式，如：{'primary': '#4F46E5', 'radius': '1rem'}")
    modules = models.JSONField(default=dict, verbose_name="模块编排配置",
                             help_text="模块编排配置，JSON格式，如：{'home': ['hero','top-news'], 'sidebar': ['rank','ad']}")
    customized = models.BooleanField(default=False, verbose_name="启用站点定制覆盖",
                                   help_text="是否启用站点特定的覆盖组件，启用后将查找 overrides/{host}/ 目录")

    # 元数据
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    # 使用专业的选项卡式界面
    edit_handler = TabbedInterface([
        ObjectList([
            HelpPanel(content="配置站点的基本信息和品牌标识。这些信息将在前端显示并影响SEO。"),
            MultiFieldPanel([
                FieldPanel('brand_name', help_text="显示在页面标题和页脚的品牌名称"),
                FieldPanel('brand_description', widget=widgets.Textarea(attrs={'rows': 3}), 
                          help_text="品牌描述将用于SEO meta标签和about页面"),
            ], heading="品牌信息", icon="tag"),
            
            MultiFieldPanel([
                FieldPanel('brand_logo_image', help_text="推荐尺寸：200x60px，SVG或PNG格式"),
                FieldPanel('brand_logo', help_text="图片上传失败时的备用URL"),
            ], heading="品牌Logo", icon="image"),
            
            MultiFieldPanel([
                FieldPanel('site_logo_image', help_text="推荐尺寸：150x40px，用于页面顶部"),
                FieldPanel('logo_url', help_text="图片上传失败时的备用URL"),
            ], heading="站点Logo", icon="image"),
            
            MultiFieldPanel([
                FieldPanel('favicon_image', help_text="推荐尺寸：32x32px，ICO或PNG格式"),
                FieldPanel('favicon_url', help_text="图片上传失败时的备用URL"),
            ], heading="网站图标", icon="image"),
        ], heading="品牌与标识", icon="home"),
        
        ObjectList([
            HelpPanel(content="控制网站的各项功能开关。关闭功能可以提高性能和安全性。"),
            MultiFieldPanel([
                FieldPanel('recommendation'),
                FieldPanel('search_enabled'), 
                FieldPanel('comments_enabled'),
                FieldPanel('user_registration'),
            ], heading="核心功能", icon="cogs"),
            
            MultiFieldPanel([
                FieldPanel('social_login'),
                FieldPanel('content_moderation'),
                FieldPanel('api_access'),
                FieldPanel('rss_feed'),
                FieldPanel('sitemap'),
            ], heading="扩展功能", icon="plus"),
        ], heading="功能设置", icon="cogs"),
        
        ObjectList([
            HelpPanel(content="配置网站的视觉样式和用户界面。修改后需要清除缓存生效。"),
            MultiFieldPanel([
                FieldPanel('theme'),
                FieldPanel('primary_color', widget=widgets.TextInput(attrs={'type': 'color'})),
                FieldPanel('secondary_color', widget=widgets.TextInput(attrs={'type': 'color'})),
                FieldPanel('font_family'),
            ], heading="主题配置", icon="palette"),
            
            MultiFieldPanel([
                FieldPanel('show_author'),
                FieldPanel('show_date'),
                FieldPanel('show_breadcrumbs'),
                FieldPanel('show_reading_time'),
                FieldPanel('dark_mode_enabled'),
            ], heading="显示选项", icon="view"),
            
            MultiFieldPanel([
                FieldPanel('theme_key'),
                FieldPanel('theme_version'),
                FieldPanel('layout_key'),
                FieldPanel('customized'),
            ], heading="高级主题", icon="code"),
        ], heading="外观设计", icon="image"),
        
        ObjectList([
            HelpPanel(content="优化搜索引擎排名。合理的SEO配置能显著提升网站流量。"),
            MultiFieldPanel([
                FieldPanel('site_title', help_text="显示在搜索结果中的网站标题"),
                FieldPanel('site_description', widget=widgets.Textarea(attrs={'rows': 3}),
                          help_text="网站描述，影响搜索引擎摘要显示"),
                FieldPanel('site_keywords', widget=widgets.Textarea(attrs={'rows': 2}),
                          help_text="用逗号分隔的关键词，如：新闻,科技,资讯"),
            ], heading="基础SEO", icon="search"),
            
            MultiFieldPanel([
                FieldPanel('page_title_template', 
                          help_text="页面标题模板，可用变量：{title}, {site_name}"),
                FieldPanel('page_description_template', widget=widgets.Textarea(attrs={'rows': 2}),
                          help_text="页面描述模板，可用变量：{excerpt}, {title}"),
                FieldPanel('auto_seo_enabled'),
            ], heading="页面SEO", icon="doc-full"),
            
            MultiFieldPanel([
                FieldPanel('robots_txt_enabled'),
                FieldPanel('structured_data'),
                FieldPanel('social_meta_tags'),
            ], heading="SEO功能", icon="cogs"),
        ], heading="SEO优化", icon="search"),
        
        ObjectList([
            HelpPanel(content="配置网站的内容管理和发布规则。"),
            MultiFieldPanel([
                FieldPanel('default_language'),
                FieldPanel('supported_languages', widget=widgets.CheckboxSelectMultiple),
                FieldPanel('timezone'),
                FieldPanel('date_format'),
            ], heading="本地化设置", icon="globe"),
            
            MultiFieldPanel([
                FieldPanel('content_retention_days'),
                FieldPanel('auto_publish'),
                FieldPanel('content_approval_required'),
                FieldPanel('allow_aggregate'),
            ], heading="内容规则", icon="doc-full"),
            
            MultiFieldPanel([
                FieldPanel('region'),
                FieldPanel('region_order'),
            ], heading="区域配置", icon="site"),
        ], heading="内容管理", icon="doc-full"),
        
        ObjectList([
            HelpPanel(content="配置网站性能和分析工具。合理配置可以提升用户体验。"),
            MultiFieldPanel([
                FieldPanel('cache_timeout'),
                FieldPanel('max_articles_per_page'),
                FieldPanel('max_search_results'),
                FieldPanel('api_rate_limit'),
            ], heading="性能设置", icon="time"),
            
            MultiFieldPanel([
                FieldPanel('image_compression'),
                FieldPanel('cdn_enabled'),
                FieldPanel('lazy_loading'),
            ], heading="优化选项", icon="redirect"),
            
            MultiFieldPanel([
                FieldPanel('google_analytics_id'),
                FieldPanel('baidu_analytics_id'),
                FieldPanel('track_user_behavior'),
                FieldPanel('track_performance'),
                FieldPanel('retention_days'),
                FieldPanel('export_enabled'),
            ], heading="数据分析", icon="doc-full-inverse"),
        ], heading="性能分析", icon="time"),
        
        ObjectList([
            HelpPanel(content="高级配置选项，请谨慎修改。不正确的配置可能影响网站功能。"),
            MultiFieldPanel([
                FieldPanel('custom_settings', widget=widgets.Textarea(attrs={'rows': 10}),
                          help_text="JSON格式的自定义配置，如：{\"key\": \"value\"}"),
                FieldPanel('custom_config', widget=widgets.CheckboxSelectMultiple),
            ], heading="自定义配置", icon="code"),
            
            MultiFieldPanel([
                FieldPanel('brand_tokens', widget=widgets.Textarea(attrs={'rows': 5}),
                          help_text="品牌令牌配置，JSON格式"),
                FieldPanel('modules', widget=widgets.Textarea(attrs={'rows': 5}),
                          help_text="模块配置，JSON格式"),
            ], heading="高级选项", icon="cogs"),
        ], heading="高级设置", icon="code"),
    ])
    
    class Meta:
        verbose_name = "站点配置"
        verbose_name_plural = "站点配置"
        db_table = 'core_site_settings'  # 保持现有表名，避免重命名
    
    def __str__(self):
        brand_info = f" - {self.brand_name}" if self.brand_name else ""
        return f"{self.site.site_name} ({self.site.hostname}){brand_info} 配置"
    
    def get_brand_logo_url(self, rendition_spec='fill-200x60'):
        """获取品牌Logo URL，优先使用上传的图片，否则使用URL字段"""
        if self.brand_logo_image:
            try:
                rendition = self.brand_logo_image.get_rendition(rendition_spec)
                return rendition.url
            except:
                pass
        return self.brand_logo
    
    def get_site_logo_url(self, rendition_spec='fill-150x40'):
        """获取站点Logo URL，优先使用上传的图片，否则使用URL字段"""
        if self.site_logo_image:
            try:
                rendition = self.site_logo_image.get_rendition(rendition_spec)
                return rendition.url
            except:
                pass
        return self.logo_url
    
    def get_favicon_url(self, size='32x32'):
        """获取Favicon URL，优先使用上传的图片，否则使用URL字段"""
        if self.favicon_image:
            try:
                rendition = self.favicon_image.get_rendition(f'fill-{size}')
                return rendition.url
            except:
                pass
        return self.favicon_url or '/static/img/favicon.ico'
    
    # 向后兼容方法
    def get_logo_url(self, rendition_spec='fill-200x60'):
        """获取Logo URL (向后兼容)"""
        return self.get_brand_logo_url(rendition_spec) or self.get_site_logo_url(rendition_spec)

    def save(self, *args, **kwargs):
        # 保存后清除相关缓存
        super().save(*args, **kwargs)
        self.clear_cache()
    
    def delete(self, *args, **kwargs):
        # 删除后清除相关缓存
        super().delete(*args, **kwargs)
        self.clear_cache()
    
    def clear_cache(self):
        """清除相关缓存"""
        cache_keys = [
            f"site:{self.site.hostname}",
            f"settings:site:{self.site.hostname}",
            "settings:all"
        ]
        for key in cache_keys:
            cache.delete(key)
    
    def clean(self):
        """验证配置数据"""
        from django.core.exceptions import ValidationError
        from apps.core.serializers import validate_site_settings_data
        
        # 基本数据验证
        # 验证颜色格式
        if self.primary_color and not self._is_valid_color(self.primary_color):
            raise ValidationError({'primary_color': '主色调必须是有效的十六进制颜色代码'})
        
        if self.secondary_color and not self._is_valid_color(self.secondary_color):
            raise ValidationError({'secondary_color': '辅助色必须是有效的十六进制颜色代码'})
        
        # 验证数值范围
        if self.cache_timeout < 0:
            raise ValidationError({'cache_timeout': '缓存超时时间不能为负数'})
        
        if self.max_articles_per_page < 5 or self.max_articles_per_page > 100:
            raise ValidationError({'max_articles_per_page': '每页文章数必须在5-100之间'})
        
        if self.api_rate_limit < 100:
            raise ValidationError({'api_rate_limit': 'API请求限制不能少于100'})
        
        if self.retention_days < 1:
            raise ValidationError({'retention_days': '数据保留天数必须大于0'})
        
        if self.content_retention_days < 1:
            raise ValidationError({'content_retention_days': '内容保留天数必须大于0'})
        
        # 使用序列化器验证主题相关字段
        theme_data = {
            'theme_key': self.theme_key,
            'theme_version': self.theme_version,
            'layout_key': self.layout_key,
            'brand_tokens': self.brand_tokens,
            'modules': self.modules,
            'customized': self.customized,
            'cache_timeout': self.cache_timeout,
        }
        
        try:
            is_valid, validated_data, errors = validate_site_settings_data(theme_data)
            if not is_valid and errors:
                # 转换序列化器错误为Django ValidationError
                django_errors = {}
                for field, field_errors in errors.items():
                    if isinstance(field_errors, list):
                        django_errors[field] = field_errors
                    else:
                        django_errors[field] = [str(field_errors)]
                raise ValidationError(django_errors)
        except Exception as e:
            raise ValidationError({'theme_key': f'主题配置验证失败: {str(e)}'})
            
        # 验证JSON字段格式
        for field, value in [('brand_tokens', self.brand_tokens), 
                           ('modules', self.modules),
                           ('custom_settings', self.custom_settings)]:
            if not isinstance(value, dict):
                raise ValidationError({field: f'{field} 必须是有效的JSON对象'})
                
        # 验证必填字段
        if not self.site_title and not self.brand_name:
            raise ValidationError({'site_title': '站点标题和品牌名称至少需要填写一个'})
    
    def _is_valid_color(self, color):
        """验证颜色格式是否为有效的十六进制颜色"""
        pattern = r'^#(?:[0-9a-fA-F]{3}){1,2}$'
        return bool(re.match(pattern, color))
    
    @property
    def is_production_site(self):
        """是否为生产环境站点"""
        return not self.site.hostname.startswith(('localhost', '127.0.0.1'))
    
    @property
    def supported_languages_list(self):
        """获取支持的语言列表"""
        return [lang.code for lang in self.supported_languages.all()]

    @property
    def current_theme_info(self):
        """获取当前主题信息"""
        return {
            'key': self.theme_key,
            'version': self.theme_version,
            'layout': self.layout_key,
            'tokens': self.brand_tokens,
            'modules': self.modules,
            'is_customized': self.customized
        }

    @property
    def analytics_config(self):
        """获取分析配置"""
        return {
            'google_analytics_id': self.google_analytics_id,
            'baidu_analytics_id': self.baidu_analytics_id,
            'track_user_behavior': self.track_user_behavior,
            'track_performance': self.track_performance,
            'retention_days': self.retention_days,
            'data_export_enabled': self.export_enabled
        }
    
    @property
    def custom_config_dict(self):
        """获取自定义配置字典"""
        try:
            return self.custom_settings
        except (AttributeError, ValueError, TypeError):
            return {}
    
    @property
    def cache_headers(self):
        """获取缓存相关的HTTP头"""
        return {
            'Cache-Control': f'public, s-maxage={self.cache_timeout}, stale-while-revalidate={self.cache_timeout//2}',
            'ETag': f'"{self.updated_at.isoformat()}"'
        }
    
    @property
    def seo_meta(self):
        """获取SEO元数据"""
        return {
            'title': self.site_title or self.site.site_name,
            'description': self.site_description or self.brand_description,
            'keywords': self.default_keywords,
            'robots': 'index, follow' if self.robots_txt_enabled else 'noindex, nofollow'
        }
    
    @property
    def config_summary(self):
        """获取配置摘要"""
        return {
            'site_info': {
                'hostname': self.site.hostname,
                'site_name': self.site.site_name,
                'is_production': self.is_production_site,
            },
            'features': {
                'recommendation': self.recommendation,
                'search': self.search_enabled,
                'comments': self.comments_enabled,
                'user_registration': self.user_registration,
                'social_login': self.social_login,
                'content_moderation': self.content_moderation,
                'api_access': self.api_access,
                'rss_feed': self.rss_feed,
                'sitemap': self.sitemap,
            },
            'ui': {
                'theme': self.theme,
                'primary_color': self.primary_color,
                'secondary_color': self.secondary_color,
                'font_family': self.font_family,
                'dark_mode': self.dark_mode_enabled,
            },
            'performance': {
                'cache_timeout': f"{self.cache_timeout}s",
                'max_articles_per_page': self.max_articles_per_page,
                'api_rate_limit': f"{self.api_rate_limit}/hour",
                'cdn_enabled': self.cdn_enabled,
            },
            'analytics': {
                'google_analytics': bool(self.google_analytics_id),
                'baidu_analytics': bool(self.baidu_analytics_id),
                'track_user_behavior': self.track_user_behavior,
                'track_performance': self.track_performance,
            }
        }
    
    @property
    def config_status(self):
        """获取配置状态"""
        warnings = []
        errors = []
        
        # 检查关键配置
        if not self.brand_name:
            warnings.append("品牌名称未设置")
        
        if not self.site_title:
            warnings.append("站点标题未设置")
        
        if not self.site_description:
            warnings.append("站点描述未设置")
        
        if self.cache_timeout < 60:
            warnings.append("缓存时间过短（建议至少60秒）")
        
        if self.max_articles_per_page > 100:
            warnings.append("每页文章数过多（建议不超过100）")
        
        # 检查生产环境配置
        if self.is_production_site:
            if not self.google_analytics_id and not self.baidu_analytics_id:
                warnings.append("生产环境建议配置分析工具")
            
            if not self.robots_txt_enabled:
                warnings.append("生产环境建议启用robots.txt")
        
        return {
            'is_valid': len(errors) == 0,
            'warnings': warnings,
            'errors': errors,
            'score': max(0, 100 - len(warnings) * 10 - len(errors) * 20)
        }
    
    @classmethod
    def get_for_site(cls, site):
        """获取站点的配置，如果不存在则创建默认配置"""
        # 获取默认值
        try:
            from .language import Language
            from .time_settings import Timezone, DateFormat
            from .theme import Theme, Font
            
            default_language = Language.objects.filter(is_active=True).order_by('order').first()
            default_timezone = Timezone.objects.filter(is_active=True).order_by('order').first()
            default_theme = Theme.objects.filter(is_active=True).order_by('order').first()
            default_font = Font.objects.filter(is_active=True).order_by('order').first()
            default_date_format = DateFormat.objects.filter(is_active=True).order_by('order').first()
        except:
            # 如果模型不存在，使用硬编码默认值
            default_language = "zh"
            default_timezone = "Asia/Shanghai"
            default_theme = "default"
            default_font = "Inter, sans-serif"
            default_date_format = "%Y-%m-%d"
        
        settings, created = cls.objects.get_or_create(
            site=site,
            defaults={
                "brand_name": site.site_name,
                "default_language": getattr(default_language, 'code', default_language) if hasattr(default_language, 'code') else default_language,
                "timezone": getattr(default_timezone, 'value', default_timezone) if hasattr(default_timezone, 'value') else default_timezone,
                "cache_timeout": 300,
                "max_articles_per_page": 20,
                "track_user_behavior": True,
                # 功能开关默认值
                "recommendation": True,
                "search_enabled": True,
                "comments_enabled": False,
                "user_registration": True,
                "social_login": False,
                "content_moderation": False,
                "api_access": True,
                "rss_feed": True,
                "sitemap": True,
                # UI主题默认值
                "theme": getattr(default_theme, 'key', default_theme) if hasattr(default_theme, 'key') else default_theme,
                "primary_color": "#3B82F6",
                "secondary_color": "#6B7280",
                "font_family": getattr(default_font, 'css_value', default_font) if hasattr(default_font, 'css_value') else default_font,
                "show_breadcrumbs": True,
                "show_reading_time": True,
                "dark_mode_enabled": True,
                # SEO默认值
                "robots_txt_enabled": True,
                "structured_data": True,
                "social_meta_tags": True,
                # 分析默认值
                "track_performance": True,
                "retention_days": 90,
                "export_enabled": True,
                # 内容默认值
                "timezone": getattr(default_timezone, 'value', default_timezone) if hasattr(default_timezone, 'value') else default_timezone,
                "date_format": getattr(default_date_format, 'format_string', default_date_format) if hasattr(default_date_format, 'format_string') else default_date_format,
                "content_retention_days": 365,
                "auto_publish": False,
                "content_approval_required": False,
                "allow_aggregate": True,
                # 性能默认值
                "max_search_results": 100,
                "api_rate_limit": 1000,
                "image_compression": True,
                "cdn_enabled": False,
                "lazy_loading": True,
                # 区域默认值
                "region": None,
                "region_order": 0,
            }
        )
        return settings
