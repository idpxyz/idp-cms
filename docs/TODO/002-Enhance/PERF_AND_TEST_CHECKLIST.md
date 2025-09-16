# ⚡ 性能优化与测试清单

## 一、性能优化（Phase 5）
- [ ] 数据库索引优化
  - Articles：(topic_id, first_published_at)、(is_featured, first_published_at)
  - Categories：(parent_id, order)、(is_active, order)
  - Topics：(is_active, is_featured)、(start_date, end_date)
- [ ] 缓存策略落地
  - 统一使用 ETag + Surrogate-Key
  - 分类树缓存（站点+时间维度）
- [ ] 查询优化
  - 所有列表页预加载：select_related('topic','channel','region') + prefetch_related('categories','tags')
- [ ] 前端优化
  - SWR/按需缓存、懒加载、分页加载策略

## 二、测试计划（Phase 6）
### 1) 单元测试
- [ ] 模型：Category/Topic/ArticlePage 关联一致性
- [ ] API：categories/topics/articles 过滤与 include 展开
- [ ] 工具：缓存键生成与速率限制

### 2) 集成/E2E
- [ ] 分类页：加载→分页→文章点击
- [ ] 专题页：列表→详情→相关文章
- [ ] 首页组件：频道/分类导航联动

## 三、排期与责任建议
- 性能优化：2-3 天（后端 1-2 人）
- 单测与集成测试：3-4 天（后端/前端各 1 人）
- 文档与部署说明：1 天

> 注：上线前需在 Docker Compose + 生产等价环境回归一次。
