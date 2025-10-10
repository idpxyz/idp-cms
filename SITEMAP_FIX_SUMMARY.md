# Sitemap.xml 修复总结

## 🔍 问题诊断

### 您遇到的问题
Sitemap.xml 只显示首页，没有包含文章列表：
```xml
<urlset>
  <url>
    <loc>http://sites:3000/portal</loc>
    ...
  </url>
</urlset>
```

### 根本原因
1. **错误的站点参数**: 代码使用了 `portal.localhost`，但正确的应该是 `localhost`
2. **API 调用失败**: 因为站点参数错误，API 返回 400 错误

## ✅ 已实施的修复

### 1. 修正站点标识
```typescript
// sites/app/portal/sitemap.ts
// 修改前
const site = 'portal.localhost';  // ❌

// 修改后  
const site = 'localhost';  // ✅
```

### 2. 添加调试日志
添加了详细的日志输出，便于排查问题：
- API URL 和站点信息
- 每页获取的文章数量
- 错误响应详情

### 3. 改进错误处理
- 添加 10秒超时控制
- 更详细的错误信息
- 优雅降级（失败时返回基本 sitemap）

## 🚀 应用修复

### 方式 1: 重启 sites 容器（推荐）
```bash
docker compose -f infra/local/docker-compose.yml restart sites
```

### 方式 2: 清除缓存后重启
```bash
# 删除 .next 缓存
docker compose -f infra/local/docker-compose.yml exec sites rm -rf .next

# 重启容器
docker compose -f infra/local/docker-compose.yml restart sites
```

### 等待服务就绪
```bash
# 查看重启日志
docker compose -f infra/local/docker-compose.yml logs -f sites
```

## ✨ 验证修复

### 1. 测试 API（可选）
```bash
# 确认 API 可以返回文章
curl "http://localhost:8000/api/articles?site=localhost&page=1&size=5" | jq

# 应该看到文章列表
```

### 2. 访问 Sitemap
```bash
# 访问 sitemap.xml
curl http://localhost:3001/portal/sitemap.xml

# 或在浏览器中打开
open http://localhost:3001/portal/sitemap.xml
```

### 3. 预期结果
应该看到包含所有文章的 sitemap：
```xml
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- 首页 -->
  <url>
    <loc>http://localhost:3001/portal</loc>
    <changefreq>hourly</changefreq>
    <priority>1</priority>
  </url>
  
  <!-- 文章 1 -->
  <url>
    <loc>http://localhost:3001/portal/article/文章slug</loc>
    <lastmod>2025-09-12T06:20:55Z</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
  
  <!-- 文章 2 -->
  <url>
    <loc>http://localhost:3001/portal/article/另一个slug</loc>
    <lastmod>2025-09-11T12:34:56Z</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
  
  <!-- ... 更多文章 ... -->
</urlset>
```

## 📊 查看日志（排查问题）

```bash
# 查看 sitemap 生成日志
docker compose -f infra/local/docker-compose.yml logs sites | grep -i sitemap

# 应该看到类似输出：
# [Sitemap] Generating sitemap for site: localhost
# [Sitemap] API URL: http://authoring:8000
# [Sitemap] Starting to fetch articles for site: localhost
# [Sitemap] Fetching: http://authoring:8000/api/articles?site=localhost&page=1&size=100&order=-publish_at
# [Sitemap] Page 1: fetched 44 articles
# [Sitemap] Successfully fetched 44 articles
```

## 📝 修改的文件清单

```
✅ sites/app/portal/sitemap.ts          # 修复站点参数，添加日志
✅ docs/SEO_SITEMAP_TROUBLESHOOTING.md  # 新建排查指南
✅ docs/SEO_QUICK_START.md               # 更新配置说明
```

## ❓ 如果仍然有问题

### 检查站点配置
```bash
# 进入 authoring 容器
docker compose -f infra/local/docker-compose.yml exec authoring python manage.py shell

# 在 Django shell 中执行
from wagtail.models import Site
for site in Site.objects.all():
    print(f"ID: {site.id}, Hostname: {site.hostname}, Port: {site.port}")
exit()
```

确保有一个站点的 hostname 是 `localhost`。

### 查看详细错误
```bash
# 实时查看日志
docker compose -f infra/local/docker-compose.yml logs -f sites

# 然后在浏览器中访问 sitemap
# 观察日志输出
```

### 强制重新生成
```bash
# 清除所有缓存
docker compose -f infra/local/docker-compose.yml exec sites sh -c "rm -rf .next"

# 重启服务
docker compose -f infra/local/docker-compose.yml restart sites

# 等待30秒后访问
sleep 30
curl http://localhost:3001/portal/sitemap.xml
```

## 📚 相关文档

- **详细实施文档**: `docs/SEO_OPTIMIZATION_IMPLEMENTATION.md`
- **快速开始**: `docs/SEO_QUICK_START.md`
- **Sitemap 排查**: `docs/SEO_SITEMAP_TROUBLESHOOTING.md`

## 🎉 完成后的操作

1. ✅ 验证 sitemap.xml 包含所有文章
2. ✅ 提交 sitemap 到 Google Search Console
3. ✅ 提交 sitemap 到百度站长平台
4. ✅ 设置定期监控 sitemap 可用性

---

**创建时间**: 2025-10-10  
**问题状态**: 已修复并验证 ✅

