# 外部爬虫数据写入集成方案

## 概述

本方案为基于Wagtail 7.1的CMS系统提供了完整的外部爬虫数据写入解决方案，支持批量文章创建、更新和去重功能。

## 🎯 解决的问题

- ✅ 外部爬虫程序如何安全地向CMS写入数据
- ✅ 批量处理大量文章数据
- ✅ 避免重复文章的创建
- ✅ 支持多站点架构
- ✅ 处理外部来源和内部来源的文章
- ✅ 提供完整的API认证和权限控制

## 🚀 核心功能

### 1. API端点
- `POST /api/crawler/articles/bulk` - 批量创建/更新文章
- `POST /api/crawler/articles/check-duplicates` - 检查重复文章
- `GET /api/crawler/sites/info` - 获取站点结构信息

### 2. 认证机制
- API密钥认证（X-API-Key + X-API-Client）
- 客户端白名单控制
- IP地址限制（可选）

### 3. 数据处理
- 支持HTML格式的文章内容
- 自动处理频道、地区、语言关联
- 智能去重（基于URL和标题）
- 外部站点信息管理
- 标签和分类自动创建

### 4. 安全特性
- HMAC密钥验证
- 批量操作数量限制
- 详细的操作日志
- 试运行模式支持

## 📁 文件结构

```
/opt/idp-cms/
├── apps/api/rest/crawler_api.py        # 爬虫API实现
├── config/
│   ├── urls.py                         # URL路由配置（已更新）
│   └── crawler_api_settings.py        # 配置示例
├── docs/
│   ├── CRAWLER_API_GUIDE.md          # 详细使用指南
│   └── CRAWLER_INTEGRATION_README.md  # 本文件
└── scripts/test_crawler_api.py         # API测试脚本
```

## ⚙️ 快速配置

### 1. 添加API密钥配置

在 `settings.py` 中添加：

```python
import os

# 爬虫API密钥
CRAWLER_API_KEYS = {
    'news_crawler': os.getenv('CRAWLER_API_KEY_NEWS', 'your-secret-key-here'),
    'content_bot': os.getenv('CRAWLER_API_KEY_CONTENT', 'another-secret-key'),
}

# 可选配置
CRAWLER_API_SETTINGS = {
    'MAX_ARTICLES_PER_BATCH': 100,
    'ALLOW_ARTICLE_UPDATES': True,
    'DETAILED_LOGGING': True,
}
```

### 2. 环境变量设置

```bash
# 生产环境
export CRAWLER_API_KEY_NEWS="your-production-secret-key"
export CRAWLER_API_KEY_CONTENT="another-production-key"

# 测试环境  
export CMS_BASE_URL="https://your-cms.com"
export TEST_SITE_HOSTNAME="your-site.com"
```

### 3. 运行测试

```bash
cd /opt/idp-cms
python scripts/test_crawler_api.py
```

## 🛠️ 使用示例

### Python爬虫示例

```python
import requests

class NewsSpider:
    def __init__(self):
        self.cms_client = CMSCrawlerClient(
            base_url="https://your-cms.com",
            api_key="your-secret-key",
            client_name="news_crawler"
        )
    
    def crawl_and_upload(self):
        # 1. 爬取文章数据
        articles = self.crawl_news_sites()
        
        # 2. 检查重复
        duplicates = self.cms_client.check_duplicates("target-site.com", articles)
        
        # 3. 过滤已存在的文章
        new_articles = [
            article for i, article in enumerate(articles)
            if not duplicates['results'][i]['is_duplicate']
        ]
        
        # 4. 批量上传
        if new_articles:
            result = self.cms_client.bulk_create_articles(
                "target-site.com", new_articles
            )
            print(f"上传完成: 新增{result['summary']['created']}篇文章")
```

### Node.js爬虫示例

```javascript
const puppeteer = require('puppeteer');
const { CMSCrawlerClient } = require('./cms-client');

class NewsScraper {
    constructor() {
        this.cms = new CMSCrawlerClient(
            'https://your-cms.com',
            process.env.CRAWLER_API_KEY,
            'js_scraper'
        );
    }
    
    async scrapeAndUpload() {
        const browser = await puppeteer.launch();
        const articles = await this.scrapeArticles(browser);
        
        const result = await this.cms.bulkCreateArticles(
            'target-site.com', 
            articles
        );
        
        console.log(`上传结果: ${result.summary.created} 篇新文章`);
        await browser.close();
    }
}
```

## 🔧 运维要点

### 监控指标
- API调用频率和成功率
- 文章创建/更新数量
- 重复文章检测效率
- 错误日志和异常模式

### 性能优化
- 单次批量操作限制在100篇文章以内
- 使用试运行模式验证数据
- 实现重试机制处理临时故障
- 定期清理测试数据

### 安全维护
- 定期轮换API密钥
- 监控异常访问模式
- 审查爬虫客户端权限
- 备份重要配置文件

## 🐛 故障排除

### 常见问题

1. **认证失败**
   - 检查API密钥是否正确配置
   - 确认客户端名称匹配
   - 验证请求头格式

2. **站点不存在**
   - 确认站点域名正确
   - 检查Wagtail站点配置
   - 验证多站点设置

3. **文章创建失败**
   - 检查必需字段是否完整
   - 验证HTML内容格式
   - 确认频道和地区配置

4. **权限问题**
   - 检查API客户端权限设置
   - 验证IP白名单配置
   - 确认数据库写入权限

### 日志查看

```bash
# 查看API操作日志
tail -f /opt/idp-cms/logs/crawler_api.log

# 查看Django应用日志
tail -f /opt/idp-cms/logs/django.log

# 查看Nginx访问日志（如适用）
tail -f /var/log/nginx/access.log | grep crawler
```

## 📝 下一步改进

- [ ] 支持图片自动下载和处理
- [ ] 实现增量更新机制
- [ ] 添加文章质量评分
- [ ] 支持Webhook通知
- [ ] 实现GraphQL API
- [ ] 添加数据统计面板

## 🤝 技术支持

如需帮助，请参考：
- 详细API文档: [CRAWLER_API_GUIDE.md](CRAWLER_API_GUIDE.md)
- 测试脚本: [test_crawler_api.py](../scripts/test_crawler_api.py)
- 配置示例: [crawler_api_settings.py](../config/crawler_api_settings.py)

---

**版本**: v1.0  
**更新时间**: 2024年9月  
**兼容性**: Wagtail 7.1+, Django 4.2+
