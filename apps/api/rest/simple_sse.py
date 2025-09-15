"""
简化版SSE测试
"""

from django.http import StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
import time
from datetime import datetime

@require_http_methods(["GET"])
@csrf_exempt
def simple_sse(request):
    """
    简化版SSE测试
    """
    def event_stream():
        # 发送连接确认
        yield f"event: connected\n"
        yield f"data: {json.dumps({'status': 'connected', 'timestamp': datetime.now().isoformat()})}\n\n"
        
        # 发送几个测试事件
        for i in range(5):
            yield f"id: {i}\n"
            yield f"event: test\n"
            yield f"data: {json.dumps({'message': f'Test event {i}', 'timestamp': datetime.now().isoformat()})}\n\n"
            time.sleep(1)
        
        # 发送结束事件
        yield f"event: end\n"
        yield f"data: {json.dumps({'message': 'Stream ended', 'timestamp': datetime.now().isoformat()})}\n\n"
    
    # 创建SSE响应
    response = StreamingHttpResponse(
        event_stream(), 
        content_type='text/event-stream'
    )
    
    # SSE必需的响应头
    response['Cache-Control'] = 'no-cache'
    response['Connection'] = 'keep-alive'
    response['Access-Control-Allow-Origin'] = '*'
    response['Access-Control-Allow-Headers'] = 'Cache-Control'
    response['X-Accel-Buffering'] = 'no'
    
    return response
