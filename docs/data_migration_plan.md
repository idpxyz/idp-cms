# 数据迁移方案

## 概述

从旧的MySQL数据库（121.41.73.49）迁移 177,918 篇文章到新的Wagtail CMS系统。

## 一、数据源分析

### 旧数据库结构

**服务器**: 121.41.73.49  
**数据库**: jrhb  
**总文章数**: 177,918

#### article 表（主表）
- `id` - 文章ID
- `title` - 标题
- `seo_title` - SEO标题
- `seo_keys` - SEO关键词
- `seo_desc` - SEO描述
- `cate_id` - 分类ID
- `author` - 作者
- `status` - 状态
- `type` - 类型
- `url` - URL
- `video` - 视频链接
- `img` - 图片
- `hits` - 点击量
- `likes` - 点赞数
- `is_recommend` - 是否推荐
- `is_top` - 是否置顶
- `is_bold` - 是否加粗
- `color` - 颜色
- `tags` - 标签
- `fromlink` - 来源链接
- `fromurl` - 来源URL
- `add_time` - 添加时间（时间戳）
- `last_time` - 更新时间（时间戳）
- `ordid` - 排序
- `tpl` - 模板

#### article_info 表（内容表）
- `article_id` - 文章ID（关联 article.id）
- `info` - 文章正文内容（mediumtext）

## 二、目标数据结构

### Wagtail ArticlePage 模型

**应用**: apps/news/models/article.py  
**模型**: ArticlePage (继承自 Wagtail Page)

#### 核心字段
- `title` - 标题（继承自Page）
- `slug` - URL别名（继承自Page）
- `excerpt` - 摘要
- `body` - 正文（RichTextField）
- `cover` - 封面图片

#### 分类关联
- `channel` - 频道（ForeignKey）
- `categories` - 分类（ManyToMany）
- `region` - 地区
- `topics` - 专题（ManyToMany）

#### 新闻属性
- `author_name` - 作者
- `language` - 语言
- `has_video` - 包含视频
- `tags` - 标签

#### SEO字段
- `meta_keywords` - SEO关键词
- `seo_title` - SEO标题（继承自Page）
- `search_description` - SEO描述（继承自Page）
- `og_image` - 社交分享图片

#### 来源信息
- `source_type` - 来源类型
- `source_site` - 来源站点
- `external_site` - 外部站点
- `external_url` - 外部URL

#### Wagtail 系统字段
- `first_published_at` - 首次发布时间
- `last_published_at` - 最后发布时间
- `live` - 是否发布

## 三、字段映射表

| 旧字段 | 新字段 | 转换规则 | 优先级 |
|--------|--------|----------|--------|
| article.id | - | 保留为 old_article_id（新增字段） | 高 |
| article.title | title | 直接映射 | 高 |
| article.seo_title | seo_title | 直接映射，为空则用title | 高 |
| article.seo_keys | meta_keywords | 直接映射 | 中 |
| article.seo_desc | search_description | 直接映射 | 中 |
| article_info.info | body | HTML转换为RichText | 高 |
| article.author | author_name | 直接映射 | 中 |
| article.img | cover | 下载图片并创建CustomImage | 高 |
| article.video | has_video | 有视频链接则设为True | 低 |
| article.cate_id | channel/categories | 根据分类映射表转换 | 高 |
| article.tags | tags | 分割字符串创建标签 | 中 |
| article.url | slug | 提取URL生成slug | 高 |
| article.hits | - | 可选：记录到ViewCount模型 | 低 |
| article.likes | - | 可选：记录到统计表 | 低 |
| article.status | live | 1=发布, 0=草稿 | 高 |
| article.is_recommend | - | 可选：加入推荐专题 | 低 |
| article.is_top | - | 可选：设置权重 | 低 |
| article.fromlink | external_site | 解析创建ExternalSite | 中 |
| article.fromurl | external_url | 直接映射 | 中 |
| article.add_time | first_published_at | 时间戳转datetime | 高 |
| article.last_time | last_published_at | 时间戳转datetime | 高 |

## 四、迁移步骤

### 阶段1：准备工作

#### 1.1 数据导出
```bash
# 导出文章基本信息
ssh root@121.41.73.49 "docker exec mysql mysqldump -u jrhb -p'6VSPmPbuFGnZO1%C' jrhb article --single-transaction > /tmp/article.sql"

# 导出文章详细内容
ssh root@121.41.73.49 "docker exec mysql mysqldump -u jrbb -p'6VSPmPbuFGnZO1%C' jrhb article_info --single-transaction > /tmp/article_info.sql"

# 下载到本地
scp root@121.41.73.49:/tmp/article.sql /opt/idp-cms/data/migration/
scp root@121.41.73.49:/tmp/article_info.sql /opt/idp-cms/data/migration/
```

或者使用JSON格式（推荐）：
```bash
# 导出为JSON
ssh root@121.41.73.49 "docker exec mysql mysql -u jrhb -p'6VSPmPbuFGnZO1%C' jrhb -e 'SELECT * FROM article' --batch --raw | python3 -c 'import sys, csv, json; print(json.dumps([dict(row) for row in csv.DictReader(sys.stdin, delimiter=\"\\t\")]))' > /tmp/articles.json"
```

#### 1.2 创建映射表
- 导出旧数据库的分类表（category）
- 手动或自动创建分类映射关系
- 导出标签表（tags）

#### 1.3 准备迁移环境
```bash
# 创建迁移目录
mkdir -p /opt/idp-cms/data/migration/{exports,images,logs}

# 创建Python虚拟环境（如果需要）
cd /opt/idp-cms
source venv/bin/activate
```

### 阶段2：数据转换

#### 2.1 创建迁移脚本
文件：`apps/news/management/commands/import_old_articles.py`

主要功能：
- 读取导出的数据
- 处理字段映射
- 下载并保存图片
- 转换HTML为Wagtail RichText
- 创建分类/标签关联
- 批量导入数据

#### 2.2 图片处理
- 批量下载文章封面图片
- 转换为Wagtail的CustomImage
- 处理失效的图片链接

### 阶段3：执行迁移

#### 3.1 分类和频道准备
```bash
# 先导入分类数据
python manage.py import_categories

# 创建必要的频道
python manage.py shell
>>> from apps.core.models import Channel
>>> Channel.objects.create(name="默认频道", slug="default")
```

#### 3.2 批量导入文章
```bash
# 测试模式：只导入前100条
python manage.py import_old_articles --test --limit=100

# 正式导入：分批处理
python manage.py import_old_articles --batch-size=1000

# 断点续传
python manage.py import_old_articles --start-from=10000
```

#### 3.3 数据验证
```bash
# 验证导入的文章数量
python manage.py shell
>>> from apps.news.models import ArticlePage
>>> ArticlePage.objects.count()

# 验证图片
>>> ArticlePage.objects.filter(cover__isnull=True).count()

# 验证分类关联
>>> ArticlePage.objects.filter(channel__isnull=True).count()
```

### 阶段4：数据校验与优化

#### 4.1 内容校验
- 检查HTML转换质量
- 验证图片完整性
- 检查链接有效性
- 确认标签和分类关联

#### 4.2 SEO优化
- 生成缺失的slug
- 补充SEO描述
- 生成结构化数据

#### 4.3 性能优化
- 重建搜索索引
- 更新Wagtail页面树
- 清理缓存

## 五、迁移脚本示例

### 5.1 数据导出脚本

```python
# scripts/export_old_articles.py
import json
import subprocess

def export_articles():
    """导出文章数据为JSON"""
    cmd = """
    ssh root@121.41.73.49 "docker exec mysql mysql -u jrhb -p'6VSPmPbuFGnZO1%C' jrhb -N -e '
    SELECT 
        a.id, a.title, a.seo_title, a.seo_keys, a.seo_desc,
        a.cate_id, a.author, a.status, a.img, a.video,
        a.tags, a.url, a.fromlink, a.fromurl,
        a.hits, a.likes, a.is_recommend, a.is_top,
        a.add_time, a.last_time,
        ai.info
    FROM article a
    LEFT JOIN article_info ai ON a.id = ai.article_id
    WHERE a.status = 1
    ORDER BY a.id
    ' | sed 's/\\t/\",\"/g;s/^/[\"/;s/$/\"]/;s/\\n//g'"
    """
    
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    
    # 保存到文件
    with open('/opt/idp-cms/data/migration/articles_export.json', 'w', encoding='utf-8') as f:
        f.write(result.stdout)
```

### 5.2 Django管理命令

```python
# apps/news/management/commands/import_old_articles.py
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.utils.text import slugify
from apps.news.models import ArticlePage
from apps.core.models import Channel, Category
from wagtail.models import Page, Site
import json
import requests
from datetime import datetime

class Command(BaseCommand):
    help = '从旧数据库导入文章'

    def add_arguments(self, parser):
        parser.add_argument('--file', type=str, default='data/migration/articles_export.json')
        parser.add_argument('--limit', type=int, help='限制导入数量')
        parser.add_argument('--batch-size', type=int, default=100)
        parser.add_argument('--start-from', type=int, default=0)
        parser.add_argument('--test', action='store_true', help='测试模式')

    def handle(self, *args, **options):
        # 读取数据
        with open(options['file'], 'r', encoding='utf-8') as f:
            articles = json.load(f)

        # 获取父页面
        site = Site.objects.get(is_default_site=True)
        parent_page = site.root_page

        # 获取默认频道
        default_channel = Channel.objects.first()

        total = len(articles)
        if options['limit']:
            articles = articles[:options['limit']]

        self.stdout.write(f'准备导入 {len(articles)} 篇文章（共 {total} 篇）')

        success_count = 0
        error_count = 0

        for i, old_article in enumerate(articles[options['start_from']:], start=options['start_from']):
            try:
                # 生成slug
                slug = self.generate_slug(old_article)

                # 检查是否已存在
                if ArticlePage.objects.filter(slug=slug).exists():
                    self.stdout.write(self.style.WARNING(f'跳过已存在: {slug}'))
                    continue

                # 下载图片
                cover_image = self.download_image(old_article['img']) if old_article.get('img') else None

                # 创建文章页面
                article = ArticlePage(
                    title=old_article['title'],
                    slug=slug,
                    excerpt=old_article.get('seo_desc', '')[:500],
                    body=self.convert_html_to_richtext(old_article.get('info', '')),
                    cover=cover_image,
                    channel=default_channel,
                    author_name=old_article.get('author', ''),
                    has_video=bool(old_article.get('video')),
                    meta_keywords=old_article.get('seo_keys', ''),
                    seo_title=old_article.get('seo_title') or old_article['title'],
                    search_description=old_article.get('seo_desc', ''),
                    external_url=old_article.get('fromurl'),
                    first_published_at=self.parse_timestamp(old_article.get('add_time')),
                    last_published_at=self.parse_timestamp(old_article.get('last_time')),
                    live=old_article.get('status') == 1,
                )

                # 添加到页面树
                parent_page.add_child(instance=article)

                # 处理标签
                if old_article.get('tags'):
                    tags = [t.strip() for t in old_article['tags'].split(',') if t.strip()]
                    for tag in tags:
                        article.tags.add(tag)

                article.save()

                success_count += 1
                if (i + 1) % 100 == 0:
                    self.stdout.write(f'已处理 {i + 1}/{len(articles)} 篇文章')

            except Exception as e:
                error_count += 1
                self.stdout.write(self.style.ERROR(f'导入失败 ID {old_article.get("id")}: {str(e)}'))
                
                # 记录错误日志
                with open('data/migration/logs/errors.log', 'a') as f:
                    f.write(f'{datetime.now()}: {old_article.get("id")} - {str(e)}\\n')

        self.stdout.write(self.style.SUCCESS(
            f'导入完成！成功: {success_count}, 失败: {error_count}'
        ))

    def generate_slug(self, article):
        """生成唯一的slug"""
        # 优先使用URL中的slug
        if article.get('url'):
            slug = article['url'].strip('/').split('/')[-1]
            slug = slug.split('.')[0]  # 移除扩展名
        else:
            slug = slugify(article['title'])

        # 确保唯一性
        base_slug = slug
        counter = 1
        while ArticlePage.objects.filter(slug=slug).exists():
            slug = f'{base_slug}-{counter}'
            counter += 1

        return slug

    def download_image(self, image_url):
        """下载图片并创建CustomImage"""
        try:
            # 实现图片下载和保存逻辑
            # 返回CustomImage实例
            pass
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'图片下载失败: {image_url} - {e}'))
            return None

    def convert_html_to_richtext(self, html):
        """转换HTML为Wagtail RichText格式"""
        # 简单实现：直接返回HTML
        # 复杂实现：使用BeautifulSoup解析并转换
        return html or ''

    def parse_timestamp(self, timestamp):
        """时间戳转datetime"""
        if not timestamp:
            return timezone.now()
        try:
            return datetime.fromtimestamp(int(timestamp), tz=timezone.utc)
        except:
            return timezone.now()
```

## 六、风险与注意事项

### 6.1 数据风险
- **数据丢失**: 确保备份所有原始数据
- **字段溢出**: 检查字段长度限制
- **编码问题**: 统一使用UTF-8编码
- **特殊字符**: 处理HTML实体和特殊字符

### 6.2 性能风险
- **数据量大**: 17万+文章，需要分批处理
- **内存占用**: 注意内存使用，避免OOM
- **数据库锁**: 使用事务，避免长时间锁表

### 6.3 业务风险
- **SEO影响**: 保持URL结构，设置301重定向
- **图片失效**: 备份原始图片
- **数据验证**: 导入后全面测试

## 七、回滚方案

```bash
# 备份当前数据库
python manage.py dumpdata news.ArticlePage > backup_before_import.json

# 如需回滚
python manage.py shell
>>> from apps.news.models import ArticlePage
>>> ArticlePage.objects.all().delete()

# 或恢复备份
python manage.py loaddata backup_before_import.json
```

## 八、时间估算

- 准备工作: 1-2天
- 脚本开发: 2-3天
- 测试导入: 1天
- 正式迁移: 根据数据量，预计6-12小时
- 验证优化: 1-2天

**总计**: 约 1-2 周

## 九、后续优化

- 优化搜索索引
- 生成sitemap
- 设置URL重定向
- 优化图片加载
- 数据统计迁移

