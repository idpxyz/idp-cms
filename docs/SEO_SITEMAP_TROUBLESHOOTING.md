# Sitemap 生成问题排查与解决

## 🔍 问题诊断

### 问题描述
Sitemap.xml 只显示首页，没有包含文章列表。

### 根本原因
1. **站点参数错误**: 初始配置使用了错误的站点标识 `portal.localhost`，正确的应该是 `localhost`
2. **API URL 配置**: 需要使用正确的内部 API URL (`http://authoring:8000`)

## ✅ 已实施的修复

### 1. 更新 sitemap.ts
```typescript
// 修复前
const site = 'portal.localhost';  // ❌ 错误

// 修复后
const site = process.env.NEXT_PUBLIC_SITE_HOSTNAME || 
             process.env.SITE_HOSTNAME || 
             'localhost';  // ✅ 正确
```

### 2. 添加详细日志
- 添加了请求 URL 的日志输出
- 添加了错误响应的详细记录
- 添加了超时控制（10秒）

### 3. 使用正确的 API URL
```typescript
// 使用容器内部地址
const apiUrl = process.env.DJANGO_API_URL || 'http://authoring:8000';
```

## 🚀 应用修复

### 方式 1: 等待自动重新加载（推荐）
Next.js 开发模式会自动检测文件变更并重新加载：

```bash
# 在容器日志中查看是否已重新编译
docker compose -f infra/local/docker-compose.yml logs -f sites | grep -i compiled
```

### 方式 2: 重启 sites 容器
```bash
docker compose -f infra/local/docker-compose.yml restart sites
```

### 方式 3: 清除 Next.js 缓存
```bash
# 进入 sites 容器
docker compose -f infra/local/docker-compose.yml exec sites sh

# 删除 .next 缓存
rm -rf .next

# 退出容器
exit

# 重启服务
docker compose -f infra/local/docker-compose.yml restart sites
```

## 🧪 验证修复

### 1. 检查 API 是否正常
```bash
# 测试文章 API（从宿主机）
curl "http://localhost:8000/api/articles?site=localhost&page=1&size=5" | jq '.items | length'

# 应该返回文章数量（如 5）
```

### 2. 检查 sitemap.xml
```bash
# 访问 sitemap
curl http://localhost:3001/portal/sitemap.xml

# 应该包含多个 <url> 条目
```

### 3. 查看容器日志
```bash
# 查看 sitemap 生成日志
docker compose -f infra/local/docker-compose.yml logs sites --tail=50 | grep Sitemap

# 应该看到类似的输出：
# [Sitemap] Generating sitemap for site: localhost
# [Sitemap] API URL: http://authoring:8000
# [Sitemap] Starting to fetch articles for site: localhost
# [Sitemap] Page 1: fetched 100 articles
# [Sitemap] Successfully fetched 44 articles
```

## 📊 预期结果

### 修复后的 sitemap.xml 应该包含：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- 首页 -->
  <url>
    <loc>http://localhost:3001/portal</loc>
    <lastmod>2025-10-10T04:05:05.087Z</lastmod>
    <changefreq>hourly</changefreq>
    <priority>1</priority>
  </url>
  
  <!-- 文章 1 -->
  <url>
    <loc>http://localhost:3001/portal/article/article-slug-1</loc>
    <lastmod>2025-09-12T06:20:55.113790+00:00</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
  
  <!-- 文章 2 -->
  <url>
    <loc>http://localhost:3001/portal/article/article-slug-2</loc>
    <lastmod>2025-09-11T12:34:56.789012+00:00</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
  
  <!-- ... 更多文章 ... -->
</urlset>
```

## 🔧 常见问题

### Q1: sitemap 仍然只显示首页
**A**: 检查以下几点：
1. 确认 sites 容器已重启或代码已重新编译
2. 清除浏览器缓存
3. 查看容器日志中的错误信息

### Q2: API 返回 400 错误
**A**: 可能的原因：
- 站点参数不正确
- 数据库中没有对应的 Site 记录

检查数据库中的站点配置：
```bash
docker compose -f infra/local/docker-compose.yml exec authoring python manage.py shell

# 在 Django shell 中
from wagtail.models import Site
for site in Site.objects.all():
    print(f"ID: {site.id}, Hostname: {site.hostname}, Port: {site.port}")
```

### Q3: 文章没有 SEO 数据
**A**: 
1. 确认数据库迁移已应用：
   ```bash
   docker compose -f infra/local/docker-compose.yml exec authoring python manage.py migrate news
   ```

2. 重启 authoring 容器：
   ```bash
   docker compose -f infra/local/docker-compose.yml restart authoring
   ```

3. 在 Wagtail 管理界面编辑文章，填写 SEO 字段

### Q4: sitemap 生成很慢
**A**: 这是正常的，因为需要分页获取所有文章。可以通过以下方式优化：
- 减少每页大小（修改 `size` 参数）
- 增加缓存时间（修改 `revalidate`）
- 限制最大页数（修改页数限制）

## 📝 环境变量配置

确保在 docker-compose.yml 或环境变量文件中配置以下变量：

```yaml
services:
  sites:
    environment:
      - DJANGO_API_URL=http://authoring:8000  # ✅ 重要！
      - NEXT_PUBLIC_API_URL=http://localhost:8000
      - NEXT_PUBLIC_SITE_URL=http://localhost:3001
      - NEXT_PUBLIC_SITE_HOSTNAME=localhost  # ✅ 可选但推荐
```

## 🎯 性能优化建议

### 1. 增量更新策略
对于大量文章的网站，考虑实施增量更新：
- 主 sitemap 包含最近更新的文章
- 归档 sitemap 包含历史文章

### 2. Sitemap 索引
如果文章超过 50,000 篇，实施 sitemap 索引：
- `sitemap_index.xml` - 主索引
- `sitemap_1.xml`, `sitemap_2.xml` - 分片 sitemap

### 3. 缓存优化
```typescript
// 增加缓存时间（从 1小时 到 6小时）
export const revalidate = 21600;  // 6 小时
```

## ✅ 验证清单

- [ ] API 可以正常返回文章列表
- [ ] sitemap.xml 包含多个文章 URL
- [ ] 文章 URL 格式正确
- [ ] lastmod 时间正确
- [ ] priority 和 changefreq 合理
- [ ] 容器日志没有错误
- [ ] sitemap 可以被 Google Search Console 验证

## 📞 需要帮助？

如果问题仍然存在：
1. 检查容器日志：`docker compose logs sites -f | grep Sitemap`
2. 测试 API 端点：`curl http://localhost:8000/api/articles?site=localhost`
3. 查看 Next.js 编译输出

---

**最后更新**: 2025-10-10  
**问题状态**: 已修复 ✅

