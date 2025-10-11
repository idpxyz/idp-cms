# ⚡ 快速开始 - 15分钟部署 AI旅行站点

**目标：** 在第二台主机上快速部署 AI旅行网站

**前提条件：**
- ✅ 主机 B 已准备（Ubuntu 20.04+, 2核4G内存, 40GB磁盘）
- ✅ 已安装 Docker & Docker Compose
- ✅ 域名已购买（aivoya.travel）

---

## 🚀 部署步骤

### 步骤 1：克隆项目（2分钟）

```bash
# SSH 登录到主机 B
ssh user@主机B_IP

# 克隆项目
cd /opt
sudo git clone https://github.com/your-repo/idp-cms.git aivoya-cms
cd aivoya-cms
sudo git checkout 1011
sudo chown -R $USER:$USER /opt/aivoya-cms
```

---

### 步骤 2：配置站点（5分钟）

```bash
# 运行配置脚本
./configure-site.sh
```

**输入以下信息：**
- 站点 ID: `aivoya`
- 站点名称: `AI旅行门户`
- 品牌名称: `AI旅行`
- 生产域名: `aivoya.travel`
- 主题主色调: `#06b6d4`

✅ **自动完成：** 修改所有配置文件，创建备份

---

### 步骤 3：启动服务（3分钟）

```bash
# 启动生产环境
./start-production.sh

# 等待所有容器启动...
# 创建站点
./create-wagtail-site.sh aivoya "AI旅行门户" aivoya.travel
```

✅ **自动完成：** 启动容器，数据库迁移，创建站点

---

### 步骤 4：配置 Nginx（2分钟）

```bash
# 生成 Nginx 配置
./generate-nginx-config.sh
```

**输入以下信息：**
- 域名: `aivoya.travel`
- 添加 www: `yes`
- 前端端口: `3001` (直接回车)
- 后端端口: `8000` (直接回车)
- 启用 SSL: `yes`

```bash
# 安装配置
./install-nginx-aivoya.travel.sh
```

✅ **自动完成：** 生成并安装 Nginx 配置

---

### 步骤 5：配置 DNS（手动操作）

**在域名注册商控制面板：**
1. 添加 A 记录：`aivoya.travel` → 主机B IP
2. 添加 A 记录：`www.aivoya.travel` → 主机B IP
3. 等待 DNS 生效（5-10分钟）

**验证 DNS：**
```bash
host aivoya.travel
ping aivoya.travel
```

---

### 步骤 6：配置 SSL（3分钟）

```bash
# 运行 SSL 配置脚本
./setup-ssl.sh aivoya.travel www.aivoya.travel
```

**输入管理员邮箱：** `admin@example.com`

✅ **自动完成：** 申请证书，配置 HTTPS，设置自动续期

---

## ✅ 完成！

访问您的网站：
- **前端：** https://aivoya.travel
- **后台：** https://aivoya.travel/admin/

---

## 📊 验证部署

```bash
# 运行监控检查
./monitor.sh

# 应该看到：
# ✅ 所有容器运行正常
# ✅ 资源使用正常
# ✅ 服务响应正常
```

---

## 💾 设置自动备份

```bash
# 执行一次备份测试
./backup.sh

# 设置定时备份
crontab -e

# 添加以下行（每天凌晨2点备份）
0 2 * * * cd /opt/aivoya-cms && ./backup.sh >> /var/log/cms-backup.log 2>&1
```

---

## 🔧 常用命令

```bash
# 查看服务状态
docker-compose -f infra/production/docker-compose.yml ps

# 查看日志
docker-compose -f infra/production/docker-compose.yml logs -f

# 重启服务
docker-compose -f infra/production/docker-compose.yml restart

# 监控系统
./monitor.sh

# 执行备份
./backup.sh

# 恢复数据
./restore.sh backups/cms-YYYYMMDD_HHMMSS
```

---

## 🆘 故障排查

### 问题：容器启动失败
```bash
# 查看日志
docker-compose -f infra/production/docker-compose.yml logs

# 重新启动
docker-compose -f infra/production/docker-compose.yml down
./start-production.sh
```

### 问题：无法访问网站
```bash
# 检查容器状态
docker-compose -f infra/production/docker-compose.yml ps

# 检查 Nginx
sudo nginx -t
sudo systemctl status nginx

# 检查防火墙
sudo ufw status
```

### 问题：SSL 证书失败
```bash
# 检查 DNS
host aivoya.travel

# 检查端口
sudo netstat -tlnp | grep -E ':(80|443)'

# 查看日志
sudo less /var/log/letsencrypt/letsencrypt.log
```

---

## 📚 更多文档

- **详细部署计划：** `DEPLOYMENT_PLAN.md`
- **完整工具文档：** `OPERATIONS_TOOLKIT.md`
- **测试报告：** `TOOLS_TEST_REPORT.md`
- **多站点方案：** `MULTI_SITE_DEPLOYMENT_GUIDE.md`

---

**祝您部署顺利！** 🎉
