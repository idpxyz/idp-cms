# 🔧 高可用系统运维手册

## 日常运维

### 健康检查

```bash
# 快速健康检查
/opt/idp-cms/deploy/scripts/health-check-ha.sh

# 详细检查（含详细信息）
/opt/idp-cms/deploy/scripts/health-check-ha.sh --verbose

# JSON 格式输出（用于监控系统）
/opt/idp-cms/deploy/scripts/health-check-ha.sh --json
```

### 服务管理

#### 启动服务

```bash
# 服务器1
docker compose -f /opt/idp-cms/infra/production/docker-compose-ha-node1.yml up -d

# 服务器2
docker compose -f /opt/idp-cms/infra/production/docker-compose-ha-node2.yml up -d
```

#### 停止服务

```bash
# 优雅停止（推荐）
docker compose -f /opt/idp-cms/infra/production/docker-compose-ha-node1.yml stop

# 强制停止
docker compose -f /opt/idp-cms/infra/production/docker-compose-ha-node1.yml down
```

#### 重启服务

```bash
# 重启特定服务
docker compose -f /opt/idp-cms/infra/production/docker-compose-ha-node1.yml restart authoring

# 重启所有服务
docker compose -f /opt/idp-cms/infra/production/docker-compose-ha-node1.yml restart
```

### 日志管理

#### 查看日志

```bash
# 实时日志
docker compose -f /opt/idp-cms/infra/production/docker-compose-ha-node1.yml logs -f

# 指定服务日志
docker logs -f node1-authoring

# 最近 100 行
docker logs --tail 100 node1-authoring

# 时间范围日志
docker logs --since 2024-01-01T00:00:00 --until 2024-01-02T00:00:00 node1-authoring
```

#### 日志归档

```bash
# 归档旧日志
cd /opt/idp-cms/logs
tar -czf logs-$(date +%Y%m%d).tar.gz *.log
mv logs-*.tar.gz /backup/logs/

# 清理旧日志
find /opt/idp-cms/logs -name "*.log" -mtime +30 -delete
```

## 备份与恢复

### 数据库备份

```bash
# 全量备份
docker exec ha-postgres-master pg_dump -U news news_ha | \
    gzip > /backup/postgres-$(date +%Y%m%d-%H%M%S).sql.gz

# 仅数据备份
docker exec ha-postgres-master pg_dump -U news news_ha --data-only | \
    gzip > /backup/postgres-data-$(date +%Y%m%d).sql.gz

# 仅结构备份
docker exec ha-postgres-master pg_dump -U news news_ha --schema-only | \
    gzip > /backup/postgres-schema-$(date +%Y%m%d).sql.gz
```

### 数据库恢复

```bash
# 从备份恢复
gunzip < /backup/postgres-20250115.sql.gz | \
    docker exec -i ha-postgres-master psql -U news news_ha
```

### MinIO 备份

```bash
# 备份桶数据
docker exec ha-minio1 mc mirror local/idp-media-prod-public /backup/minio/public/

# 备份桶配置
docker exec ha-minio1 mc admin config export local > /backup/minio/config.json
```

## 故障转移

### PostgreSQL 故障转移

```bash
# 检查从库状态
/opt/idp-cms/deploy/scripts/promote-replica.sh --check-only

# 提升从库为主库
/opt/idp-cms/deploy/scripts/promote-replica.sh

# 强制提升（跳过确认）
/opt/idp-cms/deploy/scripts/promote-replica.sh --force
```

### Redis 故障转移

```bash
# 手动触发故障转移
/opt/idp-cms/deploy/scripts/failover.sh redis

# 查看故障转移状态
/opt/idp-cms/deploy/scripts/failover.sh status
```

## 性能优化

### 数据库优化

```bash
# 分析表统计信息
docker exec ha-postgres-master psql -U news -d news_ha -c "ANALYZE;"

# 清理死元组
docker exec ha-postgres-master psql -U news -d news_ha -c "VACUUM FULL ANALYZE;"

# 重建索引
docker exec ha-postgres-master psql -U news -d news_ha -c "REINDEX DATABASE news_ha;"
```

### Redis 优化

```bash
# 清理过期键
docker exec node1-redis-master redis-cli -a 密码 --scan --pattern 'expired:*' | \
    xargs -L 1 docker exec -i node1-redis-master redis-cli -a 密码 DEL

# 查看内存使用
docker exec node1-redis-master redis-cli -a 密码 INFO memory

# 查看慢查询
docker exec node1-redis-master redis-cli -a 密码 SLOWLOG GET 10
```

## 监控和告警

### 设置监控

```bash
# 添加到 crontab
crontab -e

# 每5分钟检查一次
*/5 * * * * /opt/idp-cms/deploy/scripts/monitor-ha.sh --alert >> /var/log/ha-monitor.log 2>&1

# 每天凌晨2点备份
0 2 * * * /opt/idp-cms/deploy/scripts/backup.sh >> /var/log/ha-backup.log 2>&1
```

### 配置告警

```bash
# 设置告警邮件
export ALERT_EMAIL="admin@yourdomain.com"

# 设置 Slack Webhook
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# 设置企业微信 Webhook
export WECHAT_WEBHOOK_URL="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY"
```

## 安全管理

### 密码更新

```bash
# 更新 PostgreSQL 密码
docker exec ha-postgres-master psql -U news -d news_ha -c \
    "ALTER USER news WITH PASSWORD '新密码';"

# 更新 Redis 密码
docker exec node1-redis-master redis-cli -a 旧密码 CONFIG SET requirepass 新密码

# 更新环境变量
nano /opt/idp-cms/.env.node1
```

### SSL 证书更新

```bash
# 手动续期
sudo certbot renew

# 测试续期
sudo certbot renew --dry-run

# 强制续期
sudo certbot renew --force-renewal
```

## 扩容操作

### 增加应用节点

1. 准备新服务器
2. 同步代码: `./deploy/scripts/sync-code.sh NEW_SERVER_IP`
3. 启动服务
4. 更新负载均衡配置

### 数据库读写分离

```python
# settings.py 配置多数据库
DATABASES = {
    'default': {  # 写操作
        'ENGINE': 'django.db.backends.postgresql',
        'HOST': os.getenv('POSTGRES_HOST'),
        # ...
    },
    'replica': {  # 读操作
        'ENGINE': 'django.db.backends.postgresql',
        'HOST': os.getenv('POSTGRES_REPLICA_HOST'),
        # ...
    }
}

# 使用读库
Model.objects.using('replica').filter(...)
```

## 故障演练

### 月度演练清单

- [ ] 模拟节点1故障
- [ ] 验证自动故障转移
- [ ] 检查数据一致性
- [ ] 恢复原节点
- [ ] 验证服务恢复

### 演练脚本

```bash
# 1. 记录当前状态
/opt/idp-cms/deploy/scripts/health-check-ha.sh > /tmp/before-drill.log

# 2. 停止节点1
docker compose -f /opt/idp-cms/infra/production/docker-compose-ha-node1.yml stop authoring

# 3. 验证服务可用
curl -f https://yourdomain.com/api/feed?size=5

# 4. 恢复节点1
docker compose -f /opt/idp-cms/infra/production/docker-compose-ha-node1.yml start authoring

# 5. 检查最终状态
/opt/idp-cms/deploy/scripts/health-check-ha.sh > /tmp/after-drill.log

# 6. 对比结果
diff /tmp/before-drill.log /tmp/after-drill.log
```

