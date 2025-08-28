# Docker Compose 分类自动初始化

## 概述

本配置为 Docker Compose 环境提供了 AI 资讯分类的自动初始化功能，确保在容器启动时自动创建必要的分类数据。

## 功能特性

### 1. 自动分类初始化

- 容器启动时自动检查分类是否存在
- 如果分类不存在，自动运行初始化命令
- 避免重复初始化，提高启动效率

### 2. 智能启动流程

- 等待数据库连接就绪
- 自动运行数据库迁移
- 检查并初始化分类
- 启动 Django 服务器

### 3. 环境变量配置

- `AUTO_INIT_CATEGORIES=true` - 启用自动分类初始化
- 可在`.env`文件中覆盖配置

## 使用方法

### 1. 启动服务

```bash
# 在 infra/local 目录下执行
docker compose up -d
```

### 2. 查看启动日志

```bash
# 查看authoring服务的启动日志
docker compose logs -f authoring
```

你应该能看到类似以下的输出：

```
🚀 启动Django服务...
⏳ 等待数据库连接... (1/30)
⏳ 等待数据库连接... (2/30)
✅ 数据库连接成功！
🔄 运行数据库迁移...
🔍 检查AI资讯分类...
📊 初始化AI资讯分类...
✓ 创建分类: 技术突破
✓ 创建分类: 产品发布
✓ 创建分类: 投资融资
✓ 创建分类: 研究突破
✓ 创建分类: 政策法规
✓ 创建分类: 行业动态
✓ 创建分类: 创业公司
✓ 创建分类: 学术研究
✅ 分类初始化完成！
🌐 启动Django服务器...
```

### 3. 重新初始化分类

如果需要重新初始化分类，可以：

```bash
# 进入authoring容器
docker compose exec authoring bash

# 手动运行初始化命令
python authoring/manage.py init_ai_news_categories
```

或者删除分类后重启服务：

```bash
# 停止服务
docker compose down

# 删除分类数据（可选）
docker compose exec postgres psql -U news -d news -c "DELETE FROM ai_news_ainewscategory;"

# 重新启动服务
docker compose up -d
```

## 配置说明

### 1. 启动脚本 (start_authoring.sh)

启动脚本包含以下步骤：

1. **等待数据库就绪** - 最多等待 60 秒
2. **运行迁移** - 确保数据库结构最新
3. **检查分类** - 统计现有分类数量
4. **初始化分类** - 仅在需要时执行
5. **启动服务器** - 启动 Django 开发服务器

### 2. 环境变量

```yaml
environment:
  # 自动初始化分类
  AUTO_INIT_CATEGORIES: "true"
```

### 3. 依赖关系

```yaml
depends_on:
  postgres:
    condition: service_healthy
  redis:
    condition: service_healthy
  minio:
    condition: service_healthy
  opensearch:
    condition: service_started
  clickhouse:
    condition: service_healthy
```

## 故障排除

### 1. 分类初始化失败

**症状**: 启动日志显示分类初始化错误
**解决方案**:

```bash
# 检查数据库连接
docker compose exec authoring python authoring/manage.py shell -c "from django.db import connection; print(connection.ensure_connection())"

# 手动运行初始化
docker compose exec authoring python authoring/manage.py init_ai_news_categories
```

### 2. 数据库连接超时

**症状**: 启动脚本一直等待数据库
**解决方案**:

```bash
# 检查PostgreSQL服务状态
docker compose ps postgres

# 查看PostgreSQL日志
docker compose logs postgres

# 重启PostgreSQL服务
docker compose restart postgres
```

### 3. 迁移失败

**症状**: 数据库迁移步骤出错
**解决方案**:

```bash
# 检查迁移状态
docker compose exec authoring python authoring/manage.py showmigrations

# 手动运行迁移
docker compose exec authoring python authoring/manage.py migrate
```

## 自定义配置

### 1. 修改启动脚本

编辑 `start_authoring.sh` 文件：

```bash
# 添加自定义初始化步骤
echo "🔧 运行自定义初始化..."
python authoring/manage.py custom_command
```

### 2. 添加新的管理命令

在 `apps/ai_news/management/commands/` 目录下添加新的命令文件，然后在启动脚本中调用。

### 3. 环境特定配置

在 `.env` 文件中添加环境特定配置：

```bash
# 开发环境
AUTO_INIT_CATEGORIES=true
INIT_TIMEOUT=60

# 生产环境
AUTO_INIT_CATEGORIES=false
INIT_TIMEOUT=30
```

## 性能优化

### 1. 跳过不必要的初始化

如果分类已经存在，启动脚本会跳过初始化步骤，提高启动速度。

### 2. 并行初始化

可以考虑将分类初始化放在后台进行，不阻塞 Django 服务器启动。

### 3. 缓存分类数据

在 API 中使用缓存减少数据库查询，提高响应速度。

## 监控和维护

### 1. 日志监控

定期检查启动日志，确保分类初始化正常：

```bash
docker compose logs authoring | grep -E "(分类|分类初始化|分类完成)"
```

### 2. 分类数据验证

定期验证分类数据的完整性：

```bash
docker compose exec authoring python authoring/manage.py shell -c "
from apps.ai_news.models import AINewsCategory
categories = AINewsCategory.objects.all()
print(f'总分类数: {categories.count()}')
for cat in categories:
    print(f'- {cat.name}: {cat.ainews.count()} 篇资讯')
"
```

### 3. 备份和恢复

定期备份分类数据：

```bash
# 备份分类数据
docker compose exec postgres pg_dump -U news -t ai_news_ainewscategory news > categories_backup.sql

# 恢复分类数据
docker compose exec -T postgres psql -U news -d news < categories_backup.sql
```
