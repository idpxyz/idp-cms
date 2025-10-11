# 🔗 共享基础设施配置指南

**目的**: 让开发环境和生产环境共享 PostgreSQL、MinIO、ClickHouse 等基础设施服务

**优势**:
- ✅ 节省系统资源
- ✅ 数据统一管理
- ✅ 简化备份流程
- ✅ 减少端口占用

---

## 📋 目录

1. [架构说明](#架构说明)
2. [快速开始](#快速开始)
3. [详细配置](#详细配置)
4. [使用方法](#使用方法)
5. [注意事项](#注意事项)

---

## 🏗️ 架构说明

### 原来的架构（独立）

```
开发环境:
  ├── local-postgres-1
  ├── local-minio-1
  ├── local-clickhouse-1
  ├── local-redis-1
  └── local-opensearch-1

生产环境:
  ├── production-postgres-1
  ├── production-minio-1
  ├── production-clickhouse-1
  ├── production-redis-1
  └── production-opensearch-1
```

### 新的架构（共享）

```
共享基础设施:
  ├── shared-postgres      ← 共享
  ├── shared-minio         ← 共享
  ├── shared-clickhouse    ← 共享
  └── shared-network       ← 共享网络

开发环境:
  ├── local-authoring-1    → 连接到共享服务
  ├── local-sites-1        → 连接到共享服务
  ├── local-celery-1       → 连接到共享服务
  ├── local-redis-1        ← 独立
  └── local-opensearch-1   ← 独立

生产环境:
  ├── production-authoring-1  → 连接到共享服务
  ├── production-sites-1      → 连接到共享服务
  ├── production-celery-1     → 连接到共享服务
  ├── production-redis-1      ← 独立
  └── production-opensearch-1 ← 独立
```

**为什么 Redis 和 OpenSearch 不共享？**
- Redis: 缓存数据环境隔离更安全
- OpenSearch: 索引配置可能不同

---

## 🚀 快速开始

### 步骤 1: 启动共享基础设施

```bash
cd /opt/idp-cms

# 启动共享服务
./start-shared-infra.sh
```

### 步骤 2: 修改开发环境配置

编辑 `infra/local/docker-compose.yml`，修改服务配置：

```yaml
# 注释掉或删除独立的基础设施服务
# postgres:
# minio:
# clickhouse:

# 添加外部网络
networks:
  default:
    name: idp-shared-network
    external: true

services:
  authoring:
    # ... 其他配置
    environment:
      # 使用共享服务的容器名
      POSTGRES_HOST: shared-postgres
      CLICKHOUSE_URL: clickhouse://default:thends@shared-clickhouse:9000/default
    networks:
      - default
    depends_on:
      # 移除对本地 postgres/minio 的依赖
      redis:
        condition: service_healthy
      opensearch:
        condition: service_started
```

### 步骤 3: 修改生产环境配置

同样修改 `infra/production/docker-compose.yml`

### 步骤 4: 启动应用环境

```bash
# 开发环境
./start.sh

# 或生产环境
./start-production.sh
```

---

## 🔧 详细配置步骤

### 1. 停止现有服务

```bash
# 停止开发环境
docker compose -f infra/local/docker-compose.yml down

# 停止生产环境
docker compose -f infra/production/docker-compose.yml down
```

### 2. 备份数据（可选）

```bash
# 备份开发环境数据
docker compose -f infra/local/docker-compose.yml exec postgres \
  pg_dump -U news news > backup_dev_$(date +%Y%m%d).sql
```

### 3. 启动共享基础设施

```bash
./start-shared-infra.sh
```

**验证**:
```bash
# 检查服务状态
docker compose -f infra/shared/docker-compose.yml ps

# 检查网络
docker network inspect idp-shared-network
```

### 4. 更新开发环境配置

创建新的开发环境配置文件：

```yaml
# infra/local/docker-compose-shared.yml

# 使用共享网络
networks:
  default:
    name: idp-shared-network
    external: true

services:
  # Redis 和 OpenSearch 仍然独立
  redis:
    image: redis:7
    container_name: local-redis
    ports: ["6379:6379"]
    volumes:
      - redis_data:/data
    networks:
      - default

  opensearch:
    image: opensearchproject/opensearch:3.2.0
    container_name: local-opensearch
    # ... 其他配置
    networks:
      - default

  authoring:
    build: { context: ../../, dockerfile: Dockerfile }
    container_name: local-authoring
    environment:
      # 使用共享服务
      POSTGRES_HOST: shared-postgres
      POSTGRES_PORT: 5432
      REDIS_URL: redis://local-redis:6379/1
    networks:
      - default
    depends_on:
      - redis
      - opensearch

  celery:
    # ... 配置
    environment:
      POSTGRES_HOST: shared-postgres
      REDIS_URL: redis://local-redis:6379/1
    networks:
      - default

  sites:
    # ... 配置
    networks:
      - default

volumes:
  redis_data:
```

### 5. 更新生产环境配置

同样创建 `infra/production/docker-compose-shared.yml`

---

## 📝 环境变量调整

### 更新 .env.core

```bash
# 数据库配置（使用共享服务）
POSTGRES_HOST=shared-postgres  # 改为共享容器名
POSTGRES_PORT=5432
POSTGRES_DB=news
POSTGRES_USER=news
POSTGRES_PASSWORD=news

# MinIO 配置
MINIO_ENDPOINT=http://shared-minio:9000  # 改为共享容器名
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# ClickHouse 配置
CLICKHOUSE_URL=clickhouse://default:thends@shared-clickhouse:9000/default  # 改为共享容器名
```

---

## 🎯 使用方法

### 完整启动流程

```bash
# 1. 启动共享基础设施
./start-shared-infra.sh

# 2. 启动开发环境（使用新配置）
docker compose -f infra/local/docker-compose-shared.yml up -d

# 3. 或启动生产环境
docker compose -f infra/production/docker-compose-shared.yml up -d
```

### 查看状态

```bash
# 共享服务状态
docker compose -f infra/shared/docker-compose.yml ps

# 开发环境状态
docker compose -f infra/local/docker-compose-shared.yml ps

# 所有容器
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### 停止服务

```bash
# 停止开发环境（但保留共享服务）
docker compose -f infra/local/docker-compose-shared.yml down

# 停止共享服务（会影响所有环境）
docker compose -f infra/shared/docker-compose.yml down
```

---

## 🔍 连接验证

### 从开发环境连接共享服务

```bash
# 进入开发环境的 authoring 容器
docker compose -f infra/local/docker-compose-shared.yml exec authoring bash

# 测试数据库连接
psql -h shared-postgres -U news -d news

# 测试 ClickHouse 连接
curl http://shared-clickhouse:8123/ping

# 测试 MinIO 连接
curl http://shared-minio:9000/minio/health/live
```

---

## ⚠️ 注意事项

### 1. 数据隔离

**问题**: 所有环境共享相同的数据库

**解决方案**: 使用不同的数据库名称

```yaml
# 开发环境
POSTGRES_DB=news_dev

# 生产环境
POSTGRES_DB=news_prod

# 或使用 schema 隔离
```

### 2. 端口冲突

共享服务使用标准端口：
- PostgreSQL: 5432
- MinIO: 9000, 9001
- ClickHouse: 8123, 9000

确保本地没有其他服务占用这些端口。

### 3. 性能考虑

多个环境共享服务可能导致：
- 数据库连接数增加
- I/O 竞争
- 资源争用

**建议**: 为共享服务配置资源限制：

```yaml
services:
  postgres:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          memory: 2G
```

### 4. 网络隔离

虽然共享基础设施，但应用服务之间仍然隔离：
- 开发环境的 authoring 看不到生产环境的 authoring
- 只有基础设施服务是共享的

---

## 🔄 迁移现有数据

### 从独立环境迁移到共享环境

```bash
# 1. 备份现有数据
docker compose -f infra/local/docker-compose.yml exec postgres \
  pg_dump -U news news > migration_backup.sql

# 2. 启动共享基础设施
./start-shared-infra.sh

# 3. 恢复数据到共享服务
docker compose -f infra/shared/docker-compose.yml exec -T postgres \
  psql -U news news < migration_backup.sql

# 4. 验证数据
docker compose -f infra/shared/docker-compose.yml exec postgres \
  psql -U news news -c "SELECT COUNT(*) FROM wagtailcore_page;"
```

---

## 🛠️ 故障排除

### 问题 1: 无法连接到共享服务

**检查**:
```bash
# 1. 确认共享服务运行
docker ps | grep shared

# 2. 检查网络
docker network inspect idp-shared-network

# 3. 测试网络连通性
docker run --rm --network idp-shared-network alpine ping -c 3 shared-postgres
```

### 问题 2: 端口已被占用

```bash
# 查看端口占用
sudo lsof -i :5432
sudo lsof -i :9000

# 停止占用端口的服务或修改共享服务端口
```

### 问题 3: 数据库迁移冲突

**解决**: 使用独立的数据库

```bash
# 在共享 PostgreSQL 中创建独立数据库
docker compose -f infra/shared/docker-compose.yml exec postgres \
  psql -U news -c "CREATE DATABASE news_dev;"

docker compose -f infra/shared/docker-compose.yml exec postgres \
  psql -U news -c "CREATE DATABASE news_prod;"
```

---

## 📊 资源使用对比

### 独立模式

```
开发环境:
  - PostgreSQL: ~200MB
  - MinIO: ~100MB  
  - ClickHouse: ~500MB
  - 总计: ~800MB

生产环境:
  - PostgreSQL: ~200MB
  - MinIO: ~100MB
  - ClickHouse: ~500MB
  - 总计: ~800MB

总资源: ~1600MB
```

### 共享模式

```
共享基础设施:
  - PostgreSQL: ~250MB
  - MinIO: ~120MB
  - ClickHouse: ~550MB
  - 总计: ~920MB

节省: ~680MB (42%)
```

---

## 🎓 最佳实践

### 1. 使用独立数据库

```sql
-- 为每个环境创建独立数据库
CREATE DATABASE news_dev;
CREATE DATABASE news_prod;
CREATE DATABASE news_test;

-- 配置环境变量
# 开发环境
POSTGRES_DB=news_dev

# 生产环境
POSTGRES_DB=news_prod
```

### 2. 定期备份

```bash
# 备份脚本
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)

# 备份所有数据库
docker compose -f infra/shared/docker-compose.yml exec postgres \
  pg_dumpall -U news | gzip > backup_all_${DATE}.sql.gz
```

### 3. 监控资源

```bash
# 监控共享服务
docker stats shared-postgres shared-minio shared-clickhouse
```

---

## 📚 相关文档

- `PRODUCTION_DEPLOYMENT_GUIDE.md` - 生产环境部署
- `PORT_MAPPING_EXPLAINED.md` - 端口映射说明
- `STARTUP_SUCCESS_SUMMARY.md` - 开发环境启动

---

**共享基础设施配置完成！** 🎊

*文档版本: 1.0*
*最后更新: 2025-10-11*

