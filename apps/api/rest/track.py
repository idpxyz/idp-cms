from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from datetime import datetime, timezone
from clickhouse_driver import Client
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from apps.core.utils.circuit_breaker import get_breaker

@api_view(["POST"])
@csrf_exempt
@permission_classes([AllowAny])
def track(request):
    try:
        breaker = get_breaker("clickhouse", failure_threshold=5, recovery_timeout=30, rolling_window=60)
        ch = Client.from_url(settings.CLICKHOUSE_URL)
        p = request.data
        
        # 支持批量事件和单个事件
        events_to_process = []
        
        if "events" in p and isinstance(p["events"], list):
            # 批量事件处理
            events_to_process = p["events"]
        else:
            # 单个事件处理（保持向后兼容）
            events_to_process = [p]
        
        all_rows = []
        
        for event_data in events_to_process:
            ts_ms = event_data.get("ts")
            ts = (
                datetime.fromtimestamp(int(ts_ms) / 1000, tz=timezone.utc)
                if ts_ms is not None else datetime.now(tz=timezone.utc)
            )

            user_id = str(event_data.get("user_id", "") or "")
            device_id = str(event_data.get("device_id", "") or "")
            session_id = str(event_data.get("session_id", "") or "")
            event_name = str(event_data.get("event", "impression") or "impression")
            channel = str(event_data.get("channel", "recommend") or "recommend")
            site = str(event_data.get("site", settings.SITE_HOSTNAME) or settings.SITE_HOSTNAME)
            dwell_ms = int(event_data.get("dwell_ms", 0) or 0)
            search_query = str(event_data.get("search_query", "") or "")

            for aid in event_data.get("article_ids", []):
                all_rows.append((
                    ts,
                    user_id,
                    device_id,
                    session_id,
                    event_name,
                    str(aid),
                    channel,
                    site,
                    dwell_ms,
                    search_query,
                ))
        
        if all_rows:
            breaker.call(
                ch.execute,
                """
                INSERT INTO events (ts,user_id,device_id,session_id,event,article_id,channel,site,dwell_ms,search_query)
                VALUES
                """,
                all_rows
            )
        
        return Response({
            "ok": True, 
            "processed": len(all_rows),
            "events_count": len(events_to_process)
        })
        
    except Exception as e:
        return Response({
            "ok": False, 
            "error": str(e)
        }, status=500)
