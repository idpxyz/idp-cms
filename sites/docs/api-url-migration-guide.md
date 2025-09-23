# API URL 处理统一化迁移指南

## 🎯 目标

统一前端的API URL处理方式，解决当前存在的多种处理方式导致的维护困难。

## ⚠️ 当前问题

### 1. 重复的 `getApiUrl` 函数
- `TopStoriesGrid.utils.ts` 
- `BreakingTicker.utils.ts`
- `news.ts`

### 2. 不一致的环境变量
- `DJANGO_API_URL`
- `NEXT_PUBLIC_API_URL` 
- `NEXT_PUBLIC_SITE_URL`

### 3. 混合的调用方式
- 直接相对路径: `fetch('/api/news')`
- 自定义函数: `getApiUrl('/api/headlines/')`
- endpoints配置: `endpoints.getCmsEndpoint()`

## ✅ 新的统一方案

### 导入新的工具函数
```typescript
import { 
  buildFrontendApiUrl, 
  buildBackendApiUrl, 
  buildSearchApiUrl,
  ApiType 
} from '@/lib/utils/api-url';
```

### 使用方式

#### 1. 前端API调用 (Next.js API routes)
```typescript
// 旧方式
fetch('/api/news')
fetch(`/api/topics?size=8`)

// 新方式  
fetch(buildFrontendApiUrl('/api/news'))
fetch(buildFrontendApiUrl('/api/topics?size=8'))
```

#### 2. 后端API调用 (Django服务)
```typescript
// 旧方式
const apiUrl = getApiUrl(`/api/headlines/?${params.toString()}`);

// 新方式
const apiUrl = buildBackendApiUrl(`/api/headlines/?${params.toString()}`);
```

#### 3. 搜索API调用
```typescript
// 新方式
const searchUrl = buildSearchApiUrl('/search');
```

## 📋 迁移清单

### 高优先级文件 (影响核心功能)
- [ ] `TopStoriesGrid.utils.ts` - 替换 getApiUrl 函数
- [ ] `BreakingTicker.utils.ts` - 替换 getApiUrl 函数  
- [ ] `news.ts` - 替换 getApiUrl 函数

### 中优先级文件 (影响辅助功能)
- [ ] `HotTopicsModule.tsx` - 统一 /api/topics 调用
- [ ] `MostReadModule.tsx` - 统一 /api/hot 调用
- [ ] `NewsContent.tsx` - 统一 /api/frontend/modules 调用

### 低优先级文件 (影响特殊页面)
- [ ] `search/page.tsx` - 统一搜索API调用
- [ ] `monitor/page.tsx` - 统一监控API调用
- [ ] `analytics/page.tsx` - 统一分析API调用

## 🔧 迁移步骤

### 步骤1: 安装新工具函数
新工具函数已创建在 `sites/lib/utils/api-url.ts`

### 步骤2: 逐个文件迁移
以 `TopStoriesGrid.utils.ts` 为例:

```typescript
// 删除旧的 getApiUrl 函数
function getApiUrl(path: string): string { ... }

// 导入新函数
import { buildBackendApiUrl } from '@/lib/utils/api-url';

// 替换调用
const apiUrl = buildBackendApiUrl(`/api/headlines/?${params.toString()}`);
```

### 步骤3: 测试验证
- 确保服务端渲染正常
- 确保客户端调用正常  
- 确保环境变量正确读取

### 步骤4: 清理旧代码
- 删除重复的 getApiUrl 函数
- 统一环境变量命名
- 更新相关文档

## 🌟 优势

1. **统一管理**: 所有API URL在一个地方配置
2. **类型安全**: TypeScript支持和枚举类型
3. **环境感知**: 自动处理服务端/客户端差异
4. **易于维护**: 修改API基础URL只需改一个地方
5. **调试友好**: 提供调试信息函数
6. **向后兼容**: 保留旧函数名但标记为废弃

## 📚 环境变量说明

```env
# 后端Django API (服务端访问)
DJANGO_API_URL=http://authoring:8000

# 后端API (客户端访问，通过代理)  
NEXT_PUBLIC_API_URL=

# 前端站点URL (服务端访问)
NEXT_PUBLIC_SITE_URL=http://sites:3000

# 搜索服务 (可选)
SEARCH_API_URL=http://search:9200
NEXT_PUBLIC_SEARCH_URL=
```

## 🚀 实施计划

1. **Phase 1**: 迁移核心组件 (TopStoriesGrid, BreakingTicker)
2. **Phase 2**: 迁移辅助组件 (HotTopics, MostRead)  
3. **Phase 3**: 迁移特殊页面 (search, monitor, analytics)
4. **Phase 4**: 清理和文档更新
