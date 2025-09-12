"""
实时分析事件流 - Server-Sent Events (SSE) API
提供实时用户行为事件推送
"""

from django.http import StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from clickhouse_driver import Client
from django.conf import settings
import json
import time
import logging
from datetime import datetime, timezone, timedelta
from apps.core.utils.circuit_breaker import get_breaker

logger = logging.getLogger(__name__)

@require_http_methods(["GET"])
@csrf_exempt
def analytics_stream(request):
    """
    SSE流式推送最新分析事件
    """
    def event_stream():
        # 获取客户端最后接收的事件ID
        last_event_id = request.GET.get('Last-Event-ID', '0')
        last_timestamp = request.GET.get('last_ts', None)
        
        logger.info(f"🔗 SSE连接建立，last_event_id: {last_event_id}, last_ts: {last_timestamp}")
        
        # 发送连接确认
        yield f"event: connected\n"
        yield f"data: {json.dumps({'status': 'connected', 'timestamp': datetime.now(timezone.utc).isoformat()})}\n\n"
        
        event_counter = int(last_event_id) if last_event_id.isdigit() else 0
        logger.info(f"🎯 初始化 event_counter: {event_counter}")
        
        try:
            # 直接连接ClickHouse，不使用熔断器
            ch = Client.from_url(settings.CLICKHOUSE_URL)
            
            # 🎯 简化逻辑：直接设置起始时间戳，只监控新事件
            last_timestamp_dt = datetime.now(timezone.utc)
            last_timestamp = last_timestamp_dt.isoformat()
            logger.info(f"📅 设置起始时间戳为当前时间: {last_timestamp}")
            
            # 发送初始化消息
            yield f"event: info\n"
            yield f"data: {json.dumps({'message': '实时监控已启动，等待新事件...', 'timestamp': datetime.now(timezone.utc).isoformat()})}\n\n"

            # 然后进入实时监控循环
            while True:
                try:
                    # 检查是否有新事件
                    new_events_query = """
                        SELECT ts, event, article_id, channel, user_id, dwell_ms
                        FROM events 
                        WHERE ts > %(timestamp)s
                        ORDER BY ts ASC 
                        LIMIT 5
                    """
                    try:
                        logger.info(f"🔍 查询新事件，时间戳: {last_timestamp_dt} (类型: {type(last_timestamp_dt)})")
                        new_events = ch.execute(new_events_query, {'timestamp': last_timestamp_dt})
                        logger.info(f"🔍 查询结果: {len(new_events) if new_events else 0} 条事件")
                        
                        if new_events and len(new_events) > 0:
                            logger.info(f"🆕 发现 {len(new_events)} 条新事件")
                            
                            for event_data in new_events:
                                event_counter += 1
                                
                                event_obj = {
                                    "id": event_counter,
                                    "ts": str(event_data[0]),
                                    "event": event_data[1],
                                    "article_id": event_data[2],
                                    "channel": event_data[3],
                                    "user_id": event_data[4],
                                    "dwell_ms": event_data[5],
                                    "server_time": datetime.now(timezone.utc).isoformat()
                                }
                                
                                # 更新最后时间戳 - 保持datetime对象用于查询
                                # 为了避免重复，在时间戳上加1秒
                                old_timestamp = last_timestamp_dt
                                last_timestamp_dt = event_data[0] + timedelta(seconds=1)
                                last_timestamp = str(event_data[0])  # 字符串格式用于日志
                                logger.info(f"⏰ 更新时间戳: {old_timestamp} -> {last_timestamp_dt}")
                                
                                # SSE格式输出
                                yield f"id: {event_counter}\n"
                                yield f"event: analytics_event\n"
                                yield f"data: {json.dumps(event_obj)}\n\n"
                                
                                logger.info(f"📡 推送新事件 #{event_counter}: {event_data[1]} - {event_data[2]}")
                                
                                time.sleep(0.1)
                        else:
                            logger.info("😴 没有发现新事件")
                    except Exception as query_error:
                        logger.error(f"❌ 查询新事件失败: {query_error}")
                    
                    # 发送心跳保持连接
                    yield f"event: heartbeat\n"
                    yield f"data: {json.dumps({'timestamp': datetime.now(timezone.utc).isoformat(), 'event_count': event_counter, 'last_ts': last_timestamp})}\n\n"
                    
                    # 每3秒检查一次新事件
                    time.sleep(3)
                    
                except Exception as e:
                    logger.error(f"❌ SSE查询错误: {e}")
                    # 发送错误事件
                    yield f"event: error\n"
                    yield f"data: {json.dumps({'error': str(e), 'timestamp': datetime.now(timezone.utc).isoformat()})}\n\n"
                    time.sleep(5)  # 错误后等待更长时间
                    
        except Exception as e:
            logger.error(f"🚨 SSE流严重错误: {e}")
            yield f"event: error\n"
            yield f"data: {json.dumps({'error': 'ClickHouse连接失败', 'details': str(e), 'timestamp': datetime.now(timezone.utc).isoformat()})}\n\n"
    
    # 创建SSE响应
    response = StreamingHttpResponse(
        event_stream(), 
        content_type='text/event-stream'
    )
    
    # SSE必需的响应头
    response['Cache-Control'] = 'no-cache'
    # response['Connection'] = 'keep-alive'  # WSGI不允许这个头部
    response['Access-Control-Allow-Origin'] = '*'  # 开发环境，生产环境应限制域名
    response['Access-Control-Allow-Headers'] = 'Cache-Control'
    response['X-Accel-Buffering'] = 'no'  # Nginx不缓冲
    
    logger.info("🌊 SSE流响应已创建")
    return response


@require_http_methods(["GET"])
@csrf_exempt
def analytics_stream_stats(request):
    """
    获取SSE流统计信息
    """
    try:
        breaker = get_breaker("clickhouse", failure_threshold=5, recovery_timeout=30, rolling_window=60)
        ch = Client.from_url(settings.CLICKHOUSE_URL)
        
        # 获取最近1分钟的事件数
        recent_count = breaker.call(ch.execute, """
            SELECT count() 
            FROM events 
            WHERE ts >= now() - INTERVAL 1 MINUTE
        """)[0][0]
        
        # 获取最新事件时间
        latest_event = breaker.call(ch.execute, """
            SELECT ts 
            FROM events 
            ORDER BY ts DESC 
            LIMIT 1
        """)
        
        latest_ts = str(latest_event[0][0]) if latest_event else None
        
        from django.http import JsonResponse
        return JsonResponse({
            "success": True,
            "data": {
                "recent_events_1min": recent_count,
                "latest_event_ts": latest_ts,
                "server_time": datetime.now(timezone.utc).isoformat(),
                "stream_available": True
            }
        })
        
    except Exception as e:
        logger.error(f"SSE统计错误: {e}")
        from django.http import JsonResponse
        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)
