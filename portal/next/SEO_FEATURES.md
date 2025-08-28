# SEO 功能说明文档

## 🚀 概述

AI旅行网站实现了完整的SEO优化功能，包括缓存标签系统、canonical链接、动态sitemap、robots.txt和RSS feed等。

## ✨ 主要功能

### 1. 门户聚合页摘要显示

**组件**: `PortalSummary`
**功能**: 显示站点的聚合内容摘要，包括：

- 文章总数统计
- AI工具数量
- 活跃频道和地区
- 热门频道趋势
- 热门地区分布

**使用方式**:

```tsx
import PortalSummary from '@/components/PortalSummary';

<PortalSummary site="portal" />;
```

### 2. Canonical 链接

**组件**: `SEOLayout`
**功能**: 自动生成规范的URL，避免重复内容问题

**特性**:

- 支持多站点配置
- 自动检测当前路径
- 动态生成canonical URL

**使用方式**:

```tsx
import SEOLayout from '@/components/SEOLayout';

<SEOLayout title="页面标题" description="页面描述" site="portal">
  {children}
</SEOLayout>;
```

### 3. 动态 Sitemap.xml

**路由**: `/sitemap.xml`
**功能**: 动态生成站点地图

**特性**:

- 支持多站点独立配置
- 自动生成页面优先级
- 支持更新频率设置
- 缓存优化（1小时重新验证）

**访问方式**:

- 门户站点: `/sitemap.xml?site=portal`
- 科技频道: `/sitemap.xml?site=tech`
- 新闻频道: `/sitemap.xml?site=news`

### 4. 动态 Robots.txt

**路由**: `/robots.txt`
**功能**: 动态生成爬虫规则

**特性**:

- 站点特定的爬取规则
- 自动配置sitemap链接
- 智能禁止规则
- 爬取延迟设置

**访问方式**:

- 门户站点: `/robots.txt?site=portal`
- 本地站点: `/robots.txt?site=tech`

### 5. RSS Feed

**路由**: `/feed.xml`
**功能**: 生成RSS订阅源

**特性**:

- 多站点独立内容
- 自动文章摘要
- 支持分类标签
- 实时内容更新

**访问方式**:

- 门户站点: `/feed.xml?site=portal`
- 本地站点: `/feed.xml?site=tech`

## 🏷️ 缓存标签系统

### 缓存标签类型

```tsx
import { CACHE_TAGS } from '@/lib/cache';

// 站点级别
CACHE_TAGS.SITE('portal');

// 页面级别
CACHE_TAGS.PAGE('portal', '/news');

// 频道级别
CACHE_TAGS.CHANNEL('portal', 'tech');

// 地区级别
CACHE_TAGS.REGION('portal', 'china');

// 组合标签
CACHE_TAGS.CHANNEL_REGION('portal', 'tech', 'china');

// 聚合内容
CACHE_TAGS.AGGREGATE('portal');
```

### 使用方式

```tsx
import { CacheTag } from '@/components/CacheProvider';

<CacheTag tag={CACHE_TAGS.SITE('portal')}>
  <div>这个区域使用站点级别缓存</div>
</CacheTag>;
```

## 🔧 配置说明

### 环境变量

```bash
# 站点基础URL
NEXT_PUBLIC_SITE_URL=https://aivoya.com
```

### 缓存配置

```tsx
// src/lib/cache.ts
export const CACHE_CONFIG = {
  PAGE_REVALIDATE: 120, // 页面缓存：120秒
  API_REVALIDATE: 120, // API缓存：120秒
  STATIC_REVALIDATE: 3600, // 静态资源：1小时
  TAG_REVALIDATE: 120, // 标签缓存：120秒
};
```

## 📱 测试页面

### 主要演示页面

1. **SEO演示页面**: `/seo-demo`
   - 完整功能展示
   - 测试链接集合
   - 缓存标签演示

2. **缓存演示页面**: `/cache-demo`
   - 缓存标签系统
   - 各种标签类型
   - 使用说明

3. **简单测试页面**: `/test-cache`
   - 基础功能测试
   - 控制台输出验证

## 🔍 调试和监控

### 开发环境

在开发环境下，缓存标签会自动打印到控制台：

```
🏷️ Cache tag added: site:portal type:site
🔑 Surrogate key: site-portal type-site
```

### 响应头检查

检查响应头中的SEO相关信息：

```
X-Site-Type: portal
X-Hostname: localhost
Cache-Control: public, s-maxage=120, stale-while-revalidate=60
```

### 缓存标签监控

- 使用浏览器开发者工具
- 检查Network标签
- 查看响应头信息

## 🎯 最佳实践

### 1. 缓存标签使用

- **合理分层**: 从站点级别到页面级别的合理分层
- **避免过度细分**: 保持标签的语义化
- **组合使用**: 使用组合标签支持复杂场景

### 2. SEO优化

- **内容唯一性**: 确保每个页面有独特的标题和描述
- **结构化数据**: 使用JSON-LD标记重要内容
- **移动友好**: 确保页面在移动设备上的良好体验

### 3. 性能优化

- **缓存策略**: 合理设置缓存时间
- **图片优化**: 使用Next.js Image组件
- **代码分割**: 按需加载组件和页面

## 🚨 注意事项

1. **权限控制**: 确保管理页面不被搜索引擎索引
2. **内容更新**: 及时更新sitemap和feed内容
3. **缓存失效**: 内容更新后及时失效相关缓存
4. **监控告警**: 设置SEO指标的监控和告警

## 📚 相关文件

- `src/lib/seo.ts` - SEO工具库
- `src/components/SEOLayout.tsx` - SEO布局组件
- `src/components/PortalSummary.tsx` - 门户聚合摘要组件
- `src/app/sitemap.xml/route.ts` - Sitemap生成器
- `src/app/robots.txt/route.ts` - Robots.txt生成器
- `src/app/feed.xml/route.ts` - RSS Feed生成器
- `src/app/seo-demo/page.tsx` - SEO演示页面

## 🔄 后续计划

1. **Webhook系统**: 实现缓存自动失效
2. **性能监控**: 添加SEO指标监控
3. **A/B测试**: 支持SEO策略测试
4. **国际化**: 支持多语言SEO优化
