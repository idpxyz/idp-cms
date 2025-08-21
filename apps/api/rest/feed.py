import base64, json, time
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.conf import settings
from apps.searchapp.client import get_client, index_name_for
from apps.searchapp.queries import build_query
from apps.core.flags import flag, ab_bucket
from .features import fetch_agg_features
from .rank import score_and_diversify

def encode_cursor(payload: dict) -> str:
    return base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()

def decode_cursor(token: str|None) -> dict:
    if not token: return {}
    return json.loads(base64.urlsafe_b64decode(token.encode()).decode())

@api_view(["GET"])
def feed(request):
    site = request.query_params.get("site", settings.SITE_HOSTNAME)
    size = int(request.query_params.get("size", 20))
    cursor = decode_cursor(request.query_params.get("cursor"))
    seen_ids = cursor.get("seen", [])

    template = request.query_params.get("template", "recommend_default")
    channels = request.query_params.getlist("channel") or ["recommend","hot","tech"]
    hours = flag("recall.window_hours", 72)

    # AB：10%使用更窄 24h 窗
    session = request.headers.get("X-AB-Session", "anon")
    if ab_bucket("feed.24h-window", key=session, percent=10):
        hours = min(hours, 24)

    client = get_client()
    idx = index_name_for(site)
    body = build_query(template, site=site, channels=channels, hours=hours, seen_ids=seen_ids)

    resp = client.search(index=idx, body=body)
    candidates = [
      {"id": h["_id"], "score": h.get("_score", 0.0), **h["_source"]}
      for h in resp.get("hits",{}).get("hits",[])
      if h["_id"] not in seen_ids
    ]

    agg = fetch_agg_features([c["id"] for c in candidates], site=site)
    ranked = score_and_diversify(candidates, agg)[:size]

    next_cursor = encode_cursor({
      "seen": (seen_ids + [r["id"] for r in ranked])[-200:],
      "ts": int(time.time()*1000)
    })
    return Response({"items": ranked, "next_cursor": next_cursor, "debug": {"hours": hours, "template": template}})
