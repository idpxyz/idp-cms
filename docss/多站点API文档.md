# 多站点 API 文档

## 概述

本文档详细说明了多站点架构下的 API 使用方法、端点说明和集成指南。多站点 API 支持通过不同的方式识别和访问各个站点的数据。

## API 端点

### Feed API

获取站点特定的内容推荐列表。

#### 端点

```
GET /api/feed
```

#### 站点识别方式

##### 1. Host Header（推荐）

```bash
curl -X GET "http://localhost:8000/api/feed" \
     -H "Host: site-a.local" \
     -H "Accept: application/json"
```

##### 2. URL 参数

```bash
curl -X GET "http://localhost:8000/api/feed?site=site-a.local" \
     -H "Accept: application/json"
```

##### 3. 优先级规则

1. **URL 参数 `site`** - 最高优先级
2. **Host Header** - 中等优先级  
3. **默认配置** - 最低优先级 (`localhost`)

#### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| `site` | string | 否 | - | 指定站点标识符 |
| `size` | integer | 否 | 20 | 返回文章数量 (1-100) |
| `cursor` | string | 否 | - | 分页游标 |
| `sort` | string | 否 | `final_score` | 排序方式: `final_score`, `publish_time`, `ctr_1h` |
| `hours` | integer | 否 | 72 | 时间窗口（小时） |

#### 响应格式

```json
{
  "items": [
    {
      "article_id": "2001",
      "site": "site-a.local",
      "title": "Site A News: AI技术突破",
      "body": "Site A独家报道：人工智能领域取得重大突破...",
      "author": "Site A科技记者",
      "publish_time": "2025-08-25T14:30:00.000000",
      "topic": "ai",
      "region": "china", 
      "lang": "zh",
      "tenant": "site-a.local",
      "channel": "tech-news",
      "tags": ["AI", "技术突破", "图像识别"],
      "ctr_1h": 5.2,
      "pop_1h": 85.0,
      "ctr_24h": 12.5,
      "pop_24h": 234.0,
      "quality_score": 8.5,
      "has_video": false,
      "final_score": 14.9159698
    }
  ],
  "next_cursor": "eyJzZWVuIjogWyIyMDAxIl0sICJ0cyI6IDE3NTYxMDM0MDB9",
  "debug": {
    "hours": 72,
    "template": "recommend_default",
    "sort_by": "final_score",
    "site": "site-a.local",
    "host": "site-a.local"
  }
}
```

#### 字段说明

##### 核心字段

- `article_id`: 文章唯一标识符
- `site`: 所属站点
- `title`: 文章标题
- `body`: 文章正文摘要
- `author`: 作者
- `publish_time`: 发布时间 (ISO 8601 格式)

##### 分类字段

- `topic`: 主题分类 (`ai`, `finance`, `sports`, `technology`, `general`)
- `region`: 地理区域 (`china`, `global`, `asia`, `europe`, `america`)
- `lang`: 语言代码 (`zh`, `en`, `ja`, `ko`)
- `channel`: 频道分类 (`tech-news`, `finance`, `sports`, `headlines`)
- `tags`: 标签数组

##### 指标字段

- `ctr_1h`: 1小时点击率 (%)
- `pop_1h`: 1小时点击数
- `ctr_24h`: 24小时点击率 (%)
- `pop_24h`: 24小时点击数
- `quality_score`: 内容质量评分 (0-10)
- `final_score`: 最终推荐分数

##### 元数据

- `tenant`: 租户标识（通常与 site 相同）
- `has_video`: 是否包含视频内容

##### 调试信息 (debug)

- `hours`: 查询的时间窗口
- `template`: 使用的推荐模板
- `sort_by`: 实际使用的排序字段
- `site`: 识别出的站点
- `host`: 请求的 Host header

## 站点特定行为

### 不同站点的内容差异

#### localhost (开发环境)
```bash
curl -H "Host: localhost" "http://localhost:8000/api/feed?size=2"
```
- 返回通用开发测试内容
- 支持所有功能的测试
- 数据可能包含各种测试场景

#### site-a.local (站点A)
```bash
curl -H "Host: site-a.local" "http://localhost:8000/api/feed?size=2"
```
- 专注于AI和科技内容
- 高质量的技术文章
- 适合技术导向的用户群体

#### site-b.local (站点B)
```bash
curl -H "Host: site-b.local" "http://localhost:8000/api/feed?size=2"
```
- 体育和科技内容并重
- 更多样化的主题分布
- 适合综合性内容消费

#### portal.local (门户站点)
```bash
curl -H "Host: portal.local" "http://localhost:8000/api/feed?size=2"
```
- 聚合性内容，汇总各站点精华
- 高质量评分的文章优先
- 适合作为统一入口

## 错误处理

### 常见错误响应

#### 1. 索引不存在

```json
{
  "error": "NotFoundError",
  "message": "no such index [news_unknown_site_articles]",
  "status": 404
}
```

**解决方案**: 检查站点配置或创建对应索引

#### 2. 参数错误

```json
{
  "error": "ValidationError",
  "message": "size parameter must be between 1 and 100",
  "status": 400
}
```

#### 3. 服务不可用

```json
{
  "error": "ServiceUnavailable", 
  "message": "OpenSearch cluster is unavailable",
  "status": 503
}
```

## 客户端集成

### JavaScript/TypeScript

```typescript
// TypeScript 客户端示例
interface FeedItem {
  article_id: string;
  site: string;
  title: string;
  body: string;
  author: string;
  publish_time: string;
  topic: string;
  region: string;
  lang: string;
  ctr_1h: number;
  quality_score: number;
  final_score: number;
  tags: string[];
}

interface FeedResponse {
  items: FeedItem[];
  next_cursor?: string;
  debug: {
    site: string;
    host: string;
    hours: number;
    template: string;
    sort_by: string;
  };
}

class MultiSiteFeedClient {
  private baseUrl: string;
  
  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }
  
  async getFeed(options: {
    site?: string;
    size?: number;
    cursor?: string;
    sort?: string;
    hours?: number;
  } = {}): Promise<FeedResponse> {
    const url = new URL('/api/feed', this.baseUrl);
    
    // 设置查询参数
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, value.toString());
      }
    });
    
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    
    // 如果没有指定站点参数，使用当前域名作为 Host header
    if (!options.site && typeof window !== 'undefined') {
      headers['X-Forwarded-Host'] = window.location.hostname;
    }
    
    const response = await fetch(url.toString(), { headers });
    
    if (!response.ok) {
      throw new Error(`Feed API error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }
  
  // 获取特定站点的内容
  async getSiteFeed(site: string, size: number = 20): Promise<FeedResponse> {
    return this.getFeed({ site, size });
  }
  
  // 分页获取内容
  async getNextPage(cursor: string, site?: string): Promise<FeedResponse> {
    return this.getFeed({ cursor, site });
  }
}

// 使用示例
const client = new MultiSiteFeedClient();

// 获取默认站点内容
const defaultFeed = await client.getFeed({ size: 10 });

// 获取特定站点内容
const siteAFeed = await client.getSiteFeed('site-a.local', 15);

// 分页获取
const nextPage = await client.getNextPage(defaultFeed.next_cursor);
```

### Python

```python
import requests
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

@dataclass
class FeedItem:
    article_id: str
    site: str
    title: str
    body: str
    author: str
    publish_time: str
    topic: str
    region: str
    lang: str
    ctr_1h: float
    quality_score: float
    final_score: float
    tags: List[str]

@dataclass 
class FeedResponse:
    items: List[FeedItem]
    next_cursor: Optional[str]
    debug: Dict[str, Any]

class MultiSiteFeedClient:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Accept': 'application/json',
            'User-Agent': 'MultiSiteFeedClient/1.0'
        })
    
    def get_feed(self, 
                 site: Optional[str] = None,
                 size: int = 20,
                 cursor: Optional[str] = None,
                 sort: str = "final_score",
                 hours: int = 72) -> FeedResponse:
        """获取站点内容推荐"""
        
        url = f"{self.base_url}/api/feed"
        params = {
            'size': size,
            'sort': sort,
            'hours': hours
        }
        
        if site:
            params['site'] = site
        if cursor:
            params['cursor'] = cursor
            
        # 移除 None 值
        params = {k: v for k, v in params.items() if v is not None}
        
        headers = {}
        if site and not params.get('site'):
            headers['Host'] = site
            
        response = self.session.get(url, params=params, headers=headers)
        response.raise_for_status()
        
        data = response.json()
        
        # 转换为数据类
        items = [FeedItem(**item) for item in data['items']]
        
        return FeedResponse(
            items=items,
            next_cursor=data.get('next_cursor'),
            debug=data['debug']
        )
    
    def get_site_feed(self, site: str, size: int = 20) -> FeedResponse:
        """获取特定站点的内容"""
        return self.get_feed(site=site, size=size)
    
    def get_all_sites_summary(self, size: int = 5) -> Dict[str, FeedResponse]:
        """获取所有站点的内容摘要"""
        sites = ['localhost', 'site-a.local', 'site-b.local', 'portal.local']
        results = {}
        
        for site in sites:
            try:
                results[site] = self.get_site_feed(site, size)
            except Exception as e:
                print(f"Failed to get feed for {site}: {e}")
                
        return results

# 使用示例
if __name__ == "__main__":
    client = MultiSiteFeedClient()
    
    # 获取特定站点内容
    feed = client.get_site_feed('site-a.local', size=10)
    print(f"站点: {feed.debug['site']}")
    print(f"文章数量: {len(feed.items)}")
    
    for item in feed.items:
        print(f"- {item.title} (评分: {item.quality_score})")
    
    # 获取所有站点摘要
    all_feeds = client.get_all_sites_summary(size=3)
    for site, feed in all_feeds.items():
        print(f"\n=== {site} ===")
        for item in feed.items:
            print(f"- {item.title}")
```

### cURL 脚本

```bash
#!/bin/bash
# multi_site_test.sh - 多站点API测试脚本

BASE_URL="http://localhost:8000"
SITES=("localhost" "site-a.local" "site-b.local" "portal.local")

echo "=== 多站点 API 测试 ==="

for site in "${SITES[@]}"; do
    echo ""
    echo "🌐 测试站点: $site"
    echo "----------------------------------------"
    
    # 测试 Host header 方式
    echo "📡 Host Header 方式:"
    curl -s -X GET "$BASE_URL/api/feed?size=2" \
         -H "Host: $site" \
         -H "Accept: application/json" | \
    python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print(f'  ✅ 站点: {data[\"debug\"][\"site\"]}')
    print(f'  📊 文章数量: {len(data[\"items\"])}')
    for i, item in enumerate(data['items'][:2], 1):
        print(f'  {i}. {item[\"title\"]} (评分: {item[\"quality_score\"]})')
except Exception as e:
    print(f'  ❌ 错误: {e}')
"
    
    echo ""
    echo "🔗 URL 参数方式:"
    curl -s -X GET "$BASE_URL/api/feed?site=$site&size=1" \
         -H "Accept: application/json" | \
    python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print(f'  ✅ 站点: {data[\"debug\"][\"site\"]}')
    print(f'  📊 文章数量: {len(data[\"items\"])}')
    if data['items']:
        item = data['items'][0]
        print(f'  📰 {item[\"title\"]}')
except Exception as e:
    print(f'  ❌ 错误: {e}')
"
done

echo ""
echo "🎯 测试完成!"
```

## 性能优化

### 1. 缓存策略

```typescript
// 客户端缓存示例
class CachedFeedClient {
  private cache = new Map<string, { data: FeedResponse; timestamp: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5分钟
  
  async getFeed(options: any): Promise<FeedResponse> {
    const cacheKey = JSON.stringify(options);
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    
    const data = await this.client.getFeed(options);
    this.cache.set(cacheKey, { data, timestamp: Date.now() });
    
    return data;
  }
}
```

### 2. 批量请求

```python
async def get_multiple_sites_parallel(sites: List[str], size: int = 10):
    """并行获取多个站点的数据"""
    import asyncio
    import aiohttp
    
    async def fetch_site(session, site):
        url = f"http://localhost:8000/api/feed?site={site}&size={size}"
        async with session.get(url) as response:
            return site, await response.json()
    
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_site(session, site) for site in sites]
        results = await asyncio.gather(*tasks)
        
    return dict(results)
```

### 3. 请求优化

- **压缩**: 启用 gzip 压缩减少传输大小
- **Keep-Alive**: 复用 HTTP 连接
- **合理的 size**: 避免一次请求过多数据
- **游标分页**: 使用 cursor 而不是 offset 分页

## 监控与日志

### API 指标监控

```python
# 监控脚本示例
import time
import requests
from datetime import datetime

def monitor_api_health():
    sites = ['localhost', 'site-a.local', 'site-b.local', 'portal.local']
    
    for site in sites:
        try:
            start_time = time.time()
            response = requests.get(
                "http://localhost:8000/api/feed",
                headers={"Host": site},
                params={"size": 1},
                timeout=5
            )
            
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                print(f"{datetime.now()} ✅ {site}: {response_time:.3f}s, {len(data['items'])} items")
            else:
                print(f"{datetime.now()} ❌ {site}: HTTP {response.status_code}")
                
        except Exception as e:
            print(f"{datetime.now()} 💥 {site}: {e}")

if __name__ == "__main__":
    while True:
        monitor_api_health()
        time.sleep(60)  # 每分钟检查一次
```

---

## 总结

多站点 API 提供了强大而灵活的多站点内容访问能力：

✅ **多种识别方式** - Host header、URL 参数、默认配置  
✅ **完整的数据隔离** - 每个站点独立的内容和指标  
✅ **丰富的元数据** - 支持分类、标签、质量评分等  
✅ **高性能设计** - 支持分页、排序、时间窗口查询  
✅ **易于集成** - 提供多语言客户端示例  

这套 API 为构建多站点应用提供了完整的数据访问层，支持各种复杂的业务场景。
