# 频道服务重构文档

## 📋 重构概述

将频道数据获取逻辑从 `portal/utils/channels.ts` 重构为 `lib/api/ChannelService.ts`，与项目现有的Service架构保持一致。

---

## 🎯 重构目标

### 问题诊断

**重构前：**
```
lib/api/
├── CategoryService.ts  ← 全局分类服务 ✅
├── TopicService.ts     ← 全局话题服务 ✅
└── TagService.ts       ← 全局标签服务 ✅

portal/utils/
└── channels.ts         ← 频道数据获取 ❌ 位置不一致
```

**职责分析：**

| 对比维度 | CategoryService | getChannels | 评估 |
|---------|----------------|-------------|------|
| **职责** | 全局分类数据 | 全局频道数据 | ⚠️ 相同性质 |
| **使用范围** | Layout/Page/Context | Layout/Page/Context | ⚠️ 相同范围 |
| **位置** | `lib/api/` | `portal/utils/` | ❌ **不一致** |
| **模式** | Class单例 | 简单函数 | ⚠️ 不一致 |

---

## ✅ 重构方案

### 架构对齐

**重构后：**
```
lib/api/
├── CategoryService.ts  ← 全局分类服务 ✅
├── ChannelService.ts   ← 全局频道服务 ✅ (新增)
├── TopicService.ts     ← 全局话题服务 ✅
└── TagService.ts       ← 全局标签服务 ✅
```

### 核心改进

1. **单例模式**：与其他Service保持一致
2. **React cache**：保留原有的性能优化
3. **统一导出**：通过 `lib/api/index.ts` 统一管理
4. **类型共享**：所有组件使用统一的 `Channel` 类型
5. **扩展性**：新增 `getChannelBySlug` 和 `getHomepageChannels` 方法

---

## 📦 新增文件

### `lib/api/ChannelService.ts`

**核心特性：**
```typescript
export class ChannelService {
  private static instance: ChannelService;
  
  // 🚀 使用React cache优化，同一请求周期内只执行一次
  getChannels = cache(async (options?: ChannelQueryOptions): Promise<Channel[]> => {
    // ... 实现逻辑
  });
  
  // 🆕 新增方法：根据slug获取频道
  async getChannelBySlug(slug: string): Promise<Channel | undefined>;
  
  // 🆕 新增方法：获取首页显示的频道
  async getHomepageChannels(): Promise<Channel[]>;
}

// 导出单例实例
export const channelService = ChannelService.getInstance();

// 导出便捷函数（保持向后兼容）
export const getChannels = channelService.getChannels;
```

**类型定义：**
```typescript
export interface Channel {
  id: string;
  name: string;
  slug: string;
  order?: number;
  show_in_homepage?: boolean;
  homepage_order?: number;
  template?: {
    id: number;
    name: string;
    slug: string;
    file_name: string;
  } | null;
  [key: string]: any;
}

export interface ChannelQueryOptions {
  site?: string;
  active_only?: boolean;
  limit?: number;
  order?: string;
}

export class ChannelServiceError extends Error {
  constructor(
    public code: ChannelErrorCode,
    message: string,
    public originalError?: any
  );
}
```

---

## 🔄 修改文件

### 1. `lib/api/index.ts`

**新增导出：**
```typescript
// 服务实例导出
export { channelService } from './ChannelService';

// 服务类导出
export { ChannelService } from './ChannelService';

// 类型和便捷函数导出
export type { 
  Channel, 
  ChannelQueryOptions, 
  ChannelServiceError 
} from './ChannelService';
export { 
  getChannels, 
  getChannelBySlug, 
  getHomepageChannels 
} from './ChannelService';
```

---

### 2. `portal/layout.tsx`

**Import路径更新：**
```diff
- import { getChannels } from "./utils/channels";
+ import { getChannels } from "@/lib/api";
```

**使用方式不变：**
```typescript
const initialChannels = await getChannels();
```

---

### 3. `portal/page.tsx`

**Import路径更新：**
```diff
- import { getChannels } from "./utils/channels";
+ import { getChannels } from "@/lib/api";
```

---

### 4. `portal/ChannelContext.tsx`

**类型导入更新：**
```diff
- interface Channel {
-   id: string;
-   name: string;
-   slug: string;
-   // ...
- }

+ import type { Channel } from '@/lib/api';
```

---

### 5. 组件类型统一

**以下组件的Channel类型定义已统一为从 `@/lib/api` 导入：**

- `portal/components/ChannelNavigation.utils.ts`
- `portal/components/NewsContent.tsx`
- `portal/components/MobileChannelMenu.tsx`

**修改示例：**
```diff
- interface Channel {
-   id: string;
-   name: string;
-   slug: string;
- }

+ import type { Channel } from '@/lib/api';
```

---

## 🗑️ 删除文件

1. **`portal/utils/channels.ts`** - 已迁移到 `lib/api/ChannelService.ts`
2. **`portal/utils/`** - 空目录已删除

---

## 🎯 使用方式

### 方式1：便捷函数（推荐，向后兼容）

```typescript
import { getChannels } from '@/lib/api';

// Server Component中
const channels = await getChannels();
```

### 方式2：服务实例（完整功能）

```typescript
import { channelService } from '@/lib/api';

// 获取所有频道
const channels = await channelService.getChannels();

// 🆕 根据slug获取单个频道
const channel = await channelService.getChannelBySlug('news');

// 🆕 获取首页显示的频道
const homepageChannels = await channelService.getHomepageChannels();
```

### 方式3：类型导入

```typescript
import type { Channel, ChannelQueryOptions } from '@/lib/api';

interface MyComponentProps {
  channels: Channel[];
}
```

---

## ✅ 验证清单

- [x] ChannelService.ts 创建完成
- [x] lib/api/index.ts 导出更新
- [x] portal/layout.tsx import更新
- [x] portal/page.tsx import更新
- [x] portal/ChannelContext.tsx 类型导入更新
- [x] 所有组件Channel类型统一
- [x] 旧文件删除
- [x] 无linter错误
- [x] 保持向后兼容性

---

## 🚀 性能优化

### React Cache

**原有优化保留：**
```typescript
getChannels = cache(async (): Promise<Channel[]> => {
  // 同一请求周期内只执行一次
});
```

**效果：**
```
Layout调用  → 发起请求 (执行)
Page调用    → 返回缓存 (0ms)
Context接收 → 使用缓存数据
```

### Next.js Cache

**ISR缓存配置：**
```typescript
next: { 
  revalidate: 600, // 10分钟缓存
  tags: ['channels'] 
}
```

---

## 📊 影响范围

### 无破坏性变更

- ✅ `getChannels()` 函数签名不变
- ✅ `Channel` 类型定义兼容
- ✅ 所有调用处无需修改逻辑
- ✅ 只需更新import路径

### 新增功能

- ✅ `getChannelBySlug()` - 根据slug查询
- ✅ `getHomepageChannels()` - 获取首页频道
- ✅ `ChannelServiceError` - 统一错误处理

---

## 🎓 最佳实践

### 为什么要对齐架构？

1. **可维护性**：统一的代码组织方式，降低理解成本
2. **可发现性**：新开发者知道在哪里找全局服务
3. **可扩展性**：未来添加频道相关功能有明确的位置
4. **类型安全**：全局统一的Channel类型定义

### 与其他Service对比

| Service | 职责 | 位置 | 模式 |
|---------|------|------|------|
| CategoryService | 分类管理 | lib/api/ | 单例 + cache |
| **ChannelService** | **频道管理** | **lib/api/** | **单例 + cache** |
| TopicService | 话题管理 | lib/api/ | 单例 + cache |
| TagService | 标签管理 | lib/api/ | 单例 + cache |

✅ **现在完全对齐！**

---

## 📝 后续优化建议

1. **CategoryContext 重构**：可以参考 ChannelContext 的简化模式
2. **Service测试**：为 ChannelService 添加单元测试
3. **错误处理**：统一各个Service的错误处理机制
4. **类型导出**：考虑创建 `lib/api/types/index.ts` 统一导出所有类型

---

## 🎉 重构完成

**改进点：**
- ✅ 架构规范化
- ✅ 代码组织清晰
- ✅ 类型定义统一
- ✅ 保持向后兼容
- ✅ 新增实用方法

**零破坏性变更，无缝升级！**
