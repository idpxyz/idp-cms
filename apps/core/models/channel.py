from django.db import models
from django import forms
from django.core.cache import cache
from wagtail.snippets.models import register_snippet
from wagtail.admin.panels import FieldPanel, MultiFieldPanel
from django.utils.translation import gettext_lazy as _
from modelcluster.models import ClusterableModel
from taggit.managers import TaggableManager
from taggit.models import TaggedItemBase
from modelcluster.fields import ParentalKey

class ChannelTaggedItem(TaggedItemBase):
    content_object = ParentalKey(
        'Channel',
        related_name='tagged_items',
        on_delete=models.CASCADE
    )

@register_snippet
class Channel(ClusterableModel):
    """频道模型"""
    name = models.CharField(max_length=100, verbose_name="名称")
    slug = models.SlugField(unique=True, verbose_name="标识符")
    description = models.TextField(blank=True, verbose_name="描述")
    order = models.IntegerField(default=0, verbose_name="排序")
    is_active = models.BooleanField(default=True, verbose_name="是否启用")
    # 🎨 模板选择
    template = models.ForeignKey(
        'ChannelTemplate',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="频道模板"
    )
    
    locale = models.CharField(max_length=16, default="zh-CN", verbose_name="语言区域",
                             help_text="频道的主要语言区域")
    sites = models.ManyToManyField('wagtailcore.Site', blank=True, verbose_name="关联站点")
    tags = TaggableManager(through=ChannelTaggedItem, blank=True, verbose_name="标签",
                          help_text="为频道添加标签，便于分类和搜索")
    
    # 🆕 首页显示配置（简化版）
    show_in_homepage = models.BooleanField(
        default=True, 
        verbose_name="首页显示", 
        help_text="是否在首页显示频道条带"
    )
    homepage_order = models.IntegerField(
        default=0, 
        verbose_name="首页显示顺序", 
        help_text="在首页的显示顺序，数字越小越靠前"
    )
    
    created_at = models.DateTimeField(auto_now_add=True, null=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, null=True, verbose_name="更新时间")
    
    panels = [
        MultiFieldPanel([
            FieldPanel('name'),
            FieldPanel('slug'),
            FieldPanel('description'),
        ], heading="基本信息"),
        
        MultiFieldPanel([
            FieldPanel('order'),
            FieldPanel('is_active'),
            FieldPanel('locale'),
        ], heading="基本设置"),
        
        MultiFieldPanel([
            FieldPanel('template'),
        ], heading="🎨 模板配置"),
        
        MultiFieldPanel([
            FieldPanel('show_in_homepage'),
            FieldPanel('homepage_order'),
        ], heading="首页配置"),
        
        MultiFieldPanel([
            FieldPanel('sites', widget=forms.CheckboxSelectMultiple),
        ], heading="关联站点"),
        
        MultiFieldPanel([
            FieldPanel('tags'),
        ], heading="标签分类"),
    ]
    
    class Meta:
        verbose_name = "频道"
        verbose_name_plural = "频道"
        ordering = ['order', 'name']
        db_table = "core_channel"
    
    def __str__(self):
        return self.name
        
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.clear_cache()
        
    def delete(self, *args, **kwargs):
        self.clear_cache()
        super().delete(*args, **kwargs)
        
    def clear_cache(self):
        """清除相关缓存"""
        cache.delete_many([
            f'channel_tree_{site.id}' for site in self.sites.all()
        ])
