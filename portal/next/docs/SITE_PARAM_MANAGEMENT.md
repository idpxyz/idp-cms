# 站点参数管理系统

## 概述

本系统提供了一个统一的、可维护的站点参数管理解决方案，自动处理多站点环境下的URL参数，无需在每个页面手动添加站点参数。

## 核心特性

- **自动站点参数处理**: 智能判断哪些页面需要添加站点参数
- **统一配置管理**: 集中管理所有站点相关配置
- **组件化解决方案**: 提供SiteLink、SiteButton等组件
- **Hook增强**: 提供useSiteRouter hook自动处理路由
- **易于维护**: 添加/删除站点只需修改配置文件

## 配置管理

### 站点配置 (SITE_CONFIG)

```typescript
export const SITE_CONFIG = {
  // 默认站点（不需要添加site参数）
  DEFAULT_SITE: 'localhost',

  // 站点映射配置
  MAPPINGS: SITE_MAPPINGS,

  // 站点显示名称
  DISPLAY_NAMES: { ... },

  // 需要自动添加站点参数的页面路径
  AUTO_APPEND_PATHS: [
    '/news',
    '/tools',
    '/tutorials',
    '/search',
    '/feed',
    '/api-management',
    '/profile'
  ],

  // 不需要添加站点参数的页面路径
  EXCLUDE_PATHS: [
    '/',
    '/api',
    '/_next',
    '/static'
  ]
};
```

### 添加新站点

1. 在 `SITE_MAPPINGS` 中添加新站点映射
2. 在 `DISPLAY_NAMES` 中添加显示名称
3. 系统会自动处理新站点的参数

### 删除站点

1. 从 `SITE_MAPPINGS` 中移除站点映射
2. 从 `DISPLAY_NAMES` 中移除显示名称
3. 系统会自动停止为该站点添加参数

## 使用方法

### 1. 使用 SiteLink 组件（推荐）

```tsx
import SiteLink from '@/components/SiteLink';

// 自动处理站点参数
<SiteLink href="/news">AI资讯</SiteLink>
<SiteLink href="/tools">AI工具</SiteLink>
```

### 2. 使用 useSiteRouter hook

```tsx
import { useSiteRouter } from '@/hooks/useSiteRouter';

function MyComponent() {
  const router = useSiteRouter();

  const handleClick = () => {
    // 自动添加站点参数
    router.push('/news');
    router.replace('/tools');
  };

  return <button onClick={handleClick}>导航</button>;
}
```

### 3. 使用智能函数

```tsx
import { smartSiteParam, createSiteLink } from '@/lib/siteDetection';

// 智能处理单个URL
const url = smartSiteParam('/news');

// 创建带查询参数的链接
const link = createSiteLink('/search', { q: 'AI', category: 'news' });

// 批量处理
const urls = batchProcessSiteParams(['/news', '/tools', '/tutorials']);
```

### 4. 手动处理（不推荐）

```tsx
import { withCurrentSiteParam } from '@/lib/siteDetection';

// 手动添加站点参数
const url = withCurrentSiteParam('/news');
```

## 页面类型

### 需要自动添加站点参数的页面

- `/news` - AI资讯
- `/tools` - AI工具
- `/tutorials` - 技术教程
- `/search` - 搜索
- `/feed` - 智能推荐
- `/api-management` - API管理
- `/profile` - 个人中心

### 不需要添加站点参数的页面

- `/` - 首页
- `/api/*` - API接口
- `/_next/*` - Next.js内部路由
- `/static/*` - 静态资源

## 迁移指南

### 从手动调用迁移

**之前:**

```tsx
import { withCurrentSiteParam } from '@/lib/siteDetection';

router.push(withCurrentSiteParam('/news'));
<Link href={withCurrentSiteParam('/tools')}>工具</Link>;
```

**现在:**

```tsx
import { useSiteRouter } from '@/hooks/useSiteRouter';
import SiteLink from '@/components/SiteLink';

const router = useSiteRouter();
router.push('/news'); // 自动处理

<SiteLink href="/tools">工具</SiteLink>; // 自动处理
```

### 批量迁移

1. 替换 `useRouter` 为 `useSiteRouter`
2. 替换 `Link` 为 `SiteLink`
3. 移除所有 `withCurrentSiteParam` 调用
4. 移除相关 import 语句

## 最佳实践

1. **优先使用组件**: 使用 `SiteLink` 和 `SiteButton` 组件
2. **使用增强Hook**: 使用 `useSiteRouter` 替代 `useRouter`
3. **避免手动调用**: 不要直接调用 `withCurrentSiteParam`
4. **统一配置**: 所有站点配置都在 `SITE_CONFIG` 中管理
5. **测试验证**: 在不同站点环境下测试链接是否正确

## 故障排除

### 常见问题

1. **站点参数未添加**: 检查路径是否在 `AUTO_APPEND_PATHS` 中
2. **重复站点参数**: 检查URL是否已经包含site参数
3. **路由不工作**: 确保使用 `useSiteRouter` 或 `SiteLink`

### 调试

```tsx
import { getSiteConfigInfo } from '@/lib/siteDetection';

// 获取当前配置信息
const config = getSiteConfigInfo();
console.log('Site Config:', config);
```

## 维护说明

### 添加新页面

1. 确定页面是否需要站点参数
2. 如果需要，添加到 `AUTO_APPEND_PATHS`
3. 如果不需要，添加到 `EXCLUDE_PATHS`

### 修改站点配置

1. 更新 `SITE_MAPPINGS`
2. 更新 `DISPLAY_NAMES`
3. 测试所有相关功能

### 性能优化

- 系统使用智能判断，避免不必要的参数添加
- 组件和Hook都经过优化，性能影响最小
- 支持批量处理，提高效率
