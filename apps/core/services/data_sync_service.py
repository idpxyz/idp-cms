"""
数据同步服务 - 统一管理PostgreSQL、OpenSearch、ClickHouse之间的数据同步

负责：
1. PostgreSQL → OpenSearch 内容同步
2. 用户行为 → ClickHouse 埋点
3. 统计数据 → PostgreSQL 权重更新
4. 数据一致性检查和修复
"""

import logging
from typing import Dict, List, Optional, Any
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from apps.news.models.article import ArticlePage
from apps.searchapp.indexer import ArticleIndexer
from apps.searchapp.client import get_client as get_opensearch_client
from clickhouse_driver import Client as ClickHouseClient

logger = logging.getLogger(__name__)


class DataSyncService:
    """数据同步服务"""
    
    def __init__(self):
        self.opensearch_client = None
        self.clickhouse_client = None
        self.indexer = ArticleIndexer()
    
    def get_opensearch_client(self):
        """获取OpenSearch客户端"""
        if not self.opensearch_client:
            try:
                self.opensearch_client = get_opensearch_client()
            except Exception as e:
                logger.error(f"OpenSearch连接失败: {e}")
                return None
        return self.opensearch_client
    
    def get_clickhouse_client(self):
        """获取ClickHouse客户端"""
        if not self.clickhouse_client:
            try:
                self.clickhouse_client = ClickHouseClient.from_url(settings.CLICKHOUSE_URL)
            except Exception as e:
                logger.error(f"ClickHouse连接失败: {e}")
                return None
        return self.clickhouse_client
    
    def sync_article_to_opensearch(self, article: ArticlePage, force_update: bool = False) -> bool:
        """
        同步文章到OpenSearch
        
        Args:
            article: ArticlePage实例
            force_update: 是否强制更新
        
        Returns:
            bool: 同步是否成功
        """
        try:
            client = self.get_opensearch_client()
            if not client:
                return False
            
            # 生成OpenSearch文档
            doc = self.indexer.to_doc(article)
            
            # 优化：添加body内容（提取HTML纯文本）
            if hasattr(article, 'body') and article.body:
                import re
                # 简单提取HTML纯文本
                body_text = re.sub(r'<[^>]+>', '', str(article.body))
                doc['body'] = body_text[:1000]  # 限制长度
            
            # 添加统计数据
            doc.update({
                'view_count': article.view_count or 0,
                'comment_count': article.comment_count or 0,
                'like_count': article.like_count or 0,
                'favorite_count': article.favorite_count or 0,
                'weight': article.weight or 0,
                'is_featured': article.is_featured,
                'is_hero': article.is_hero,  # 🎯 添加缺失的is_hero字段
                'updated_at': timezone.now().isoformat()
            })
            
            # 确定索引名
            from apps.searchapp.utils import get_site_from_article
            from apps.searchapp.simple_index import get_index_name  # 🎯 使用标准函数
            site_identifier = get_site_from_article(article)
            index_name = get_index_name(site_identifier)
            
            # 索引文档
            response = client.index(
                index=index_name,
                id=str(article.id),
                body=doc,
                refresh=True if force_update else 'wait_for'
            )
            
            logger.info(f"文章 {article.id} 同步到OpenSearch成功: {response.get('result')}")
            return True
            
        except Exception as e:
            logger.error(f"文章 {article.id} 同步到OpenSearch失败: {e}", exc_info=True)
            return False
    
    def track_user_behavior(self, event_data: Dict[str, Any]) -> bool:
        """
        记录用户行为到ClickHouse
        
        Args:
            event_data: 事件数据字典
        
        Returns:
            bool: 记录是否成功
        """
        try:
            client = self.get_clickhouse_client()
            if not client:
                return False
            
            # 标准化事件数据
            normalized_data = {
                'ts': event_data.get('ts', timezone.now()),
                'user_id': event_data.get('user_id', ''),
                'device_id': event_data.get('device_id', ''),
                'session_id': event_data.get('session_id', ''),
                'event': event_data.get('event', ''),
                'article_id': str(event_data.get('article_id', '')),
                'channel': event_data.get('channel', ''),
                'site': event_data.get('site', ''),
                'dwell_ms': int(event_data.get('dwell_ms', 0)),
                'search_query': event_data.get('search_query', ''),
                'user_agent': event_data.get('user_agent', ''),
                'ip_address': event_data.get('ip_address', ''),
                'referrer': event_data.get('referrer', ''),
            }
            
            # 插入ClickHouse
            client.execute(
                """
                INSERT INTO events (
                    ts, user_id, device_id, session_id, event,
                    article_id, channel, site, dwell_ms, search_query,
                    user_agent, ip_address, referrer
                ) VALUES
                """,
                [normalized_data]
            )
            
            logger.debug(f"用户行为事件记录成功: {event_data.get('event')} - {event_data.get('article_id')}")
            return True
            
        except Exception as e:
            logger.error(f"记录用户行为失败: {e}", exc_info=True)
            return False
    
    def sync_article_weight(self, article: ArticlePage) -> bool:
        """
        同步文章权重（基于统计数据重新计算）
        
        Args:
            article: ArticlePage实例
        
        Returns:
            bool: 同步是否成功
        """
        try:
            with transaction.atomic():
                old_weight = article.weight
                
                # 重新计算动态权重
                article.update_dynamic_weight()
                new_weight = article.weight
                
                # 保存权重更新
                article.save(update_fields=['weight'])
                
                # 同步到OpenSearch
                self.sync_article_to_opensearch(article, force_update=True)
                
                if old_weight != new_weight:
                    logger.info(f"文章 {article.id} 权重更新: {old_weight} → {new_weight}")
                
                return True
                
        except Exception as e:
            logger.error(f"文章 {article.id} 权重同步失败: {e}", exc_info=True)
            return False
    
    def batch_sync_articles(self, article_ids: List[int] = None, limit: int = 100) -> Dict[str, int]:
        """
        批量同步文章
        
        Args:
            article_ids: 指定文章ID列表，None表示同步所有
            limit: 批量处理数量限制
        
        Returns:
            Dict: 同步统计结果
        """
        stats = {
            'total': 0,
            'opensearch_success': 0,
            'opensearch_failed': 0,
            'weight_updated': 0,
            'weight_failed': 0
        }
        
        try:
            # 构建查询
            if article_ids:
                articles = ArticlePage.objects.filter(id__in=article_ids[:limit])
            else:
                articles = ArticlePage.objects.all()[:limit]
            
            stats['total'] = articles.count()
            
            for article in articles:
                # 🎯 确保获取最新的文章状态，特别是is_hero字段
                article.refresh_from_db()
                
                # 同步到OpenSearch
                if self.sync_article_to_opensearch(article):
                    stats['opensearch_success'] += 1
                else:
                    stats['opensearch_failed'] += 1
                
                # 同步权重
                if self.sync_article_weight(article):
                    stats['weight_updated'] += 1
                else:
                    stats['weight_failed'] += 1
            
            logger.info(f"批量同步完成: {stats}")
            return stats
            
        except Exception as e:
            logger.error(f"批量同步失败: {e}", exc_info=True)
            return stats
    
    def check_data_consistency(self, site: str = None) -> Dict[str, Any]:
        """
        检查数据一致性
        
        Args:
            site: 站点标识符
        
        Returns:
            Dict: 一致性检查结果
        """
        result = {
            'timestamp': timezone.now().isoformat(),
            'site': site,
            'postgresql': {},
            'opensearch': {},
            'clickhouse': {},
            'consistency': {},
            'recommendations': []
        }
        
        try:
            # PostgreSQL统计
            if site:
                from wagtail.models import Site
                try:
                    site_obj = Site.objects.get(hostname=site)
                    pg_articles = ArticlePage.objects.live().descendant_of(site_obj.root_page)
                except Site.DoesNotExist:
                    pg_articles = ArticlePage.objects.all()
            else:
                pg_articles = ArticlePage.objects.all()
            
            result['postgresql'] = {
                'total_articles': pg_articles.count(),
                'featured_articles': pg_articles.filter(is_featured=True).count(),
                'articles_with_weight': pg_articles.filter(weight__gt=0).count(),
                'articles_with_stats': pg_articles.filter(view_count__gt=0).count()
            }
            
            # OpenSearch统计
            os_client = self.get_opensearch_client()
            if os_client and site:
                try:
                    index_name = f"articles_{site.replace('.', '_')}"
                    os_response = os_client.count(index=index_name)
                    result['opensearch'] = {
                        'total_articles': os_response.get('count', 0),
                        'index_name': index_name
                    }
                except:
                    result['opensearch'] = {'error': 'Index not found or query failed'}
            
            # ClickHouse统计
            ch_client = self.get_clickhouse_client()
            if ch_client:
                try:
                    # 统计事件总数
                    total_events = ch_client.execute("SELECT count() FROM events")[0][0]
                    
                    # 统计最近24小时事件
                    recent_events = ch_client.execute("""
                        SELECT count() FROM events 
                        WHERE ts >= subtractHours(now(), 24)
                    """)[0][0]
                    
                    result['clickhouse'] = {
                        'total_events': total_events,
                        'recent_24h_events': recent_events
                    }
                except:
                    result['clickhouse'] = {'error': 'Query failed'}
            
            # 一致性分析
            pg_count = result['postgresql']['total_articles']
            os_count = result['opensearch'].get('total_articles', 0)
            
            if os_count > 0:
                consistency_ratio = min(pg_count, os_count) / max(pg_count, os_count)
                result['consistency'] = {
                    'pg_os_ratio': consistency_ratio,
                    'is_consistent': consistency_ratio >= 0.95
                }
                
                if consistency_ratio < 0.95:
                    result['recommendations'].append('PostgreSQL和OpenSearch数据不一致，建议重新索引')
            
            # 权重一致性检查
            weight_inconsistent = pg_articles.exclude(weight=0).count()
            if weight_inconsistent < pg_count * 0.1:  # 少于10%有权重
                result['recommendations'].append('大部分文章权重为0，建议运行权重同步')
            
            return result
            
        except Exception as e:
            result['error'] = str(e)
            logger.error(f"数据一致性检查失败: {e}", exc_info=True)
            return result


# 全局实例
data_sync_service = DataSyncService()


# 便捷函数
def sync_article(article_id: int) -> bool:
    """同步单篇文章"""
    try:
        article = ArticlePage.objects.get(id=article_id)
        return data_sync_service.sync_article_to_opensearch(article)
    except ArticlePage.DoesNotExist:
        return False


def track_behavior(event_type: str, article_id: int, **kwargs) -> bool:
    """记录用户行为"""
    event_data = {
        'event': event_type,
        'article_id': article_id,
        'ts': timezone.now(),
        **kwargs
    }
    return data_sync_service.track_user_behavior(event_data)


def check_consistency(site: str = None) -> Dict[str, Any]:
    """检查数据一致性"""
    return data_sync_service.check_data_consistency(site)
