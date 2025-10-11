# 🌐 多站点部署指南

## 📋 项目现状

您的项目**本身就是一个多站点系统**！项目最初是为"AI旅行"（aivoya）设计的，现在改成了"党报头条"。

### 当前配置的站点

```
1. localhost            → 本地开发
2. aivoya.com           → AI旅行主站（原设计）
3. beijing.aivoya.com   → 北京站
4. shanghai.aivoya.com  → 上海站
5. hangzhou.aivoya.com  → 杭州站
6. shenzhen.aivoya.com  → 深圳站
```

### 配置文件位置

- **前端站点配置：** `sites/lib/config/sites.ts`
- **后端站点配置：** `apps/core/site_config.py`
- **数据库站点管理：** Wagtail Sites (Django Admin)

---

## 🎯 方案对比

### 方案 A：多站点共享模式（推荐）✨

**一套系统，多个站点**

```
┌─────────────────────────────────────────┐
│     同一套 Docker 容器                   │
│  ┌──────────────────────────────────┐   │
│  │  Django/Wagtail CMS 后台          │   │
│  │  (统一管理多个站点)                │   │
│  └──────────────────────────────────┘   │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │  Next.js 前端                     │   │
│  │  (根据域名加载不同主题)            │   │
│  └──────────────────────────────────┘   │
│                                          │
│  根据访问域名返回不同内容：              │
│  • dangbao.com      → 党报头条         │
│  • aivoya.travel    → AI旅行           │
│  • beijing.aivoya.com → 北京站         │
└─────────────────────────────────────────┘
```

**优势：**
- ✅ 共享后台管理系统
- ✅ 共享数据库和资源
- ✅ 独立域名和品牌
- ✅ 独立主题和配置
- ✅ 节省服务器资源（一套容器）
- ✅ 统一维护和更新
- ✅ 可以跨站点共享内容

**劣势：**
- ⚠️ 所有站点共享同一数据库
- ⚠️ 性能瓶颈会影响所有站点

---

### 方案 B：完全独立部署

**两套完全独立的系统**

```
┌──────────────────────┐  ┌──────────────────────┐
│  党报头条系统         │  │  AI旅行系统          │
│  dangbao.com         │  │  aivoya.travel       │
│                      │  │                      │
│  • 独立容器          │  │  • 独立容器          │
│  • 独立数据库        │  │  • 独立数据库        │
│  • 独立端口          │  │  • 独立端口          │
│  • 8000/3001        │  │  • 8001/3002        │
└──────────────────────┘  └──────────────────────┘
```

**优势：**
- ✅ 完全独立的系统
- ✅ 独立的数据库
- ✅ 更高的隔离性和安全性
- ✅ 可以使用不同版本的代码

**劣势：**
- ❌ 需要 2 倍的服务器资源
- ❌ 需要维护两套系统
- ❌ 数据不共享，管理复杂

---

## 🚀 方案 A 实施步骤（推荐）

### 第 1 步：了解当前站点配置

```bash
# 查看前端站点配置
cat sites/lib/config/sites.ts

# 查看后端站点配置
python manage.py shell -c "from wagtail.models import Site; print(list(Site.objects.values_list('hostname', 'site_name')))"
```

### 第 2 步：更新前端站点配置

编辑 `sites/lib/config/sites.ts`：

```typescript
export const DEFAULT_SITES: SiteConfig[] = [
  {
    id: 'localhost',
    name: '本地开发',
    hostname: 'localhost',
    theme: { key: 'portal', layout: 'layout-portal-classic' },
    route: 'portal',
    order: 0
  },
  {
    id: 'dangbao',
    name: '党报头条',
    hostname: 'dangbao.com',
    theme: { key: 'portal', layout: 'layout-portal-classic' },
    route: 'portal',
    order: 1
  },
  {
    id: 'aivoya',
    name: 'AI旅行门户',
    hostname: 'aivoya.travel',
    theme: { key: 'portal', layout: 'layout-portal-classic' },
    route: 'portal',
    order: 2
  },
  // ... 其他站点
];
```

### 第 3 步：在后台创建新站点

```bash
# 进入 Django shell
docker compose -f infra/local/docker-compose.yml exec authoring python manage.py shell
```

在 Python shell 中：

```python
from wagtail.models import Site
from wagtail.models import Page

# 获取根页面
root = Page.objects.get(id=1)

# 创建新站点 - 党报头条
dangbao_site = Site.objects.create(
    hostname='dangbao.com',
    site_name='党报头条',
    root_page=root,
    is_default_site=True,  # 设为默认站点
    port=80
)

# 创建新站点 - AI旅行
aivoya_site = Site.objects.create(
    hostname='aivoya.travel',
    site_name='AI旅行门户',
    root_page=root,
    is_default_site=False,
    port=80
)

print("✅ 站点创建成功！")
```

### 第 4 步：配置站点设置

通过 Django Admin 配置每个站点：

```
访问：http://localhost:8000/admin/
路径：Settings → Sites → Site Settings
```

为每个站点配置：
- 站点名称和描述
- 主题颜色
- Logo 和 Favicon
- SEO 设置
- 功能开关

### 第 5 步：创建站点专属内容

```bash
# 进入 Django Admin
# http://localhost:8000/admin/

# 为每个站点创建：
1. 独立的频道（Channel）
2. 独立的分类（Category）
3. 独立的文章内容
```

### 第 6 步：测试本地多站点

**修改本地 hosts 文件：**

```bash
# Linux/Mac
sudo nano /etc/hosts

# Windows
# C:\Windows\System32\drivers\etc\hosts
```

添加：

```
127.0.0.1 dangbao.com
127.0.0.1 aivoya.travel
```

**测试访问：**

```
http://dangbao.com:3001/     → 党报头条
http://aivoya.travel:3001/   → AI旅行
```

### 第 7 步：配置生产环境（域名和 Nginx）

**DNS 配置：**

```
dangbao.com         A记录  →  服务器IP
aivoya.travel       A记录  →  服务器IP
```

**Nginx 配置：**

```nginx
# /etc/nginx/sites-available/multisite

# 党报头条
server {
    listen 80;
    server_name dangbao.com www.dangbao.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
    }
}

# AI旅行
server {
    listen 80;
    server_name aivoya.travel www.aivoya.travel;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/multisite /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 第 8 步：配置 SSL 证书

```bash
# 安装 certbot
sudo apt install certbot python3-certbot-nginx

# 为两个域名申请证书
sudo certbot --nginx -d dangbao.com -d www.dangbao.com
sudo certbot --nginx -d aivoya.travel -d www.aivoya.travel
```

---

## 🚀 方案 B 实施步骤（独立部署）

### 第 1 步：复制项目

```bash
# 为 AI旅行 创建新项目目录
sudo cp -r /opt/idp-cms /opt/aivoya-cms
cd /opt/aivoya-cms
```

### 第 2 步：修改 Docker Compose 配置

**编辑 `infra/local/docker-compose.yml`：**

修改所有端口映射（避免冲突）：

```yaml
services:
  postgres:
    ports:
      - "5433:5432"  # 改为 5433
  
  redis:
    ports:
      - "6380:6379"  # 改为 6380
  
  minio:
    ports:
      - "9001:9000"  # 改为 9001
      - "9091:9090"  # 改为 9091
  
  authoring:
    ports:
      - "8001:8000"  # 改为 8001
  
  sites:
    ports:
      - "3002:3000"  # 改为 3002
```

### 第 3 步：修改容器名称

在 docker-compose.yml 中添加 `container_name`：

```yaml
services:
  postgres:
    container_name: aivoya-postgres-1
  
  redis:
    container_name: aivoya-redis-1
  
  authoring:
    container_name: aivoya-authoring-1
  
  sites:
    container_name: aivoya-sites-1
```

### 第 4 步：修改环境变量

创建独立的环境变量文件：

```bash
# .env.core
PROJECT_NAME=AI旅行CMS
SITE_NAME=AI旅行门户
FRONTEND_BASE_URL=http://localhost:3002
```

### 第 5 步：启动第二套系统

```bash
cd /opt/aivoya-cms

# 启动容器
./start.sh
```

### 第 6 步：初始化数据

```bash
# 进入容器
docker exec -it aivoya-authoring-1 bash

# 运行迁移
python manage.py migrate

# 创建超级用户
python manage.py createsuperuser
```

### 第 7 步：配置 Nginx

```nginx
# 党报头条
server {
    listen 80;
    server_name dangbao.com;
    
    location / {
        proxy_pass http://localhost:3001;  # 第一套系统
    }
}

# AI旅行
server {
    listen 80;
    server_name aivoya.travel;
    
    location / {
        proxy_pass http://localhost:3002;  # 第二套系统
    }
}
```

---

## 📊 资源对比

| 项目 | 方案 A（共享） | 方案 B（独立） |
|-----|--------------|--------------|
| **CPU** | 1x | 2x |
| **内存** | 4-8 GB | 8-16 GB |
| **磁盘** | 20 GB | 40 GB |
| **容器数量** | 8个 | 16个 |
| **维护成本** | 低 | 高 |
| **灵活性** | 中 | 高 |

---

## 🎨 主题定制

### 为不同站点创建独立主题

**目录结构：**

```
sites/
├── themes/
│   ├── dangbao/          # 党报头条主题
│   │   ├── colors.ts
│   │   ├── layout.tsx
│   │   └── components/
│   └── aivoya/           # AI旅行主题
│       ├── colors.ts
│       ├── layout.tsx
│       └── components/
```

**主题配置：**

```typescript
// sites/lib/config/sites.ts
{
  id: 'dangbao',
  theme: { 
    key: 'dangbao', 
    layout: 'layout-news' 
  }
},
{
  id: 'aivoya',
  theme: { 
    key: 'aivoya', 
    layout: 'layout-travel' 
  }
}
```

---

## ✅ 验证和测试

### 测试清单

**多站点功能：**
- [ ] 不同域名返回不同内容
- [ ] 站点间数据隔离（如果需要）
- [ ] 独立的频道和分类
- [ ] 独立的SEO设置

**前端测试：**
- [ ] 不同站点加载不同主题
- [ ] 站点特定的Logo和品牌
- [ ] 独立的导航菜单

**后端测试：**
- [ ] Admin 可以切换站点
- [ ] 内容可以分配到不同站点
- [ ] API 返回站点特定数据

**性能测试：**
- [ ] 页面加载速度
- [ ] 并发访问处理
- [ ] 缓存正常工作

---

## 🔧 常见问题

### Q1: 两个站点可以共享文章吗？

**可以！** Wagtail 支持文章关联多个站点。

```python
# 在 Article 模型中
article.sites.add(dangbao_site, aivoya_site)
```

### Q2: 如何在本地测试多域名？

修改 `/etc/hosts`：

```
127.0.0.1 dangbao.local
127.0.0.1 aivoya.local
```

### Q3: 如何切换默认站点？

```python
from wagtail.models import Site

# 设置默认站点
dangbao = Site.objects.get(hostname='dangbao.com')
dangbao.is_default_site = True
dangbao.save()

# 取消其他站点的默认设置
Site.objects.exclude(id=dangbao.id).update(is_default_site=False)
```

### Q4: 生产环境需要多少服务器资源？

**方案 A（推荐）：**
- 2 核 CPU
- 4-8 GB 内存
- 40 GB 磁盘

**方案 B：**
- 4 核 CPU
- 8-16 GB 内存
- 80 GB 磁盘

---

## 🎉 总结

### 推荐：方案 A（多站点共享）

✅ **适合您的场景：**
- 两个站点都是新闻/内容类网站
- 可以共享后台管理
- 节省服务器成本
- 统一维护更新

### 何时选择方案 B：

- 需要完全独立的数据库
- 两个站点技术栈不同
- 需要不同的更新周期
- 有足够的服务器资源

---

## 📞 下一步行动

**如果选择方案 A：**
1. 我帮您修改前端配置文件
2. 创建后台站点配置
3. 设置本地测试环境
4. 提供生产部署脚本

**如果选择方案 B：**
1. 我帮您创建完整的部署脚本
2. 修改所有必要的配置文件
3. 提供端口映射清单
4. 创建启动和管理脚本

**您选择哪个方案？** 😊

