# 社会频道模板架构说明

## 📁 文件组织

```
templates/channels/
├── SocialTemplate.tsx           # ⚙️ 服务端包装器 (async)
├── SocialTemplateClient.tsx     # 🎨 客户端 UI 组件 ('use client')
├── SocialTemplateLoading.tsx    # 💀 骨架屏加载组件
└── SocialTemplate.utils.ts      # 🛠️ 数据获取工具函数
```

## 🏗️ 架构设计

### 1. 服务端/客户端分离

**为什么需要分离？**
- Next.js App Router 要求：
  - `async` 组件 = 服务端组件（可以直接 fetch 数据）
  - 事件处理器（onClick等）= 客户端组件（需要 `'use client'`）
  - **服务端组件不能有事件处理器**

**解决方案：**
```
用户请求
   ↓
[SocialTemplate.tsx]        ← async 服务端组件
   ↓ (获取数据)
   ↓ Promise.all([headlines, news, ...])
   ↓
   ↓ (传递 props)
   ↓
[SocialTemplateClient.tsx]  ← 'use client' 客户端组件
   ↓ (渲染 UI + 交互)
   ↓
用户看到页面
```

### 2. 文件职责

#### `SocialTemplate.tsx` - 服务端包装器
```typescript
// ✅ 可以：async/await, 直接 fetch
// ❌ 不能：onClick, useState, useEffect

const SocialTemplate = async ({ channel }) => {
  // 🎯 并行获取数据
  const [headlines, news, ...] = await Promise.all([...]);
  
  // 传递给客户端组件
  return <SocialTemplateClient {...props} data={...} />;
};
```

#### `SocialTemplateClient.tsx` - 客户端 UI
```typescript
'use client';

// ✅ 可以：onClick, useState, 交互
// ❌ 不能：async (顶层)

const SocialTemplateClient = ({ channel, headlines, news }) => {
  return (
    <div>
      <button onClick={...}>点击</button>  ← 可以！
      <NewsContent />                     ← 可以！
    </div>
  );
};
```

#### `SocialTemplateLoading.tsx` - 骨架屏
```typescript
// 独立组件，显示加载状态
// 用于 Suspense fallback
```

#### `SocialTemplate.utils.ts` - 数据获取
```typescript
// 纯函数，服务端调用
export async function getSocialHeadlines(...) {
  const url = endpoints.buildUrl(...);
  const data = await fetch(url);
  return data;
}
```

## 🔄 数据流

```
1. ChannelPageRenderer
   ↓
   Suspense (fallback=<SocialTemplateLoading />)
   ↓
2. SocialTemplate (async 服务端)
   ↓
   Promise.all([
     getSocialHeadlines(),
     getSocialLatestNews(),
     getSocialHotArticles(),
     getSocialChannelStats()
   ])
   ↓
3. SocialTemplateClient (客户端)
   ↓
   渲染 UI + 用户交互
```

## ✅ 优势

1. **职责清晰**
   - 服务端专注数据获取
   - 客户端专注 UI 渲染和交互

2. **性能优化**
   - 服务端并行获取数据（Promise.all）
   - 客户端只负责渲染
   - Suspense 流式渲染

3. **易于维护**
   - 数据逻辑独立（utils.ts）
   - UI 组件独立（Client.tsx）
   - 加载状态独立（Loading.tsx）

4. **符合 Next.js 最佳实践**
   - 正确使用服务端/客户端组件边界
   - 避免不必要的客户端 JavaScript
   - 充分利用服务端渲染

## 🚫 常见错误

### ❌ 错误 1: 在服务端组件中使用事件处理器
```typescript
// SocialTemplate.tsx
const SocialTemplate = async () => {
  return <button onClick={() => {}}>点击</button>;  // ❌ 错误！
};
```

### ✅ 正确做法
```typescript
// SocialTemplate.tsx
const SocialTemplate = async () => {
  return <SocialTemplateClient />;
};

// SocialTemplateClient.tsx
'use client';
const SocialTemplateClient = () => {
  return <button onClick={() => {}}>点击</button>;  // ✅ 正确！
};
```

### ❌ 错误 2: 在客户端组件顶层使用 async
```typescript
'use client';
const SocialTemplateClient = async () => {  // ❌ 错误！
  const data = await fetch(...);
  return <div>{data}</div>;
};
```

### ✅ 正确做法
```typescript
// 方案 1: 通过服务端组件传递数据
const SocialTemplate = async () => {
  const data = await fetch(...);
  return <SocialTemplateClient data={data} />;  // ✅
};

// 方案 2: 在客户端使用 useEffect + useState
'use client';
const SocialTemplateClient = () => {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch(...).then(setData);
  }, []);
  return <div>{data}</div>;  // ✅
};
```

## 📚 参考

- [Next.js Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Next.js Client Components](https://nextjs.org/docs/app/building-your-application/rendering/client-components)
- [React Suspense](https://react.dev/reference/react/Suspense)

