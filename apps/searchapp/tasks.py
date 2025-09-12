from celery import shared_task
from wagtail.models import Page
from .client import get_client
from .alias import write_alias
from .indexer import article_to_doc
from .consistency import run_consistency_check, send_alert
from clickhouse_driver import Client
from django.conf import settings
from config.celery import app
from apps.core.utils.circuit_breaker import get_breaker

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
    breaker = get_breaker("clickhouse", failure_threshold=5, recovery_timeout=30, rolling_window=60)
    ch = Client.from_url(settings.CLICKHOUSE_URL)
    q = """
    SELECT site, article_id,
           sum(clicks)/nullIf(sum(impressions),0) AS ctr_1h,
           sum(clicks) AS clicks_1h
    FROM article_metrics_agg
    WHERE window_start >= now() - INTERVAL 1 HOUR AND site = %(site)s
    GROUP BY site, article_id
    """
    rows = breaker.call(ch.execute, q, {"site": site})
    os = get_client()
    idx = write_alias(site)
    for site, aid, ctr1h, c1h in rows:
        # 使用index方法进行upsert操作，如果文档不存在则创建，存在则更新
        os.index(index=idx, id=aid, body={"ctr_1h": float(ctr1h or 0.0), "pop_1h": float(c1h or 0.0)})


@app.task(autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def check_db_opensearch_consistency(site: str = None):
    """
    检查指定站点（或默认站点）的 DB↔OpenSearch 数据一致性，并在异常时告警。
    """
    site = site or settings.SITE_HOSTNAME
    result = run_consistency_check(site)
    # 始终记录结果，便于可观测
    import logging
    logging.getLogger(__name__).info(
        "ConsistencyCheck site=%s db=%s os=%s diff=%s ratio=%.4f missing=%s orphan=%s severity=%s",
        result.site, result.db_count, result.os_count, result.diff, result.diff_ratio,
        len(result.missing_in_os), len(result.orphan_in_os), result.severity,
    )
    # 告警
    send_alert(result)
    return {
        "site": result.site,
        "db_count": result.db_count,
        "os_count": result.os_count,
        "diff": result.diff,
        "diff_ratio": result.diff_ratio,
        "missing_sample": result.missing_in_os[:20],
        "orphan_sample": result.orphan_in_os[:20],
        "severity": result.severity,
    }
