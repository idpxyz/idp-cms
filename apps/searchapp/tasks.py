from celery import shared_task
from wagtail.models import Page
from .client import get_client
from .alias import write_alias
from .indexer import article_to_doc
from clickhouse_driver import Client
from django.conf import settings
from config.celery import app

@app.task(autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def upsert_article_doc(page_id:int):
    page = Page.objects.filter(id=page_id).specific().first()
    if not page or not page.live: return
    idx = write_alias(page.get_site().hostname)
    get_client().index(index=idx, id=str(page.id), body=article_to_doc(page))

@app.task
def delete_article_doc(page_id:int):
    try:
        # Use SITE_HOSTNAME alias to try delete; for multi-tenant you may loop indices.
        get_client().delete(index=write_alias(settings.SITE_HOSTNAME), id=str(page_id))
    except Exception:
        pass

@app.task
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
        # 使用index方法进行upsert操作，如果文档不存在则创建，存在则更新
        os.index(index=idx, id=aid, body={"ctr_1h": float(ctr1h or 0.0), "pop_1h": float(c1h or 0.0)})
