# 🚀 共享基础设施 - 快速开始

## 📊 架构对比

### ❌ 原来的架构（独立）- 资源浪费

```
开发环境容器:                   生产环境容器:
├── local-postgres-1  200MB    ├── production-postgres-1  200MB
├── local-minio-1     100MB    ├── production-minio-1     100MB
├── local-clickhouse-1 500MB   ├── production-clickhouse-1 500MB
├── local-redis-1              ├── production-redis-1
├── local-opensearch-1         ├── production-opensearch-1
├── local-authoring-1          ├── production-authoring-1
├── local-sites-1              ├── production-sites-1
└── local-celery-1             └── production-celery-1

总资源使用: ~1600MB            端口冲突: 需要调整端口
```

### ✅ 新的架构（共享）- 资源优化

```
共享基础设施 (一次启动):
├── shared-postgres    250MB  ← 所有环境共用
├── shared-minio       120MB  ← 所有环境共用
├── shared-clickhouse  550MB  ← 所有环境共用
└── shared-network            ← 连接网络

开发环境:                      生产环境:
├── local-redis               ├── production-redis
├── local-opensearch          ├── production-opensearch
├── local-authoring           ├── production-authoring
├── local-sites               ├── production-sites
└── local-celery              └── production-celery
    ↓ 连接到共享服务              ↓ 连接到共享服务

总资源使用: ~920MB            节省: ~680MB (42%)
```

---

## 🎯 三步快速启动

### 第 1 步: 启动共享基础设施（只需一次）

```bash
cd /opt/idp-cms

# 启动共享服务
./start-shared-infra.sh
```

**输出**:
```
🚀 Starting shared infrastructure services...
✅ Shared infrastructure is running!

📊 Service Status:
NAME                STATE      PORTS
shared-postgres     Up         0.0.0.0:5432->5432/tcp
shared-minio        Up         0.0.0.0:9000-9001->9000-9001/tcp
shared-clickhouse   Up         0.0.0.0:8123->8123/tcp
```

### 第 2 步: 启动开发环境

```bash
# 启动开发环境（使用共享基础设施）
./start-dev-shared.sh
```

**访问地址**:
- 🌐 前端: http://localhost:3001/
- 🔧 后端: http://localhost:8000/
- 👤 管理: http://localhost:8000/admin/

### 第 3 步: 启动生产环境（可选）

```bash
# 启动生产环境（使用相同的共享基础设施）
./start-prod-shared.sh
```

**访问地址**:
- 🌐 前端: http://localhost:3002/
- 🔧 后端: http://localhost:8001/
- 👤 管理: http://localhost:8001/admin/

---

## 🔍 关键特性

### ✅ 数据隔离

虽然共享基础设施，但数据是隔离的：

| 服务 | 开发环境 | 生产环境 |
|------|---------|---------|
| **PostgreSQL** | `news` 数据库 | `news_prod` 数据库 |
| **MinIO** | `media` 桶 | `media-prod` 桶 |
| **ClickHouse** | 共享 | 共享 |

### ✅ 端口映射

| 服务 | 开发环境 | 生产环境 | 共享服务 |
|------|---------|---------|---------|
| **Frontend** | 3001 | 3002 | - |
| **Backend** | 8000 | 8001 | - |
| **PostgreSQL** | - | - | 5432 |
| **MinIO** | - | - | 9000, 9001 |
| **ClickHouse** | - | - | 8123 |
| **Redis** | 6379 | 6380 | - |
| **OpenSearch** | 9200 | 9201 | - |

### ✅ 容器命名

```
共享基础设施:
  - shared-postgres
  - shared-minio
  - shared-clickhouse

开发环境:
  - local-redis
  - local-opensearch
  - local-authoring
  - local-sites
  - local-celery

生产环境:
  - production-redis
  - production-opensearch
  - production-authoring
  - production-sites
  - production-celery
```

---

## 📝 常用命令

### 查看所有服务状态

```bash
# 查看共享服务
docker compose -f infra/shared/docker-compose.yml ps

# 查看开发环境
docker compose -f infra/local/docker-compose-shared.yml ps

# 查看生产环境
docker compose -f infra/production/docker-compose-shared.yml ps

# 查看所有容器
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "shared|local|production"
```

### 停止服务

```bash
# 停止开发环境（保留共享服务）
docker compose -f infra/local/docker-compose-shared.yml down

# 停止生产环境（保留共享服务）
docker compose -f infra/production/docker-compose-shared.yml down

# 停止共享服务（会影响所有环境）
docker compose -f infra/shared/docker-compose.yml down
```

### 查看日志

```bash
# 共享服务日志
docker compose -f infra/shared/docker-compose.yml logs -f postgres
docker compose -f infra/shared/docker-compose.yml logs -f minio

# 开发环境日志
docker compose -f infra/local/docker-compose-shared.yml logs -f authoring
docker compose -f infra/local/docker-compose-shared.yml logs -f sites
```

### 数据库操作

```bash
# 连接到共享数据库
docker exec -it shared-postgres psql -U news

# 查看所有数据库
docker exec -it shared-postgres psql -U news -c "\l"

# 切换数据库
\c news      # 开发数据库
\c news_prod # 生产数据库
```

---

## ⚠️ 重要说明

### 1. 数据安全

**问题**: 所有环境共享相同的基础设施

**解决**: 
- ✅ 使用独立的数据库名（`news` vs `news_prod`）
- ✅ 使用独立的存储桶（`media` vs `media-prod`）
- ✅ 定期备份共享数据

### 2. 启动顺序

```
1. 先启动共享基础设施
   ./start-shared-infra.sh

2. 再启动应用环境
   ./start-dev-shared.sh    # 开发
   ./start-prod-shared.sh   # 生产
```

### 3. 从旧架构迁移

```bash
# 1. 备份旧数据
docker compose -f infra/local/docker-compose.yml exec postgres \
  pg_dump -U news news > backup_old.sql

# 2. 停止旧环境
docker compose -f infra/local/docker-compose.yml down

# 3. 启动新架构
./start-shared-infra.sh
./start-dev-shared.sh

# 4. 恢复数据（如需要）
docker exec -i shared-postgres psql -U news news < backup_old.sql
```

---

## 🔧 故障排除

### 问题 1: 共享服务未运行

**错误**: `❌ Shared infrastructure not running!`

**解决**:
```bash
./start-shared-infra.sh
```

### 问题 2: 端口被占用

**错误**: `Error starting userland proxy: listen tcp4 0.0.0.0:5432: bind: address already in use`

**检查**:
```bash
# 查看端口占用
sudo lsof -i :5432
sudo lsof -i :9000

# 停止旧容器
docker compose -f infra/local/docker-compose.yml down
```

### 问题 3: 网络连接失败

**错误**: `could not translate host name "shared-postgres" to address`

**检查**:
```bash
# 确认网络存在
docker network inspect idp-shared-network

# 确认容器在同一网络
docker inspect local-authoring | grep NetworkMode
docker inspect shared-postgres | grep Networks -A 5
```

---

## 📚 脚本文件说明

| 脚本 | 用途 |
|------|------|
| `start-shared-infra.sh` | 启动共享基础设施 |
| `start-dev-shared.sh` | 启动开发环境（使用共享） |
| `start-prod-shared.sh` | 启动生产环境（使用共享） |
| `start.sh` | 启动开发环境（独立模式） |
| `start-production.sh` | 启动生产环境（独立模式） |

---

## 🎓 推荐使用场景

### ✅ 适合共享基础设施

- 💻 本地开发和测试
- 🔬 需要频繁切换环境
- 💾 硬件资源有限
- 🔄 需要共享数据进行测试

### ❌ 不适合共享基础设施

- 🏢 真正的生产环境（应该独立部署）
- 🔒 需要完全隔离的场景
- ⚡ 需要独立性能调优
- 🌐 多服务器分布式部署

---

**共享基础设施配置完成！现在可以开始使用了** 🎊

```bash
# 第一次使用
./start-shared-infra.sh  # 启动共享服务
./start-dev-shared.sh    # 启动开发环境

# 访问
open http://localhost:3001  # 前端
open http://localhost:8000/admin  # 后台
```

