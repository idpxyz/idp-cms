# 分类增强设计方案实施 Todo List

## 📋 项目概览

基于设计文档分析，当前实现完成度约为 65%，需要补齐核心分类体系缺失功能。

**关键目标**：实现完整的四层信息架构（Channel + Category + Tag + Topic）

## 🎯 Phase 1: 核心模型实现（优先级：🔴 极高）

### 1.1 Category 模型实现 

**状态**: ✅ 已完成  
**预计工期**: 3-4天  
**依赖**: 无  

- [x] **1.1.1** 创建 Category 模型
  - 文件: `apps/core/models/category.py`
  - 功能: 树状结构、多频道关联、多站点支持
  - 参考: `apps/core/models/region.py` 的实现模式

- [x] **1.1.2** 更新模型导入
  - 文件: `apps/core/models/__init__.py`
  - 内容: 添加 `from .category import Category`

- [x] **1.1.3** 注册 Wagtail 管理（已注册为 snippet，面板配置按兼容性简化）
  - 文件: `apps/core/wagtail_hooks.py`（需创建或更新）
  - 功能: Category 的 snippet 注册和管理界面

- [x] **1.1.4** 创建数据库迁移
  - 命令: `python manage.py makemigrations core`
  - 验证: 检查迁移文件的合理性

### 1.2 Topic 模型实现

**状态**: ✅ 已完成  
**预计工期**: 2-3天  
**依赖**: Category 模型完成  

- [x] **1.2.1** 创建 Topic 模型
  - 文件: `apps/news/models/topic.py`
  - 功能: 完整的专题模型替代当前的 topic_slug

- [x] **1.2.2** 更新模型导入
  - 文件: `apps/news/models/__init__.py`
  - 内容: 添加 Topic 导入

- [x] **1.2.3** 创建数据库迁移
  - 命令: `python manage.py makemigrations news`

### 1.3 ArticlePage 模型关联修复

**状态**: ✅ 已完成  
**预计工期**: 2天  
**依赖**: Category 和 Topic 模型完成  

- [x] **1.3.1** 修复 categories 字段关联
  - 文件: `apps/news/models/article.py`
  - 变更: 将注释的 categories 字段激活并正确关联

- [x] **1.3.2** 替换 topic_slug 为 Topic 外键
  - 文件: `apps/news/models/article.py`
  - 变更: `topic = models.ForeignKey(Topic, ...)`

- [x] **1.3.3** 创建数据迁移脚本
  - 文件: `apps/news/migrations/XXXX_migrate_topic_slug_to_topic.py`
  - 功能: 将现有 topic_slug 数据迁移到 Topic 模型

- [x] **1.3.4** 更新 ArticlePage 管理界面
  - 文件: `apps/news/models/article.py`
  - 内容: 更新 content_panels 配置

## 🔧 Phase 2: 模型增强与完善（优先级：🟠 高）

### 2.1 Tag 系统扩展

**状态**: 🔶 部分完成（已做基础实现，性能与文档待补）  
**预计工期**: 2天  
**依赖**: Phase 1 完成  

- [ ] **2.1.1** 扩展 Tag 功能
  - 文件: `apps/core/models/tag.py`（新建）
  - 功能: 热度统计、跨站点支持、SEO 配置

- [ ] **2.1.2** 更新 TaggedItem 实现
  - 文件: `apps/news/models/article.py`
  - 变更: 使用增强的 Tag 系统

### 2.2 数据校验与约束

**状态**: ❌ 未开始  
**预计工期**: 1-2天  
**依赖**: 核心模型完成  

- [ ] **2.2.1** 添加数据一致性校验
  - 文件: 各模型的 `clean()` 方法
  - 功能: 跨频道分类校验、循环依赖检测

- [ ] **2.2.2** 创建管理命令进行数据校验
  - 文件: `apps/core/management/commands/validate_taxonomy.py`
  - 功能: 检查分类体系数据完整性

## 🌐 Phase 3: API 层适配（优先级：🟡 中高）

### 3.1 Category API 实现

**状态**: ❌ 未开始  
**预计工期**: 2天  
**依赖**: Category 模型完成  

- [x] **3.1.1** 创建 Category API 视图（列表/树/详情）
  - 文件: `apps/api/rest/categories.py`
  - 功能: 树状 API、频道过滤、站点过滤

- [x] **3.1.2** 更新 URL 路由
  - 文件: `apps/api/urls.py`
  - 内容: 添加 category 相关路由

### 3.2 Topic API 重构

**状态**: ✅ 已完成（保持向后兼容）  
**预计工期**: 2-3天  
**依赖**: Topic 模型完成  

- [x] **3.2.1** 重构现有 Topic API（DB 与 trending 双通道）
  - 文件: `apps/api/rest/topics.py`
  - 变更: 从基于 topic_slug 改为基于 Topic 模型

- [x] **3.2.2** 保持向后兼容性
  - 文件: `apps/api/rest/topics.py`
  - 功能: 兼容现有的 API 调用方式

### 3.3 文章 API 增强

**状态**: ✅ 已完成  
**预计工期**: 1-2天  
**依赖**: 所有模型完成  

- [x] **3.3.1** 更新文章 API 序列化器/响应（含分类/专题字段与 include 展开）
  - 文件: `apps/api/serializers/article.py`（可能需创建）
  - 功能: 包含完整的分类信息

- [x] **3.3.2** 优化查询性能（select_related/prefetch_related）
  - 文件: `apps/api/rest/articles.py`
  - 内容: 添加 select_related 和 prefetch_related

## 🎨 Phase 4: 前端适配（优先级：🟡 中）

### 4.1 前端数据结构适配

**状态**: 🔶 部分完成（Portal 分类页、服务层与路由已到位，说明文档与一致性校验待补）  
**预计工期**: 3-4天  
**依赖**: API 层完成  

- [x] **4.1.1** 更新 TypeScript 类型定义（Article/Category/Topic）
  - 文件: `sites/app/types/` 相关文件
  - 内容: Category, Topic 类型定义

- [x] **4.1.2** 创建分类导航组件（基于 CategoryContext）
  - 文件: `sites/app/components/CategoryNav.tsx`
  - 功能: 支持树状分类显示

- [x] **4.1.3** 更新文章组件（NewsContent 支持 categoryMode）
  - 文件: `sites/app/components/Article/`
  - 内容: 显示完整分类信息

### 4.2 路由系统完善

**状态**: ❌ 未开始  
**预计工期**: 2天  
**依赖**: 前端组件基础完成  

- [x] **4.2.1** 实现分类页面路由（/portal/category/[slug]）
  - 文件: `sites/app/[...slug]/page.tsx` 或新建
  - 路由: `/channel/<channel>/<category>/`

- [ ] **4.2.2** 实现专题页面路由（/portal/topic/[slug]）
  - 文件: `sites/app/topic/[slug]/page.tsx`
  - 路由: `/topic/<topic-slug>/`

## 🚀 Phase 5: 优化与部署（优先级：🟢 低）

### 5.1 性能优化

**状态**: 🟡 待开展  
**预计工期**: 2-3天  
**依赖**: 所有核心功能完成  

- [ ] **5.1.1** 数据库索引优化（按热点字段补充复合索引）
  - 文件: 各模型文件
  - 内容: 添加必要的 db_index 和复合索引

- [ ] **5.1.2** 缓存策略实现（ETag/Surrogate-Key + 局部缓存）
  - 文件: `apps/core/cache.py`（新建）
  - 功能: 分类树缓存、热门分类缓存

### 5.2 搜索系统集成

**状态**: 🟡 待开展  
**预计工期**: 2天  
**依赖**: 核心功能稳定  

- [ ] **5.2.1** 更新搜索索引配置
  - 文件: `apps/searchapp/` 相关文件
  - 内容: 包含新的分类字段

- [ ] **5.2.2** 分类搜索功能
  - 功能: 支持按分类筛选搜索结果

### 5.3 数据管理工具

**状态**: ❌ 未开始  
**预计工期**: 1-2天  

- [ ] **5.3.1** 分类管理命令
  - 文件: `apps/core/management/commands/manage_categories.py`
  - 功能: 批量导入、导出分类数据

- [ ] **5.3.2** 数据一致性检查工具
  - 文件: `apps/core/management/commands/check_taxonomy.py`
  - 功能: 定期检查数据完整性

## 📊 Phase 6: 测试与文档（优先级：🟢 低）

### 6.1 单元测试

**状态**: ❌ 未开始  
**预计工期**: 3天  

- [ ] **6.1.1** 模型测试（Category/Topic/ArticlePage 关联）
  - 文件: `apps/core/tests/test_category.py`
  - 文件: `apps/news/tests/test_topic.py`

- [ ] **6.1.2** API 测试（categories/topics/articles 过滤与展开）
  - 文件: `apps/api/tests/test_categories.py`
  - 文件: `apps/api/tests/test_topics.py`

### 6.2 集成测试

**状态**: ❌ 未开始  
**预计工期**: 2天  

- [ ] **6.2.1** 端到端测试（Portal 分类页/文章列表流转）
  - 文件: `tests/integration/test_taxonomy_flow.py`
  - 功能: 完整分类体系的业务流程测试

### 6.3 文档更新

**状态**: ❌ 未开始  
**预计工期**: 1天  

- [ ] **6.3.1** 更新 API 文档（新增端点/参数示例）
  - 文件: `docs/API.md`
  - 内容: 新增的 Category 和 Topic API

- [ ] **6.3.2** 更新部署文档（Docker Compose 本地/生产）
  - 文件: `DEPLOYMENT.md`
  - 内容: 数据迁移步骤说明

## 🔄 Phase 7: 数据迁移与部署（优先级：🔴 极高）

### 7.1 生产数据迁移

**状态**: 🔴 规划阶段（生产尚未实施）  
**预计工期**: 2-3天  
**依赖**: 所有功能开发完成  

- [ ] **7.1.1** 编写数据迁移脚本（topic_slug → Topic / 分类层级）
  - 文件: `scripts/migrate_categories.py`
  - 功能: 从现有数据推断分类关系

- [ ] **7.1.2** 备份与回滚方案（备份/恢复脚本 + 演练）
  - 文件: `scripts/backup_taxonomy.py`
  - 功能: 迁移前数据备份和回滚机制

- [ ] **7.1.3** 分阶段部署计划（灰度/回滚阈值）
  - 文档: `docs/MIGRATION_PLAN.md`
  - 内容: 详细的部署步骤和回退方案

### 7.2 监控与验证

**状态**: ❌ 未开始  
**预计工期**: 1天  

- [ ] **7.2.1** 部署后数据验证
  - 脚本: 检查数据迁移完整性
  - 监控: API 响应时间和错误率

- [ ] **7.2.2** 性能监控
  - 工具: 数据库查询性能监控
  - 指标: 页面加载时间对比

## 📈 项目里程碑

| Phase | 预计完成时间 | 关键交付物 | 风险等级 |
|-------|-------------|-----------|----------|
| Phase 1 | Week 1-2 | 核心模型完成 | 🔴 高 |
| Phase 2 | Week 2-3 | 模型增强完成 | 🟠 中 |
| Phase 3 | Week 3-4 | API 层适配完成 | 🟡 中低 |
| Phase 4 | Week 4-5 | 前端适配完成 | 🟡 中低 |
| Phase 5 | Week 5-6 | 性能优化完成 | 🟢 低 |
| Phase 6 | Week 6-7 | 测试文档完成 | 🟢 低 |
| Phase 7 | Week 7-8 | 生产部署完成 | 🔴 高 |

## ⚠️ 风险与注意事项

### 高风险项目

1. **数据迁移风险** (Phase 7.1)
   - 现有 topic_slug 数据可能不一致
   - 需要人工清理和映射
   - 必须有完整的回滚方案

2. **性能影响** (Phase 1-4)
   - 新增的关联查询可能影响性能
   - 需要及时优化数据库索引
   - 考虑分阶段发布

3. **API 兼容性** (Phase 3.2)
   - 现有前端可能依赖旧的 API 结构
   - 需要保持向后兼容或协调前端修改

### 技术债务

1. **模型设计验证**
   - 在 Phase 1 完成后立即进行负载测试
   - 验证数据模型的扩展性

2. **缓存策略**
   - Phase 5.1 的缓存实现需要与现有缓存系统整合
   - 避免缓存数据不一致

## 🎯 成功标准

### 功能完整性 ✅
- [ ] 支持完整的四层信息架构
- [ ] 所有 URL 路由按设计文档工作
- [ ] Wagtail 管理界面功能完整

### 性能标准 ⚡
- [ ] API 响应时间不超过现有基准的 120%
- [ ] 数据库查询优化，避免 N+1 问题
- [ ] 缓存命中率达到 85% 以上

### 兼容性标准 🔄
- [ ] 现有数据无损迁移
- [ ] API 向后兼容或有明确的弃用计划
- [ ] 前端功能不受影响

---

**总预计工期**: 7-8 周  
**关键路径**: Phase 1 → Phase 3 → Phase 7  
**建议团队配置**: 2-3 名后端开发 + 1 名前端开发 + 1 名测试

**下一步行动**: 开始 Phase 1.1.1 - 创建 Category 模型
