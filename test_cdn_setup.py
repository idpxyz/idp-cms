#!/usr/bin/env python3
"""
CDN配置测试脚本

测试CDN配置的基本功能
"""

import os
import sys
import django

# 设置Django环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

from apps.core.models import CDNProvider, SiteCDNConfig
from wagtail.models import Site
from apps.core.cdn.factory import CDNFactory


def test_cdn_models():
    """测试CDN模型"""
    print("=== 测试CDN模型 ===")
    
    # 创建测试CDN提供商
    provider, created = CDNProvider.objects.get_or_create(
        name="测试阿里云CDN",
        defaults={
            'provider_type': 'aliyun',
            'api_key': 'test_key',
            'api_secret': 'test_secret',
            'endpoint_url': 'https://cdn.aliyuncs.com',
            'is_active': True
        }
    )
    
    if created:
        print(f"✅ 创建CDN提供商: {provider.name}")
    else:
        print(f"✅ 获取CDN提供商: {provider.name}")
    
    # 获取默认站点
    site = Site.objects.get(is_default_site=True)
    
    # 创建测试站点CDN配置
    cdn_config, created = SiteCDNConfig.objects.get_or_create(
        site=site,
        defaults={
            'cdn_provider': provider,
            'cdn_domain': 'cdn.example.com',
            'cdn_ssl_enabled': True,
            'cache_strategy': 'balanced',
            'is_active': True
        }
    )
    
    if created:
        print(f"✅ 创建站点CDN配置: {cdn_config.site.site_name}")
    else:
        print(f"✅ 获取站点CDN配置: {cdn_config.site.site_name}")
    
    return provider, cdn_config


def test_cdn_factory():
    """测试CDN工厂"""
    print("\n=== 测试CDN工厂 ===")
    
    try:
        # 测试支持的CDN类型
        supported_types = CDNFactory.get_supported_providers()
        print(f"✅ 支持的CDN类型: {supported_types}")
        
        # 测试创建CDN提供商实例
        config = {
            'api_key': 'test_key',
            'api_secret': 'test_secret',
            'endpoint_url': 'https://cdn.aliyuncs.com',
            'domain': 'cdn.example.com',
            'provider_type': 'aliyun'
        }
        
        provider = CDNFactory.create_provider('aliyun', config)
        print(f"✅ 成功创建CDN提供商实例: {provider.__class__.__name__}")
        
        # 测试提供商信息
        info = provider.get_provider_info()
        print(f"✅ 提供商信息: {info}")
        
    except Exception as e:
        print(f"❌ CDN工厂测试失败: {e}")


def test_cdn_manager():
    """测试CDN管理器"""
    print("\n=== 测试CDN管理器 ===")
    
    try:
        from apps.core.cdn.manager import CDNManager
        
        cdn_manager = CDNManager()
        
        # 测试获取站点CDN配置
        site = Site.objects.get(is_default_site=True)
        config = cdn_manager.get_site_cdn_config(site.hostname)
        
        if config:
            print(f"✅ 成功获取站点CDN配置: {config.site.site_name}")
        else:
            print("⚠️ 未找到站点CDN配置")
        
        # 测试获取所有站点CDN状态
        all_status = cdn_manager.get_all_sites_cdn_status()
        print(f"✅ 获取所有站点CDN状态: {len(all_status)} 个站点")
        
    except Exception as e:
        print(f"❌ CDN管理器测试失败: {e}")


def test_cdn_api():
    """测试CDN API"""
    print("\n=== 测试CDN API ===")
    
    try:
        from django.test import Client
        from django.urls import reverse
        
        client = Client()
        
        # 测试获取支持的CDN类型
        response = client.get('/api/cdn/types/')
        if response.status_code == 200:
            print("✅ CDN类型API测试成功")
            print(f"   响应: {response.json()}")
        else:
            print(f"❌ CDN类型API测试失败: {response.status_code}")
        
        # 测试获取CDN提供商
        response = client.get('/api/cdn/providers/')
        if response.status_code == 200:
            print("✅ CDN提供商API测试成功")
            print(f"   响应: {response.json()}")
        else:
            print(f"❌ CDN提供商API测试失败: {response.status_code}")
        
    except Exception as e:
        print(f"❌ CDN API测试失败: {e}")


def main():
    """主测试函数"""
    print("🚀 开始CDN配置测试...\n")
    
    try:
        # 测试CDN模型
        provider, cdn_config = test_cdn_models()
        
        # 测试CDN工厂
        test_cdn_factory()
        
        # 测试CDN管理器
        test_cdn_manager()
        
        # 测试CDN API
        test_cdn_api()
        
        print("\n🎉 CDN配置测试完成！")
        
        # 清理测试数据
        print("\n🧹 清理测试数据...")
        cdn_config.delete()
        provider.delete()
        print("✅ 测试数据清理完成")
        
    except Exception as e:
        print(f"\n❌ 测试过程中发生错误: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
