# 单节点部署指南

> 快速部署单服务器，未来可平滑升级到高可用双节点架构

## 📋 概述

本指南适用于以下场景：

- ✅ 初期部署，快速上线验证系统
- ✅ 预算有限，单服务器运行
- ✅ 流量较小，单节点足够支撑
- ✅ 为未来扩展预留升级路径

**关键优势**：配置完全兼容 HA 模式，未来 5-15 分钟即可升级到双节点高可用！

## 🏗️ 单节点架构

```
                    ┌─────────────┐
                    │   用户请求   │
                    └──────┬──────┘
                           │
              ┌────────────▼────────────┐
              │   服务器 1 (单节点)      │
              │  121.40.167.71         │
              ├────────────────────────┤
              │ Django (8000)          │
              │ Next.js (3000)         │
              │ PostgreSQL (单机)      │
              │ Redis (单机)           │
              │ MinIO (单机)           │
              │ OpenSearch             │
              │ ClickHouse             │
              └────────────────────────┘
```

## 🚀 快速开始

### 1. 服务器准备

**最低配置**：
- CPU: 4核
- 内存: 8GB
- 磁盘: 100GB SSD
- 系统: Ubuntu 20.04+ / CentOS 7+

**安装 Docker**：

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker
```

### 2. 代码部署

```bash
# 克隆代码（如果未部署）
git clone git@github.com:idpxyz/idp-cms.git /opt/idp-cms
cd /opt/idp-cms

# 切换到 production 分支（不含文档）
git checkout production

# 或使用 master 分支（包含文档）
# git checkout master
```

### 3. 配置环境变量

```bash
# 复制环境变量模板
cp .env.node1.production .env.node1

# 编辑配置文件
vim .env.node1
```

**必须修改的配置项**：

```bash
# 数据库配置
POSTGRES_PASSWORD=your_secure_password_here

# Redis 配置
REDIS_PASSWORD=your_redis_password_here

# MinIO 配置
MINIO_ROOT_USER=admin
MINIO_ROOT_PASSWORD=your_minio_password_here

# Django 配置
SECRET_KEY=your_secret_key_here
DEBUG=false
ALLOWED_HOSTS=121.40.167.71,yourdomain.com

# Next.js 配置
NEXT_PUBLIC_API_URL=http://121.40.167.71:8000
```

### 4. 一键部署

```bash
# 执行部署脚本
chmod +x deploy/scripts/deploy-node1-standalone.sh
./deploy/scripts/deploy-node1-standalone.sh
```

部署脚本会自动执行以下操作：

1. ✅ 环境检查（Docker、docker-compose）
2. ✅ 准备环境变量
3. ✅ 停止现有服务
4. ✅ 创建数据目录
5. ✅ 拉取 Docker 镜像
6. ✅ 启动所有服务
7. ✅ 健康检查
8. ✅ 显示访问地址

### 5. 验证部署

**服务访问地址**：

- 🌐 前端: http://121.40.167.71:3000
- 🔧 后端 API: http://121.40.167.71:8000
- 👨‍💼 管理后台: http://121.40.167.71:8000/admin/
- 📦 MinIO 控制台: http://121.40.167.71:9001

**健康检查**：

```bash
# Django 健康检查
curl http://121.40.167.71:8000/health/

# Next.js 健康检查
curl http://121.40.167.71:3000/api/health

# 查看所有服务状态
docker-compose -f infra/production/docker-compose-ha-node1.yml ps
```

## 📊 服务管理

### 查看日志

```bash
# 查看所有日志
docker-compose -f infra/production/docker-compose-ha-node1.yml logs -f

# 查看特定服务日志
docker-compose -f infra/production/docker-compose-ha-node1.yml logs -f django
docker-compose -f infra/production/docker-compose-ha-node1.yml logs -f nextjs
docker-compose -f infra/production/docker-compose-ha-node1.yml logs -f postgres
```

### 重启服务

```bash
# 重启所有服务
docker-compose -f infra/production/docker-compose-ha-node1.yml restart

# 重启特定服务
docker-compose -f infra/production/docker-compose-ha-node1.yml restart django
docker-compose -f infra/production/docker-compose-ha-node1.yml restart nextjs
```

### 停止服务

```bash
# 停止所有服务
docker-compose -f infra/production/docker-compose-ha-node1.yml down

# 停止并删除数据卷（危险操作！）
docker-compose -f infra/production/docker-compose-ha-node1.yml down -v
```

### 更新代码

```bash
# 拉取最新代码
cd /opt/idp-cms
git pull origin production

# 重建并重启服务
docker-compose -f infra/production/docker-compose-ha-node1.yml up -d --build
```

## 💾 备份策略

### 1. 数据库备份

```bash
# 创建备份目录
mkdir -p /opt/idp-cms/backups

# 手动备份
docker exec $(docker ps -qf "name=postgres") pg_dumpall -U postgres > \
    /opt/idp-cms/backups/postgres_$(date +%Y%m%d_%H%M%S).sql

# 定时备份（添加到 crontab）
0 2 * * * docker exec $(docker ps -qf "name=postgres") pg_dumpall -U postgres > \
    /opt/idp-cms/backups/postgres_$(date +\%Y\%m\%d_\%H\%M\%S).sql
```

### 2. MinIO 数据备份

```bash
# 同步到远程存储（如阿里云 OSS）
# 安装 ossutil 或 mc (MinIO Client)

# 使用 mc 备份
mc mirror /opt/idp-cms/data/minio remote-oss/idp-cms-backup/
```

### 3. 配置文件备份

```bash
# 备份环境变量和配置
tar -czf /opt/idp-cms/backups/config_$(date +%Y%m%d).tar.gz \
    .env.node1 \
    infra/production/ \
    infra/configs/
```

## 🔍 监控和告警

### 基础监控

```bash
# 查看系统资源使用
docker stats

# 查看磁盘使用
df -h

# 查看服务状态
docker-compose -f infra/production/docker-compose-ha-node1.yml ps
```

### 日志监控

```bash
# 监控错误日志
docker-compose -f infra/production/docker-compose-ha-node1.yml logs -f | grep -i error

# 监控访问日志
docker-compose -f infra/production/docker-compose-ha-node1.yml logs -f nginx
```

## 🔧 故障排查

### 常见问题

**1. Django 无法连接数据库**

```bash
# 检查数据库状态
docker exec $(docker ps -qf "name=postgres") pg_isready -U postgres

# 检查网络连接
docker-compose -f infra/production/docker-compose-ha-node1.yml exec django ping postgres

# 检查环境变量
docker-compose -f infra/production/docker-compose-ha-node1.yml config | grep POSTGRES
```

**2. 端口被占用**

```bash
# 查看端口占用
netstat -tuln | grep :8000
netstat -tuln | grep :3000

# 停止占用端口的服务
sudo systemctl stop nginx  # 如果 Nginx 占用了端口
```

**3. 磁盘空间不足**

```bash
# 清理 Docker 无用资源
docker system prune -a

# 清理日志
docker-compose -f infra/production/docker-compose-ha-node1.yml logs --tail=0 -f > /dev/null

# 检查大文件
du -sh /opt/idp-cms/data/*
```

**4. 内存不足**

```bash
# 查看内存使用
free -h

# 限制容器内存（在 docker-compose.yml 中配置）
services:
  django:
    mem_limit: 2g
    mem_reservation: 1g
```

## 🚀 升级到高可用模式

当您需要高可用时，可以平滑升级到双节点架构：

### 触发条件

考虑升级当出现以下情况：

- ⚠️ 流量持续增长，单节点性能瓶颈
- ⚠️ 需要零停机维护能力
- ⚠️ 对服务可用性有更高要求
- ✅ 预算允许增加第二台服务器

### 升级步骤

```bash
# 1. 准备第二台服务器 (121.41.73.49)
#    - 安装 Docker
#    - 配置 SSH 免密登录
#    - 确保网络互通

# 2. 执行升级脚本
chmod +x deploy/scripts/upgrade-to-ha.sh
./deploy/scripts/upgrade-to-ha.sh
```

**升级过程**：

1. 数据备份（自动）
2. 代码同步到服务器2（自动）
3. 服务器1升级为主节点（5分钟停机）
4. 服务器2部署从节点（自动）
5. 配置主从复制（自动）
6. 配置负载均衡（需手动）

**预计时间**：5-15分钟

详细升级指南：[HA_UPGRADE_GUIDE.md](./HA_UPGRADE_GUIDE.md)

## 📝 最佳实践

### 1. 安全加固

```bash
# 配置防火墙（仅开放必要端口）
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable

# 禁止 root SSH 登录
sudo vim /etc/ssh/sshd_config
# PermitRootLogin no

# 使用强密码或密钥认证
ssh-keygen -t ed25519
```

### 2. 性能优化

```bash
# 调整 PostgreSQL 配置
# 在 infra/configs/postgresql/master.conf 中：
shared_buffers = 2GB          # 25% of RAM
effective_cache_size = 6GB    # 75% of RAM
work_mem = 50MB
maintenance_work_mem = 512MB

# 调整 Redis 配置
# 在 infra/configs/redis/redis-master.conf 中：
maxmemory 2gb
maxmemory-policy allkeys-lru
```

### 3. 日志轮转

```bash
# 配置 Docker 日志限制
# 在 /etc/docker/daemon.json 中：
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}

# 重启 Docker
sudo systemctl restart docker
```

### 4. SSL 配置

```bash
# 安装 Certbot
sudo apt install certbot

# 申请证书
sudo certbot certonly --standalone -d yourdomain.com

# 配置 Nginx（如需要）
# 参考 infra/configs/nginx/ssl-ha.conf
```

## 📚 相关文档

- [快速部署指南](./QUICK_DEPLOY_GUIDE.md)
- [HA 升级指南](./HA_UPGRADE_GUIDE.md)
- [运维手册](./docs/guides/HA_OPERATIONS.md)
- [故障排查](./docs/guides/HA_TROUBLESHOOTING.md)

## 💡 常用命令速查

```bash
# 部署
./deploy/scripts/deploy-node1-standalone.sh

# 查看状态
docker-compose -f infra/production/docker-compose-ha-node1.yml ps

# 查看日志
docker-compose -f infra/production/docker-compose-ha-node1.yml logs -f

# 重启服务
docker-compose -f infra/production/docker-compose-ha-node1.yml restart

# 停止服务
docker-compose -f infra/production/docker-compose-ha-node1.yml down

# 备份数据库
docker exec $(docker ps -qf "name=postgres") pg_dumpall -U postgres > backup.sql

# 升级到 HA
./deploy/scripts/upgrade-to-ha.sh
```

## 🆘 获取帮助

如遇到问题，请：

1. 查看日志：`docker-compose logs -f`
2. 检查配置：`docker-compose config`
3. 参考故障排查文档
4. 联系技术支持

---

**祝部署顺利！** 🎉

