"""
新闻文章模型 - 专业编辑界面优化版本

设计原则：
1. 编辑优先 - 突出编辑最常用的功能
2. 工作流导向 - 按照新闻编辑的实际工作流程组织界面
3. 简洁直观 - 减少技术术语，使用编辑熟悉的概念
4. 渐进式暴露 - 核心功能置顶，高级功能可收起
"""

from django.db import models
from django import forms
from wagtail.fields import RichTextField
from wagtail.models import Page, Site
from wagtail.admin.panels import (
    FieldPanel, MultiFieldPanel, TabbedInterface, ObjectList,
    InlinePanel, PageChooserPanel, HelpPanel
)
from wagtail.admin.widgets import AdminDateTimeInput
from taggit.models import TaggedItemBase
from modelcluster.fields import ParentalKey
from taggit.managers import TaggableManager


class ArticlePageEnhanced(Page):
    """专业新闻编辑优化的文章模型"""
    
    # === 核心内容 ===
    subtitle = models.CharField(max_length=200, blank=True, verbose_name="副标题")
    excerpt = models.TextField(blank=True, verbose_name="摘要", 
                              help_text="简要概括文章内容，建议50-100字")
    
    body = RichTextField(
        features=["h2", "h3", "h4", "bold", "italic", "link", "ol", "ul", "hr", 
                 "document-link", "image", "embed", "blockquote"],
        verbose_name="正文内容"
    )
    
    cover = models.ForeignKey(
        'wagtailimages.Image',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='+',
        verbose_name="配图"
    )
    
    # === 新闻元信息 ===
    author_name = models.CharField(max_length=100, blank=True, verbose_name="记者")
    editor_name = models.CharField(max_length=100, blank=True, verbose_name="责编")
    source_name = models.CharField(max_length=100, blank=True, verbose_name="来源",
                                  help_text="如：新华社、路透社等")
    
    # 发布时间控制
    publish_at = models.DateTimeField(
        null=True, blank=True, 
        verbose_name="定时发布",
        help_text="留空则立即发布；设置时间可定时发布"
    )
    
    # === 分类与标签 ===
    channel = models.ForeignKey(
        'core.Channel',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='articles',
        verbose_name="频道"
    )
    
    categories = models.ManyToManyField(
        'core.Category',
        blank=True,
        related_name='articles',
        verbose_name="栏目"
    )
    
    topics = models.ManyToManyField(
        'news.Topic',
        blank=True,
        related_name='articles',
        verbose_name="专题"
    )
    
    tags = TaggableManager(blank=True, verbose_name="标签")
    
    # === 新闻属性 ===
    urgency = models.CharField(
        max_length=10,
        choices=[
            ('normal', '一般'),
            ('important', '重要'),
            ('urgent', '紧急'),
            ('breaking', '突发')
        ],
        default='normal',
        verbose_name="重要程度"
    )
    
    news_type = models.CharField(
        max_length=20,
        choices=[
            ('news', '新闻'),
            ('feature', '特稿'),
            ('interview', '专访'),
            ('opinion', '评论'),
            ('analysis', '分析'),
            ('live', '直播')
        ],
        default='news',
        verbose_name="稿件类型"
    )
    
    has_video = models.BooleanField(default=False, verbose_name="包含视频")
    has_audio = models.BooleanField(default=False, verbose_name="包含音频")
    is_exclusive = models.BooleanField(default=False, verbose_name="独家报道")
    
    # === 编辑工作流 ===
    editor_notes = models.TextField(blank=True, verbose_name="编辑备注",
                                   help_text="内部沟通使用，不对外显示")
    
    fact_checked = models.BooleanField(default=False, verbose_name="已核实")
    legal_reviewed = models.BooleanField(default=False, verbose_name="法务审核")
    
    # === 高级设置（通常编辑不需要关心）===
    region = models.ForeignKey(
        'core.Region', 
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='articles',
        verbose_name="地区"
    )
    
    weight = models.IntegerField(default=0, verbose_name="置顶权重",
                                help_text="数值越大越靠前，0为不置顶")
    
    allow_comments = models.BooleanField(default=True, verbose_name="允许评论")
    
    # 定义编辑界面布局
    content_panels = [
        # 核心内容 - 最重要，放在最前面
        MultiFieldPanel([
            HelpPanel("📝 <strong>第一步：撰写内容</strong>"),
            FieldPanel('title', help_text="清晰准确的标题，建议15-30字"),
            FieldPanel('subtitle'),
            FieldPanel('excerpt'),
            FieldPanel('cover'),
            FieldPanel('body'),
        ], heading="📰 文章内容", classname="full"),
        
        # 新闻属性 - 编辑日常关心的属性
        MultiFieldPanel([
            HelpPanel("📋 <strong>第二步：设置文章属性</strong>"),
            FieldPanel('news_type'),
            FieldPanel('urgency'),
            FieldPanel('author_name'),
            FieldPanel('source_name'),
            FieldPanel('publish_at', widget=AdminDateTimeInput),
        ], heading="⚡ 文章属性", classname="collapsed"),
        
        # 分类标签 - 重要但可以后设置
        MultiFieldPanel([
            HelpPanel("🏷️ <strong>第三步：分类归档</strong> - 便于读者发现和检索"),
            FieldPanel('channel'),
            FieldPanel('categories', widget=forms.CheckboxSelectMultiple),
            FieldPanel('topics', widget=forms.CheckboxSelectMultiple),
            FieldPanel('tags'),
        ], heading="📂 分类标签", classname="collapsed"),
        
        # 特殊标记
        MultiFieldPanel([
            FieldPanel('has_video'),
            FieldPanel('has_audio'), 
            FieldPanel('is_exclusive'),
        ], heading="🎯 特殊标记", classname="collapsed"),
    ]
    
    # 编辑工作流面板
    editorial_panels = [
        HelpPanel("👥 <strong>编辑部内部使用</strong> - 协助编辑流程管理"),
        
        MultiFieldPanel([
            FieldPanel('editor_name'),
            FieldPanel('editor_notes'),
        ], heading="✏️ 编辑信息"),
        
        MultiFieldPanel([
            FieldPanel('fact_checked'),
            FieldPanel('legal_reviewed'),
        ], heading="✅ 审核状态"),
    ]
    
    # 高级设置面板（技术人员使用）
    advanced_panels = [
        HelpPanel("⚙️ <strong>高级设置</strong> - 技术配置，一般编辑无需修改"),
        
        MultiFieldPanel([
            FieldPanel('region'),
            FieldPanel('weight'),
            FieldPanel('allow_comments'),
        ], heading="🔧 技术设置"),
        
        # 这里可以添加原有的聚合策略等技术字段
        # 但对普通编辑隐藏
    ]
    
    # 使用标签页界面，分离不同关注点
    edit_handler = TabbedInterface([
        ObjectList(content_panels, heading='📰 内容编辑'),
        ObjectList(editorial_panels, heading='👥 编辑流程'),
        ObjectList(advanced_panels, heading='⚙️ 高级设置'),
    ])
    
    class Meta:
        verbose_name = "文章"
        verbose_name_plural = "文章"
    
    def get_admin_display_title(self):
        """在管理界面中显示的标题"""
        urgency_icons = {
            'breaking': '🚨',
            'urgent': '⚡',
            'important': '📢',
            'normal': ''
        }
        icon = urgency_icons.get(self.urgency, '')
        return f"{icon} {self.title}"
