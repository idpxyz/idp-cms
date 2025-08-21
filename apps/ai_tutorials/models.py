from django.db import models
from wagtail.fields import RichTextField
from wagtail.models import Page
from wagtail.search import index
from taggit.models import TaggedItemBase
from modelcluster.fields import ParentalKey
from taggit.managers import TaggableManager
from wagtail.admin.panels import FieldPanel, MultiFieldPanel

class AITutorialPageTag(TaggedItemBase):
    content_object = ParentalKey('AITutorialPage', related_name='tagged_items', on_delete=models.CASCADE)

class AITutorialPage(Page):
    """AI技术教程页面模型"""
    
    # 基本信息
    introduction = models.TextField(blank=True, verbose_name="教程简介")
    body = RichTextField(features=["bold","italic","link","image","code"], verbose_name="教程内容")
    
    # 教程属性
    difficulty = models.CharField(
        max_length=20,
        choices=[
            ('beginner', '初级'),
            ('intermediate', '中级'),
            ('advanced', '高级'),
        ],
        default='beginner',
        verbose_name="难度等级"
    )
    
    duration = models.CharField(max_length=50, blank=True, verbose_name="预计时长")
    author_name = models.CharField(max_length=64, blank=True, default="", verbose_name="作者")
    
    # 分类信息
    category = models.CharField(
        max_length=50,
        choices=[
            ('chatbot', '聊天机器人'),
            ('image-generation', '图像生成'),
            ('video-generation', '视频生成'),
            ('code-generation', '代码生成'),
            ('ai-fundamentals', 'AI基础'),
            ('data-analysis', '数据分析'),
            ('ai-ethics', 'AI伦理'),
            ('ai-business', 'AI商业'),
            ('nlp', '自然语言处理'),
            ('computer-vision', '计算机视觉'),
            ('machine-learning', '机器学习'),
        ],
        default='ai-fundamentals',
        verbose_name="教程分类"
    )
    
    # 状态标记
    is_hot = models.BooleanField(default=False, verbose_name="热门教程")
    is_free = models.BooleanField(default=True, verbose_name="免费教程")
    
    # 统计信息
    student_count = models.IntegerField(default=0, verbose_name="学习人数")
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00, verbose_name="评分")
    
    # 标签
    tags = TaggableManager(through=AITutorialPageTag, blank=True, verbose_name="标签")
    
    # 元数据
    channel_slug = models.SlugField(default="ai-tutorials", verbose_name="频道标识")
    region = models.CharField(max_length=32, default="global", verbose_name="地区")
    language = models.CharField(max_length=8, default="zh", verbose_name="语言")
    
    # 内容面板配置
    content_panels = Page.content_panels + [
        FieldPanel('introduction'),
        FieldPanel('body'),
        FieldPanel('difficulty'),
        FieldPanel('duration'),
        FieldPanel('author_name'),
        FieldPanel('category'),
        FieldPanel('is_hot'),
        FieldPanel('is_free'),
        FieldPanel('student_count'),
        FieldPanel('rating'),
        FieldPanel('tags'),
        FieldPanel('channel_slug'),
        FieldPanel('region'),
        FieldPanel('language'),
    ]
    
    # 搜索配置
    search_fields = Page.search_fields + [
        index.SearchField('introduction'),
        index.SearchField('body'),
        index.FilterField('category'),
        index.FilterField('tags'),
    ]
    
    class Meta:
        verbose_name = "AI教程"
        verbose_name_plural = "AI教程"
    
    def __str__(self):
        return self.title
