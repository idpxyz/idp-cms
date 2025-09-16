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

class CategoryTaggedItem(TaggedItemBase):
    content_object = ParentalKey(
        'Category',
        related_name='tagged_items',
        on_delete=models.CASCADE
    )

@register_snippet
class Category(ClusterableModel):
    """分类模型 - 结构化的内容细分"""
    
    name = models.CharField(max_length=64, verbose_name="分类名称")
    slug = models.SlugField(unique=True, verbose_name="分类标识符")
    description = models.TextField(blank=True, verbose_name="分类描述")
    
    # 树状结构支持
    parent = models.ForeignKey(
        'self', 
        null=True, blank=True, 
        on_delete=models.CASCADE,
        related_name='children', 
        verbose_name="上级分类"
    )
    
    # 跨频道支持（设计文档要求）
    channels = models.ManyToManyField(
        'core.Channel', 
        blank=True,
        related_name='categories',
        verbose_name="关联频道",
        help_text="此分类可以出现在哪些频道下"
    )
    
    # 多站点支持
    sites = models.ManyToManyField(
        'wagtailcore.Site', 
        blank=True, 
        verbose_name="关联站点"
    )
    
    # 标签系统
    tags = TaggableManager(
        through=CategoryTaggedItem, 
        blank=True, 
        verbose_name="标签",
        help_text="为分类添加标签，便于管理和搜索"
    )
    
    # 控制字段
    order = models.IntegerField(default=0, verbose_name="排序")
    is_active = models.BooleanField(default=True, verbose_name="是否启用")
    
    # 时间字段
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")
    
    panels = [
        MultiFieldPanel([
            FieldPanel('name'),
            FieldPanel('slug'),
            FieldPanel('description'),
        ], heading="基本信息"),
        
        MultiFieldPanel([
            FieldPanel('parent'),
            FieldPanel('order'),
            FieldPanel('is_active'),
        ], heading="层级设置"),
        
        MultiFieldPanel([
            FieldPanel('channels', widget=forms.CheckboxSelectMultiple),
        ], heading="频道关联"),
        
        MultiFieldPanel([
            FieldPanel('sites', widget=forms.CheckboxSelectMultiple),
        ], heading="站点关联"),
        
        MultiFieldPanel([
            FieldPanel('tags'),
        ], heading="标签分类"),
    ]
    
    class Meta:
        verbose_name = "分类"
        verbose_name_plural = "分类"
        ordering = ['order', 'name']
        db_table = "core_category"
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['parent', 'order']),
            models.Index(fields=['is_active', 'order']),
        ]
    
    def __str__(self):
        if self.parent:
            return f"{self.parent.name} > {self.name}"
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
            f'category_tree_{site.id}' for site in self.sites.all()
        ])
    
    def get_ancestors(self):
        """获取所有祖先分类"""
        ancestors = []
        current = self.parent
        while current:
            ancestors.append(current)
            current = current.parent
        return list(reversed(ancestors))
    
    def get_descendants(self):
        """获取所有后代分类"""
        descendants = []
        for child in self.children.filter(is_active=True):
            descendants.append(child)
            descendants.extend(child.get_descendants())
        return descendants
    
    @property
    def level(self):
        """获取分类层级深度"""
        return len(self.get_ancestors())
    
    def clean(self):
        """数据验证"""
        from django.core.exceptions import ValidationError
        super().clean()
        
        # 检查循环依赖
        if self.parent:
            current = self.parent
            while current:
                if current == self:
                    raise ValidationError({'parent': '不能将自己设置为上级分类'})
                if current.parent == self:
                    raise ValidationError({'parent': '检测到循环依赖，请检查分类层级关系'})
                current = current.parent
    
    @property
    def full_path(self):
        """获取完整的分类路径"""
        ancestors = self.get_ancestors()
        path_names = [ancestor.name for ancestor in ancestors] + [self.name]
        return " > ".join(path_names)
    
    @classmethod
    def get_root_categories(cls, site=None, channel=None):
        """获取顶级分类"""
        queryset = cls.objects.filter(parent=None, is_active=True)
        
        if site:
            queryset = queryset.filter(sites=site)
        
        if channel:
            queryset = queryset.filter(channels=channel)
            
        return queryset.order_by('order', 'name')
    
    @classmethod
    def get_tree(cls, site=None, channel=None):
        """获取分类树结构"""
        def build_tree(categories, parent=None):
            tree = []
            for category in categories:
                if category.parent == parent:
                    children = build_tree(categories, category)
                    tree.append({
                        'category': category,
                        'children': children
                    })
            return tree
        
        queryset = cls.objects.filter(is_active=True).select_related('parent')
        
        if site:
            queryset = queryset.filter(sites=site)
        
        if channel:
            queryset = queryset.filter(channels=channel)
            
        categories = list(queryset.order_by('order', 'name'))
        return build_tree(categories)
