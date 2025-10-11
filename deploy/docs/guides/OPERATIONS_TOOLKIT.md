# 🛠️ 运维工具箱

完整的生产环境运维工具集，用于部署、监控、备份和维护。

---

## 📦 工具清单

| 工具 | 文件 | 说明 | 用途 |
|-----|------|------|------|
| **部署工具** |
| 站点配置器 | `configure-site.sh` | 自动配置站点信息 | 快速设置新站点 |
| Wagtail站点创建 | `create-wagtail-site.sh` | 数据库站点创建 | 初始化站点数据 |
| Nginx生成器 | `generate-nginx-config.sh` | 生成Nginx配置 | 自动配置反向代理 |
| SSL配置 | `setup-ssl.sh` | 自动申请SSL证书 | HTTPS配置 |
| **监控工具** |
| 服务监控 | `monitor.sh` | 全面监控系统 | 检查服务健康状态 |
| **备份工具** |
| 自动备份 | `backup.sh` | 完整备份系统 | 定期数据备份 |
| 数据恢复 | `restore.sh` | 从备份恢复 | 灾难恢复 |

---

## 🚀 快速开始

### 第二台主机部署流程

```bash
# 1. 克隆项目
git clone <仓库> /opt/aivoya-cms
cd /opt/aivoya-cms

# 2. 配置站点（5分钟）
./configure-site.sh
# 输入站点信息：aivoya, AI旅行门户, aivoya.travel

# 3. 启动服务（3分钟）
./start-production.sh

# 4. 创建站点
./create-wagtail-site.sh aivoya "AI旅行门户" aivoya.travel

# 5. 配置 Nginx（2分钟）
./generate-nginx-config.sh
# 输入域名和端口信息

# 6. 安装 Nginx 配置
./install-nginx-aivoya.travel.sh

# 7. 配置 SSL（3分钟）
./setup-ssl.sh aivoya.travel www.aivoya.travel

# ✅ 完成！总计约 15 分钟
```

---

## 📝 详细使用指南

### 1. 站点配置器

**功能：** 自动修改站点配置文件（品牌、域名、主题等）

**使用方法：**

```bash
./configure-site.sh
```

**交互式输入：**
- 站点 ID（如：aivoya）
- 站点名称（如：AI旅行门户）
- 品牌名称（如：AI旅行）
- 生产域名（如：aivoya.travel）
- 主题主色调（如：#06b6d4）

**自动修改的文件：**
- `.env.core` - 核心环境变量
- `.env.production` - 生产环境配置
- `sites/lib/config/sites.ts` - 前端站点配置
- `sites/app/globals.css` - 主题颜色

**备份：** 自动备份到 `backup/site_config_YYYYMMDD_HHMMSS/`

---

### 2. Wagtail 站点创建

**功能：** 在 Wagtail CMS 数据库中创建新站点

**使用方法：**

```bash
./create-wagtail-site.sh <site_id> <site_name> <hostname>
```

**示例：**

```bash
./create-wagtail-site.sh aivoya "AI旅行门户" aivoya.travel
```

**前提条件：**
- 容器必须正在运行
- 数据库已完成迁移

**输出：**
- 创建站点记录
- 设置为默认站点
- 关联根页面

---

### 3. Nginx 配置生成器

**功能：** 自动生成 Nginx 反向代理配置文件

**使用方法：**

```bash
./generate-nginx-config.sh
```

**交互式输入：**
- 域名（如：aivoya.travel）
- 是否添加 www 子域名
- 前端端口（默认：3001）
- 后端端口（默认：8000）
- 是否启用 SSL

**生成文件：**
- `nginx-<domain>.conf` - Nginx 配置文件
- `install-nginx-<domain>.sh` - 安装脚本

**配置特性：**
- ✅ 前端反向代理
- ✅ 后端 API 代理
- ✅ 静态文件缓存
- ✅ WebSocket 支持
- ✅ 安全头配置
- ✅ Gzip 压缩
- ✅ SSL 配置（可选）

**安装配置：**

```bash
# 自动安装
./install-nginx-aivoya.travel.sh

# 或手动安装
sudo cp nginx-aivoya.travel.conf /etc/nginx/sites-available/aivoya.travel
sudo ln -s /etc/nginx/sites-available/aivoya.travel /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

### 4. SSL 自动配置

**功能：** 使用 Let's Encrypt 自动申请和配置 SSL 证书

**使用方法：**

```bash
./setup-ssl.sh <domain1> [domain2] [domain3] ...
```

**示例：**

```bash
# 单域名
./setup-ssl.sh aivoya.travel

# 多域名（主域名 + www）
./setup-ssl.sh aivoya.travel www.aivoya.travel
```

**自动完成：**
1. ✅ 检查 Certbot 安装
2. ✅ 检查 DNS 解析
3. ✅ 申请 SSL 证书
4. ✅ 配置 Nginx SSL
5. ✅ 设置 HTTP 到 HTTPS 重定向
6. ✅ 配置自动续期

**前提条件：**
- DNS 已解析到服务器
- 80 和 443 端口已开放
- Nginx 已运行

**证书管理：**

```bash
# 查看证书
sudo certbot certificates

# 续期测试
sudo certbot renew --dry-run

# 手动续期
sudo certbot renew

# 撤销证书
sudo certbot revoke --cert-path /etc/letsencrypt/live/aivoya.travel/cert.pem
```

---

### 5. 服务监控

**功能：** 全面监控系统和服务健康状态

**使用方法：**

```bash
# 使用默认配置
./monitor.sh

# 指定 Docker Compose 文件
./monitor.sh infra/local/docker-compose.yml

# 设置告警邮箱
ALERT_EMAIL=admin@example.com ./monitor.sh
```

**监控项目：**

1. **容器状态**
   - 运行状态
   - 健康检查
   - 自动告警

2. **资源使用**
   - CPU 使用率
   - 内存使用率
   - 磁盘使用率
   - Docker 容器资源

3. **服务可用性**
   - 后端 API
   - 前端服务
   - PostgreSQL
   - Redis

4. **日志检查**
   - 最近错误日志
   - 异常统计

**输出示例：**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🐳 容器状态检查
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ✅ production-authoring-1: running
  ✅ production-sites-1: running
  ✅ production-postgres-1: running
  ✅ production-redis-1: running

✅ 所有容器运行正常

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 资源使用情况
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  💻 CPU 使用率: 15.3%
  🧠 内存使用: 3.2G / 8.0G (40.0%)
  💾 磁盘使用: 15G / 40G (38%)
```

**定时监控：**

```bash
# 添加 cron 任务（每小时检查一次）
crontab -e

# 添加以下行
0 * * * * cd /opt/idp-cms && ALERT_EMAIL=admin@example.com ./monitor.sh >> /var/log/cms-monitor.log 2>&1
```

---

### 6. 自动备份

**功能：** 完整备份数据库、媒体文件和配置

**使用方法：**

```bash
# 默认备份
./backup.sh

# 自定义备份目录
BACKUP_DIR=/mnt/backups ./backup.sh

# 保留 30 天的备份
RETENTION_DAYS=30 ./backup.sh

# 自定义备份名称
BACKUP_NAME=aivoya ./backup.sh
```

**备份内容：**

1. **PostgreSQL 数据库**
   - 完整 SQL 导出
   - Gzip 压缩

2. **媒体文件**
   - 所有上传的图片和文件
   - Tar.gz 压缩

3. **配置文件**
   - 环境变量文件
   - Docker Compose 配置
   - Nginx 配置（如果存在）

4. **备份清单**
   - 文件列表
   - 恢复说明

**备份结构：**

```
backups/
└── cms-20251011_143025/
    ├── database.sql.gz      # 数据库备份
    ├── media.tar.gz         # 媒体文件
    ├── configs.tar.gz       # 配置文件
    └── MANIFEST.txt         # 备份清单
```

**自动备份配置：**

```bash
# 每天凌晨 2 点自动备份
crontab -e

# 添加以下行
0 2 * * * cd /opt/idp-cms && ./backup.sh >> /var/log/cms-backup.log 2>&1

# 每周日备份到远程服务器
0 3 * * 0 cd /opt/idp-cms && ./backup.sh && rsync -av backups/ user@backup-server:/backups/cms/
```

**备份策略建议：**

| 环境 | 备份频率 | 保留时间 | 备份位置 |
|-----|---------|---------|---------|
| 开发环境 | 每周 | 7 天 | 本地磁盘 |
| 测试环境 | 每天 | 14 天 | 本地磁盘 |
| 生产环境 | 每天 | 30 天 | 本地 + 远程 |

---

### 7. 数据恢复

**功能：** 从备份恢复数据库、媒体文件和配置

**使用方法：**

```bash
# 查看可用备份
ls -l backups/

# 恢复指定备份
./restore.sh backups/cms-20251011_143025
```

**恢复流程：**

1. **显示备份信息**
   - 备份时间
   - 文件列表
   - 大小信息

2. **确认操作**
   - ⚠️ 警告：将覆盖当前数据

3. **自动备份当前数据**
   - 以防恢复失败
   - 保存到临时目录

4. **恢复数据**
   - 恢复数据库
   - 恢复媒体文件
   - 恢复配置文件

5. **重启服务**
   - 询问是否重启
   - 验证服务状态

**示例：**

```bash
$ ./restore.sh backups/cms-20251011_143025

╔══════════════════════════════════════════════════════════════════════╗
║          🔄 数据恢复系统                                              ║
╚══════════════════════════════════════════════════════════════════════╝

备份目录: backups/cms-20251011_143025

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 备份信息
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

备份时间: 2025-10-11 14:30:25
主机名: aivoya-server
备份名称: cms

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  警告：此操作将覆盖当前数据！
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

恢复内容:
  • 数据库
  • 媒体文件
  • 配置文件

确认继续？输入 'yes' 继续: yes

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣  恢复数据库
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 解压数据库备份...
💾 备份当前数据库（以防万一）...
🔄 恢复数据库...
✅ 数据库恢复完成

...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 恢复完成！
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

恢复时间: 45s

📝 下一步:
  1. 检查服务状态: docker compose ps
  2. 查看日志: docker compose logs -f
  3. 访问网站验证功能
```

---

## 🔧 环境变量

所有脚本支持的环境变量：

| 变量 | 说明 | 默认值 | 示例 |
|-----|------|--------|------|
| `BACKUP_DIR` | 备份目录 | `./backups` | `/mnt/backups` |
| `RETENTION_DAYS` | 备份保留天数 | `7` | `30` |
| `BACKUP_NAME` | 备份名称前缀 | `cms` | `aivoya` |
| `COMPOSE_FILE` | Docker Compose 文件 | `infra/production/docker-compose.yml` | `infra/local/docker-compose.yml` |
| `ALERT_EMAIL` | 告警邮箱 | 无 | `admin@example.com` |

**使用示例：**

```bash
# 设置单个变量
BACKUP_DIR=/mnt/backups ./backup.sh

# 设置多个变量
BACKUP_DIR=/mnt/backups RETENTION_DAYS=30 BACKUP_NAME=aivoya ./backup.sh

# 导出变量（对所有命令生效）
export BACKUP_DIR=/mnt/backups
export ALERT_EMAIL=admin@example.com
./backup.sh
./monitor.sh
```

---

## 📊 最佳实践

### 部署流程

1. **本地测试**
   ```bash
   # 先在本地测试所有配置
   ./start.sh
   ```

2. **生产部署**
   ```bash
   # 配置站点
   ./configure-site.sh
   
   # 启动生产环境
   ./start-production.sh
   
   # 创建站点
   ./create-wagtail-site.sh <id> <name> <domain>
   ```

3. **配置域名**
   ```bash
   # 生成 Nginx 配置
   ./generate-nginx-config.sh
   
   # 安装配置
   ./install-nginx-<domain>.sh
   
   # 配置 SSL
   ./setup-ssl.sh <domain>
   ```

### 监控策略

```bash
# 1. 设置实时监控（每小时）
crontab -e
0 * * * * cd /opt/idp-cms && ALERT_EMAIL=admin@example.com ./monitor.sh >> /var/log/cms-monitor.log 2>&1

# 2. 手动检查
./monitor.sh

# 3. 生成详细报告
./monitor.sh --report
```

### 备份策略

```bash
# 1. 每日自动备份
crontab -e
0 2 * * * cd /opt/idp-cms && ./backup.sh >> /var/log/cms-backup.log 2>&1

# 2. 每周远程备份
0 3 * * 0 rsync -av /opt/idp-cms/backups/ user@backup-server:/backups/cms/

# 3. 每月完整备份
0 4 1 * * cd /opt/idp-cms && BACKUP_NAME=monthly ./backup.sh
```

### 安全建议

1. **限制脚本权限**
   ```bash
   chmod 700 *.sh
   ```

2. **使用环境变量存储敏感信息**
   ```bash
   export DB_PASSWORD="secret"
   export ALERT_EMAIL="admin@example.com"
   ```

3. **定期更新**
   ```bash
   # 系统更新
   sudo apt update && sudo apt upgrade
   
   # Docker 镜像更新
   docker compose pull
   docker compose up -d
   ```

---

## 🆘 故障排查

### 常见问题

**1. 容器启动失败**

```bash
# 查看日志
docker compose logs <service_name>

# 检查配置
docker compose config

# 重启服务
docker compose restart <service_name>
```

**2. 数据库连接失败**

```bash
# 检查数据库
docker compose exec postgres pg_isready

# 查看连接
docker compose exec postgres psql -U postgres -c "\l"

# 重启数据库
docker compose restart postgres
```

**3. SSL 证书申请失败**

```bash
# 检查 DNS
host <domain>

# 检查端口
sudo netstat -tlnp | grep -E ':(80|443)'

# 查看日志
sudo less /var/log/letsencrypt/letsencrypt.log
```

**4. 备份失败**

```bash
# 检查磁盘空间
df -h

# 检查权限
ls -la backups/

# 手动测试数据库导出
docker compose exec postgres pg_dump -U postgres cms > test.sql
```

---

## 📞 获取帮助

所有脚本都支持 `--help` 参数：

```bash
./configure-site.sh --help
./generate-nginx-config.sh --help
./setup-ssl.sh --help
./monitor.sh --help
./backup.sh --help
./restore.sh --help
```

---

## 📚 相关文档

- `DEPLOY_SECOND_HOST.md` - 第二台主机部署指南
- `MULTI_SITE_DEPLOYMENT_GUIDE.md` - 多站点部署方案
- `PRODUCTION_DEPLOYMENT_GUIDE.md` - 生产环境部署指南
- `ADAPTIVE_LAYOUT_OPTIMIZATION.md` - 布局优化说明

---

**最后更新：** 2025-10-11  
**版本：** 1.0.0  
**维护者：** DevOps Team

