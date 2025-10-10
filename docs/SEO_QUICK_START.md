# SEO 优化快速开始指南

## 🎯 快速概览

我们的 SEO 方案充分利用 Next.js 15 的原生能力，**不需要** wagtail-seo。

## ✅ 已实施的功能

### 1️⃣ 后端（自动生效）
- ✅ 新增 3 个 SEO 字段：`meta_keywords`、`og_image`、`structured_data`
- ✅ 自动生成结构化数据（NewsArticle Schema）
- ✅ API 自动返回完整 SEO 元数据
- ✅ Wagtail 管理界面新增"SEO优化"标签页

### 2️⃣ 前端（自动生效）
- ✅ 完整的 Meta 标签（title, description, keywords）
- ✅ Open Graph 标签（Facebook、LinkedIn 分享）
- ✅ Twitter Cards（Twitter 分享）
- ✅ JSON-LD 结构化数据（Google 搜索增强）
- ✅ 自动生成 sitemap.xml
- ✅ 自动生成 robots.txt

## 🚀 立即使用

### 编辑文章时

1. 在 Wagtail 中编辑文章
2. 切换到 **"SEO优化"** 标签页
3. 填写字段（都可以留空，系统会自动处理）：
   ```
   📝 SEO描述：150-160字符的文章摘要
   🔍 SEO关键词：用逗号分隔（留空自动使用标签）
   📱 社交分享图片：1200x630px（留空使用封面图）
   ⚙️ 结构化数据：高级用户自定义（留空自动生成）
   ```

### 验证 SEO 是否生效

```bash
# 1. 查看文章页面 Meta 标签
curl https://your-site.com/portal/article/test | grep "meta"

# 2. 查看结构化数据
curl https://your-site.com/portal/article/test | grep "application/ld+json"

# 3. 查看 Sitemap
curl https://your-site.com/portal/sitemap.xml

# 4. 查看 Robots.txt
curl https://your-site.com/portal/robots.txt
```

### 在线验证工具

- **Google**: https://search.google.com/test/rich-results
- **Facebook**: https://developers.facebook.com/tools/debug/
- **Twitter**: https://cards-dev.twitter.com/validator

## 📊 自动功能说明

| 功能 | 说明 | 无需操作 |
|-----|-----|---------|
| Meta 标签 | 自动生成 title、description、keywords | ✅ |
| Open Graph | 自动为社交媒体生成分享卡片 | ✅ |
| Twitter Cards | 自动为 Twitter 生成大图卡片 | ✅ |
| 结构化数据 | 自动生成 NewsArticle Schema | ✅ |
| Sitemap | 每小时自动更新 | ✅ |
| Robots.txt | 自动配置爬虫规则 | ✅ |

## 🎓 最佳实践

### ✍️ 撰写好的 SEO 描述
```
❌ 坏的例子：
"这是一篇新闻文章。"

✅ 好的例子：
"2025年10月，某市推出新政策，预计将影响20万家企业。本文详细解析政策要点和实施时间表。"
```

### 🏷️ 选择好的关键词
```
❌ 坏的例子：
"新闻,文章,内容,最新"

✅ 好的例子：
"新政策,企业减税,经济改革"
```

### 📱 社交分享图片
- **尺寸**: 1200x630px
- **格式**: WebP 或 JPEG
- **内容**: 包含文章标题或关键视觉元素
- **提示**: 留空时自动使用封面图

## 🔧 技术细节

### 文件修改列表
```
后端:
✓ apps/news/models/article.py          # 新增 SEO 字段和方法
✓ apps/news/migrations/0015_*.py       # 数据库迁移
✓ apps/api/rest/articles_api/core.py   # API 增强

前端:
✓ sites/app/portal/article/[slug]/page.tsx  # Metadata + JSON-LD
✓ sites/app/portal/sitemap.ts               # Sitemap 生成
✓ sites/app/portal/robots.ts                # Robots.txt 生成

文档:
✓ docs/SEO_OPTIMIZATION_IMPLEMENTATION.md   # 详细实施文档
✓ docs/SEO_QUICK_START.md                   # 本文档
```

### 访问 SEO URL
- **Sitemap**: `http://localhost:3001/portal/sitemap.xml`
- **Robots**: `http://localhost:3001/portal/robots.txt`
- **文章页**: `http://localhost:3001/portal/article/{slug}`

### 重要配置说明

#### Sitemap 生成配置
确保环境变量正确配置：

```yaml
# docker-compose.yml 或 .env 文件
DJANGO_API_URL=http://authoring:8000    # API 内部地址
NEXT_PUBLIC_SITE_HOSTNAME=localhost      # 站点主机名
```

**注意**: 站点标识应该是 `localhost`，而不是 `portal.localhost`。可以通过以下命令验证：

```bash
# 测试 API 是否返回文章
curl "http://localhost:8000/api/articles?site=localhost&page=1&size=5"
```

#### 如果 Sitemap 为空
查看 `docs/SEO_SITEMAP_TROUBLESHOOTING.md` 了解详细的排查步骤。

快速修复：
```bash
# 1. 重启 sites 容器
docker compose -f infra/local/docker-compose.yml restart sites

# 2. 查看日志
docker compose -f infra/local/docker-compose.yml logs sites | grep Sitemap

# 3. 清除缓存（如果需要）
docker compose -f infra/local/docker-compose.yml exec sites rm -rf .next
docker compose -f infra/local/docker-compose.yml restart sites
```

## ❓ 常见问题

### Q: 为什么不使用 wagtail-seo？
**A**: 我们的架构是 Headless CMS（前后端分离），Next.js 15 提供了更强大的原生 SEO 功能，比 wagtail-seo 更适合我们的需求。

### Q: SEO 字段是必填的吗？
**A**: 不是。所有 SEO 字段都可以留空，系统会自动：
- `meta_keywords` → 自动使用文章标签
- `og_image` → 自动使用封面图
- `structured_data` → 自动生成 NewsArticle Schema

### Q: 如何确认 SEO 生效？
**A**: 使用 Google Rich Results Test 或查看页面源代码中的 `<meta>` 标签。

### Q: Sitemap 多久更新一次？
**A**: 每小时自动更新，包含所有已发布的文章。

### Q: 如何优化现有文章？
**A**: 在 Wagtail 管理界面批量编辑文章，填写 SEO 描述和关键词即可。

## 📈 监控与优化

### 推荐工具
1. **Google Search Console** - 监控搜索表现
2. **Google Analytics** - 分析流量来源
3. **PageSpeed Insights** - 检查页面速度
4. **Lighthouse** - 综合性能评估

### 定期检查
- [ ] 每周：检查 Google Search Console 错误
- [ ] 每月：分析热门文章的 SEO 表现
- [ ] 每季度：优化低流量文章的 SEO

## 🎉 完成！

您的系统现在已经具备完整的 SEO 功能。只需要：
1. ✅ 撰写高质量内容
2. ✅ 填写 SEO 描述（可选）
3. ✅ 让系统自动处理其余部分

---

**提示**: 查看 `SEO_OPTIMIZATION_IMPLEMENTATION.md` 了解更多技术细节。

