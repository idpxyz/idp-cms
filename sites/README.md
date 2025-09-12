# IDP-CMS Sites - 多站点前端架构

基于 Next.js 14 的多站点新闻聚合平台前端实现，完全按照前端结构.md 文档设计。

## 🏗️ **架构特点**

### **混合架构设计**

- **Django 后端**：负责核心数据 API 和业务逻辑
- **Next.js 前端**：负责前端渲染和用户体验
- **BFF 层**：轻量级代理，仅用于拼装/签名/脱敏

### **多站点支持**

- **Portal 站点**：门户级站点，独立品牌
- **地方站点**：本地化站点，支持主题定制
- **动态路由**：根据 Host 自动分流到对应路由组

### **主题系统**

- **设计令牌**：完整的 CSS 变量系统
- **主题切换**：支持多种主题风格
- **品牌定制**：每个站点独立的品牌配置

## 🚀 **快速开始**

### **Docker Compose 环境（推荐）**

Sites 服务已完全集成到主项目的 docker-compose.yaml 中！

#### 1. 启动所有服务

```bash
# 在项目根目录
docker-compose -f infra/local/docker-compose.yaml up -d

# 或者使用启动脚本（推荐）
cd infra/local
./start_sites.sh
```

#### 2. 访问服务

- **Portal 站点**：http://localhost:3000
- **Sites 服务**：http://localhost:3001 (自动路由到 portal/localsite 组)

#### 3. 管理服务

```bash
# 查看所有服务状态
docker-compose -f infra/local/docker-compose.yaml ps

# 查看 sites 服务日志
docker-compose -f infra/local/docker-compose.yaml logs -f sites

# 重启 sites 服务
docker-compose -f infra/local/docker-compose.yaml restart sites

# 停止所有服务
docker-compose -f infra/local/docker-compose.yaml down
```

### **本地开发环境**

#### 1. 安装依赖

```bash
cd sites
npm install
```

#### 2. 环境配置

复制 `env.local` 到 `.env.local` 并修改配置：

```bash
# CMS后端配置
CMS_ORIGIN=http://localhost:8000
NEXT_PUBLIC_API_BASE=/cms/api/v1

# 允许的站点白名单
ALLOWED_SITES=localhost,beijing.aivoya.com,shanghai.aivoya.com
```

#### 3. 启动开发服务器

```bash
npm run dev
```

## 📁 **目录结构**

```
sites/
├── app/                          # Next.js 14 App Router
│   ├── (portal)/                # Portal路由组
│   │   ├── layout.tsx          # Portal布局
│   │   └── page.tsx            # Portal首页
│   ├── (localsite)/             # 地方站路由组
│   │   ├── layout.tsx          # 地方站布局
│   │   └── page.tsx            # 地方站首页
│   ├── api/                     # API路由
│   │   ├── proxy/              # BFF代理层
│   │   ├── frontend/           # 前端逻辑
│   │   └── internal/           # 内部接口
│   ├── layout.tsx              # 根布局
│   └── globals.css             # 全局样式
├── themes/                      # 主题系统
│   └── tokens/                 # 设计令牌
├── layouts/                     # 布局组件
├── components/                  # 通用组件
├── lib/                         # 工具库
│   ├── api/                    # API客户端
│   ├── cache/                  # 缓存策略
│   ├── security/               # 安全工具
│   └── types/                  # 类型定义
├── middleware.ts                # 路由中间件
├── Dockerfile                   # Docker构建文件
└── tailwind.config.js          # Tailwind配置
```

## 🎯 **核心功能**

### **1. 动态布局切换**

- 根据`layout_key`动态加载布局组件
- 支持 Portal 和地方站不同布局风格
- 布局组件完全可定制

### **2. 主题令牌系统**

- 完整的 CSS 变量系统
- 支持品牌色彩、字体、间距等
- 主题切换无需重新构建

### **3. 模块编排**

- 根据`modules`配置动态渲染页面模块
- 支持首页、侧边栏等不同区域
- 模块顺序和开关完全可配置

### **4. 缓存策略**

- 统一的缓存标签系统
- 支持 ISR 和边缘缓存
- 精准的缓存失效机制

## 🔧 **开发指南**

### **添加新站点**

1. 在`sites/app/`下创建新的路由组
2. 在`themes/tokens/`下添加主题配置
3. 在`layouts/`下创建布局组件
4. 更新中间件配置

### **自定义主题**

1. 修改`themes/tokens/`下的令牌文件
2. 在`globals.css`中添加 CSS 变量
3. 在 Tailwind 配置中扩展主题

### **API 集成**

- **优先直连**：90%+请求直接调用 Django 后端
- **BFF 代理**：仅在需要拼装/签名时使用
- **统一缓存**：所有接口使用相同的缓存策略

## 🚀 **部署说明**

### **Docker Compose 部署（推荐）**

Sites 服务已集成到主项目的 docker-compose.yaml 中：

```bash
# 启动所有服务（包括sites）
docker-compose -f infra/local/docker-compose.yaml up -d

# 仅启动sites服务
docker-compose -f infra/local/docker-compose.yaml up -d sites

# 查看sites服务日志
docker-compose -f infra/local/docker-compose.yaml logs -f sites

# 停止所有服务
docker-compose -f infra/local/docker-compose.yaml down
```

### **使用启动脚本（推荐）**

```bash
cd infra/local
./start_sites.sh
```

脚本提供交互式菜单，支持：

- 启动所有服务
- 仅启动 sites 服务
- 查看服务状态
- 查看日志
- 重启服务
- 停止所有服务

### **生产环境**

```bash
npm run build
npm start
```

### **Docker 独立部署**

```bash
docker build -t idp-cms-sites .
docker run -p 3001:3001 idp-cms-sites
```

## 🌐 **网络配置**

### **Docker Compose 集成**

- **服务名**：`sites`
- **端口映射**：`3001:3001` (避免与 portal 的 3000 端口冲突)
- **网络**：自动使用主项目的默认网络
- **依赖**：`authoring` (Django 后端)

### **环境变量**

在主项目的 docker-compose.yaml 中配置：

```yaml
sites:
  environment:
    NODE_ENV: development
    PORT: 3001
    CMS_ORIGIN: http://authoring:8000
    NEXT_PUBLIC_API_BASE: /cms/api/v1
    ALLOWED_SITES: localhost,beijing.aivoya.com,shanghai.aivoya.com
```

## 📚 **技术栈**

- **框架**：Next.js 14 (App Router)
- **样式**：Tailwind CSS + CSS Variables
- **类型**：TypeScript
- **状态管理**：React Hooks
- **API**：Fetch API + Next.js API Routes
- **缓存**：Next.js ISR + Edge Cache
- **容器化**：Docker + 集成到主项目 Docker Compose

## 🐛 **故障排除**

### **常见问题**

1. **端口冲突**

   ```bash
   # 检查端口占用
   lsof -i :3001

   # 修改端口映射
   # 在 infra/local/docker-compose.yaml 中修改 sites 服务的 ports
   ```

2. **构建失败**

   ```bash
   # 清理构建缓存
   docker-compose -f infra/local/docker-compose.yaml down
   docker system prune -f
   docker-compose -f infra/local/docker-compose.yaml up -d --build
   ```

3. **服务依赖问题**

   ```bash
   # 确保authoring服务先启动
   docker-compose -f infra/local/docker-compose.yaml up -d authoring
   docker-compose -f infra/local/docker-compose.yaml up -d sites
   ```

### **日志查看**

```bash
# 实时日志
docker-compose -f infra/local/docker-compose.yaml logs -f sites

# 查看错误日志
docker-compose -f infra/local/docker-compose.yaml logs sites | grep ERROR
```

## 🤝 **贡献指南**

1. Fork 项目
2. 创建功能分支
3. 提交代码
4. 创建 Pull Request

## 📄 **许可证**

MIT License

## 🆘 **支持**

如有问题，请查看：

- [前端结构.md](../docs/DESIGN/前端结构.md)
- [前端规划.md](../docs/DESIGN/前端规划.md)
- [Issues](../../issues)
