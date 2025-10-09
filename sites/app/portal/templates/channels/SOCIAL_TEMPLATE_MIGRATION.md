# 社会频道模板真实数据改造

## 📋 改造摘要

已将 `SocialTemplate.tsx` 从使用模拟数据改造为使用真实 API 数据。

## ✅ 完成的改造

### 1. **创建数据获取工具** (`SocialTemplate.utils.ts`)
- `getSocialHeadlines()` - 获取频道头条新闻
- `getSocialLatestNews()` - 获取最新动态
- `getSocialHotArticles()` - 获取热点排行
- `getSocialChannelStats()` - 获取频道统计数据
- `formatTimeAgo()` - 时间格式化
- `formatNumber()` - 数字格式化

### 2. **头条新闻区域** (Hero Section)
- ✅ 使用 `/api/headlines?channel={slug}&size=5`
- ✅ 主头条（大图）+ 4 条次要头条（小图）
- ✅ 显示真实的标题、摘要、图片、时间、阅读数
- ✅ 空数据降级处理

### 3. **最新动态区域**
- ✅ 使用 `/api/news?channel={slug}&limit=3`
- ✅ 显示 3 条最新文章
- ✅ 包含标题、摘要、图片、分类、时间、阅读数
- ✅ 空数据降级处理

### 4. **热点排行侧边栏**
- ✅ 使用 `/api/articles?channel={slug}&ordering=-view_count&limit=5`
- ✅ 显示前 5 名热点文章
- ✅ 彩色徽章（1-红色，2-橙色，3-黄色，4-5灰色）
- ✅ 空数据降级处理

### 5. **统计数据**
- ✅ 显示文章总数、关注人数、深度报道数
- ✅ 自动格式化大数字（万、千）

### 6. **深度报道**
- ✅ 保留原有的 `ChannelStrip` 组件（已使用真实数据）

## 🎯 使用的 API 接口

| 功能 | API 端点 | 参数 |
|------|---------|------|
| 头条新闻 | `/api/headlines/` | `channel={slug}&size=5&site={hostname}` |
| 最新动态 | `/api/portal/articles/` | `channel={slug}&size=3&order=-publish_at&site={hostname}` |
| 热点排行 | `/api/portal/articles/` | `channel={slug}&size=5&order=-view_count&site={hostname}` |
| 深度报道 | `/api/news` | `channel={slug}&limit=6` (通过 ChannelStrip) |

**注意**: 所有 API 调用都通过 `endpoints.getCmsEndpoint()` 和 `endpoints.buildUrl()` 统一管理

## 🔄 组件架构

### 服务端/客户端组件分离模式

由于 `NewsContent` 和 `ChannelStrip` 是客户端组件（'use client'），我们采用了**包装器模式**：

```typescript
// 1️⃣ 服务端包装组件 (async) - 负责数据获取
const SocialTemplate: React.FC<ChannelTemplateProps> = async ({ ... }) => {
  const [headlines, latestNews, hotArticles, stats] = await Promise.all([
    getSocialHeadlines(channel.slug, 5),
    getSocialLatestNews(channel.slug, 3),
    getSocialHotArticles(channel.slug, 5),
    getSocialChannelStats(channel.slug),
  ]);

  return (
    <SocialTemplateClient
      channel={channel}
      channels={channels}
      tags={tags}
      headlines={headlines}
      latestNews={latestNews}
      hotArticles={hotArticles}
      stats={stats}
    />
  );
};

// 2️⃣ 客户端渲染组件 - 负责 UI 渲染
const SocialTemplateClient: React.FC<SocialTemplateClientProps> = ({ 
  headlines, latestNews, hotArticles, stats, ...
}) => {
  // UI 渲染逻辑
};
```

### 为什么需要这种模式？

- ❌ **问题**: 客户端组件不能是 `async` 的
- ✅ **解决**: 将数据获取（服务端）和 UI 渲染（客户端）分离
- 🎯 **优势**: 
  - 在服务端获取数据，减少客户端负担
  - 客户端组件可以使用交互功能（useState, useEffect 等）
  - 保持 Next.js 15 的最佳实践
  - 数据在服务端预取，提升首屏加载速度

### 组件层级关系

```
┌───────────────────────────────────────────────────────┐
│ page.tsx (Server Component)                           │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │ ChannelPageRenderer (Server Component) ⚡NEW    │ │
│  │ - 移除了 'use client'                            │ │
│  │ - 支持渲染 async 模板                             │ │
│  │                                                 │ │
│  │  ┌───────────────────────────────────────────┐ │ │
│  │  │ SocialTemplate (Server Component, async) │ │ │
│  │  │                                           │ │ │
│  │  │ ↓ 并行获取数据                              │ │ │
│  │  │ - getSocialHeadlines()                    │ │ │
│  │  │ - getSocialLatestNews()                   │ │ │
│  │  │ - getSocialHotArticles()                  │ │ │
│  │  │ - getSocialChannelStats()                 │ │ │
│  │  │                                           │ │ │
│  │  │ ↓ 传递数据 (props)                         │ │ │
│  │  │                                           │ │ │
│  │  │  ┌─────────────────────────────────────┐ │ │ │
│  │  │  │ SocialTemplateClient (Client)       │ │ │ │
│  │  │  │                                     │ │ │ │
│  │  │  │ - 渲染头条新闻                        │ │ │ │
│  │  │  │ - 渲染最新动态                        │ │ │ │
│  │  │  │ - 渲染热点排行                        │ │ │ │
│  │  │  │                                     │ │ │ │
│  │  │  │ 包含客户端组件:                        │ │ │ │
│  │  │  │ - NewsContent ('use client')        │ │ │ │
│  │  │  │ - ChannelStrip ('use client')       │ │ │ │
│  │  │  └─────────────────────────────────────┘ │ │ │
│  │  └───────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────┘

🔑 关键点：
- ChannelPageRenderer 必须是服务端组件，才能渲染 async 模板
- SocialTemplate (服务端) 负责数据获取
- SocialTemplateClient (客户端) 负责 UI 渲染
```

## 📊 数据结构

### SocialArticle 接口
```typescript
{
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  image_url?: string;
  channel?: { slug: string; name: string };
  publish_at?: string;
  view_count?: number;
  comment_count?: number;
  category_name?: string;
}
```

## 🚀 性能优化

1. **并行数据获取** - 使用 `Promise.all` 并行请求所有数据
2. **Next.js 缓存** - 所有 API 调用使用 5-10 分钟缓存
3. **服务端渲染** - 在服务器端完成数据获取和渲染
4. **图片优化** - 使用 Next.js Image 组件，主头条设置 `priority={true}`

## 🛡️ 降级处理

所有数据区域都有空数据降级：
- 头条区域：显示 "暂无头条新闻"
- 最新动态：显示 "暂无最新动态"
- 热点排行：显示 "暂无热点数据"

## 📝 测试清单

- [ ] 访问社会频道页面
- [ ] 验证头条新闻显示正确
- [ ] 验证次要头条列表显示
- [ ] 验证最新动态加载
- [ ] 验证热点排行显示
- [ ] 验证统计数据显示
- [ ] 验证深度报道区域
- [ ] 测试所有文章链接可点击
- [ ] 测试空数据情况

## 🔍 验证方法

```bash
# 1. 启动开发服务器
npm run dev

# 2. 访问社会频道
http://localhost:3000/portal/channel/society

# 3. 检查浏览器控制台是否有错误
# 4. 检查所有数据是否正确显示
```

## 📌 注意事项

1. **频道 slug**: 确保传入正确的频道 slug（如 'society'）
2. **API 可用性**: 确保后端 CMS 服务正常运行
3. **图片 URL**: 如果后端没有返回图片，会使用 picsum 占位图
4. **统计数据**: 目前使用模拟值，后续可接入真实统计 API
5. **Endpoints 配置**: 使用系统统一的 `endpoints` 服务自动管理 API URL

## 🐛 已修复的问题

### 1. 服务端 Fetch 相对路径错误 ✅ 已修复
**问题**: 服务端组件使用相对路径调用 `fetch` 会失败
```
TypeError: Failed to fetch at /api/articles
```

**最终解决方案**: 使用系统统一的 `endpoints` 服务
```typescript
import { endpoints } from '@/lib/config/endpoints';
import { getMainSite } from '@/lib/config/sites';

// 构建 API URL
const apiUrl = endpoints.buildUrl(
  endpoints.getCmsEndpoint('/api/portal/articles/'),
  {
    channel: channelSlug,
    size: limit.toString(),
    site: getMainSite().hostname,
  }
);

// 使用统一的 fetch 配置
const fetchConfig = endpoints.createFetchConfig({
  timeout: 10000,
  next: { revalidate: 300 },
});

const response = await fetch(apiUrl, fetchConfig);
```

### 2. API 统一规范 ✅ 已优化
**改进**: 从自定义 URL 拼接改为使用系统统一的 endpoints 服务

**优势**:
- ✅ 自动处理服务端/客户端环境
- ✅ 统一的超时和重试配置
- ✅ 标准化的错误处理
- ✅ 与项目其他组件保持一致

### 3. Async Client Component 错误 ✅ 已修复
**问题**: 客户端组件不能是 async 的
```
Error: <SocialTemplate> is an async Client Component. 
Only Server Components can be async.
```

**原因 1**: 
- `NewsContent` 和 `ChannelStrip` 是客户端组件（'use client'）
- 导入客户端组件会导致父组件也变成客户端组件
- 客户端组件不能使用 `async/await`

**解决方案 1**: 采用**包装器模式**
- `SocialTemplate` (async 服务端组件) → 获取数据
- `SocialTemplateClient` (客户端组件) → 渲染 UI
- 数据通过 props 传递

**原因 2**:
- `ChannelPageRenderer.tsx` 有 `'use client'` 标记
- 它导入并渲染所有频道模板
- 导致所有模板都被当作客户端组件

**解决方案 2**: 移除 `ChannelPageRenderer` 的 `'use client'`
- `ChannelPageRenderer` 不使用任何客户端 hooks
- 可以安全地作为服务端组件
- 支持渲染 async 模板组件

### 4. URL 格式统一 ✅ 已修复
**问题**: 链接使用了不一致的 URL 格式

**修复前**:
```typescript
// 错误的格式
href="/portal/channel/society"
```

**修复后**:
```typescript
// 正确的格式（与系统一致）
href={`/portal?channel=${channel.slug}`}
href={`/portal?channel=${channel.slug}&category=民生`}
```

**涉及位置**:
- "查看更多新闻" 链接
- "加载更多新闻" 链接
- 分类导航链接（同时修复硬编码问题）

## 🎨 UI 保持不变

所有 UI 样式和布局保持完全一致，只是将硬编码的数据替换为从 API 获取的真实数据。

## 🔗 相关文件

- `SocialTemplate.tsx` - 主模板组件
- `SocialTemplate.utils.ts` - 数据获取工具函数
- `ChannelStrip.tsx` - 深度报道组件（已有）
- `NewsContent.tsx` - 智能推荐组件（已有）

