# 缓存标签系统使用说明

## 🏷️ 概述

本项目实现了完整的缓存标签系统，支持多维度缓存控制和 Surrogate-Key 响应头生成。

## 🚀 主要功能

### 1. 站点分流中间件 (`src/middleware.ts`)

- 自动识别请求来源（portal vs localsite）
- 添加站点标识响应头
- 支持自定义分流逻辑

### 2. 缓存标签系统 (`src/lib/cache.ts`)

- 支持多维度缓存标签：`site:*`, `page:*`, `channel:*`, `region:*`
- 自动生成 Surrogate-Key 响应头
- 预定义常用缓存标签组合

### 3. 缓存提供者组件 (`src/components/CacheProvider.tsx`)

- 在服务端渲染时打缓存标签
- 支持客户端和服务端缓存标签
- 开发环境下自动打印缓存信息

## 📖 使用方法

### 基本用法

```tsx
import { CacheTag } from '@/components/CacheProvider';
import { CACHE_TAGS } from '@/lib/cache';

function MyComponent() {
  return (
    <CacheTag tag={CACHE_TAGS.SITE('portal')}>
      <div>这个区域使用站点级别缓存</div>
    </CacheTag>
  );
}
```

### 预定义缓存标签

```tsx
// 站点级别
CACHE_TAGS.SITE('portal');

// 页面级别
CACHE_TAGS.PAGE('portal', 'page-id');

// 频道级别
CACHE_TAGS.CHANNEL('portal', 'tech');

// 地区级别
CACHE_TAGS.REGION('portal', 'china');

// 文章级别
CACHE_TAGS.ARTICLE('portal', 'article-123');

// 组合标签
CACHE_TAGS.CHANNEL_REGION('portal', 'tech', 'china');

// 聚合内容
CACHE_TAGS.AGGREGATE('portal');
```

### 自定义缓存标签

```tsx
import { CacheTag } from '@/lib/cache';

const customTag: CacheTag = {
  site: 'portal',
  channel: 'tech',
  region: 'china',
  type: 'custom',
};

<CacheTag tag={customTag}>
  <div>自定义缓存标签</div>
</CacheTag>;
```

## ⚙️ 配置

### 缓存时间配置

```tsx
// src/lib/cache.ts
export const CACHE_CONFIG = {
  PAGE_REVALIDATE: 120, // 页面缓存：120秒
  API_REVALIDATE: 120, // API缓存：120秒
  STATIC_REVALIDATE: 3600, // 静态资源：1小时
  TAG_REVALIDATE: 120, // 标签缓存：120秒
};
```

### Next.js 配置

```js
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=120, stale-while-revalidate=60',
          },
        ],
      },
    ];
  },
};
```

## 🔍 调试

### 开发环境

在开发环境下，缓存标签会自动打印到控制台：

```
🏷️ Cache tag added: site:portal type:site
🔑 Surrogate key: site-portal type-site
```

### 响应头检查

检查响应头中的缓存相关信息：

```
X-Site-Type: portal
X-Hostname: localhost
Cache-Control: public, s-maxage=120, stale-while-revalidate=60
```

## 📱 测试页面

- `/cache-demo` - 完整的缓存标签演示
- `/test-cache` - 简单的缓存测试

## 🎯 最佳实践

1. **合理使用缓存标签**：避免过度细分，保持标签的语义化
2. **组合标签**：使用组合标签来支持复杂的缓存失效场景
3. **性能考虑**：缓存标签数量会影响性能，建议控制在合理范围内
4. **监控和调试**：在生产环境中监控缓存命中率和失效情况

## 🔄 缓存失效

缓存标签系统为后续的缓存失效机制提供了基础：

- 支持按标签失效缓存
- 支持按路径失效缓存
- 集成 Cloudflare 缓存策略
- Webhook 自动失效机制

## 📚 相关文件

- `src/middleware.ts` - 站点分流中间件
- `src/lib/cache.ts` - 缓存标签工具库
- `src/components/CacheProvider.tsx` - 缓存提供者组件
- `next.config.js` - Next.js 缓存配置
