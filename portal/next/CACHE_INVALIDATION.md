# 缓存失效机制 (Phase 4)

## 概述

第四阶段实现了完整的缓存失效机制，包括 Webhook 系统、缓存失效工具库、缓存管理界面和实时监控。

## 功能特性

### 1. Webhook 缓存失效系统

#### 端点

- **POST** `/api/revalidate` - 处理缓存失效请求
- **GET** `/api/revalidate` - 健康检查

#### 安全特性

- HMAC-SHA256 签名验证
- IP 白名单验证
- 事件类型验证

#### 支持的事件类型

```typescript
type CacheEvent =
  | 'article_published' // 文章发布
  | 'article_updated' // 文章更新
  | 'article_unpublished' // 文章下架
  | 'article_deleted' // 文章删除
  | 'channel_updated' // 频道更新
  | 'region_updated' // 地区更新
  | 'site_settings_updated' // 站点设置更新
  | 'bulk_update' // 批量更新
  | 'custom'; // 自定义事件
```

### 2. 缓存失效工具库

#### 核心函数

- `invalidateCacheLocally()` - 本地缓存失效
- `invalidateCacheViaWebhook()` - 通过 Webhook 失效缓存
- `generateCacheTags()` - 生成缓存标签

#### CacheInvalidator 类

```typescript
const invalidator = new CacheInvalidator('portal', {
  webhookUrl: '/api/revalidate',
  webhookSecret: 'your-secret',
});

// 失效文章缓存
await invalidator.invalidateArticle('12345', 'article_updated');

// 失效频道缓存
await invalidator.invalidateChannel('tech');

// 失效地区缓存
await invalidator.invalidateRegion('china');

// 失效站点缓存
await invalidator.invalidateSite();

// 批量失效
await invalidator.invalidateBulk(['site:portal', 'type:article']);
```

### 3. 缓存管理控制台

#### 功能

- 实时缓存标签管理
- 缓存失效操作
- Webhook 配置
- 操作结果监控

#### 访问路径

- `/cache-management` - 缓存管理控制台

### 4. 缓存监控组件

#### 实时指标

- 缓存标签数量
- 标签类型分布
- 缓存命中率
- 响应时间
- 内存使用率

#### 事件监控

- 缓存命中事件
- 缓存未命中事件
- 缓存失效事件

## 配置说明

### 环境变量

```bash
# Webhook 配置
WEBHOOK_SECRET=your-webhook-secret-key
WEBHOOK_ALLOWED_IPS=127.0.0.1,::1,192.168.1.0/24

# API 配置
DJANGO_API_URL=http://authoring:8000
NEXT_PUBLIC_DJANGO_API_URL=http://localhost:8000
```

### Webhook 请求格式

```json
{
  "event": "article_published",
  "site": "portal",
  "tags": ["site:portal", "type:article", "page:12345"],
  "paths": ["/news/12345"],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 响应格式

```json
{
  "success": true,
  "message": "Cache revalidation completed for article_published",
  "revalidated_count": 3,
  "site": "portal",
  "event": "article_published",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 使用方法

### 1. 基本缓存失效

```typescript
import { CacheInvalidator } from '@/lib/cacheInvalidation';

// 创建失效器实例
const invalidator = new CacheInvalidator('portal');

// 失效文章缓存
await invalidator.invalidateArticle('12345', 'article_updated');
```

### 2. 通过 Webhook 失效

```typescript
import { invalidateCacheViaWebhook } from '@/lib/cacheInvalidation';

// 发送 Webhook 请求
const result = await invalidateCacheViaWebhook({
  site: 'portal',
  event: 'article_published',
  tags: ['site:portal', 'type:article'],
  webhookUrl: '/api/revalidate',
  webhookSecret: 'your-secret',
});
```

### 3. 批量操作

```typescript
// 失效多个标签
await invalidator.invalidateBulk([
  'site:portal',
  'type:article',
  'channel:tech',
]);

// 失效多个路径
await invalidator.invalidateBulk(
  ['site:portal', 'type:article'],
  ['/news', '/tools']
);
```

## 集成指南

### 1. Django 后端集成

在 Django 视图中调用缓存失效：

```python
import requests
import hmac
import hashlib
import json

def invalidate_cache(event, site, tags=None, paths=None):
    webhook_url = 'http://nextjs:3000/api/revalidate'
    webhook_secret = 'your-secret'

    payload = {
        'event': event,
        'site': site,
        'tags': tags or [],
        'paths': paths or [],
        'timestamp': datetime.utcnow().isoformat()
    }

    # 生成签名
    signature = hmac.new(
        webhook_secret.encode(),
        json.dumps(payload).encode(),
        hashlib.sha256
    ).hexdigest()

    # 发送请求
    response = requests.post(
        webhook_url,
        json=payload,
        headers={'x-webhook-signature': signature}
    )

    return response.json()
```

### 2. 信号处理器集成

```python
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import ArticlePage

@receiver(post_save, sender=ArticlePage)
def invalidate_article_cache(sender, instance, created, **kwargs):
    event = 'article_published' if created else 'article_updated'

    invalidate_cache(
        event=event,
        site=instance.site.slug,
        tags=[
            f'site:{instance.site.slug}',
            f'type:article',
            f'page:{instance.id}'
        ],
        paths=[f'/news/{instance.slug}']
    )
```

## 性能优化

### 1. 批量操作

- 合并多个缓存失效请求
- 使用 `bulk_update` 事件类型
- 延迟执行非关键失效

### 2. 智能失效

- 按需失效相关缓存
- 避免级联失效
- 使用标签层级关系

### 3. 监控和告警

- 实时性能指标
- 异常情况告警
- 失效成功率统计

## 故障排除

### 常见问题

1. **Webhook 签名验证失败**
   - 检查 `WEBHOOK_SECRET` 配置
   - 验证签名生成算法

2. **IP 白名单拒绝**
   - 检查 `WEBHOOK_ALLOWED_IPS` 配置
   - 确认客户端 IP 地址

3. **缓存失效失败**
   - 检查 Next.js 缓存配置
   - 验证标签格式正确性

### 调试方法

1. **查看日志**

   ```bash
   docker compose logs portal
   ```

2. **测试 Webhook 健康状态**

   ```bash
   curl http://localhost:3000/api/revalidate
   ```

3. **使用缓存管理控制台**
   - 访问 `/cache-management`
   - 查看实时操作结果

## 最佳实践

### 1. 标签命名规范

- 使用小写字母和冒号分隔
- 保持命名一致性
- 避免过于复杂的标签结构

### 2. 失效策略

- 优先使用标签失效
- 谨慎使用路径失效
- 合理设置失效范围

### 3. 监控和维护

- 定期检查缓存命中率
- 监控失效操作成功率
- 及时清理无效标签

## 总结

第四阶段完成了缓存失效机制的核心功能，提供了：

- ✅ 完整的 Webhook 系统
- ✅ 灵活的缓存失效工具
- ✅ 直观的管理界面
- ✅ 实时的监控组件
- ✅ 详细的文档说明

这套系统为 Next.js 应用提供了企业级的缓存管理能力，支持复杂的缓存策略和高效的失效机制。
