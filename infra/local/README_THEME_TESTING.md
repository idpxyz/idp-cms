# 主题系统测试指南

本指南介绍如何在 Docker 开发环境中测试多主题系统。

## 快速开始

### 1. 启动开发环境

```bash
# 启动所有服务
docker compose up -d

# 等待服务启动完成
sleep 30
```

### 2. 运行测试

```bash
# 快速测试（推荐）
./test_theme_system.sh quick

# 完整测试
./test_theme_system.sh full

# 单独测试
./test_theme_system.sh contracts    # 合约测试
./test_theme_system.sh performance  # 性能测试
./test_theme_system.sh lighthouse   # Lighthouse 测试
./test_theme_system.sh build        # 构建测试
```

## 测试项目说明

### 1. 合约测试 (Contracts)

- **目的**: 验证主题接口的兼容性
- **内容**: 检查主题元数据、布局组件、模块定义
- **命令**: `npm run test:contracts`

### 2. 性能测试 (Performance)

- **目的**: 分析包大小和性能指标
- **内容**: Bundle 分析、包大小检查
- **命令**: `npm run test:performance`

### 3. Lighthouse 测试

- **目的**: 检查页面性能和可访问性
- **内容**: 基础页面响应检查
- **注意**: 完整 Lighthouse 审计可单独运行

### 4. 构建测试 (Build)

- **目的**: 验证生产构建是否成功
- **内容**: Next.js 生产构建
- **命令**: `npm run build`

## 访问测试页面

### 主题演示页面

- **配置管理器演示**: http://localhost:3001/config-demo
- **Portal 主题演示**: http://localhost:3001/portal/theme-demo
- **主题测试页面**: http://localhost:3001/portal/theme-test

### 站点页面

- **北京站点**: http://localhost:3001/beijing
- **上海站点**: http://localhost:3001/shanghai
- **杭州站点**: http://localhost:3001/hangzhou
- **深圳站点**: http://localhost:3001/shenzhen

## 故障排除

### 常见问题

1. **服务未启动**

   ```bash
   # 检查服务状态
   docker compose ps

   # 重启服务
   docker compose restart
   ```

2. **数据库迁移失败**

   ```bash
   # 手动运行迁移
   docker compose exec authoring python manage.py migrate core
   ```

3. **构建失败**

   ```bash
   # 清理缓存
   docker compose exec sites rm -rf .next node_modules
   docker compose exec sites npm install
   ```

4. **端口冲突**

   ```bash
   # 检查端口占用
   lsof -i :3001

   # 修改端口映射
   # 编辑 docker-compose.yaml 中的 ports 配置
   ```

### 日志查看

```bash
# 查看所有服务日志
docker compose logs

# 查看特定服务日志
docker compose logs sites
docker compose logs authoring

# 实时查看日志
docker compose logs -f sites
```

## 开发工作流

### 1. 日常开发

```bash
# 启动环境
docker compose up -d

# 快速验证
./test_theme_system.sh quick

# 开发完成后完整测试
./test_theme_system.sh full
```

### 2. 添加新主题

1. 在 `sites/themes/` 下创建主题文件
2. 在 `sites/lib/theme-registry.ts` 中注册主题
3. 运行合约测试验证接口
4. 更新配置管理器中的主题配置

### 3. 添加新站点

1. 在 `sites/app/` 下创建站点目录
2. 在 `sites/app/api/site-settings/route.ts` 中添加配置
3. 运行构建测试验证
4. 更新配置管理器中的站点列表

## 性能监控

### Bundle 分析

- 自动生成包大小报告
- 检查主题相关文件大小
- 监控性能回归

### 性能指标

- 页面加载时间
- 首屏渲染时间
- 主题切换性能

## 最佳实践

1. **定期测试**: 每次代码变更后运行快速测试
2. **性能监控**: 关注 Bundle 大小变化
3. **类型安全**: 确保 TypeScript 类型检查通过
4. **配置验证**: 使用配置管理器验证站点配置
5. **错误处理**: 完善的错误处理和回退机制

## 扩展测试

### 自定义测试

可以在 `test_theme_system.sh` 中添加自定义测试：

```bash
# 添加新的测试函数
run_custom_test() {
    log_info "运行自定义测试..."
    # 你的测试逻辑
}

# 在主流程中调用
run_full_test() {
    # ... 现有测试
    run_custom_test
}
```

### 集成测试

- 可以集成到 CI/CD 流程
- 支持自动化测试报告
- 可配置测试阈值

---

**注意**: 本测试系统基于现有的 Docker Compose 开发环境，无需额外的测试容器。
