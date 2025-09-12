# 多主题架构实施计划

基于 `docs/TODO/themes.md` 的设计方案，本文档详细规划多主题架构的实施步骤。

## 🎯 目标概述

实现一个企业级的多主题系统，支持：

- 主题动态切换和版本管理
- 站点级别的主题自定义
- 渐进式主题迁移
- 灰度发布和回滚机制

## 📂 目标架构

```
sites/
├── themes/                    # 主题库
│   ├── portal/
│   │   └── v1/
│   │       ├── index.ts       # 主题入口
│   │       ├── tokens.ts      # 设计令牌
│   │       └── layouts/       # 布局组件
│   ├── localsite-default/
│   │   └── v1/
│   │       ├── index.ts
│   │       ├── tokens.ts
│   │       └── layouts/
│   └── magazine/              # 未来扩展主题
│       └── v2/
├── base/                      # 基础组件库
│   ├── components/
│   ├── layouts/
│   └── tokens/
├── overrides/                 # 站点特定覆盖
│   ├── shanghai.aivoya.com/
│   └── beijing.aivoya.com/
├── lib/
│   ├── theme-registry.ts      # 主题注册表
│   ├── theme-loader.ts        # 主题加载器
│   └── tokens.ts             # 令牌工具
└── app/
    ├── (portal)/             # 门户路由组
    ├── (localsite)/          # 地方站路由组
    └── layout.tsx            # 根布局
```

## 🗓️ 实施计划

### 第一阶段：基础架构 (3-4 天)

#### 1.1 扩展 Wagtail SiteSettings 模型

**目标**: 添加主题相关字段
**文件**: `apps/sites/models.py`

```python
class SiteSettings(models.Model):
    # 现有字段...

    # 主题配置
    theme_key = models.CharField(max_length=64, default="localsite-default")
    theme_version = models.CharField(max_length=16, default="1.0.0")
    layout_key = models.CharField(max_length=64, default="layout-localsite-grid")
    brand_tokens = models.JSONField(default=dict, blank=True)
    modules = models.JSONField(default=dict, blank=True)
    customized = models.BooleanField(default=False)
```

#### 1.2 创建主题注册表系统

**目标**: 实现类型安全的主题加载机制
**文件**:

- `sites/lib/theme-registry.ts`
- `sites/lib/theme-loader.ts`

#### 1.3 更新中间件配置

**目标**: 支持主题解析和路由
**文件**: `sites/middleware.ts`

### 第二阶段：主题开发 (4-5 天)

#### 2.1 迁移现有站点到主题架构

**目标**: 重构现有页面为主题结构
**动作**:

- 移动 `app/portal/` → `themes/portal/v1/`
- 移动地方站通用代码 → `themes/localsite-default/v1/`
- 删除重复的站点特定目录

#### 2.2 创建基础主题

**目标**: 实现两个核心主题

- `portal@v1`: 门户站主题
- `localsite-default@v1`: 通用地方站主题

#### 2.3 实现 CSS 变量系统

**目标**: 动态主题切换和品牌定制
**文件**:

- `sites/lib/tokens.ts`
- `sites/themes/*/tokens.ts`

### 第三阶段：工具和集成 (3-4 天)

#### 3.1 开发主题脚手架工具

**目标**: CLI 工具快速创建新主题
**文件**: `scripts/scaffold-theme.js`

#### 3.2 集成 Wagtail 后台管理

**目标**: 管理界面主题配置
**文件**:

- `apps/sites/admin.py`
- `apps/sites/wagtail_hooks.py`

#### 3.3 更新缓存策略

**目标**: 主题切换时的缓存处理
**文件**:

- `sites/lib/cache.ts`
- Webhook 配置

### 第四阶段：质量保证 (2-3 天)

#### 4.1 建立主题测试框架

**目标**: 自动化测试主题功能
**文件**: `sites/__tests__/themes/`

#### 4.2 性能优化验证

**目标**: 确保性能不降级
**工具**: Lighthouse, Bundle Analyzer

## 📋 各阶段验收标准

### 第一阶段验收

- [ ] Wagtail 后台可以编辑主题配置
- [ ] 主题注册表可以正确加载主题
- [ ] 中间件能解析主题信息

### 第二阶段验收

- [ ] 门户站使用 `portal@v1` 主题
- [ ] 地方站使用 `localsite-default@v1` 主题
- [ ] CSS 变量能动态切换主题样式
- [ ] 现有功能不受影响

### 第三阶段验收

- [ ] 脚手架工具能创建新主题
- [ ] Wagtail 后台能选择和配置主题
- [ ] 主题切换触发正确的缓存失效

### 第四阶段验收

- [ ] 所有主题功能有自动化测试覆盖
- [ ] Lighthouse 评分不低于现有水平
- [ ] 主题动态加载不影响首屏性能

## 🚀 迁移策略

### 渐进式迁移

1. **保持向后兼容**: 现有路由继续工作
2. **分站点迁移**: 先迁移测试站点，验证后推广
3. **优雅降级**: 主题加载失败时回退到默认主题

### 回滚计划

1. **配置回滚**: 修改 Wagtail 配置即可回退
2. **代码回滚**: 保持 Git 分支可快速回退
3. **缓存清理**: 提供缓存清理脚本

## 📊 成功指标

- **功能完整性**: 100%现有功能迁移成功
- **性能指标**: 首屏加载时间不增加超过 10%
- **开发效率**: 新主题创建时间 < 2 小时
- **运维便利性**: 主题切换 < 5 分钟生效

## 🔧 技术债务清理

在实施过程中同时处理：

1. 删除重复的站点目录
2. 统一组件命名规范
3. 优化资源加载策略
4. 完善 TypeScript 类型定义

---

## 下一步行动

开始执行第一阶段第一个任务：**扩展 Wagtail SiteSettings 模型**
