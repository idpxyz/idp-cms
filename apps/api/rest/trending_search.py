"""
热搜榜API
基于ClickHouse搜索事件统计生成热搜榜单
"""

import logging
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.core.cache import cache
from django.conf import settings
from clickhouse_driver import Client
from datetime import datetime, timedelta
import json

logger = logging.getLogger(__name__)

def get_clickhouse_client():
    """获取ClickHouse客户端"""
    try:
        # 使用和track API相同的连接方式
        return Client.from_url(settings.CLICKHOUSE_URL)
    except Exception as e:
        logger.warning(f"ClickHouse client error: {e}")
        return None

@api_view(["GET"])
def trending_search(request):
    """
    热搜榜接口
    
    参数：
    - site: 站点标识（可选）
    - channel: 频道过滤（可选）
    - window: 时间窗口 - 5m/1h/24h（默认1h）
    - limit: 返回数量（默认10）
    
    返回：
    - data: 热搜列表，每项包含 text, rank, change, score, count
    """
    try:
        site = request.query_params.get("site", "")
        channel = request.query_params.get("channel", "")
        window = request.query_params.get("window", "1h")
        limit = min(int(request.query_params.get("limit", 10)), 50)
        
        # 缓存键
        cache_key = f"trending_search:{site}:{channel}:{window}:{limit}"
        cached_result = cache.get(cache_key)
        if cached_result:
            return Response(cached_result)
        
        # 获取热搜数据
        trending_data = get_trending_from_clickhouse(site, channel, window, limit)
        
        if not trending_data:
            # 降级：提供默认热搜
            trending_data = get_default_trending(limit)
        
        result = {
            "success": True,
            "data": trending_data,
            "window": window,
            "site": site,
            "channel": channel
        }
        
        # 缓存结果（5分钟）
        cache.set(cache_key, result, 300)
        
        return Response(result)
        
    except Exception as e:
        logger.error(f"Trending search error: {str(e)}")
        return Response({
            "success": False,
            "data": get_default_trending(limit),
            "error": "热搜服务暂时不可用"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def get_trending_from_clickhouse(site, channel, window, limit):
    """从ClickHouse获取热搜数据"""
    client = get_clickhouse_client()
    if not client:
        return None
        
    try:
        # 时间窗口映射
        window_map = {
            "5m": 5,
            "1h": 60, 
            "24h": 1440
        }
        minutes = window_map.get(window, 60)
        
        # 构建查询
        where_conditions = [
            "event = 'search'",
            f"ts >= now() - INTERVAL {minutes} MINUTE",
            "search_query != ''"
        ]
        
        if site:
            where_conditions.append(f"site = '{site}'")
        if channel:
            where_conditions.append(f"channel = '{channel}'")
            
        where_clause = " AND ".join(where_conditions)
        
        query = f"""
        SELECT 
            search_query,
            COUNT(*) as search_count,
            COUNT(DISTINCT device_id) as unique_users
        FROM events 
        WHERE {where_clause}
        GROUP BY search_query
        HAVING search_count >= 2
        ORDER BY search_count DESC, unique_users DESC
        LIMIT {limit}
        """
        
        results = client.execute(query)
        
        trending_data = []
        for i, (query_text, count, unique_users) in enumerate(results):
            # 简单的变化趋势（实际应该对比上一个时间窗口）
            change = "up" if i < 3 else "stable"
            if i == 0:
                change = "hot"
                
            trending_data.append({
                "text": query_text,
                "rank": i + 1,
                "change": change,
                "score": count * 10 + unique_users,
                "count": count,
                "unique_users": unique_users
            })
            
        return trending_data
        
    except Exception as e:
        logger.warning(f"ClickHouse trending query error: {str(e)}")
        return None


def get_default_trending(limit):
    """获取默认热搜列表 - 基于常见搜索主题，去除无意义后缀"""
    default_trending = [
        {"text": "人工智能", "rank": 1, "change": "hot", "score": 1000, "count": 100},
        {"text": "新能源汽车", "rank": 2, "change": "up", "score": 800, "count": 80},
        {"text": "房价走势", "rank": 3, "change": "up", "score": 600, "count": 60},
        {"text": "疫情防控", "rank": 4, "change": "stable", "score": 500, "count": 50},
        {"text": "股市行情", "rank": 5, "change": "down", "score": 400, "count": 40},
        {"text": "在线教育", "rank": 6, "change": "stable", "score": 350, "count": 35},
        {"text": "5G技术", "rank": 7, "change": "up", "score": 300, "count": 30},
        {"text": "就业政策", "rank": 8, "change": "stable", "score": 250, "count": 25},
        {"text": "环保减排", "rank": 9, "change": "new", "score": 200, "count": 20},
        {"text": "医疗改革", "rank": 10, "change": "stable", "score": 150, "count": 15},
    ]
    
    return default_trending[:limit]
