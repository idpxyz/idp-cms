# Hero和TopStories API分离指南

## 🎯 概述

为了提升首页性能和维护性，我们将Hero轮播和TopStories头条新闻的数据获取API进行了分离：

- **Hero API** (`/api/hero/`): 简单、快速的Hero内容获取
- **TopStories API** (`/api/topstories/`): 复杂的推荐算法和聚类去重

## 📚 API详细说明

### 🎬 Hero API - `/api/hero/`

**用途**: 获取首页Hero轮播数据，基于`is_hero=true`字段的简单筛选

**特点**:
- ✅ 直接数据库查询，无需OpenSearch
- ✅ 响应速度快（通常 < 100ms）
- ✅ 数据结构简单明确
- ✅ 5分钟缓存策略

**请求参数**:
```
GET /api/hero/?size=5&site=aivoya.com
```
🎯 **注意**: Hero API 不再支持 `hours` 参数，Hero内容无时间限制

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| size | int | 5 | 返回数量，最大10 |
| site | string | - | 站点域名 |

**响应格式**:
```json
{
  "items": [
    {
      "id": "123",
      "article_id": "123", 
      "title": "Hero文章标题",
      "excerpt": "文章摘要",
      "image_url": "https://example.com/image.jpg",
      "publish_time": "2025-09-23T10:00:00Z",
      "slug": "article-slug",
      "author": "作者名",
      "source": "来源",
      "channel": {
        "id": "tech",
        "name": "科技",
        "slug": "tech"
      },
      "tags": ["标签1", "标签2"],
      "is_breaking": false,
      "is_live": false
    }
  ],
  "total": 5,
  "cache_info": {
    "hit": false,
    "ttl": 300,
    "type": "hero_simple"
  }
}
```

### 📰 TopStories API - `/api/topstories/`

**用途**: 获取首页头条新闻，包含复杂的推荐算法

**特点**:
- 🧠 基于OpenSearch的复杂推荐算法
- 🎯 聚类去重和多样性控制
- ⚡ 实时爆发度计算
- 📊 个性化推荐支持
- 🔄 动态缓存策略

**请求参数**:
```
GET /api/topstories/?size=9&hours=24&diversity=high&site=aivoya.com
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| size | int | 9 | 返回数量，最大30 |
| hours | int | 24 | 时间窗口（小时） |
| diversity | string | high | 多样性级别: high/med/low |
| exclude_cluster_ids | array | [] | 排除的聚类ID列表 |
| site | string | - | 站点域名 |

**响应格式**:
```json
{
  "items": [
    {
      "id": "456",
      "title": "头条新闻标题",
      "excerpt": "新闻摘要", 
      "image_url": "https://example.com/news.jpg",
      "publish_time": "2025-09-23T12:00:00Z",
      "topstory_score": 0.8567,
      "cluster_slug": "tech-news-cluster",
      "more_sources": 3,
      "channel": {
        "id": "news",
        "name": "新闻",
        "slug": "news"
      }
    }
  ],
  "debug": {
    "site": "aivoya.com",
    "hours": 24,
    "diversity": "high",
    "total_hits": 1250,
    "candidates": 500,
    "clusters": 45,
    "final_count": 9,
    "timing": {
      "opensearch_ms": 125.5,
      "processing_ms": 23.8,
      "total_ms": 149.3
    }
  }
}
```

## 🔄 前端调用方式

### Hero轮播调用
```typescript
// sites/app/portal/components/HeroCarousel.utils.ts
export async function getHeroItems(limit: number = 5): Promise<HeroItem[]> {
  const apiUrl = buildBackendApiUrl(`/api/hero/?size=${limit}&site=aivoya.com`);
  
  const response = await fetch(apiUrl, {
    next: { revalidate: 300 }, // 5分钟缓存
    signal: AbortSignal.timeout(5000), // 5秒超时
  });
  
  const data = await response.json();
  return data.items.map(transformToHeroItem);
}
```

### TopStories调用
```typescript
// sites/app/portal/components/TopStoriesGrid.utils.ts
export async function getTopStories(
  limit: number = 9,
  options?: {
    hours?: number;
    diversity?: 'high' | 'med' | 'low';
    userId?: string;
  }
): Promise<TopStoryItem[]> {
  const apiUrl = buildBackendApiUrl(`/api/topstories/?size=${limit}&hours=${options?.hours || 24}&diversity=${options?.diversity || 'high'}`);
  
  const response = await fetch(apiUrl, {
    next: { revalidate: 60 }, // 1分钟缓存
    signal: AbortSignal.timeout(8000), // 8秒超时
  });
  
  const data = await response.json();
  return data.items.map(transformToTopStoryItem);
}
```

## 🚀 性能优化

### 缓存策略
- **Hero API**: 5分钟固定缓存，适合相对稳定的Hero内容
- **TopStories API**: 动态缓存（15秒-30秒），根据内容类型调整

### 超时设置
- **Hero API**: 5秒超时，因为是简单数据库查询
- **TopStories API**: 8秒超时，允许复杂算法计算

### 并行请求
```typescript
// 在首页并行获取两种数据
const [heroItems, topStoriesData] = await Promise.all([
  getHeroItems(5),
  getTopStories(9, { hours: 168, diversity: 'high' })
]);
```

## 🛡️ 错误处理

### Hero API错误处理
- 获取失败时返回空数组，不显示Hero组件
- 不影响页面其他部分的渲染

### TopStories API错误处理
- 主API失败时自动重试（放宽参数）
- 重试失败后使用传统新闻API兜底
- 确保首页始终有内容显示

## 📊 监控和调试

### 响应时间监控
- Hero API目标: < 200ms
- TopStories API目标: < 1000ms

### 调试信息
TopStories API返回详细的调试信息，包括：
- OpenSearch查询耗时
- 候选数量和聚类结果
- 缓存命中状态
- 算法执行时间

### 日志记录
```typescript
console.log(`✅ Loaded ${heroItems.length} hero items from dedicated API`);
console.log(`📊 TopStories API response: ${data.items?.length || 0} items, cache: ${cacheStrategy}`);
```

## 🧪 测试

运行测试脚本验证API分离效果：
```bash
cd /opt/idp-cms
python test_api_separation.py
```

## 🔄 迁移指南

### 从旧API迁移
如果你的代码还在使用旧的统一API：

**旧方式**:
```typescript
// 不推荐
const heroUrl = `/api/headlines/?mode=hero&size=5`;
const topStoriesUrl = `/api/headlines/?mode=topstories&size=9`;
```

**新方式**:
```typescript  
// 推荐
const heroUrl = `/api/hero/?size=5`;
const topStoriesUrl = `/api/topstories/?size=9`;
```

### 兼容性说明
- 新API与旧API数据格式完全兼容
- 可以逐步迁移，不需要一次性更换
- 旧API仍然可用，但建议尽快迁移到新API

## 📈 预期收益

### 性能提升
- Hero加载速度提升约60-80%
- TopStories算法优化后准确性提升
- 整体首页加载时间减少200-500ms

### 维护优势  
- 代码职责更清晰
- 独立优化和扩展
- 错误隔离，提升稳定性

### 业务价值
- Hero管理更简单直观
- TopStories推荐算法更精准
- 支持更复杂的个性化策略
