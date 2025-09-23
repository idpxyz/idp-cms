"""
热度标记任务 - 定期重新计算文章热度并更新ES索引

这个任务会：
1. 获取最近发布的文章
2. 计算其热度评分
3. 动态分类为 hot/trending/normal
4. 更新ElasticSearch索引中的虚拟频道标签
"""

import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from django.conf import settings
from django.utils import timezone
from celery import shared_task
from apps.news.models.article import ArticlePage
from apps.core.services.hotness_calculator import HotnessCalculator
from apps.searchapp.client import get_client
from apps.searchapp.alias import write_alias
from apps.core.utils.circuit_breaker import get_breaker

logger = logging.getLogger(__name__)


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def update_article_hotness_tags(self, site: str = None, hours_back: int = 72, batch_size: int = 100):
    """
    更新文章热度标记
    
    Args:
        site: 站点标识符
        hours_back: 回溯小时数，只处理这个时间内的文章
        batch_size: 批处理大小
    """
    site = site or getattr(settings, 'SITE_HOSTNAME', 'localhost')
    
    try:
        logger.info(f"开始更新文章热度标记: site={site}, hours_back={hours_back}")
        
        # 获取需要更新的文章
        since = timezone.now() - timedelta(hours=hours_back)
        
        # 查询最近发布的文章
        articles_qs = ArticlePage.objects.live().filter(
            first_published_at__gte=since
        ).order_by('-first_published_at')
        
        # 按站点过滤（如果配置了多站点）
        try:
            from wagtail.models import Site
            site_obj = Site.objects.get(hostname=site)
            articles_qs = articles_qs.descendant_of(site_obj.root_page)
        except:
            # 单站点模式或站点不存在时不过滤
            pass
        
        total_articles = articles_qs.count()
        logger.info(f"找到 {total_articles} 篇文章需要更新热度标记")
        
        if total_articles == 0:
            logger.info("没有需要更新的文章")
            return {"processed": 0, "updated": 0, "errors": 0}
        
        # 初始化统计
        processed = 0
        updated = 0
        errors = 0
        
        # 分批处理
        calculator = HotnessCalculator()
        es_client = get_client()
        write_index = write_alias(site)
        
        for batch_start in range(0, total_articles, batch_size):
            batch_articles = list(articles_qs[batch_start:batch_start + batch_size])
            
            try:
                # 批量计算热度
                article_data = []
                for article in batch_articles:
                    article_data.append({
                        'id': article.id,
                        'publish_time': article.first_published_at,
                        'quality_score': getattr(article, 'quality_score', 1.0),
                    })
                
                # 计算热度分类
                classified = calculator.batch_classify_articles(article_data, site)
                
                # 批量更新ES索引
                bulk_body = []
                for item in classified:
                    article_id = str(item['id'])
                    category = item['hotness_category']
                    
                    # 准备更新文档
                    update_doc = {
                        'hotness_score': item['hotness_score'],
                        'hotness_category': category,
                        'ctr_1h': item['ctr_1h'],
                        'pop_1h': item['pop_1h'],
                    }
                    
                    # 🎯 关键：根据分类动态设置channel字段
                    if category == 'hot':
                        update_doc['channel'] = 'hot'
                        update_doc['original_channel'] = item.get('primary_channel_slug', 'recommend')
                    elif category == 'trending':
                        update_doc['channel'] = 'trending'
                        update_doc['original_channel'] = item.get('primary_channel_slug', 'recommend')
                    else:
                        # normal分类：恢复原始频道
                        original_channel = _get_article_original_channel(batch_articles, article_id)
                        update_doc['channel'] = original_channel
                        if 'original_channel' in update_doc:
                            del update_doc['original_channel']
                    
                    # 添加到批量操作
                    bulk_body.extend([
                        {"update": {"_index": write_index, "_id": article_id}},
                        {"doc": update_doc, "doc_as_upsert": True}
                    ])
                
                # 执行批量更新
                if bulk_body:
                    response = es_client.bulk(body=bulk_body, refresh=True)
                    
                    # 检查更新结果
                    batch_updated = 0
                    batch_errors = 0
                    
                    for item in response.get('items', []):
                        if 'update' in item:
                            if item['update'].get('status') in [200, 201]:
                                batch_updated += 1
                            else:
                                batch_errors += 1
                                logger.warning(f"ES更新失败: {item}")
                    
                    updated += batch_updated
                    errors += batch_errors
                    
                    logger.info(f"批次处理完成: {len(classified)}篇文章, 更新成功{batch_updated}, 失败{batch_errors}")
                
                processed += len(classified)
                
            except Exception as e:
                logger.error(f"批次处理失败 {batch_start}-{batch_start + len(batch_articles)}: {e}")
                errors += len(batch_articles)
        
        result = {
            "processed": processed,
            "updated": updated,
            "errors": errors,
            "total_articles": total_articles
        }
        
        logger.info(f"热度标记更新完成: {result}")
        return result
        
    except Exception as e:
        logger.error(f"热度标记任务失败: {e}")
        raise


def _get_article_original_channel(articles: List[ArticlePage], article_id: str) -> str:
    """获取文章的原始频道slug"""
    try:
        article = next((a for a in articles if str(a.id) == article_id), None)
        if article and hasattr(article, 'channel') and article.channel:
            return article.channel.slug
    except:
        pass
    return 'recommend'


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=2)
def refresh_hot_trending_articles(self, site: str = None):
    """
    快速刷新hot/trending文章标记
    只处理最近1小时的文章，用于实时响应热点
    """
    return update_article_hotness_tags.apply_async(
        kwargs={'site': site, 'hours_back': 1, 'batch_size': 50}
    ).get()


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=2)
def daily_hotness_cleanup(self, site: str = None):
    """
    每日热度清理任务
    清理过期的热度标记，恢复文章的原始频道分类
    """
    site = site or getattr(settings, 'SITE_HOSTNAME', 'localhost')
    
    try:
        logger.info(f"开始每日热度清理: site={site}")
        
        # 获取7天前的时间点
        cutoff_time = timezone.now() - timedelta(days=7)
        
        # 查询过期的hot/trending文章
        old_articles = ArticlePage.objects.live().filter(
            first_published_at__lt=cutoff_time
        )
        
        # 按站点过滤
        try:
            from wagtail.models import Site
            site_obj = Site.objects.get(hostname=site)
            old_articles = old_articles.descendant_of(site_obj.root_page)
        except:
            pass
        
        total_old = old_articles.count()
        logger.info(f"找到 {total_old} 篇过期文章需要清理热度标记")
        
        if total_old == 0:
            return {"cleaned": 0}
        
        # 批量恢复原始频道
        es_client = get_client()
        write_index = write_alias(site)
        cleaned = 0
        
        for batch_start in range(0, total_old, 100):
            batch_articles = list(old_articles[batch_start:batch_start + 100])
            bulk_body = []
            
            for article in batch_articles:
                original_channel = 'recommend'
                if hasattr(article, 'channel') and article.channel:
                    original_channel = article.channel.slug
                
                bulk_body.extend([
                    {"update": {"_index": write_index, "_id": str(article.id)}},
                    {
                        "doc": {
                            "channel": original_channel,
                            "hotness_category": "normal",
                            "hotness_score": 0.0
                        },
                        "doc_as_upsert": True
                    }
                ])
            
            if bulk_body:
                try:
                    es_client.bulk(body=bulk_body, refresh=True)
                    cleaned += len(batch_articles)
                    logger.info(f"清理批次完成: {len(batch_articles)}篇文章")
                except Exception as e:
                    logger.error(f"清理批次失败: {e}")
        
        result = {"cleaned": cleaned, "total_old": total_old}
        logger.info(f"每日热度清理完成: {result}")
        return result
        
    except Exception as e:
        logger.error(f"每日热度清理失败: {e}")
        raise


# 便捷函数
def trigger_hotness_update(site: str = None, immediate: bool = False):
    """
    触发热度更新
    
    Args:
        site: 站点标识
        immediate: 是否立即执行（同步），否则异步执行
    """
    if immediate:
        return update_article_hotness_tags(site=site)
    else:
        return update_article_hotness_tags.delay(site=site)


def trigger_fast_refresh(site: str = None):
    """触发快速刷新（1小时内文章）"""
    return refresh_hot_trending_articles.delay(site=site)
