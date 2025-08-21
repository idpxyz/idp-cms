from celery import shared_task
from clickhouse_driver import Client
from django.conf import settings
from .client import get_client
from .alias import write_alias

@shared_task
def update_ctr_features(site:str=None):
    site = site or settings.SITE_HOSTNAME
    ch = Client.from_url(settings.CLICKHOUSE_URL)
    q = """
    SELECT site, article_id,
           sum(clicks)/nullIf(sum(impressions),0) AS ctr_1h,
           sum(clicks) AS clicks_1h
    FROM article_metrics_agg
    WHERE window_start >= now() - INTERVAL 1 HOUR AND site = %(site)s
    GROUP BY site, article_id
    """
    rows = ch.execute(q, {"site": site})
    os = get_client()
    idx = write_alias(site)
    for site, aid, ctr1h, c1h in rows:
        os.update(index=idx, id=aid, body={"doc": {"ctr_1h": float(ctr1h or 0.0), "pop_1h": float(c1h or 0.0)}}, doc_as_upsert=True)
