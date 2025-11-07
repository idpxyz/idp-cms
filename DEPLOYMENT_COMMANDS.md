# 🚀 部署命令快速参考

## 📖 基本命令

### 完整部署
```bash
./deploy-node1-remote.sh
```
- 🎯 用途：首次部署或完全重新部署
- ⏱️ 耗时：约 15-20 分钟
- 📦 包含：基础设施 + 前后端应用

---

## ⚡ 快速重建（推荐）

### 只重建后端（利用缓存）
```bash
./deploy-node1-remote.sh --rebuild-backend
```
- 🎯 用途：修改了 Python 代码、Django 配置
- ⏱️ 耗时：约 **1 分钟**
- 💡 优势：利用 Docker 层缓存，只重建代码层

### 只重建前端（利用缓存）
```bash
./deploy-node1-remote.sh --rebuild-frontend
```
- 🎯 用途：修改了 React/Next.js 代码、样式
- ⏱️ 耗时：约 **1 分钟**
- 💡 优势：利用 npm 缓存，只重建代码层

### 同时重建前后端（利用缓存）
```bash
./deploy-node1-remote.sh --rebuild-backend --rebuild-frontend
```
- 🎯 用途：同时修改了前后端代码
- ⏱️ 耗时：约 **2-3 分钟**
- 💡 优势：一次性重建所有应用服务

---

## 🔨 完全重建（清除缓存）

### 后端完全重建
```bash
./deploy-node1-remote.sh --rebuild-backend --no-cache
```
- 🎯 用途：遇到缓存问题、依赖冲突
- ⏱️ 耗时：约 **8-10 分钟**
- ⚠️ 警告：会清除所有缓存，重新下载依赖

### 前端完全重建
```bash
./deploy-node1-remote.sh --rebuild-frontend --no-cache
```
- 🎯 用途：npm 依赖问题、node_modules 损坏
- ⏱️ 耗时：约 **5-8 分钟**
- ⚠️ 警告：会清除所有缓存，重新安装 npm 包

### 前后端完全重建
```bash
./deploy-node1-remote.sh --rebuild-backend --rebuild-frontend --no-cache
```
- 🎯 用途：重大更新、依赖大幅变更
- ⏱️ 耗时：约 **12-15 分钟**
- ⚠️ 警告：完全清除缓存，时间较长

### 全部完全重建
```bash
./deploy-node1-remote.sh --no-cache
```
- 🎯 用途：系统性问题、完全清理
- ⏱️ 耗时：约 **15-20 分钟**
- ⚠️ 警告：包含基础设施，时间最长

---

## 📊 性能对比表

| 命令 | 构建内容 | 缓存 | 耗时 | 适用场景 |
|------|---------|------|------|---------|
| `--rebuild-backend` | 后端 | ✅ 利用 | ~1分钟 | ✅ 日常开发（推荐） |
| `--rebuild-frontend` | 前端 | ✅ 利用 | ~1分钟 | ✅ 前端开发（推荐） |
| `--rebuild-backend --rebuild-frontend` | 前后端 | ✅ 利用 | ~2分钟 | ✅ 全栈开发 |
| `--rebuild-backend --no-cache` | 后端 | ❌ 清除 | ~10分钟 | ⚠️ 缓存问题 |
| `--rebuild-frontend --no-cache` | 前端 | ❌ 清除 | ~8分钟 | ⚠️ npm 问题 |
| `--rebuild-backend --rebuild-frontend --no-cache` | 前后端 | ❌ 清除 | ~15分钟 | ⚠️ 重大更新 |
| `--no-cache` | 全部 | ❌ 清除 | ~20分钟 | ⚠️ 系统问题 |

---

## 💡 使用场景示例

### 场景 1: 修改了 Django 模型
```bash
# 1. 修改代码
vim apps/news/models.py

# 2. 快速重建后端
./deploy-node1-remote.sh --rebuild-backend

# ⏱️ 约 1 分钟完成
```

### 场景 2: 更新了前端样式
```bash
# 1. 修改样式
vim sites/app/portal/styles/global.css

# 2. 快速重建前端
./deploy-node1-remote.sh --rebuild-frontend

# ⏱️ 约 1 分钟完成
```

### 场景 3: 同时修改前后端
```bash
# 1. 修改代码
vim apps/api/rest/articles.py
vim sites/app/portal/components/ArticleCard.tsx

# 2. 一次重建
./deploy-node1-remote.sh --rebuild-backend --rebuild-frontend

# ⏱️ 约 2-3 分钟完成
```

### 场景 4: 添加新的 Python 依赖
```bash
# 1. 修改 requirements.txt
echo "requests>=2.31.0" >> requirements.txt

# 2. 快速重建（pip 会使用缓存）
./deploy-node1-remote.sh --rebuild-backend

# ⏱️ 约 3-5 分钟（因为需要安装新包）
```

### 场景 5: 遇到奇怪的缓存问题
```bash
# 使用 --no-cache 清除缓存
./deploy-node1-remote.sh --rebuild-backend --no-cache

# ⏱️ 约 10 分钟（完全重建）
```

---

## 🔍 查看帮助

```bash
./deploy-node1-remote.sh --help
```

输出示例：
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                     部署脚本使用指南
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📖 基本用法：
  ./deploy-node1-remote.sh                                          # 完整部署

🔧 快速重建（推荐，利用缓存）：
  ./deploy-node1-remote.sh --rebuild-backend                        # 只重建后端（~1分钟）
  ./deploy-node1-remote.sh --rebuild-frontend                       # 只重建前端（~1分钟）
  ./deploy-node1-remote.sh --rebuild-backend --rebuild-frontend     # 重建前后端（~2分钟）

🔨 完全重建（清除缓存，慢但干净）：
  ./deploy-node1-remote.sh --rebuild-backend --no-cache             # 后端无缓存（~10分钟）
  ./deploy-node1-remote.sh --rebuild-frontend --no-cache            # 前端无缓存（~8分钟）
  ./deploy-node1-remote.sh --rebuild-backend --rebuild-frontend --no-cache  # 前后端无缓存（~15分钟）
  ./deploy-node1-remote.sh --no-cache                               # 全部无缓存（~20分钟）

💡 使用建议：
  ✅ 日常开发改代码：     ./deploy-node1-remote.sh --rebuild-backend
  ✅ 改了前端样式：       ./deploy-node1-remote.sh --rebuild-frontend
  ✅ 同时改了前后端：     ./deploy-node1-remote.sh --rebuild-backend --rebuild-frontend
  ⚠️  遇到缓存问题：      ./deploy-node1-remote.sh --rebuild-backend --no-cache
  ⚠️  依赖安装失败：      ./deploy-node1-remote.sh --no-cache
```

---

## 🎯 最佳实践

### ✅ 推荐做法

1. **日常开发：使用缓存**
   ```bash
   ./deploy-node1-remote.sh --rebuild-backend  # 快！
   ```

2. **按需重建：只重建修改的部分**
   ```bash
   # 只改了后端 → 只重建后端
   ./deploy-node1-remote.sh --rebuild-backend
   
   # 只改了前端 → 只重建前端
   ./deploy-node1-remote.sh --rebuild-frontend
   ```

3. **验证构建：检查缓存使用**
   ```bash
   # 查看构建日志，确认使用了缓存
   docker compose -f infra/production/docker-compose-ha-node1.yml build authoring 2>&1 | grep "Using cache"
   ```

### ❌ 不推荐做法

1. **频繁使用 --no-cache**
   ```bash
   # ❌ 每次都清缓存，太慢了！
   ./deploy-node1-remote.sh --rebuild-backend --no-cache  # 10分钟
   
   # ✅ 应该用缓存
   ./deploy-node1-remote.sh --rebuild-backend  # 1分钟
   ```

2. **完全部署用于小改动**
   ```bash
   # ❌ 只改了一行代码，却完全部署
   ./deploy-node1-remote.sh  # 20分钟
   
   # ✅ 应该快速重建
   ./deploy-node1-remote.sh --rebuild-backend  # 1分钟
   ```

---

## 🔧 故障排查

### 问题 1: 构建还是很慢

**症状：** 使用 `--rebuild-backend` 仍需要 10 分钟

**检查：**
```bash
# 查看是否使用了缓存
docker compose -f infra/production/docker-compose-ha-node1.yml build authoring 2>&1 | grep -i "using cache"
```

**解决：**
- 如果没看到 "Using cache"，说明缓存失效
- 检查是否修改了 `requirements.txt`
- 检查 `.dockerignore` 是否配置正确

### 问题 2: 依赖安装失败

**症状：** pip 安装包时报错

**解决：**
```bash
# 清除缓存重试
./deploy-node1-remote.sh --rebuild-backend --no-cache
```

### 问题 3: 容器无法启动

**检查日志：**
```bash
# 后端日志
docker logs -f node1-authoring

# 前端日志
docker logs -f node1-frontend
```

**常见原因：**
- 环境变量缺失
- 数据库连接失败
- 端口冲突

---

## 📚 相关文档

- **详细优化说明**: `docs/Docker构建优化说明.md`
- **快速参考**: `DOCKER_BUILD_OPTIMIZATION.md`
- **Docker 最佳实践**: https://docs.docker.com/develop/dev-best-practices/

---

**最后更新**: 2025-10-23  
**版本**: v2.0（支持参数组合）

