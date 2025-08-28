#!/usr/bin/env python3
"""
创建CDN配置示例数据

演示如何配置多CDN服务
"""

import os
import django

# 设置Django环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

from apps.core.models import CDNProvider, SiteCDNConfig, Region
from wagtail.models import Site


def create_cdn_examples():
    """创建CDN配置示例"""
    print("🚀 创建CDN配置示例...\n")
    
    # 1. 创建CDN服务提供商
    print("=== 创建CDN服务提供商 ===")
    
    # 阿里云CDN
    aliyun_cdn, created = CDNProvider.objects.get_or_create(
        name="阿里云CDN",
        defaults={
            'provider_type': 'aliyun',
            'api_key': 'your_aliyun_access_key_id',
            'api_secret': 'your_aliyun_access_key_secret',
            'endpoint_url': 'https://cdn.aliyuncs.com',
            'is_active': True
        }
    )
    print(f"{'✅ 创建' if created else '✅ 获取'} 阿里云CDN: {aliyun_cdn.name}")
    
    # 腾讯云CDN
    tencent_cdn, created = CDNProvider.objects.get_or_create(
        name="腾讯云CDN",
        defaults={
            'provider_type': 'tencent',
            'api_key': 'your_tencent_secret_id',
            'api_secret': 'your_tencent_secret_key',
            'endpoint_url': 'https://cdn.tencentcloudapi.com',
            'is_active': True
        }
    )
    print(f"{'✅ 创建' if created else '✅ 获取'} 腾讯云CDN: {tencent_cdn.name}")
    
    # Cloudflare CDN
    cloudflare_cdn, created = CDNProvider.objects.get_or_create(
        name="Cloudflare CDN",
        defaults={
            'provider_type': 'cloudflare',
            'api_key': 'your_cloudflare_api_token',
            'api_secret': 'your_cloudflare_zone_id',
            'endpoint_url': 'https://api.cloudflare.com',
            'is_active': True
        }
    )
    print(f"{'✅ 创建' if created else '✅ 获取'} Cloudflare CDN: {cloudflare_cdn.name}")
    
    # 2. 获取站点和地区
    print("\n=== 获取站点和地区 ===")
    
    sites = Site.objects.all()
    regions = Region.objects.all()
    
    print(f"✅ 找到 {sites.count()} 个站点")
    print(f"✅ 找到 {regions.count()} 个地区")
    
    # 3. 为每个站点配置CDN
    print("\n=== 配置站点CDN ===")
    
    for i, site in enumerate(sites):
        # 根据站点选择不同的CDN
        if i == 0:  # 第一个站点使用阿里云CDN
            cdn_provider = aliyun_cdn
            cdn_domain = f"cdn-{site.hostname}.aliyuncs.com"
            cache_strategy = 'aggressive'
        elif i == 1:  # 第二个站点使用腾讯云CDN
            cdn_provider = tencent_cdn
            cdn_domain = f"cdn-{site.hostname}.tencent.com"
            cache_strategy = 'balanced'
        else:  # 其他站点使用Cloudflare
            cdn_provider = cloudflare_cdn
            cdn_domain = f"cdn-{site.hostname}.cloudflare.com"
            cache_strategy = 'conservative'
        
        # 创建或更新CDN配置
        cdn_config, created = SiteCDNConfig.objects.get_or_create(
            site=site,
            defaults={
                'cdn_provider': cdn_provider,
                'cdn_domain': cdn_domain,
                'cdn_ssl_enabled': True,
                'cache_strategy': cache_strategy,
                'is_active': True,
                'custom_config': {
                    'enable_gzip': True,
                    'enable_brotli': True,
                    'cache_control': 'public, max-age=3600'
                }
            }
        )
        
        if created:
            print(f"✅ 创建 {site.site_name} 的CDN配置: {cdn_provider.name}")
        else:
            # 更新现有配置
            cdn_config.cdn_provider = cdn_provider
            cdn_config.cdn_domain = cdn_domain
            cdn_config.cache_strategy = cache_strategy
            cdn_config.save()
            print(f"✅ 更新 {site.site_name} 的CDN配置: {cdn_provider.name}")
        
        # 为配置添加地区（如果有地区的话）
        if regions.exists():
            cdn_config.regions.set(regions[:2])  # 添加前两个地区作为示例
    
    # 4. 显示配置结果
    print("\n=== CDN配置结果 ===")
    
    all_configs = SiteCDNConfig.objects.select_related('site', 'cdn_provider').all()
    
    for config in all_configs:
        regions_list = [r.name for r in config.regions.all()]
        print(f"📍 {config.site.site_name} ({config.site.hostname})")
        print(f"   CDN: {config.cdn_provider.name} ({config.cdn_provider.provider_type})")
        print(f"   域名: {config.cdn_domain}")
        print(f"   策略: {config.get_cache_strategy_display()}")
        print(f"   地区: {', '.join(regions_list) if regions_list else '无'}")
        print(f"   状态: {'启用' if config.is_active else '禁用'}")
        print()
    
    print("🎉 CDN配置示例创建完成！")
    print("\n📝 下一步操作:")
    print("1. 访问 http://localhost:8000/admin/snippets/ 查看CDN配置")
    print("2. 修改API密钥为真实的CDN服务商密钥")
    print("3. 测试CDN API接口")
    print("4. 配置真实的CDN域名")


if __name__ == "__main__":
    create_cdn_examples()
