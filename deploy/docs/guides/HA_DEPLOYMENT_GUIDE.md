# 🚀 高可用双服务器部署指南

## 📋 目录

1. [架构概述](#架构概述)
2. [服务器要求](#服务器要求)
3. [部署前准备](#部署前准备)
4. [部署步骤](#部署步骤)
5. [验证和测试](#验证和测试)
6. [故障处理](#故障处理)
7. [运维指南](#运维指南)

---

## 架构概述

### 高可用架构图

```
                          ┌─────────────┐
                          │   用户请求   │
                          └──────┬──────┘
                                 │
                    ┌────────────▼────────────┐
                    │  Nginx 负载均衡器        │
                    │  (服务器1或独立服务器)   │
                    └────┬──────────────┬─────┘
                         │              │
            ┌────────────▼──┐      ┌───▼────────────┐
            │   服务器 1     │      │   服务器 2      │
            │  (主应用节点)   │      │  (从应用节点)   │
            ├───────────────┤      ├────────────────┤
            │ Django (8000) │      │ Django (8000)  │
            │ Next.js (3000)│      │ Next.js (3000) │
            │ Redis (主)    │      │ Redis (从)     │
            │ OpenSearch    │      │ OpenSearch     │
            └───────┬───────┘      └────────┬───────┘
                    │                       │
                    └───────┬───────────────┘
                            │
              ┌─────────────▼─────────────┐
              │    共享基础设施层          │
              ├──────────────────────────┤
              │ PostgreSQL 主从复制       │
              │ MinIO 对象存储 (分布式)   │
              │ ClickHouse (分析数据库)   │
              └──────────────────────────┘
```

### 核心特性

✅ **应用层高可用**: 双节点负载均衡，自动故障转移  
✅ **数据层高可用**: PostgreSQL 主从复制，实时数据同步  
✅ **缓存层高可用**: Redis Sentinel 自动故障转移  
✅ **存储层高可用**: MinIO 分布式对象存储  
✅ **会话共享**: Redis 集群共享用户会话  
✅ **自动恢复**: 故障节点恢复后自动加入集群  

---

## 服务器要求

### 硬件配置（每台服务器）

| 组件 | 最低配置 | 推荐配置 | 说明 |
|------|---------|---------|------|
| **CPU** | 4核 | 8核 | 支持虚拟化 |
| **内存** | 8GB | 16GB | ECC内存更佳 |
| **系统盘** | 100GB SSD | 200GB SSD | NVMe更佳 |
| **数据盘** | 500GB | 1TB | 用于数据库和存储 |
| **网卡** | 1Gbps | 10Gbps | 低延迟内网 |

### 软件要求

| 软件 | 版本要求 | 安装方式 |
|------|---------|---------|
| **操作系统** | Ubuntu 22.04 LTS | - |
| **Docker** | 24.0+ | `curl -fsSL https://get.docker.com \| sh` |
| **Docker Compose** | 2.20+ | Docker Desktop 自带 |
| **Python** | 3.11+ | 系统自带 |
| **Git** | 2.34+ | `apt install git` |

### 网络要求

#### 服务器间通信端口

| 端口 | 协议 | 用途 | 方向 |
|------|------|------|------|
| 5432 | TCP | PostgreSQL 主从复制 | 双向 |
| 6379 | TCP | Redis 主从复制 | 双向 |
| 26379 | TCP | Redis Sentinel | 双向 |
| 9000 | TCP | MinIO 分布式存储 | 双向 |
| 22 | TCP | SSH 管理 | 双向 |

#### 对外服务端口

| 端口 | 协议 | 用途 | 安全级别 |
|------|------|------|---------|
| 80 | TCP | HTTP | 公网开放 |
| 443 | TCP | HTTPS | 公网开放 |
| 8000 | TCP | Django API | 内网/VPN |
| 3000 | TCP | Next.js | 内网/VPN |

---

## 部署前准备

### 1. 配置服务器基础环境

#### 1.1 两台服务器都执行

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装必要工具
sudo apt install -y curl git vim htop net-tools

# 安装 Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# 安装 Docker Compose
sudo apt install -y docker-compose-plugin

# 验证安装
docker --version
docker compose version
```

#### 1.2 配置主机名

```bash
# 服务器1
sudo hostnamectl set-hostname idp-node1

# 服务器2
sudo hostnamectl set-hostname idp-node2
```

#### 1.3 配置 hosts 文件（两台服务器都执行）

```bash
sudo tee -a /etc/hosts << EOF
192.168.1.10    idp-node1    node1
192.168.1.11    idp-node2    node2
EOF
```

### 2. 配置网络和防火墙

#### 2.1 配置防火墙规则

```bash
# 服务器1
sudo ufw allow 22/tcp       # SSH
sudo ufw allow 80/tcp       # HTTP
sudo ufw allow 443/tcp      # HTTPS
sudo ufw allow from 192.168.1.11 to any port 5432  # PostgreSQL from node2
sudo ufw allow from 192.168.1.11 to any port 6379  # Redis from node2
sudo ufw allow from 192.168.1.11 to any port 26379 # Sentinel from node2
sudo ufw allow from 192.168.1.11 to any port 9000  # MinIO from node2
sudo ufw enable

# 服务器2（类似配置）
sudo ufw allow 22/tcp
sudo ufw allow from 192.168.1.10 to any port 5432
sudo ufw allow from 192.168.1.10 to any port 6379
sudo ufw allow from 192.168.1.10 to any port 26379
sudo ufw allow from 192.168.1.10 to any port 9000
sudo ufw enable
```

#### 2.2 测试网络连通性

```bash
# 从服务器1测试
ping -c 3 192.168.1.11
telnet 192.168.1.11 22

# 从服务器2测试
ping -c 3 192.168.1.10
telnet 192.168.1.10 22
```

### 3. 配置 SSH 密钥认证

#### 3.1 生成 SSH 密钥（服务器1）

```bash
ssh-keygen -t rsa -b 4096 -C "idp-ha-deploy"
```

#### 3.2 复制公钥到服务器2

```bash
ssh-copy-id root@192.168.1.11
```

#### 3.3 测试免密登录

```bash
ssh root@192.168.1.11 "echo 'SSH OK'"
```

### 4. 克隆代码

#### 4.1 两台服务器都执行

```bash
# 克隆代码到标准路径
sudo mkdir -p /opt
cd /opt
sudo git clone https://your-repo.git idp-cms
sudo chown -R $USER:$USER /opt/idp-cms
cd /opt/idp-cms
```

### 5. 配置环境变量

#### 5.1 服务器1配置

```bash
cd /opt/idp-cms
cp .env.production.ha.example .env.node1

# 编辑配置（修改以下关键项）
nano .env.node1
```

**关键配置项（服务器1）:**
```bash
NODE_NAME=node1
NODE_ROLE=primary
SERVER1_IP=192.168.1.10
SERVER2_IP=192.168.1.11

# 修改所有密码为强密码
POSTGRES_PASSWORD=你的强密码
REDIS_PASSWORD=你的强密码
MINIO_SECRET_KEY=你的强密码
DJANGO_SECRET_KEY=你的强密钥
# ... 其他密码

# 修改域名
DJANGO_ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CMS_PUBLIC_URL=https://yourdomain.com
FRONTEND_PUBLIC_URL=https://yourdomain.com
```

#### 5.2 服务器2配置

```bash
# 方式1: 从服务器1同步（推荐）
scp root@192.168.1.10:/opt/idp-cms/.env.node1 /opt/idp-cms/.env.node2

# 编辑节点特定配置
nano /opt/idp-cms/.env.node2
```

**修改以下配置:**
```bash
NODE_NAME=node2
NODE_ROLE=replica
REDIS_HOST=redis-replica  # 改为从节点
```

---

## 部署步骤

### Phase 1: 部署共享基础设施（服务器1）

#### 步骤 1.1: 创建 Docker 网络

```bash
cd /opt/idp-cms
docker network create idp-ha-network \
    --driver bridge \
    --subnet 172.28.0.0/16 \
    --gateway 172.28.0.1
```

#### 步骤 1.2: 启动共享基础设施

```bash
# 使用自动化脚本
./deploy/scripts/deploy-ha-infrastructure.sh

# 或手动执行
docker compose -f infra/shared/docker-compose-ha.yml up -d
```

#### 步骤 1.3: 验证基础设施

```bash
# 检查服务状态
docker compose -f infra/shared/docker-compose-ha.yml ps

# 检查 PostgreSQL
docker exec ha-postgres-master pg_isready -U news

# 检查 MinIO
docker exec ha-minio1 mc admin info local

# 检查 ClickHouse
docker exec ha-clickhouse clickhouse-client --query "SELECT 1"
```

#### 步骤 1.4: 初始化 PostgreSQL 复制

```bash
# 创建复制用户
docker exec ha-postgres-master psql -U news -d news_ha -c \
    "CREATE USER replication WITH REPLICATION PASSWORD '你的复制密码';"

# 创建复制槽
docker exec ha-postgres-master psql -U news -d news_ha -c \
    "SELECT * FROM pg_create_physical_replication_slot('replica1_slot');"

# 验证复制配置
docker exec ha-postgres-master psql -U news -d news_ha -c \
    "SELECT * FROM pg_replication_slots;"
```

### Phase 2: 部署服务器1应用（主节点）

#### 步骤 2.1: 启动应用服务

```bash
cd /opt/idp-cms

# 使用自动化脚本
./deploy/scripts/deploy-ha-node1.sh

# 或手动执行
docker compose -f infra/production/docker-compose-ha-node1.yml up -d --build
```

#### 步骤 2.2: 初始化数据库

```bash
# 运行迁移
docker exec node1-authoring python manage.py migrate

# 收集静态文件
docker exec node1-authoring python manage.py collectstatic --noinput

# 创建超级用户
docker exec -it node1-authoring python manage.py createsuperuser

# 创建站点
docker exec node1-authoring python manage.py bootstrap_sites \
    --portal-domain=yourdomain.com \
    --a-domain=a.yourdomain.com \
    --b-domain=b.yourdomain.com
```

#### 步骤 2.3: 初始化 OpenSearch

```bash
# 创建索引
docker exec node1-authoring python manage.py search_index --rebuild -f
```

#### 步骤 2.4: 验证服务器1

```bash
# 健康检查
curl http://localhost:8000/health/readiness/
curl http://localhost:3000/api/health

# 访问 Admin
curl -I http://localhost:8000/admin/

# 检查日志
docker compose -f infra/production/docker-compose-ha-node1.yml logs -f --tail=50
```

### Phase 3: 部署服务器2应用（从节点）

#### 步骤 3.1: 同步代码到服务器2

```bash
# 在服务器1执行
cd /opt/idp-cms
./deploy/scripts/sync-code.sh 192.168.1.11
```

#### 步骤 3.2: 初始化 PostgreSQL 从库（服务器2）

```bash
# 在服务器2执行
cd /opt/idp-cms

# 方式1: 使用自动化脚本
./deploy/scripts/deploy-ha-node2.sh --init-replica

# 方式2: 手动初始化
docker volume create ha-postgres-replica-data

docker run --rm \
    --network host \
    -v ha-postgres-replica-data:/var/lib/postgresql/data \
    -e PGPASSWORD=你的复制密码 \
    postgres:15-alpine \
    pg_basebackup \
        -h 192.168.1.10 \
        -U replication \
        -D /var/lib/postgresql/data \
        -Fp -Xs -P -R
```

#### 步骤 3.3: 启动服务器2应用

```bash
# 在服务器2执行
docker compose -f infra/production/docker-compose-ha-node2.yml up -d --build
```

#### 步骤 3.4: 验证服务器2

```bash
# 健康检查
curl http://localhost:8000/health/readiness/
curl http://localhost:3000/api/health

# 检查 PostgreSQL 复制
docker exec ha-postgres-replica psql -U news -d news_ha -c \
    "SELECT now() - pg_last_xact_replay_timestamp() AS replication_lag;"

# 检查 Redis 复制
docker exec node2-redis-replica redis-cli -a 你的密码 info replication

# 检查 Sentinel
docker exec node2-redis-sentinel-2 redis-cli -p 26379 sentinel masters
```

### Phase 4: 配置负载均衡器

#### 步骤 4.1: 安装 Nginx（服务器1或独立服务器）

```bash
sudo apt update
sudo apt install -y nginx
```

#### 步骤 4.2: 配置负载均衡

```bash
# 复制配置文件
sudo cp /opt/idp-cms/infra/configs/nginx/lb-ha.conf \
    /etc/nginx/sites-available/idp-cms-ha

# 修改配置（替换IP和域名）
sudo sed -i 's/SERVER1_IP/192.168.1.10/g' /etc/nginx/sites-available/idp-cms-ha
sudo sed -i 's/SERVER2_IP/192.168.1.11/g' /etc/nginx/sites-available/idp-cms-ha
sudo sed -i 's/YOUR_DOMAIN.COM/yourdomain.com/g' /etc/nginx/sites-available/idp-cms-ha

# 启用配置
sudo ln -s /etc/nginx/sites-available/idp-cms-ha /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

#### 步骤 4.3: 配置 SSL 证书

```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 申请证书
sudo certbot --nginx \
    -d yourdomain.com \
    -d www.yourdomain.com \
    --non-interactive \
    --agree-tos \
    --email admin@yourdomain.com

# 验证自动续期
sudo certbot renew --dry-run
```

---

## 验证和测试

### 1. 功能测试

```bash
# 访问前端
curl -I https://yourdomain.com

# 访问 API
curl https://yourdomain.com/api/feed?size=5

# 访问 Admin
curl -I https://yourdomain.com/admin/
```

### 2. 高可用测试

#### 测试 1: PostgreSQL 主从复制

```bash
# 在主库创建测试数据
docker exec ha-postgres-master psql -U news -d news_ha -c \
    "CREATE TABLE ha_test (id serial, data text, created_at timestamp default now());"

docker exec ha-postgres-master psql -U news -d news_ha -c \
    "INSERT INTO ha_test (data) VALUES ('test from master');"

# 在从库验证数据
docker exec ha-postgres-replica psql -U news -d news_ha -c \
    "SELECT * FROM ha_test;"

# 清理
docker exec ha-postgres-master psql -U news -d news_ha -c \
    "DROP TABLE ha_test;"
```

#### 测试 2: Redis 主从同步

```bash
# 在主节点写入
docker exec node1-redis-master redis-cli -a 你的密码 \
    SET ha_test "test from master"

# 在从节点读取
docker exec node2-redis-replica redis-cli -a 你的密码 \
    GET ha_test
```

#### 测试 3: 负载均衡

```bash
# 多次请求，观察负载分配
for i in {1..10}; do
    curl -I https://yourdomain.com | grep -i server
done
```

#### 测试 4: 故障转移

```bash
# 停止节点1的应用
docker compose -f infra/production/docker-compose-ha-node1.yml stop authoring

# 测试服务是否仍然可用
curl https://yourdomain.com/api/feed?size=5

# 恢复节点1
docker compose -f infra/production/docker-compose-ha-node1.yml start authoring
```

### 3. 性能测试

```bash
# 安装压测工具
sudo apt install -y apache2-utils

# 压力测试
ab -n 1000 -c 10 https://yourdomain.com/

# 查看响应时间
ab -n 100 -c 10 -g results.tsv https://yourdomain.com/api/feed?size=5
```

---

## 故障处理

### 常见问题

#### 问题 1: PostgreSQL 从库复制延迟

**症状**: 复制延迟超过60秒

**排查**:
```bash
# 检查复制状态
docker exec ha-postgres-replica psql -U news -d news_ha -c \
    "SELECT now() - pg_last_xact_replay_timestamp() AS lag;"

# 检查网络延迟
ping -c 10 192.168.1.10

# 检查磁盘IO
iostat -x 1
```

**解决**:
- 检查网络带宽
- 优化磁盘IO
- 调整 WAL 配置

#### 问题 2: Redis Sentinel 无法故障转移

**症状**: Sentinel 检测到主节点故障但未执行故障转移

**排查**:
```bash
# 检查 Sentinel 配置
docker exec ha-redis-sentinel-1 redis-cli -p 26379 \
    sentinel master mymaster

# 检查 quorum
docker exec ha-redis-sentinel-1 redis-cli -p 26379 \
    sentinel ckquorum mymaster
```

**解决**:
- 确保至少2个 Sentinel 在线
- 检查 quorum 配置
- 验证网络连通性

#### 问题 3: 会话丢失

**症状**: 用户频繁掉线

**排查**:
```bash
# 检查 Redis 连接
docker exec node1-authoring python manage.py shell -c \
    "from django.core.cache import cache; print(cache.get('test'))"

# 检查 Nginx sticky session
grep -r "ip_hash" /etc/nginx/sites-enabled/
```

**解决**:
- 确认 Redis 配置正确
- 验证会话存储在 Redis
- 配置 Nginx sticky session

---

## 运维指南

### 日常维护

#### 每日检查

```bash
# 运行健康检查
/opt/idp-cms/deploy/scripts/health-check-ha.sh

# 检查磁盘空间
df -h

# 检查日志错误
docker compose -f infra/production/docker-compose-ha-node1.yml logs --tail=100 | grep -i error
```

#### 每周检查

```bash
# 数据库备份
docker exec ha-postgres-master pg_dump -U news news_ha | \
    gzip > /backup/postgres-$(date +%Y%m%d).sql.gz

# 检查备份
ls -lh /backup/

# 清理旧日志
find /opt/idp-cms/logs -name "*.log" -mtime +30 -delete
```

#### 每月检查

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 更新 Docker 镜像
docker compose -f infra/production/docker-compose-ha-node1.yml pull
docker compose -f infra/production/docker-compose-ha-node1.yml up -d

# 故障演练
/opt/idp-cms/deploy/scripts/failover.sh status
```

### 监控配置

#### 设置 Cron 监控

```bash
# 编辑 crontab
crontab -e

# 添加监控任务
*/5 * * * * /opt/idp-cms/deploy/scripts/monitor-ha.sh --alert >> /var/log/idp-ha-monitor.log 2>&1
0 2 * * * /opt/idp-cms/deploy/scripts/backup.sh >> /var/log/idp-ha-backup.log 2>&1
```

### 扩容指南

#### 增加应用节点

1. 准备新服务器
2. 安装 Docker 和依赖
3. 同步代码和配置
4. 启动应用服务
5. 更新负载均衡器配置

#### 数据库扩容

1. 添加新的从库节点
2. 配置复制连接
3. 执行 pg_basebackup
4. 启动从库服务
5. 验证复制状态

---

## 附录

### A. 端口清单

| 服务 | 端口 | 说明 |
|------|------|------|
| PostgreSQL | 5432 | 数据库 |
| Redis | 6379 | 缓存 |
| Redis Sentinel | 26379 | 故障转移 |
| MinIO | 9000 | 对象存储 API |
| MinIO Console | 9001 | 管理界面 |
| ClickHouse HTTP | 8123 | 分析查询 |
| ClickHouse Native | 9000 | 原生协议 |
| OpenSearch | 9200 | 搜索引擎 |
| Django | 8000 | 后端 API |
| Next.js | 3000 | 前端 |
| Nginx | 80/443 | 负载均衡 |

### B. 命令速查

```bash
# 健康检查
./deploy/scripts/health-check-ha.sh

# 故障转移
./deploy/scripts/failover.sh [postgres|redis]

# 代码同步
./deploy/scripts/sync-code.sh SERVER2_IP

# 查看日志
docker compose -f infra/production/docker-compose-ha-node1.yml logs -f

# 重启服务
docker compose -f infra/production/docker-compose-ha-node1.yml restart authoring
```

### C. 故障联系方式

- **技术支持**: tech-support@yourdomain.com
- **紧急联系**: +86 138-xxxx-xxxx
- **值班群**: 企业微信/钉钉

---

**文档版本**: v1.0  
**最后更新**: 2025-10-15  
**维护团队**: DevOps Team

