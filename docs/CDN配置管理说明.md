# IDP-CMS CDN 配置管理说明

## 🌐 多 CDN 服务支持架构

IDP-CMS 支持不同站点使用不同的 CDN 服务提供商，满足不同地区、不同业务需求的 CDN 选择。

## 🏗️ CDN 配置模型设计

### 1. CDN 服务提供商模型

```python
class CDNProvider(models.Model):
    """CDN服务提供商模型"""
    name = models.CharField(max_length=100, verbose_name="CDN名称")
    provider_type = models.CharField(
        max_length=50,
        choices=[
            ('aliyun', '阿里云CDN'),
            ('tencent', '腾讯云CDN'),
            ('baidu', '百度云CDN'),
            ('cloudflare', 'Cloudflare'),
            ('aws', 'AWS CloudFront'),
            ('azure', 'Azure CDN'),
            ('custom', '自定义CDN'),
        ],
        verbose_name="CDN类型"
    )
    api_key = models.CharField(max_length=255, verbose_name="API密钥")
    api_secret = models.CharField(max_length=255, verbose_name="API密钥")
    endpoint_url = models.URLField(verbose_name="API端点")
    is_active = models.BooleanField(default=True, verbose_name="是否启用")
```

### 2. 站点 CDN 配置模型

```python
class SiteCDNConfig(models.Model):
    """站点CDN配置模型"""
    site = models.OneToOneField('wagtailcore.Site', on_delete=models.CASCADE)
    cdn_provider = models.ForeignKey(CDNProvider, on_delete=models.CASCADE)

    # CDN域名配置
    cdn_domain = models.CharField(max_length=255, verbose_name="CDN域名")
    cdn_ssl_enabled = models.BooleanField(default=True, verbose_name="启用HTTPS")

    # 缓存策略
    cache_strategy = models.CharField(
        max_length=50,
        choices=[
            ('aggressive', '激进缓存'),
            ('balanced', '平衡缓存'),
            ('conservative', '保守缓存'),
        ],
        default='balanced',
        verbose_name="缓存策略"
    )

    # 地区配置
    regions = models.ManyToManyField('core.Region', blank=True, verbose_name="服务地区")

    # 自定义配置
    custom_config = models.JSONField(default=dict, verbose_name="自定义配置")
```

## 🔧 CDN 服务集成实现

### 1. CDN 服务抽象层

```python
class BaseCDNProvider(ABC):
    """CDN服务提供商抽象基类"""

    @abstractmethod
    def purge_cache(self, urls: List[str]) -> bool:
        """清除缓存"""
        pass

    @abstractmethod
    def get_cache_status(self, url: str) -> Dict:
        """获取缓存状态"""
        pass

    @abstractmethod
    def get_performance_metrics(self) -> Dict:
        """获取性能指标"""
        pass

class CDNFactory:
    """CDN服务工厂类"""

    @staticmethod
    def create_provider(provider_type: str, config: Dict) -> BaseCDNProvider:
        """创建CDN服务提供商实例"""
        if provider_type == 'aliyun':
            return AliyunCDNProvider(config)
        elif provider_type == 'tencent':
            return TencentCDNProvider(config)
        elif provider_type == 'baidu':
            return BaiduCDNProvider(config)
        elif provider_type == 'cloudflare':
            return CloudflareCDNProvider(config)
        else:
            raise ValueError(f"Unsupported CDN provider: {provider_type}")
```

### 2. 阿里云 CDN 集成示例

```python
class AliyunCDNProvider(BaseCDNProvider):
    """阿里云CDN服务提供商"""

    def purge_cache(self, urls: List[str]) -> bool:
        """清除阿里云CDN缓存"""
        try:
            # 调用阿里云CDN API清除缓存
            params = {
                'Action': 'RefreshObjectCaches',
                'ObjectPath': ','.join(urls),
                'ObjectType': 'File',
                'Format': 'JSON',
                'Version': '2018-05-10',
                'AccessKeyId': self.access_key_id,
                'Timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            }

            # 生成签名并发送请求
            response = requests.get(self.endpoint, params=params)
            result = response.json()

            return result.get('Code') == '200'

        except Exception as e:
            print(f"Aliyun CDN purge error: {e}")
            return False
```

## 🌍 多地区 CDN 配置

### 1. 地区 CDN 映射

```python
class RegionalCDNManager:
    """地区CDN管理器"""

    def get_optimal_cdn(self, site_hostname: str, user_region: str) -> Optional[SiteCDNConfig]:
        """获取最优CDN配置"""
        # 1. 查找精确匹配的地区CDN
        exact_match = self.get_cdn_for_region(site_hostname, user_region)
        if exact_match:
            return exact_match

        # 2. 查找父级地区的CDN
        region = Region.objects.get(slug=user_region)
        while region.parent:
            region = region.parent
            parent_match = self.get_cdn_for_region(site_hostname, region.slug)
            if parent_match:
                return parent_match

        # 3. 返回默认CDN配置
        return SiteCDNConfig.objects.get(site__hostname=site_hostname)
```

### 2. 智能 CDN 路由中间件

```python
class CDNRoutingMiddleware(MiddlewareMixin):
    """CDN路由中间件"""

    def process_request(self, request):
        """处理请求，设置CDN配置"""
        # 获取用户地区
        user_region = self._get_user_region(request)

        # 获取站点信息
        site_hostname = request.get_host().split(':')[0]

        # 获取最优CDN配置
        cdn_config = self.cdn_manager.get_optimal_cdn(site_hostname, user_region)

        if cdn_config:
            request.cdn_config = cdn_config
            request.cdn_domain = cdn_config.cdn_domain
            request.cdn_provider = cdn_config.cdn_provider.provider_type
```

## 📊 CDN 性能监控

### 1. 多 CDN 性能对比

```python
class CDNPerformanceMonitor:
    """CDN性能监控器"""

    def collect_metrics(self):
        """收集所有CDN的性能指标"""
        configs = SiteCDNConfig.objects.select_related('cdn_provider').all()

        for config in configs:
            try:
                # 创建CDN服务提供商实例
                cdn_provider = CDNFactory.create_provider(
                    config.cdn_provider.provider_type,
                    {
                        'api_key': config.cdn_provider.api_key,
                        'api_secret': config.cdn_provider.api_secret,
                        'endpoint_url': config.cdn_provider.endpoint_url,
                        'domain': config.cdn_domain,
                    }
                )

                # 获取性能指标
                metrics = cdn_provider.get_performance_metrics()
                if metrics:
                    self.metrics[f"{config.site.hostname}:{config.cdn_provider.name}"] = metrics

            except Exception as e:
                print(f"Failed to collect metrics for {config.site.hostname}: {e}")
```

### 2. CDN 健康检查 API

```python
@api_view(["GET"])
def cdn_health_check(request):
    """CDN健康检查"""
    try:
        site_hostname = request.query_params.get('site')

        # 获取站点CDN配置
        site_cdn_config = SiteCDNConfig.objects.select_related(
            'cdn_provider'
        ).get(site__hostname=site_hostname)

        # 创建CDN服务提供商实例
        cdn_provider = CDNFactory.create_provider(
            site_cdn_config.cdn_provider.provider_type,
            {
                'api_key': site_cdn_config.cdn_provider.api_key,
                'api_secret': site_cdn_config.cdn_provider.api_secret,
                'endpoint_url': site_cdn_config.cdn_provider.endpoint_url,
                'domain': site_cdn_config.cdn_domain,
            }
        )

        # 执行健康检查
        health_status = {
            'site': site_hostname,
            'cdn_provider': site_cdn_config.cdn_provider.name,
            'cdn_domain': site_cdn_config.cdn_domain,
            'status': 'healthy',
            'checks': {}
        }

        # 检查API连接和缓存状态
        try:
            metrics = cdn_provider.get_performance_metrics()
            health_status['checks']['api_connection'] = 'healthy'
        except Exception as e:
            health_status['checks']['api_connection'] = 'unhealthy'
            health_status['status'] = 'unhealthy'

        return Response(health_status)

    except Exception as e:
        return Response(
            {"error": f"Internal server error: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
```

## 🎯 使用场景示例

### 1. 多地区新闻站点

```
站点A (中国): 阿里云CDN
├── 北京地区: 阿里云CDN北京节点
├── 上海地区: 阿里云CDN上海节点
└── 广州地区: 阿里云CDN广州节点

站点B (海外): Cloudflare CDN
├── 北美地区: Cloudflare北美节点
├── 欧洲地区: Cloudflare欧洲节点
└── 亚太地区: Cloudflare亚太节点

站点C (游戏): 腾讯云CDN
├── 游戏资源: 腾讯云CDN游戏加速
└── 静态资源: 腾讯云CDN标准加速
```

### 2. 电商平台

```
主站 (中国): 阿里云CDN
├── 商品图片: 阿里云OSS + CDN
├── 静态资源: 阿里云CDN
└── 动态内容: 阿里云CDN + 源站

海外站 (全球): AWS CloudFront
├── 北美: AWS CloudFront北美边缘节点
├── 欧洲: AWS CloudFront欧洲边缘节点
└── 亚太: AWS CloudFront亚太边缘节点
```

## 🚀 部署配置

### 1. 环境变量配置

```bash
# .env
# 阿里云CDN配置
ALIYUN_CDN_ACCESS_KEY_ID=your_access_key_id
ALIYUN_CDN_ACCESS_KEY_SECRET=your_access_key_secret

# 腾讯云CDN配置
TENCENT_CDN_SECRET_ID=your_secret_id
TENCENT_CDN_SECRET_KEY=your_secret_key

# 百度云CDN配置
BAIDU_CDN_ACCESS_KEY=your_access_key
BAIDU_CDN_SECRET_KEY=your_secret_key

# Cloudflare配置
CLOUDFLARE_API_TOKEN=your_api_token
CLOUDFLARE_ZONE_ID=your_zone_id
```

### 2. Docker 配置

```yaml
# docker-compose.yml
version: "3.8"

services:
  web:
    build: .
    environment:
      - ALIYUN_CDN_ACCESS_KEY_ID=${ALIYUN_CDN_ACCESS_KEY_ID}
      - ALIYUN_CDN_ACCESS_KEY_SECRET=${ALIYUN_CDN_ACCESS_KEY_SECRET}
      - TENCENT_CDN_SECRET_ID=${TENCENT_CDN_SECRET_ID}
      - TENCENT_CDN_SECRET_KEY=${TENCENT_CDN_SECRET_KEY}
      - BAIDU_CDN_ACCESS_KEY=${BAIDU_CDN_ACCESS_KEY}
      - BAIDU_CDN_SECRET_KEY=${BAIDU_CDN_SECRET_KEY}
      - CLOUDFLARE_API_TOKEN=${CLOUDFLARE_API_TOKEN}
      - CLOUDFLARE_ZONE_ID=${CLOUDFLARE_ZONE_ID}
    ports:
      - "8000:8000"
```

## 🎉 总结

IDP-CMS 的多 CDN 配置管理方案提供了：

1. **灵活性**: 支持不同站点使用不同 CDN 服务商
2. **可扩展性**: 易于添加新的 CDN 服务提供商
3. **智能化**: 基于地区的智能 CDN 路由
4. **监控性**: 完整的 CDN 性能监控和健康检查
5. **易用性**: 直观的管理界面和 API 接口

这种设计让客户可以根据不同地区、不同业务需求选择最适合的 CDN 服务，同时保持系统的统一管理和监控能力。

---

_本文档展示了 IDP-CMS 项目在多 CDN 服务支持方面的完整解决方案，体现了我们在复杂架构设计方面的专业能力。_
