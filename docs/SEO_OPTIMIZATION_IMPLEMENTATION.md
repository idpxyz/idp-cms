# SEO 优化实施总结

## 📋 概述

本文档记录了为 IDP-CMS 系统实施的完整 SEO 优化方案。该方案基于前后端分离架构（Django/Wagtail + Next.js），充分利用 Next.js 15 的原生 SEO 能力，无需使用 wagtail-seo。

## ✅ 已完成的功能

### 1. 后端模型增强（Django/Wagtail）

#### 新增 SEO 字段
在 `ArticlePage` 模型中添加了以下字段：

```python
# apps/news/models/article.py

# SEO 专用字段
meta_keywords = CharField(max_length=255)  # SEO关键词
og_image = ForeignKey('media.CustomImage')  # 社交分享专用图片
structured_data = JSONField()               # Schema.org 结构化数据
```

#### 辅助方法
```python
def get_seo_keywords()        # 获取SEO关键词（自动回退到标签）
def get_og_image_url()        # 获取社交分享图片URL
def generate_structured_data() # 自动生成结构化数据
def get_structured_data()      # 获取结构化数据（优先自定义）
```

#### 管理界面优化
- 在 Wagtail 管理界面添加了完整的 SEO 标签页
- 包含搜索引擎优化、社交媒体、高级设置三个面板
- 提供友好的帮助文本和最佳实践提示

### 2. API 增强

#### SEO 元数据输出
在文章详情 API (`/api/articles/{slug}`) 中添加了 `seo` 字段：

```json
{
  "id": 123,
  "title": "文章标题",
  "excerpt": "文章摘要",
  "seo": {
    "keywords": "关键词1, 关键词2",
    "og_image_url": "https://cdn.example.com/images/og-image.webp",
    "structured_data": {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      ...
    }
  }
}
```

### 3. 前端 SEO 实现（Next.js 15）

#### 增强的 Metadata API
在 `/sites/app/portal/article/[slug]/page.tsx` 中实现了完整的 `generateMetadata`：

```typescript
export async function generateMetadata() {
  return {
    title: "文章标题",
    description: "文章描述",
    keywords: "关键词",
    authors: [{ name: "作者" }],
    alternates: {
      canonical: "规范链接"
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { ... }
    },
    openGraph: {
      title: "...",
      description: "...",
      images: [{ url: "...", width: 1200, height: 630 }],
      type: "article",
      publishedTime: "...",
      modifiedTime: "...",
      section: "频道名称",
      tags: ["标签1", "标签2"]
    },
    twitter: {
      card: "summary_large_image",
      title: "...",
      description: "...",
      images: ["..."]
    }
  };
}
```

#### 结构化数据（JSON-LD）
在文章页面自动注入 NewsArticle Schema.org 结构化数据：

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "NewsArticle",
  "headline": "...",
  "image": "...",
  "datePublished": "...",
  "author": { "@type": "Person", "name": "..." },
  "publisher": { "@type": "Organization", "name": "..." }
}
</script>
```

#### 动态 Sitemap 生成
创建了 `/sites/app/portal/sitemap.ts`：
- 自动获取所有文章并生成 sitemap.xml
- 支持分页获取大量文章
- 1小时缓存重新验证
- 根据文章重要性设置不同优先级

#### Robots.txt 配置
创建了 `/sites/app/portal/robots.ts`：
- 配置搜索引擎爬虫规则
- 指向 sitemap.xml
- 针对不同爬虫（Google、百度）设置不同策略

## 🗄️ 数据库迁移

已创建并应用迁移文件：
- `apps/news/migrations/0015_add_seo_fields.py`
- 添加了 `meta_keywords`、`og_image_id`、`structured_data` 三个字段

## 📊 SEO 功能对比

| 功能 | wagtail-seo | 我们的方案 | 优势 |
|-----|------------|-----------|------|
| Meta 标签 | ✅ | ✅ | 更灵活的控制 |
| Open Graph | ✅ | ✅ | 完整的 OG 支持 |
| Twitter Cards | ❌ | ✅ | 支持 Twitter |
| 结构化数据 | ❌ | ✅ | NewsArticle Schema |
| 动态 Sitemap | ❌ | ✅ | 自动生成 |
| Robots.txt | ❌ | ✅ | 动态配置 |
| 架构适配 | 传统 SSR | Headless CMS | 完美适配 |
| 性能 | 较慢 | 快速 | Next.js ISR |

## 🎯 使用指南

### 编辑文章时设置 SEO

1. 在 Wagtail 管理界面编辑文章
2. 切换到 "SEO优化" 标签页
3. 填写 SEO 字段：
   - **SEO描述**（excerpt）：150-160字符
   - **SEO关键词**：用逗号分隔，留空自动使用标签
   - **社交分享图片**：1200x630px，留空使用封面图
   - **结构化数据**：高级用户可自定义，留空自动生成

### API 调用示例

```bash
# 获取文章详情（包含 SEO 数据）
curl https://api.example.com/api/articles/article-slug

# 响应包含 seo 字段
{
  "id": 123,
  "title": "文章标题",
  "seo": {
    "keywords": "新闻,时事,热点",
    "og_image_url": "https://...",
    "structured_data": { ... }
  }
}
```

### 前端自动处理

前端无需额外操作，SEO 数据会自动：
1. 注入到 HTML `<head>` 标签
2. 生成 JSON-LD 结构化数据
3. 包含在 sitemap.xml 中

## 🔍 验证 SEO 实施

### 1. 检查 Meta 标签
```bash
# 查看文章页面源代码
curl https://your-site.com/portal/article/test-article | grep "meta"
```

应该看到：
- `<meta name="description" content="...">`
- `<meta name="keywords" content="...">`
- `<meta property="og:title" content="...">`
- `<meta property="og:image" content="...">`
- `<meta name="twitter:card" content="summary_large_image">`

### 2. 检查结构化数据
```bash
# 查看 JSON-LD
curl https://your-site.com/portal/article/test-article | grep "application/ld+json"
```

### 3. 检查 Sitemap
```bash
# 访问 sitemap
curl https://your-site.com/portal/sitemap.xml
```

### 4. 检查 Robots.txt
```bash
curl https://your-site.com/portal/robots.txt
```

### 5. 使用 Google 工具验证
- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [Google Search Console](https://search.google.com/search-console)
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)

## 🚀 性能优化

### ISR (Incremental Static Regeneration)
- 文章页面：5分钟重新验证
- Sitemap：1小时重新验证
- 减少服务器负载，提高响应速度

### 图片优化
- 社交分享图片自动转换为 WebP 格式
- 使用 1200x630 标准尺寸
- 质量 85%，平衡质量和文件大小

## 📈 SEO 最佳实践

### 文章标题
- 长度：50-60字符
- 包含主要关键词
- 吸引人且描述准确

### 文章摘要（Description）
- 长度：150-160字符
- 概括文章核心内容
- 包含2-3个关键词
- 有明确的行动呼吁

### 关键词
- 3-5个主要关键词
- 与文章内容高度相关
- 避免关键词堆砌

### 社交分享图片
- 尺寸：1200x630px（Facebook、Twitter 最佳）
- 格式：WebP 或 JPEG
- 包含文章标题或重要视觉元素
- 避免重要内容靠近边缘

### 结构化数据
- 系统自动生成，通常无需手动修改
- 确保发布时间、作者信息准确
- 图片 URL 完整且可访问

## 🔧 故障排查

### SEO 字段未显示
1. 检查数据库迁移是否应用：
   ```bash
   docker compose -f infra/local/docker-compose.yml exec authoring python manage.py showmigrations news
   ```
2. 确认 `0015_add_seo_fields` 已应用

### API 不返回 SEO 数据
1. 检查模型方法是否存在
2. 重启 authoring 容器：
   ```bash
   docker compose -f infra/local/docker-compose.yml restart authoring
   ```

### Sitemap 为空
1. 检查 API 端点是否可访问
2. 查看 Next.js 日志：
   ```bash
   docker compose -f infra/local/docker-compose.yml logs -f site
   ```

### 结构化数据验证失败
1. 使用 Google Rich Results Test 检查
2. 确保必填字段（headline, image, datePublished, author, publisher）存在

## 📚 相关文档

- [Next.js Metadata API](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- [Schema.org NewsArticle](https://schema.org/NewsArticle)
- [Google Search Central](https://developers.google.com/search/docs)
- [Open Graph Protocol](https://ogp.me/)
- [Twitter Cards](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)

## 🎓 后续优化建议

### 短期（1-2周）
- [ ] 为所有现有文章生成 SEO 关键词（批量脚本）
- [ ] 添加热门文章的社交分享图片
- [ ] 监控 sitemap 生成性能

### 中期（1个月）
- [ ] 实现多语言 hreflang 标签
- [ ] 添加面包屑导航的结构化数据
- [ ] 实现图片 sitemap
- [ ] 添加视频结构化数据（如果有视频内容）

### 长期（3个月）
- [ ] 实现 AMP 页面（可选）
- [ ] 添加 FAQ 结构化数据
- [ ] 实现评论的结构化数据
- [ ] SEO 分析仪表板

## 📞 联系与支持

如有问题或需要协助，请联系开发团队。

---

**最后更新**: 2025-10-10  
**作者**: AI Assistant  
**版本**: 1.0.0

