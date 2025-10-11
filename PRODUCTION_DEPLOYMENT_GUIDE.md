# 🚀 生产环境部署指南

**文档版本**: 1.0  
**更新时间**: 2025-10-11

---

## 📋 目录

1. [容器命名规则](#容器命名规则)
2. [生产环境启动方式](#生产环境启动方式)
3. [开发vs生产对比](#开发vs生产对比)
4. [部署前准备](#部署前准备)
5. [详细启动步骤](#详细启动步骤)
6. [验证和监控](#验证和监控)
7. [常见问题](#常见问题)

---

## 🏷️ 容器命名规则

### Docker Compose 容器命名格式

```
<项目名>-<服务名>-<实例编号>
```

### 开发环境容器命名

**项目名**: `local` (从 `infra/local` 目录名派生)

```
local-authoring-1
local-sites-1
local-celery-1
local-celery-beat-1
local-postgres-1
local-redis-1
local-minio-1
local-opensearch-1
local-clickhouse-1
local-os-dashboards-1
local-minio-setup-1
```

### 生产环境容器命名

**项目名**: `production` (从 `infra/production` 目录名派生)

```
production-authoring-1
production-sites-1
production-celery-1
production-celery-beat-1
production-postgres-1
production-redis-1
production-minio-1
production-opensearch-1
production-minio-setup-1
```

### 容器命名的好处

✅ **环境隔离**: 不同环境的容器名称不同，可以同时运行  
✅ **清晰识别**: 从容器名一眼看出是哪个环境  
✅ **避免冲突**: 不会误操作其他环境的容器  
✅ **便于管理**: 可以单独管理每个环境

---

## 🚀 生产环境启动方式

### 方式 1: 使用启动脚本 ⭐ 推荐

```bash
cd /opt/idp-cms

# 启动生产环境
./start-production.sh
```

**脚本功能**:
- ✅ 自动检查环境配置
- ✅ 按顺序启动服务
- ✅ 等待服务健康检查
- ✅ 运行数据库迁移
- ✅ 显示服务状态

### 方式 2: 手动启动（完整控制）

```bash
cd /opt/idp-cms

# 1. 停止现有服务（如果有）
docker compose -f infra/production/docker-compose.yml down

# 2. 启动基础设施服务
docker compose -f infra/production/docker-compose.yml up -d \
  postgres redis minio opensearch

# 3. 等待基础服务就绪（约30秒）
sleep 30

# 4. 启动应用服务
docker compose -f infra/production/docker-compose.yml up -d \
  authoring celery celery-beat sites

# 5. 运行数据库迁移
docker compose -f infra/production/docker-compose.yml exec authoring \
  python manage.py migrate

# 6. 创建超级用户（首次部署）
docker compose -f infra/production/docker-compose.yml exec authoring \
  python manage.py createsuperuser

# 7. 收集静态文件
docker compose -f infra/production/docker-compose.yml exec authoring \
  python manage.py collectstatic --noinput
```

### 方式 3: 一键启动（快速部署）

```bash
cd /opt/idp-cms

# 直接启动所有服务
docker compose -f infra/production/docker-compose.yml up -d --build

# 查看服务状态
docker compose -f infra/production/docker-compose.yml ps
```

---

## 📊 开发 vs 生产对比

### 命令对比

| 操作 | 开发环境 | 生产环境 |
|------|---------|---------|
| **启动脚本** | `./start.sh` | `./start-production.sh` |
| **配置文件** | `infra/local/docker-compose.yml` | `infra/production/docker-compose.yml` |
| **容器前缀** | `local-` | `production-` |
| **环境变量** | `.env.development` | `.env.production` |
| **Django 设置** | `config.settings.dev` | `config.settings.prod` |
| **Node 环境** | `development` | `production` |

### 手动命令对比

```bash
# === 启动服务 ===
# 开发环境
docker compose -f infra/local/docker-compose.yml up -d

# 生产环境
docker compose -f infra/production/docker-compose.yml up -d


# === 查看日志 ===
# 开发环境
docker compose -f infra/local/docker-compose.yml logs -f sites

# 生产环境
docker compose -f infra/production/docker-compose.yml logs -f sites


# === 执行命令 ===
# 开发环境
docker compose -f infra/local/docker-compose.yml exec authoring python manage.py shell

# 生产环境
docker compose -f infra/production/docker-compose.yml exec authoring python manage.py shell


# === 停止服务 ===
# 开发环境
docker compose -f infra/local/docker-compose.yml down

# 生产环境
docker compose -f infra/production/docker-compose.yml down
```

### 配置差异

| 配置项 | 开发环境 | 生产环境 | 说明 |
|-------|---------|---------|------|
| **PostgreSQL 端口** | 5438 | 5432 | 开发避免冲突 |
| **MinIO 端口** | 9002 | 9000 | 开发避免冲突 |
| **Sites 端口** | 3001 | 3001 | 统一端口 |
| **DEBUG 模式** | True | False | 生产禁用调试 |
| **代码热更新** | ✅ | ❌ | 生产需重启 |
| **ClickHouse** | ✅ | ❌ | 仅开发环境 |
| **OS Dashboards** | ✅ | ❌ | 仅开发环境 |

---

## 📋 部署前准备

### 1. 环境变量配置

#### 创建生产环境配置文件

```bash
cd /opt/idp-cms

# 基于模板创建生产配置（如果还没有）
cp env.production.example .env.production

# 编辑生产配置
nano .env.production
```

#### 必须配置的环境变量

```bash
# === 安全配置（必须修改） ===
DJANGO_SECRET_KEY=<生成一个50+字符的随机密钥>
DJANGO_DEBUG=0
DJANGO_ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# === 数据库密码（必须修改） ===
POSTGRES_PASSWORD=<强密码，至少12字符>
REDIS_PASSWORD=<强密码>

# === 对象存储（必须修改） ===
MINIO_ACCESS_KEY=<访问密钥>
MINIO_SECRET_KEY=<至少20字符的密钥>

# === 搜索引擎（必须修改） ===
OPENSEARCH_PASSWORD=<强密码>
OPENSEARCH_SECURITY_DISABLED=false

# === CORS 配置（必须配置） ===
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
CSRF_TRUSTED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# === 域名配置 ===
SITE_HOSTNAME=yourdomain.com
CMS_PUBLIC_URL=https://yourdomain.com
FRONTEND_PUBLIC_URL=https://yourdomain.com
```

#### 生成强密钥的方法

```bash
# Django SECRET_KEY
python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'

# 或使用 openssl
openssl rand -base64 50

# 其他密码
openssl rand -base64 32
```

### 2. 检查配置文件

```bash
# 验证 docker-compose 配置语法
docker compose -f infra/production/docker-compose.yml config > /dev/null

# 检查所有必需的环境变量文件
ls -la .env.*
```

### 3. 准备数据库备份（如果从旧环境迁移）

```bash
# 从开发环境备份
docker compose -f infra/local/docker-compose.yml exec postgres \
  pg_dump -U news news > backup_dev.sql

# 稍后可以恢复到生产环境
# docker compose -f infra/production/docker-compose.yml exec -T postgres \
#   psql -U news news < backup_dev.sql
```

---

## 🔧 详细启动步骤

### 步骤 1: 停止开发环境（可选）

如果开发和生产环境在同一台机器上：

```bash
cd /opt/idp-cms

# 停止开发环境
docker compose -f infra/local/docker-compose.yml down

# 或者保持运行（容器名不同，可以共存）
```

### 步骤 2: 启动生产环境

```bash
cd /opt/idp-cms

# 使用启动脚本（推荐）
./start-production.sh
```

**脚本执行流程**:

```
1. 🛑 停止现有服务
   ↓
2. 🏗️  启动基础设施（postgres, redis, minio, opensearch）
   ↓
3. ⏳ 等待服务健康检查
   ↓
4. 📝 启动 authoring 服务
   ↓
5. 🗄️  运行数据库迁移
   ↓
6. 🚀 启动其他应用服务（celery, sites）
   ↓
7. ✅ 显示服务状态
```

### 步骤 3: 验证服务启动

```bash
# 查看所有服务状态
docker compose -f infra/production/docker-compose.yml ps

# 应该看到类似输出：
# NAME                        IMAGE              COMMAND              SERVICE      STATUS
# production-authoring-1      ...                ...                  authoring    Up (healthy)
# production-sites-1          ...                ...                  sites        Up (healthy)
# production-postgres-1       ...                ...                  postgres     Up (healthy)
# ... 等等
```

### 步骤 4: 初始化数据（首次部署）

```bash
# 创建超级用户
docker compose -f infra/production/docker-compose.yml exec authoring \
  python manage.py createsuperuser

# 初始化站点配置（如需要）
docker compose -f infra/production/docker-compose.yml exec authoring \
  python manage.py bootstrap_sites \
  --portal-domain=yourdomain.com \
  --a-domain=site-a.yourdomain.com \
  --b-domain=site-b.yourdomain.com

# 收集静态文件
docker compose -f infra/production/docker-compose.yml exec authoring \
  python manage.py collectstatic --noinput

# 初始化 OpenSearch 索引
docker compose -f infra/production/docker-compose.yml exec authoring \
  python manage.py os_alias_bootstrap --site yourdomain.com --version 1
```

---

## 🔍 验证和监控

### 快速健康检查

```bash
echo "🔍 生产环境健康检查"
echo ""

# 1. 检查服务状态
echo "1. 服务状态："
docker compose -f infra/production/docker-compose.yml ps --format "table {{.Service}}\t{{.State}}\t{{.Status}}"

# 2. 测试后端 API
echo ""
echo "2. 后端 API："
curl -s -o /dev/null -w "状态码: %{http_code}\n" http://localhost:8000/health/readiness/

# 3. 测试前端
echo ""
echo "3. 前端："
curl -s -o /dev/null -w "状态码: %{http_code}\n" http://localhost:3001/

# 4. 测试数据库连接
echo ""
echo "4. 数据库："
docker compose -f infra/production/docker-compose.yml exec postgres pg_isready -U news

# 5. 测试 Redis
echo ""
echo "5. Redis："
docker compose -f infra/production/docker-compose.yml exec redis redis-cli ping
```

### 查看日志

```bash
# 查看所有服务日志
docker compose -f infra/production/docker-compose.yml logs

# 查看特定服务日志（实时）
docker compose -f infra/production/docker-compose.yml logs -f authoring
docker compose -f infra/production/docker-compose.yml logs -f sites
docker compose -f infra/production/docker-compose.yml logs -f celery

# 查看最近的日志（最后100行）
docker compose -f infra/production/docker-compose.yml logs --tail=100 sites
```

### 监控资源使用

```bash
# 查看容器资源使用
docker stats

# 查看生产环境容器资源使用
docker stats $(docker ps --filter "name=production-" --format "{{.Names}}")
```

---

## 🔄 日常运维操作

### 重启服务

```bash
# 重启特定服务
docker compose -f infra/production/docker-compose.yml restart sites
docker compose -f infra/production/docker-compose.yml restart authoring

# 重启所有服务
docker compose -f infra/production/docker-compose.yml restart
```

### 更新代码

```bash
# 1. 拉取最新代码
cd /opt/idp-cms
git pull origin main

# 2. 重新构建并启动
docker compose -f infra/production/docker-compose.yml up -d --build

# 3. 运行迁移（如有新迁移）
docker compose -f infra/production/docker-compose.yml exec authoring \
  python manage.py migrate

# 4. 收集静态文件（如有前端更新）
docker compose -f infra/production/docker-compose.yml exec authoring \
  python manage.py collectstatic --noinput
```

### 数据库备份

```bash
# 创建备份目录
mkdir -p /opt/idp-cms/backups

# 备份数据库
docker compose -f infra/production/docker-compose.yml exec postgres \
  pg_dump -U news news | gzip > backups/backup_$(date +%Y%m%d_%H%M%S).sql.gz

# 备份 MinIO 数据（可选）
docker compose -f infra/production/docker-compose.yml exec minio \
  mc mirror /data /backup/minio_$(date +%Y%m%d)
```

### 恢复数据库

```bash
# 从备份恢复
gunzip -c backups/backup_YYYYMMDD_HHMMSS.sql.gz | \
  docker compose -f infra/production/docker-compose.yml exec -T postgres \
  psql -U news news
```

---

## 🔒 安全加固建议

### 1. 网络安全

```yaml
# 添加到 docker-compose.yml
networks:
  backend:
    internal: true  # 内部网络，不对外
  frontend:
    # 前端网络可对外
```

### 2. 添加重启策略

```yaml
# 为所有服务添加
services:
  authoring:
    restart: unless-stopped
  sites:
    restart: unless-stopped
  # ... 其他服务
```

### 3. 资源限制

```yaml
services:
  authoring:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          memory: 2G
```

### 4. 日志管理

```yaml
services:
  authoring:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 5. 使用非 root 用户

已经配置在 Dockerfile 中：
```dockerfile
USER django  # 使用非 root 用户运行
```

---

## ⚠️ 常见问题

### Q1: 开发和生产环境可以同时运行吗？

**答**: 可以！容器名称不同：
- 开发环境：`local-*`
- 生产环境：`production-*`

但需要注意端口冲突：
- PostgreSQL: 开发用 5438，生产用 5432
- MinIO: 开发用 9002，生产用 9000
- Sites: 都用 3001（需要改一个）

### Q2: 如何切换环境？

```bash
# 停止开发环境
docker compose -f infra/local/docker-compose.yml down

# 启动生产环境
docker compose -f infra/production/docker-compose.yml up -d
```

### Q3: 如何查看容器使用的环境变量？

```bash
# 查看生产环境 authoring 服务的环境变量
docker compose -f infra/production/docker-compose.yml exec authoring env | grep DJANGO
```

### Q4: 生产环境的数据存储在哪里？

```bash
# 查看 volumes
docker volume ls | grep production

# 数据卷位置
/var/lib/docker/volumes/production_pgdata
/var/lib/docker/volumes/production_minio
/var/lib/docker/volumes/production_opensearch_data
```

### Q5: 如何完全清理生产环境？

```bash
# ⚠️ 警告：这会删除所有数据！

# 停止并删除容器
docker compose -f infra/production/docker-compose.yml down

# 删除数据卷
docker compose -f infra/production/docker-compose.yml down -v

# 删除镜像
docker compose -f infra/production/docker-compose.yml down --rmi all
```

---

## 📊 生产环境服务清单

### 当前配置的服务

```
✅ 9 个服务

基础设施：
  1. postgres      - PostgreSQL 数据库
  2. redis         - Redis 缓存
  3. minio         - MinIO 对象存储
  4. minio-setup   - MinIO 初始化
  5. opensearch    - OpenSearch 搜索引擎

应用服务：
  6. authoring     - Django/Wagtail 后端
  7. celery        - Celery 后台任务
  8. celery-beat   - Celery 定时任务
  9. sites         - Next.js 前端
```

### 访问地址（生产环境）

```
前端：        http://yourdomain.com (或 http://localhost:3001)
后端 API：    http://yourdomain.com/api (或 http://localhost:8000)
Admin：       http://yourdomain.com/admin (或 http://localhost:8000/admin)
MinIO：       http://yourdomain.com:9001 (或 http://localhost:9001)
```

---

## 🚀 快速参考

### 一键命令

```bash
# 启动生产环境
./start-production.sh

# 停止生产环境
docker compose -f infra/production/docker-compose.yml down

# 查看状态
docker compose -f infra/production/docker-compose.yml ps

# 查看日志
docker compose -f infra/production/docker-compose.yml logs -f

# 重启服务
docker compose -f infra/production/docker-compose.yml restart

# 更新服务
docker compose -f infra/production/docker-compose.yml up -d --build
```

---

## 📚 相关文档

- `STARTUP_SUCCESS_SUMMARY.md` - 开发环境启动总结
- `PRODUCTION_CONFIG_COMPLETED.md` - 生产环境配置说明
- `PORT_MAPPING_EXPLAINED.md` - 端口映射详解
- `DEPLOYMENT.md` - 原始部署文档

---

**生产环境部署指南完成！** 🎊

*文档版本: 1.0*  
*最后更新: 2025-10-11*

