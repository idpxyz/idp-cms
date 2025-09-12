# 爬虫数据写入API指南

本指南介绍如何使用外部爬虫程序向基于Wagtail 7.1的CMS系统写入数据。

## 快速开始

### 1. 配置API密钥

在您的Django settings.py中添加以下配置：

```python
import os

# 爬虫API密钥配置
CRAWLER_API_KEYS = {
    'your_crawler_name': os.getenv('CRAWLER_API_KEY', 'your-secret-key-here'),
    'news_bot': os.getenv('NEWS_BOT_API_KEY', 'another-secret-key'),
}

# 可选：API安全配置
CRAWLER_API_SETTINGS = {
    'MAX_ARTICLES_PER_BATCH': 100,
    'ALLOW_ARTICLE_UPDATES': True,
    'DETAILED_LOGGING': True,
}
```

### 2. 获取站点信息

在开始写入数据前，建议先获取目标站点的结构信息：

```bash
curl -X GET "https://your-cms.com/api/crawler/sites/info?site=your-site.com" \
  -H "X-API-Key: your-secret-key-here" \
  -H "X-API-Client: your_crawler_name"
```

响应：
```json
{
  "site": {
    "id": 1,
    "hostname": "your-site.com", 
    "site_name": "您的站点",
    "is_default_site": false
  },
  "channels": [
    {"id": 1, "name": "科技", "slug": "tech"},
    {"id": 2, "name": "财经", "slug": "finance"}
  ],
  "regions": [
    {"id": 1, "name": "北京", "slug": "beijing"},
    {"id": 2, "name": "上海", "slug": "shanghai"}
  ],
  "languages": [
    {"id": 1, "name": "中文", "code": "zh-CN"},
    {"id": 2, "name": "English", "code": "en"}
  ]
}
```

## API端点

### 1. 批量创建文章

**POST** `/api/crawler/articles/bulk`

用于批量创建或更新文章。

#### 请求头
```
Content-Type: application/json
X-API-Key: your-secret-key-here
X-API-Client: your_crawler_name
```

#### 请求体
```json
{
  "site": "your-site.com",
  "articles": [
    {
      "title": "AI技术的最新发展",
      "body": "<p>文章正文内容...</p>",
      "excerpt": "文章摘要",
      "author_name": "张三",
      "channel": "科技",
      "region": "北京",
      "language": "zh-CN",
      "topic_slug": "ai-development",
      "external_article_url": "https://source-site.com/article/123",
      "external_site": {
        "domain": "source-site.com",
        "name": "来源网站"
      },
      "canonical_url": "https://source-site.com/article/123",
      "publish_at": "2024-01-15T10:00:00Z",
      "has_video": false,
      "allow_aggregate": true,
      "is_featured": false,
      "weight": 0,
      "tags": ["AI", "技术", "人工智能"],
      "live": true
    }
  ],
  "update_existing": true,
  "dry_run": false
}
```

#### 字段说明

**必需字段：**
- `title`: 文章标题
- `body`: 文章正文（支持HTML）
- `site`: 目标站点域名

**可选字段：**
- `excerpt`: 文章摘要
- `author_name`: 作者姓名
- `channel`: 频道（字符串或对象）
- `region`: 地区（字符串或对象）
- `language`: 语言代码（如 zh-CN）
- `topic_slug`: 话题标识符
- `external_article_url`: 外部文章原始链接
- `external_site`: 外部站点信息
- `canonical_url`: SEO规范链接
- `publish_at`: 发布时间（ISO格式）
- `has_video`: 是否包含视频
- `allow_aggregate`: 是否允许聚合
- `is_featured`: 是否置顶
- `weight`: 权重值（影响排序）
- `tags`: 标签列表
- `live`: 是否立即发布（默认true）

**特殊参数：**
- `update_existing`: 是否更新已存在的文章（默认true）
- `dry_run`: 试运行模式，只验证不写入（默认false）

#### 响应
```json
{
  "message": "Bulk operation completed",
  "site": "your-site.com",
  "summary": {
    "total": 1,
    "created": 1,
    "updated": 0,
    "errors": 0
  },
  "results": [
    {
      "index": 0,
      "id": 123,
      "title": "AI技术的最新发展",
      "slug": "ai-tech-development",
      "action": "created",
      "success": true
    }
  ]
}
```

### 2. 检查重复文章

**POST** `/api/crawler/articles/check-duplicates`

在实际写入前检查文章是否已存在。

#### 请求体
```json
{
  "site": "your-site.com",
  "articles": [
    {
      "title": "文章标题",
      "external_article_url": "https://source.com/article/123"
    }
  ]
}
```

#### 响应
```json
{
  "results": [
    {
      "index": 0,
      "is_duplicate": true,
      "existing_article": {
        "id": 456,
        "title": "现有文章标题",
        "slug": "existing-article",
        "publish_at": "2024-01-10T08:00:00Z"
      }
    }
  ]
}
```

## 使用示例

### Python示例

```python
import requests
import json
from datetime import datetime

class CMSCrawlerClient:
    def __init__(self, base_url, api_key, client_name):
        self.base_url = base_url
        self.headers = {
            'Content-Type': 'application/json',
            'X-API-Key': api_key,
            'X-API-Client': client_name
        }
    
    def get_site_info(self, site_hostname):
        """获取站点信息"""
        url = f"{self.base_url}/api/crawler/sites/info"
        params = {'site': site_hostname}
        
        response = requests.get(url, headers=self.headers, params=params)
        response.raise_for_status()
        return response.json()
    
    def check_duplicates(self, site, articles):
        """检查重复文章"""
        url = f"{self.base_url}/api/crawler/articles/check-duplicates"
        data = {
            'site': site,
            'articles': articles
        }
        
        response = requests.post(url, headers=self.headers, json=data)
        response.raise_for_status()
        return response.json()
    
    def bulk_create_articles(self, site, articles, update_existing=True, dry_run=False):
        """批量创建文章"""
        url = f"{self.base_url}/api/crawler/articles/bulk"
        data = {
            'site': site,
            'articles': articles,
            'update_existing': update_existing,
            'dry_run': dry_run
        }
        
        response = requests.post(url, headers=self.headers, json=data)
        response.raise_for_status()
        return response.json()

# 使用示例
if __name__ == "__main__":
    # 初始化客户端
    client = CMSCrawlerClient(
        base_url="https://your-cms.com",
        api_key="your-secret-key-here",
        client_name="news_crawler"
    )
    
    # 获取站点信息
    site_info = client.get_site_info("target-site.com")
    print(f"站点信息: {site_info}")
    
    # 准备文章数据
    articles = [
        {
            "title": "人工智能的未来趋势",
            "body": "<p>人工智能正在快速发展...</p>",
            "excerpt": "探讨AI技术的发展方向",
            "author_name": "科技记者",
            "channel": "科技",
            "region": "北京",
            "language": "zh-CN",
            "external_article_url": "https://source.com/ai-trends-2024",
            "publish_at": datetime.now().isoformat() + "Z",
            "tags": ["AI", "技术", "趋势"]
        }
    ]
    
    # 检查重复
    duplicates = client.check_duplicates("target-site.com", articles)
    print(f"重复检查: {duplicates}")
    
    # 如果没有重复，则创建文章
    if not any(result['is_duplicate'] for result in duplicates['results']):
        # 先试运行
        dry_run_result = client.bulk_create_articles(
            "target-site.com", articles, dry_run=True
        )
        print(f"试运行结果: {dry_run_result}")
        
        # 实际创建
        if dry_run_result.get('validation') == 'passed':
            result = client.bulk_create_articles("target-site.com", articles)
            print(f"创建结果: {result}")
```

### Node.js示例

```javascript
const axios = require('axios');

class CMSCrawlerClient {
    constructor(baseUrl, apiKey, clientName) {
        this.baseUrl = baseUrl;
        this.headers = {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
            'X-API-Client': clientName
        };
    }
    
    async getSiteInfo(siteHostname) {
        const response = await axios.get(
            `${this.baseUrl}/api/crawler/sites/info`,
            {
                headers: this.headers,
                params: { site: siteHostname }
            }
        );
        return response.data;
    }
    
    async checkDuplicates(site, articles) {
        const response = await axios.post(
            `${this.baseUrl}/api/crawler/articles/check-duplicates`,
            { site, articles },
            { headers: this.headers }
        );
        return response.data;
    }
    
    async bulkCreateArticles(site, articles, updateExisting = true, dryRun = false) {
        const response = await axios.post(
            `${this.baseUrl}/api/crawler/articles/bulk`,
            {
                site,
                articles,
                update_existing: updateExisting,
                dry_run: dryRun
            },
            { headers: this.headers }
        );
        return response.data;
    }
}

// 使用示例
async function main() {
    const client = new CMSCrawlerClient(
        'https://your-cms.com',
        'your-secret-key-here',
        'js_crawler'
    );
    
    try {
        // 获取站点信息
        const siteInfo = await client.getSiteInfo('target-site.com');
        console.log('站点信息:', siteInfo);
        
        // 准备文章数据
        const articles = [{
            title: '区块链技术应用前景',
            body: '<p>区块链技术正在改变各行各业...</p>',
            excerpt: '探讨区块链在不同领域的应用',
            author_name: '区块链专家',
            channel: '科技',
            external_article_url: 'https://source.com/blockchain-2024',
            publish_at: new Date().toISOString(),
            tags: ['区块链', '技术', '应用']
        }];
        
        // 批量创建文章
        const result = await client.bulkCreateArticles('target-site.com', articles);
        console.log('创建结果:', result);
        
    } catch (error) {
        console.error('操作失败:', error.response?.data || error.message);
    }
}

main();
```

## 错误处理

### 常见错误码

- `400`: 请求参数错误
- `401`: API密钥错误或缺失
- `403`: 权限不足
- `404`: 站点不存在
- `429`: 请求频率限制
- `500`: 服务器内部错误

### 错误响应格式

```json
{
  "error": "错误描述",
  "details": "详细错误信息"
}
```

## 最佳实践

### 1. 数据质量
- 确保文章标题和内容不为空
- 使用正确的HTML格式
- 提供准确的发布时间
- 设置合适的频道和地区

### 2. 性能优化
- 单次批量操作建议不超过100篇文章
- 使用`check_duplicates`接口避免重复
- 在正式环境前使用`dry_run`参数测试

### 3. 错误处理
- 实现重试机制处理网络错误
- 记录详细的操作日志
- 监控API调用频率避免限流

### 4. 安全考虑
- 安全存储API密钥，使用环境变量
- 定期轮换API密钥
- 限制客户端IP（如需要）
- 监控异常访问模式

## 故障排除

### 常见问题

**Q: 提示"Site not found"错误？**
A: 检查site参数是否正确，确保站点已在CMS中配置。

**Q: 文章创建成功但未显示？**  
A: 检查`live`参数是否设置为true，以及文章是否通过审核流程。

**Q: 频道或地区信息丢失？**
A: 先通过`/sites/info`接口获取可用的频道和地区列表，使用正确的名称或slug。

**Q: 外部链接无法访问？**
A: 确保`external_article_url`格式正确，并且源站点可访问。

### 联系支持

如有技术问题，请通过以下方式联系：
- 邮箱: support@your-cms.com
- 文档: https://your-cms.com/docs/
- GitHub Issues: https://github.com/your-org/cms/issues
