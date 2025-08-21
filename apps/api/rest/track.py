from rest_framework.decorators import api_view
from rest_framework.response import Response
from datetime import datetime, timezone
from clickhouse_driver import Client
from django.conf import settings

@api_view(["POST"])
def track(request):
    ch = Client.from_url(settings.CLICKHOUSE_URL)
    p = request.data
    ts = datetime.fromtimestamp(p.get("ts",0)/1000, tz=timezone.utc) if p.get("ts") else datetime.now(tz=timezone.utc)
    rows = []
    for aid in p.get("article_ids", []):
        rows.append((
            ts, p.get("user_id",""), p.get("device_id",""), p.get("session_id",""),
            p.get("event","impression"), aid,
            p.get("channel","recommend"), p.get("site", settings.SITE_HOSTNAME),
            int(p.get("dwell_ms",0))
        ))
    if rows:
        ch.execute("""
            INSERT INTO events (ts,user_id,device_id,session_id,event,article_id,channel,site,dwell_ms)
            VALUES
        """, rows)
    return Response({"ok": True})
