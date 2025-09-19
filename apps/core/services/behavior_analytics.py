"""
用户行为分析服务

功能：
1. 收集用户行为数据到ClickHouse
2. 分析用户阅读偏好
3. 生成文章热度指标
4. 为推荐系统提供数据支持
"""

import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from django.conf import settings
from django.utils import timezone
from django.core.cache import cache
from clickhouse_driver import Client as ClickHouseClient
from apps.core.services.data_sync_service import data_sync_service

logger = logging.getLogger(__name__)


class BehaviorAnalytics:
    """用户行为分析服务"""
    
    def __init__(self):
        self.clickhouse_client = None
    
    def get_clickhouse_client(self):
        """获取ClickHouse客户端"""
        if not self.clickhouse_client:
            try:
                self.clickhouse_client = ClickHouseClient.from_url(settings.CLICKHOUSE_URL)
            except Exception as e:
                logger.error(f"ClickHouse连接失败: {e}")
                return None
        return self.clickhouse_client
    
    def track_article_view(self, article_id: int, user_id: str = None, 
                          device_id: str = None, session_id: str = None,
                          dwell_time: int = 0, referrer: str = '', **kwargs) -> bool:
        """
        追踪文章阅读行为
        
        Args:
            article_id: 文章ID
            user_id: 用户ID
            device_id: 设备ID
            session_id: 会话ID
            dwell_time: 停留时间(毫秒)
            referrer: 来源页面
        
        Returns:
            bool: 是否成功记录
        """
        event_data = {
            'event': 'article_view',
            'article_id': article_id,
            'user_id': user_id or '',
            'device_id': device_id or '',
            'session_id': session_id or '',
            'dwell_ms': dwell_time,
            'referrer': referrer,
            'ts': timezone.now(),
            **kwargs
        }
        
        # 记录到ClickHouse
        success = data_sync_service.track_user_behavior(event_data)
        
        if success:
            # 异步更新文章阅读量
            self._update_article_view_count(article_id)
        
        return success
    
    def track_article_interaction(self, article_id: int, interaction_type: str,
                                user_id: str = None, device_id: str = None,
                                session_id: str = None, **kwargs) -> bool:
        """
        追踪文章互动行为（点赞、收藏、分享等）
        
        Args:
            article_id: 文章ID
            interaction_type: 互动类型 (like, favorite, share, comment)
            user_id: 用户ID
            device_id: 设备ID
            session_id: 会话ID
        
        Returns:
            bool: 是否成功记录
        """
        event_data = {
            'event': f'article_{interaction_type}',
            'article_id': article_id,
            'user_id': user_id or '',
            'device_id': device_id or '',
            'session_id': session_id or '',
            'ts': timezone.now(),
            **kwargs
        }
        
        return data_sync_service.track_user_behavior(event_data)
    
    def track_search_behavior(self, search_query: str, user_id: str = None,
                            device_id: str = None, session_id: str = None,
                            result_count: int = 0, clicked_article_id: int = None,
                            **kwargs) -> bool:
        """
        追踪搜索行为
        
        Args:
            search_query: 搜索关键词
            user_id: 用户ID
            device_id: 设备ID
            session_id: 会话ID
            result_count: 搜索结果数量
            clicked_article_id: 点击的文章ID
        
        Returns:
            bool: 是否成功记录
        """
        event_data = {
            'event': 'search_query',
            'search_query': search_query,
            'user_id': user_id or '',
            'device_id': device_id or '',
            'session_id': session_id or '',
            'article_id': str(clicked_article_id or ''),
            'ts': timezone.now(),
            **kwargs
        }
        
        return data_sync_service.track_user_behavior(event_data)
    
    def get_article_analytics(self, article_id: int, hours: int = 24) -> Dict[str, Any]:
        """
        获取文章分析数据
        
        Args:
            article_id: 文章ID
            hours: 时间范围（小时）
        
        Returns:
            Dict: 分析数据
        """
        cache_key = f"article_analytics_{article_id}_{hours}h"
        cached_result = cache.get(cache_key)
        if cached_result:
            return cached_result
        
        try:
            client = self.get_clickhouse_client()
            if not client:
                return {'error': 'ClickHouse连接失败'}
            
            # 查询指定时间范围内的行为数据
            query = """
            SELECT 
                event,
                count() as count,
                uniq(device_id) as unique_devices,
                avg(dwell_ms) as avg_dwell_time
            FROM events 
            WHERE article_id = '{}'
                AND ts >= subtractHours(now(), {})
            GROUP BY event
            ORDER BY count DESC
            """.format(str(article_id), hours)
            
            result = client.execute(query)
            
            analytics = {
                'article_id': article_id,
                'time_range_hours': hours,
                'events': {},
                'total_interactions': 0,
                'unique_devices': 0
            }
            
            for event, count, devices, avg_dwell in result:
                analytics['events'][event] = {
                    'count': count,
                    'unique_devices': devices,
                    'avg_dwell_time': avg_dwell or 0
                }
                analytics['total_interactions'] += count
                analytics['unique_devices'] = max(analytics['unique_devices'], devices)
            
            # 缓存5分钟
            cache.set(cache_key, analytics, 300)
            return analytics
            
        except Exception as e:
            logger.error(f"获取文章 {article_id} 分析数据失败: {e}")
            return {'error': str(e)}
    
    def get_trending_articles(self, hours: int = 24, limit: int = 10) -> List[Dict[str, Any]]:
        """
        获取热门文章
        
        Args:
            hours: 时间范围（小时）
            limit: 返回数量限制
        
        Returns:
            List: 热门文章列表
        """
        cache_key = f"trending_articles_{hours}h_{limit}"
        cached_result = cache.get(cache_key)
        if cached_result:
            return cached_result
        
        try:
            client = self.get_clickhouse_client()
            if not client:
                return []
            
            # 查询热门文章（基于互动数量和独立设备数）
            query = """
            SELECT 
                article_id,
                count() as total_interactions,
                uniq(device_id) as unique_devices,
                countIf(event = 'article_view') as views,
                countIf(event = 'article_like') as likes,
                countIf(event = 'article_favorite') as favorites,
                countIf(event = 'article_comment') as comments,
                avg(dwell_ms) as avg_dwell_time
            FROM events 
            WHERE ts >= subtractHours(now(), {})
                AND article_id != ''
            GROUP BY article_id
            HAVING total_interactions >= 5
            ORDER BY (total_interactions * 0.6 + unique_devices * 0.4) DESC
            LIMIT {}
            """.format(hours, limit)
            
            result = client.execute(query)
            
            trending = []
            for row in result:
                article_id, total, devices, views, likes, favs, comments, avg_dwell = row
                
                # 计算热度分数
                heat_score = (
                    views * 1.0 +
                    likes * 3.0 +
                    favs * 5.0 +
                    comments * 8.0 +
                    devices * 2.0
                ) / max(total, 1)
                
                trending.append({
                    'article_id': int(article_id) if article_id.isdigit() else 0,
                    'total_interactions': total,
                    'unique_devices': devices,
                    'views': views,
                    'likes': likes,
                    'favorites': favs,
                    'comments': comments,
                    'avg_dwell_time': avg_dwell or 0,
                    'heat_score': round(heat_score, 2)
                })
            
            # 缓存10分钟
            cache.set(cache_key, trending, 600)
            return trending
            
        except Exception as e:
            logger.error(f"获取热门文章失败: {e}")
            return []
    
    def get_user_reading_pattern(self, user_id: str, days: int = 30) -> Dict[str, Any]:
        """
        分析用户阅读模式
        
        Args:
            user_id: 用户ID
            days: 分析天数
        
        Returns:
            Dict: 用户阅读模式
        """
        try:
            client = self.get_clickhouse_client()
            if not client:
                return {'error': 'ClickHouse连接失败'}
            
            # 查询用户行为模式
            query = """
            SELECT 
                toHour(ts) as hour,
                channel,
                count() as interactions,
                avg(dwell_ms) as avg_dwell_time,
                uniq(article_id) as unique_articles
            FROM events 
            WHERE user_id = '{}'
                AND ts >= subtractDays(now(), {})
                AND event IN ('article_view', 'article_like', 'article_favorite')
            GROUP BY hour, channel
            ORDER BY interactions DESC
            """.format(user_id, days)
            
            result = client.execute(query)
            
            pattern = {
                'user_id': user_id,
                'analysis_days': days,
                'active_hours': {},
                'preferred_channels': {},
                'total_interactions': 0,
                'avg_session_time': 0
            }
            
            total_dwell = 0
            total_count = 0
            
            for hour, channel, interactions, avg_dwell, articles in result:
                # 活跃时段
                if hour not in pattern['active_hours']:
                    pattern['active_hours'][hour] = 0
                pattern['active_hours'][hour] += interactions
                
                # 偏好频道
                if channel and channel not in pattern['preferred_channels']:
                    pattern['preferred_channels'][channel] = 0
                pattern['preferred_channels'][channel] += interactions
                
                pattern['total_interactions'] += interactions
                total_dwell += (avg_dwell or 0) * interactions
                total_count += interactions
            
            # 计算平均会话时间
            if total_count > 0:
                pattern['avg_session_time'] = round(total_dwell / total_count, 2)
            
            return pattern
            
        except Exception as e:
            logger.error(f"分析用户 {user_id} 阅读模式失败: {e}")
            return {'error': str(e)}
    
    def _update_article_view_count(self, article_id: int):
        """异步更新文章阅读量"""
        try:
            from apps.news.models.article import ArticlePage
            from django.db import transaction
            
            with transaction.atomic():
                article = ArticlePage.objects.select_for_update().get(id=article_id)
                article.view_count = (article.view_count or 0) + 1
                article.save(update_fields=['view_count'])
                
                # 触发权重重新计算
                data_sync_service.sync_article_weight(article)
                
        except ArticlePage.DoesNotExist:
            logger.warning(f"文章 {article_id} 不存在，无法更新阅读量")
        except Exception as e:
            logger.error(f"更新文章 {article_id} 阅读量失败: {e}")


# 全局实例
behavior_analytics = BehaviorAnalytics()


# 便捷函数
def track_view(article_id: int, **kwargs) -> bool:
    """追踪文章阅读"""
    return behavior_analytics.track_article_view(article_id, **kwargs)


def track_interaction(article_id: int, interaction_type: str, **kwargs) -> bool:
    """追踪文章互动"""
    return behavior_analytics.track_article_interaction(
        article_id, interaction_type, **kwargs
    )


def track_search(search_query: str, **kwargs) -> bool:
    """追踪搜索行为"""
    return behavior_analytics.track_search_behavior(search_query, **kwargs)


def get_trending(hours: int = 24, limit: int = 10) -> List[Dict[str, Any]]:
    """获取热门文章"""
    return behavior_analytics.get_trending_articles(hours, limit)
