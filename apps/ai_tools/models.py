from django.db import models
from wagtail.fields import RichTextField
from wagtail.models import Page
from wagtail.search import index
from taggit.models import TaggedItemBase
from modelcluster.fields import ParentalKey
from taggit.managers import TaggableManager
from wagtail.admin.panels import FieldPanel, MultiFieldPanel

class AIToolPageTag(TaggedItemBase):
    content_object = ParentalKey('AIToolPage', related_name='tagged_items', on_delete=models.CASCADE)

class AIToolPage(Page):
    """AI工具页面模型"""
    
    # 基本信息
    description = models.TextField(blank=True, verbose_name="工具描述")
    tool_url = models.URLField(verbose_name="工具链接")
    logo_url = models.URLField(blank=True, verbose_name="Logo链接")
    
    # 分类信息
    category = models.CharField(
        max_length=50,
        choices=[
            ('text-generation', '文字生成'),
            ('image-generation', '图像生成'),
            ('video-generation', '视频生成'),
            ('code-generation', '代码生成'),
            ('audio-generation', '音频生成'),
            ('data-analysis', '数据分析'),
            ('chatbot', '聊天机器人'),
            ('translation', '翻译'),
            ('productivity', '生产力'),
            ('research', '研究'),
            ('other', '其他'),
        ],
        default='other',
        verbose_name="工具分类"
    )
    
    # 定价信息
    pricing = models.CharField(
        max_length=20,
        choices=[
            ('free', '免费'),
            ('freemium', '免费版'),
            ('paid', '付费'),
            ('enterprise', '企业版'),
        ],
        default='free',
        verbose_name="定价模式"
    )
    
    # 功能特性
    features = models.JSONField(default=list, verbose_name="功能特性")
    
    # 评分和统计
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00, verbose_name="评分")
    usage_count = models.IntegerField(default=0, verbose_name="使用次数")
    
    # 状态标记
    is_hot = models.BooleanField(default=False, verbose_name="热门工具")
    is_new = models.BooleanField(default=False, verbose_name="新工具")
    
    # 标签
    tags = TaggableManager(through=AIToolPageTag, blank=True, verbose_name="标签")
    
    # 元数据
    channel_slug = models.SlugField(default="ai-tools", verbose_name="频道标识")
    region = models.CharField(max_length=32, default="global", verbose_name="地区")
    language = models.CharField(max_length=8, default="zh", verbose_name="语言")
    
    # 内容面板配置
    content_panels = Page.content_panels + [
        FieldPanel('description'),
        FieldPanel('tool_url'),
        FieldPanel('logo_url'),
        FieldPanel('category'),
        FieldPanel('pricing'),
        FieldPanel('features'),
        FieldPanel('rating'),
        FieldPanel('usage_count'),
        FieldPanel('is_hot'),
        FieldPanel('is_new'),
        FieldPanel('tags'),
        FieldPanel('channel_slug'),
        FieldPanel('region'),
        FieldPanel('language'),
    ]
    
    # 搜索配置
    search_fields = Page.search_fields + [
        index.SearchField('description'),
        index.FilterField('category'),
        index.FilterField('tags'),
    ]
    
    class Meta:
        verbose_name = "AI工具"
        verbose_name_plural = "AI工具"
    
    def __str__(self):
        return self.title
