"""
社交指标同步任务

定期将Django数据库中的社交互动数据同步到ClickHouse，以增强热度计算
"""

import logging
from celery import shared_task
from apps.core.services.social_metrics_collector import collect_and_sync_all_recent_articles

logger = logging.getLogger(__name__)


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def sync_social_metrics_task(self, site: str = 'localhost', hours_back: int = 2):
    """
    同步社交指标数据任务
    
    Args:
        site: 站点标识符
        hours_back: 回溯小时数，同步最近这段时间的文章社交数据
    """
    try:
        logger.info(f"开始同步社交指标数据: site={site}, hours_back={hours_back}")
        
        success = collect_and_sync_all_recent_articles(hours_back=hours_back, site=site)
        
        if success:
            logger.info("社交指标数据同步完成")
            return {"status": "success", "site": site, "hours_back": hours_back}
        else:
            logger.error("社交指标数据同步失败")
            return {"status": "failed", "site": site, "hours_back": hours_back}
            
    except Exception as e:
        logger.error(f"社交指标同步任务失败: {e}")
        raise


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=2)
def sync_specific_articles_social_data(self, article_ids: list, site: str = 'localhost'):
    """
    同步特定文章的社交数据
    
    Args:
        article_ids: 文章ID列表
        site: 站点标识符
    """
    try:
        from apps.core.services.social_metrics_collector import sync_social_metrics
        
        logger.info(f"开始同步特定文章社交数据: {len(article_ids)}篇文章")
        
        success = sync_social_metrics(article_ids, site)
        
        if success:
            logger.info(f"成功同步 {len(article_ids)} 篇文章的社交数据")
            return {"status": "success", "synced_articles": len(article_ids)}
        else:
            logger.error("特定文章社交数据同步失败")
            return {"status": "failed", "articles": article_ids}
            
    except Exception as e:
        logger.error(f"特定文章社交数据同步任务失败: {e}")
        raise


# 便捷函数
def trigger_social_sync(site: str = 'localhost', hours_back: int = 2):
    """触发社交数据同步"""
    return sync_social_metrics_task.delay(site=site, hours_back=hours_back)


def trigger_article_social_sync(article_ids: list, site: str = 'localhost'):
    """触发特定文章的社交数据同步"""
    return sync_specific_articles_social_data.delay(article_ids=article_ids, site=site)
