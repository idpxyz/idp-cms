# 文章页面性能优化方案

## 🔴 问题总结

### 1. 核心问题：服务端渲染阻塞
- **位置**：`sites/app/portal/article/[slug]/page.tsx:209`
- **问题**：`const article = await getArticle(slug, site)` 阻塞整个页面渲染
- **影响**：用户在API返回前看不到任何内容，无法交互
- **最坏情况**：9秒阻塞时间（3秒超时 × 最多3次重试）

### 2. API性能问题
- **位置**：`sites/lib/api/ArticleService.ts`
- **配置**：
  - 超时：3000ms (第137、144行)
  - 重试次数：2次 (第173行)
  - 重试延迟：500ms (第174行)

### 3. 元数据获取阻塞
- **位置**：`page.tsx:323-397` (`generateMetadata`)
- **问题**：元数据获取也使用同样慢的API调用

## ✅ 解决方案

### 方案A：Streaming SSR（推荐）⭐

#### 优点：
- ✅ 页面立即显示加载状态
- ✅ 用户可以立即看到骨架屏
- ✅ 内容就绪后流式渲染
- ✅ 保留SEO优势（仍然是服务端渲染）

#### 实现：
已创建 `page-streaming.tsx`，主要改进：

1. **将文章获取拆分到独立组件**：
```typescript
async function ArticleContent({ slug, site }) {
  const article = await getArticle(slug, site);
  // ...渲染逻辑
}
```

2. **使用Suspense包裹**：
```typescript
export default async function ArticlePage({ params, searchParams }) {
  const { slug } = await params;
  
  return (
    <Suspense fallback={<ArticleLoadingSkeleton />}>
      <ArticleContent slug={slug} site={site} />
    </Suspense>
  );
}
```

3. **减少超时时间**：
- API超时：3000ms → **1500ms**
- 相关文章超时：5000ms → **2000ms**

#### 使用方法：
```bash
# 方法1：直接替换
mv sites/app/portal/article/[slug]/page.tsx sites/app/portal/article/[slug]/page.old.tsx
mv sites/app/portal/article/[slug]/page-streaming.tsx sites/app/portal/article/[slug]/page.tsx

# 方法2：手动应用修改（推荐）
# 参考 page-streaming.tsx 的关键改动
```

---

### 方案B：优化ArticleService超时设置

#### 修改文件：`sites/lib/api/ArticleService.ts`

```typescript
// 第137、144行：减少超时
timeout: 1500, // 🚀 3000 → 1500

// 第173行：减少重试次数
maxAttempts: 1, // 🚀 2 → 1（快速失败）

// 第174行：减少重试延迟
baseDelay: 200, // 🚀 500 → 200
```

#### 影响：
- 最坏情况：1.5秒 × 2次 = 3秒（从9秒减少到3秒）
- 权衡：可能会在网络慢时更容易失败

---

### 方案C：添加请求超时控制（配合方案A/B）

#### 修改 `page.tsx` 的 `getArticle` 函数：

```typescript
async function getArticle(slug: string, site?: string): Promise<Article | null> {
  try {
    const decodedSlug = decodeURIComponent(slug);
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const url = new URL(`${baseUrl}/api/articles/${decodedSlug}`);
    if (site) {
      url.searchParams.set("site", site);
    }

    // 🚀 添加AbortController，1.5秒强制超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    try {
      const response = await fetch(url.toString(), {
        next: { revalidate: 300 },
        headers: { "Content-Type": "application/json" },
        signal: controller.signal, // 添加这行
      });

      clearTimeout(timeoutId);
      
      // ...其余代码保持不变
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.error('Article fetch timeout');
        return null; // 或抛出错误触发error.tsx
      }
      throw error;
    }
  } catch (error: any) {
    // ...
  }
}
```

---

### 方案D：客户端渲染（不推荐，但最快）

#### 优点：
- 页面立即可交互
- 完全不阻塞渲染

#### 缺点：
- ❌ SEO不友好
- ❌ 首屏内容为空
- ❌ 不适合新闻/文章类网站

---

## 🎯 推荐实施步骤

### 立即执行（快速修复）：

1. **修改 ArticleService.ts 的超时配置**（方案B）：
```bash
# 第137、144行
timeout: 1500

# 第173行
maxAttempts: 1

# 第174行
baseDelay: 200
```

2. **在 page.tsx 的 getArticle 添加 AbortController**（方案C）

### 中期优化（完整方案）：

3. **采用 Streaming SSR 架构**（方案A）：
   - 使用我创建的 `page-streaming.tsx` 作为参考
   - 逐步迁移现有代码

---

## 📊 预期效果

### 优化前：
- 首次内容可见时间(FCP)：**3-9秒**
- 页面可交互时间(TTI)：**3-9秒**
- 用户体验：❌ 长时间白屏，完全无法操作

### 优化后（方案B+C）：
- 首次内容可见时间(FCP)：**1.5-3秒**
- 页面可交互时间(TTI)：**1.5-3秒**
- 用户体验：⚠️ 改善，但仍需等待

### 优化后（方案A）：
- 首次内容可见时间(FCP)：**<500ms** ✅
- 骨架屏显示时间：**立即** ✅
- 内容渲染时间：**1.5-3秒** 
- 页面可交互时间(TTI)：**<500ms** ✅
- 用户体验：✅ 立即看到加载状态，可以查看页面结构

---

## 🧪 验证方法

### 1. 测试加载时间
```bash
# 使用curl测试API响应时间
time curl -I "http://localhost:3000/api/articles/your-test-slug"

# Chrome DevTools
# Network面板 → Disable cache → 刷新页面
# 查看：
# - TTFB (Time to First Byte)
# - FCP (First Contentful Paint)
# - LCP (Largest Contentful Paint)
```

### 2. 测试慢速网络
```bash
# Chrome DevTools → Network → Throttling → Slow 3G
# 观察：
# - 骨架屏是否立即显示（方案A）
# - 页面是否长时间白屏（现有问题）
```

### 3. 测试超时情况
```bash
# 临时关闭后端API
# 观察页面是否优雅降级
# - 是否显示错误页面
# - 是否卡死
```

---

## ⚠️ 注意事项

1. **缓存策略**：
   - 确保 `revalidate: 300` 配置正确
   - 考虑使用 CDN 缓存

2. **错误处理**：
   - 添加 `error.tsx` 处理API失败情况
   - 提供用户友好的错误提示

3. **监控**：
   - 添加性能监控（如 Vercel Analytics）
   - 记录超时和失败率

4. **回退机制**：
   - 保留 `page.old.tsx` 作为备份
   - 使用功能开关逐步推出

---

## 📝 相关文件

- ✅ 优化版本：`sites/app/portal/article/[slug]/page-streaming.tsx`
- 🔧 需修改：`sites/lib/api/ArticleService.ts`
- 📄 当前版本：`sites/app/portal/article/[slug]/page.tsx`
- 🎨 加载状态：`sites/app/portal/article/[slug]/loading.tsx`

---

## 🆘 如果问题依然存在

### 检查后端API性能：
```bash
# 直接测试后端API
curl -w "@curl-format.txt" -o /dev/null -s "http://your-backend/api/articles/test-slug"

# curl-format.txt内容：
time_namelookup:  %{time_namelookup}\n
time_connect:  %{time_connect}\n
time_starttransfer:  %{time_starttransfer}\n
time_total:  %{time_total}\n
```

### 可能的后端问题：
- 数据库查询慢
- 缺少索引
- N+1查询问题
- 未使用数据库连接池


