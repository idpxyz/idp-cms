# 🚀 快速部署指南 - 您的双服务器配置

## 📋 服务器信息

```
✅ 服务器1（主节点）: 121.40.167.71
✅ 服务器2（从节点）: 121.41.73.49
```

---

## ⚡ 3步快速部署

### 准备工作（两台服务器都需要）

```bash
# 1. 安装 Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# 2. 克隆代码
sudo git clone <your-repo> /opt/idp-cms
sudo chown -R $USER:$USER /opt/idp-cms
cd /opt/idp-cms

# 3. 配置 hosts（可选，用于测试）
sudo tee -a /etc/hosts << EOF
121.40.167.71   idp-node1
121.41.73.49    idp-node2
EOF
```

---

## 🎯 步骤1：部署服务器1（主节点）- 121.40.167.71

### 1.1 配置环境变量

```bash
# 在服务器1执行
cd /opt/idp-cms

# 使用已创建的配置文件
cp .env.node1.production .env.node1

# ⚠️ 重要：修改所有密码
nano .env.node1
```

**必须修改的配置项：**
```bash
# 1. 修改所有密码（搜索 "Change_This"）
POSTGRES_PASSWORD=你的强密码
REPLICATION_PASSWORD=你的复制密码
REDIS_PASSWORD=你的Redis密码
MINIO_SECRET_KEY=你的MinIO密钥
CLICKHOUSE_PASSWORD=你的ClickHouse密码
OPENSEARCH_PASSWORD=你的OpenSearch密码
DJANGO_SECRET_KEY=你的Django密钥

# 2. 修改域名（如果有）
DJANGO_ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com,121.40.167.71
CMS_PUBLIC_URL=https://yourdomain.com
FRONTEND_PUBLIC_URL=https://yourdomain.com
```

### 1.2 部署基础设施和应用

```bash
# 一键部署主节点
./deploy/scripts/deploy-ha-infrastructure.sh
./deploy/scripts/deploy-ha-node1.sh

# 验证部署
./deploy/scripts/health-check-ha.sh
```

### 1.3 初始化数据

```bash
# 创建超级用户
docker exec -it node1-authoring python manage.py createsuperuser

# 创建站点
docker exec node1-authoring python manage.py bootstrap_sites \
    --portal-domain=yourdomain.com \
    --a-domain=a.yourdomain.com \
    --b-domain=b.yourdomain.com
```

---

## 🎯 步骤2：部署服务器2（从节点）- 121.41.73.49

### 2.1 配置 SSH 密钥（在服务器1执行）

```bash
# 生成 SSH 密钥（如果没有）
ssh-keygen -t rsa -b 4096

# 复制公钥到服务器2
ssh-copy-id root@121.41.73.49

# 测试免密登录
ssh root@121.41.73.49 "echo 'SSH OK'"
```

### 2.2 同步代码到服务器2（在服务器1执行）

```bash
cd /opt/idp-cms

# 同步代码（自动排除不必要文件）
./deploy/scripts/sync-code.sh 121.41.73.49

# 或者试运行查看会同步什么
./deploy/scripts/sync-code.sh 121.41.73.49 --dry-run
```

### 2.3 在服务器2配置和部署

```bash
# 在服务器2执行
cd /opt/idp-cms

# 使用已创建的配置文件
cp .env.node2.production .env.node2

# ⚠️ 重要：修改密码（必须与服务器1一致）
nano .env.node2

# 部署从节点（包括初始化 PostgreSQL 从库）
./deploy/scripts/deploy-ha-node2.sh --init-replica

# 验证部署
./deploy/scripts/health-check-ha.sh
```

---

## 🎯 步骤3：配置负载均衡器

### 3.1 修改 Nginx 配置（服务器1或独立负载均衡器）

```bash
# 安装 Nginx
sudo apt update && sudo apt install -y nginx

# 复制配置文件
sudo cp /opt/idp-cms/infra/configs/nginx/lb-ha.conf \
    /etc/nginx/sites-available/idp-cms-ha

# 自动替换 IP 地址
sudo sed -i 's/SERVER1_IP/121.40.167.71/g' /etc/nginx/sites-available/idp-cms-ha
sudo sed -i 's/SERVER2_IP/121.41.73.49/g' /etc/nginx/sites-available/idp-cms-ha

# 如果有域名，替换域名
sudo sed -i 's/YOUR_DOMAIN.COM/yourdomain.com/g' /etc/nginx/sites-available/idp-cms-ha

# 启用配置
sudo ln -s /etc/nginx/sites-available/idp-cms-ha /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

### 3.2 配置 SSL 证书

```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 申请证书（如果有域名）
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# 验证自动续期
sudo certbot renew --dry-run
```

---

## ✅ 验证部署

### 1. 健康检查

```bash
# 在任一服务器执行
./deploy/scripts/health-check-ha.sh --verbose
```

### 2. 测试访问

```bash
# 测试后端 API
curl http://121.40.167.71:8000/health/readiness/
curl http://121.41.73.49:8000/health/readiness/

# 测试前端
curl http://121.40.167.71:3000/api/health
curl http://121.41.73.49:3000/api/health

# 如果配置了域名
curl https://yourdomain.com/api/feed?size=5
```

### 3. 测试负载均衡

```bash
# 多次请求，观察是否分配到不同服务器
for i in {1..10}; do
    curl -I https://yourdomain.com 2>&1 | grep -i "server\|x-"
done
```

### 4. 测试故障转移

```bash
# 在服务器1停止应用
docker compose -f /opt/idp-cms/infra/production/docker-compose-ha-node1.yml stop authoring

# 测试服务是否仍然可用（应该自动切换到服务器2）
curl https://yourdomain.com/api/feed?size=5

# 恢复服务器1
docker compose -f /opt/idp-cms/infra/production/docker-compose-ha-node1.yml start authoring
```

---

## 🔧 常用运维命令

### 查看服务状态

```bash
# 服务器1
docker compose -f /opt/idp-cms/infra/production/docker-compose-ha-node1.yml ps

# 服务器2
docker compose -f /opt/idp-cms/infra/production/docker-compose-ha-node2.yml ps
```

### 查看日志

```bash
# 查看实时日志
docker compose -f /opt/idp-cms/infra/production/docker-compose-ha-node1.yml logs -f

# 查看特定服务日志
docker logs -f node1-authoring
docker logs -f node1-frontend
```

### 重启服务

```bash
# 重启特定服务
docker compose -f /opt/idp-cms/infra/production/docker-compose-ha-node1.yml restart authoring

# 重启所有服务
docker compose -f /opt/idp-cms/infra/production/docker-compose-ha-node1.yml restart
```

### 故障转移

```bash
# PostgreSQL 故障转移
./deploy/scripts/failover.sh postgres

# Redis 故障转移
./deploy/scripts/failover.sh redis

# 查看状态
./deploy/scripts/failover.sh status
```

---

## 🔐 安全配置检查清单

### 立即完成的安全配置

- [ ] 修改所有密码为强密码（16位以上，包含大小写、数字、特殊字符）
- [ ] 配置防火墙规则
- [ ] 禁用 SSH 密码登录，仅使用密钥
- [ ] 配置 SSL 证书（Let's Encrypt）
- [ ] 限制数据库访问（仅内网）

### 防火墙配置

```bash
# 服务器1
sudo ufw allow 22/tcp                           # SSH
sudo ufw allow 80/tcp                           # HTTP
sudo ufw allow 443/tcp                          # HTTPS
sudo ufw allow from 121.41.73.49 to any port 5432  # PostgreSQL from server2
sudo ufw allow from 121.41.73.49 to any port 6379  # Redis from server2
sudo ufw allow from 121.41.73.49 to any port 26379 # Sentinel from server2
sudo ufw allow from 121.41.73.49 to any port 9000  # MinIO from server2
sudo ufw enable

# 服务器2
sudo ufw allow 22/tcp                           # SSH
sudo ufw allow from 121.40.167.71 to any port 5432  # PostgreSQL from server1
sudo ufw allow from 121.40.167.71 to any port 6379  # Redis from server1
sudo ufw allow from 121.40.167.71 to any port 26379 # Sentinel from server1
sudo ufw allow from 121.40.167.71 to any port 9000  # MinIO from server1
sudo ufw enable
```

---

## 📊 监控和告警

### 设置定时监控

```bash
# 编辑 crontab
crontab -e

# 添加监控任务
*/5 * * * * /opt/idp-cms/deploy/scripts/monitor-ha.sh --alert >> /var/log/ha-monitor.log 2>&1
0 2 * * * /opt/idp-cms/deploy/scripts/backup.sh >> /var/log/ha-backup.log 2>&1
```

### 配置告警通知

```bash
# 设置告警邮箱
export ALERT_EMAIL="admin@yourdomain.com"

# 运行监控（带告警）
./deploy/scripts/monitor-ha.sh --alert
```

---

## 🆘 故障排查

### 常见问题

1. **服务无法启动**
   ```bash
   # 检查端口占用
   sudo netstat -tulpn | grep :8000
   
   # 查看容器日志
   docker logs node1-authoring
   ```

2. **PostgreSQL 复制延迟**
   ```bash
   # 检查复制状态
   docker exec ha-postgres-master psql -U news -d news_ha -c \
       "SELECT * FROM pg_stat_replication;"
   ```

3. **Redis 连接失败**
   ```bash
   # 测试 Redis 连接
   docker exec node1-redis-master redis-cli -a 你的密码 ping
   ```

4. **网络不通**
   ```bash
   # 测试服务器间连通性
   ping -c 3 121.40.167.71
   ping -c 3 121.41.73.49
   
   # 测试端口
   telnet 121.40.167.71 5432
   ```

---

## 📞 获取帮助

- 📖 **完整部署文档**: `deploy/docs/guides/HA_DEPLOYMENT_GUIDE.md`
- 🔧 **运维手册**: `deploy/docs/guides/HA_OPERATIONS.md`
- 🔍 **故障排查**: `deploy/docs/guides/HA_TROUBLESHOOTING.md`

---

## 🎉 部署完成！

现在您的高可用新闻网站已经部署完成：

✅ **服务器1 (121.40.167.71)**: 主节点运行中  
✅ **服务器2 (121.41.73.49)**: 从节点运行中  
✅ **负载均衡**: Nginx 分发流量  
✅ **数据同步**: PostgreSQL + Redis 实时复制  
✅ **自动故障转移**: Sentinel 监控

---

**祝您部署顺利！** 🚀

如有问题，请运行健康检查：`./deploy/scripts/health-check-ha.sh --verbose`

