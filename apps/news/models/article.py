from django.db import models
from django import forms
from wagtail.fields import RichTextField
from wagtail.models import Page, Site
from wagtail.admin.panels import FieldPanel, MultiFieldPanel
from taggit.models import TaggedItemBase
from modelcluster.fields import ParentalKey
from taggit.managers import TaggableManager


class ArticlePageTag(TaggedItemBase):
    content_object = ParentalKey('ArticlePage', related_name='tagged_items', on_delete=models.CASCADE)


class ArticlePage(Page):
    """
    文章页面模型
    
    符合专业新闻网站标准，支持多站点聚合策略
    """
    
    # === 基础内容 ===
    excerpt = models.TextField(blank=True, verbose_name="文章摘要", 
                              help_text="文章摘要，用于列表页展示和SEO")
    body = RichTextField(features=["bold","italic","link","image"], verbose_name="正文内容")
    cover = models.ForeignKey(
        'wagtailimages.Image',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='+',
        verbose_name="封面图片"
    )
    
    # === 分类关联 ===
    channel = models.ForeignKey(
        'core.Channel',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='articles',
        verbose_name="频道",
        help_text="⚠️ 请只选择当前站点关联的频道（如上海站点请勿选择北京本地等其他站点专属频道）"
    )
    region = models.ForeignKey(
        'core.Region', 
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='articles',
        verbose_name="地区",
        help_text="⚠️ 请只选择当前站点关联的地区"
    )
    topic_slug = models.SlugField(blank=True, verbose_name="专题标识",
                                 help_text="用于专题聚合的标识符")
    
    # === 新闻专业属性 ===
    author_name = models.CharField(max_length=64, blank=True, verbose_name="作者",
                                  help_text="记者或作者姓名")
    language = models.ForeignKey(
        'core.Language',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        verbose_name="语言",
        help_text="文章的语言"
    )
    has_video = models.BooleanField(default=False, verbose_name="包含视频",
                                   help_text="标记是否包含视频内容")
    tags = TaggableManager(through=ArticlePageTag, blank=True, verbose_name="标签")
    
    # === 聚合策略 ===
    source_site = models.ForeignKey(
        Site,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='sourced_articles',
        verbose_name="来源站点",
        help_text="文章的原始来源站点"
    )
    allow_aggregate = models.BooleanField(default=True, verbose_name="允许聚合",
                                         help_text="是否允许在其他站点聚合显示")
    canonical_url = models.URLField(blank=True, verbose_name="规范链接",
                                   help_text="SEO规范链接，通常指向原始发布地址")
    
    # === 权重排序 ===
    is_featured = models.BooleanField(default=False, verbose_name="置顶推荐",
                                     help_text="是否在首页或频道页置顶显示")
    weight = models.IntegerField(default=0, verbose_name="权重",
                                help_text="数值越大权重越高，影响排序")
    
    # === 时间字段 ===
    publish_at = models.DateTimeField(null=True, blank=True, verbose_name="发布时间",
                                     help_text="实际发布时间，可不同于创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")
    
    # Wagtail管理界面配置
    content_panels = Page.content_panels + [
        MultiFieldPanel([
            FieldPanel('excerpt'),
            FieldPanel('cover'),
            FieldPanel('body'),
        ], heading="内容信息"),
        
        MultiFieldPanel([
            FieldPanel('channel'),
            FieldPanel('region'),
            FieldPanel('topic_slug'),
            FieldPanel('tags'),
        ], heading="分类标签"),
        
        MultiFieldPanel([
            FieldPanel('author_name'),
            FieldPanel('language'),
            FieldPanel('has_video'),
        ], heading="新闻属性"),
        
        MultiFieldPanel([
            FieldPanel('source_site'),
            FieldPanel('allow_aggregate'),
            FieldPanel('canonical_url'),
        ], heading="聚合策略"),
        
        MultiFieldPanel([
            FieldPanel('is_featured'),
            FieldPanel('weight'),
            FieldPanel('publish_at'),
        ], heading="权重排序"),
    ]
    
    def clean(self):
        """
        自定义验证：确保选择的频道和地区与当前站点兼容
        """
        # 先调用父类的clean方法
        super().clean()
        
        # 获取当前站点
        current_site = None
        try:
            # 尝试从路径推断站点
            if hasattr(self, 'path') and self.path:
                # 从路径获取父页面，然后获取站点
                from wagtail.models import Page
                parent_path = self.path[:-4]  # 去掉最后4位
                try:
                    parent_page = Page.objects.get(path=parent_path)
                    current_site = parent_page.get_site()
                except:
                    pass
            
            # 如果还是无法获取，尝试直接获取
            if not current_site:
                current_site = self.get_site()
        except:
            # 如果无法获取站点，跳过验证
            return
        
        # 验证频道
        if self.channel and current_site:
            # 检查频道是否关联到当前站点
            if not self.channel.sites.filter(id=current_site.id).exists():
                from django.core.exceptions import ValidationError
                raise ValidationError({
                    'channel': f'所选频道 "{self.channel.name}" 未关联到当前站点 "{current_site.hostname}"。请选择正确的频道。'
                })
        
        # 验证地区
        if self.region and current_site:
            # 检查地区是否关联到当前站点
            if not self.region.sites.filter(id=current_site.id).exists():
                from django.core.exceptions import ValidationError
                raise ValidationError({
                    'region': f'所选地区 "{self.region.name}" 未关联到当前站点 "{current_site.hostname}"。请选择正确的地区。'
                })
    
    class Meta:
        verbose_name = "文章"
        verbose_name_plural = "文章"
        indexes = [
            # 设计文档要求的联合索引
            models.Index(fields=['publish_at', 'channel', 'region'], name='art_pub_chan_reg'),
            models.Index(fields=['is_featured', 'weight', 'publish_at'], name='art_feat_weight_pub'),
            models.Index(fields=['language_id', 'region'], name='art_lang_region'),
            models.Index(fields=['has_video', 'is_featured'], name='art_video_feat'),
        ]
    
    def __str__(self):
        return self.title
    
    def get_absolute_url(self):
        """获取文章的绝对URL"""
        if self.canonical_url:
            return self.canonical_url
        return super().get_absolute_url()
    
    def is_aggregated_content(self):
        """判断是否为聚合内容"""
        return self.source_site is not None and self.source_site != self.get_site()
    
    def get_display_content(self):
        """根据聚合策略返回显示内容"""
        if self.is_aggregated_content():
            # 聚合文章只显示摘要
            return self.excerpt
        else:
            # 自产文章显示全文
            return self.body