# IDP CMS 服务版本规范

## 🔒 版本锁定策略

**原则**: 开发环境和生产环境使用完全相同的服务版本，避免"在我机器上能跑"的问题。

**版本来源**: 以开发环境（`infra/local/`）实际运行的版本为准。

---

## 📦 当前锁定版本

| 服务 | 版本 | Docker 镜像 | 更新日期 |
|------|------|-------------|---------|
| **PostgreSQL** | 17.6 | `postgres:17` | 2025-10-16 |
| **Redis** | 7.4.5 | `redis:7` | 2025-10-16 |
| **ClickHouse** | 24.3.18 | `clickhouse/clickhouse-server:24.3` | 2025-10-16 |
| **OpenSearch** | 3.2.0 | `opensearchproject/opensearch:3.2.0` | 2025-10-16 |
| **OpenSearch Dashboards** | 3.0.0 | `opensearchproject/opensearch-dashboards:3.0.0` | 2025-10-16 |
| **MinIO** | 2025-07-23 | `minio/minio:RELEASE.2025-07-23T15-54-02Z` | 2025-10-16 |
| **MinIO Client** | 2025-07-21 | `minio/mc:RELEASE.2025-07-21T05-28-08Z` | 2025-10-16 |

---

## 📋 环境配置文件

### 开发环境
- 文件: `infra/local/docker-compose.yml`
- 用途: 本地开发、测试

### 生产环境
- 文件: `infra/production/docker-compose-ha-infra.yml`
- 用途: 生产部署的基础设施层

---

## 🔄 版本升级流程

### 1. 在开发环境测试新版本
```bash
# 1. 修改 infra/local/docker-compose.yml
vim infra/local/docker-compose.yml

# 2. 重建容器
cd infra/local
docker-compose down
docker-compose up -d

# 3. 测试所有功能
# - 数据迁移是否正常
# - API 是否兼容
# - 搜索功能是否正常
# - 分析功能是否正常
```

### 2. 更新版本文档
```bash
# 更新本文档的版本表格
vim SERVICE_VERSIONS.md
```

### 3. 同步到生产环境配置
```bash
# 更新生产环境配置文件
vim infra/production/docker-compose-ha-infra.yml

# 更新版本号，确保与开发环境一致
```

### 4. 部署到生产环境
```bash
# 在生产服务器上
./deploy-node1-remote.sh --no-cache
```

---

## ⚠️ 重要说明

### PostgreSQL 17 vs 16
- **开发环境**: PostgreSQL 17.6
- **理由**: 使用最新稳定版，享受性能改进和新特性
- **兼容性**: PostgreSQL 17 向后兼容 16，数据迁移路径清晰

### ClickHouse 24.3 vs 23.8
- **开发环境**: ClickHouse 24.3.18
- **理由**: 开发环境已验证稳定
- **注意**: 24.x 有 breaking changes，升级前需测试查询兼容性

### OpenSearch 3.2.0 vs 2.11.0
- **开发环境**: OpenSearch 3.2.0
- **理由**: 最新版本，性能和功能更强
- **兼容性**: 3.x API 与 2.x 大部分兼容，索引结构可平滑升级

### Redis 7.4.5
- **稳定性**: Redis 7.x 系列非常稳定
- **特性**: 支持 Redis Functions、ACL 改进等
- **兼容性**: 与 Redis 6.x 完全兼容

---

## 🛠️ 版本验证命令

### 检查开发环境实际版本
```bash
# PostgreSQL
docker exec local-postgres-1 postgres --version

# Redis
docker exec local-redis-1 redis-server --version

# ClickHouse
docker exec local-clickhouse-1 clickhouse-server --version

# OpenSearch
curl -s http://localhost:9200 | grep number

# MinIO
docker exec local-minio-1 minio --version
```

### 检查生产环境版本
```bash
# SSH 到生产服务器后
docker exec ha-postgres postgres --version
docker exec ha-redis redis-server --version
docker exec ha-clickhouse clickhouse-server --version
curl -s http://172.28.0.40:9200 | grep number
docker exec ha-minio minio --version
```

---

## 📝 变更历史

| 日期 | 服务 | 旧版本 → 新版本 | 原因 |
|------|------|---------------|------|
| 2025-10-16 | PostgreSQL | latest → 17 | 锁定版本，避免意外升级 |
| 2025-10-16 | ClickHouse | 动态 → 24.3 | 锁定开发环境实际版本 |
| 2025-10-16 | OpenSearch | 动态 → 3.2.0 | 锁定开发环境实际版本 |
| 2025-10-16 | MinIO | latest → 2025-07-23 | 锁定版本，确保稳定性 |

---

## 🎯 版本选择原则

1. **稳定性优先**: 选择 LTS 或稳定分支
2. **开发优先**: 以开发环境实际运行版本为准
3. **向后兼容**: 升级不能破坏现有数据和API
4. **同步更新**: 开发和生产必须使用相同版本
5. **定期审查**: 每季度评估是否需要升级

---

**维护者**: IDP CMS DevOps Team  
**最后更新**: 2025-10-16  
**下次审查**: 2026-01-16

