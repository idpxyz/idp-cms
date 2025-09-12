# 站点数据架构重构指南

## 概述

本次重构主要解决了以下问题：

- 数据流混乱（客户端和服务器端使用不同路径）
- 重复的数据转换逻辑
- 缓存机制不统一
- 环境依赖复杂

## 新架构

### 1. 统一数据服务层

**文件**: `sites/lib/services/site-data.service.ts`

#### 核心功能

- 统一的数据获取入口
- 自动环境检测（服务器端 vs 客户端）
- 智能缓存管理
- 统一错误处理
- 数据转换标准化

#### 使用方法

```typescript
import { siteDataService } from "@/lib/services/site-data.service";

// 基本使用
const siteSettings =
  await siteDataService.getSiteSettings("beijing.aivoya.com");

// 高级选项
const siteSettings = await siteDataService.getSiteSettings(
  "beijing.aivoya.com",
  {
    forceRefresh: true, // 强制刷新缓存
    timeout: 8000, // 自定义超时时间
  }
);

// 预加载多个站点
await siteDataService.preloadSiteSettings([
  "beijing.aivoya.com",
  "shanghai.aivoya.com",
]);

// 清除缓存
siteDataService.clearCache("beijing.aivoya.com"); // 清除特定站点
siteDataService.clearCache(); // 清除所有缓存
```

### 2. 简化的 API 客户端

**文件**: `sites/lib/api/client.ts`

#### 主要改进

- 委托给统一数据服务
- 移除重复逻辑
- 添加便利方法

#### 使用方法

```typescript
import {
  getSiteSettings,
  preloadSiteSettings,
  clearSiteSettingsCache,
} from "@/lib/api/client";

// 获取站点设置
const siteSettings = await getSiteSettings("beijing.aivoya.com");

// 预加载站点设置
await preloadSiteSettings(["beijing.aivoya.com", "shanghai.aivoya.com"]);

// 清除缓存
clearSiteSettingsCache("beijing.aivoya.com");
```

### 3. 简化的前端 API 路由

**文件**: `sites/app/api/site-settings/route.ts`

#### 主要改进

- 使用统一数据服务
- 移除重复的数据转换逻辑
- 添加健康检查端点
- 支持批量预加载

#### 新功能

```bash
# 获取站点设置
GET /api/site-settings?site=beijing.aivoya.com

# 健康检查
HEAD /api/site-settings

# 批量预加载
POST /api/site-settings
Content-Type: application/json
{
  "sites": ["beijing.aivoya.com", "shanghai.aivoya.com"]
}
```

### 4. 重构的配置管理器

**文件**: `sites/lib/site-config-manager.ts`

#### 主要改进

- 专注于主题和布局配置
- 委托数据获取给统一服务
- 保持向后兼容性

#### 使用方法

```typescript
import {
  getSiteConfig,
  getThemeConfig,
  getLayoutConfig,
} from "@/lib/site-config-manager";

// 获取站点配置
const config = await getSiteConfig("beijing.aivoya.com");

// 获取主题配置
const themeConfig = getThemeConfig("localsite-default");

// 获取布局配置
const layoutConfig = getLayoutConfig("layout-beijing-classic");
```

## 数据流架构

### 旧架构（问题）

```
客户端 → 前端API → 后端API → 数据转换1
服务器端 → 直接访问后端API → 数据转换2
```

### 新架构（优化）

```
客户端/服务器端 → SiteDataService → 环境检测 → 数据获取 → 统一转换 → 缓存 → 返回
                                    ↓
                                客户端: 前端API
                                服务器端: 直接后端API
```

## 缓存策略

### 三级缓存体系

1. **内存缓存**: SiteDataService 内置，TTL 可配置
2. **HTTP 缓存**: Next.js 标准缓存，支持 revalidate
3. **CDN 缓存**: 通过 Surrogate-Key 支持精确失效

### 缓存配置

```typescript
// 自动使用 cache_timeout 字段
const cacheMaxAge = siteSettings.cache_timeout || 180;

// 缓存标签
"Surrogate-Key": `site-settings-${site}`
```

## 错误处理

### 分层错误处理

1. **网络错误**: 自动重试，超时控制
2. **数据验证错误**: 警告但不阻断
3. **系统错误**: 降级到默认配置

### 错误示例

```typescript
try {
  const siteSettings = await siteDataService.getSiteSettings(siteId);
  return siteSettings;
} catch (error) {
  console.error("Failed to get site settings:", error);
  // 自动返回默认配置，确保系统可用性
  return DataTransformer.createDefaultConfig(siteId);
}
```

## 性能优化

### 关键优化

1. **智能缓存**: 避免重复请求
2. **预加载**: 批量获取站点配置
3. **超时控制**: 防止长时间等待
4. **环境优化**: 服务器端直接访问后端

### 性能指标

- 首次请求: ~2s（包含编译）
- 缓存命中: ~124ms
- 批量预加载: 并发处理

## 类型安全

### 更新的类型定义

**文件**: `sites/lib/types/index.ts`

```typescript
export interface SiteSettings {
  site_id: string; // 修改为字符串
  theme_version: string; // 新增字段
  primary_color: string; // 新增字段
  cache_timeout: number; // 新增字段
  // ... 其他字段
}

export interface BrandTokens {
  primary: string;
  secondary: string;
  font?: string; // 可选字段
  radius?: string; // 可选字段
  shadow?: string; // 可选字段
  [key: string]: string | undefined;
}
```

## 向后兼容性

### 保持兼容的 API

- `getSiteSettings()` 函数签名保持不变
- `SiteConfigManager` 类接口保持不变
- 所有导出的工具函数保持不变

### 迁移指南

对于现有代码，无需修改，新架构自动处理：

```typescript
// 旧代码仍然可以正常工作
import { getSiteSettings } from "@/lib/api/client";
const siteSettings = await getSiteSettings("beijing.aivoya.com");

// 新代码可以使用高级功能
import { getSiteSettings } from "@/lib/api/client";
const siteSettings = await getSiteSettings("beijing.aivoya.com", {
  forceRefresh: true,
});
```

## 监控和调试

### 日志级别

- **错误**: 系统级错误，需要关注
- **警告**: 数据验证失败，但系统可继续
- **信息**: 正常操作日志

### 调试技巧

```typescript
// 启用详细日志
process.env.DEBUG = "site-data-service";

// 检查缓存状态
console.log(siteDataService.getCachedData("beijing.aivoya.com"));

// 强制刷新特定站点
await siteDataService.getSiteSettings("beijing.aivoya.com", {
  forceRefresh: true,
});
```

## 最佳实践

### 1. 缓存管理

```typescript
// 好的做法：使用默认缓存
const settings = await getSiteSettings("beijing.aivoya.com");

// 特殊情况：强制刷新
const settings = await getSiteSettings("beijing.aivoya.com", {
  forceRefresh: true,
});
```

### 2. 错误处理

```typescript
// 好的做法：处理可能的 null 返回值
const settings = await getSiteSettings("beijing.aivoya.com");
if (settings) {
  // 使用设置
} else {
  // 处理错误情况
}
```

### 3. 性能优化

```typescript
// 好的做法：预加载相关站点
await preloadSiteSettings(["beijing.aivoya.com", "shanghai.aivoya.com"]);

// 然后快速获取
const beijingSettings = await getSiteSettings("beijing.aivoya.com");
const shanghaiSettings = await getSiteSettings("shanghai.aivoya.com");
```

## 总结

新架构解决了原有的四个主要问题：

1. ✅ **统一数据流**: 单一入口，环境自适应
2. ✅ **消除重复**: 数据转换逻辑集中管理
3. ✅ **缓存统一**: 三级缓存体系，智能管理
4. ✅ **简化环境**: 自动环境检测，URL 构建简化

同时保持了向后兼容性，现有代码无需修改即可享受新架构的优势。
