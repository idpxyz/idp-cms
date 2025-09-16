# Phase 2: API 层适配 - 下一步实施计划

## 🎯 当前状态总结

### ✅ 已完成 (Phase 1)
- **Category 模型**: 完整实现，支持树状结构、多站点、多频道
- **Topic 模型**: 完整实现，支持封面图片、时间范围、推荐标记  
- **ArticlePage 增强**: 支持多分类、专题关联，向后兼容
- **数据库迁移**: 所有表结构创建完成
- **功能测试**: 模型创建、关联关系测试通过

### 📊 完成度进展
```
设计文档实现: 65% → 85% ✅
Phase 1 (模型层): 100% ✅
Phase 2 (API 层): 0% ← 下一步重点
Phase 3 (前端层): 0%
```

## 🚀 Phase 2: API 层适配 (预计 3-5 天)

### 优先级 🔴 极高

#### 2.1 创建 Category API
**文件**: `apps/api/rest/categories.py`
```python
# 需要实现的端点：
# GET /api/v1/categories/          - 分类列表（树状结构）
# GET /api/v1/categories/{id}/     - 分类详情
# GET /api/v1/categories/tree/     - 分类树（嵌套结构）
```

**功能要求**:
- 支持站点过滤 (`?site=hostname`)
- 支持频道过滤 (`?channel=tech-news`)  
- 支持层级过滤 (`?level=1` 仅顶级分类)
- 支持树状输出 (`?format=tree`)
- 缓存策略集成

#### 2.2 重构 Topic API  
**文件**: `apps/api/rest/topics.py` (现有文件重构)

**当前问题**: 基于聚类算法的 topic_slug，需要适配新的 Topic 模型

**重构计划**:
```python
# 保留现有的聚类功能作为 /api/v1/topics/trending/
# 新增基于数据库的 /api/v1/topics/ 端点
```

#### 2.3 增强 Articles API
**文件**: `apps/api/rest/articles.py` (现有文件增强)

**需要新增的功能**:
- 分类过滤: `?categories=tech-news,ai-news`
- 专题过滤: `?topics=ai-development`  
- 响应中包含分类和专题信息
- 支持分类树展开: `?include=categories,topics`

### 优先级 🟠 高

#### 2.4 创建序列化器
**文件**: `apps/api/serializers/taxonomy.py` (新建)

```python
# CategorySerializer - 分类序列化器
# TopicSerializer - 专题序列化器  
# ArticleWithTaxonomySerializer - 增强的文章序列化器
```

#### 2.5 URL 路由配置
**文件**: `apps/api/urls.py` (更新)

```python
# 新增路由：
# path('categories/', include('apps.api.rest.categories')),
# 更新现有路由以支持新功能
```

## 📋 详细实施步骤

### Step 1: Category API 实现 (Day 1-2)

```bash
# 1. 创建 Category API 文件
touch apps/api/rest/categories.py

# 2. 实现基础端点
# - categories_list: 分类列表
# - categories_tree: 分类树  
# - category_detail: 分类详情

# 3. 集成现有工具
# - 使用 apps/api/rest/utils.py 中的缓存和过滤函数
# - 集成速率限制和性能监控
```

### Step 2: Topic API 重构 (Day 2-3)

```bash
# 1. 备份现有 topics.py
cp apps/api/rest/topics.py apps/api/rest/topics_legacy.py

# 2. 重构 topics.py
# - 保留聚类功能为 /trending/ 端点
# - 新增数据库驱动的 /topics/ 端点
# - 实现 Topic 模型的 CRUD 操作
```

### Step 3: Articles API 增强 (Day 3-4)

```bash
# 1. 更新 articles.py
# - 在现有过滤器中添加 categories 和 topics
# - 更新序列化器以包含分类信息
# - 优化查询性能 (select_related, prefetch_related)

# 2. 测试API兼容性  
# - 确保现有前端调用不受影响
# - 新功能向后兼容
```

### Step 4: 序列化器和工具 (Day 4-5)

```bash
# 1. 创建序列化器
mkdir -p apps/api/serializers/
touch apps/api/serializers/__init__.py
touch apps/api/serializers/taxonomy.py

# 2. 实现缓存策略
# - Category 树缓存
# - Topic 列表缓存
# - Article 关联数据缓存

# 3. 更新 URL 配置
```

## 🧪 测试验证计划

### API 功能测试
```bash
# 1. Category API 测试
curl "http://localhost:8000/api/v1/categories/"
curl "http://localhost:8000/api/v1/categories/?site=aivoya.com"
curl "http://localhost:8000/api/v1/categories/tree/"

# 2. Topic API 测试  
curl "http://localhost:8000/api/v1/topics/"
curl "http://localhost:8000/api/v1/topics/trending/"

# 3. Articles API 测试
curl "http://localhost:8000/api/v1/articles/?categories=tech-news"
curl "http://localhost:8000/api/v1/articles/?include=categories,topics"
```

### 性能测试
- API 响应时间不超过 200ms
- 缓存命中率 > 80%
- 数据库查询优化验证

## 📈 预期收益

### 功能层面
- ✅ 完整的分类 API 支持
- ✅ 重构后的专题 API
- ✅ 增强的文章 API 
- ✅ 统一的序列化和缓存策略

### 技术层面  
- ✅ API 结构更加规范和完整
- ✅ 查询性能优化
- ✅ 缓存策略统一
- ✅ 为前端适配做好准备

## 🎯 完成标准

- [ ] Category API 完整实现并测试通过
- [ ] Topic API 重构完成并保持兼容性
- [ ] Articles API 增强功能正常
- [ ] 所有 API 响应时间 < 200ms
- [ ] 缓存策略有效
- [ ] API 文档更新

## 🔄 Phase 3 预告

完成 Phase 2 后，下一步将是 **前端适配**：
1. TypeScript 类型定义更新
2. 分类导航组件开发
3. 文章展示组件更新
4. 路由系统完善

---

**当前状态**: Phase 1 ✅ → Phase 2 🔄  
**预计完成**: Phase 2 后整体进度将达到 90%

准备好开始 Phase 2 了吗？🚀
