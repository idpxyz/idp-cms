#!/usr/bin/env python3
"""
测试Hero和TopStories API分离效果的脚本
"""

import asyncio
import aiohttp
import time
import json
from datetime import datetime


async def test_hero_api(session, base_url):
    """测试Hero API"""
    print("🎬 测试Hero API...")
    
    url = f"{base_url}/api/hero/"
    params = {
        'size': 5,
        'hours': 168,
        'site': 'aivoya.com'
    }
    
    start_time = time.time()
    try:
        async with session.get(url, params=params) as response:
            elapsed = time.time() - start_time
            data = await response.json()
            
            print(f"✅ Hero API响应: {response.status}")
            print(f"⏱️ 响应时间: {elapsed:.3f}s")
            print(f"📊 返回数据: {len(data.get('items', []))} 个Hero项目")
            
            if data.get('cache_info'):
                cache_info = data['cache_info']
                print(f"💾 缓存状态: {'命中' if cache_info.get('hit') else '未命中'}")
                print(f"🕒 缓存TTL: {cache_info.get('ttl')}s")
            
            # 验证Hero数据结构
            items = data.get('items', [])
            if items:
                sample = items[0]
                required_fields = ['id', 'title', 'image_url', 'publish_time']
                missing_fields = [f for f in required_fields if f not in sample]
                if missing_fields:
                    print(f"⚠️ Hero数据缺少字段: {missing_fields}")
                else:
                    print("✅ Hero数据结构完整")
            
            return True
            
    except Exception as e:
        print(f"❌ Hero API测试失败: {e}")
        return False


async def test_topstories_api(session, base_url):
    """测试TopStories API"""
    print("\n📰 测试TopStories API...")
    
    url = f"{base_url}/api/topstories/"
    params = {
        'size': 9,
        'hours': 24,
        'diversity': 'high',
        'site': 'aivoya.com'
    }
    
    start_time = time.time()
    try:
        async with session.get(url, params=params) as response:
            elapsed = time.time() - start_time
            data = await response.json()
            
            print(f"✅ TopStories API响应: {response.status}")
            print(f"⏱️ 响应时间: {elapsed:.3f}s")
            print(f"📊 返回数据: {len(data.get('items', []))} 个TopStory项目")
            
            if data.get('cache_info'):
                cache_info = data['cache_info']
                print(f"💾 缓存状态: {'命中' if cache_info.get('hit') else '未命中'}")
                print(f"🕒 缓存TTL: {cache_info.get('ttl')}s")
            
            # 验证调试信息
            if data.get('debug'):
                debug = data['debug']
                print(f"🔍 调试信息:")
                print(f"  - 候选数量: {debug.get('candidates', 0)}")
                print(f"  - 聚类数量: {debug.get('clusters', 0)}")
                print(f"  - 最终数量: {debug.get('final_count', 0)}")
                if debug.get('timing'):
                    timing = debug['timing']
                    print(f"  - OpenSearch耗时: {timing.get('opensearch_ms', 0)}ms")
                    print(f"  - 处理耗时: {timing.get('processing_ms', 0)}ms")
            
            # 验证TopStories数据结构
            items = data.get('items', [])
            if items:
                sample = items[0]
                required_fields = ['id', 'title', 'topstory_score']
                missing_fields = [f for f in required_fields if f not in sample]
                if missing_fields:
                    print(f"⚠️ TopStories数据缺少字段: {missing_fields}")
                else:
                    print("✅ TopStories数据结构完整")
                    print(f"📈 样例评分: {sample.get('topstory_score', 0):.4f}")
            
            return True
            
    except Exception as e:
        print(f"❌ TopStories API测试失败: {e}")
        return False


async def test_api_separation():
    """测试API分离效果"""
    print("🚀 开始测试Hero和TopStories API分离...")
    print(f"📅 测试时间: {datetime.now().isoformat()}")
    
    # 配置测试URL（根据实际部署调整）
    base_url = "http://localhost:8000"  # 开发环境
    # base_url = "https://your-domain.com"  # 生产环境
    
    async with aiohttp.ClientSession() as session:
        # 并行测试两个API
        hero_task = test_hero_api(session, base_url)
        topstories_task = test_topstories_api(session, base_url)
        
        results = await asyncio.gather(hero_task, topstories_task, return_exceptions=True)
        
        hero_success = results[0] if not isinstance(results[0], Exception) else False
        topstories_success = results[1] if not isinstance(results[1], Exception) else False
        
        print(f"\n📋 测试总结:")
        print(f"🎬 Hero API: {'✅ 成功' if hero_success else '❌ 失败'}")
        print(f"📰 TopStories API: {'✅ 成功' if topstories_success else '❌ 失败'}")
        
        if hero_success and topstories_success:
            print("🎉 API分离测试完全成功！")
            return True
        else:
            print("⚠️ 部分API测试失败，请检查后端服务状态")
            return False


async def compare_with_old_api(session, base_url):
    """对比新旧API的性能"""
    print("\n⚡ 性能对比测试...")
    
    # 测试新API
    print("测试新的专用API...")
    start_time = time.time()
    
    hero_task = session.get(f"{base_url}/api/hero/", params={'size': 5})
    topstories_task = session.get(f"{base_url}/api/topstories/", params={'size': 9})
    
    responses = await asyncio.gather(hero_task, topstories_task, return_exceptions=True)
    new_api_time = time.time() - start_time
    
    # 测试旧API（如果还存在）
    print("测试旧的统一API...")
    start_time = time.time()
    
    old_hero_task = session.get(f"{base_url}/api/headlines/", params={'mode': 'hero', 'size': 5})
    old_topstories_task = session.get(f"{base_url}/api/headlines/", params={'mode': 'topstories', 'size': 9})
    
    try:
        old_responses = await asyncio.gather(old_hero_task, old_topstories_task, return_exceptions=True)
        old_api_time = time.time() - start_time
        
        print(f"📊 性能对比:")
        print(f"🆕 新API总耗时: {new_api_time:.3f}s")
        print(f"🔄 旧API总耗时: {old_api_time:.3f}s")
        print(f"⚡ 性能提升: {((old_api_time - new_api_time) / old_api_time * 100):.1f}%")
        
    except Exception as e:
        print(f"旧API测试跳过（可能已禁用）: {e}")


if __name__ == "__main__":
    asyncio.run(test_api_separation())
