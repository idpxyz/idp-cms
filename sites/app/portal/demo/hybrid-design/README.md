# 📰 Professional News Website Demo

> 基于Next.js 15构建的世界级专业新闻网站演示系统，采用BBC风格设计，集成智能搜索、视频播放、用户互动等核心功能。

[![Next.js](https://img.shields.io/badge/Next.js-15.5.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![React](https://img.shields.io/badge/React-18.0-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)

## 🌟 项目概述

**Professional News Website Demo** 是一个功能完整的现代化新闻网站演示系统，采用国际主流媒体的设计标准和技术架构。该项目展示了如何构建一个专业级的新闻平台，包含内容管理、用户互动、多媒体展示等核心功能。

### 🎯 设计理念

- **专业性优先**: 参考BBC、CNN、路透社等国际顶级媒体的设计标准
- **用户体验至上**: 响应式设计，支持多设备访问
- **技术现代化**: 采用最新的前端技术栈和最佳实践
- **可扩展架构**: 模块化设计，支持功能扩展和定制

## ✨ 核心功能

### 🔍 智能搜索系统
- **全屏搜索界面**: 专业级搜索体验
- **实时搜索建议**: AI驱动的智能自动完成
- **搜索历史管理**: 用户行为记录与快速访问
- **多维度筛选**: 按内容类型、时间、热度筛选
- **快捷键支持**: `Ctrl + K` 快速搜索

```typescript
// 搜索功能示例
const handleSearch = (query: string) => {
  const filtered = searchResults.filter(item => 
    item.title.toLowerCase().includes(query.toLowerCase())
  );
  setSearchResults(filtered);
};
```

### 🎬 专业视频系统
- **视频新闻专区**: 直播、专访、回放分类
- **高级播放器**: 全屏、画质选择、控制条
- **直播功能**: 实时观看数、评论流
- **视频互动**: 收藏、分享、下载
- **智能推荐**: 相关视频AI推荐

### 💬 用户互动系统
- **评论系统**: 实时评论、回复、点赞
- **用户认证**: 认证用户标识
- **社交分享**: 多平台分享功能
- **内容收藏**: 个人收藏夹管理
- **富文本编辑**: 表情、图片支持

### 🏗️ 四层信息架构
```
Channel (频道) → Category (分类) → Tag (标签) → Topic (专题)
     ↓              ↓               ↓            ↓
  一级导航        结构化细分      热点标签     项目化聚合
```

## 🛠️ 技术架构

### 前端技术栈
```json
{
  "framework": "Next.js 15.5.2",
  "language": "TypeScript 5.0",
  "styling": "TailwindCSS 3.0",
  "ui": "React 18 + React Hooks",
  "state": "React State Management",
  "icons": "Heroicons",
  "animations": "CSS Transitions + Keyframes"
}
```

### 核心依赖
```bash
# 主要依赖
next@15.5.2
react@18.0
typescript@5.0
tailwindcss@3.0

# 开发依赖
@types/react
@types/node
eslint-config-next
```

### 项目结构
```
sites/app/portal/demo/hybrid-design/
├── page.tsx              # 主页面组件
├── README.md             # 项目文档
└── components/           # 组件目录
    ├── SearchModal/      # 搜索弹窗
    ├── VideoPlayer/      # 视频播放器
    ├── CommentSystem/    # 评论系统
    └── InteractionBar/   # 互动工具栏
```

## 🚀 快速开始

### 环境要求
- Node.js >= 18.0
- npm >= 9.0 或 yarn >= 1.22
- Docker (可选，用于容器化部署)

### 安装步骤
```bash
# 1. 克隆项目
cd /opt/idp-cms

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 4. 访问页面
# http://localhost:3000/portal/demo/hybrid-design
```

### Docker部署
```bash
# 使用Docker Compose启动
cd infra/local
docker-compose up -d

# 访问地址
# http://localhost:3000/portal/demo/hybrid-design
```

## 📱 响应式设计

### 断点设置
```css
/* 移动端 */
@media (max-width: 640px) { /* sm */ }

/* 平板端 */
@media (min-width: 768px) { /* md */ }

/* 桌面端 */
@media (min-width: 1024px) { /* lg */ }

/* 大屏幕 */
@media (min-width: 1280px) { /* xl */ }
```

### 适配策略
- **移动端**: 单栏布局，手势优化
- **平板端**: 双栏布局，触控友好
- **桌面端**: 三栏布局，鼠标交互
- **大屏幕**: 宽屏优化，更多内容展示

## 🌐 国际化支持

### 支持语言
- 🇨🇳 简体中文 (默认)
- 🇺🇸 English
- 🇯🇵 日本語

### 多语言实现
```typescript
const languages = {
  'zh-CN': '中文',
  'en': 'English', 
  'ja': '日本語'
};

// 语言切换
const switchLanguage = (lang: string) => {
  // 实现语言切换逻辑
};
```

## ♿ 无障碍设计

### WCAG 2.1 AA 标准
- **键盘导航**: 全站支持Tab键导航
- **屏幕阅读器**: 语义化HTML标签
- **色彩对比**: 符合4.5:1对比度要求
- **焦点管理**: 清晰的焦点指示器

### 辅助功能
```typescript
// 键盘快捷键
useEffect(() => {
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'k') {
      e.preventDefault();
      setSearchOpen(true);
    }
  };
  document.addEventListener('keydown', handleKeydown);
}, []);
```

## 🎨 设计系统

### 色彩规范
```css
:root {
  /* 主色调 - BBC风格红色 */
  --primary-red: #dc2626;
  --primary-red-dark: #b91c1c;
  
  /* 中性色 */
  --gray-50: #f9fafb;
  --gray-900: #111827;
  
  /* 功能色 */
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
}
```

### 字体系统
```css
.text-responsive-headline {
  font-size: clamp(1.5rem, 4vw, 3rem);
  line-height: 1.2;
  font-weight: 700;
}
```

### 组件库
- **Button**: 主要、次要、文本按钮
- **Card**: 新闻卡片、视频卡片
- **Modal**: 搜索弹窗、评论弹窗
- **Input**: 搜索框、评论输入框

## 📊 性能优化

### 代码分割
```typescript
// 动态导入组件
const VideoPlayer = dynamic(() => import('./components/VideoPlayer'), {
  loading: () => <VideoSkeleton />,
  ssr: false
});
```

### 图片优化
```typescript
// 使用Next.js Image组件
import Image from 'next/image';

<Image
  src={article.image}
  alt={article.title}
  width={600}
  height={400}
  priority={true}
  placeholder="blur"
/>
```

### 缓存策略
```typescript
// SWR数据获取
const { data, error } = useSWR('/api/articles', fetcher, {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  refreshInterval: 30000 // 30秒刷新
});
```

## 🔒 安全考虑

### XSS防护
```typescript
// 内容过滤
const sanitizeContent = (content: string) => {
  return DOMPurify.sanitize(content);
};
```

### CSP配置
```javascript
// next.config.js
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
`;
```

## 📈 SEO优化

### Meta标签
```typescript
export const metadata = {
  title: '专业新闻网站 - 实时资讯',
  description: '提供最新、最权威的新闻资讯，包含政治、经济、科技、体育等各领域内容',
  keywords: '新闻,资讯,时事,政治,经济,科技',
  openGraph: {
    title: '专业新闻网站',
    description: '实时新闻资讯平台',
    type: 'website',
    images: [{
      url: '/og-image.jpg',
      width: 1200,
      height: 630
    }]
  }
};
```

### 结构化数据
```json
{
  "@context": "https://schema.org",
  "@type": "NewsArticle",
  "headline": "文章标题",
  "image": "文章图片URL",
  "datePublished": "2024-01-01T00:00:00Z",
  "author": {
    "@type": "Person",
    "name": "作者姓名"
  }
}
```

## 🧪 测试策略

### 单元测试
```typescript
// 使用Jest + React Testing Library
import { render, screen } from '@testing-library/react';
import { SearchModal } from './SearchModal';

test('搜索框渲染正常', () => {
  render(<SearchModal />);
  expect(screen.getByPlaceholderText('搜索新闻...')).toBeInTheDocument();
});
```

### E2E测试
```typescript
// 使用Playwright
test('用户可以搜索新闻', async ({ page }) => {
  await page.goto('/portal/demo/hybrid-design');
  await page.click('[data-testid="search-button"]');
  await page.fill('input[placeholder*="搜索"]', '经济');
  await page.press('input[placeholder*="搜索"]', 'Enter');
  await expect(page.locator('.search-results')).toBeVisible();
});
```

## 📱 PWA支持

### Service Worker
```javascript
// sw.js
const CACHE_NAME = 'news-app-v1';
const urlsToCache = [
  '/',
  '/static/css/main.css',
  '/static/js/main.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});
```

### Web App Manifest
```json
{
  "name": "专业新闻网站",
  "short_name": "NewsApp",
  "description": "专业新闻资讯平台",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#dc2626",
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

## 🔧 开发指南

### Git工作流
```bash
# 功能开发
git checkout -b feature/search-enhancement
git commit -m "feat: add advanced search filters"
git push origin feature/search-enhancement

# 创建PR进行Code Review
```

### 代码规范
```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'next/core-web-vitals',
    '@typescript-eslint/recommended'
  ],
  rules: {
    'react-hooks/exhaustive-deps': 'warn',
    '@typescript-eslint/no-unused-vars': 'error'
  }
};
```

### 提交规范
```
feat: 新功能
fix: Bug修复
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
chore: 构建过程或辅助工具的变动
```

## 🚀 部署指南

### 生产环境构建
```bash
# 构建项目
npm run build

# 启动生产服务器
npm run start
```

### Docker部署
```dockerfile
FROM node:18-alpine AS base

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

### Nginx配置
```nginx
server {
    listen 80;
    server_name news.example.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📊 监控与分析

### 性能监控
```typescript
// Web Vitals监控
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

### 错误追踪
```typescript
// 使用Sentry进行错误监控
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV
});
```

## 🤝 贡献指南

### 参与贡献
1. Fork项目到你的GitHub账户
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request

### 问题报告
请使用GitHub Issues报告Bug或提出功能请求，包含以下信息：
- 问题描述
- 复现步骤
- 期望结果
- 实际结果
- 环境信息 (浏览器、操作系统等)

## 📄 许可证

本项目采用 MIT 许可证。详情请参阅 [LICENSE](LICENSE) 文件。

## 🙏 致谢

感谢以下开源项目和贡献者：
- [Next.js](https://nextjs.org/) - React框架
- [TailwindCSS](https://tailwindcss.com/) - CSS框架
- [Heroicons](https://heroicons.com/) - 图标库
- [Headless UI](https://headlessui.com/) - 无样式组件库

## 📞 联系我们

- 项目地址: [GitHub Repository](https://github.com/your-org/news-website)
- 文档网站: [Documentation](https://docs.news-website.com)
- 问题反馈: [Issues](https://github.com/your-org/news-website/issues)
- 邮箱联系: contact@news-website.com

---

<div align="center">

**🌟 如果这个项目对你有帮助，请给我们一个Star！**

Made with ❤️ by Professional News Team

</div>
