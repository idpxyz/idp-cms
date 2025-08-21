# IDP CMS Portal (Next.js)

这是 IDP CMS 的前端门户，使用 Next.js 15 + TypeScript 构建。

## 技术栈

- **框架**: Next.js 15.4.6 (App Router)
- **语言**: TypeScript 5.9.2 (严格模式)
- **样式**: 内联样式 + CSS-in-JS
- **状态管理**: React Hooks
- **API**: REST API + 游标分页
- **SSO**: Logto OIDC 集成

## 开发环境

### 安装依赖
```bash
yarn install
```

### 开发服务器
```bash
yarn dev
```

### 代码质量
```bash
# 类型检查
yarn type-check

# 代码检查
yarn lint

# 代码格式化
yarn format
```

## 项目结构

```
src/
├── app/                 # App Router 页面
│   ├── feed/           # 内容流页面
│   ├── layout.tsx      # 根布局
│   └── page.tsx        # 首页
├── lib/                 # 工具库
│   ├── feed.ts         # 内容流 API
│   └── track.ts        # 埋点追踪
└── types/               # TypeScript 类型定义
    └── feed.ts         # 内容流类型
```

## 环境变量

### 开发环境
```bash
# .env.local
FEED_API_URL=http://localhost:8000
NEXT_PUBLIC_FEED_API_URL=http://localhost:8000
```

### 生产环境
```bash
# .env.production
FEED_API_URL=http://authoring:8000
NEXT_PUBLIC_FEED_API_URL=https://api.yourdomain.com
```

## 特性

- ✅ **SSR + CSR**: 首屏服务端渲染，后续客户端渲染
- ✅ **无限滚动**: 游标分页 + 交叉观察器
- ✅ **多租户**: 支持 `?site=` 参数
- ✅ **类型安全**: TypeScript 严格模式
- ✅ **错误处理**: 降级路径和用户提示
- ✅ **代码质量**: ESLint + Prettier + 类型检查

## 符合规则

本项目完全符合 `.cursor/.cursorrules` 中的要求：

- 使用 Next.js + TypeScript
- 实现游标分页
- 支持多租户（`?site=`）
- 提供降级路径
- 类型定义完整
- 代码质量工具配置
