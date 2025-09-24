# API URL 使用统一指南

## 🎯 目标
为开发者提供清晰、统一的 API URL 处理指南，避免重复工具和技术债务。

## 📋 规则概览

| API 类型 | 使用方式 | 示例 |
|---------|---------|------|
| **Django/Wagtail 后端API** | `endpoints.getCmsEndpoint()` | 新闻、热点、话题等 |
| **Next.js 前端API** | 直接相对路径 | 搜索、分析、监控等 |

## 🔧 具体使用方法

### 1. 后端API调用（Django/Wagtail）

**适用场景**: 调用 Django/Wagtail 后端的数据API

```typescript
import { endpoints } from '@/lib/config/endpoints';

// ✅ 正确方式
const apiUrl = endpoints.getCmsEndpoint('/api/hot');
const response = await fetch(apiUrl);

// ✅ 带参数的调用
const apiUrl = endpoints.getCmsEndpoint(`/api/headlines/?${params.toString()}`);
const response = await fetch(apiUrl);

// ✅ 使用 endpoints 的其他功能
const config = endpoints.createFetchConfig({
  timeout: 5000,
  next: { revalidate: 300 }
});
const response = await fetch(apiUrl, config);
```

**常见后端API**:
- `/api/hot` - 热门内容
- `/api/headlines/` - 头条新闻  
- `/api/topics` - 话题列表
- `/api/topstories/` - 顶部故事
- `/api/hero/` - 轮播内容

### 2. 前端API调用（Next.js routes）

**适用场景**: 调用 Next.js 应用内的 API 路由

```typescript
// ✅ 正确方式 - 直接相对路径
const response = await fetch('/api/analytics');
const response = await fetch('/api/search?q=keyword');
const response = await fetch('/api/monitoring/dashboard');

// ✅ 带参数的调用
const params = new URLSearchParams({ q: 'search term', page: '1' });
const response = await fetch(`/api/search?${params.toString()}`);
```

**常见前端API**:
- `/api/search` - 搜索功能
- `/api/analytics` - 分析数据
- `/api/monitoring/dashboard` - 监控面板
- `/api/frontend/modules` - 模块配置

## ❌ 避免的错误模式

### 不要创建重复工具
```typescript
// ❌ 错误 - 不要重新发明轮子
function buildApiUrl(path: string) {
  // 这样的函数已经在 endpoints.ts 中实现了
}

// ❌ 错误 - 不要创建功能重复的工具
import { buildBackendApiUrl } from '@/lib/utils/api-url'; // 已删除
```

### 不要混合使用方式
```typescript
// ❌ 错误 - 不要对后端API使用相对路径（会失败）
const response = await fetch('/api/hot'); // 后端API不在前端路由中

// ❌ 错误 - 不要对前端API使用 endpoints
const url = endpoints.getCmsEndpoint('/api/search'); // 前端API不需要CMS端点
```

## 🔍 判断方法

### 如何判断是后端还是前端API？

1. **查看文件位置**:
   - 后端API: Django 项目中定义（通常在 `config/urls.py`）
   - 前端API: `sites/app/api/*/route.ts` 文件

2. **查看功能用途**:
   - 后端API: 数据获取（新闻、用户、内容等）
   - 前端API: 代理、聚合、客户端特定功能

3. **查看现有代码**:
   - 搜索 `endpoints.getCmsEndpoint` 的使用示例
   - 查看类似功能的实现方式

## 📚 参考架构

### endpoints.ts 功能
```typescript
import { endpoints } from '@/lib/config/endpoints';

// 获取CMS API端点
endpoints.getCmsEndpoint('/api/path')

// 构建带参数的URL
endpoints.buildUrl(baseUrl, params)

// 创建fetch配置
endpoints.createFetchConfig(options)
```

### 环境变量配置
```bash
# 后端Django API
CMS_ORIGIN=http://authoring:8000              # 服务端访问
NEXT_PUBLIC_API_URL=http://localhost:8000     # 客户端访问

# 前端Next.js API (自动处理)
NEXT_PUBLIC_SITE_URL=http://localhost:3001    # 站点地址
```

## ✅ 最佳实践

### 1. 代码组织
```typescript
// 在组件文件顶部导入
import { endpoints } from '@/lib/config/endpoints';

// 在数据获取函数中使用
const fetchData = async () => {
  const apiUrl = endpoints.getCmsEndpoint('/api/hot');
  const response = await fetch(apiUrl);
  return response.json();
};
```

### 2. 错误处理
```typescript
const fetchData = async () => {
  try {
    const apiUrl = endpoints.getCmsEndpoint('/api/hot');
    const response = await fetch(apiUrl, endpoints.createFetchConfig({
      timeout: 5000
    }));
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch data:', error);
    throw error;
  }
};
```

### 3. 类型安全
```typescript
interface ApiResponse<T> {
  data: T;
  total?: number;
  page?: number;
}

const fetchTypedData = async <T>(): Promise<ApiResponse<T>> => {
  const apiUrl = endpoints.getCmsEndpoint('/api/hot');
  const response = await fetch(apiUrl);
  return response.json();
};
```

## 🚀 性能优化

### 缓存策略
```typescript
// ✅ 使用 endpoints 的缓存配置
const config = endpoints.createFetchConfig({
  next: { 
    revalidate: 300,  // 5分钟缓存
    tags: ['news', 'hot']
  }
});

const response = await fetch(apiUrl, config);
```

### 超时设置
```typescript
// ✅ 统一的超时处理
const config = endpoints.createFetchConfig({
  timeout: 8000  // 8秒超时
});
```

## 📝 开发流程

### 添加新的API调用
1. **确定API类型** (后端 vs 前端)
2. **选择正确方法** (`endpoints.getCmsEndpoint` vs 相对路径)
3. **检查现有示例** (搜索类似的使用方式)
4. **添加错误处理** (使用统一的错误处理模式)
5. **测试验证** (确保在服务端和客户端都正常工作)

### 重构现有代码
1. **识别重复模式** (是否有自定义的URL构建函数)
2. **检查架构一致性** (是否与现有模式一致)
3. **逐步迁移** (一个文件一个文件地迁移)
4. **删除重复代码** (清理不再需要的工具函数)

## 🔗 相关文档

- [endpoints.ts 源码](/sites/lib/config/endpoints.ts)
- [env.ts 环境配置](/sites/lib/config/env.ts)
- [API URL 冲突解决报告](/sites/docs/api-url-migration-completed.md)

## 💡 常见问题

### Q: 为什么不能继续使用 api-url.ts？
A: 因为它与现有的 endpoints.ts 功能100%重复，会造成维护困难和技术债务。

### Q: 如何知道某个API是后端还是前端？
A: 查看 `config/urls.py` (后端) 或 `sites/app/api/*/route.ts` (前端)。

### Q: 可以创建新的URL处理工具吗？
A: 不建议。应该先检查 endpoints.ts 是否已满足需求，或者增强现有工具。

### Q: 相对路径在服务端渲染时会失败吗？
A: 前端API路由的相对路径在 Next.js 中是安全的，框架会正确处理。

---

**维护者**: 开发团队  
**更新时间**: 2025年9月  
**版本**: 1.0
