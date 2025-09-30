# 新闻网站限流配置建议

## 问题现状
当前后端API返回429错误频率过高，影响用户体验。

## 建议的后端限流策略

### 1. Django后端配置（django-ratelimit）

```python
# settings.py
RATELIMIT_ENABLE = True
RATELIMIT_USE_CACHE = 'default'

# 限流装饰器配置
RATE_LIMIT_CONFIG = {
    'feed_api': {
        'rate': '120/m',  # 每分钟120次
        'block': False,   # 不阻断，只记录
        'methods': ['GET'],
    },
    'articles_api': {
        'rate': '240/m',  # 每分钟240次  
        'block': False,
        'methods': ['GET'],
    },
    'global_ip': {
        'rate': '3600/h', # 每IP每小时3600次
        'block': True,    # 超限阻断
    }
}
```

### 2. Nginx层限流

```nginx
# nginx.conf
http {
    # 定义限流区域
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=feed:10m rate=2r/s;
    
    server {
        # API接口限流
        location /api/feed {
            limit_req zone=feed burst=10 nodelay;
            proxy_pass http://backend;
        }
        
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend;
        }
    }
}
```

### 3. Redis缓存优化

```python
# 增加缓存时间
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'TIMEOUT': 300,  # 5分钟默认缓存
    }
}

# 接口缓存装饰器
@cache_page(120)  # 2分钟缓存
def feed_api_view(request):
    pass
```

## 前端优化建议

### 1. 请求合并
- 避免同时发起多个相同请求
- 使用防抖动（debounce）机制

### 2. 预加载策略
- 首页关键数据预加载
- 用户行为预测加载

### 3. 错误处理
- 优雅降级到缓存数据
- 友好的限流提示页面

## 监控指标

### 1. 关键指标
- API响应时间
- 429错误率
- 缓存命中率
- 用户体验评分

### 2. 告警阈值
- 429错误率 > 5%
- API响应时间 > 2秒
- 缓存命中率 < 80%

## 实施步骤

1. **立即**：调整后端限流阈值（放宽到2次/秒）
2. **短期**：实施分层缓存策略
3. **中期**：添加智能降级机制
4. **长期**：建立完整的监控体系

## 测试验证

```bash
# 压力测试命令
ab -n 1000 -c 10 http://localhost:3001/api/feed

# 监控429错误率
curl -s http://localhost:3001/api/feed | jq '.debug.strategy_type'
```
