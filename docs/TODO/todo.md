基于你们现有的项目和新设计文档，我来制作一个完整的重构工作清单：

## 🚀 重构工作清单 (Todo List)

### 第一阶段：API 层重构 (1-2 周)

#### 1.1 扩展现有 API 结构

- [ ] 在 `apps/api/` 中创建新的 REST API 规范
- [ ] 实现 `GET /api/articles` 列表接口
- [ ] 实现 `GET /api/articles/{slug}` 详情接口
- [ ] 实现 `GET /api/channels` 频道接口
- [ ] 实现 `GET /api/regions` 地区接口
- [ ] 实现 `GET /api/portal/articles?allow_aggregate=true` 门户聚合接口
- [ ] 实现 `GET /api/site-settings` 站点配置接口

#### 1.2 API 参数和过滤

- [ ] 实现 `site` 参数验证（主机名或 site_id）
- [ ] 实现 `fields` 字段白名单选择
- [ ] 实现 `include` 关联展开功能
- [ ] 实现过滤参数：`channel`, `region`, `q`, `is_featured`, `since`
- [ ] 实现排序参数：`order=-publish_at`, `weight`

#### 1.3 API 响应头优化

- [ ] 添加 `Cache-Control: public, s-maxage=120, stale-while-revalidate=60`
- [ ] 实现 `ETag` 基于 `updated_at` 的哈希
- [ ] 实现 `Surrogate-Key` 缓存标签系统

### 第二阶段：数据模型升级 (2-3 周) ✅

#### 2.1 Article 模型扩展 ✅

- [x] 在 `apps/news/models/` 中扩展 Article 模型
- [x] 添加 `canonical_url` 字段（URLField）
- [x] 添加 `allow_aggregate` 字段（BooleanField）
- [x] 添加 `is_featured` 字段（BooleanField）
- [x] 添加 `weight` 字段（IntegerField）
- [x] 添加 `source_site` 字段（ForeignKey to Site）

#### 2.2 数据库索引优化 ✅

- [x] 创建联合索引 `(publish_at, channel, region)` - 优化版本
- [x] 创建联合索引 `(is_featured, weight, publish_at)` - 优化版本
- [x] 优化现有查询性能

#### 2.3 数据迁移脚本 ✅

- [x] 创建 Django 数据迁移文件
- [x] 编写数据批量更新脚本
- [x] 测试数据迁移流程
- [x] 准备回滚方案

### 第三阶段：前端优化 (3-4 周)

#### 3.1 Next.js 升级和重构 (1-2 周)

- [x] 升级 `portal/next` 到 Next.js 15+ App Router
- [x] 重构现有页面结构到 `app/` 目录
- [x] 实现站点分流中间件（portal vs localsite）
- [x] 优化页面缓存策略（revalidate = 120s）

#### 3.2 缓存标签系统 (1 周)

- [x] 在服务端渲染时打 Tag：`site:*`, `page:*`, `channel:*`, `region:*`
- [x] 实现缓存标签与 Surrogate-Key 的对应关系
- [x] 优化 ISR 缓存策略

#### 3.3 SEO 优化 (1 周)

- [x] 实现门户聚合页的摘要显示
- [x] 添加 `<link rel="canonical">` 标签
- [x] 实现各站独立的 sitemap.xml
- [x] 实现各站独立的 robots.txt
- [x] 实现各站独立的 feed.xml

#### 3.4 缓存和失效机制 (1 周)

- [x] 实现 Webhook 缓存失效系统
- [x] 创建缓存失效工具库
- [x] 开发缓存管理控制台
- [x] 集成缓存监控组件
- [x] 完善文档和测试

### 第五阶段：基础设施优化 (1 周)

#### 5.1 CDN 和缓存配置

- [ ] 配置 CDN 边缘缓存
- [ ] 实现自定义 Cache-Tag 策略
- [ ] 优化图片 CDN 配置
- [ ] 测试缓存命中率

#### 5.2 性能优化

- [ ] 优化数据库查询性能
- [ ] 实现 API 响应压缩
- [ ] 优化图片加载策略
- [ ] 实现懒加载和预加载

#### 5.3 安全加固

- [ ] 添加 API 限流机制
- [ ] 实现 CORS 策略
- [ ] 添加安全响应头
- [ ] 实现 API 版本控制

### 第六阶段：测试和部署 (1 周)

#### 6.1 功能测试

- [ ] 测试站点作用域隔离
- [ ] 测试门户聚合功能
- [ ] 测试 Webhook 失效机制
- [ ] 测试缓存策略
- [ ] 测试 SEO 功能

#### 6.2 性能测试

- [ ] 测试列表页 P95 < 150ms
- [ ] 测试详情页 P95 < 250ms
- [ ] 测试缓存命中率
- [ ] 测试并发性能

#### 6.3 部署上线

- [ ] 准备生产环境配置
- [ ] 执行数据迁移
- [ ] 部署新版本
- [ ] 监控系统状态
- [ ] 准备回滚方案

### 第七阶段：文档和培训 (0.5 周)

#### 7.1 技术文档

- [ ] 更新 API 文档
- [ ] 编写部署文档
- [ ] 编写运维手册
- [ ] 更新 README.md

#### 7.2 团队培训

- [ ] 培训新 API 使用方法
- [ ] 培训缓存失效机制
- [ ] 培训监控和告警
- [ ] 培训故障排查流程

## �� 时间估算

- **总工期**: 7-9 周 (第四阶段已完成)
- **关键路径**: API 重构 → 数据模型 → 前端优化 → 缓存机制 ✅
- **风险点**: 数据迁移、性能优化

## 🎯 成功标准

- [ ] 所有新 API 接口正常工作
- [ ] 缓存策略达到预期效果
- [ ] 性能指标达到目标值
- [ ] SEO 功能完全正常
- [ ] 监控告警系统完善

## 🚨 风险控制

- [ ] 每个阶段完成后进行测试
- [ ] 准备回滚方案
- [ ] 关键功能有降级策略
- [ ] 建立问题快速响应机制

这个工作清单基于你们现有的项目结构设计，采用渐进式重构策略，确保每个阶段都有可验证的成果。
