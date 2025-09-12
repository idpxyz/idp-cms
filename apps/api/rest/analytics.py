"""
ClickHouse数据分析API
提供用户行为分析数据
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from clickhouse_driver import Client
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
import logging
from apps.core.utils.circuit_breaker import get_breaker

logger = logging.getLogger(__name__)

@api_view(["GET"])
@csrf_exempt
@permission_classes([AllowAny])
def analytics(request):
    try:
        breaker = get_breaker("clickhouse", failure_threshold=5, recovery_timeout=30, rolling_window=60)
        ch = Client.from_url(settings.CLICKHOUSE_URL)
        
        # 获取基础统计
        total_events = breaker.call(ch.execute, "SELECT count() FROM events")[0][0]
        unique_users = breaker.call(ch.execute, "SELECT uniqExact(user_id) FROM events")[0][0]
        unique_sessions = breaker.call(ch.execute, "SELECT uniqExact(session_id) FROM events")[0][0]
        
        # 事件类型分布
        events_by_type = dict(breaker.call(ch.execute, """
            SELECT event, count() as count 
            FROM events 
            GROUP BY event 
            ORDER BY count DESC
        """))
        
        # 频道分布
        events_by_channel = dict(breaker.call(ch.execute, """
            SELECT channel, count() as count 
            FROM events 
            GROUP BY channel 
            ORDER BY count DESC
        """))
        
        # 最近事件
        recent_events = breaker.call(ch.execute, """
            SELECT ts, event, article_id, channel, user_id, dwell_ms
            FROM events 
            ORDER BY ts DESC 
            LIMIT 20
        """)
        
        # 热门文章（基于曝光和点击）
        top_articles = breaker.call(ch.execute, """
            SELECT 
                article_id,
                countIf(event = 'impression') as impressions,
                countIf(event = 'click') as clicks,
                countIf(event = 'click') / nullIf(countIf(event = 'impression'), 0) as ctr
            FROM events 
            WHERE article_id != ''
            GROUP BY article_id 
            HAVING impressions > 0
            ORDER BY impressions DESC, ctr DESC
            LIMIT 10
        """)
        
        # 格式化数据
        analytics_data = {
            "totalEvents": total_events or 0,
            "uniqueUsers": unique_users or 0,
            "uniqueSessions": unique_sessions or 0,
            "eventsByType": events_by_type or {},
            "eventsByChannel": events_by_channel or {},
            "recentEvents": [
                {
                    "ts": str(event[0]),
                    "event": event[1],
                    "article_id": event[2],
                    "channel": event[3],
                    "user_id": event[4],
                    "dwell_ms": event[5]
                }
                for event in (recent_events or [])
            ],
            "topArticles": [
                {
                    "article_id": article[0],
                    "impressions": article[1],
                    "clicks": article[2],
                    "ctr": float(article[3] or 0)
                }
                for article in (top_articles or [])
            ]
        }
        
        return Response({
            "success": True,
            "data": analytics_data,
            "timestamp": str(breaker.call(ch.execute, "SELECT now()")[0][0])
        })
        
    except Exception as e:
        logger.error(f"Analytics API error: {e}")
        return Response({
            "success": False,
            "error": str(e)
        }, status=500)
