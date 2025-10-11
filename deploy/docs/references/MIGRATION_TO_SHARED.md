# 🔄 从独立模式迁移到共享基础设施模式

## 📋 迁移步骤指南

### 当前状态

您现在运行的是**独立模式**，有以下容器：

```
✅ 运行中的容器（独立模式）:
├── local-postgres-1        ← 将被共享
├── local-minio-1           ← 将被共享
├── local-clickhouse-1      ← 将被共享
├── local-redis-1           ← 保持独立
├── local-opensearch-1      ← 保持独立
├── local-authoring-1       ← 应用服务
├── local-sites-1           ← 应用服务
├── local-celery-1          ← 应用服务
├── local-celery-beat-1     ← 应用服务
└── local-os-dashboards-1   ← 工具
```

### 目标状态

切换到**共享模式**后：

```
共享基础设施:
├── shared-postgres    ← 新的共享容器
├── shared-minio       ← 新的共享容器
└── shared-clickhouse  ← 新的共享容器

开发环境:
├── local-redis
├── local-opensearch
├── local-authoring
├── local-sites
├── local-celery
└── local-celery-beat
```

---

## ⚠️ 重要说明

### 是否需要备份数据？

**建议备份**（可选，如果有重要数据）

- ✅ PostgreSQL 数据库
- ✅ MinIO 对象存储
- ❌ ClickHouse（如果是测试数据可不备份）

### 是否会丢失数据？

**不会自动删除**，但为了安全，建议先备份：

- 停止容器 ≠ 删除数据
- 数据保存在 Docker volumes 中
- 只要不执行 `docker compose down -v`，数据就还在

---

## 🚀 迁移步骤

### 步骤 1: 备份数据（推荐）

```bash
cd /opt/idp-cms

# 创建备份目录
mkdir -p backups

# 备份 PostgreSQL
echo "📦 备份数据库..."
docker compose -f infra/local/docker-compose.yml exec postgres \
  pg_dump -U news news | gzip > backups/postgres_backup_$(date +%Y%m%d_%H%M%S).sql.gz

# 备份 MinIO（可选）
echo "📦 备份对象存储..."
docker compose -f infra/local/docker-compose.yml exec minio \
  sh -c "cd /data && tar czf - ." > backups/minio_backup_$(date +%Y%m%d_%H%M%S).tar.gz

echo "✅ 备份完成！"
ls -lh backups/
```

### 步骤 2: 停止独立模式容器

```bash
cd /opt/idp-cms

# 停止所有服务（但保留数据卷）
echo "🛑 停止独立模式容器..."
docker compose -f infra/local/docker-compose.yml down

# 查看状态（应该没有容器在运行）
docker ps | grep local
```

### 步骤 3: 启动共享基础设施

```bash
# 启动共享服务
echo "🏗️  启动共享基础设施..."
./start-shared-infra.sh
```

### 步骤 4: 恢复数据到共享服务（可选）

```bash
# 如果需要恢复之前备份的数据
echo "📥 恢复数据到共享服务..."

# 恢复数据库
gunzip -c backups/postgres_backup_*.sql.gz | \
  docker compose -f infra/shared/docker-compose.yml exec -T postgres \
  psql -U news news

echo "✅ 数据恢复完成！"
```

### 步骤 5: 启动开发环境（共享模式）

```bash
# 启动开发环境
echo "🚀 启动开发环境（共享模式）..."
./start-dev-shared.sh
```

### 步骤 6: 验证服务

```bash
# 查看所有容器
echo "📊 当前运行的容器："
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# 应该看到：
# shared-postgres, shared-minio, shared-clickhouse
# local-redis, local-opensearch, local-authoring, local-sites...
```

### 步骤 7: 访问测试

```bash
# 测试前端
curl http://localhost:3001/

# 测试后端
curl http://localhost:8000/health/readiness/

# 测试管理后台
open http://localhost:8000/admin/
```

---

## 🎯 快速迁移（一键脚本）

如果不需要备份数据，可以使用这个快速脚本：

```bash
cd /opt/idp-cms

# 一键切换
echo "🔄 切换到共享模式..."
docker compose -f infra/local/docker-compose.yml down && \
./start-shared-infra.sh && \
sleep 10 && \
./start-dev-shared.sh

echo "✅ 切换完成！"
```

---

## 📊 资源对比

### 迁移前（独立模式）

```
容器数量: 10-11 个
内存占用: ~2050MB
端口占用: 
  - PostgreSQL: 5438
  - MinIO: 9002, 9001
  - ClickHouse: 8123
  - 其他...
```

### 迁移后（共享模式）

```
容器数量: 8-9 个（减少 2-3 个）
内存占用: ~1720MB（节省 ~330MB）
端口占用:
  - PostgreSQL: 5432（共享）
  - MinIO: 9000, 9001（共享）
  - ClickHouse: 8123（共享）
  - 其他...
```

---

## ⚠️ 注意事项

### 1. 端口变化

| 服务 | 独立模式 | 共享模式 |
|------|---------|---------|
| PostgreSQL | 5438 | 5432 |
| MinIO API | 9002 | 9000 |
| MinIO Console | 9001 | 9001 |

### 2. 容器名称变化

| 服务 | 独立模式 | 共享模式 |
|------|---------|---------|
| PostgreSQL | local-postgres-1 | shared-postgres |
| MinIO | local-minio-1 | shared-minio |
| ClickHouse | local-clickhouse-1 | shared-clickhouse |

### 3. 数据库连接

应用服务会自动连接到共享服务：

```yaml
# docker-compose-shared.yml 中已配置
environment:
  POSTGRES_HOST: shared-postgres  # 自动连接共享
  MINIO_ENDPOINT: http://shared-minio:9000
  CLICKHOUSE_URL: clickhouse://...@shared-clickhouse:9000/default
```

---

## 🔙 回滚到独立模式

如果需要回到独立模式：

```bash
cd /opt/idp-cms

# 1. 停止共享模式
docker compose -f infra/local/docker-compose-shared.yml down
docker compose -f infra/shared/docker-compose.yml down

# 2. 重新启动独立模式
./start.sh

# 3. 恢复数据（如果需要）
gunzip -c backups/postgres_backup_*.sql.gz | \
  docker compose -f infra/local/docker-compose.yml exec -T postgres \
  psql -U news news
```

---

## 🛠️ 故障排查

### 问题 1: 端口被占用

```bash
# 检查端口占用
sudo lsof -i :5432
sudo lsof -i :9000

# 解决：停止旧容器
docker compose -f infra/local/docker-compose.yml down
```

### 问题 2: 无法连接共享服务

```bash
# 检查共享服务是否运行
docker ps | grep shared

# 检查网络
docker network inspect idp-shared-network

# 重启共享服务
docker compose -f infra/shared/docker-compose.yml restart
```

### 问题 3: 数据丢失

```bash
# 查看旧的数据卷
docker volume ls | grep local

# 数据还在，可以手动恢复
docker run --rm -v local_pgdata:/data busybox ls -la /data
```

---

## ✅ 迁移检查清单

完成迁移后，检查以下项目：

- [ ] 共享基础设施正常运行（shared-postgres, shared-minio, shared-clickhouse）
- [ ] 开发环境应用服务正常运行
- [ ] 前端可访问（http://localhost:3001）
- [ ] 后端可访问（http://localhost:8000）
- [ ] 管理后台可登录（http://localhost:8000/admin）
- [ ] 数据库数据完整
- [ ] 文件上传功能正常（MinIO）
- [ ] 搜索功能正常（OpenSearch）

---

## 📚 相关文档

- `QUICK_START_SHARED.md` - 共享模式快速开始
- `SHARED_INFRASTRUCTURE_GUIDE.md` - 详细指南
- `start-shared-infra.sh` - 启动共享基础设施
- `start-dev-shared.sh` - 启动开发环境（共享）

---

**准备好开始迁移了吗？** 🚀

建议按照上述步骤逐步进行，确保数据安全！

