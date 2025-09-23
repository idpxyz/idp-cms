"""
社交指标数据收集器

用于从Django数据库收集社交互动数据，并同步到ClickHouse以增强热度计算
"""

import logging
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Count, Sum, Avg
from clickhouse_driver import Client as ClickHouseClient
from django.conf import settings

logger = logging.getLogger(__name__)


class SocialMetricsCollector:
    """社交指标收集器"""
    
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
    
    def collect_social_data_from_django(self, article_ids: List[str], site: str = 'aivoya.com') -> Dict:
        """
        从Django数据库收集社交互动数据
        
        Returns:
            Dict[article_id] = {
                'comments': count,
                'likes': count, 
                'favorites': count,
                'shares': count,
                'social_score': float
            }
        """
        social_data = {}
        
        try:
            # 从Django模型收集数据
            from apps.web_users.models import UserComment, UserFavorite, UserInteraction
            from apps.news.models.article import ArticlePage
            
            for article_id in article_ids:
                try:
                    # 获取文章对象
                    article = ArticlePage.objects.filter(id=int(article_id)).first()
                    if not article:
                        continue
                    
                    # 收集各种社交指标
                    comments_count = UserComment.objects.filter(
                        article_id=article_id
                    ).count()
                    
                    favorites_count = UserFavorite.objects.filter(
                        article_id=article_id
                    ).count()
                    
                    # 从UserInteraction表收集点赞和分享数据
                    # 注意：UserInteraction表使用target_id而不是article_id
                    from django.db import models
                    interactions = UserInteraction.objects.filter(
                        target_id=article_id,
                        target_type='article'
                    ).aggregate(
                        likes=Count('id', filter=models.Q(interaction_type='like')),
                        shares=Count('id', filter=models.Q(interaction_type='share'))
                    )
                    
                    likes_count = interactions.get('likes', 0) or 0
                    shares_count = interactions.get('shares', 0) or 0
                    
                    # 使用文章本身的计数器（如果有）
                    if hasattr(article, 'like_count') and article.like_count:
                        likes_count = max(likes_count, article.like_count)
                    if hasattr(article, 'comment_count') and article.comment_count:
                        comments_count = max(comments_count, article.comment_count)
                    if hasattr(article, 'favorite_count') and article.favorite_count:
                        favorites_count = max(favorites_count, article.favorite_count)
                    
                    # 计算社交评分 (0-1范围)
                    total_interactions = comments_count + likes_count + favorites_count + shares_count
                    social_score = min(total_interactions / 100.0, 1.0)  # 100个互动为满分
                    
                    social_data[article_id] = {
                        'comments': comments_count,
                        'likes': likes_count,
                        'favorites': favorites_count,
                        'shares': shares_count,
                        'social_score': social_score
                    }
                    
                except Exception as e:
                    logger.error(f"收集文章 {article_id} 社交数据失败: {e}")
                    social_data[article_id] = {
                        'comments': 0, 'likes': 0, 'favorites': 0, 'shares': 0, 'social_score': 0.0
                    }
            
        except Exception as e:
            logger.error(f"从Django收集社交数据失败: {e}")
        
        return social_data
    
    def collect_reading_quality_metrics(self, article_ids: List[str]) -> Dict:
        """
        收集阅读质量指标
        
        Returns:
            Dict[article_id] = {
                'reading_completion_rate': float,
                'avg_reading_time': float,
                'bounce_rate': float
            }
        """
        quality_data = {}
        
        try:
            from apps.web_users.models import ReadingHistory
            
            for article_id in article_ids:
                try:
                    # 获取该文章的阅读历史记录
                    history_records = ReadingHistory.objects.filter(
                        article_id=article_id
                    )
                    
                    if history_records.exists():
                        # 计算平均阅读完成率
                        avg_progress = history_records.aggregate(
                            avg_progress=Avg('read_progress')
                        )['avg_progress'] or 0
                        
                        # 计算平均阅读时间（分钟）
                        avg_duration = history_records.aggregate(
                            avg_duration=Avg('read_duration')
                        )['avg_duration'] or 0
                        
                        # 计算跳出率（阅读进度<10%的比例）
                        total_reads = history_records.count()
                        bounced_reads = history_records.filter(read_progress__lt=10).count()
                        bounce_rate = bounced_reads / total_reads if total_reads > 0 else 0
                        
                        quality_data[article_id] = {
                            'reading_completion_rate': avg_progress / 100.0,  # 转换为0-1范围
                            'avg_reading_time': avg_duration / 60.0,  # 转换为分钟
                            'bounce_rate': bounce_rate
                        }
                    else:
                        quality_data[article_id] = {
                            'reading_completion_rate': 0.0,
                            'avg_reading_time': 0.0,
                            'bounce_rate': 1.0  # 无数据时设为高跳出率
                        }
                        
                except Exception as e:
                    logger.error(f"收集文章 {article_id} 阅读质量数据失败: {e}")
                    quality_data[article_id] = {
                        'reading_completion_rate': 0.0,
                        'avg_reading_time': 0.0,
                        'bounce_rate': 1.0
                    }
        
        except Exception as e:
            logger.error(f"收集阅读质量数据失败: {e}")
        
        return quality_data
    
    def sync_to_clickhouse(self, article_ids: List[str], site: str = 'aivoya.com') -> bool:
        """
        将Django的社交数据同步到ClickHouse
        """
        ch = self.get_clickhouse_client()
        if not ch:
            logger.error("ClickHouse不可用，无法同步社交数据")
            return False
        
        try:
            # 收集社交数据
            social_data = self.collect_social_data_from_django(article_ids, site)
            quality_data = self.collect_reading_quality_metrics(article_ids)
            
            if not social_data and not quality_data:
                logger.info("没有社交数据需要同步")
                return True
            
            # 更新ClickHouse中的社交指标
            current_time = datetime.now()
            window_start = current_time.replace(minute=0, second=0, microsecond=0)
            
            updated_count = 0
            
            for article_id in article_ids:
                social = social_data.get(article_id, {})
                quality = quality_data.get(article_id, {})
                
                if not social and not quality:
                    continue
                
                try:
                    # 检查是否存在记录
                    check_query = """
                    SELECT COUNT(*) FROM article_metrics_agg 
                    WHERE article_id = %(article_id)s 
                      AND site = %(site)s 
                      AND window_start = %(window_start)s
                    """
                    
                    result = ch.execute(check_query, {
                        'article_id': article_id,
                        'site': site,
                        'window_start': window_start
                    })
                    
                    exists = result[0][0] > 0 if result else False
                    
                    if exists:
                        # 更新现有记录
                        update_query = """
                        ALTER TABLE article_metrics_agg 
                        UPDATE 
                            shares = %(shares)s,
                            comments = %(comments)s,
                            likes = %(likes)s,
                            favorites = %(favorites)s,
                            reading_completion_rate = %(completion_rate)s,
                            bounce_rate = %(bounce_rate)s,
                            social_score = %(social_score)s
                        WHERE article_id = %(article_id)s 
                          AND site = %(site)s 
                          AND window_start = %(window_start)s
                        """
                        
                        ch.execute(update_query, {
                            'article_id': article_id,
                            'site': site,
                            'window_start': window_start,
                            'shares': social.get('shares', 0),
                            'comments': social.get('comments', 0),
                            'likes': social.get('likes', 0),
                            'favorites': social.get('favorites', 0),
                            'completion_rate': quality.get('reading_completion_rate', 0.0),
                            'bounce_rate': quality.get('bounce_rate', 0.0),
                            'social_score': social.get('social_score', 0.0)
                        })
                    else:
                        # 插入新记录
                        insert_query = """
                        INSERT INTO article_metrics_agg (
                            window_start, site, channel, article_id,
                            impressions, clicks, dwell_ms_sum,
                            shares, comments, likes, favorites,
                            reading_completion_rate, bounce_rate, social_score
                        ) VALUES (
                            %(window_start)s, %(site)s, 'unknown', %(article_id)s,
                            0, 0, 0,
                            %(shares)s, %(comments)s, %(likes)s, %(favorites)s,
                            %(completion_rate)s, %(bounce_rate)s, %(social_score)s
                        )
                        """
                        
                        ch.execute(insert_query, {
                            'window_start': window_start,
                            'site': site,
                            'article_id': article_id,
                            'shares': social.get('shares', 0),
                            'comments': social.get('comments', 0),
                            'likes': social.get('likes', 0),
                            'favorites': social.get('favorites', 0),
                            'completion_rate': quality.get('reading_completion_rate', 0.0),
                            'bounce_rate': quality.get('bounce_rate', 0.0),
                            'social_score': social.get('social_score', 0.0)
                        })
                    
                    updated_count += 1
                    
                except Exception as e:
                    logger.error(f"同步文章 {article_id} 社交数据到ClickHouse失败: {e}")
            
            logger.info(f"成功同步 {updated_count} 篇文章的社交数据到ClickHouse")
            return True
            
        except Exception as e:
            logger.error(f"同步社交数据到ClickHouse失败: {e}")
            return False
    
    def generate_social_events(self, article_ids: List[str], site: str = 'aivoya.com'):
        """
        生成社交互动事件到events表（用于更细粒度的分析）
        """
        ch = self.get_clickhouse_client()
        if not ch:
            return
        
        try:
            from apps.web_users.models import UserComment, UserFavorite, UserInteraction
            
            events_data = []
            
            # 收集评论事件
            comments = UserComment.objects.filter(
                article_id__in=article_ids,
                created_at__gte=timezone.now() - timedelta(days=7)
            ).select_related('user')
            
            for comment in comments:
                events_data.append([
                    comment.created_at,
                    f"user_{comment.user.id}" if comment.user else "anonymous",
                    "",  # device_id
                    f"session_{comment.id}",
                    "comment",
                    str(comment.article_id),
                    "unknown",  # channel
                    site,
                    0,  # dwell_ms
                    "",  # search_query
                    1.0,  # event_value
                    0.0,  # reading_progress
                    "comment"  # social_action
                ])
            
            # 收集收藏事件
            favorites = UserFavorite.objects.filter(
                article_id__in=article_ids,
                created_at__gte=timezone.now() - timedelta(days=7)
            ).select_related('user')
            
            for favorite in favorites:
                events_data.append([
                    favorite.created_at,
                    f"user_{favorite.user.id}",
                    "",
                    f"session_{favorite.id}",
                    "favorite",
                    str(favorite.article_id),
                    "unknown",
                    site,
                    0, "", 3.0, 0.0, "favorite"  # 收藏权重更高
                ])
            
            # 批量插入事件
            if events_data:
                ch.execute("""
                INSERT INTO events (
                    ts, user_id, device_id, session_id, event, article_id, 
                    channel, site, dwell_ms, search_query, event_value, 
                    reading_progress, social_action
                ) VALUES
                """, events_data)
                
                logger.info(f"生成了 {len(events_data)} 个社交事件到ClickHouse")
        
        except Exception as e:
            logger.error(f"生成社交事件失败: {e}")


# 默认实例
default_collector = SocialMetricsCollector()


def sync_social_metrics(article_ids: List[str], site: str = 'aivoya.com') -> bool:
    """便捷函数：同步社交指标"""
    return default_collector.sync_to_clickhouse(article_ids, site)


def collect_and_sync_all_recent_articles(hours_back: int = 24, site: str = 'aivoya.com'):
    """收集并同步最近文章的社交数据"""
    try:
        from apps.news.models.article import ArticlePage
        from datetime import timedelta
        from django.utils import timezone
        
        # 获取最近的文章
        since = timezone.now() - timedelta(hours=hours_back)
        recent_articles = ArticlePage.objects.live().filter(
            first_published_at__gte=since
        ).values_list('id', flat=True)
        
        article_ids = [str(aid) for aid in recent_articles]
        
        if article_ids:
            logger.info(f"开始同步 {len(article_ids)} 篇最近文章的社交数据")
            return sync_social_metrics(article_ids, site)
        else:
            logger.info("没有找到需要同步的最近文章")
            return True
            
    except Exception as e:
        logger.error(f"收集并同步最近文章社交数据失败: {e}")
        return False
