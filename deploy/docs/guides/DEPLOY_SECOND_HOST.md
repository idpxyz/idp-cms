# 🚀 第二台主机独立部署指南

## ✅ 您的场景

在**两台不同的独立主机**上部署两个独立网站：

```
主机 A：党报头条 (dangbao.com)      IP: xxx.xxx.xxx.1
主机 B：AI旅行    (aivoya.travel)   IP: xxx.xxx.xxx.2
```

**结论：完全可以直接运行 production！**

---

## 🎯 为什么可以直接运行？

### 不同主机 = 完全隔离 = 无冲突

```
主机 A                      主机 B
┌──────────────────┐        ┌──────────────────┐
│  党报头条         │        │  AI旅行          │
│  端口 8000 ✅    │        │  端口 8000 ✅    │
│  端口 3001 ✅    │        │  端口 3001 ✅    │
│  容器名 xxx ✅   │        │  容器名 xxx ✅   │
│  独立数据库 ✅   │        │  独立数据库 ✅   │
└──────────────────┘        └──────────────────┘
```

每台主机都有：
- ✅ 独立的网络命名空间
- ✅ 独立的端口空间
- ✅ 独立的容器命名空间
- ✅ 独立的文件系统
- ✅ 独立的数据库

---

## 🚀 主机 B 快速部署步骤

### 前提条件

主机 B 需要安装：
- ✅ Docker 和 Docker Compose
- ✅ Git
- ✅ Nginx（可选，用于反向代理）

---

### 步骤 1：克隆项目（2分钟）

```bash
# SSH 登录到主机 B
ssh user@主机B_IP

# 克隆项目
cd /opt
sudo git clone https://github.com/your-repo/idp-cms.git aivoya-cms
cd aivoya-cms

# 切换到最新分支
git checkout 1011
```

---

### 步骤 2：修改配置文件（5分钟）

#### 2.1 修改项目名称和品牌

**文件：`.env.core`**

```bash
# 修改为 AI 旅行
PROJECT_NAME=AI旅行CMS
SITE_NAME=AI旅行门户
BRAND_NAME=AI旅行

# 修改域名（生产环境）
FRONTEND_BASE_URL=https://aivoya.travel
BACKEND_BASE_URL=https://aivoya.travel

# 其他配置保持不变
DJANGO_SETTINGS_MODULE=config.settings.production
```

#### 2.2 修改前端站点配置

**文件：`sites/lib/config/sites.ts`**

将主站点从 `localhost` 改为 `aivoya.travel`：

```typescript
export const DEFAULT_SITES: SiteConfig[] = [
  {
    id: 'aivoya',
    name: 'AI旅行门户',
    hostname: 'aivoya.travel',  // 👈 改为实际域名
    theme: { key: 'portal', layout: 'layout-portal-classic' },
    route: 'portal',
    order: 0
  },
  // 其他地方站点...
];

// 修改主站点函数
export const getMainSite = () => siteManager.getSiteById('aivoya')!;
```

#### 2.3 修改后端域名配置（可选）

**文件：`apps/core/site_utils.py`**

```python
# 更新域名映射
SITE_DOMAIN_MAPPING = {
    'aivoya.travel': 'aivoya',
    'www.aivoya.travel': 'aivoya',
    # ...
}
```

#### 2.4 修改 CORS 配置

**文件：`.env.production`**

```bash
# 允许的前端域名
FRONTEND_ORIGIN=https://aivoya.travel
DJANGO_ALLOWED_HOSTS=aivoya.travel,www.aivoya.travel,localhost

# CORS 配置
CORS_ALLOWED_ORIGINS=https://aivoya.travel,https://www.aivoya.travel
```

---

### 步骤 3：启动生产环境（3分钟）

```bash
cd /opt/aivoya-cms

# 直接运行生产启动脚本
./start-production.sh
```

**启动脚本会自动：**
1. ✅ 检查环境变量
2. ✅ 启动所有容器
3. ✅ 运行数据库迁移
4. ✅ 创建超级用户（首次）
5. ✅ 编译前端资源
6. ✅ 启动服务

---

### 步骤 4：初始化站点数据（5分钟）

#### 4.1 进入 Django 容器

```bash
docker compose -f infra/production/docker-compose.yml exec authoring bash
```

#### 4.2 创建站点

```python
python manage.py shell

# 在 Python shell 中执行：
from wagtail.models import Site, Page

# 获取根页面
root_page = Page.objects.get(id=1)

# 创建 AI 旅行站点
aivoya_site = Site.objects.create(
    hostname='aivoya.travel',
    site_name='AI旅行门户',
    root_page=root_page,
    is_default_site=True,
    port=80
)

print(f"✅ 站点创建成功：{aivoya_site.site_name}")
```

#### 4.3 配置站点设置

访问 Django Admin：
```
https://aivoya.travel/admin/
```

配置：
- Settings → Sites → Site Settings
- 设置站点名称、Logo、主题颜色
- 配置 SEO 信息

---

### 步骤 5：配置域名和 Nginx（5分钟）

#### 5.1 DNS 配置

在域名注册商处添加 A 记录：

```
类型    主机名              值（IP地址）
A       aivoya.travel       主机B_IP
A       www.aivoya.travel   主机B_IP
```

#### 5.2 Nginx 配置

**文件：`/etc/nginx/sites-available/aivoya`**

```nginx
# AI 旅行 - HTTP (自动重定向到 HTTPS)
server {
    listen 80;
    server_name aivoya.travel www.aivoya.travel;
    
    # 让 Certbot 能访问
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # 重定向到 HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

# AI 旅行 - HTTPS
server {
    listen 443 ssl http2;
    server_name aivoya.travel www.aivoya.travel;
    
    # SSL 证书（先用 HTTP，申请证书后取消注释）
    # ssl_certificate /etc/letsencrypt/live/aivoya.travel/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/aivoya.travel/privkey.pem;
    
    # SSL 配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # 前端
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket 支持
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    
    # 后端 API
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Django Admin
    location /admin/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 静态文件
    location /static/ {
        proxy_pass http://localhost:8000;
    }
    
    location /media/ {
        proxy_pass http://localhost:8000;
    }
}
```

启用配置：

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/aivoya /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

#### 5.3 申请 SSL 证书

```bash
# 安装 Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# 申请证书
sudo certbot --nginx -d aivoya.travel -d www.aivoya.travel

# Certbot 会自动：
# 1. 验证域名所有权
# 2. 申请 Let's Encrypt 证书
# 3. 配置 Nginx SSL
# 4. 设置自动续期
```

---

## ✅ 验证部署

### 1. 检查容器状态

```bash
cd /opt/aivoya-cms
docker compose -f infra/production/docker-compose.yml ps
```

应该看到所有容器都在运行：
```
NAME                   STATUS          PORTS
production-postgres-1   Up             5432/tcp
production-redis-1      Up             6379/tcp
production-authoring-1  Up             0.0.0.0:8000->8000/tcp
production-sites-1      Up             0.0.0.0:3001->3000/tcp
...
```

### 2. 检查日志

```bash
# 查看后端日志
docker compose -f infra/production/docker-compose.yml logs authoring

# 查看前端日志
docker compose -f infra/production/docker-compose.yml logs sites
```

### 3. 测试访问

```bash
# 测试后端
curl http://localhost:8000/api/health/

# 测试前端
curl http://localhost:3001/
```

### 4. 浏览器访问

```
前端：https://aivoya.travel/
后台：https://aivoya.travel/admin/
API： https://aivoya.travel/api/
```

---

## 🎨 主题定制（可选）

### 修改主题颜色

**文件：`sites/app/globals.css`**

```css
:root {
  /* AI 旅行主题 - 蓝绿色调 */
  --brand-primary: #06b6d4;     /* cyan-500 */
  --brand-secondary: #0891b2;   /* cyan-600 */
  --brand-accent: #10b981;      /* emerald-500 */
}
```

### 自定义 Logo

1. 上传 Logo 到 Django Admin
2. 在 Site Settings 中配置 Logo URL

### 创建专属频道

在 Django Admin 中：
1. 创建 AI 旅行相关的频道（如：目的地、攻略、酒店）
2. 创建分类和话题
3. 发布内容

---

## 🔧 管理和维护

### 查看服务状态

```bash
cd /opt/aivoya-cms
docker compose -f infra/production/docker-compose.yml ps
```

### 重启服务

```bash
# 重启所有服务
docker compose -f infra/production/docker-compose.yml restart

# 重启特定服务
docker compose -f infra/production/docker-compose.yml restart sites
docker compose -f infra/production/docker-compose.yml restart authoring
```

### 查看日志

```bash
# 实时查看日志
docker compose -f infra/production/docker-compose.yml logs -f

# 查看特定服务日志
docker compose -f infra/production/docker-compose.yml logs -f sites
```

### 更新代码

```bash
cd /opt/aivoya-cms

# 拉取最新代码
git pull origin 1011

# 重启服务
docker compose -f infra/production/docker-compose.yml restart
```

### 数据库备份

```bash
# 备份数据库
docker compose -f infra/production/docker-compose.yml exec postgres \
  pg_dump -U postgres cms > backup_$(date +%Y%m%d).sql

# 恢复数据库
docker compose -f infra/production/docker-compose.yml exec -T postgres \
  psql -U postgres cms < backup_20251011.sql
```

---

## 📊 资源监控

### 系统资源

```bash
# 查看容器资源使用
docker stats

# 查看磁盘使用
df -h

# 查看内存使用
free -h
```

### 应用性能

```bash
# 后端性能
docker compose -f infra/production/docker-compose.yml exec authoring \
  python manage.py check --deploy

# 前端性能（查看构建大小）
docker compose -f infra/production/docker-compose.yml exec sites \
  du -sh /app/.next
```

---

## 🔥 故障排查

### 问题 1：容器启动失败

```bash
# 查看详细日志
docker compose -f infra/production/docker-compose.yml logs authoring

# 常见原因：
# - 端口被占用：检查 8000/3001 端口
# - 环境变量缺失：检查 .env 文件
# - 数据库连接失败：检查 PostgreSQL
```

### 问题 2：前端无法访问

```bash
# 检查前端容器
docker compose -f infra/production/docker-compose.yml logs sites

# 检查 Nginx
sudo nginx -t
sudo systemctl status nginx

# 检查防火墙
sudo ufw status
```

### 问题 3：数据库连接错误

```bash
# 检查 PostgreSQL
docker compose -f infra/production/docker-compose.yml exec postgres \
  psql -U postgres -c "SELECT version();"

# 检查连接配置
docker compose -f infra/production/docker-compose.yml exec authoring \
  python manage.py dbshell
```

---

## 🎉 部署完成！

现在您有两个完全独立的网站：

```
主机 A：党报头条
  • dangbao.com
  • 独立数据库
  • 独立管理后台

主机 B：AI 旅行
  • aivoya.travel
  • 独立数据库
  • 独立管理后台
```

---

## 📞 下一步

### 内容管理

1. 登录后台：https://aivoya.travel/admin/
2. 创建频道和分类
3. 发布文章内容
4. 配置导航菜单

### 性能优化

1. 启用 CDN
2. 配置缓存
3. 图片优化
4. 数据库索引

### 安全加固

1. 配置防火墙
2. 启用 fail2ban
3. 定期更新系统
4. 数据库备份自动化

---

## 📚 相关文档

- `PRODUCTION_DEPLOYMENT_GUIDE.md` - 生产部署详细指南
- `MULTI_SITE_DEPLOYMENT_GUIDE.md` - 多站点部署方案
- `ADAPTIVE_LAYOUT_OPTIMIZATION.md` - 布局优化说明

---

**祝部署顺利！** 🚀

