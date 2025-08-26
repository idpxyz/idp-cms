# Feed API 文档

## 概述

Feed API 是一个基于 OpenSearch 和 ClickHouse 的智能内容推荐系统，提供个性化的文章推荐服务。系统支持多种排序方式、分页、去重和多样化推荐。

## 基础信息

- **API 端点**: `/api/feed`
- **请求方法**: `GET`
- **返回格式**: `JSON`
- **认证**: 无需认证

## 请求参数

### 必需参数

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `site` | string | `settings.SITE_HOSTNAME` | 站点标识符 |

### 可选参数

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `size` | integer | `20` | 返回的文章数量 (1-200) |
| `sort` | string | `final_score` | 排序方式，详见排序选项 |
| `cursor` | string | - | 分页游标，用于获取下一页数据 |
| `template` | string | `recommend_default` | 查询模板名称 |
| `channel` | array | `["recommend","hot","tech"]` | 频道过滤器 |

### 排序选项

| 值 | 描述 | 排序字段 |
|---|------|----------|
| `final_score` | 综合评分 (默认) | 召回分 + CTR + 质量分的加权组合 |
| `popularity` | 24小时热度 | `pop_24h` 降序 |
| `hot` | 1小时热度 | `pop_1h` 降序 |
| `ctr` | 24小时点击率 | `ctr_24h` 降序 |

## 请求示例

### 基础请求
```http
GET /api/feed?site=localhost&size=10
```

### 按热度排序
```http
GET /api/feed?site=localhost&size=10&sort=popularity
```

### 分页请求
```http
GET /api/feed?site=localhost&size=10&cursor=eyJzZWVuIjogWyIxMDA0Il0sICJ0cyI6IDE3NTU3OTA0NDE0NTJ9
```

### 多频道过滤
```http
GET /api/feed?site=localhost&channel=ai-news&channel=ai-tools&sort=hot
```

## 响应格式

### 成功响应

```json
{
  "items": [
    {
      "id": "1004",
      "article_id": "1004",
      "title": "OpenAI发布GPT-5：推理能力革命性突破",
      "body": "OpenAI正式发布了GPT-5模型...",
      "author": "AI研究员张三",
      "channel": "ai-news",
      "topic": "人工智能",
      "tags": "GPT-5,OpenAI,人工智能",
      "publish_time": "2024-01-15T10:30:00Z",
      "site": "localhost",
      "tenant": "localhost",
      "region": "全球",
      "lang": "zh-CN",
      "has_video": false,
      "score": 8.5,
      "final_score": 7.8,
      "quality_score": 9.2,
      "ctr_1h": 12.8,
      "ctr_24h": 15.6,
      "pop_1h": 18.4,
      "pop_24h": 92.3
    }
  ],
  "next_cursor": "eyJzZWVuIjogWyIxMDA0IiwgIjEwMDUiXSwgInRzIjogMTc1NTc5MDQ0MTQ1Mn0=",
  "debug": {
    "hours": 72,
    "template": "recommend_default",
    "sort_by": "popularity"
  }
}
```

### 字段说明

#### 文章基础信息
- `id` / `article_id`: 文章唯一标识符
- `title`: 文章标题
- `body`: 文章摘要或正文
- `author`: 作者
- `channel`: 频道分类
- `topic`: 主题标签
- `tags`: 标签列表（逗号分隔）
- `publish_time`: 发布时间 (ISO 8601 格式)
- `site`: 站点标识
- `tenant`: 租户标识
- `region`: 地域标识
- `lang`: 语言代码
- `has_video`: 是否包含视频内容

#### 评分和热度指标
- `score`: OpenSearch 召回评分
- `final_score`: 综合最终评分
- `quality_score`: 内容质量评分
- `ctr_1h`: 1小时点击率 (%)
- `ctr_24h`: 24小时点击率 (%)
- `pop_1h`: 1小时热度值
- `pop_24h`: 24小时热度值

#### 分页信息
- `next_cursor`: 下一页游标，用于分页请求
- `debug`: 调试信息，包含查询参数

## 分页机制

Feed API 使用基于游标的分页机制：

1. **首次请求**: 不传递 `cursor` 参数
2. **后续请求**: 使用响应中的 `next_cursor` 值
3. **去重机制**: 系统自动避免返回已浏览的内容
4. **游标过期**: 游标包含时间戳，建议在合理时间内使用

### 分页示例

```javascript
// 首次请求
const firstPage = await fetch('/api/feed?site=localhost&size=20');
const data = await firstPage.json();

// 后续请求
const nextPage = await fetch(`/api/feed?site=localhost&size=20&cursor=${data.next_cursor}`);
```

## 推荐算法

### 综合评分计算

```
final_score = 0.6 × recall_score + 0.3 × ctr_1h + 0.1 × quality_score
```

- `recall_score`: OpenSearch 查询召回评分
- `ctr_1h`: 1小时点击率 (来自 ClickHouse)
- `quality_score`: 内容质量评分

### 多样化策略

为保证推荐内容的多样性，系统实施以下限制：
- 每个作者最多推荐 3 篇文章
- 每个主题最多推荐 3 篇文章
- 最大返回 200 条候选结果

### A/B 测试

系统支持 A/B 测试：
- 10% 的用户使用 24 小时时间窗口
- 90% 的用户使用 72 小时时间窗口
- 通过 `X-AB-Session` 请求头控制分流

## 查询模板

系统支持多种预定义查询模板：

| 模板名称 | 描述 | 适用场景 |
|----------|------|----------|
| `recommend_default` | 默认推荐模板 | 通用内容推荐 |
| `channel_hot` | 热门频道模板 | 热门内容推荐 |

## 错误处理

### 常见错误码

| HTTP状态码 | 错误类型 | 描述 |
|------------|----------|------|
| 400 | Bad Request | 请求参数错误 |
| 500 | Internal Server Error | 服务器内部错误 |

### 错误响应示例

```json
{
  "error": "Invalid site parameter",
  "code": 400,
  "message": "Site 'invalid-site' not found"
}
```

## 性能优化

### 缓存策略
- OpenSearch 查询结果缓存 5 分钟
- ClickHouse 特征数据缓存 1 分钟
- 游标有效期 1 小时

### 限流
- 单用户 QPS 限制: 10 req/s
- 全局 QPS 限制: 1000 req/s

## 监控指标

### 关键指标
- API 响应时间
- OpenSearch 查询耗时
- ClickHouse 查询耗时
- 推荐点击率
- 推荐覆盖率

### 日志格式
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "INFO",
  "message": "Feed API request",
  "site": "localhost",
  "size": 20,
  "sort": "popularity",
  "response_time_ms": 45,
  "opensearch_time_ms": 23,
  "clickhouse_time_ms": 12,
  "results_count": 20
}
```

## 使用示例

### JavaScript (前端)

```javascript
class FeedAPI {
  constructor(baseURL = '') {
    this.baseURL = baseURL;
  }

  async getFeed(options = {}) {
    const {
      site = 'localhost',
      size = 20,
      sort = 'final_score',
      cursor = null,
      channels = []
    } = options;

    const params = new URLSearchParams({
      site,
      size: size.toString(),
      sort
    });

    if (cursor) params.append('cursor', cursor);
    channels.forEach(ch => params.append('channel', ch));

    const response = await fetch(`${this.baseURL}/api/feed?${params}`);
    return response.json();
  }

  async getHotFeed(site = 'localhost', size = 20) {
    return this.getFeed({ site, size, sort: 'popularity' });
  }

  async getLatestFeed(site = 'localhost', size = 20) {
    return this.getFeed({ site, size, sort: 'hot' });
  }
}

// 使用示例
const feedAPI = new FeedAPI();

// 获取热门内容
const hotFeed = await feedAPI.getHotFeed();
console.log(hotFeed.items);

// 分页加载
let cursor = null;
while (true) {
  const feed = await feedAPI.getFeed({ cursor });
  console.log(feed.items);
  
  cursor = feed.next_cursor;
  if (!cursor) break; // 没有更多数据
}
```

### Python (后端)

```python
import requests
from typing import Optional, List, Dict, Any

class FeedAPI:
    def __init__(self, base_url: str = 'http://localhost:8000'):
        self.base_url = base_url

    def get_feed(
        self,
        site: str = 'localhost',
        size: int = 20,
        sort: str = 'final_score',
        cursor: Optional[str] = None,
        channels: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        params = {
            'site': site,
            'size': size,
            'sort': sort
        }
        
        if cursor:
            params['cursor'] = cursor
            
        if channels:
            params['channel'] = channels

        response = requests.get(f'{self.base_url}/api/feed', params=params)
        response.raise_for_status()
        return response.json()

    def get_hot_feed(self, site: str = 'localhost', size: int = 20) -> Dict[str, Any]:
        return self.get_feed(site=site, size=size, sort='popularity')

    def get_all_feed(self, site: str = 'localhost', max_items: int = 100) -> List[Dict[str, Any]]:
        all_items = []
        cursor = None
        
        while len(all_items) < max_items:
            feed = self.get_feed(site=site, size=20, cursor=cursor)
            items = feed.get('items', [])
            
            if not items:
                break
                
            all_items.extend(items)
            cursor = feed.get('next_cursor')
            
            if not cursor:
                break
                
        return all_items[:max_items]

# 使用示例
feed_api = FeedAPI()

# 获取热门内容
hot_feed = feed_api.get_hot_feed()
for item in hot_feed['items']:
    print(f"{item['title']} - 热度: {item['pop_24h']}")

# 获取所有内容
all_items = feed_api.get_all_feed(max_items=100)
print(f"共获取 {len(all_items)} 篇文章")
```

## 部署配置

### 环境变量

```bash
# OpenSearch 配置
OPENSEARCH_URL=http://opensearch:9200
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=your_password

# ClickHouse 配置
CLICKHOUSE_URL=clickhouse://default:@clickhouse:9000/default

# 站点配置
SITE_HOSTNAME=localhost
```

### Docker Compose 示例

```yaml
services:
  authoring:
    build: .
    environment:
      - OPENSEARCH_URL=http://opensearch:9200
      - CLICKHOUSE_URL=clickhouse://default:@clickhouse:9000/default
      - SITE_HOSTNAME=localhost
    depends_on:
      - opensearch
      - clickhouse
    ports:
      - "8000:8000"
```

## 版本历史

### v1.0.0 (2024-01-15)
- ✅ 基础推荐功能
- ✅ OpenSearch 集成
- ✅ ClickHouse 特征计算
- ✅ 分页和去重
- ✅ 多种排序方式
- ✅ A/B 测试支持
- ✅ 多样化推荐策略

## 支持与反馈

如有问题或建议，请联系开发团队或提交 Issue。

---

*最后更新时间: 2024-01-15*
