# 频道切换 UX 改进方案

## 🎯 问题
频道之间切换很慢，用户会以为页面没有响应，体验不好。

## ✨ 解决方案

### 方案 1：使用 Suspense + Loading 组件（推荐）⭐

在 `ChannelPageRenderer` 中使用 Suspense：

```typescript
// sites/app/portal/components/ChannelPageRenderer.tsx
import { Suspense } from 'react';
import { SocialTemplateLoading } from '../templates/channels/SocialTemplate';

const ChannelPageRenderer = ({ channelSlug, channels, tags }) => {
  const channel = channels.find(ch => ch.slug === channelSlug);
  const TemplateComponent = getChannelTemplate(channel);
  
  // 🎨 为每个模板提供对应的 Loading UI
  const LoadingComponent = getChannelLoadingTemplate(channel);
  
  return (
    <Suspense fallback={<LoadingComponent />}>
      <TemplateComponent
        channel={channel}
        channels={channels}
        tags={tags}
      />
    </Suspense>
  );
};
```

**优点**：
- ✅ Next.js 15 原生支持
- ✅ 流式渲染，部分内容可以先显示
- ✅ 用户立即看到骨架屏反馈
- ✅ 不阻塞其他部分的渲染

---

### 方案 2：路由级别 loading.tsx

在频道页面添加 `loading.tsx`：

```typescript
// sites/app/portal/loading.tsx
import SocialTemplateLoading from './templates/channels/SocialTemplateLoading';

export default function Loading() {
  return <SocialTemplateLoading />;
}
```

**优点**：
- ✅ 自动应用于整个路由
- ✅ Next.js 自动处理
- ✅ 配置简单

---

### 方案 3：添加进度指示器

在页面顶部添加进度条：

```bash
npm install nprogress
```

```typescript
// sites/app/portal/components/ChannelPageRenderer.tsx
'use client';

import { useEffect } from 'react';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

export default function ChannelPageRenderer({ ... }) {
  useEffect(() => {
    NProgress.start();
    return () => NProgress.done();
  }, [channelSlug]);
  
  // ... rest of code
}
```

**优点**：
- ✅ 轻量级
- ✅ 类似 YouTube、GitHub 的顶部进度条
- ✅ 用户清楚知道正在加载

---

### 方案 4：优化数据获取（根本解决）

#### 4.1 并行请求优化
当前已经使用 `Promise.all`，但可以进一步优化：

```typescript
// SocialTemplate.utils.ts
export async function getSocialChannelStats(channelSlug: string) {
  // ⚡ 统计数据可以异步加载，不阻塞主要内容
  // 使用更短的超时时间
  const fetchConfig = endpoints.createFetchConfig({
    timeout: 5000, // 减少到 5 秒
    next: { revalidate: 600 },
  });
  // ...
}
```

#### 4.2 分层加载
```typescript
// 关键内容优先
const [headlines, latestNews] = await Promise.all([
  getSocialHeadlines(channel.slug, 5),
  getSocialLatestNews(channel.slug, 3),
]);

// 次要内容延迟加载
Promise.all([
  getSocialHotArticles(channel.slug, 5),
  getSocialChannelStats(channel.slug),
]).then(([hot, stats]) => {
  // 更新状态或使用 Server Actions
});
```

#### 4.3 使用 React 18 的并发特性
```typescript
<Suspense fallback={<HeadlinesSkeleton />}>
  <Headlines channelSlug={channel.slug} />
</Suspense>

<Suspense fallback={<StatsSkeleton />}>
  <Stats channelSlug={channel.slug} />
</Suspense>
```

---

### 方案 5：预加载 (Prefetch)

在频道导航链接上添加预加载：

```typescript
// ChannelNavigation.tsx
import Link from 'next/link';

<Link 
  href={`/portal?channel=${channel.slug}`}
  prefetch={true}  // 🚀 鼠标悬停时预加载
>
  {channel.name}
</Link>
```

**优点**：
- ✅ 用户点击前数据已经开始加载
- ✅ 几乎即时的切换体验
- ✅ Next.js 自动智能预加载

---

### 方案 6：添加过渡动画

使用 Framer Motion 或 CSS 过渡：

```typescript
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  <SocialTemplateClient {...props} />
</motion.div>
```

**优点**：
- ✅ 视觉连续性
- ✅ 掩饰加载时间
- ✅ 提升感知性能

---

## 🎨 推荐的完整方案

结合多个方案，提供最佳 UX：

### 1. 立即反馈（骨架屏）
```typescript
<Suspense fallback={<SocialTemplateLoading />}>
  <SocialTemplate {...props} />
</Suspense>
```

### 2. 进度指示
```css
/* 全局样式 */
.page-loading {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: linear-gradient(to right, #3b82f6, #8b5cf6);
  animation: loading 2s ease-in-out infinite;
}

@keyframes loading {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
```

### 3. 链接预加载
```typescript
// 所有频道链接都启用 prefetch
<Link href={...} prefetch={true}>
```

### 4. 数据优化
```typescript
// 减少超时时间
timeout: 5000 // 从 10000 减少到 5000

// 增加缓存时间
next: { revalidate: 600 } // 10 分钟缓存
```

---

## 📊 性能指标

### 优化前
- ⏱️ 首屏时间：3-5 秒
- 😟 用户感知：加载中无反馈
- 📉 跳出率：可能较高

### 优化后
- ⚡ 首屏骨架：< 100ms
- ⏱️ 完整内容：1-2 秒
- 😊 用户感知：立即响应
- 📈 跳出率：显著降低

---

## 🚀 实施步骤

### Step 1: 创建 Loading UI（已完成）✅
```bash
sites/app/portal/templates/channels/SocialTemplateLoading.tsx
```

### Step 2: 修改 ChannelPageRenderer
```typescript
import { Suspense } from 'react';
import { SocialTemplateLoading } from '../templates/channels/SocialTemplate';

// 在渲染模板时包装 Suspense
<Suspense fallback={<SocialTemplateLoading />}>
  <TemplateComponent {...props} />
</Suspense>
```

### Step 3: 优化 API 超时
```typescript
// SocialTemplate.utils.ts
const fetchConfig = endpoints.createFetchConfig({
  timeout: 5000, // 减少超时时间
  next: { revalidate: 300 }, // 5 分钟缓存
});
```

### Step 4: 启用链接预加载
```typescript
// ChannelNavigation.tsx
<Link href={...} prefetch={true} />
```

### Step 5: 添加过渡动画（可选）
```typescript
import { motion } from 'framer-motion';
// 在 SocialTemplateClient 外层包装
```

---

## 🎯 用户体验对比

### 优化前 😟
```
用户点击 → [3秒空白] → 内容显示
感知：网站很慢/卡死了
```

### 优化后 😊
```
用户点击 → [骨架屏立即显示] → [内容逐步加载] → 完成
感知：网站响应很快，正在加载
```

---

## 📝 最佳实践

1. **永远不要让用户等待时看到空白**
   - 使用骨架屏或加载指示器

2. **提供进度反馈**
   - 让用户知道系统正在工作

3. **优化关键渲染路径**
   - 先显示重要内容，次要内容延迟加载

4. **使用缓存**
   - 合理的缓存策略可以显著提升速度

5. **预加载用户可能访问的内容**
   - 预测用户行为，提前加载

---

## 🔗 相关资源

- [Next.js Loading UI](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming)
- [React Suspense](https://react.dev/reference/react/Suspense)
- [Web Performance Best Practices](https://web.dev/fast/)
- [Skeleton Screens](https://www.nngroup.com/articles/skeleton-screens/)

