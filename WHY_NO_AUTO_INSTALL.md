# 🤔 为什么容器不自动安装依赖？

## 问题现象

前端 `sites` 容器报错：`Module not found: Can't resolve 'swr'`

即使 `package.json` 中已经配置了 `swr` 依赖，容器启动后依然缺少这个包。

---

## 🔍 根本原因

### 问题出在 Docker Volume 挂载机制

查看 `infra/local/docker-compose.yml` 中 sites 服务的配置：

```yaml
sites:
  build:
    context: ../../sites
    dockerfile: Dockerfile
    target: development  # ← 使用开发阶段
  environment:
    - NODE_ENV=development
    - NEXT_PUBLIC_API_URL=http://localhost:8000
  ports:
    - "3001:3000"
  volumes:
    - ../../sites:/app           # ← 关键：挂载整个目录
    - /app/node_modules          # ← 匿名卷保护 node_modules
    - /app/.next                 # ← 匿名卷保护 .next
  depends_on:
    - authoring
```

### 执行流程详解

#### 1️⃣ 镜像构建阶段（Dockerfile）

```dockerfile
# 开发阶段
FROM base AS development

# 安装 Chromium
RUN apk add --no-cache chromium

# ✅ 安装开发依赖（包括 swr）
RUN npm install

# ✅ 复制源代码
COPY . .

# 启动开发服务器
CMD ["npm", "run", "dev"]
```

**此时镜像内有完整的 `node_modules`，包含 `swr`**

#### 2️⃣ 容器启动阶段（Docker Compose）

```yaml
volumes:
  - ../../sites:/app           # 挂载主机目录到容器
  - /app/node_modules          # 匿名卷
  - /app/.next                 # 匿名卷
```

**问题发生在这里！**

---

## ⚠️ Volume 挂载覆盖问题

### 执行顺序

```
1. Docker 构建镜像
   镜像内: /app/node_modules ← 包含所有依赖（包括 swr）

2. Docker Compose 启动容器
   挂载: ../../sites → /app  ← 主机目录覆盖容器内的 /app
   
   但是！主机的 sites/ 目录可能：
   - 没有 node_modules/
   - 或 node_modules/ 不完整
   - 或 node_modules/ 是旧的

3. 匿名卷保护
   /app/node_modules ← 使用匿名卷，但这个卷是空的！
   
   因为 volumes 挂载顺序：
   - 先挂载 ../../sites:/app （覆盖整个 /app）
   - 再挂载 /app/node_modules（创建新的匿名卷）
```

### 视觉化说明

```
┌─────────────────────────────────────────────────┐
│ 镜像构建时（Dockerfile）                        │
├─────────────────────────────────────────────────┤
│ /app/                                           │
│  ├── package.json                               │
│  ├── node_modules/  ← ✅ 完整依赖（包括 swr）  │
│  │   ├── next/                                  │
│  │   ├── react/                                 │
│  │   ├── swr/       ← ✅ 存在                   │
│  │   └── ...                                    │
│  └── app/                                       │
└─────────────────────────────────────────────────┘

                    ↓ 容器启动

┌─────────────────────────────────────────────────┐
│ 容器启动后（Volume 挂载）                        │
├─────────────────────────────────────────────────┤
│ /app/ ← 挂载自 主机 sites/ 目录                │
│  ├── package.json  ← 从主机                     │
│  ├── node_modules/ ← 匿名卷（空的或不完整）     │
│  │   ├── next/     ← ❌ 可能缺失                │
│  │   ├── react/    ← ❌ 可能缺失                │
│  │   ├── swr/      ← ❌ 缺失！                  │
│  │   └── ...                                    │
│  └── app/ ← 从主机                              │
└─────────────────────────────────────────────────┘
```

---

## 🎯 为什么会这样设计？

这是**开发环境**的典型配置，目的是：

### ✅ 优点

1. **代码热更新**
   - 主机修改代码 → 容器立即看到变化
   - 不需要重建镜像

2. **开发便利**
   - 在 IDE 中修改代码
   - 容器自动重载

3. **保护构建产物**
   - `/app/.next` 不被主机覆盖
   - 构建缓存保留在容器中

### ❌ 缺点

1. **依赖不同步**
   - `package.json` 更新后，容器不会自动重新安装
   - 需要手动运行 `npm install`

2. **主机环境依赖**
   - 如果主机上运行过 `npm install`，可能工作正常
   - 如果主机上没有 `node_modules`，容器会缺依赖

---

## 💡 为什么生产环境不会有这个问题？

查看生产环境配置：

```yaml
# infra/production/docker-compose.yml
sites:
  build:
    context: ../../sites
    target: production  # ← 生产模式
  # ❌ 没有 volumes 挂载！
```

**生产环境流程**:

```
1. 构建镜像
   - npm install
   - COPY . .
   - npm run build

2. 启动容器
   - 不挂载主机目录
   - 使用镜像内的完整文件
   - ✅ 所有依赖都在镜像中
```

---

## 🛠️ 解决方案对比

### 方案 1: 手动安装（当前使用）⭐ 推荐

```bash
# 在容器内安装
docker compose -f infra/local/docker-compose.yml exec sites npm install
```

**优点**:
- ✅ 快速解决
- ✅ 不影响现有配置

**缺点**:
- ❌ 每次更新 package.json 都要手动运行

---

### 方案 2: 使用命名卷存储 node_modules

修改 `docker-compose.yml`:

```yaml
sites:
  volumes:
    - ../../sites:/app
    - sites_node_modules:/app/node_modules  # ← 使用命名卷
    - /app/.next

volumes:
  sites_node_modules:  # ← 定义命名卷
```

**然后首次运行时初始化**:

```bash
# 首次启动后安装依赖
docker compose -f infra/local/docker-compose.yml exec sites npm install

# 之后依赖会保存在命名卷中
```

**优点**:
- ✅ 依赖持久化
- ✅ 容器重启不丢失

**缺点**:
- ❌ 首次仍需手动安装
- ❌ 更新 package.json 仍需手动运行

---

### 方案 3: 启动时自动安装

修改启动命令：

```yaml
sites:
  command: sh -c "npm install && npm run dev"
```

**优点**:
- ✅ 完全自动化
- ✅ 每次启动都检查依赖

**缺点**:
- ❌ 每次启动都要安装（慢）
- ❌ 网络问题可能导致启动失败

---

### 方案 4: 使用 entrypoint 脚本（最佳）

创建 `sites/docker-entrypoint.sh`:

```bash
#!/bin/sh
set -e

# 检查 package.json 是否变化
if [ ! -f /app/.package-lock.json.md5 ] || \
   ! md5sum -c /app/.package-lock.json.md5 >/dev/null 2>&1; then
    echo "📦 Package changed, installing dependencies..."
    npm install
    md5sum /app/package-lock.json > /app/.package-lock.json.md5
else
    echo "✅ Dependencies up to date"
fi

# 启动应用
exec "$@"
```

修改 `Dockerfile`:

```dockerfile
FROM base AS development

RUN apk add --no-cache chromium
RUN npm install

COPY . .

# 添加启动脚本
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "run", "dev"]
```

**优点**:
- ✅ 智能检测依赖变化
- ✅ 只在需要时安装
- ✅ 完全自动化

**缺点**:
- ❌ 需要额外的脚本文件
- ❌ 稍微增加启动时间

---

## 📊 方案对比

| 方案 | 自动化 | 速度 | 复杂度 | 推荐度 |
|------|--------|------|--------|--------|
| **手动安装** | ❌ | ⚡⚡⚡ | ⭐ | 🟢 临时解决 |
| **命名卷** | 半自动 | ⚡⚡ | ⭐⭐ | 🟡 中等 |
| **启动时安装** | ✅ | ⚡ | ⭐⭐ | 🔴 不推荐 |
| **Entrypoint 脚本** | ✅ | ⚡⚡ | ⭐⭐⭐ | 🟢 最佳 |

---

## 🎓 最佳实践建议

### 开发环境（当前）

```bash
# 更新依赖后运行
docker compose -f infra/local/docker-compose.yml exec sites npm install

# 或者重建镜像
docker compose -f infra/local/docker-compose.yml build sites
docker compose -f infra/local/docker-compose.yml up -d sites
```

### 生产环境

```bash
# 重新构建（会自动安装所有依赖）
docker compose -f infra/production/docker-compose.yml build --no-cache sites
docker compose -f infra/production/docker-compose.yml up -d sites
```

---

## 💡 理解 Docker Volumes

### 三种卷类型

```yaml
volumes:
  # 1. 主机路径挂载（Bind Mount）
  - ../../sites:/app           # 双向同步

  # 2. 匿名卷（Anonymous Volume）
  - /app/node_modules          # 容器专用，随容器删除

  # 3. 命名卷（Named Volume）
  - sites_node_modules:/app/node_modules  # 持久化
```

### Volume 优先级

```
匿名卷 > 命名卷 > 主机挂载 > 镜像内容
```

当多个卷挂载到同一路径时，**后声明的优先级更高**。

---

## 📚 相关文档

- `sites/Dockerfile` - 多阶段构建配置
- `infra/local/docker-compose.yml` - 开发环境配置
- `infra/production/docker-compose.yml` - 生产环境配置
- Docker 官方文档: [Use volumes](https://docs.docker.com/storage/volumes/)

---

## 🎯 总结

**问题**: 容器不自动安装依赖

**原因**: 开发环境使用 volume 挂载主机目录，覆盖了镜像中的 node_modules

**解决**: 
1. **临时**: 手动在容器内运行 `npm install`
2. **长期**: 实施 entrypoint 脚本自动检测和安装

**教训**: Docker 的 volume 挂载是为了开发便利，但也带来了依赖管理的复杂性。生产环境不使用 volume 挂载，所以不会有这个问题。

---

*文档版本: 1.0*  
*最后更新: 2025-10-11*

