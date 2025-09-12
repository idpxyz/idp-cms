下面给你一套**可直接落地**的方案，覆盖：数据建模（多站点可控共享）、Wagtail 编辑体验、Tag 聚合页与路由、OpenSearch/Elasticsearch 索引与检索、热门标签统计、相关推荐、API 输出、缓存与运维。示例以 **Wagtail 7.1 + Django 4.x + OpenSearch/ES 7+** 为基线。

---

# 目标与原则

* **统一标签库**：默认跨站共享标签，必要时可按站点隔离/过滤。
* **高性能检索**：将标签同步到 OpenSearch/Elasticsearch（下文简称 ES）。
* **运营友好**：提供标签聚合页、热门标签榜、相关推荐。
* **可扩展**：易于接入推荐/画像系统与多站点门户聚合。

---

# 1. 数据建模（models.py）

> 关键点：`ClusterTaggableManager + TaggedItemBase`；通过 **可选 site 维度** 兼容「共享+可过滤」。

```python
# news/models.py
from django.db import models
from django.utils.text import slugify
from django.contrib.sites.models import Site

from wagtail.fields import RichTextField
from wagtail.models import Page, Site as WagtailSite
from wagtail.snippets.models import register_snippet
from wagtail.contrib.routable_page.models import RoutablePageMixin, route

from modelcluster.fields import ParentalKey
from modelcluster.contrib.taggit import ClusterTaggableManager
from taggit.models import TaggedItemBase, Tag

# --- 可选：为 Tag 附加一些运营属性（颜色、描述、封面等） ---
@register_snippet
class NewsTag(Tag):
    color = models.CharField(max_length=16, blank=True, default="", help_text="前端可用的16进制或CSS变量")
    desc  = models.TextField(blank=True, default="")
    cover = models.URLField(blank=True, default="", help_text="标签封面图（可选）")

    class Meta:
        proxy = False  # 独立表，避免与 taggit_tag 混淆
        verbose_name = "News Tag"
        verbose_name_plural = "News Tags"

    def __str__(self):
        return self.name

# 通过表把“文章-标签”关系与站点绑定（可选字段：site）
class ArticlePageTag(TaggedItemBase):
    content_object = ParentalKey('ArticlePage', related_name='tagged_items', on_delete=models.CASCADE)
    site = models.ForeignKey(WagtailSite, on_delete=models.CASCADE, null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["site"]),
        ]
        verbose_name = "ArticlePage-Tag link"

class ArticleIndexPage(Page):
    """
    栏目/列表页，承载按标签聚合的路由。
    """
    intro = RichTextField(blank=True)

    subpage_types = ['news.ArticlePage']

    def get_context(self, request, *args, **kwargs):
        ctx = super().get_context(request)
        ctx['articles'] = ArticlePage.objects.live().public().order_by('-first_published_at')
        return ctx

class ArticlePage(Page):
    """
    文章页：生产最少可用字段，实际项目自行扩展（作者、来源、城市等）。
    """
    body = RichTextField(features=["h2","h3","bold","italic","link","ol","ul","hr","image"])
    tags = ClusterTaggableManager(through=ArticlePageTag, blank=True, verbose_name="标签（输入可新建/可选）")

    # SEO/检索字段（可根据需要扩展）
    summary = models.TextField(blank=True, default="")
    hero    = models.URLField(blank=True, default="")
    city    = models.CharField(max_length=64, blank=True, default="")  # 多地站可用

    parent_page_types = ['news.ArticleIndexPage']

    content_panels = Page.content_panels + [
        # 按需加入你的自定义字段
    ]

    def save(self, *args, **kwargs):
        # 可在此做 slug 正规化、tags 限制清洗等
        super().save(*args, **kwargs)

# Tag 聚合/路由页：/tags/<slug>/ 和 /tags/
class TagHubPage(RoutablePageMixin, Page):
    """
    Tag 运营中心页：列出标签、按标签聚合内容。
    """
    subpage_types = []

    @route(r"^$")
    def list_tags(self, request):
        from django.core.paginator import Paginator
        qs = NewsTag.objects.all().order_by('name')
        paginator = Paginator(qs, 60)
        page = request.GET.get("page", 1)
        return self.render(
            request,
            context={"tags": paginator.get_page(page)}
        )

    @route(r"^([\w-]+)/$")
    def by_tag(self, request, tag_slug):
        from django.shortcuts import get_object_or_404
        tag = get_object_or_404(NewsTag, slug=tag_slug)

        # 支持多站点过滤：当前站点
        current_site = WagtailSite.find_for_request(request)

        articles = ArticlePage.objects.live().public().filter(
            tagged_items__tag__slug=tag.slug
        ).distinct().order_by('-first_published_at')

        # 如果想强制按站点隔离，把上面改成：
        # .filter(tagged_items__site=current_site)

        return self.render(
            request,
            context={"tag": tag, "articles": articles}
        )
```

> **说明**
>
> * **共享标签库**：默认 `NewsTag` 全站共享。
> * **按站点过滤**：`ArticlePageTag.site` 可承载隔离诉求；在保存/发布时写入当前站点，聚合时按需过滤。
> * **TagHubPage** 提供 `/tags/` 列表与 `/tags/<slug>/` 聚合路由。

---

# 2. 编辑体验（ModelAdmin 与自动补全）

> Wagtail 自带 tag 输入体验；如需后台运营标签（颜色、描述、封面），暴露为 **Snippet**（上文已注册）。
> 如需后台批量管理/合并标签，可用自定义管理命令（见运维部分）。

---

# 3. OpenSearch/Elasticsearch 集成

## 3.1 安装与配置

```bash
pip install opensearch-py  # 或 elasticsearch==7.x
```

```python
# settings.py（核心片段）
OPENSEARCH = {
    "HOSTS": ["http://localhost:9200"],
    "INDEX_ARTICLE": "news_articles_v1",
}
```

## 3.2 索引映射（management command 或启动时保障）

```python
# search/indexes.py
from opensearchpy import OpenSearch
from django.conf import settings

def get_client():
    return OpenSearch(hosts=settings.OPENSEARCH["HOSTS"])

ARTICLE_MAPPING = {
    "mappings": {
        "properties": {
            "id": {"type": "keyword"},
            "title": {"type": "text", "fields": {"raw": {"type": "keyword"}}},
            "summary": {"type": "text"},
            "body": {"type": "text"},
            "site_id": {"type": "keyword"},
            "site_hostname": {"type": "keyword"},
            "first_published_at": {"type": "date"},
            "tags": {"type": "keyword"},           # 用于过滤/聚合
            "city": {"type": "keyword"},
            "url": {"type": "keyword"},
        }
    }
}

def ensure_article_index():
    client = get_client()
    index = settings.OPENSEARCH["INDEX_ARTICLE"]
    if not client.indices.exists(index=index):
        client.indices.create(index=index, body=ARTICLE_MAPPING)
```

## 3.3 文档序列化与写入

```python
# search/serializers.py
from wagtail.models import Site as WagtailSite

def article_to_doc(page, request=None):
    site = WagtailSite.find_for_request(request) if request else page.get_site()
    url  = page.get_url(request=request) if request else page.url

    tags = list(page.tags.values_list("name", flat=True))

    return {
        "id": str(page.id),
        "title": page.title,
        "summary": page.summary,
        "body": page.body.source if hasattr(page.body, "source") else page.body,
        "site_id": str(site.id) if site else "",
        "site_hostname": site.hostname if site else "",
        "first_published_at": (page.first_published_at or page.latest_revision_created_at),
        "tags": tags,
        "city": page.city or "",
        "url": url,
    }
```

```python
# search/indexer.py
from opensearchpy import OpenSearch
from django.conf import settings
from .serializers import article_to_doc
from .indexes import get_client

def index_article(page, request=None):
    client = get_client()
    index = settings.OPENSEARCH["INDEX_ARTICLE"]
    doc = article_to_doc(page, request=request)
    client.index(index=index, id=doc["id"], body=doc, refresh="false")

def delete_article(page_id):
    client = get_client()
    index = settings.OPENSEARCH["INDEX_ARTICLE"]
    client.delete(index=index, id=str(page_id), ignore=[404], refresh="false")
```

## 3.4 发布/下线钩子（wagtail hooks）

```python
# news/wagtail_hooks.py
from wagtail import hooks
from django.dispatch import receiver
from wagtail.signals import page_published, page_unpublished, page_deleted
from .models import ArticlePage
from search.indexer import index_article, delete_article

@receiver(page_published)
def on_page_published(sender, **kwargs):
    page = kwargs.get("page")
    request = kwargs.get("request")
    if isinstance(page, ArticlePage):
        index_article(page, request=request)

@receiver(page_unpublished)
def on_page_unpublished(sender, **kwargs):
    page = kwargs.get("page")
    if isinstance(page, ArticlePage):
        delete_article(page.id)

@receiver(page_deleted)
def on_page_deleted(sender, **kwargs):
    instance = kwargs.get("instance")
    if isinstance(instance, ArticlePage):
        delete_article(instance.id)

@hooks.register("after_create_page")
def after_create_page(request, page):
    # 可在此把 ArticlePageTag.site 写入为当前站点，实现“站点维度”记录
    pass
```

> 说明：发布/撤销/删除时自动同步 ES，**无需人工操作**。

---

# 4. 检索与聚合（热门标签 / 相关推荐）

## 4.1 基础搜索（按标签 + 站点过滤）

```python
# search/queries.py
from opensearchpy import OpenSearch
from django.conf import settings
from .indexes import get_client

def search_articles_by_tag(tag_name, site_id=None, size=20, from_=0):
    must = [{"term": {"tags": tag_name}}]
    if site_id:
        must.append({"term": {"site_id": str(site_id)}})

    body = {
        "query": {"bool": {"must": must}},
        "sort": [{"first_published_at": {"order": "desc"}}],
        "from": from_,
        "size": size
    }
    return get_client().search(index=settings.OPENSEARCH["INDEX_ARTICLE"], body=body)
```

## 4.2 热门标签（Terms Aggregation）

```python
def top_tags(site_id=None, size=30):
    must = []
    if site_id:
        must.append({"term": {"site_id": str(site_id)}})

    body = {
        "size": 0,
        "query": {"bool": {"must": must}} if must else {"match_all": {}},
        "aggs": {
            "top_tags": {
                "terms": {"field": "tags", "size": size}
            }
        }
    }
    res = get_client().search(index=settings.OPENSEARCH["INDEX_ARTICLE"], body=body)
    buckets = res["aggregations"]["top_tags"]["buckets"]
    # -> [{"key": "气候变化", "doc_count": 123}, ...]
    return buckets
```

## 4.3 相关推荐（基于标签的相似检索）

```python
def related_by_tags(page, limit=8):
    tags = list(page.tags.values_list("name", flat=True))
    if not tags:
        return []

    body = {
        "query": {
            "bool": {
                "must": [{"terms": {"tags": tags}}],
                "must_not": [{"term": {"id": str(page.id)}}]
            }
        },
        "size": limit
    }
    res = get_client().search(index=settings.OPENSEARCH["INDEX_ARTICLE"], body=body)
    return [hit["_source"] for hit in res["hits"]["hits"]]
```

---

# 5. 路由与视图（聚合页 + API）

## 5.1 Wagtail 页面路由（已在 `TagHubPage` 中实现）

* `/tags/` 列表页
* `/tags/<slug>/` 聚合页（可在模板中分页渲染）

## 5.2 简易 API（基于 Django 原生或 DRF）

```python
# news/api.py
from django.http import JsonResponse
from django.views.decorators.http import require_GET
from wagtail.models import Site as WagtailSite

from search.queries import search_articles_by_tag, top_tags
from news.models import ArticlePage

@require_GET
def api_top_tags(request):
    site = WagtailSite.find_for_request(request)
    buckets = top_tags(site_id=site.id if site else None, size=int(request.GET.get("size", 30)))
    return JsonResponse({"tags": buckets})

@require_GET
def api_tag_articles(request, tag_slug):
    from taggit.models import Tag
    from django.shortcuts import get_object_or_404
    tag = get_object_or_404(Tag, slug=tag_slug)
    site = WagtailSite.find_for_request(request)
    res = search_articles_by_tag(tag.name, site_id=site.id if site else None, size=int(request.GET.get("size", 20)))
    return JsonResponse({"hits": [h["_source"] for h in res["hits"]["hits"]]})
```

```python
# news/urls.py
from django.urls import path
from .api import api_top_tags, api_tag_articles

urlpatterns = [
    path("api/tags/top/", api_top_tags, name="api_top_tags"),
    path("api/tags/<slug:tag_slug>/", api_tag_articles, name="api_tag_articles"),
]
```

> 前端（React/Next.js 或多站点门户）可直接消费该 API，或通过 Wagtail 页面模板渲染。

---

# 6. 模板/SEO（要点）

* **标签聚合页**：唯一 URL：`/tags/<slug>/`；`<title>` 与 `<meta description>` 带上标签描述、分页号。
* **站点地图**：为 TagHubPage 及热门标签构造 sitemap（热门标签可限制 doc\_count 阈值）。
* **Canonical**：跨站点共享标签时，门户（portal）为 canonical，地方站点加 rel="canonical" 指向 portal 的同标签页（可选运营策略）。

---

# 7. 缓存与性能

* **页面层**：Tag 列表、标签聚合页使用 `cache_page` 或模板片段缓存（短 TTL + 失效信号）。
* **ES 查询层**：热门标签（terms agg）加 30\~120s 缓存。
* **数据库查询**：`ArticlePage` 列表预取 `tagged_items`，对 `ArticlePageTag(site)` 加索引（已加）。
* **限制**：编辑端校验每篇文章的标签数（例如 ≤ 10），防止过度打标签。

---

# 8. 运维与数据治理

## 8.1 初始化/回填索引

```python
# news/management/commands/reindex_articles.py
from django.core.management.base import BaseCommand
from wagtail.models import Page
from news.models import ArticlePage
from search.indexes import ensure_article_index
from search.indexer import index_article

class Command(BaseCommand):
    help = "Reindex all live ArticlePage to OpenSearch"

    def handle(self, *args, **options):
        ensure_article_index()
        qs = ArticlePage.objects.live().public()
        for p in qs.iterator(chunk_size=200):
            index_article(p)
        self.stdout.write(self.style.SUCCESS(f"Indexed {qs.count()} articles."))
```

## 8.2 标签合并（脏数据治理）

```python
# news/management/commands/merge_tags.py
from django.core.management.base import BaseCommand
from taggit.models import Tag

class Command(BaseCommand):
    help = "Merge tag B into tag A (keep A). Usage: --src '气候变化' --dst '气候变迁'"

    def add_arguments(self, parser):
        parser.add_argument("--src", required=True)
        parser.add_argument("--dst", required=True)

    def handle(self, *args, **opts):
        src = Tag.objects.get(name=opts["src"])
        dst = Tag.objects.get(name=opts["dst"])
        for item in src.taggit_taggeditem_items.all():
            item.tag = dst
            item.save(update_fields=["tag"])
        src.delete()
        self.stdout.write(self.style.SUCCESS(f"Merged '{opts['src']}' -> '{opts['dst']}'"))
```

> 合并后建议触发 `reindex_articles` 或增量重建相关文档。

---

# 9. 推荐与个性化（可选增强）

* **多特征相似**：在 ES 中引入 `category/section/entities` 字段，使用 `bool` + `should` 混合权重。
* **向量检索**：为 `title+summary` 生成向量（如 BGE/MiniLM），落到 `dense_vector`，结合标签 terms 做 rerank。
* **实时运营**：热门标签榜可叠加时间窗（最近7/30天），用索引时间或 `first_published_at` 过滤。

---

# 10. 多站点策略建议

* **共享库 + 过滤展示**（推荐）：标签统一建模，门户与地方站按 `site_id` 过滤渲染。
* **完全隔离**：如果某些站点完全独立，配置独立 `TagHubPage` 与 `ArticlePageTag.site` 强过滤。
* **跨站聚合页**（Portal）：Portal 的 TagHubPage 不加 `site_id` 过滤，做全网聚合与 SEO 抬头。

---

# 11. 最小测试清单

1. 在后台创建 `ArticleIndexPage`、`TagHubPage`。
2. 新建几篇 `ArticlePage`，打上 2\~5 个标签；发布。
3. 访问 `/tags/` 列表、`/tags/<slug>/` 聚合页。
4. 调用 `python manage.py reindex_articles`；访问 `GET /api/tags/top/`、`GET /api/tags/<slug>/`。
5. 删除/撤销文章，确认 ES 文档删除。
6. 多站点下切换 Hostname，验证聚合过滤符合预期。

---

## 你可以直接用这套骨架开始集成。

如果你希望，我可以**按你现有项目结构**（app 名称、目录划分、Docker Compose 的 OS/ES 服务、Nginx 路由、CI/CD 步骤）把以上代码打包成**可运行样例仓库结构**（含 `settings` 片段、`urls.py` 注册、基础模板与前端调用示例），或者把 **Tag 页模板**（含热门标签侧栏、相关推荐组件）也一起补充。
