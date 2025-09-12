#!/usr/bin/env python3
"""
测试重试机制和幂等性功能
"""

import requests
import json
import time
import uuid

# 测试配置
BASE_URL = "http://localhost:8000"
NEXT_URL = "http://localhost:3001"

def test_django_idempotency():
    """测试Django API的幂等性"""
    print("🔧 测试Django API幂等性...")
    
    # 生成幂等键
    idempotency_key = f"test_{uuid.uuid4().hex[:8]}"
    
    headers = {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotency_key
    }
    
    # 测试数据
    test_data = {
        "title": "测试文章",
        "content": "测试内容"
    }
    
    # 第一次请求
    print(f"📤 发送第一次请求，幂等键: {idempotency_key}")
    try:
        response1 = requests.post(
            f"{BASE_URL}/api/track/",
            json=test_data,
            headers=headers,
            timeout=10
        )
        print(f"✅ 第一次请求状态: {response1.status_code}")
        if response1.headers.get('X-Idempotency-Replayed'):
            print(f"🔄 幂等性标记: {response1.headers['X-Idempotency-Replayed']}")
    except Exception as e:
        print(f"❌ 第一次请求失败: {e}")
        return
    
    # 第二次请求（相同幂等键）
    print(f"📤 发送第二次请求，相同幂等键: {idempotency_key}")
    try:
        response2 = requests.post(
            f"{BASE_URL}/api/track/",
            json=test_data,
            headers=headers,
            timeout=10
        )
        print(f"✅ 第二次请求状态: {response2.status_code}")
        replayed = response2.headers.get('X-Idempotency-Replayed', 'false')
        print(f"🔄 幂等性标记: {replayed}")
        
        if replayed == 'true':
            print("✅ 幂等性功能正常工作！")
        else:
            print("⚠️ 幂等性功能可能未生效")
            
    except Exception as e:
        print(f"❌ 第二次请求失败: {e}")

def test_nextjs_retry():
    """测试Next.js API的重试机制"""
    print("\n🔧 测试Next.js API重试机制...")
    
    # 测试正常文章API
    test_slug = "深度分析科技行业发展趋势报告-09月06日第39篇"
    
    print(f"📤 测试文章API: {test_slug}")
    try:
        start_time = time.time()
        response = requests.get(
            f"{NEXT_URL}/api/articles/{test_slug}?site=aivoya.com",
            timeout=15
        )
        end_time = time.time()
        
        print(f"✅ 响应状态: {response.status_code}")
        print(f"⏱️ 响应时间: {end_time - start_time:.2f}秒")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 成功获取文章: {data.get('success', False)}")
            if 'meta' in data:
                print(f"📊 执行时间: {data['meta'].get('execution_time_ms')}ms")
                print(f"🔄 请求ID: {data['meta'].get('request_id')}")
            if 'debug' in data:
                print(f"🔍 数据源: {data['debug'].get('source')}")
                print(f"🔄 使用fallback: {data['debug'].get('fallback_used')}")
                
    except Exception as e:
        print(f"❌ 请求失败: {e}")

def test_feed_api_resilience():
    """测试Feed API的弹性功能"""
    print("\n🔧 测试Feed API弹性...")
    
    print("📤 测试Feed API响应")
    try:
        start_time = time.time()
        response = requests.get(
            f"{NEXT_URL}/api/feed?channels=hot&size=5",
            timeout=15
        )
        end_time = time.time()
        
        print(f"✅ 响应状态: {response.status_code}")
        print(f"⏱️ 响应时间: {end_time - start_time:.2f}秒")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 成功获取推荐: {data.get('success', False)}")
            print(f"📊 推荐数量: {len(data.get('data', []))}")
            if 'meta' in data:
                print(f"🗃️ 缓存状态: {data['meta'].get('cache_status')}")
            if 'debug' in data:
                print(f"🎯 推荐策略: {data['debug'].get('strategy_type')}")
                
    except Exception as e:
        print(f"❌ 请求失败: {e}")

def test_error_handling():
    """测试错误处理和重试头"""
    print("\n🔧 测试错误处理...")
    
    # 测试不存在的文章
    print("📤 测试404错误处理")
    try:
        response = requests.get(
            f"{NEXT_URL}/api/articles/不存在的文章?site=aivoya.com",
            timeout=10
        )
        print(f"✅ 响应状态: {response.status_code}")
        
        if response.status_code == 404:
            data = response.json()
            print(f"✅ 错误响应结构正确: {data.get('success') == False}")
            if 'error' in data:
                print(f"🚨 错误代码: {data['error'].get('code')}")
                print(f"📝 错误消息: {data['error'].get('message')}")
                
    except Exception as e:
        print(f"❌ 请求失败: {e}")

def main():
    """主测试函数"""
    print("🚀 开始测试重试机制和幂等性功能\n")
    
    # 测试各项功能
    test_django_idempotency()
    test_nextjs_retry()
    test_feed_api_resilience()
    test_error_handling()
    
    print("\n✅ 测试完成！")

if __name__ == "__main__":
    main()
