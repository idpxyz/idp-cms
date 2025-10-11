# 📋 文档修复清单 - 紧急修正事项

> **状态**: 🔴 高优先级 - 文档与实际代码严重不符  
> **影响**: 按照现有文档操作会导致命令执行失败  
> **生成时间**: 2025-10-11

---

## ⚡ 快速修复（立即执行）

### 1. 修正 Docker Compose 文件扩展名 🔴

**问题**: 所有开发环境命令都会失败

**错误示例** (DEPLOYMENT.md, README.md):
```bash
docker compose -f infra/local/docker-compose.yaml up -d
```

**正确命令**:
```bash
docker compose -f infra/local/docker-compose.yml up -d
```

**影响文件**:
- `DEPLOYMENT.md` - 约 10+ 处
- `README.md` - 约 8+ 处
- `QUICK_START.md` - 需检查

---

### 2. 修正 manage.py 路径 🔴

**错误示例**:
```bash
python authoring/manage.py migrate
```

**正确命令**:
```bash
python manage.py migrate
```

**影响**: 所有 Django 管理命令文档

---

### 3. 更新环境变量配置说明 🔴

**文档错误说明**:
```bash
cp env.example .env
nano .env
```

**实际配置结构**:
```bash
# 项目使用多文件分层配置
.env.core         # 核心配置 (已存在)
.env.features     # 功能配置 (已存在)
.env.development  # 开发配置 (已存在)
.env.production   # 生产配置 (需从 env.production.example 创建)
```

---

### 4. 补充 Sites 前端服务说明 🔴

**文档遗漏**: 完全没有提到新的 `sites` 前端服务

**实际服务**:
```yaml
portal: 端口 3000 (旧的单站点前端)
sites:  端口 3001 (新的多站点前端) ⭐ 未记录
```

---

## 📊 完整端口映射表（更新版）

| 服务 | 开发环境端口 | 生产环境端口 | 说明 |
|------|-------------|-------------|------|
| authoring | 8000 | 8000 | Django/Wagtail |
| portal | 3000 | 3000 | 旧前端 |
| **sites** 🆕 | **3001** | - | **新前端（未记录）** |
| postgres | 5438 | 5432 | 注意端口不同 |
| redis | 6379 | 6379 | |
| minio | 9002 | 9000 | 注意端口不同 |
| minio-console | 9001 | 9001 | |
| opensearch | 9200 | 9200 | |
| clickhouse | 8123 | - | 仅开发环境 |

---

## 🔧 正确的命令速查

### 开发环境启动

```bash
# 方式1: 使用自动化脚本 (推荐)
./start.sh

# 方式2: 手动启动
docker compose -f infra/local/docker-compose.yml up -d --build

# 清理数据重新开始
./start.sh --clean
```

### 数据库操作

```bash
# 迁移
docker compose -f infra/local/docker-compose.yml exec authoring python manage.py migrate

# 创建超级用户
docker compose -f infra/local/docker-compose.yml exec authoring python manage.py createsuperuser

# 收集静态文件
docker compose -f infra/local/docker-compose.yml exec authoring python manage.py collectstatic --noinput
```

### 查看日志

```bash
# 查看所有服务
docker compose -f infra/local/docker-compose.yml logs -f

# 查看特定服务
docker compose -f infra/local/docker-compose.yml logs -f authoring
docker compose -f infra/local/docker-compose.yml logs -f sites
```

### 服务访问地址

```bash
# 后端和管理
http://localhost:8000          # API
http://localhost:8000/admin/   # Wagtail Admin

# 前端
http://localhost:3001/         # Sites ⭐ (唯一前端)

# 基础设施
http://localhost:9001/         # MinIO Console
http://localhost:5601/         # OpenSearch Dashboards
http://localhost:8123/         # ClickHouse
```

---

## 📚 需要更新的文档列表

### 高优先级

- [ ] `DEPLOYMENT.md` - 修正所有命令和配置说明
- [ ] `README.md` - 更新快速开始和服务列表
- [ ] 创建 `ENVIRONMENT_CONFIG.md` - 详细说明环境配置

### 中优先级

- [ ] `QUICK_START.md` - 验证并更新所有命令
- [ ] 创建 `FRONTEND_ARCHITECTURE.md` - 说明双前端架构
- [ ] 更新端口配置文档

---

## 🎯 快速参考：新的环境配置架构

### .env.core (核心配置)
```bash
DJANGO_SECRET_KEY=...
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,192.168.8.195,portal.local
POSTGRES_DB=news
POSTGRES_USER=news
POSTGRES_PASSWORD=news
REDIS_URL=redis://redis:6379/1

# 新的统一 URL 管理
CMS_ORIGIN=http://authoring:8000          # 容器内访问
CMS_PUBLIC_URL=http://localhost:8000      # 浏览器访问
FRONTEND_ORIGIN=http://localhost:3000
FRONTEND_PUBLIC_URL=http://localhost:3001
```

### .env.features (功能配置)
```bash
# MinIO
MINIO_ENDPOINT=http://minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# OpenSearch
OPENSEARCH_URL=http://opensearch:9200
OPENSEARCH_SECURITY_DISABLED=true

# ClickHouse
CLICKHOUSE_URL=clickhouse://default:thends@clickhouse:9000/default

# 功能开关
ENABLE_MEDIA_CLEANUP=false
FF_FEED_USE_LGBM=0
```

---

## 📞 获取更多信息

- 完整分析报告: `PROJECT_ANALYSIS_AND_DOCUMENTATION_AUDIT.md`
- 原部署文档: `DEPLOYMENT.md` (需更新)
- 项目 README: `README.md` (需更新)

---

**更新建议**: 建议先按照本文档修正关键命令，然后参考完整分析报告进行系统性文档更新。

