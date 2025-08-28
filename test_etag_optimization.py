#!/usr/bin/env python3
"""
ETag优化功能测试脚本

测试以下功能：
1. 基于时间戳的ETag生成
2. 条件请求处理
3. ETag缓存性能
"""

import os
import sys
import django
import time
from datetime import datetime, timedelta

# 设置Django环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from apps.api.rest.utils import (
    generate_etag,
    generate_etag_from_timestamp,
    generate_cached_etag,
    generate_etag_with_cache,
    check_etag_match,
    should_return_304,
    get_last_modified
)
from apps.news.models import ArticlePage
from apps.core.models import Site


def test_etag_generation():
    """测试ETag生成功能"""
    print("=" * 50)
    print("测试ETag生成功能")
    print("=" * 50)
    
    # 测试数据
    test_data = {"title": "测试文章", "content": "测试内容"}
    test_timestamp = datetime.now()
    
    # 1. 测试基于内容的ETag
    print("1. 测试基于内容的ETag生成:")
    etag1 = generate_etag(test_data, use_timestamp=False)
    etag2 = generate_etag(test_data, use_timestamp=False)
    print(f"   内容ETag 1: {etag1}")
    print(f"   内容ETag 2: {etag2}")
    print(f"   一致性: {etag1 == etag2}")
    
    # 2. 测试基于时间戳的ETag
    print("\n2. 测试基于时间戳的ETag生成:")
    etag3 = generate_etag_from_timestamp(test_timestamp)
    etag4 = generate_etag_from_timestamp(test_timestamp)
    print(f"   时间戳ETag 1: {etag3}")
    print(f"   时间戳ETag 2: {etag4}")
    print(f"   一致性: {etag3 == etag4}")
    
    # 3. 测试智能ETag生成
    print("\n3. 测试智能ETag生成:")
    etag5 = generate_etag(test_data, test_timestamp, use_timestamp=True)
    etag6 = generate_etag(test_data, None, use_timestamp=True)
    print(f"   优先时间戳: {etag5}")
    print(f"   回退内容: {etag6}")
    print(f"   是否相同: {etag5 == etag6}")


def test_etag_caching():
    """测试ETag缓存功能"""
    print("\n" + "=" * 50)
    print("测试ETag缓存功能")
    print("=" * 50)
    
    test_data = {"title": "缓存测试", "content": "缓存内容"}
    test_timestamp = datetime.now()
    cache_key = "test_cache_key"
    
    # 1. 测试缓存ETag生成
    print("1. 测试缓存ETag生成:")
    start_time = time.time()
    etag1 = generate_cached_etag(cache_key, test_data, test_timestamp, 60)
    first_gen_time = time.time() - start_time
    
    start_time = time.time()
    etag2 = generate_cached_etag(cache_key, test_data, test_timestamp, 60)
    second_gen_time = time.time() - start_time
    
    print(f"   第一次生成时间: {first_gen_time:.6f}秒")
    print(f"   第二次生成时间: {second_gen_time:.6f}秒")
    print(f"   性能提升: {first_gen_time/second_gen_time:.2f}x")
    print(f"   ETag一致性: {etag1 == etag2}")


def test_conditional_requests():
    """测试条件请求处理"""
    print("\n" + "=" * 50)
    print("测试条件请求处理")
    print("=" * 50)
    
    # 模拟请求对象
    class MockRequest:
        def __init__(self, if_none_match=None, if_modified_since=None):
            self.META = {}
            if if_none_match:
                self.META['HTTP_IF_NONE_MATCH'] = if_none_match
            if if_modified_since:
                self.META['HTTP_IF_MODIFIED_SINCE'] = if_modified_since
    
    # 1. 测试ETag匹配
    print("1. 测试ETag匹配:")
    test_etag = "abc123"
    
    # 不匹配的情况
    request1 = MockRequest(if_none_match='"xyz789"')
    match1 = check_etag_match(request1, test_etag)
    print(f"   ETag不匹配: {match1}")
    
    # 匹配的情况
    request2 = MockRequest(if_none_match=f'"{test_etag}"')
    match2 = check_etag_match(request2, test_etag)
    print(f"   ETag匹配: {match2}")
    
    # 多个ETag的情况
    request3 = MockRequest(if_none_match=f'"xyz789", "{test_etag}", "def456"')
    match3 = check_etag_match(request3, test_etag)
    print(f"   多ETag匹配: {match3}")
    
    # 2. 测试304判断
    print("\n2. 测试304判断:")
    should_304_1 = should_return_304(request1, test_etag)
    should_304_2 = should_return_304(request2, test_etag)
    print(f"   不匹配时返回304: {should_304_1}")
    print(f"   匹配时返回304: {should_304_2}")


def test_performance():
    """测试性能优化"""
    print("\n" + "=" * 50)
    print("测试性能优化")
    print("=" * 50)
    
    # 测试数据
    large_data = {"items": [{"id": i, "title": f"文章{i}", "content": "内容" * 100} for i in range(100)]}
    test_timestamp = datetime.now()
    
    # 1. 测试时间戳ETag vs 内容ETag性能
    print("1. 测试时间戳ETag vs 内容ETag性能:")
    
    # 时间戳ETag
    start_time = time.time()
    for _ in range(1000):
        generate_etag_from_timestamp(test_timestamp)
    timestamp_time = time.time() - start_time
    
    # 内容ETag
    start_time = time.time()
    for _ in range(1000):
        generate_etag(large_data, use_timestamp=False)
    content_time = time.time() - start_time
    
    print(f"   时间戳ETag (1000次): {timestamp_time:.4f}秒")
    print(f"   内容ETag (1000次): {content_time:.4f}秒")
    print(f"   性能提升: {content_time/timestamp_time:.2f}x")
    
    # 2. 测试缓存ETag性能
    print("\n2. 测试缓存ETag性能:")
    cache_key = "perf_test"
    
    # 第一次生成（无缓存）
    start_time = time.time()
    etag1 = generate_cached_etag(cache_key, large_data, test_timestamp, 60)
    first_time = time.time() - start_time
    
    # 第二次生成（有缓存）
    start_time = time.time()
    etag2 = generate_cached_etag(cache_key, large_data, test_timestamp, 60)
    second_time = time.time() - start_time
    
    print(f"   第一次生成: {first_time:.6f}秒")
    print(f"   第二次生成: {second_time:.6f}秒")
    print(f"   缓存性能提升: {first_time/second_time:.2f}x")


def test_real_data():
    """测试真实数据"""
    print("\n" + "=" * 50)
    print("测试真实数据")
    print("=" * 50)
    
    try:
        # 获取真实文章数据
        site = Site.objects.first()
        if not site:
            print("   没有找到站点数据")
            return
        
        articles = ArticlePage.objects.live().filter(sites_rooted_here=site)[:5]
        if not articles:
            print("   没有找到文章数据")
            return
        
        print(f"   测试站点: {site.hostname}")
        print(f"   文章数量: {len(articles)}")
        
        # 测试最后修改时间获取
        last_modified = get_last_modified(articles)
        print(f"   最后修改时间: {last_modified}")
        
        # 测试ETag生成
        test_data = {"articles": [{"id": a.id, "title": a.title} for a in articles]}
        etag = generate_etag_with_cache("real_test", test_data, last_modified, 60)
        print(f"   生成ETag: {etag}")
        
    except Exception as e:
        print(f"   测试失败: {e}")


if __name__ == "__main__":
    print("🚀 开始ETag优化功能测试")
    
    try:
        test_etag_generation()
        test_etag_caching()
        test_conditional_requests()
        test_performance()
        test_real_data()
        
        print("\n" + "=" * 50)
        print("✅ 所有测试完成")
        print("=" * 50)
        
    except Exception as e:
        print(f"\n❌ 测试过程中出现错误: {e}")
        import traceback
        traceback.print_exc()
