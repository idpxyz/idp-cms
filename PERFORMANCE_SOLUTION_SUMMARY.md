# 文章加载性能问题 - 最终解决方案

## 📊 问题现状

### 根本原因
系统运行在 **Next.js 开发模式**，首次访问需要编译：
- **首次访问**: 17秒（11.7秒编译 + 5秒执行）
- **后续访问**: 0.8秒（已编译）

### 已实施的优化 ✅

1. **网络优化** - 服务端使用内部地址
2. **超时优化** - 调整为5秒，平衡性能和用户体验
3. **缓存优化** - 多层缓存策略
4. **错误处理** - 友好的超时页面

## 🚀 最终解决方案

由于Docker镜像源问题无法重建为生产模式，采用**开发模式 + 预热策略**：

### 方案A: 容器启动后预热（推荐）

**操作步骤**：
```bash
# 每次容器重启后执行一次
/opt/idp-cms/warmup-sites.sh
```

**效果**：
- ✅ 触发所有页面的编译
- ✅ 用户访问时已编译完成
- ✅ 响应时间 < 1秒

**自动化配置**：
将预热脚本添加到容器启动后自动执行：

```yaml
# infra/local/docker-compose.yml
sites:
  healthcheck:
    test: ["CMD", "sh", "-c", "wget --spider http://localhost:3000/api/ready && /app/warmup.sh"]
```

### 方案B: 增加服务器资源

如果预热仍然慢，增加容器资源：

```yaml
# infra/local/docker-compose.yml
sites:
  deploy:
    resources:
      limits:
        cpus: '2'      # 增加CPU
        memory: 4G     # 增加内存
      reservations:
        cpus: '1'
        memory: 2G
```

### 方案C: 修复Docker镜像源后切换生产模式（最佳）

**修复镜像源后执行**：
```bash
# 1. 修复Docker daemon配置
sudo vi /etc/docker/daemon.json
# 添加或修改 registry-mirrors

# 2. 重启Docker
sudo systemctl restart docker

# 3. 执行生产模式重建
cd /opt/idp-cms
./rebuild-production.sh
```

## 📈 性能对比

| 方案 | 首次访问 | 后续访问 | 优点 | 缺点 |
|------|----------|----------|------|------|
| **当前（无优化）** | 17秒 | 0.8秒 | 无需操作 | 用户体验差 |
| **预热策略** | 0.8秒 | 0.8秒 | 简单快速 | 需手动执行 |
| **生产模式** | 1秒 | 0.5秒 | 最佳性能 | 需修复镜像源 |

## 🛠️ 当前可用的工具

### 1. 预热脚本
```bash
/opt/idp-cms/warmup-sites.sh
```
- 用途：触发页面编译
- 时机：容器重启后
- 耗时：约1-2分钟

### 2. 性能测试脚本
```bash
/opt/idp-cms/test-article-performance.sh http://192.168.8.196:3001 文章slug 5
```
- 用途：测试文章加载性能
- 输出：平均响应时间

### 3. 重建脚本（待修复镜像源后使用）
```bash
/opt/idp-cms/rebuild-production.sh
```
- 用途：切换到生产模式
- 前提：修复Docker镜像源

## 📋 日常运维流程

### 容器重启后

1. **检查服务状态**
```bash
docker ps | grep sites
```

2. **执行预热**（重要！）
```bash
/opt/idp-cms/warmup-sites.sh
```

3. **验证性能**
```bash
time curl -s http://192.168.8.196:3001/portal/article/xxx -o /dev/null
# 应该 < 1秒
```

### 性能问题排查

如果仍然慢：

1. **检查是否预热**
```bash
# 查看日志，确认页面已编译
docker logs local-sites-1 | grep "Compiled /portal/article"
```

2. **检查后端API**
```bash
time curl -s http://192.168.8.196:8000/api/articles/xxx/ -o /dev/null
# 应该 < 200ms
```

3. **检查网络**
```bash
docker exec local-sites-1 ping authoring
```

## 🎯 性能指标

### 目标
- ✅ **已编译页面**: < 1秒
- ⚠️ **首次访问**: < 2秒（预热后）
- ✅ **API响应**: < 500ms
- ✅ **超时率**: < 1%

### 监控
建议监控以下指标：
1. 页面加载时间
2. API响应时间
3. 超时错误率
4. 用户投诉数

## 💡 最佳实践

### 开发环境
- 使用开发模式
- 定期执行预热

### 测试环境
- 使用生产模式
- 真实性能测试

### 生产环境
- **必须**使用生产模式
- 配置CDN
- 实施监控

## 📝 待办事项

- [ ] 修复Docker镜像源
- [ ] 切换到生产模式
- [ ] 配置自动预热
- [ ] 添加性能监控
- [ ] 实施CDN缓存

## 🔗 相关文档

- [详细问题分析](./COLD_START_ISSUE_SOLUTION.md)
- [性能优化历史](./ARTICLE_PERFORMANCE_OPTIMIZATION.md)
- [预热脚本](./warmup-sites.sh)
- [重建脚本](./rebuild-production.sh)

---

**更新时间**: 2025-10-13  
**状态**: ✅ 临时方案已实施（预热策略）  
**下一步**: 修复镜像源，切换生产模式

