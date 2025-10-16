# IDP CMS 架构说明

## 📐 架构概览

本系统采用**可扩展的微服务架构**，支持从单节点平滑升级到多节点高可用部署。

## 🏗️ 架构设计

### 两层架构

```
┌─────────────────────────────────────────────────────────────┐
│              共享基础设施层 (Infrastructure)                │
│  docker-compose-ha-infra.yml                                │
│                                                               │
│  - PostgreSQL (172.28.0.10)   - 主数据库                    │
│  - Redis (172.28.0.20)         - 缓存/会话/Celery队列        │
│  - ClickHouse (172.28.0.30)    - 分析数据库                  │
│  - OpenSearch (172.28.0.40)    - 搜索引擎                    │
│  - MinIO (172.28.0.50)         - 对象存储                    │
└─────────────────────────────────────────────────────────────┘
                           ↑
                           │ 所有节点共享
        ┌──────────────────┴──────────────────┐
        │                                     │
┌───────┴──────────┐                ┌────────┴─────────┐
│   应用节点1      │                │   应用节点2      │
│   (Node 1)       │                │   (Node 2)       │
│   172.28.1.x     │                │   172.28.2.x     │
│                  │                │                  │
│  - Django        │                │  - Django        │
│  - Next.js       │                │  - Next.js       │
│  - Celery Worker │                │  - Celery Worker │
│  - Celery Beat   │                │                  │
└──────────────────┘                └──────────────────┘
```

### 网络规划

- **基础设施子网**: `172.28.0.0/24`
  - PostgreSQL: `172.28.0.10`
  - Redis: `172.28.0.20`
  - ClickHouse: `172.28.0.30`
  - OpenSearch: `172.28.0.40`
  - MinIO: `172.28.0.50`

- **节点1子网**: `172.28.1.0/24`
  - Django: `172.28.1.30`
  - Next.js: `172.28.1.40`

- **节点2子网**: `172.28.2.0/24`
  - Django: `172.28.2.30`
  - Next.js: `172.28.2.40`

## 🚀 部署模式

### 模式 1: 单节点部署（当前）

```bash
# 启动基础设施 + 节点1
./deploy-node1-remote.sh
```

**特点**：
- ✅ 所有服务在一台服务器
- ✅ 简单易维护
- ✅ 成本低
- ⚠️ 单点故障

### 模式 2: 双节点高可用（未来扩展）

**步骤 1**: 在节点1部署基础设施
```bash
# 服务器1 (121.40.167.71)
docker-compose -f infra/production/docker-compose-ha-infra.yml up -d
docker-compose -f infra/production/docker-compose-ha-node1.yml up -d
```

**步骤 2**: 在节点2部署应用服务
```bash
# 服务器2 (121.40.167.72)
# 1. rsync 代码到节点2
# 2. 确保可以访问节点1的基础设施网络
docker-compose -f infra/production/docker-compose-ha-node2.yml up -d
```

**步骤 3**: 配置负载均衡
```nginx
upstream backend {
    server 121.40.167.71:8000;
    server 121.40.167.72:8000;
}

upstream frontend {
    server 121.40.167.71:3000;
    server 121.40.167.72:3000;
}
```

**特点**：
- ✅ 高可用（一个节点故障，另一个继续服务）
- ✅ 负载均衡
- ✅ 会话共享（通过 Redis）
- ✅ 数据一致性（共享 PostgreSQL）
- ⚠️ 需要2台服务器
- ⚠️ 基础设施仍是单点（可进一步升级）

## 📊 服务职责

### 基础设施层（有状态）

| 服务 | 作用 | 持久化 | 可否集群 |
|------|------|--------|---------|
| PostgreSQL | 主数据库 | ✅ Volume | ✅ 主从复制 |
| Redis | 缓存/会话/Celery | ✅ Volume | ✅ Sentinel/Cluster |
| ClickHouse | 分析数据 | ✅ Volume | ✅ 分片复制 |
| OpenSearch | 搜索索引 | ✅ Volume | ✅ 集群模式 |
| MinIO | 对象存储 | ✅ Volume | ✅ 分布式模式 |

### 应用层（无状态）

| 服务 | 作用 | 可水平扩展 | 备注 |
|------|------|-----------|------|
| Django | REST API | ✅ | 连接共享DB |
| Next.js | 前端渲染 | ✅ | SSR/SSG |
| Celery Worker | 异步任务 | ✅ | 自动负载均衡 |
| Celery Beat | 定时任务 | ❌ | 仅一个节点运行 |

## 🔒 数据共享机制

### Session 共享
```python
# config/settings/prod.py
SESSION_ENGINE = "django.contrib.sessions.backends.cache"
SESSION_CACHE_ALIAS = "default"
```
→ 所有节点通过 Redis (172.28.0.20) 共享 Session

### 缓存共享
```python
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": "redis://172.28.0.20:6379/0",
    }
}
```

### Celery 队列共享
```python
CELERY_BROKER_URL = "redis://172.28.0.20:6379/1"
CELERY_RESULT_BACKEND = "redis://172.28.0.20:6379/1"
```
→ 所有节点的 Celery Worker 从同一个 Redis 队列拿任务

### 搜索索引共享
```python
OPENSEARCH_URL = "https://172.28.0.40:9200"
```
→ 所有节点读写同一个 OpenSearch 索引

## 📁 文件结构

```
infra/production/
├── docker-compose-ha-infra.yml   # 共享基础设施
├── docker-compose-ha-node1.yml   # 节点1应用服务
├── docker-compose-ha-node2.yml   # 节点2应用服务（未来）
└── configs/
    ├── redis/
    ├── nginx/
    └── postgres/

deploy/scripts/
├── deploy-node1-standalone.sh    # 单节点部署脚本
└── deploy-node2.sh               # 节点2部署脚本（未来）
```

## 🔄 扩展路径

### 当前 → 双节点

1. ✅ **已完成**: 拆分 infra 和 node 配置
2. 准备第二台服务器
3. 配置跨服务器网络（VPN/VPC）
4. 部署 node2
5. 配置负载均衡

### 双节点 → 多节点集群

1. 升级基础设施为集群模式：
   - PostgreSQL 主从复制
   - Redis Sentinel/Cluster
   - OpenSearch 集群
   - ClickHouse 分片
2. 添加更多应用节点（node3, node4...）
3. 配置 Nginx/HAProxy 负载均衡

## ⚙️ 配置文件

### 单节点部署
```bash
.env.node1  # 节点1环境变量
```

### 多节点部署
```bash
.env.core      # 共享核心配置
.env.features  # 功能开关
.env.node1     # 节点1特定配置
.env.node2     # 节点2特定配置
```

## 📝 部署命令

### 单节点完整部署
```bash
./deploy-node1-remote.sh
```

### 分阶段部署

**仅部署基础设施**:
```bash
docker-compose -f infra/production/docker-compose-ha-infra.yml up -d
```

**仅部署应用节点1**:
```bash
docker-compose -f infra/production/docker-compose-ha-node1.yml up -d
```

**重建后端**:
```bash
./deploy-node1-remote.sh --rebuild-backend
```

**重建前端**:
```bash
./deploy-node1-remote.sh --rebuild-frontend
```

**完全重建（无缓存）**:
```bash
./deploy-node1-remote.sh --no-cache
```

## 🎯 设计优势

1. **✅ 无缝扩展**: 添加节点2无需修改基础设施
2. **✅ 数据一致性**: 所有节点共享同一数据源
3. **✅ 会话共享**: 用户不会因切换节点而掉登录
4. **✅ 任务负载均衡**: Celery 自动在节点间分配任务
5. **✅ 搜索一致性**: 所有节点搜索结果相同
6. **✅ 易于维护**: 基础设施和应用分离
7. **✅ 成本友好**: 单节点时资源利用高效

## 📞 运维命令

### 查看所有服务状态
```bash
docker-compose -f infra/production/docker-compose-ha-infra.yml ps
docker-compose -f infra/production/docker-compose-ha-node1.yml ps
```

### 查看日志
```bash
# 基础设施日志
docker-compose -f infra/production/docker-compose-ha-infra.yml logs -f postgres
docker-compose -f infra/production/docker-compose-ha-infra.yml logs -f redis

# 应用日志
docker-compose -f infra/production/docker-compose-ha-node1.yml logs -f authoring
docker-compose -f infra/production/docker-compose-ha-node1.yml logs -f frontend
```

### 重启服务
```bash
# 重启某个基础设施服务
docker-compose -f infra/production/docker-compose-ha-infra.yml restart postgres

# 重启某个应用服务
docker-compose -f infra/production/docker-compose-ha-node1.yml restart authoring
```

### 备份数据
```bash
# PostgreSQL 备份
docker exec ha-postgres pg_dump -U news news_ha > backup.sql

# Redis 备份
docker exec ha-redis redis-cli --rdb /data/dump.rdb

# ClickHouse 备份
docker exec ha-clickhouse clickhouse-client --query "BACKUP DATABASE analytics"
```

---

**更新时间**: 2025-10-16  
**版本**: 1.0  
**维护者**: IDP CMS Team

