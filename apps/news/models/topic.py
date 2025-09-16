from django.db import models
from django import forms
from django.core.cache import cache
from django.utils import timezone
from wagtail.snippets.models import register_snippet
from wagtail.admin.panels import FieldPanel, MultiFieldPanel
from wagtail.fields import RichTextField
from django.utils.translation import gettext_lazy as _
from modelcluster.models import ClusterableModel
from taggit.managers import TaggableManager
from taggit.models import TaggedItemBase
from modelcluster.fields import ParentalKey

class TopicTaggedItem(TaggedItemBase):
    content_object = ParentalKey(
        'Topic',
        related_name='tagged_items',
        on_delete=models.CASCADE
    )

@register_snippet
class Topic(ClusterableModel):
    """专题模型 - 项目化的内容集合"""
    
    title = models.CharField(max_length=128, verbose_name="专题标题")
    slug = models.SlugField(unique=True, verbose_name="专题标识符") 
    summary = models.TextField(blank=True, verbose_name="专题摘要")
    
    # 专题封面
    cover_image = models.ForeignKey(
        'wagtailimages.Image',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='+',
        verbose_name="专题封面图片"
    )
    
    # 多站点支持
    sites = models.ManyToManyField(
        'wagtailcore.Site', 
        blank=True, 
        verbose_name="关联站点"
    )
    
    # 标签系统
    tags = TaggableManager(
        through=TopicTaggedItem, 
        blank=True, 
        verbose_name="标签"
    )
    
    # 控制字段
    is_active = models.BooleanField(default=True, verbose_name="是否启用")
    is_featured = models.BooleanField(default=False, verbose_name="是否推荐")
    order = models.IntegerField(default=0, verbose_name="排序")
    
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
            FieldPanel('is_active'),
            FieldPanel('is_featured'),
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
        verbose_name = "专题"
        verbose_name_plural = "专题"
        ordering = ['-is_featured', 'order', '-created_at']
        db_table = "news_topic"
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['is_active', 'is_featured']),
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
            start_date__lte=now
        ).filter(
            models.Q(end_date__gte=now) | models.Q(end_date__isnull=True)
        )
        
        if site:
            queryset = queryset.filter(sites=site)
            
        return queryset.order_by('-is_featured', 'order', '-created_at')
    
    def get_articles(self, limit=None):
        """获取专题下的文章"""
        queryset = self.articles.live().order_by('-first_published_at')
        
        if limit:
            queryset = queryset[:limit]
            
        return queryset
