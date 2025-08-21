from clickhouse_driver import Client
from django.conf import settings

_ch = None
def ch():
    global _ch
    if _ch is None:
        _ch = Client.from_url(settings.CLICKHOUSE_URL)
    return _ch

def fetch_agg_features(ids, site:str)->dict:
    if not ids: return {}
    ids_list = ",".join([f"'{i}'" for i in ids[:1000]])
    q = f'''
      SELECT article_id, sum(clicks)/nullIf(sum(impressions),0) AS ctr_1h
      FROM article_metrics_agg
      WHERE site = %(site)s AND window_start >= now() - INTERVAL 1 HOUR
        AND article_id IN ({ids_list})
      GROUP BY article_id
    '''
    rows = ch().execute(q, {"site": site})
    return {aid: {"ctr_1h": float(ctr or 0.0)} for (aid, ctr) in rows}
