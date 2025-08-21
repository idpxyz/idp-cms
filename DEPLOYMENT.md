# IDP-CMS 部署指南

## 概述

本文档说明如何在不同环境中部署 IDP-CMS 系统，包括开发环境和生产环境。

## 环境配置

### 1. 开发环境 (Development)

开发环境使用默认配置，适合本地开发和测试：

```bash
# 使用默认配置启动
./start.sh

# 或者清理数据后启动
./start.sh --clean
```

**默认配置特点：**
- CORS 允许所有来源 (`CORS_ALLOW_ALL_ORIGINS=True`)
- 前端使用相对 URL，自动适应当前域名
- 所有服务使用默认端口和配置

### 2. 生产环境 (Production)

生产环境需要更严格的配置：

#### 环境变量配置

创建 `.env` 文件，参考 `env.example`：

```bash
# 复制示例文件
cp env.example .env

# 编辑配置文件
nano .env
```

**关键生产环境配置：**

```bash
# 安全配置
DJANGO_SECRET_KEY=your-very-secure-secret-key-here
DJANGO_DEBUG=0
DJANGO_ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# CORS 配置 - 生产环境必须限制来源
CORS_ALLOW_ALL_ORIGINS=False
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# 数据库配置 - 使用强密码
POSTGRES_PASSWORD=your-strong-db-password
OPENSEARCH_PASSWORD=your-strong-opensearch-password

# 域名配置
SITE_HOSTNAME=yourdomain.com
```

#### 前端配置

前端会自动使用相对 URL，无需额外配置。确保：

1. 前端和后端部署在同一个域名下
2. 或者配置正确的 CORS 来源

## 部署步骤

### 1. 准备环境

```bash
# 克隆代码
git clone <your-repo>
cd idp-cms

# 安装 Docker 和 Docker Compose
# 参考官方文档: https://docs.docker.com/get-docker/
```

### 2. 配置环境变量

```bash
# 复制并编辑环境配置
cp env.example .env
nano .env
```

### 3. 启动服务

```bash
# 开发环境
./start.sh

# 生产环境 (确保已配置 .env)
./start.sh
```

### 4. 验证部署

```bash
# 检查服务状态
docker compose -f infra/local/docker-compose.yaml ps

# 测试 API
curl http://localhost:8000/api/feed?site=yourdomain.com&size=5

# 检查前端
curl http://localhost:3000/
```

## 端口配置

默认端口配置：

| 服务 | 端口 | 说明 |
|------|------|------|
| PostgreSQL | 5438 | 数据库 |
| Redis | 6379 | 缓存 |
| MinIO | 9002 | 对象存储 |
| MinIO Console | 9001 | 管理界面 |
| OpenSearch | 9200 | 搜索引擎 |
| OpenSearch Dashboards | 5601 | 搜索管理界面 |
| ClickHouse | 8123 | 分析数据库 |
| Django (Authoring) | 8000 | 后端 API |
| Next.js (Portal) | 3000 | 前端界面 |

## 安全注意事项

### 1. 生产环境必须配置：

- 强密码
- 限制 CORS 来源
- 禁用调试模式
- 使用 HTTPS
- 配置防火墙

### 2. 环境变量安全：

- 不要在代码中硬编码敏感信息
- 使用环境变量或密钥管理服务
- 定期轮换密码和密钥

### 3. 网络安全：

- 限制数据库端口访问
- 使用 VPN 或私有网络
- 配置 SSL/TLS 证书

## 故障排除

### 常见问题

1. **CORS 错误**
   - 检查 `CORS_ALLOWED_ORIGINS` 配置
   - 确保前端域名在允许列表中

2. **数据库连接失败**
   - 检查数据库服务状态
   - 验证连接参数

3. **前端无法访问后端**
   - 检查网络配置
   - 验证端口映射

### 日志查看

```bash
# 查看服务日志
docker compose -f infra/local/docker-compose.yaml logs authoring
docker compose -f infra/local/docker-compose.yaml logs portal

# 实时日志
docker compose -f infra/local/docker-compose.yaml logs -f authoring
```

## 更新和维护

### 1. 代码更新

```bash
git pull origin main
docker compose -f infra/local/docker-compose.yaml down
./start.sh
```

### 2. 数据备份

```bash
# 数据库备份
docker compose -f infra/local/docker-compose.yaml exec postgres pg_dump -U news news > backup.sql

# 文件备份
tar -czf files_backup.tar.gz media/ configs/
```

### 3. 监控

建议配置监控工具：
- 服务健康检查
- 日志聚合
- 性能监控
- 告警通知

## 支持

如遇到问题，请：

1. 查看日志文件
2. 检查环境配置
3. 参考本文档
4. 联系技术支持团队 