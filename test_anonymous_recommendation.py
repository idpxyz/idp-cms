#!/usr/bin/env python
"""
测试匿名用户推荐系统

使用方法:
python test_anonymous_recommendation.py
"""

import os
import sys
import django
from django.test import RequestFactory

# 设置Django环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from apps.api.rest.anonymous_recommendation import AnonymousRecommendationEngine
from apps.api.rest.feed import feed


def test_anonymous_recommendation():
    """测试匿名用户推荐系统"""
    print("=== 测试匿名用户推荐系统 ===\n")
    
    # 创建测试请求
    factory = RequestFactory()
    
    # 模拟匿名用户请求
    request = factory.get('/api/feed', {
        'size': 10,
        'sort': 'final_score'
    })
    
    # 设置请求头模拟设备信息
    request.META.update({
        'HTTP_USER_AGENT': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'REMOTE_ADDR': '192.168.1.100',
        'HTTP_HOST': 'localhost:8000'
    })
    
    # 模拟匿名用户
    request.user = type('AnonymousUser', (), {'is_authenticated': False, 'is_active': True})()
    
    print("1. 测试设备指纹生成...")
    engine = AnonymousRecommendationEngine()
    device_id = engine.get_device_fingerprint(request)
    session_id = engine.get_session_id(request)
    print(f"   设备ID: {device_id}")
    print(f"   会话ID: {session_id}")
    
    print("\n2. 测试用户画像构建...")
    try:
        profile = engine.get_anonymous_user_profile(device_id, session_id, 'localhost')
        print(f"   用户类型: {profile['user_type']}")
        print(f"   置信度: {profile['confidence_score']:.2f}")
        print(f"   兴趣标签: {profile['interests']}")
        print(f"   偏好频道: {[ch[0] for ch in profile['preferred_channels'][:5]]}")
        print(f"   多样性级别: {profile['diversity_level']}")
    except Exception as e:
        print(f"   错误: {e}")
    
    print("\n3. 测试推荐策略...")
    try:
        strategy = engine.get_recommendation_strategy(profile)
        print(f"   策略类型: {strategy['type']}")
        print(f"   推荐频道: {strategy['channels']}")
        print(f"   频道权重: {strategy['weights']}")
        print(f"   多样性提升: {strategy['diversity_boost']}")
    except Exception as e:
        print(f"   错误: {e}")
    
    print("\n4. 测试完整推荐API...")
    try:
        response = feed(request)
        if response.status_code == 200:
            data = response.data
            print(f"   状态码: {response.status_code}")
            print(f"   推荐文章数: {len(data.get('items', []))}")
            print(f"   调试信息: {data.get('debug', {})}")
            
            # 显示前3个推荐结果
            items = data.get('items', [])
            if items:
                print("\n   前3个推荐结果:")
                for i, item in enumerate(items[:3], 1):
                    print(f"   {i}. {item.get('title', 'N/A')} (频道: {item.get('channel', 'N/A')}, 分数: {item.get('final_score', 0):.2f})")
        else:
            print(f"   错误: HTTP {response.status_code}")
    except Exception as e:
        print(f"   错误: {e}")
    
    print("\n=== 测试完成 ===")


def test_different_user_scenarios():
    """测试不同用户场景"""
    print("\n=== 测试不同用户场景 ===\n")
    
    factory = RequestFactory()
    
    # 场景1: 新用户（无历史数据）
    print("场景1: 新用户（无历史数据）")
    request1 = factory.get('/api/feed')
    request1.META.update({
        'HTTP_USER_AGENT': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        'REMOTE_ADDR': '192.168.1.101',
        'HTTP_HOST': 'localhost:8000'
    })
    request1.user = type('AnonymousUser', (), {'is_authenticated': False, 'is_active': True})()
    
    try:
        response1 = feed(request1)
        debug1 = response1.data.get('debug', {})
        print(f"   策略类型: {debug1.get('strategy_type')}")
        print(f"   推荐频道: {debug1.get('channels')}")
        print(f"   置信度: {debug1.get('confidence_score')}")
    except Exception as e:
        print(f"   错误: {e}")
    
    # 场景2: 已登录用户
    print("\n场景2: 已登录用户")
    request2 = factory.get('/api/feed')
    request2.META.update({
        'HTTP_USER_AGENT': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'REMOTE_ADDR': '192.168.1.102',
        'HTTP_HOST': 'localhost:8000'
    })
    request2.user = type('User', (), {'is_authenticated': True, 'is_active': True, 'id': 123})()
    
    try:
        response2 = feed(request2)
        debug2 = response2.data.get('debug', {})
        print(f"   用户类型: {debug2.get('user_type')}")
        print(f"   策略类型: {debug2.get('strategy_type')}")
        print(f"   推荐频道: {debug2.get('channels')}")
    except Exception as e:
        print(f"   错误: {e}")


if __name__ == '__main__':
    test_anonymous_recommendation()
    test_different_user_scenarios()
