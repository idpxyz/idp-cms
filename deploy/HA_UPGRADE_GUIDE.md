# HA 升级指南 - 从单节点到双节点高可用

> 平滑升级，最小化停机时间，5-15分钟完成高可用架构部署

## 📋 升级概述

### 升级前后对比

| 项目 | 单节点模式 | 双节点 HA 模式 |
|------|-----------|---------------|
| **服务器数量** | 1台 | 2台 |
| **可用性** | 单点故障 | 高可用，自动故障转移 |
| **性能** | 单节点负载 | 负载均衡，性能翻倍 |
| **数据库** | 单机 PostgreSQL | 主从复制 |
| **缓存** | 单机 Redis | Sentinel 高可用 |
| **存储** | 单节点 MinIO | 分布式对象存储 |
| **停机时间** | 维护需停机 | 零停机维护 |
| **成本** | ¥XXX/月 | ¥XXX×2/月 |

### 升级架构图

**升级前（单节点）**：
```
     用户
      │
      ▼
 ┌──────────┐
 │ 服务器1   │
 │ 所有服务  │
 └──────────┘
```

**升级后（双节点 HA）**：
```
        用户
         │
         ▼
    ┌─────────┐
    │ 负载均衡 │
    └────┬────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│服务器1  │ │服务器2  │
│(主节点) │ │(从节点) │
└────┬───┘ └───┬────┘
     │         │
     └────┬────┘
          │
    ┌─────▼─────┐
    │ 主从复制   │
    │ 数据同步   │
    └───────────┘
```

## ⚡ 快速升级流程

### 前置条件检查

在开始升级前，请确保：

- ✅ 已完整备份所有数据
- ✅ 第二台服务器已准备好（121.41.73.49）
- ✅ 两台服务器网络互通
- ✅ 配置了 SSH 免密登录
- ✅ 业务处于低峰期
- ✅ 准备好 .env.node2 配置文件

### 一键升级

```bash
# 确保在服务器1执行
cd /opt/idp-cms

# 执行升级脚本
chmod +x deploy/scripts/upgrade-to-ha.sh
./deploy/scripts/upgrade-to-ha.sh
```

脚本会自动完成 95% 的工作！

## 🔧 详细升级步骤

### 步骤 1: 准备第二台服务器

**1.1 安装 Docker**：

```bash
# 在服务器2 (121.41.73.49) 执行
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

**1.2 配置 SSH 免密登录**：

```bash
# 在服务器1生成密钥（如果没有）
ssh-keygen -t ed25519

# 复制公钥到服务器2
ssh-copy-id root@121.41.73.49

# 测试免密登录
ssh root@121.41.73.49 "echo 'SSH连接成功'"
```

**1.3 网络互通测试**：

```bash
# 在服务器1测试到服务器2
ping -c 3 121.41.73.49

# 在服务器2测试到服务器1
ssh root@121.41.73.49 "ping -c 3 121.40.167.71"
```

### 步骤 2: 数据备份

**2.1 备份 PostgreSQL**：

```bash
# 在服务器1执行
mkdir -p /opt/idp-cms/backups

# 完整备份
docker exec $(docker ps -qf "name=postgres") pg_dumpall -U postgres > \
    /opt/idp-cms/backups/upgrade_backup_$(date +%Y%m%d_%H%M%S).sql
```

**2.2 备份配置文件**：

```bash
# 备份环境变量和配置
tar -czf /opt/idp-cms/backups/config_backup_$(date +%Y%m%d).tar.gz \
    .env.node1 \
    infra/production/ \
    infra/configs/
```

**2.3 备份 MinIO 数据**（可选，如有重要文件）：

```bash
# 复制 MinIO 数据到备份位置
cp -r /opt/idp-cms/data/minio /opt/idp-cms/backups/minio_backup
```

### 步骤 3: 准备节点2环境变量

**3.1 创建 .env.node2**：

```bash
# 在服务器1执行
cp .env.node2.production .env.node2

# 编辑配置（主要修改IP地址）
vim .env.node2
```

**3.2 关键配置项**：

```bash
# 节点信息
NODE_IP=121.41.73.49
NODE_ROLE=replica

# 数据库配置（指向主库）
POSTGRES_HOST=121.40.167.71
POSTGRES_PORT=5432

# Redis 配置（指向主节点）
REDIS_HOST=121.40.167.71
REDIS_PORT=6379

# 其他配置与节点1保持一致
POSTGRES_PASSWORD=same_as_node1
REDIS_PASSWORD=same_as_node1
```

### 步骤 4: 执行自动升级

```bash
# 在服务器1执行升级脚本
./deploy/scripts/upgrade-to-ha.sh
```

**脚本执行流程**：

1. ✅ 前置检查（SSH连通性、网络等）
2. ✅ 数据备份（自动）
3. ✅ 代码同步到服务器2
4. ✅ 停止服务器1服务（开始停机）
5. ✅ 升级服务器1为主节点模式
6. ✅ 启动服务器1主节点服务
7. ✅ 部署服务器2从节点
8. ✅ 配置 PostgreSQL 主从复制
9. ✅ 配置 Redis Sentinel
10. ✅ 健康检查

**预计停机时间**：5-15 分钟

### 步骤 5: 配置负载均衡器

升级脚本完成后，需要手动配置负载均衡器。

**5.1 选择负载均衡方案**：

**方案A：在服务器1部署 Nginx（推荐）**：

```bash
# 在服务器1安装 Nginx
sudo apt install nginx

# 使用预配置文件
sudo cp /opt/idp-cms/infra/configs/nginx/lb-ha.conf /etc/nginx/sites-available/idp-cms
sudo ln -s /etc/nginx/sites-available/idp-cms /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

**方案B：独立负载均衡器**：

如果有第三台服务器或云负载均衡器：

```nginx
# /etc/nginx/conf.d/idp-cms-lb.conf

upstream backend_servers {
    least_conn;
    server 121.40.167.71:8000 weight=2;
    server 121.41.73.49:8000 weight=1;
}

upstream frontend_servers {
    ip_hash;  # 会话保持
    server 121.40.167.71:3000;
    server 121.41.73.49:3000;
}

server {
    listen 80;
    server_name yourdomain.com;

    location /api/ {
        proxy_pass http://backend_servers;
        include /etc/nginx/proxy_params;
    }

    location / {
        proxy_pass http://frontend_servers;
        include /etc/nginx/proxy_params;
    }
}
```

**5.2 DNS 配置**：

```bash
# 将域名指向负载均衡器
# A记录: yourdomain.com -> 负载均衡器IP
```

### 步骤 6: 验证升级结果

**6.1 检查主从复制状态**：

```bash
# 在服务器1执行
./deploy/scripts/health-check-ha.sh

# 或手动检查
docker exec $(docker ps -qf "name=postgres") psql -U postgres -c \
    "SELECT application_name, state, sync_state FROM pg_stat_replication;"
```

**预期输出**：
```
 application_name |   state   | sync_state
------------------+-----------+------------
 node2_replica    | streaming | async
```

**6.2 检查 Redis Sentinel**：

```bash
# 检查 Sentinel 状态
docker exec $(docker ps -qf "name=sentinel") redis-cli -p 26379 SENTINEL masters

# 检查主节点
docker exec $(docker ps -qf "name=sentinel") redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster
```

**6.3 检查服务可用性**：

```bash
# 通过负载均衡器访问
curl http://yourdomain.com/api/health/
curl http://yourdomain.com/

# 直接访问服务器1
curl http://121.40.167.71:8000/health/
curl http://121.40.167.71:3000/api/health

# 直接访问服务器2
curl http://121.41.73.49:8000/health/
curl http://121.41.73.49:3000/api/health
```

**6.4 测试故障转移**：

```bash
# 模拟服务器1故障
ssh root@121.40.167.71 "docker-compose -f /opt/idp-cms/infra/production/docker-compose-ha-node1.yml down"

# 检查服务是否仍可访问（通过负载均衡器）
curl http://yourdomain.com/  # 应该仍然正常

# 检查 Sentinel 是否自动提升节点2
docker exec $(docker ps -qf "name=sentinel") redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster

# 恢复服务器1
ssh root@121.40.167.71 "docker-compose -f /opt/idp-cms/infra/production/docker-compose-ha-node1.yml up -d"
```

## 🔍 升级后配置

### 1. 监控配置

```bash
# 部署监控脚本
./deploy/scripts/monitor-ha.sh

# 添加到定时任务
crontab -e

# 每5分钟检查一次
*/5 * * * * /opt/idp-cms/deploy/scripts/monitor-ha.sh
```

### 2. 备份策略升级

```bash
# 配置主从备份
# 在服务器1备份主库
0 2 * * * docker exec $(docker ps -qf "name=postgres") pg_dumpall -U postgres > \
    /opt/idp-cms/backups/master_$(date +\%Y\%m\%d).sql

# 在服务器2备份从库（可选）
0 3 * * * ssh root@121.41.73.49 "docker exec \$(docker ps -qf 'name=postgres') pg_dumpall -U postgres" > \
    /opt/idp-cms/backups/replica_$(date +\%Y\%m\%d).sql
```

### 3. SSL 证书配置

```bash
# 在负载均衡器上申请 SSL 证书
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# 或手动配置（参考 infra/configs/nginx/ssl-ha.conf）
```

## ⚠️ 故障排查

### 问题 1: 主从复制不同步

**症状**：`pg_stat_replication` 显示为空

**解决方案**：

```bash
# 1. 检查从库配置
ssh root@121.41.73.49 "docker exec \$(docker ps -qf 'name=postgres') \
    cat /var/lib/postgresql/data/postgresql.conf | grep primary_conninfo"

# 2. 检查主库配置
docker exec $(docker ps -qf "name=postgres") \
    psql -U postgres -c "SHOW wal_level;"  # 应该是 replica

# 3. 重建从库
ssh root@121.41.73.49 "docker-compose -f /opt/idp-cms/infra/production/docker-compose-ha-node2.yml down"
# 删除从库数据并重新初始化
```

### 问题 2: Redis Sentinel 未选举主节点

**症状**：无法自动故障转移

**解决方案**：

```bash
# 1. 检查 Sentinel 配置
docker exec $(docker ps -qf "name=sentinel") cat /etc/redis/sentinel.conf

# 2. 检查 Sentinel 日志
docker logs $(docker ps -qf "name=sentinel")

# 3. 手动触发故障转移
docker exec $(docker ps -qf "name=sentinel") \
    redis-cli -p 26379 SENTINEL failover mymaster
```

### 问题 3: 负载均衡器无法连接后端

**症状**：502 Bad Gateway

**解决方案**：

```bash
# 1. 检查后端服务状态
curl http://121.40.167.71:8000/health/
curl http://121.41.73.49:8000/health/

# 2. 检查 Nginx 配置
sudo nginx -t

# 3. 检查 Nginx 日志
sudo tail -f /var/log/nginx/error.log

# 4. 检查网络连通性
ping 121.40.167.71
ping 121.41.73.49
```

## 📊 性能优化

### 1. PostgreSQL 主从优化

```bash
# 主库优化（infra/configs/postgresql/master.conf）
wal_keep_size = 1GB              # 增加 WAL 保留
max_wal_senders = 10             # 最多10个从库
synchronous_commit = on          # 同步提交（数据安全）
# synchronous_commit = off       # 异步提交（性能优先）

# 从库优化（infra/configs/postgresql/replica.conf）
hot_standby = on                 # 开启热备
max_standby_streaming_delay = 30s  # 最大延迟
```

### 2. Redis Sentinel 优化

```bash
# infra/configs/redis/sentinel.conf
sentinel down-after-milliseconds mymaster 5000  # 5秒判定下线
sentinel failover-timeout mymaster 10000        # 10秒故障转移超时
sentinel parallel-syncs mymaster 1              # 一次同步一个从库
```

### 3. 负载均衡策略

```nginx
# 最小连接数（推荐用于 API）
upstream backend_servers {
    least_conn;
    server 121.40.167.71:8000;
    server 121.41.73.49:8000;
}

# IP Hash（会话保持）
upstream frontend_servers {
    ip_hash;
    server 121.40.167.71:3000;
    server 121.41.73.49:3000;
}

# 加权轮询（性能不同时）
upstream mixed_servers {
    server 121.40.167.71:8000 weight=3;  # 性能更好
    server 121.41.73.49:8000 weight=1;
}
```

## 📈 升级后运维

### 日常监控

```bash
# 查看复制延迟
./deploy/scripts/monitor-ha.sh

# 查看服务状态
docker-compose -f infra/production/docker-compose-ha-node1.yml ps
ssh root@121.41.73.49 "docker-compose -f /opt/idp-cms/infra/production/docker-compose-ha-node2.yml ps"
```

### 定期维护

```bash
# 每周检查复制状态
./deploy/scripts/health-check-ha.sh

# 每月测试故障转移
./deploy/scripts/failover.sh --test

# 每月检查备份完整性
pg_restore -l /opt/idp-cms/backups/latest.sql
```

### 扩容升级

如需进一步扩展：

- 增加更多从库节点（读负载分担）
- 部署独立的 Redis 集群
- 使用专业的负载均衡器（如 HAProxy、云LB）
- 引入 Kubernetes 容器编排

## 📚 相关文档

- [单节点部署指南](./SINGLE_NODE_DEPLOYMENT.md)
- [HA 运维手册](./docs/guides/HA_OPERATIONS.md)
- [故障排查指南](./docs/guides/HA_TROUBLESHOOTING.md)
- [负载均衡配置](./docs/guides/LOAD_BALANCER_GUIDE.md)

## 🆘 回滚方案

如升级失败需要回滚：

```bash
# 1. 停止服务器2
ssh root@121.41.73.49 "docker-compose -f /opt/idp-cms/infra/production/docker-compose-ha-node2.yml down"

# 2. 恢复服务器1单节点模式
cd /opt/idp-cms
docker-compose -f infra/production/docker-compose-ha-node1.yml down
docker-compose -f infra/production/docker-compose-ha-node1.yml up -d

# 3. 恢复数据库（如需要）
cat /opt/idp-cms/backups/upgrade_backup_*.sql | \
    docker exec -i $(docker ps -qf "name=postgres") psql -U postgres

# 4. 验证服务
curl http://121.40.167.71:8000/health/
```

---

**升级愉快！有任何问题请参考故障排查文档或联系技术支持。** 🚀

