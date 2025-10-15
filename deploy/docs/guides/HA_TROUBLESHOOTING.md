# 🔍 高可用系统故障排查指南

## 快速诊断

### 1. 系统整体检查

```bash
# 运行健康检查
/opt/idp-cms/deploy/scripts/health-check-ha.sh --verbose

# 检查所有容器状态
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# 检查网络连通性
ping -c 3 192.168.1.10  # 服务器1
ping -c 3 192.168.1.11  # 服务器2
```

### 2. 服务可用性检查

```bash
# 后端 API
curl -f http://localhost:8000/health/readiness/

# 前端
curl -f http://localhost:3000/api/health

# 数据库
docker exec ha-postgres-master pg_isready -U news

# Redis
docker exec node1-redis-master redis-cli -a 密码 ping
```

## 常见问题

### 问题 1: 服务无法启动

#### 症状
```
Error response from daemon: driver failed programming external connectivity
```

#### 原因
端口被占用

#### 排查
```bash
# 检查端口占用
sudo netstat -tulpn | grep :8000
sudo lsof -i :8000
```

#### 解决
```bash
# 停止占用端口的进程
sudo kill -9 PID

# 或修改端口配置
nano /opt/idp-cms/infra/production/docker-compose-ha-node1.yml
```

---

### 问题 2: PostgreSQL 复制中断

#### 症状
- 从库查询失败
- 复制延迟持续增大
- `pg_stat_replication` 无记录

#### 排查
```bash
# 检查主库复制状态
docker exec ha-postgres-master psql -U news -d news_ha -c \
    "SELECT * FROM pg_stat_replication;"

# 检查从库状态
docker exec ha-postgres-replica psql -U news -d news_ha -c \
    "SELECT pg_is_in_recovery();"

# 检查复制槽
docker exec ha-postgres-master psql -U news -d news_ha -c \
    "SELECT * FROM pg_replication_slots;"

# 检查WAL发送进程
docker exec ha-postgres-master ps aux | grep "wal sender"
```

#### 解决方案

**方案 1: 重启复制连接**
```bash
# 在从库执行
docker exec ha-postgres-replica psql -U news -d news_ha -c \
    "SELECT pg_reload_conf();"
```

**方案 2: 重新初始化从库**
```bash
# 1. 停止从库
docker compose -f /opt/idp-cms/infra/production/docker-compose-ha-node2.yml stop postgres-replica

# 2. 删除旧数据
docker volume rm ha-postgres-replica-data

# 3. 重新创建基础备份
./deploy/scripts/deploy-ha-node2.sh --init-replica
```

---

### 问题 3: Redis Sentinel 故障转移失败

#### 症状
- 主节点宕机但未自动切换
- Sentinel 日志显示错误

#### 排查
```bash
# 检查 Sentinel 状态
docker exec ha-redis-sentinel-1 redis-cli -p 26379 \
    sentinel masters

# 检查 quorum
docker exec ha-redis-sentinel-1 redis-cli -p 26379 \
    sentinel ckquorum mymaster

# 检查 Sentinel 日志
docker logs ha-redis-sentinel-1 --tail 100

# 验证 Sentinel 网络
for sentinel in ha-redis-sentinel-1 ha-redis-sentinel-2; do
    echo "=== $sentinel ==="
    docker exec $sentinel redis-cli -p 26379 ping
done
```

#### 解决方案

**方案 1: 检查 quorum 配置**
```bash
# Sentinel 配置中 quorum 应该是 (Sentinel数量 / 2) + 1
# 例如: 3个Sentinel, quorum=2

# 查看当前配置
docker exec ha-redis-sentinel-1 redis-cli -p 26379 \
    sentinel master mymaster | grep quorum

# 修改 quorum
docker exec ha-redis-sentinel-1 redis-cli -p 26379 \
    sentinel set mymaster quorum 2
```

**方案 2: 手动故障转移**
```bash
./deploy/scripts/failover.sh redis --force
```

---

### 问题 4: MinIO 节点离线

#### 症状
- MinIO API 返回错误
- 无法上传/下载文件
- 某些节点显示 offline

#### 排查
```bash
# 检查所有 MinIO 节点
for i in {1..4}; do
    echo "=== MinIO $i ==="
    docker exec ha-minio$i mc admin info local 2>/dev/null || echo "节点离线"
done

# 检查磁盘状态
docker exec ha-minio1 mc admin heal -r local/

# 检查网络连通性
docker exec ha-minio1 ping -c 3 minio2
```

#### 解决方案

**方案 1: 重启离线节点**
```bash
docker restart ha-minio2
```

**方案 2: 检查磁盘空间**
```bash
# 检查磁盘使用率
df -h | grep minio

# 清理旧数据
docker exec ha-minio1 mc rm --recursive --force --older-than 30d local/idp-backup/
```

---

### 问题 5: 应用内存溢出 (OOM)

#### 症状
- 容器被 killed
- 日志显示 "Killed"
- 容器频繁重启

#### 排查
```bash
# 检查容器内存使用
docker stats --no-stream

# 检查 OOM killer 日志
dmesg | grep -i "killed process"
sudo journalctl -k | grep -i "out of memory"

# 检查应用日志
docker logs node1-authoring --tail 100 | grep -i "memory\|oom"
```

#### 解决方案

**方案 1: 增加内存限制**
```yaml
# docker-compose-ha-node1.yml
services:
  authoring:
    deploy:
      resources:
        limits:
          memory: 2G  # 增加到 2GB
        reservations:
          memory: 1G
```

**方案 2: 优化应用配置**
```bash
# 减少 Gunicorn worker 数量
# .env.node1
GUNICORN_WORKERS=2  # 降低为 2

# 减少数据库连接池
DB_POOL_SIZE=10  # 降低为 10
```

---

### 问题 6: 会话丢失/用户频繁登出

#### 症状
- 用户需要频繁重新登录
- 会话状态不一致

#### 排查
```bash
# 检查 Redis 连接
docker exec node1-authoring python manage.py shell << EOF
from django.core.cache import cache
cache.set('test_key', 'test_value', 60)
print(cache.get('test_key'))
EOF

# 检查 Redis 主从状态
docker exec node1-redis-master redis-cli -a 密码 info replication
docker exec node2-redis-replica redis-cli -a 密码 info replication

# 检查 Nginx sticky session
grep -r "ip_hash" /etc/nginx/sites-enabled/idp-cms-ha
```

#### 解决方案

**方案 1: 验证 Redis 配置**
```python
# settings.py 确认使用 Redis 作为会话存储
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'

CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://:password@redis-master:6379/0',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}
```

**方案 2: 配置 Nginx sticky session**
```nginx
# lb-ha.conf
upstream frontend_app {
    ip_hash;  # 确保启用 ip_hash
    server SERVER1_IP:3000;
    server SERVER2_IP:3000;
}
```

---

### 问题 7: OpenSearch 集群状态异常

#### 症状
- 搜索请求失败
- 集群状态为 red 或 yellow

#### 排查
```bash
# 检查集群健康
docker exec node1-opensearch curl -k -u admin:密码 \
    https://localhost:9200/_cluster/health?pretty

# 检查索引状态
docker exec node1-opensearch curl -k -u admin:密码 \
    https://localhost:9200/_cat/indices?v

# 检查节点状态
docker exec node1-opensearch curl -k -u admin:密码 \
    https://localhost:9200/_cat/nodes?v
```

#### 解决方案

**方案 1: 修复未分配的分片**
```bash
# 重新分配分片
docker exec node1-opensearch curl -k -u admin:密码 \
    -X POST "https://localhost:9200/_cluster/reroute?retry_failed=true"

# 增加副本数
docker exec node1-opensearch curl -k -u admin:密码 \
    -X PUT "https://localhost:9200/_settings" \
    -H 'Content-Type: application/json' \
    -d '{"index": {"number_of_replicas": 0}}'
```

**方案 2: 重建索引**
```bash
# 备份旧索引
docker exec node1-opensearch curl -k -u admin:密码 \
    -X POST "https://localhost:9200/_reindex" \
    -H 'Content-Type: application/json' \
    -d '{
      "source": {"index": "old_index"},
      "dest": {"index": "new_index"}
    }'

# 删除旧索引
docker exec node1-opensearch curl -k -u admin:密码 \
    -X DELETE "https://localhost:9200/old_index"
```

---

### 问题 8: 负载不均衡

#### 症状
- 所有请求都到一台服务器
- 某台服务器负载过高

#### 排查
```bash
# 检查 Nginx 配置
sudo nginx -T | grep -A 20 "upstream"

# 测试负载分配
for i in {1..20}; do
    curl -s -I https://yourdomain.com | grep -i "server\|x-"
done

# 检查后端节点健康检查
curl http://192.168.1.10:8000/health/readiness/
curl http://192.168.1.11:8000/health/readiness/
```

#### 解决方案

**方案 1: 验证负载均衡算法**
```nginx
# 检查 upstream 配置
upstream backend_api {
    least_conn;  # 确保使用合适的算法
    server 192.168.1.10:8000 weight=1;
    server 192.168.1.11:8000 weight=1;
}
```

**方案 2: 移除故障节点**
```nginx
# 临时标记节点为 down
upstream backend_api {
    server 192.168.1.10:8000;
    server 192.168.1.11:8000 down;  # 临时禁用
}
```

---

## 诊断工具

### 1. 日志分析脚本

```bash
#!/bin/bash
# analyze-logs.sh

echo "=== 错误统计 ==="
docker logs node1-authoring 2>&1 | grep -i error | wc -l

echo "=== 最近错误 ==="
docker logs node1-authoring --tail 50 2>&1 | grep -i error

echo "=== 慢查询 ==="
docker logs node1-authoring 2>&1 | grep "slow query" | tail -10
```

### 2. 性能分析

```bash
# CPU 和内存
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# 磁盘 IO
iostat -x 1 5

# 网络流量
iftop -i eth0
```

### 3. 数据库分析

```sql
-- 查看慢查询
SELECT * FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- 查看锁等待
SELECT * FROM pg_locks 
WHERE NOT granted;

-- 查看连接数
SELECT count(*) FROM pg_stat_activity;
```

## 紧急响应流程

### 级别 1: 严重故障（所有节点不可用）

1. **立即通知**
   - 发送告警邮件/企业微信
   - 电话通知值班人员

2. **快速诊断**
   ```bash
   ./deploy/scripts/health-check-ha.sh --verbose
   ```

3. **应急措施**
   - 启用备用系统
   - 启动灾备方案

4. **故障恢复**
   - 按照故障排查步骤逐项检查
   - 记录故障日志

### 级别 2: 降级服务（部分节点故障）

1. **确认影响范围**
2. **隔离故障节点**
3. **服务降级运行**
4. **修复故障节点**

### 级别 3: 性能问题

1. **采集性能数据**
2. **分析瓶颈**
3. **优化配置**
4. **验证效果**

## 联系支持

- **技术支持邮箱**: tech-support@yourdomain.com
- **紧急热线**: +86 138-xxxx-xxxx
- **Slack 频道**: #idp-cms-support
- **值班制度**: 7x24 小时

---

**文档版本**: v1.0  
**最后更新**: 2025-10-15

