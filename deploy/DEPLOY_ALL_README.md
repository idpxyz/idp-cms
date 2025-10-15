# 🚀 一键部署脚本使用指南

## 📋 脚本说明

我们提供了两个自动化部署脚本，选择适合您的方式：

### 1. `deploy-all-from-local.sh` - 从本地电脑部署（推荐）

**适用场景：** 从您的本地电脑或笔记本直接部署到两台服务器

**优点：**
- ✅ 在本地执行，更方便
- ✅ 可以随时查看进度
- ✅ 无需先登录服务器
- ✅ 适合首次部署

### 2. `deploy/scripts/deploy-all-ha.sh` - 在服务器1上部署

**适用场景：** 已经 SSH 登录到服务器1

**优点：**
- ✅ 网络更快（服务器间内网）
- ✅ 适合更新部署
- ✅ 更少的网络传输

---

## 🎯 方式1：从本地电脑部署（推荐新手）

### 前置条件

```bash
# 1. 确保可以SSH到两台服务器
ssh root@121.40.167.71  # 输入密码或使用密钥
ssh root@121.41.73.49   # 输入密码或使用密钥

# 2. 配置SSH密钥（可选但推荐）
ssh-keygen -t rsa -b 4096
ssh-copy-id root@121.40.167.71
ssh-copy-id root@121.41.73.49
```

### 使用步骤

```bash
# 1. 在本地项目目录
cd /opt/idp-cms

# 2. 修改环境变量（重要！）
cp .env.node1.production .env.node1
cp .env.node2.production .env.node2

# 编辑密码（搜索 "Change_This"）
nano .env.node1
nano .env.node2

# 3. 执行一键部署
./deploy-all-from-local.sh
```

**就这么简单！** 脚本会自动：
1. 检查SSH连接
2. 上传代码到服务器
3. 部署服务器1（主节点）
4. 同步到服务器2
5. 部署服务器2（从节点）
6. 执行健康检查

---

## 🎯 方式2：在服务器1上部署

### 使用步骤

```bash
# 1. SSH登录到服务器1
ssh root@121.40.167.71

# 2. 进入项目目录
cd /opt/idp-cms

# 3. 配置环境变量
cp .env.node1.production .env.node1
cp .env.node2.production .env.node2

nano .env.node1  # 修改密码
nano .env.node2  # 修改密码

# 4. 配置SSH密钥（服务器1到服务器2）
ssh-keygen -t rsa -b 4096
ssh-copy-id root@121.41.73.49

# 5. 执行部署
./deploy/scripts/deploy-all-ha.sh
```

---

## 📝 部署选项

### 跳过基础设施部署

如果基础设施已经部署，可以跳过：

```bash
./deploy/scripts/deploy-all-ha.sh --skip-infra
```

### 跳过验证

如果想加快部署速度：

```bash
./deploy/scripts/deploy-all-ha.sh --skip-verify
```

### 仅查看执行计划

不实际执行，查看会做什么：

```bash
./deploy/scripts/deploy-all-ha.sh --dry-run
```

---

## ⏱️ 部署时间

| 阶段 | 耗时 | 说明 |
|------|------|------|
| 前置检查 | 1-2分钟 | SSH、Docker、环境检查 |
| 服务器1部署 | 8-10分钟 | 基础设施 + 应用 |
| 服务器2部署 | 5-8分钟 | 应用 + 复制 |
| 验证测试 | 2-3分钟 | 健康检查 |
| **总计** | **15-25分钟** | |

---

## ✅ 部署后检查清单

### 1. 验证服务状态

```bash
# 检查服务器1
curl http://121.40.167.71:8000/health/readiness/
curl http://121.40.167.71:3000/api/health

# 检查服务器2
curl http://121.41.73.49:8000/health/readiness/
curl http://121.41.73.49:3000/api/health
```

### 2. 检查数据库复制

```bash
ssh root@121.40.167.71 << 'EOF'
docker exec ha-postgres-master psql -U news -d news_ha -c \
  "SELECT application_name, state, sync_state FROM pg_stat_replication;"
EOF
```

### 3. 检查Redis状态

```bash
ssh root@121.40.167.71 << 'EOF'
docker exec ha-redis-sentinel-1 redis-cli -p 26379 sentinel masters
EOF
```

---

## 🔧 部署后配置

### 1. 配置负载均衡器

```bash
# 方式A: 在服务器1配置Nginx
ssh root@121.40.167.71

sudo apt install nginx -y
sudo cp /opt/idp-cms/infra/configs/nginx/lb-ha.conf \
    /etc/nginx/sites-available/idp-cms-ha

# 修改IP和域名
sudo sed -i 's/SERVER1_IP/121.40.167.71/g' /etc/nginx/sites-available/idp-cms-ha
sudo sed -i 's/SERVER2_IP/121.41.73.49/g' /etc/nginx/sites-available/idp-cms-ha
sudo sed -i 's/YOUR_DOMAIN.COM/yourdomain.com/g' /etc/nginx/sites-available/idp-cms-ha

# 启用配置
sudo ln -s /etc/nginx/sites-available/idp-cms-ha /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 2. 配置SSL证书

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 3. 配置防火墙

```bash
# 服务器1
ssh root@121.40.167.71 << 'EOF'
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow from 121.41.73.49 to any port 5432
sudo ufw allow from 121.41.73.49 to any port 6379
sudo ufw allow from 121.41.73.49 to any port 9000
sudo ufw enable
EOF

# 服务器2
ssh root@121.41.73.49 << 'EOF'
sudo ufw allow 22/tcp
sudo ufw allow from 121.40.167.71 to any port 5432
sudo ufw allow from 121.40.167.71 to any port 6379
sudo ufw allow from 121.40.167.71 to any port 9000
sudo ufw enable
EOF
```

### 4. 设置监控

```bash
# 在服务器1设置定时监控
ssh root@121.40.167.71 << 'EOF'
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/idp-cms/deploy/scripts/monitor-ha.sh --alert >> /var/log/ha-monitor.log 2>&1") | crontab -
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/idp-cms/deploy/scripts/backup.sh >> /var/log/ha-backup.log 2>&1") | crontab -
EOF
```

---

## 🆘 故障排查

### 问题1: SSH连接失败

```bash
# 检查SSH服务
ssh -v root@121.40.167.71

# 如果提示密钥问题，清理已知主机
ssh-keygen -R 121.40.167.71
ssh-keygen -R 121.41.73.49
```

### 问题2: 部署失败

```bash
# 查看详细日志
ssh root@121.40.167.71 "docker logs node1-authoring"

# 检查服务状态
ssh root@121.40.167.71 "cd /opt/idp-cms && docker compose -f infra/production/docker-compose-ha-node1.yml ps"
```

### 问题3: 服务无法访问

```bash
# 检查端口监听
ssh root@121.40.167.71 "netstat -tulpn | grep -E ':(8000|3000|5432|6379)'"

# 检查防火墙
ssh root@121.40.167.71 "sudo ufw status"
```

---

## 📚 相关文档

- 📖 **完整部署指南**: `deploy/docs/guides/HA_DEPLOYMENT_GUIDE.md`
- 🔧 **运维手册**: `deploy/docs/guides/HA_OPERATIONS.md`
- 🔍 **故障排查**: `deploy/docs/guides/HA_TROUBLESHOOTING.md`
- 🚀 **快速开始**: `deploy/QUICK_DEPLOY_GUIDE.md`

---

## 🎉 常见问题

### Q: 需要在两台服务器都安装代码吗？
**A:** 不需要！脚本会自动从服务器1同步代码到服务器2。

### Q: 部署失败如何回滚？
**A:** 
```bash
# 停止服务
ssh root@121.40.167.71 "cd /opt/idp-cms && docker compose -f infra/production/docker-compose-ha-node1.yml down"
ssh root@121.41.73.49 "cd /opt/idp-cms && docker compose -f infra/production/docker-compose-ha-node2.yml down"
```

### Q: 如何更新部署？
**A:** 重新运行部署脚本即可：
```bash
./deploy-all-from-local.sh
# 或
./deploy/scripts/deploy-all-ha.sh
```

### Q: 密码需要在两台服务器都一样吗？
**A:** 是的！所有服务密码（PostgreSQL、Redis等）必须在两台服务器上完全一致。

---

## 📞 获取帮助

如果遇到问题：

1. 查看日志：`docker logs <container_name>`
2. 运行健康检查：`./deploy/scripts/health-check-ha.sh`
3. 查看故障排查文档：`deploy/docs/guides/HA_TROUBLESHOOTING.md`

---

**祝您部署顺利！** 🚀

