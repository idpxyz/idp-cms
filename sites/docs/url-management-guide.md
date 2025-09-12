# 🔧 URL管理重构指南

## 📋 概述

这是对前端项目URL管理的SOLID原则重构，解决了原有代码中URL配置散布在多个文件的问题。

## 🏗️ 新架构

### 1. 环境配置管理 (`lib/config/env.ts`)
```typescript
import { env } from '@/lib/config/env';

// 获取配置
const cmsUrl = env.getCmsOrigin();        // http://authoring:8000
const frontendUrl = env.getFrontendOrigin(); // http://localhost:3001
const timeout = env.get('CMS_TIMEOUT');   // 5000

// 环境检查
if (env.isDevelopment()) {
  console.log('开发环境');
}
```

### 2. 端点管理器 (`lib/config/endpoints.ts`)
```typescript
import { endpoints } from '@/lib/config/endpoints';

// 构建API URL
const feedUrl = endpoints.getCmsEndpoint('/api/feed');
const searchUrl = endpoints.buildUrl(
  endpoints.getCmsEndpoint('/api/search'),
  { q: 'query', limit: 10 }
);

// 创建fetch配置
const fetchConfig = endpoints.createFetchConfig({
  timeout: 5000,
  headers: { 'X-Custom': 'value' },
  next: { revalidate: 300 }
});

const response = await fetch(feedUrl, fetchConfig);
```

## 🔄 迁移示例

### 迁移前 (违反SOLID原则)
```typescript
// ❌ 硬编码，散布在多个文件
const backendUrl = process.env.CMS_ORIGIN || 'http://authoring:8000';
const response = await fetch(`${backendUrl}/api/feed`, {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' },
  signal: AbortSignal.timeout(5000),
});
```

### 迁移后 (遵循SOLID原则)
```typescript
// ✅ 统一管理，可测试，可扩展
import { endpoints } from '@/lib/config/endpoints';

const response = await fetch(
  endpoints.getCmsEndpoint('/api/feed'),
  endpoints.createFetchConfig({ timeout: 5000 })
);
```

## 🛠️ 迁移工具

### 自动化迁移脚本
```bash
# 运行批量重构工具
node scripts/refactor-urls.js
```

这个脚本会：
1. 🔍 扫描所有TypeScript文件
2. 🔄 替换硬编码URL
3. ➕ 添加必要的import语句
4. 📊 生成迁移报告

## 📁 受影响的文件类型

| 文件类型 | 示例路径 | 迁移状态 |
|---------|---------|---------|
| API路由 | `app/api/*/route.ts` | ✅ 已完成示例 |
| 页面组件 | `app/portal/*/page.tsx` | 🔄 待迁移 |
| 服务类 | `lib/services/*.ts` | 🔄 待迁移 |
| 配置文件 | `next.config.js` | 🔄 待迁移 |

## 🎯 SOLID原则改进

### 单一职责原则 (SRP)
- ✅ **前**: URL配置散布在多个API路由中
- ✅ **后**: 统一在`env.ts`和`endpoints.ts`中管理

### 开闭原则 (OCP)
- ✅ **前**: 添加新环境需要修改多个文件
- ✅ **后**: 只需要修改环境变量或配置文件

### 依赖倒置原则 (DIP)
- ✅ **前**: 高层模块直接依赖具体URL字符串
- ✅ **后**: 依赖抽象的端点管理器接口

## 🔧 配置环境变量

### 开发环境 (`.env.local`)
```bash
# 后端服务
CMS_ORIGIN=http://authoring:8000
CMS_TIMEOUT=5000

# 前端服务
NEXT_PUBLIC_SITE_URL=http://localhost:3001
FRONTEND_TIMEOUT=3000

# 搜索服务
SEARCH_ORIGIN=http://localhost:9200
SEARCH_TIMEOUT=2000

# 调试
DEBUG_ENABLED=true
LOG_LEVEL=debug
```

### 生产环境
```bash
# 后端服务
CMS_ORIGIN=https://cms.aivoya.com
CMS_TIMEOUT=10000

# 前端服务
NEXT_PUBLIC_SITE_URL=https://aivoya.com
FRONTEND_TIMEOUT=5000

# 搜索服务
SEARCH_ORIGIN=https://search.aivoya.com
SEARCH_TIMEOUT=5000

# 调试
DEBUG_ENABLED=false
LOG_LEVEL=error
```

## 🧪 测试指南

### 1. 单元测试
```typescript
import { endpoints } from '@/lib/config/endpoints';

describe('EndpointManager', () => {
  it('should build correct CMS URL', () => {
    const url = endpoints.getCmsEndpoint('/api/feed');
    expect(url).toBe('http://authoring:8000/api/feed');
  });

  it('should create fetch config with timeout', () => {
    const config = endpoints.createFetchConfig({ timeout: 3000 });
    expect(config.signal).toBeDefined();
  });
});
```

### 2. 集成测试
```bash
# 测试所有API端点
npm run test:api

# 测试配置加载
npm run test:config
```

## 📊 迁移清单

- [x] 创建环境配置管理器 (`env.ts`)
- [x] 创建端点管理器 (`endpoints.ts`)
- [x] 重构示例API路由 (`app/api/feed/route.ts`)
- [x] 创建自动化迁移工具 (`scripts/refactor-urls.js`)
- [ ] 迁移其他API路由文件
- [ ] 迁移页面组件文件
- [ ] 迁移服务类文件
- [ ] 更新配置文件
- [ ] 添加单元测试
- [ ] 更新文档

## 🚀 后续改进

1. **类型安全增强**: 为所有API端点添加TypeScript类型
2. **缓存策略**: 在端点管理器中集成缓存逻辑
3. **监控集成**: 添加URL调用监控和性能指标
4. **配置验证**: 启动时验证所有必需的环境变量

## 📞 支持

如果在迁移过程中遇到问题：
1. 检查环境变量是否正确设置
2. 运行 `npm run build` 验证TypeScript类型
3. 查看迁移工具生成的报告
4. 查阅本文档的示例代码
