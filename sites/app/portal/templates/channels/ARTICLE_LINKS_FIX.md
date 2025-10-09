# 社会模板文章链接路径修复

## 问题描述

### 错误现象
其他局域网用户访问社会模板中的文章时出现错误：
```
Event handlers cannot be passed to Client Component props.
  <button onClick={function onClick} className=... children=...>
                  ^^^^^^^^^^^^^^^^^^
If you need interactivity, consider converting part of this to a Client Component.
Error ID: 2638505742
```

### 根本原因
社会模板中的文章链接缺少 `/portal` 前缀，导致：
- ❌ 错误的 URL：`http://localhost:3001/article/xxx`
- ✅ 正确的 URL：`http://localhost:3001/portal/article/xxx`

URL 错误导致路由到了错误的页面，触发了 Next.js 服务端组件/客户端组件边界错误。

## 修复详情

### 修改的文件

#### 1. `SocialHeadlines.tsx`
修改了 2 处链接：

**Line 77 - 主头条链接**
```typescript
// 修复前
<a href={`/article/${mainHeadline.slug}`} {...adaptiveLinkProps} className="block">

// 修复后
<a href={`/portal/article/${mainHeadline.slug}`} {...adaptiveLinkProps} className="block">
```

**Line 111 - 次要头条链接**
```typescript
// 修复前
<a href={`/article/${article.slug}`} {...adaptiveLinkProps} className="...">

// 修复后
<a href={`/portal/article/${article.slug}`} {...adaptiveLinkProps} className="...">
```

#### 2. `SocialNewsSection.tsx`
修改了 2 处链接：

**Line 90 - 最新报道链接**
```typescript
// 修复前
<a href={`/article/${article.slug}`} {...adaptiveLinkProps} className="group">

// 修复后
<a href={`/portal/article/${article.slug}`} {...adaptiveLinkProps} className="group">
```

**Line 144 - 热门文章链接**
```typescript
// 修复前
<a href={`/article/${article.slug}`} {...adaptiveLinkProps} className="flex gap-3 group">

// 修复后
<a href={`/portal/article/${article.slug}`} {...adaptiveLinkProps} className="flex gap-3 group">
```

## 影响范围

### 修复的组件
- ✅ `SocialHeadlines.tsx` - 头条新闻组件
- ✅ `SocialNewsSection.tsx` - 新闻区域组件

### 影响的链接类型
- ✅ 主头条文章链接
- ✅ 次要头条文章链接  
- ✅ 最新报道文章链接
- ✅ 热门文章链接

## 验证

### 开发机器测试
```bash
# 开发者本地访问
http://localhost:3001/portal?channel=society

# 点击任意文章，应跳转到
http://localhost:3001/portal/article/{slug}
```

### 局域网用户测试
```bash
# 其他用户访问
http://{dev-machine-ip}:3001/portal?channel=society

# 点击任意文章，应正确跳转并显示内容
http://{dev-machine-ip}:3001/portal/article/{slug}
```

### 预期结果
- ✅ 文章页面正常加载
- ✅ 无服务端/客户端组件边界错误
- ✅ 自适应链接正常工作（桌面新标签页，移动当前页）
- ✅ 所有交互功能正常

## 技术说明

### 为什么需要 `/portal` 前缀？

项目的路由结构：
```
/portal                     - Portal 首页
/portal?channel=society     - 频道页面（社会频道）
/portal/article/{slug}      - 文章详情页
```

所有 Portal 相关页面都在 `/portal` 路径下，文章详情页也不例外。缺少 `/portal` 前缀会导致：
1. 路由到错误的页面（可能是根路径的 article 路由）
2. 服务端组件/客户端组件边界问题
3. 状态管理和上下文丢失

### 一致性检查

其他组件的文章链接（已正确使用 `/portal/article` 格式）：
- ✅ `ChannelStrip.tsx` - `href={`/portal/article/${article.slug}`}`
- ✅ `NewsContent.tsx` - `href={`/portal/article/${news.slug}`}`

现在社会模板组件已与系统保持一致。

## 总结

| 修改项 | 数量 | 状态 |
|--------|------|------|
| 修改的文件 | 2 | ✅ |
| 修复的链接 | 4 | ✅ |
| Linter 错误 | 0 | ✅ |
| 影响的功能 | 文章访问 | ✅ |

这是一个**路径前缀缺失**的简单修复，确保了社会模板与整个系统的路由一致性。

---

**修复时间**: 2025-10-09  
**修复人员**: AI Assistant  
**测试状态**: ✅ Linter 通过，待局域网用户验证

