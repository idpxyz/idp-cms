# 📋 AI旅行站点部署计划

## 🎯 项目概况

**目标：** 在第二台独立主机上部署 AI旅行网站（aivoya.travel）

**现状：**
- 主机 A：已部署党报头条（dangbao.com）
- 主机 B：待部署 AI旅行（aivoya.travel）

**部署方式：** 完全独立部署（无冲突，可直接运行 production）

---

## 📊 总览

| 阶段 | 任务数 | 预计耗时 | 风险等级 |
|-----|--------|---------|---------|
| 前期准备 | 5 | 30分钟 | 低 |
| 环境搭建 | 4 | 20分钟 | 中 |
| 项目配置 | 6 | 15分钟 | 低 |
| 服务部署 | 5 | 10分钟 | 中 |
| 网络配置 | 4 | 15分钟 | 中 |
| 测试验证 | 6 | 20分钟 | 低 |
| 监控备份 | 3 | 15分钟 | 低 |
| **总计** | **33** | **~2小时** | **中** |

---

## 📅 详细计划

### 阶段 1：前期准备（30分钟）

#### 任务 1.1：服务器准备
- [ ] 确认主机 B 服务器信息
  - IP地址：`_______________`
  - SSH访问：`ssh user@ip`
  - 操作系统：Ubuntu 20.04+ / CentOS 8+
  - 最低配置：2核 CPU, 4GB 内存, 40GB 磁盘

**检查命令：**
```bash
# 查看系统信息
uname -a
lsb_release -a

# 查看资源
cat /proc/cpuinfo | grep "processor" | wc -l  # CPU核心数
free -h  # 内存
df -h    # 磁盘
```

**完成标准：** ✅ 服务器可访问，配置满足要求

---

#### 任务 1.2：域名准备
- [ ] 购买/准备域名：`aivoya.travel`
- [ ] 配置 DNS（先不解析，等服务启动后再解析）
  - A记录：`aivoya.travel` → 主机B IP（待添加）
  - A记录：`www.aivoya.travel` → 主机B IP（待添加）

**DNS 检查命令：**
```bash
# 在本地检查DNS（部署后）
host aivoya.travel
nslookup aivoya.travel
```

**完成标准：** ✅ 域名已购买，DNS 控制面板可访问

---

#### 任务 1.3：Git 仓库准备
- [ ] 确认 Git 仓库地址：`_______________`
- [ ] 确认分支：`1011`（或其他）
- [ ] 测试访问权限

**检查命令：**
```bash
# 测试 Git 访问
git ls-remote <仓库地址>
```

**完成标准：** ✅ 可以访问 Git 仓库

---

#### 任务 1.4：收集配置信息
- [ ] 站点 ID：`aivoya`
- [ ] 站点名称：`AI旅行门户`
- [ ] 品牌名称：`AI旅行`
- [ ] 主题主色调：`#06b6d4`（青色）
- [ ] 管理员邮箱：`_______________`
- [ ] 数据库密码：`_______________`（建议生成强密码）

**密码生成命令：**
```bash
# 生成随机强密码
openssl rand -base64 32
```

**完成标准：** ✅ 所有配置信息已确定

---

#### 任务 1.5：备份现有环境
- [ ] 在主机 A 上执行完整备份

**备份命令：**
```bash
cd /opt/idp-cms
./backup.sh
```

**完成标准：** ✅ 备份成功，记录备份位置

---

### 阶段 2：环境搭建（20分钟）

#### 任务 2.1：登录主机 B
```bash
ssh user@主机B_IP
```

**完成标准：** ✅ 成功登录主机 B

---

#### 任务 2.2：安装 Docker
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker

# 添加当前用户到 docker 组
sudo usermod -aG docker $USER

# 重新登录使组权限生效
exit
ssh user@主机B_IP

# 验证安装
docker --version
docker ps
```

**完成标准：** ✅ Docker 安装成功，`docker ps` 可运行

---

#### 任务 2.3：安装 Docker Compose
```bash
# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# 添加执行权限
sudo chmod +x /usr/local/bin/docker-compose

# 创建软链接
sudo ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose

# 验证安装
docker-compose --version
```

**完成标准：** ✅ Docker Compose 安装成功

---

#### 任务 2.4：安装 Nginx（可选，用于反向代理）
```bash
# 安装 Nginx
sudo apt install -y nginx

# 启动 Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# 验证安装
sudo nginx -v
sudo systemctl status nginx
```

**完成标准：** ✅ Nginx 安装并运行

---

### 阶段 3：项目配置（15分钟）

#### 任务 3.1：克隆项目
```bash
# 进入 /opt 目录
cd /opt

# 克隆项目（使用 sudo 以便有权限）
sudo git clone <仓库地址> aivoya-cms

# 切换到项目目录
cd aivoya-cms

# 切换分支
sudo git checkout 1011

# 修改所有权
sudo chown -R $USER:$USER /opt/aivoya-cms
```

**完成标准：** ✅ 项目克隆成功，文件可访问

---

#### 任务 3.2：配置站点信息
```bash
cd /opt/aivoya-cms

# 运行配置脚本
./configure-site.sh

# 按提示输入：
# 站点 ID: aivoya
# 站点名称: AI旅行门户
# 品牌名称: AI旅行
# 生产域名: aivoya.travel
# 主题主色调: #06b6d4
```

**自动修改的文件：**
- `.env.core`
- `.env.production`
- `sites/lib/config/sites.ts`
- `sites/app/globals.css`

**完成标准：** ✅ 配置脚本成功运行，备份已创建

---

#### 任务 3.3：设置敏感信息
```bash
# 编辑 .env.production
nano .env.production

# 修改以下内容：
# - 数据库密码
# - Redis 密码（如果需要）
# - MinIO 密钥
# - OpenSearch 密码
```

**建议配置：**
```bash
POSTGRES_PASSWORD=<强密码>
REDIS_PASSWORD=<强密码>
MINIO_ROOT_PASSWORD=<强密码>
OPENSEARCH_PASSWORD=<强密码>
```

**完成标准：** ✅ 敏感信息已设置

---

#### 任务 3.4：配置防火墙
```bash
# 开放必要端口
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS

# 启用防火墙
sudo ufw enable

# 查看状态
sudo ufw status
```

**完成标准：** ✅ 防火墙配置完成

---

#### 任务 3.5：验证配置
```bash
# 检查环境变量
cat .env.core
cat .env.production

# 检查 Docker Compose 配置
docker-compose -f infra/production/docker-compose.yml config
```

**完成标准：** ✅ 配置文件无错误

---

#### 任务 3.6：创建必要目录
```bash
# 创建数据目录
mkdir -p media
mkdir -p backups
mkdir -p logs

# 设置权限
chmod 755 media backups logs
```

**完成标准：** ✅ 目录创建成功

---

### 阶段 4：服务部署（10分钟）

#### 任务 4.1：启动生产环境
```bash
cd /opt/aivoya-cms

# 启动所有服务
./start-production.sh

# 查看启动日志
docker-compose -f infra/production/docker-compose.yml logs -f
```

**预期输出：**
```
✅ 所有容器启动成功
✅ 数据库迁移完成
✅ 静态文件收集完成
```

**完成标准：** ✅ 所有容器运行中

---

#### 任务 4.2：检查服务状态
```bash
# 查看容器状态
docker-compose -f infra/production/docker-compose.yml ps

# 应该看到所有服务都是 Up 状态
```

**完成标准：** ✅ 所有服务状态正常

---

#### 任务 4.3：创建超级用户
```bash
# 进入 authoring 容器
docker-compose -f infra/production/docker-compose.yml exec authoring bash

# 创建超级用户
python manage.py createsuperuser

# 输入用户名、邮箱和密码
# 退出容器
exit
```

**完成标准：** ✅ 超级用户创建成功

---

#### 任务 4.4：创建 Wagtail 站点
```bash
cd /opt/aivoya-cms

# 运行站点创建脚本
./create-wagtail-site.sh aivoya "AI旅行门户" aivoya.travel
```

**完成标准：** ✅ Wagtail 站点创建成功

---

#### 任务 4.5：初步测试
```bash
# 测试后端
curl http://localhost:8000/api/health/

# 测试前端
curl http://localhost:3001/

# 应该都返回 200 状态码
```

**完成标准：** ✅ 本地访问正常

---

### 阶段 5：网络配置（15分钟）

#### 任务 5.1：生成 Nginx 配置
```bash
cd /opt/aivoya-cms

# 运行 Nginx 配置生成器
./generate-nginx-config.sh

# 按提示输入：
# 域名: aivoya.travel
# 添加 www: yes
# 前端端口: 3001
# 后端端口: 8000
# 启用 SSL: yes
```

**生成文件：**
- `nginx-aivoya.travel.conf`
- `install-nginx-aivoya.travel.sh`

**完成标准：** ✅ Nginx 配置文件生成

---

#### 任务 5.2：安装 Nginx 配置
```bash
# 运行安装脚本
./install-nginx-aivoya.travel.sh

# 确认重启 Nginx
```

**完成标准：** ✅ Nginx 配置安装并重启成功

---

#### 任务 5.3：配置 DNS
**在域名注册商控制面板：**
1. 添加 A 记录：`aivoya.travel` → 主机B IP
2. 添加 A 记录：`www.aivoya.travel` → 主机B IP
3. 等待 DNS 传播（5-10分钟）

**验证 DNS：**
```bash
# 在本地机器上测试
host aivoya.travel
ping aivoya.travel
```

**完成标准：** ✅ DNS 解析正确

---

#### 任务 5.4：配置 SSL 证书
```bash
cd /opt/aivoya-cms

# 运行 SSL 配置脚本
./setup-ssl.sh aivoya.travel www.aivoya.travel

# 输入管理员邮箱
# 等待证书申请完成
```

**完成标准：** ✅ SSL 证书申请成功，HTTPS 可访问

---

### 阶段 6：测试验证（20分钟）

#### 任务 6.1：功能测试清单

**前端测试：**
- [ ] 访问 https://aivoya.travel
- [ ] 首页加载正常
- [ ] 导航菜单工作
- [ ] Hero 轮播显示
- [ ] 文章列表加载

**后台测试：**
- [ ] 访问 https://aivoya.travel/admin/
- [ ] 使用超级用户登录
- [ ] 创建测试文章
- [ ] 上传图片
- [ ] 发布文章

**API 测试：**
```bash
# 测试 API 端点
curl https://aivoya.travel/api/health/
curl https://aivoya.travel/api/channels/
curl https://aivoya.travel/api/articles/?page=1
```

**完成标准：** ✅ 所有测试通过

---

#### 任务 6.2：性能测试
```bash
# 测试响应时间
curl -w "@curl-format.txt" -o /dev/null -s https://aivoya.travel/

# 创建 curl-format.txt
cat > curl-format.txt << 'EOF'
    time_namelookup:  %{time_namelookup}\n
       time_connect:  %{time_connect}\n
    time_appconnect:  %{time_appconnect}\n
      time_redirect:  %{time_redirect}\n
   time_pretransfer:  %{time_pretransfer}\n
 time_starttransfer:  %{time_starttransfer}\n
                    ----------\n
         time_total:  %{time_total}\n
EOF
```

**期望指标：**
- 首页加载时间：< 2秒
- API 响应时间：< 500ms
- SSL 连接时间：< 200ms

**完成标准：** ✅ 性能指标满足要求

---

#### 任务 6.3：安全检查
```bash
# 检查 SSL 安全等级
# 访问 https://www.ssllabs.com/ssltest/
# 输入域名进行测试，目标：A 级或以上

# 检查 HTTP 头
curl -I https://aivoya.travel/

# 应该看到安全头：
# - Strict-Transport-Security
# - X-Frame-Options
# - X-Content-Type-Options
```

**完成标准：** ✅ 安全检查通过

---

#### 任务 6.4：容器健康检查
```bash
cd /opt/aivoya-cms

# 运行监控脚本
./monitor.sh
```

**检查项：**
- 所有容器运行中
- 资源使用正常
- 服务响应正常
- 无错误日志

**完成标准：** ✅ 所有检查通过

---

#### 任务 6.5：日志检查
```bash
# 查看最近的日志
docker-compose -f infra/production/docker-compose.yml logs --tail=100

# 查看特定服务日志
docker-compose -f infra/production/docker-compose.yml logs authoring
docker-compose -f infra/production/docker-compose.yml logs sites

# 检查是否有错误
docker-compose -f infra/production/docker-compose.yml logs | grep -i error
```

**完成标准：** ✅ 无严重错误

---

#### 任务 6.6：跨浏览器测试
- [ ] Chrome：访问 https://aivoya.travel
- [ ] Firefox：访问 https://aivoya.travel
- [ ] Safari：访问 https://aivoya.travel（如有）
- [ ] 移动端：访问网站

**完成标准：** ✅ 所有浏览器显示正常

---

### 阶段 7：监控和备份（15分钟）

#### 任务 7.1：配置监控
```bash
cd /opt/aivoya-cms

# 设置监控邮箱
export ALERT_EMAIL="admin@example.com"

# 添加定时监控（每小时）
crontab -e

# 添加以下行
0 * * * * cd /opt/aivoya-cms && ALERT_EMAIL=admin@example.com ./monitor.sh >> /var/log/cms-monitor.log 2>&1
```

**完成标准：** ✅ 定时监控配置完成

---

#### 任务 7.2：配置自动备份
```bash
# 测试备份脚本
cd /opt/aivoya-cms
./backup.sh

# 验证备份
ls -lh backups/

# 添加定时备份（每天凌晨 2 点）
crontab -e

# 添加以下行
0 2 * * * cd /opt/aivoya-cms && ./backup.sh >> /var/log/cms-backup.log 2>&1
```

**完成标准：** ✅ 自动备份配置完成

---

#### 任务 7.3：文档更新
- [ ] 记录服务器 IP
- [ ] 记录超级用户密码（安全存储）
- [ ] 记录数据库密码（安全存储）
- [ ] 更新运维文档
- [ ] 创建故障排查手册

**完成标准：** ✅ 文档已更新

---

## ✅ 部署检查清单

### 部署前
- [ ] 服务器已准备（IP、SSH、配置）
- [ ] 域名已购买
- [ ] Git 仓库可访问
- [ ] 配置信息已收集
- [ ] 主机 A 已备份

### 部署中
- [ ] Docker 安装成功
- [ ] Docker Compose 安装成功
- [ ] Nginx 安装成功
- [ ] 项目克隆成功
- [ ] 配置文件已修改
- [ ] 服务启动成功
- [ ] 站点创建成功

### 部署后
- [ ] DNS 解析正确
- [ ] SSL 证书有效
- [ ] 前端可访问
- [ ] 后台可登录
- [ ] API 正常工作
- [ ] 性能达标
- [ ] 安全检查通过
- [ ] 监控已配置
- [ ] 备份已配置

---

## 🔥 紧急回滚计划

如果部署过程中出现严重问题，执行以下步骤：

### 回滚步骤

1. **停止服务**
   ```bash
   cd /opt/aivoya-cms
   docker-compose -f infra/production/docker-compose.yml down
   ```

2. **移除 DNS 解析**
   - 删除 A 记录，停止流量

3. **清理 Nginx 配置**
   ```bash
   sudo rm /etc/nginx/sites-enabled/aivoya.travel
   sudo systemctl reload nginx
   ```

4. **保留数据**
   ```bash
   # 数据卷会保留，不用担心数据丢失
   docker volume ls
   ```

5. **问题排查**
   - 查看日志：`docker-compose logs`
   - 检查配置：`docker-compose config`
   - 联系技术支持

---

## 📞 联系信息

### 技术支持
- **开发团队：** ________________
- **运维团队：** ________________
- **紧急联系：** ________________

### 相关文档
- 运维工具箱：`OPERATIONS_TOOLKIT.md`
- 第二台主机部署：`DEPLOY_SECOND_HOST.md`
- 多站点方案：`MULTI_SITE_DEPLOYMENT_GUIDE.md`

---

## 📅 时间表

### 建议部署时间
- **工作日：** 非业务高峰期（晚上 8 点后）
- **周末：** 周六上午（有完整的时间处理问题）

### 预留时间
- 计划时间：2小时
- 预留缓冲：+1小时（处理意外问题）
- 总计：3小时

---

## 🎉 部署完成标志

当以下所有项都完成时，部署即告成功：

- ✅ https://aivoya.travel 可访问
- ✅ HTTPS 证书有效（绿色锁）
- ✅ 后台可登录并管理内容
- ✅ API 正常响应
- ✅ 性能指标达标
- ✅ 安全检查通过
- ✅ 监控告警正常
- ✅ 自动备份运行

**🎊 恭喜！部署成功！**

---

**文档版本：** 1.0  
**创建日期：** 2025-10-11  
**最后更新：** 2025-10-11  
**负责人：** ________________

