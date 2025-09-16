# 分类增强快速实施指南

## 🚀 立即行动清单

基于设计文档分析，当前系统缺失关键的 **Category** 和 **Topic** 模型，需要优先实现。

## ⭐ 第一周目标：核心模型实现

### Day 1-2: Category 模型 🎯

**创建文件**: `apps/core/models/category.py`

```python
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
```

**更新导入**: 在 `apps/core/models/__init__.py` 中添加:
```python
from .category import Category
```

### Day 3-4: Topic 模型 🎯

**创建文件**: `apps/news/models/topic.py`

```python
from django.db import models
from django.core.cache import cache
from wagtail.snippets.models import register_snippet
from wagtail.admin.panels import FieldPanel, MultiFieldPanel
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
```

**更新导入**: 在 `apps/news/models/__init__.py` 中添加:
```python
from .topic import Topic
```

### Day 5: 修复 ArticlePage 关联 🔧

**修改文件**: `apps/news/models/article.py`

1. **添加 Category 关联** (替换注释的 categories 字段):
```python
# 在 ArticlePage 类中添加/取消注释:
categories = models.ManyToManyField(
    'core.Category',
    blank=True,
    related_name='articles',
    verbose_name="分类",
    help_text="选择文章所属的分类（可多选）"
)
```

2. **替换 topic_slug 为 Topic 外键**:
```python
# 替换现有的:
# topic_slug = models.SlugField(blank=True, verbose_name="专题标识",
#                              help_text="用于专题聚合的标识符")

# 改为:
topic = models.ForeignKey(
    'news.Topic',
    null=True, blank=True,
    on_delete=models.SET_NULL,
    related_name='articles',
    verbose_name="专题",
    help_text="选择文章所属的专题"
)
```

3. **更新 content_panels**:
```python
# 在 content_panels 中的分类标签部分更新为:
MultiFieldPanel([
    FieldPanel('channel'),
    FieldPanel('region'),
    FieldPanel('categories', widget=forms.CheckboxSelectMultiple),
    FieldPanel('topic'),
    FieldPanel('tags'),
], heading="分类标签"),
```

## ⚡ 第二周目标：基础集成

### Day 6-7: 数据库迁移

```bash
# 创建迁移文件
python manage.py makemigrations core --name="add_category_model"
python manage.py makemigrations news --name="add_topic_model"
python manage.py makemigrations news --name="update_article_relations"

# 应用迁移
python manage.py migrate
```

### Day 8-10: 基础 API 实现

**创建文件**: `apps/api/rest/categories.py`

```python
from rest_framework.decorators import api_view
from rest_framework.response import Response
from apps.core.models import Category
from apps.core.site_utils import get_site_from_request

@api_view(['GET'])
def categories(request):
    """获取分类树"""
    site = get_site_from_request(request)
    channel_slug = request.query_params.get('channel')
    
    queryset = Category.objects.filter(
        is_active=True,
        sites__hostname=site
    )
    
    if channel_slug:
        queryset = queryset.filter(channels__slug=channel_slug)
    
    # 构建树状结构
    categories = list(queryset.select_related('parent').prefetch_related('children'))
    
    # 简化的树状响应
    def build_tree(cats, parent=None):
        result = []
        for cat in cats:
            if cat.parent_id == (parent.id if parent else None):
                children = build_tree(cats, cat)
                result.append({
                    'id': cat.id,
                    'name': cat.name,
                    'slug': cat.slug,
                    'description': cat.description,
                    'children': children
                })
        return result
    
    return Response({
        'categories': build_tree(categories)
    })
```

## 📋 检查清单

完成以上步骤后，你应该能够：

- [ ] 在 Wagtail 管理界面看到 Category 和 Topic 管理
- [ ] 创建分类并关联到频道和站点
- [ ] 创建专题并设置封面图片
- [ ] 在文章编辑页面选择分类和专题
- [ ] 通过 API 访问分类数据

## 🆘 如果遇到问题

1. **迁移失败**: 检查现有数据是否有冲突，可能需要手动清理
2. **导入错误**: 确保所有 `__init__.py` 文件都正确更新
3. **Admin 界面不显示**: 检查 `@register_snippet` 装饰器是否正确添加

## 🎯 下一步

完成基础模型后，可以继续：
1. 完善 API 层 (参考详细 todo list)
2. 前端组件适配
3. 数据迁移脚本编写

---

**预计完成时间**: 2 周  
**关键文件**: 
- `apps/core/models/category.py` (新建)
- `apps/news/models/topic.py` (新建)  
- `apps/news/models/article.py` (修改)

完成这个快速实施指南后，参考完整的 `IMPLEMENTATION_TODOLIST.md` 进行后续开发。
