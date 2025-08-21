from django.db import models
from wagtail.fields import RichTextField
from wagtail.models import Page
from wagtail.search import index
from taggit.models import TaggedItemBase
from modelcluster.fields import ParentalKey
from taggit.managers import TaggableManager
from wagtail.admin.panels import FieldPanel, MultiFieldPanel

class AINewsPageTag(TaggedItemBase):
    content_object = ParentalKey('AINewsPage', related_name='tagged_items', on_delete=models.CASCADE)

class AINewsPage(Page):
    """AI资讯页面模型"""
    
    # 继承自ArticlePage的字段
    introduction = models.TextField(blank=True, verbose_name="摘要")
    body = RichTextField(features=["bold","italic","link","image"], verbose_name="正文")
    channel_slug = models.SlugField(default="ai-news", verbose_name="频道标识")
    topic_slug = models.SlugField(blank=True, default="", verbose_name="话题标识")
    author_name = models.CharField(max_length=64, blank=True, default="", verbose_name="作者")
    has_video = models.BooleanField(default=False, verbose_name="包含视频")
    region = models.CharField(max_length=32, default="global", verbose_name="地区")
    language = models.CharField(max_length=8, default="zh", verbose_name="语言")
    
    # AI资讯特有字段
    source = models.CharField(max_length=100, blank=True, verbose_name="来源")
    source_url = models.URLField(blank=True, verbose_name="来源链接")
    image_url = models.URLField(blank=True, verbose_name="配图链接")
    
    # 分类信息
    category = models.CharField(
        max_length=50,
        choices=[
            ('technology', '技术突破'),
            ('product', '产品发布'),
            ('investment', '投资融资'),
            ('research', '研究突破'),
            ('policy', '政策法规'),
            ('industry', '行业动态'),
            ('startup', '创业公司'),
            ('academic', '学术研究'),
        ],
        default='technology',
        verbose_name="资讯分类"
    )
    
    # 状态标记
    is_hot = models.BooleanField(default=False, verbose_name="热门资讯")
    is_top = models.BooleanField(default=False, verbose_name="置顶资讯")
    
    # 统计信息
    read_count = models.IntegerField(default=0, verbose_name="阅读次数")
    
    # 标签
    tags = TaggableManager(through=AINewsPageTag, blank=True, verbose_name="标签")
    
    # 内容面板配置
    content_panels = Page.content_panels + [
        FieldPanel('introduction'),
        FieldPanel('body'),
        FieldPanel('source'),
        FieldPanel('source_url'),
        FieldPanel('image_url'),
        FieldPanel('category'),
        FieldPanel('is_hot'),
        FieldPanel('is_top'),
        FieldPanel('read_count'),
        FieldPanel('tags'),
        FieldPanel('channel_slug'),
        FieldPanel('topic_slug'),
        FieldPanel('author_name'),
        FieldPanel('has_video'),
        FieldPanel('region'),
        FieldPanel('language'),
    ]
    
    # 搜索配置
    search_fields = Page.search_fields + [
        index.SearchField('introduction'),
        index.SearchField('body'),
        index.FilterField('source'),
        index.FilterField('category'),
        index.FilterField('tags'),
    ]
    
    class Meta:
        verbose_name = "AI资讯"
        verbose_name_plural = "AI资讯"
    
    def __str__(self):
        return self.title
