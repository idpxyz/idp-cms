# AI旅行 - 智能旅行规划平台

一个基于Next.js 15和AI技术的现代化旅行规划网站，为用户提供个性化、智能化的旅行体验。

## ✨ 主要功能

### 🧠 AI智能规划
- **智能行程生成**: 基于用户偏好和预算自动生成最优旅行路线
- **个性化推荐**: 根据兴趣和旅行历史推荐最适合的旅行体验
- **自然语言查询**: 支持自然语言输入，AI理解用户需求

### 🌍 全球目的地
- **目的地库**: 覆盖全球热门旅行目的地
- **详细信息**: 景点介绍、最佳旅行时间、文化背景
- **智能搜索**: 多维度筛选和搜索功能

### 📱 现代化UI/UX
- **响应式设计**: 完美适配各种设备
- **流畅动画**: 使用Framer Motion提供丝滑的用户体验
- **现代组件**: 基于Radix UI和Tailwind CSS构建

## 🚀 技术栈

### 前端
- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **动画**: Framer Motion
- **状态管理**: Zustand
- **UI组件**: Radix UI + Shadcn/ui
- **图标**: Lucide React

### 后端
- **API**: Next.js API Routes
- **数据库**: ClickHouse + PostgreSQL
- **搜索**: OpenSearch
- **AI服务**: OpenAI API / Claude API

## 📁 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── globals.css        # 全局样式
│   ├── layout.tsx         # 根布局
│   └── page.tsx           # 首页
├── components/             # 可复用组件
│   └── Navigation.tsx     # 导航组件
├── lib/                    # 工具库
│   └── aiService.ts       # AI服务
├── store/                  # 状态管理
│   └── travelStore.ts     # 旅行状态store
└── types/                  # TypeScript类型定义
    └── travel.ts          # 旅行相关类型
```

## 🛠️ 开发指南

### 环境要求
- Node.js 18+
- npm 或 yarn

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
npm start
```

### 代码质量
```bash
npm run lint          # ESLint检查
npm run lint:fix      # 自动修复
npm run type-check    # TypeScript类型检查
npm run format        # Prettier格式化
```

## 🎨 设计系统

### 颜色主题
- **主色调**: 蓝色系 (#3B82F6)
- **强调色**: 绿色系 (#22C55E)
- **旅行主题色**: 天空蓝、海洋蓝、日落橙、大地棕

### 组件样式
- **按钮**: 主要按钮、次要按钮、图标按钮
- **卡片**: 信息展示、交互式卡片
- **输入框**: 搜索框、表单输入
- **导航**: 固定导航栏、移动端菜单

## 🔮 未来规划

### 第一阶段 (已完成)
- [x] 基础架构搭建
- [x] 主页面设计
- [x] 导航组件
- [x] 状态管理

### 第二阶段 (进行中)
- [ ] AI旅行助手核心功能
- [ ] 目的地数据库
- [ ] 行程规划算法
- [ ] 用户认证系统

### 第三阶段 (计划中)
- [ ] 价格追踪系统
- [ ] 个性化推荐引擎
- [ ] 移动端PWA
- [ ] 多语言支持

### 第四阶段 (长期规划)
- [ ] 社交功能
- [ ] 旅行社区
- [ ] 高级AI功能
- [ ] 企业版功能

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 📞 联系我们

- 项目主页: [AI旅行](https://github.com/your-username/ai-travel)
- 问题反馈: [Issues](https://github.com/your-username/ai-travel/issues)
- 功能建议: [Discussions](https://github.com/your-username/ai-travel/discussions)

---

**让AI为您规划完美的旅行体验，发现世界的美好！** ✈️🌍
