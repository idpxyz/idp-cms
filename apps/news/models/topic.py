from django.db import models
from django import forms
from django.core.cache import cache
from django.utils import timezone
from wagtail.snippets.models import register_snippet
from wagtail.admin.panels import FieldPanel, MultiFieldPanel
from wagtail.images.widgets import AdminImageChooser
from wagtail.images import get_image_model
from wagtail.admin.forms import WagtailAdminModelForm
from wagtail.fields import RichTextField
from django.utils.translation import gettext_lazy as _
from modelcluster.models import ClusterableModel
from taggit.managers import TaggableManager
from taggit.models import TaggedItemBase
from modelcluster.fields import ParentalKey


# 使用 Wagtail 的模型表单基类（用于 snippets）
class TopicForm(WagtailAdminModelForm):
    """
    自定义表单类，用于改进图片选择器的用户体验
    """
    pass


class TopicTaggedItem(TaggedItemBase):
    content_object = ParentalKey(
        'Topic',
        related_name='tagged_items',
        on_delete=models.CASCADE
    )

@register_snippet
class TopicTemplate(ClusterableModel):
    """专题模板管理 - 参考ChannelTemplate设计"""
    
    name = models.CharField(
        max_length=100,
        verbose_name="模板名称",
        help_text="如：突发事件专题模板"
    )
    
    slug = models.SlugField(
        unique=True,
        verbose_name="模板标识",
        help_text="如：breaking，用于匹配专题标签"
    )
    
    file_name = models.CharField(
        max_length=100,
        verbose_name="模板文件名",
        help_text="如：BreakingTopicTemplate.tsx"
    )
    
    description = models.TextField(
        blank=True,
        verbose_name="描述"
    )
    
    is_active = models.BooleanField(
        default=True,
        verbose_name="是否启用"
    )
    
    is_default = models.BooleanField(
        default=False,
        verbose_name="是否为默认模板"
    )
    
    order = models.IntegerField(
        default=0,
        verbose_name="排序"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    panels = [
        MultiFieldPanel([
            FieldPanel('name'),
            FieldPanel('slug'),
            FieldPanel('file_name'),
            FieldPanel('description'),
        ], heading="基本信息"),
        
        MultiFieldPanel([
            FieldPanel('is_active'),
            FieldPanel('is_default'),
            FieldPanel('order'),
        ], heading="状态设置"),
    ]
    
    class Meta:
        verbose_name = "专题模板"
        verbose_name_plural = "专题模板"
        ordering = ['order', 'name']
        db_table = "news_topic_template"
    
    def __str__(self):
        return self.name
    
    @property
    def file_exists(self):
        """检查模板文件是否存在"""
        import os
        from django.conf import settings
        template_dir = os.path.join(
            settings.BASE_DIR, 
            'sites', 'app', 'portal', 'templates', 'topics'
        )
        file_path = os.path.join(template_dir, self.file_name)
        return os.path.exists(file_path)
    
    @classmethod
    def get_available_templates(cls):
        """获取可用模板"""
        return cls.objects.filter(is_active=True).order_by('order', 'name')
    
    @classmethod
    def get_default_template(cls):
        """获取默认模板"""
        return cls.objects.filter(is_default=True, is_active=True).first()


@register_snippet
class Topic(ClusterableModel):
    """重大事件专题模型 - 专注于国庆、阅兵、地震等重大事件"""
    
    # 使用自定义表单类来改进图片选择器体验
    base_form_class = TopicForm
    
    # === 基本信息 ===
    title = models.CharField(
        max_length=128, 
        verbose_name="专题标题",
        help_text="简洁明确的专题标题，如：四川6.8级地震救援"
    )
    slug = models.SlugField(
        unique=True, 
        verbose_name="专题标识符",
        help_text="用于URL的唯一标识符"
    )
    summary = models.TextField(
        blank=True, 
        verbose_name="专题摘要",
        help_text="专题的简要描述，用于SEO和分享"
    )
    
    # 专题封面
    cover_image = models.ForeignKey(
        'media.CustomImage',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='+',
        verbose_name="专题封面图片"
    )
    
    # === 专题分类 ===
    IMPORTANCE_LEVELS = [
        ('national', '国家级'),      # 全国重大影响
        ('major', '重大级'),         # 重要社会影响  
        ('regional', '区域级'),      # 区域性影响
        ('specialized', '专门级'),   # 特定领域影响
    ]
    importance_level = models.CharField(
        max_length=16,
        choices=IMPORTANCE_LEVELS,
        default='major',
        verbose_name="重要程度",
        help_text="根据事件影响范围选择重要程度"
    )
    
    STATUS_CHOICES = [
        ('upcoming', '即将开始'),     # 预告阶段
        ('ongoing', '正在进行'),      # 进行中
        ('concluded', '已结束'),      # 结束但仍关注
        ('archived', '已归档'),       # 完全结束
        ('memorial', '纪念回顾'),     # 周年纪念等
    ]
    status = models.CharField(
        max_length=16,
        choices=STATUS_CHOICES,
        default='upcoming',
        verbose_name="专题状态",
        help_text="专题当前的生命周期状态"
    )
    
    # === 控制字段 ===
    is_active = models.BooleanField(
        default=True,
        verbose_name="是否启用",
        help_text="控制专题是否在前台显示"
    )
    is_featured = models.BooleanField(
        default=False,
        verbose_name="是否推荐",
        help_text="是否在首页等重要位置推荐展示"
    )
    is_breaking = models.BooleanField(
        default=False,
        verbose_name="是否突发重大事件",
        help_text="突发事件会获得最高展示优先级"
    )
    priority_weight = models.IntegerField(
        default=100,
        verbose_name="优先权重",
        help_text="数值越大优先级越高，范围：1-2000，突发事件可设置为1000+"
    )
    order = models.IntegerField(default=0, verbose_name="排序")
    
    # === 模板系统 ===（参考Channel模板设计）
    template = models.ForeignKey(
        'TopicTemplate',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        verbose_name="专题模板",
        help_text="选择专题的显示模板，如突发事件模板、国家级专题模板等"
    )
    
    # === 多站点支持 ===
    sites = models.ManyToManyField(
        'wagtailcore.Site', 
        blank=True, 
        verbose_name="关联站点"
    )
    
    # === 标签系统 ===
    tags = TaggableManager(
        through=TopicTaggedItem, 
        blank=True, 
        verbose_name="专题标签",
        help_text="用于分类和模板映射的灵活标签系统"
    )
    
    # 时间字段
    start_date = models.DateTimeField(null=True, blank=True, verbose_name="专题开始时间")
    end_date = models.DateTimeField(null=True, blank=True, verbose_name="专题结束时间")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")
    
    panels = [
        MultiFieldPanel([
            FieldPanel('title'),
            FieldPanel('slug'),
            FieldPanel('summary'),
            FieldPanel('cover_image'),
        ], heading="基本信息"),
        
        MultiFieldPanel([
            FieldPanel('importance_level'),
            FieldPanel('status'),
            FieldPanel('template'),
        ], heading="专题分类"),
        
        MultiFieldPanel([
            FieldPanel('is_active'),
            FieldPanel('is_featured'),
            FieldPanel('is_breaking'),
            FieldPanel('priority_weight'),
            FieldPanel('order'),
        ], heading="显示设置"),
        
        MultiFieldPanel([
            FieldPanel('start_date'),
            FieldPanel('end_date'),
        ], heading="时间设置"),
        
        MultiFieldPanel([
            FieldPanel('sites'),
        ], heading="站点关联"),
        
        MultiFieldPanel([
            FieldPanel('tags'),
        ], heading="标签分类"),
    ]
    
    class Meta:
        verbose_name = "重大事件专题"
        verbose_name_plural = "重大事件专题"
        ordering = [
            '-is_breaking',        # 突发事件优先
            '-priority_weight',    # 权重优先
            '-is_featured',        # 推荐优先
            'order',               # 排序优先
            '-start_date',         # 时间优先
        ]
        db_table = "news_topic"
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['importance_level', 'status']), 
            models.Index(fields=['status', 'is_active']),
            models.Index(fields=['-priority_weight', '-created_at']),
            models.Index(fields=['is_breaking', 'is_featured']),
            models.Index(fields=['template', 'is_active']),
            models.Index(fields=['start_date', 'end_date']),
        ]
    
    def __str__(self):
        return self.title
        
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.clear_cache()
        
    def delete(self, *args, **kwargs):
        self.clear_cache()
        super().delete(*args, **kwargs)
        
    def clear_cache(self):
        """清除相关缓存"""
        cache.delete_many([
            f'topic_{self.slug}',
            f'topics_featured',
        ])
    
    @property
    def is_current(self):
        """判断专题是否在进行中"""
        from django.utils import timezone
        now = timezone.now()
        
        if self.start_date and now < self.start_date:
            return False
        if self.end_date and now > self.end_date:
            return False
        return True
    
    @property
    def article_count(self):
        """获取专题下的文章数量"""
        return self.articles.filter(live=True).count()
    
    def clean(self):
        """数据验证"""
        from django.core.exceptions import ValidationError
        super().clean()
        
        # 验证时间设置
        if self.start_date and self.end_date:
            if self.start_date >= self.end_date:
                raise ValidationError({
                    'end_date': '结束时间必须晚于开始时间'
                })
        
        # 验证优先级权重范围
        if self.priority_weight < 1 or self.priority_weight > 2000:
            raise ValidationError({
                'priority_weight': '优先权重必须在1-2000范围内'
            })
        
        # 突发事件的特殊验证
        if self.is_breaking:
            if self.importance_level not in ['national', 'major']:
                raise ValidationError({
                    'importance_level': '突发重大事件应设置为国家级或重大级'
                })
            if self.priority_weight < 500:
                raise ValidationError({
                    'priority_weight': '突发事件的优先权重建议设置为500以上'
                })
    
    @classmethod
    def get_featured_topics(cls, site=None, limit=None):
        """获取推荐专题"""
        queryset = cls.objects.filter(is_active=True, is_featured=True)
        
        if site:
            queryset = queryset.filter(sites=site)
            
        queryset = queryset.order_by('order', '-created_at')
        
        if limit:
            queryset = queryset[:limit]
            
        return queryset
    
    @classmethod
    def get_current_topics(cls, site=None):
        """获取当前进行中的专题"""
        from django.utils import timezone
        now = timezone.now()
        
        queryset = cls.objects.filter(
            is_active=True,
            status='ongoing'
        )
        
        if site:
            queryset = queryset.filter(sites=site)
            
        return queryset.order_by('-is_breaking', '-priority_weight', '-is_featured', 'order')
    
    @classmethod
    def get_breaking_topics(cls, site=None):
        """获取突发重大事件专题"""
        queryset = cls.objects.filter(
            is_active=True,
            is_breaking=True,
            status__in=['ongoing', 'concluded']
        )
        
        if site:
            queryset = queryset.filter(sites=site)
            
        return queryset.order_by('-priority_weight', '-created_at')
    
    @classmethod
    def get_topics_by_importance(cls, importance_level, site=None):
        """按重要程度获取专题"""
        queryset = cls.objects.filter(
            is_active=True,
            importance_level=importance_level
        )
        
        if site:
            queryset = queryset.filter(sites=site)
            
        return queryset.order_by('-is_breaking', '-priority_weight', '-is_featured')
    
    @classmethod
    def get_topics_by_status(cls, status, site=None):
        """按状态获取专题"""
        queryset = cls.objects.filter(
            is_active=True,
            status=status
        )
        
        if site:
            queryset = queryset.filter(sites=site)
            
        return queryset.order_by('-is_breaking', '-priority_weight', '-created_at')
    
    def get_articles(self, limit=None):
        """获取专题下的文章 - 按文章特色、权重和发布时间排序"""
        from apps.news.models import ArticlePage
        # 使用ArticlePage模型中实际存在的字段进行排序
        queryset = ArticlePage.objects.filter(topics=self, live=True).order_by(
            '-is_featured',       # 特色文章优先
            '-weight',            # 文章权重排序
            '-first_published_at' # 发布时间排序
        )
        
        if limit:
            queryset = queryset[:limit]
            
        return queryset
    
    @property
    def status_display(self):
        """获取状态的显示文本"""
        return dict(self.STATUS_CHOICES).get(self.status, self.status)
    
    @property
    def importance_display(self):
        """获取重要程度的显示文本"""
        return dict(self.IMPORTANCE_LEVELS).get(self.importance_level, self.importance_level)
    
    @property
    def is_national_level(self):
        """是否为国家级专题"""
        return self.importance_level == 'national'
    
    @property
    def is_ongoing(self):
        """是否正在进行中"""
        return self.status == 'ongoing'
    
    @property
    def can_auto_archive(self):
        """是否可以自动归档"""
        from django.utils import timezone
        now = timezone.now()
        
        # 如果有结束时间且已过期，可以自动归档
        if self.end_date and now > self.end_date:
            return True
        
        # 如果状态已经是"已结束"超过7天，可以自动归档
        if self.status == 'concluded' and self.updated_at:
            seven_days_ago = now - timezone.timedelta(days=7)
            return self.updated_at < seven_days_ago
        
        return False


# 现在设置表单的 Meta 类
TopicForm.Meta.model = Topic
TopicForm.Meta.fields = '__all__'
