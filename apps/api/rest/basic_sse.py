"""
最基础的SSE实现 - 用于测试连接
"""

from django.http import StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
import time
from datetime import datetime

@require_http_methods(["GET"])
@csrf_exempt
def basic_sse(request):
    """
    最基础的SSE测试 - 不依赖任何外部服务
    """
    def event_stream():
        try:
            # 发送连接确认
            yield "event: connected\n"
            yield f"data: {json.dumps({'status': 'connected', 'timestamp': datetime.now().isoformat()})}\n\n"
            
            # 模拟一些分析事件
            for i in range(3):
                event_data = {
                    "id": i + 1,
                    "ts": datetime.now().isoformat(),
                    "event": ["view", "click", "dwell"][i % 3],
                    "article_id": f"test-article-{i + 1}",
                    "channel": ["tech", "sports", "news"][i % 3],
                    "user_id": f"user_{i + 1}",
                    "dwell_ms": (i + 1) * 1000,
                    "server_time": datetime.now().isoformat()
                }
                
                yield f"id: {i + 1}\n"
                yield "event: analytics_event\n"
                yield f"data: {json.dumps(event_data)}\n\n"
                
                time.sleep(1)  # 1秒间隔
            
            # 持续发送心跳
            counter = 4
            while True:
                yield "event: heartbeat\n"
                yield f"data: {json.dumps({'timestamp': datetime.now().isoformat(), 'counter': counter})}\n\n"
                counter += 1
                
                # 每隔10次心跳发送一个模拟事件
                if counter % 10 == 0:
                    mock_event = {
                        "id": counter,
                        "ts": datetime.now().isoformat(),
                        "event": "mock_event",
                        "article_id": f"mock-article-{counter}",
                        "channel": "test",
                        "user_id": f"mock_user_{counter}",
                        "dwell_ms": 2000,
                        "server_time": datetime.now().isoformat()
                    }
                    
                    yield f"id: {counter}\n"
                    yield "event: analytics_event\n"
                    yield f"data: {json.dumps(mock_event)}\n\n"
                
                time.sleep(3)  # 3秒心跳
                
        except Exception as e:
            yield "event: error\n"
            yield f"data: {json.dumps({'error': str(e), 'timestamp': datetime.now().isoformat()})}\n\n"
    
    response = StreamingHttpResponse(
        event_stream(), 
        content_type='text/event-stream'
    )
    
    # 设置SSE必需的头部
    response['Cache-Control'] = 'no-cache'
    # response['Connection'] = 'keep-alive'  # WSGI不允许这个头部
    response['Access-Control-Allow-Origin'] = '*'
    response['Access-Control-Allow-Headers'] = 'Cache-Control, Last-Event-ID'
    response['X-Accel-Buffering'] = 'no'
    
    return response
