# 🗑️ Portal 前端清理计划

> **状态**: 已确认 - `portal` 前端已弃用，`sites` 是当前使用的前端  
> **目标**: 清理所有 portal 相关代码和配置  
> **创建时间**: 2025-10-11

---

## 📋 清理清单

### 1. Docker Compose 配置清理

#### 开发环境 (`infra/local/docker-compose.yml`)

需要删除的 portal 服务配置：

```yaml
# ❌ 删除整个 portal 服务块 (第 208-236 行)
portal:
  build: { context: ../../portal/next, dockerfile: Dockerfile }
  env_file:
    - ../../.env.core
    - ../../.env.features
  environment:
    # ★ SSR 在容器内访问后端（服务名 authoring）
    DJANGO_API_URL: http://authoring:8000
    FEED_API_URL: ${FEED_API_URL:-http://authoring:8000}
    # ★ CSR 在浏览器访问后端；Cursor 端口转发时默认走 localhost
    NEXT_PUBLIC_FEED_API_URL: ${NEXT_PUBLIC_FEED_API_URL:-http://localhost:8000}
    # 事件上报（如你 .env 已有别名，可自行覆写）
    NEXT_PUBLIC_TRACK_URL: ${NEXT_PUBLIC_TRACK_URL:-http://localhost:8000/api/track}
    # 可选：仅在你的代码读取该变量时有用
    SITE_HOSTNAME: ${SITE_HOSTNAME:-localhost}
  ports: ["3000:3000"]
  volumes:
    - ../../portal/next:/app
    - /app/node_modules
  depends_on:
    authoring:
      condition: service_started
  user: "root"
  command:
    [
      "sh",
      "-c",
      "npm install && rm -rf /app/.next && mkdir -p /app/.next && touch /app/.next/fallback-build-manifest.json && echo '{}' > /app/.next/fallback-build-manifest.json && npm run dev -- -p 3000",
    ]
```

#### 生产环境 (`infra/production/docker-compose.yaml`)

需要删除的 portal 服务配置：

```yaml
# ❌ 删除整个 portal 服务块 (第 85-103 行)
portal:
  build: { context: ../../portal/next, dockerfile: Dockerfile }
  env_file:
    - ../../.env.core
    - ../../.env.features
    - ../../.env.production
  environment:
    NODE_ENV: production
    NEXT_PUBLIC_FEED_API_URL: ${NEXT_PUBLIC_FEED_API_URL:-http://localhost:8000}
    NEXT_PUBLIC_TRACK_URL: ${NEXT_PUBLIC_TRACK_URL:-http://localhost:8000/api/track}
    SITE_HOSTNAME: ${SITE_HOSTNAME:-localhost}
  ports: ["3000:3000"]
  volumes:
    - ../../portal/next:/app
    - /app/node_modules
  depends_on:
    authoring:
      condition: service_started
  command: ["sh", "-c", "npm run build && npm run start -- -p 3000"]
```

#### 清理 ALLOWED_HOSTS 中的 portal.local

```yaml
# 修改前
DJANGO_ALLOWED_HOSTS: ${DJANGO_ALLOWED_HOSTS:-localhost,127.0.0.1,192.168.8.195,portal.local}

# 修改后
DJANGO_ALLOWED_HOSTS: ${DJANGO_ALLOWED_HOSTS:-localhost,127.0.0.1,192.168.8.195}
```

---

### 2. 目录和代码清理

#### 删除 portal 目录

```bash
# 完整删除 portal 目录及其所有内容
rm -rf /opt/idp-cms/portal
```

**包含的文件**：
- `portal/next/` - 完整的 Next.js 应用
  - 源代码
  - 配置文件
  - node_modules
  - 构建产物

---

### 3. 环境变量清理

#### 需要检查和更新的环境变量

**可以移除的环境变量** (如果只被 portal 使用)：

```bash
# 检查这些变量是否仅被 portal 使用
FRONTEND_BASE_URL=http://localhost:3000  # 如果 sites 用 3001
```

**保留的环境变量** (sites 仍在使用)：

```bash
# 这些变量 sites 服务仍在使用，保留
FRONTEND_ORIGIN=http://localhost:3000       # 可能需要改为 3001
FRONTEND_PUBLIC_URL=http://localhost:3001   # sites 使用
CMS_ORIGIN=http://authoring:8000
CMS_PUBLIC_URL=http://localhost:8000
```

---

### 4. 文档清理和更新

#### 需要更新的文档

**README.md**:
- ❌ 删除所有提到 portal 端口 3000 的地方
- ✅ 明确说明使用 `sites` 前端，端口 3001
- ✅ 更新快速开始中的访问地址

**DEPLOYMENT.md**:
- ❌ 删除 portal 服务相关说明
- ✅ 更新端口映射表
- ✅ 更新服务列表

**start.sh / start-production.sh**:
- 检查是否有对 portal 服务的引用
- 更新服务启动顺序（如有）

**其他可能提到 portal 的文档**:
- QUICK_START.md
- 各种 PERFORMANCE_*.md
- OPTIMIZATION_*.md

---

### 5. 启动脚本清理

#### 检查脚本中的 portal 引用

```bash
# 搜索所有脚本文件
grep -r "portal" /opt/idp-cms/*.sh
grep -r ":3000" /opt/idp-cms/*.sh
```

需要检查的脚本：
- `start.sh`
- `start-production.sh`
- `deploy-production.sh`
- 其他启动/部署脚本

---

## 🔧 执行步骤

### 阶段 1: 停止服务并备份（安全起见）

```bash
# 1. 停止所有服务
docker compose -f infra/local/docker-compose.yml down

# 2. 备份 portal 目录（以防万一）
tar -czf portal_backup_$(date +%Y%m%d).tar.gz portal/

# 3. 备份 docker-compose 文件
cp infra/local/docker-compose.yml infra/local/docker-compose.yml.backup
cp infra/production/docker-compose.yaml infra/production/docker-compose.yaml.backup
```

### 阶段 2: 删除 Docker Compose 中的 portal 服务

```bash
# 编辑开发环境配置
nano infra/local/docker-compose.yml
# 删除 portal 服务块（第 208-236 行）
# 修改 DJANGO_ALLOWED_HOSTS，移除 portal.local

# 编辑生产环境配置
nano infra/production/docker-compose.yaml
# 删除 portal 服务块（第 85-103 行）
```

### 阶段 3: 删除 portal 目录

```bash
# 删除整个 portal 目录
rm -rf portal/
```

### 阶段 4: 清理环境变量（如需要）

```bash
# 检查并编辑环境配置文件
nano .env.core
nano .env.features
nano .env.development

# 移除或更新仅 portal 使用的变量
```

### 阶段 5: 更新文档

```bash
# 1. 更新 README.md
nano README.md
# - 删除 portal 3000 端口引用
# - 更新为 sites 3001 端口

# 2. 更新 DEPLOYMENT.md
nano DEPLOYMENT.md
# - 删除 portal 服务说明
# - 更新端口表

# 3. 更新项目分析报告
nano PROJECT_ANALYSIS_AND_DOCUMENTATION_AUDIT.md
# - 标注 portal 已删除
# - 更新服务列表
```

### 阶段 6: 验证和测试

```bash
# 1. 启动服务（确保没有错误）
docker compose -f infra/local/docker-compose.yml up -d

# 2. 检查服务状态
docker compose -f infra/local/docker-compose.yml ps

# 3. 验证 sites 服务正常运行
curl http://localhost:3001/

# 4. 验证后端 API 正常
curl http://localhost:8000/api/feed

# 5. 查看日志确认无错误
docker compose -f infra/local/docker-compose.yml logs sites
```

---

## 📊 清理后的服务架构

### 最终服务列表

#### 前端服务（仅一个）
- ✅ **sites** - Next.js 多站点前端，端口 3001

#### 后端服务
- ✅ **authoring** - Django/Wagtail，端口 8000
- ✅ **celery** - 后台任务处理
- ✅ **celery-beat** - 定时任务调度

#### 基础设施服务
- ✅ **postgres** - 数据库，端口 5438 (开发) / 5432 (生产)
- ✅ **redis** - 缓存，端口 6379
- ✅ **minio** - 对象存储，端口 9002 (开发) / 9000 (生产)
- ✅ **opensearch** - 搜索引擎，端口 9200
- ✅ **clickhouse** - 分析数据库，端口 8123
- ✅ **os-dashboards** - OpenSearch 可视化，端口 5601 (仅开发)

### 更新后的端口映射表

| 服务 | 开发环境 | 生产环境 | 说明 |
|------|---------|---------|------|
| authoring | 8000 | 8000 | Django/Wagtail |
| **sites** | **3001** | **3001** | **Next.js 前端（唯一）** |
| postgres | 5438 | 5432 | 数据库 |
| redis | 6379 | 6379 | 缓存 |
| minio | 9002 | 9000 | 对象存储 |
| minio-console | 9001 | 9001 | MinIO 管理 |
| opensearch | 9200 | 9200 | 搜索 |
| clickhouse | 8123 | - | 分析（仅开发） |

### 更新后的访问地址

```bash
# 前端
http://localhost:3001/         # Sites 前端（唯一）

# 后端
http://localhost:8000/         # API
http://localhost:8000/admin/   # Wagtail Admin

# 基础设施
http://localhost:9001/         # MinIO Console
http://localhost:5601/         # OpenSearch Dashboards
http://localhost:8123/         # ClickHouse
```

---

## ⚠️ 注意事项

### 1. 确认没有遗留引用

清理完成后，搜索整个代码库确认没有遗留引用：

```bash
# 搜索所有 portal 引用
grep -r "portal" /opt/idp-cms --exclude-dir=node_modules --exclude-dir=.git

# 搜索所有 :3000 端口引用
grep -r ":3000" /opt/idp-cms --exclude-dir=node_modules --exclude-dir=.git

# 搜索所有 localhost:3000 引用
grep -r "localhost:3000" /opt/idp-cms --exclude-dir=node_modules --exclude-dir=.git
```

### 2. 数据库配置检查

如果数据库中有与 portal 域名相关的配置（如 Wagtail Sites），需要检查：

```bash
docker compose -f infra/local/docker-compose.yml exec authoring python manage.py shell

# 在 Django shell 中
from wagtail.models import Site
sites = Site.objects.filter(hostname__icontains='portal')
sites.delete()  # 如果有的话
```

### 3. Nginx 配置（如有）

如果使用 Nginx 反向代理，需要删除 portal 相关配置。

### 4. 防火墙规则（生产环境）

如果生产环境配置了防火墙规则允许 3000 端口，可以考虑移除（如果不需要）。

---

## 🎯 清理后的好处

1. ✅ **简化架构** - 只有一个前端服务，降低复杂度
2. ✅ **减少资源占用** - 减少一个 Node.js 服务的内存和 CPU 占用
3. ✅ **降低维护成本** - 不需要维护两套前端代码
4. ✅ **避免混淆** - 文档和实际代码完全一致
5. ✅ **加快启动速度** - 减少一个服务的启动时间

---

## 📞 清理完成后的验证

### 验证清单

- [ ] Docker Compose 文件中没有 portal 服务
- [ ] portal 目录已删除
- [ ] 文档中没有 portal 引用
- [ ] 代码库中没有遗留的 portal 引用
- [ ] 服务能够正常启动
- [ ] sites 服务在 3001 端口正常访问
- [ ] 后端 API 正常工作
- [ ] 数据库中没有 portal 相关配置
- [ ] 所有依赖 portal 的功能已迁移到 sites

---

## 📚 更新后的文档

清理完成后，需要确保以下文档准确：

- ✅ `README.md` - 只提到 sites 前端
- ✅ `DEPLOYMENT.md` - 更新服务列表和端口
- ✅ `PROJECT_ANALYSIS_AND_DOCUMENTATION_AUDIT.md` - 标注 portal 已清理
- ✅ `DOCUMENTATION_FIXES_REQUIRED.md` - 移除 portal 相关内容
- ✅ 创建本文档 `PORTAL_CLEANUP_PLAN.md` - 记录清理过程

---

**清理计划结束**

*执行前建议先备份，确保可以回滚。清理后运行完整测试确保系统正常运行。*

