# Channel、Category 和 ArticlePage 模型结构详解

## 📋 模型关系图

```
┌─────────────────┐         ┌─────────────────┐
│    Channel      │◄────────│  ArticlePage    │
│   (频道)        │  1:N    │   (文章页)      │
└─────────────────┘         └─────────────────┘
                                    ▲
                                    │ M:N
                                    │
                            ┌───────┴─────────┐
                            │    Category     │
                            │    (分类)       │
                            └─────────────────┘
                                    │
                                    │ 支持树状结构
                                    ▼
                            ┌─────────────────┐
                            │   parent        │
                            │  (上级分类)     │
                            └─────────────────┘
```

**关键关系**：
- 一篇文章 **必须属于1个Channel**（外键，可为空）
- 一篇文章 **可以属于多个Category**（多对多）
- Category **可以有parent**（支持树状结构，但我们采用扁平化）

---

## 1️⃣ Channel（频道）模型

**文件位置**: `apps/core/models/channel.py`  
**数据表名**: `core_channel`

### 核心字段

| 字段 | 类型 | 必填 | 唯一 | 说明 |
|------|------|------|------|------|
| `name` | CharField(100) | ✅ | ❌ | 频道名称，如"时政新闻" |
| `slug` | SlugField | ✅ | ✅ | 标识符，如"politics"（用于URL） |
| `description` | TextField | ❌ | ❌ | 频道描述 |
| `order` | IntegerField | ❌ | ❌ | 排序（默认0，越小越靠前） |
| `is_active` | BooleanField | ❌ | ❌ | 是否启用（默认True） |

### 扩展字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `template` | ForeignKey(ChannelTemplate) | 频道模板（可选） |
| `locale` | CharField(16) | 语言区域（默认"zh-CN"） |
| `sites` | ManyToManyField(Site) | 关联站点（多对多） |
| `tags` | TaggableManager | 标签 |
| `show_in_homepage` | BooleanField | 是否在首页显示（默认True） |
| `homepage_order` | IntegerField | 首页显示顺序 |
| `created_at` | DateTimeField | 创建时间（自动） |
| `updated_at` | DateTimeField | 更新时间（自动） |

### 重要方法

```python
channel = Channel.objects.get(slug='politics')
print(channel.name)  # 输出: 时政新闻

# 清除缓存
channel.clear_cache()
```

### 创建示例

```python
from apps.core.models import Channel

channel = Channel.objects.create(
    name='时政新闻',
    slug='politics',
    description='时政要闻、新闻资讯、政策解读',
    order=1,
    is_active=True,
    locale='zh-CN',
    show_in_homepage=True,
    homepage_order=1
)
```

---

## 2️⃣ Category（分类）模型

**文件位置**: `apps/core/models/category.py`  
**数据表名**: `core_category`

### 核心字段

| 字段 | 类型 | 必填 | 唯一 | 说明 |
|------|------|------|------|------|
| `name` | CharField(64) | ✅ | ❌ | 分类名称，如"武汉" |
| `slug` | SlugField | ✅ | ✅ | 标识符，如"wuhan"（用于URL） |
| `description` | TextField | ❌ | ❌ | 分类描述 |
| `parent` | ForeignKey(self) | ❌ | ❌ | 上级分类（支持树状结构） |
| `order` | IntegerField | ❌ | ❌ | 排序（默认0） |
| `is_active` | BooleanField | ❌ | ❌ | 是否启用（默认True） |

### 关联字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `channels` | ManyToManyField(Channel) | 关联频道（多对多） |
| `sites` | ManyToManyField(Site) | 关联站点（多对多） |
| `tags` | TaggableManager | 标签 |
| `created_at` | DateTimeField | 创建时间（自动） |
| `updated_at` | DateTimeField | 更新时间（自动） |

### 重要方法

```python
category = Category.objects.get(slug='wuhan')

# 获取所有祖先分类
ancestors = category.get_ancestors()

# 获取所有后代分类
descendants = category.get_descendants()

# 获取层级深度
level = category.level

# 获取完整路径
full_path = category.full_path  # 如: "湖北 > 武汉"

# 获取顶级分类
root_categories = Category.get_root_categories()

# 获取分类树
tree = Category.get_tree()
```

### 创建示例（扁平化）

```python
from apps.core.models import Category

# 扁平化分类（无parent）
category = Category.objects.create(
    name='武汉',
    slug='wuhan',
    description='省会城市',
    parent=None,  # 无上级分类，扁平化
    order=1,
    is_active=True
)
```

### 创建示例（树状结构）

```python
# 如果需要树状结构（我们不使用）
hubei = Category.objects.create(
    name='湖北',
    slug='hubei',
    parent=None,  # 顶级分类
    order=1
)

wuhan = Category.objects.create(
    name='武汉',
    slug='wuhan',
    parent=hubei,  # 武汉是湖北的子分类
    order=1
)
```

---

## 3️⃣ ArticlePage（文章）模型

**文件位置**: `apps/news/models/article.py`  
**数据表名**: `news_articlepage`

### 与Channel/Category相关的字段

| 字段 | 类型 | 必填 | 关系 | 说明 |
|------|------|------|------|------|
| `channel` | ForeignKey(Channel) | ❌ | 1:N | 所属频道（一对多） |
| `categories` | ManyToManyField(Category) | ❌ | M:N | 所属分类（多对多） |

### 使用示例

```python
from apps.news.models import ArticlePage
from apps.core.models import Channel, Category

# 获取频道
channel = Channel.objects.get(slug='politics')

# 获取分类
wuhan = Category.objects.get(slug='wuhan')
national = Category.objects.get(slug='national')

# 创建文章
article = ArticlePage(
    title='武汉市政府工作报告发布',
    slug='wuhan-gov-report-2025',
    excerpt='2025年武汉市政府工作报告...',
    body='<p>正文内容...</p>',
    channel=channel,  # ← 设置频道（外键）
    # categories 在创建后通过 ManyToMany 设置
)

# 保存文章
parent_page.add_child(instance=article)

# 设置分类（多对多）
article.categories.add(wuhan, national)  # ← 添加多个分类

# 或者使用 set
article.categories.set([wuhan, national])

# 查询文章的分类
for category in article.categories.all():
    print(category.name)

# 查询文章的频道
print(article.channel.name)
```

---

## 🎯 我们的数据结构设计

### Channel（12个）

```python
channels = [
    {'name': '时政新闻', 'slug': 'politics', 'order': 1},
    {'name': '党建廉政', 'slug': 'party', 'order': 2},
    {'name': '法治军事', 'slug': 'law-military', 'order': 3},
    {'name': '经济产业', 'slug': 'economy', 'order': 4},
    {'name': '房产消费', 'slug': 'property', 'order': 5},
    {'name': '社会民生', 'slug': 'society', 'order': 6},
    {'name': '教育健康', 'slug': 'edu-health', 'order': 7},
    {'name': '科技创新', 'slug': 'tech', 'order': 8},
    {'name': '乡村振兴', 'slug': 'rural', 'order': 9},
    {'name': '文化旅游', 'slug': 'culture', 'order': 10},
    {'name': '体育娱乐', 'slug': 'sports', 'order': 11},
    {'name': '视频专题', 'slug': 'special', 'order': 12},
]
```

### Category（18个，扁平化）

```python
categories = [
    {'name': '武汉', 'slug': 'wuhan', 'parent': None, 'order': 1},
    {'name': '襄阳', 'slug': 'xiangyang', 'parent': None, 'order': 2},
    {'name': '宜昌', 'slug': 'yichang', 'parent': None, 'order': 3},
    # ... 其他15个地市 ...
    {'name': '全国', 'slug': 'national', 'parent': None, 'order': 99},
]
```

**注意**：
- ✅ `parent=None` → 全部扁平化，无层级关系
- ✅ 每个Category都是顶级分类
- ✅ 通过`order`控制排序

---

## 📊 数据库查询示例

### 查询某个频道的所有文章

```python
from apps.core.models import Channel

channel = Channel.objects.get(slug='politics')
articles = channel.articles.filter(live=True)  # 反向查询

print(f"{channel.name} 频道有 {articles.count()} 篇文章")
```

### 查询某个分类的所有文章

```python
from apps.core.models import Category

category = Category.objects.get(slug='wuhan')
articles = category.articles.filter(live=True)  # 反向查询

print(f"{category.name} 分类有 {articles.count()} 篇文章")
```

### 查询某个频道+某个分类的文章

```python
channel = Channel.objects.get(slug='politics')
category = Category.objects.get(slug='wuhan')

articles = ArticlePage.objects.filter(
    live=True,
    channel=channel,
    categories=category
)

print(f"{channel.name} + {category.name}: {articles.count()} 篇")
```

### 统计每个频道的文章数

```python
from django.db.models import Count

channels = Channel.objects.annotate(
    article_count=Count('articles', filter=Q(articles__live=True))
).order_by('-article_count')

for ch in channels:
    print(f"{ch.name}: {ch.article_count} 篇")
```

---

## ⚠️ 重要注意事项

### 1. Channel是外键（ForeignKey）

```python
# ✅ 正确：一篇文章只能有一个频道
article.channel = channel  
article.save()

# ❌ 错误：不能使用 add/set（这是ManyToMany的方法）
article.channel.add(channel)  # 错误！
```

### 2. Categories是多对多（ManyToManyField）

```python
# ✅ 正确：使用 add/set/remove
article.categories.add(category1, category2)
article.categories.set([category1, category2])
article.categories.remove(category1)

# ❌ 错误：不能直接赋值
article.categories = category  # 错误！
```

### 3. 必须先保存文章，再设置多对多关系

```python
# ✅ 正确顺序
article = ArticlePage(
    title='标题',
    channel=channel  # ← 外键可以直接设置
)
parent_page.add_child(instance=article)  # ← 先保存

article.categories.add(category1, category2)  # ← 保存后才能设置多对多

# ❌ 错误：在保存前设置多对多
article = ArticlePage(title='标题')
article.categories.add(category1)  # 错误！article还没保存
```

### 4. 扁平化Category设计

```python
# ✅ 我们的设计：扁平化
武汉 (parent=None)
襄阳 (parent=None)
宜昌 (parent=None)

# ❌ 不使用：树状结构
湖北 (parent=None)
  ├─ 武汉 (parent=湖北)
  └─ 襄阳 (parent=湖北)
```

---

## 🔍 Django Shell 验证命令

```python
# 进入Django Shell
python manage.py shell

# 查看所有频道
from apps.core.models import Channel
for ch in Channel.objects.all():
    print(f"{ch.order}. {ch.name} ({ch.slug})")

# 查看所有分类
from apps.core.models import Category
for cat in Category.objects.all():
    print(f"{cat.order}. {cat.name} ({cat.slug}) - parent={cat.parent}")

# 查看某个频道的分类（如果关联）
channel = Channel.objects.get(slug='politics')
for cat in channel.categories.all():
    print(f"  - {cat.name}")

# 统计
print(f"总计: {Channel.objects.count()} 个频道")
print(f"总计: {Category.objects.count()} 个分类")
```

---

## ✅ 总结

| 模型 | 关键点 | 数量 |
|------|--------|------|
| **Channel** | 外键关系，一篇文章=1个频道 | 12个 |
| **Category** | 多对多关系，一篇文章=0-N个分类，扁平化无parent | 18个 |
| **ArticlePage** | 继承自Wagtail Page，有channel外键和categories多对多 | ~17.7万 |

**下一步**: 执行 `scripts/setup_channels_categories.py` 创建12个Channel和18个Category。

