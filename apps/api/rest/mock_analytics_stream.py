"""
模拟分析事件流 - 不依赖ClickHouse的实时事件流
"""

from django.http import StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
import time
import random
from datetime import datetime, timezone

@require_http_methods(["GET"])
@csrf_exempt
def mock_analytics_stream(request):
    """
    模拟分析事件流 - 生成实时的模拟用户行为事件
    """
    def event_stream():
        try:
            # 发送连接确认
            yield "event: connected\n"
            yield f"data: {json.dumps({'status': 'connected', 'timestamp': datetime.now(timezone.utc).isoformat()})}\n\n"
            
            # 模拟一些历史事件
            event_counter = 0
            for i in range(5):
                event_counter += 1
                
                event_obj = {
                    "id": event_counter,
                    "ts": datetime.now(timezone.utc).isoformat(),
                    "event": random.choice(["view", "click", "dwell", "impression"]),
                    "article_id": f"article-{random.randint(1, 100)}",
                    "channel": random.choice(["tech", "sports", "news", "entertainment", "politics"]),
                    "user_id": f"user_{random.randint(1, 50)}",
                    "dwell_ms": random.randint(1000, 30000),
                    "server_time": datetime.now(timezone.utc).isoformat()
                }
                
                yield f"id: {event_counter}\n"
                yield "event: analytics_event\n"
                yield f"data: {json.dumps(event_obj)}\n\n"
                
                time.sleep(0.5)  # 0.5秒间隔
            
            # 持续生成实时事件
            while True:
                # 随机决定是否生成新事件（30%概率）
                if random.random() < 0.3:
                    event_counter += 1
                    
                    event_obj = {
                        "id": event_counter,
                        "ts": datetime.now(timezone.utc).isoformat(),
                        "event": random.choice(["view", "click", "dwell", "impression"]),
                        "article_id": f"article-{random.randint(1, 100)}",
                        "channel": random.choice(["tech", "sports", "news", "entertainment", "politics", "gaming"]),
                        "user_id": f"user_{random.randint(1, 50)}",
                        "dwell_ms": random.randint(1000, 30000),
                        "server_time": datetime.now(timezone.utc).isoformat()
                    }
                    
                    yield f"id: {event_counter}\n"
                    yield "event: analytics_event\n"
                    yield f"data: {json.dumps(event_obj)}\n\n"
                
                # 发送心跳
                yield "event: heartbeat\n"
                yield f"data: {json.dumps({'timestamp': datetime.now(timezone.utc).isoformat(), 'event_count': event_counter})}\n\n"
                
                time.sleep(2)  # 2秒间隔
                
        except Exception as e:
            yield "event: error\n"
            yield f"data: {json.dumps({'error': str(e), 'timestamp': datetime.now(timezone.utc).isoformat()})}\n\n"
    
    response = StreamingHttpResponse(
        event_stream(), 
        content_type='text/event-stream'
    )
    
    # SSE必需的响应头
    response['Cache-Control'] = 'no-cache'
    response['Access-Control-Allow-Origin'] = '*'
    response['Access-Control-Allow-Headers'] = 'Cache-Control, Last-Event-ID'
    response['X-Accel-Buffering'] = 'no'
    
    return response
