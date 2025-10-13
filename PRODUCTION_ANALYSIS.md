# 生产环境配置分析

## 📊 当前生产环境状态

### ✅ 配置正确的部分

1. **Sites服务使用生产模式** ✅
```yaml
sites:
  build:
    target: production  # 正确使用生产模式
  environment:
    - NODE_ENV=production  # 正确设置环境
```

2. **没有挂载源代码** ✅
```yaml
# 生产模式不挂载volumes - 正确！
# 使用构建时的代码，无需volume
```

3. **环境变量配置合理** ✅
```yaml
- CMS_ORIGIN=http://authoring:8000  # 内部地址
- FRONTEND_PUBLIC_URL=${FRONTEND_PUBLIC_URL}  # 外部地址
```

### 🔍 发现的问题

#### 问题1: start-production.sh使用了错误的服务名

**错误**:
```bash
# Line 71 原来写的是
docker compose up -d portal
```

**问题**: docker-compose.yml中服务名是`sites`，不是`portal`

**已修复**:
```bash
docker compose up -d sites  # 正确
```

#### 问题2: 缺少服务就绪检查

**原来**: 启动sites后直接结束，不等待服务就绪

**已修复**: 添加60秒的就绪检查
```bash
for i in {1..60}; do
    if curl -s http://localhost:3001/ > /dev/null 2>&1; then
        echo "✅ Sites service is ready!"
        break
    fi
    sleep 2
done
```

### ⚠️ 与开发环境的关键区别

| 配置项 | 开发环境 | 生产环境 | 说明 |
|--------|----------|----------|------|
| **构建目标** | development | production | 生产模式已预编译 |
| **NODE_ENV** | development | production | 环境标识 |
| **源代码挂载** | ✅ 挂载 | ❌ 不挂载 | 生产使用镜像内代码 |
| **node_modules** | 宿主机共享 | 镜像内置 | 生产已打包 |
| **热重载** | ✅ 支持 | ❌ 不支持 | 生产不需要 |
| **预热需求** | ✅ 需要 | ❌ 不需要 | 生产已预编译 |

## 🎯 生产环境的优势

### 1. 无需预热 ✅
- 代码已在构建时编译
- 首次访问即为最快速度
- 无冷启动问题

### 2. 更高安全性 ✅
- 不挂载源代码
- 环境配置独立
- 生产优化的构建

### 3. 更好性能 ✅
- 代码压缩和优化
- Tree shaking
- 静态资源优化

## 📋 生产环境启动流程

### 正确的启动方式

```bash
cd /opt/idp-cms
./start-production.sh
```

### 启动步骤（自动执行）

1. ✅ 检查环境文件（.env.core, .env.production）
2. ✅ 停止现有服务
3. ✅ 启动基础设施（postgres, redis, minio, opensearch）
4. ✅ 等待基础服务健康
5. ✅ 启动authoring服务
6. ✅ 运行数据库迁移
7. ✅ 启动sites服务（生产模式）
8. ✅ 等待sites服务就绪
9. ✅ 显示服务状态

### 预期性能

| 指标 | 开发模式 | 生产模式 |
|------|----------|----------|
| 首次访问 | 15秒（需编译） | **< 1秒** |
| 后续访问 | 0.4秒（预热后） | **< 0.5秒** |
| 需要预热 | ✅ 是 | ❌ 否 |
| 代码热重载 | ✅ 是 | ❌ 否 |

## ⚠️ 生产环境注意事项

### 必须配置的环境变量

确保`.env.production`包含：

```env
# 数据库
POSTGRES_DB=news
POSTGRES_USER=news
POSTGRES_PASSWORD=your_strong_password  # 必须修改

# Django
DJANGO_SECRET_KEY=your_secret_key  # 必须修改
DJANGO_ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# 公共URL
CMS_PUBLIC_URL=https://api.yourdomain.com
FRONTEND_PUBLIC_URL=https://www.yourdomain.com

# MinIO
MINIO_ACCESS_KEY=your_access_key  # 必须修改
MINIO_SECRET_KEY=your_secret_key  # 必须修改
```

### 安全检查清单

- [ ] 修改所有默认密码
- [ ] 配置防火墙规则
- [ ] 启用HTTPS/SSL
- [ ] 配置CORS正确的域名
- [ ] 设置强密码策略
- [ ] 启用日志监控
- [ ] 配置备份策略

## 🔧 问题排查

### 如果Sites服务无法启动

1. **检查Docker镜像是否存在**
```bash
docker images | grep sites
```

2. **查看构建日志**
```bash
docker compose -f infra/production/docker-compose.yml build sites
```

3. **查看运行日志**
```bash
docker compose -f infra/production/docker-compose.yml logs sites
```

### 如果需要重新构建

```bash
cd infra/production
docker compose build --no-cache sites
docker compose up -d sites
```

## 📚 相关文档

- [开发环境快速开始](./QUICK_START.md)
- [性能优化总结](./FINAL_SOLUTION.md)
- [文件说明](./FILES_OVERVIEW.md)

## 🎯 总结

### 生产环境状态: ✅ 配置正确

**优点**:
1. ✅ 使用生产构建模式
2. ✅ 环境变量配置合理
3. ✅ 不挂载源代码（安全）
4. ✅ 无需预热（已预编译）

**已修复**:
1. ✅ 修正服务名称（portal → sites）
2. ✅ 添加就绪检查

**建议**:
1. 确保所有敏感信息已修改
2. 配置HTTPS和域名
3. 启用监控和日志

---

**更新时间**: 2025-10-13  
**状态**: ✅ 生产配置正确，已优化启动脚本

