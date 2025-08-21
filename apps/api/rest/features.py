from clickhouse_driver import Client
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

_ch = None
def ch():
    global _ch
    try:
        # 如果连接不存在，创建新连接
        if _ch is None:
            _ch = Client.from_url(settings.CLICKHOUSE_URL)
        
        # 测试连接是否有效
        _ch.execute("SELECT 1")
        return _ch
    except Exception as e:
        logger.warning(f"ClickHouse connection issue, recreating client: {e}")
        # 连接有问题，重新创建
        try:
            _ch = Client.from_url(settings.CLICKHOUSE_URL)
            return _ch
        except Exception as reconnect_error:
            logger.error(f"Failed to reconnect to ClickHouse: {reconnect_error}")
            raise

def fetch_agg_features(ids, site:str)->dict:
    if not ids: return {}
    
    try:
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
    except Exception as e:
        logger.error(f"Failed to fetch agg features: {e}")
        # 如果ClickHouse查询失败，返回空结果而不是崩溃
        return {}
