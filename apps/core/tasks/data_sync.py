"""
核心数据同步和行为分析相关的Celery任务
"""

from celery import shared_task
from django.conf import settings
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def batch_sync_article_weights(self, article_ids=None, limit=1000):
    """
    批量更新文章权重（适合定时任务）
    
    Args:
        article_ids: 指定文章ID列表，None表示更新所有
        limit: 批量处理限制
    
    Returns:
        dict: 处理结果统计
    """
    try:
        from apps.core.services.data_sync_service import data_sync_service
        from apps.news.models.article import ArticlePage
        
        # 构建查询
        if article_ids:
            articles = ArticlePage.objects.filter(id__in=article_ids[:limit])
        else:
            # 优先更新最近修改的文章
            articles = ArticlePage.objects.filter(
                live=True
            ).order_by('-updated_at')[:limit]
        
        updated_count = 0
        failed_count = 0
        
        for article in articles:
            try:
                # 🎯 在权重同步前，刷新文章实例以获取最新状态
                article.refresh_from_db()
                
                if data_sync_service.sync_article_weight(article):
                    updated_count += 1
                else:
                    failed_count += 1
            except Exception as e:
                logger.error(f"更新文章 {article.id} 权重失败: {e}")
                failed_count += 1
        
        result = {
            'success': True,
            'updated_count': updated_count,
            'failed_count': failed_count,
            'total_processed': articles.count(),
            'timestamp': timezone.now().isoformat()
        }
        
        logger.info(f"批量权重更新完成: {result}")
        return result
        
    except Exception as e:
        logger.error(f"批量权重更新任务失败: {e}")
        # Celery自动重试
        raise


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=2)
def sync_articles_to_opensearch_batch(self, article_ids=None, limit=100):
    """
    批量同步文章到OpenSearch（补充现有的单篇同步）
    
    Args:
        article_ids: 指定文章ID列表
        limit: 批量处理限制
    
    Returns:
        dict: 同步结果统计
    """
    try:
        from apps.core.services.data_sync_service import data_sync_service
        
        result = data_sync_service.batch_sync_articles(article_ids, limit)
        
        logger.info(f"批量OpenSearch同步完成: {result}")
        return result
        
    except Exception as e:
        logger.error(f"批量OpenSearch同步失败: {e}")
        raise


@shared_task
def update_trending_articles_cache():
    """
    更新热门文章缓存
    
    定期计算和缓存不同时间段的热门文章，提升API响应速度
    """
    try:
        from django.core.cache import cache
        from apps.core.services.behavior_analytics import behavior_analytics
        
        # 更新不同时间段的热门文章
        time_ranges = [1, 6, 24, 168]  # 1h, 6h, 24h, 1week
        updated_ranges = []
        
        for hours in time_ranges:
            try:
                trending = behavior_analytics.get_trending_articles(hours=hours, limit=20)
                cache_key = f'trending_articles_{hours}h'
                cache.set(cache_key, trending, timeout=3600)  # 缓存1小时
                updated_ranges.append(hours)
                logger.debug(f"更新 {hours}h 热门文章缓存，{len(trending)} 篇文章")
            except Exception as e:
                logger.warning(f"更新 {hours}h 热门文章缓存失败: {e}")
        
        result = {
            'success': True,
            'updated_ranges': updated_ranges,
            'timestamp': timezone.now().isoformat()
        }
        
        logger.info(f"热门文章缓存更新完成: {result}")
        return result
        
    except Exception as e:
        logger.error(f"更新热门文章缓存失败: {e}")
        return {'success': False, 'error': str(e)}


@shared_task
def comprehensive_data_consistency_check():
    """
    综合数据一致性检查
    
    检查PostgreSQL、OpenSearch、ClickHouse之间的数据一致性
    """
    try:
        from apps.core.services.data_sync_service import data_sync_service
        
        # 检查主要站点的数据一致性
        sites_to_check = [settings.SITE_HOSTNAME, 'localhost']
        results = {}
        
        for site in sites_to_check:
            try:
                result = data_sync_service.check_data_consistency(site)
                results[site] = result
                
                # 如果发现严重不一致，触发自动修复
                consistency = result.get('consistency', {})
                if not consistency.get('is_consistent', True):
                    logger.warning(f"站点 {site} 数据不一致，延迟触发自动修复")
                    # 🎯 延迟触发修复任务，避免数据竞争（延迟5分钟）
                    sync_articles_to_opensearch_batch.apply_async(
                        kwargs={'limit': 50}, 
                        countdown=300  # 5分钟后执行
                    )
                    
            except Exception as e:
                logger.error(f"检查站点 {site} 一致性失败: {e}")
                results[site] = {'error': str(e)}
        
        overall_result = {
            'success': True,
            'sites_checked': sites_to_check,
            'results': results,
            'timestamp': timezone.now().isoformat()
        }
        
        logger.info(f"综合数据一致性检查完成: {len(sites_to_check)} 个站点")
        return overall_result
        
    except Exception as e:
        logger.error(f"综合数据一致性检查失败: {e}")
        return {'success': False, 'error': str(e)}


@shared_task
def cleanup_old_behavior_data(days_to_keep=90):
    """
    清理过期的行为数据
    
    Args:
        days_to_keep: 保留的天数，默认90天
    """
    try:
        from apps.core.services.behavior_analytics import behavior_analytics
        
        client = behavior_analytics.get_clickhouse_client()
        if not client:
            return {'success': False, 'error': 'ClickHouse连接失败'}
        
        # 删除指定天数前的数据
        query = f"""
            ALTER TABLE events DELETE WHERE ts < subtractDays(now(), {days_to_keep})
        """
        
        result = client.execute(query)
        
        logger.info(f"清理 {days_to_keep} 天前的行为数据完成")
        return {
            'success': True,
            'days_kept': days_to_keep,
            'timestamp': timezone.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"清理过期行为数据失败: {e}")
        return {'success': False, 'error': str(e)}


@shared_task
def generate_user_behavior_insights():
    """
    生成用户行为洞察报告
    
    定期分析用户行为模式，生成洞察报告
    """
    try:
        from apps.core.services.behavior_analytics import behavior_analytics
        from django.core.cache import cache
        
        insights = {}
        
        # 1. 热门文章分析
        trending_24h = behavior_analytics.get_trending_articles(hours=24, limit=10)
        insights['trending_articles'] = trending_24h
        
        # 2. 缓存洞察报告
        cache.set('behavior_insights', insights, timeout=3600 * 6)  # 缓存6小时
        
        logger.info(f"用户行为洞察报告生成完成，热门文章: {len(trending_24h)} 篇")
        return {
            'success': True,
            'insights_generated': list(insights.keys()),
            'timestamp': timezone.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"生成用户行为洞察失败: {e}")
        return {'success': False, 'error': str(e)}
