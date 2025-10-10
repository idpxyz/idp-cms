# 文章页面加载速度优化方案

## 📊 问题诊断

根据之前的性能分析文档（REAL_PERFORMANCE_ISSUE.md），文章页面存在以下主要问题：

### 当前性能数据
```
页面渲染时间：     ~1714ms
客户端API请求：    ~1873ms
─────────────────────────
总加载时间：       ~3587ms (3.6秒)
```

### 主要瓶颈

1. **页面服务端渲染慢 (1714ms)**
   - ArticleLayout是客户端组件
   - 需要等待JavaScript水合（hydration）
   
2. **ArticleInteractions统计请求 (259ms)**
   - 每次组件挂载都请求
   - 没有检查缓存

3. **评论系统 (360ms) - ✅ 已优化**
   - 已使用Intersection Observer懒加载
   
4. **推荐文章请求 (219ms)**
   - 在客户端发起请求
   - 服务端已经获取了relatedArticles但未传递
   
5. **QRCode库 (~10KB) - ✅ 已优化**
   - 已改为动态导入

## ✅ 已完成的优化

根据代码检查，以下优化已经实施：

### 1. 评论系统懒加载 ✅
```typescript
// CommentSectionWrapper.tsx
useEffect(() => {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      setShouldLoadComments(true);
      observer.disconnect();
    }
  }, { rootMargin: '200px' });
  // ...
}, []);
```

### 2. QRCode动态导入 ✅
```typescript
// ArticleInteractions.tsx Line 176
const QRCode = (await import("qrcode")).default;
```

### 3. 相关文章超时控制 ✅
```typescript
// page.tsx Line 222
const timeoutPromise = new Promise<any[]>((resolve) => 
  setTimeout(resolve, 1000, []));
relatedArticles = await Promise.race([articlesPromise, timeoutPromise]);
```

## 🔴 需要优化的问题

### 问题1: ArticleInteractions统计请求无条件执行

**当前代码：**
```typescript
// ArticleInteractions.tsx Line 39-41
useEffect(() => {
  refreshArticleStats(articleId.toString());
}, [articleId, refreshArticleStats]);
```

**问题：**
- 每次组件挂载都请求，即使数据已在InteractionContext中
- 增加259ms延迟

**优化方案：**
```typescript
useEffect(() => {
  // 只在数据不存在或过期时才刷新
  const currentStats = getArticleInteraction(articleId.toString());
  if (!currentStats.statsLoaded || isStatsExpired(currentStats)) {
    refreshArticleStats(articleId.toString());
  }
}, [articleId]);
```

### 问题2: ArticleLayout是客户端组件

**当前代码：**
```typescript
// ArticleLayout.tsx Line 1
'use client';
```

**问题：**
- 整个布局需要在客户端水合
- 增加首屏渲染时间
- 文章内容本身可以是服务端组件

**优化方案：**
拆分为服务端和客户端组件：

```typescript
// ArticleServerLayout.tsx (Server Component)
export default async function ArticleServerLayout({ article, children }) {
  return (
    <div className="min-h-screen bg-white">
      {/* 静态内容 - 服务端渲染 */}
      <ArticleBreadcrumb {...} />
      <ArticleHeader article={article} />
      <ArticleContent content={article.content} />
      <ArticleTags tags={article.tags} />
      
      {/* 动态内容 - 客户端组件 */}
      {children}
    </div>
  );
}
```

### 问题3: 后端文章API可能慢

**检查点：**
- 数据库查询是否优化（索引）
- 是否有N+1查询问题
- 缓存是否生效

## 🚀 优化实施计划

### 阶段1: 快速修复 (今天，1小时)

#### 1.1 优化ArticleInteractions统计请求 ⚡

**文件：** `sites/app/portal/article/[slug]/components/ArticleInteractions.tsx`

**修改：**
```typescript
// Line 38-41，添加条件检查
useEffect(() => {
  const currentStats = getArticleInteraction(articleId.toString());
  
  // 只在以下情况才请求：
  // 1. 数据不存在
  // 2. 数据未标记为已加载
  if (!currentStats || !currentStats.statsLoaded) {
    refreshArticleStats(articleId.toString());
  }
}, [articleId, getArticleInteraction, refreshArticleStats]);
```

**预期收益：**
- 减少重复请求
- 节省~259ms（如果有缓存）

#### 1.2 添加请求时间日志

**文件：** `sites/app/portal/article/[slug]/page.tsx`

**修改：**
```typescript
export default async function ArticlePage({ params, searchParams }) {
  const startTime = Date.now();
  
  const { slug } = await params;
  // ...
  
  const article = await getArticle(slug, site);
  const articleFetchTime = Date.now() - startTime;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`📄 Article fetch time: ${articleFetchTime}ms`);
  }
  
  // ...
}
```

### 阶段2: 中期优化 (本周，2-3小时)

#### 2.1 拆分ArticleLayout为服务端/客户端组件

**新建：** `sites/app/portal/article/[slug]/components/ArticleStaticLayout.tsx`

```typescript
// 服务端组件 - 静态内容
export default function ArticleStaticLayout({ article, children }) {
  const coverImage = article.image_url || article.cover?.url;
  
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <nav className="py-2">
          {/* 面包屑 */}
        </nav>
        
        <article className="bg-white rounded-lg shadow-sm">
          <header className="px-6 md:px-12 pt-6 md:pt-8">
            <h1>{article.title}</h1>
            <div>{/* 元信息 */}</div>
          </header>
          
          {coverImage && (
            <div className="relative w-full h-64 md:h-96 my-4">
              <Image src={coverImage} alt={article.title} fill priority />
            </div>
          )}
          
          <div className="px-6 md:px-12 py-6">
            <div dangerouslySetInnerHTML={{ __html: article.content }} />
          </div>
          
          <div className="px-6 md:px-12 py-4">
            {/* 标签 */}
          </div>
          
          {/* 客户端组件插槽 */}
          {children}
        </article>
      </div>
    </div>
  );
}
```

#### 2.2 优化后端文章API

**检查：** `apps/api/rest/articles_api/core.py`

**优化点：**
1. 确保数据库索引存在：
   ```sql
   CREATE INDEX IF NOT EXISTS idx_article_slug ON news_articlepage(slug);
   CREATE INDEX IF NOT EXISTS idx_article_live ON news_articlepage(live);
   ```

2. 检查select_related和prefetch_related是否完整

3. 添加查询性能日志：
   ```python
   import time
   start = time.time()
   article = queryset.get(slug=slug)
   duration = (time.time() - start) * 1000
   print(f"DB query time: {duration:.2f}ms")
   ```

#### 2.3 优化InteractionContext

**文件：** `sites/lib/context/InteractionContext.tsx`

**添加缓存过期检查：**
```typescript
const STATS_CACHE_TTL = 5 * 60 * 1000; // 5分钟

interface ArticleInteractionState {
  // ... existing fields
  statsLoaded: boolean;
  statsLoadedAt?: number; // 添加时间戳
}

const isStatsExpired = (interaction: ArticleInteractionState) => {
  if (!interaction.statsLoadedAt) return true;
  return Date.now() - interaction.statsLoadedAt > STATS_CACHE_TTL;
};

const refreshArticleStats = async (articleId: string) => {
  const current = getArticleInteraction(articleId);
  
  // 如果数据未过期，跳过请求
  if (current.statsLoaded && !isStatsExpired(current)) {
    return;
  }
  
  // ... existing request logic
  
  // 更新时间戳
  setInteractions(prev => ({
    ...prev,
    [articleId]: {
      ...prev[articleId],
      statsLoaded: true,
      statsLoadedAt: Date.now(), // 记录加载时间
      // ... other stats
    }
  }));
};
```

### 阶段3: 长期优化 (下周，4-6小时)

#### 3.1 实施React Server Components架构

**目标：**
- 文章内容服务端渲染
- 交互功能客户端渲染
- 减少JavaScript包体积

#### 3.2 添加CDN缓存

**配置：**
```typescript
// page.tsx
export const revalidate = 300; // 5分钟
export const runtime = 'edge'; // 使用Edge Runtime
```

#### 3.3 数据库查询优化

**后端优化：**
1. 使用数据库连接池
2. 添加查询缓存（Redis）
3. 优化JOIN查询

## 📊 预期性能提升

### 优化前
```
页面渲染：          1714ms
统计请求：           259ms
评论请求：             0ms ✅ (已优化)
推荐文章：           219ms
其他：               84ms
────────────────────────────
总计：              2276ms
```

### 阶段1优化后
```
页面渲染：          1714ms (待优化)
统计请求：             0ms ⬇️ -259ms (缓存命中)
评论请求：             0ms ✅
推荐文章：           219ms (待优化)
其他：               84ms
────────────────────────────
总计：              2017ms ⬇️ -259ms (11% 提升)
```

### 阶段2优化后
```
页面渲染：          1000ms ⬇️ -714ms (服务端组件)
统计请求：             0ms ✅
评论请求：             0ms ✅
推荐文章：           219ms (待优化)
其他：               84ms
────────────────────────────
总计：              1303ms ⬇️ -973ms (43% 提升)
```

### 理想状态（所有优化）
```
页面渲染：           600ms ⬇️ -1114ms
统计请求：             0ms ✅
评论请求：             0ms ✅
推荐文章：             0ms ⬇️ -219ms (服务端传递)
其他：               84ms
────────────────────────────
总计：               684ms ⬇️ -1592ms (70% 提升！)
```

## 🧪 性能测试

### 测试命令
```bash
# 1. 开发环境测试
cd /opt/idp-cms
docker compose -f infra/local/docker-compose.yml logs sites -f | grep "GET /portal/article"

# 2. 使用curl测试
time curl -s -o /dev/null -w "%{time_total}s\n" http://localhost:3000/portal/article/test-slug

# 3. Chrome DevTools
- Network面板：查看请求瀑布图
- Performance面板：记录渲染性能
- Lighthouse：综合性能评分
```

### 关键指标
- **TTFB** (Time To First Byte): < 200ms
- **FCP** (First Contentful Paint): < 1s
- **LCP** (Largest Contentful Paint): < 2.5s
- **TTI** (Time to Interactive): < 3.5s

## 📝 实施步骤

### Step 1: 立即优化ArticleInteractions
1. 修改`ArticleInteractions.tsx`添加条件检查
2. 测试验证统计请求减少
3. 提交代码

### Step 2: 添加性能监控
1. 在`page.tsx`添加时间日志
2. 在后端API添加查询时间日志
3. 收集基准数据

### Step 3: 优化后端查询
1. 检查数据库索引
2. 优化Django ORM查询
3. 添加Redis缓存

### Step 4: 重构为服务端组件
1. 创建`ArticleStaticLayout`
2. 移动静态内容到服务端
3. 保留交互功能在客户端

## 🎯 成功标准

### 开发环境
- 文章页面加载时间 < 1.5秒
- API响应时间 < 300ms
- 无重复API请求

### 生产环境
- LCP < 2.5秒
- FCP < 1秒
- Lighthouse性能分数 > 90

---

**创建时间：** 2025-10-10  
**优先级：** 🔴 HIGH
**预计完成：** 本周内

