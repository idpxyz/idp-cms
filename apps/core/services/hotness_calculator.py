"""
热度计算服务 - 科学的文章热度评估和分类算法

基于多维度指标计算文章热度，并动态分类为 hot/trending
"""

import math
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from django.conf import settings
from django.utils import timezone as django_timezone
from clickhouse_driver import Client as ClickHouseClient

logger = logging.getLogger(__name__)


@dataclass
class HotnessMetrics:
    """热度指标数据结构 - 增强版"""
    article_id: str
    ctr_1h: float = 0.0      # 1小时点击率
    ctr_24h: float = 0.0     # 24小时点击率
    pop_1h: float = 0.0      # 1小时热度
    pop_24h: float = 0.0     # 24小时热度
    quality_score: float = 1.0  # 质量评分
    publish_time: datetime = None  # 发布时间
    view_count: int = 0      # 总浏览量
    share_count: int = 0     # 分享次数
    comment_count: int = 0   # 评论数
    like_count: int = 0      # 点赞数
    favorite_count: int = 0  # 收藏数
    reading_completion_rate: float = 0.0  # 阅读完成率
    bounce_rate: float = 0.0             # 跳出率
    social_score: float = 0.0            # 社交评分
    total_dwell_time: int = 0            # 总停留时间(毫秒)
    recency_score: float = 1.0           # 时效性评分
    hotness_score: float = 0.0           # 综合热度评分
    category: str = "normal"             # 分类: hot, trending, normal


@dataclass
class HotnessThresholds:
    """热度阈值配置 - 增强版"""
    hot_score_min: float = 75.0      # hot最低分数 (降低门槛)
    trending_score_min: float = 55.0  # trending最低分数 (降低门槛)
    hot_ctr_min: float = 0.03        # hot最低点击率 (降低门槛)
    trending_ctr_min: float = 0.02   # trending最低点击率 (降低门槛)
    max_age_hours: int = 72          # 最大考虑年龄(小时)
    min_views_hot: int = 50          # hot最低浏览量 (降低门槛)
    min_views_trending: int = 20     # trending最低浏览量 (降低门槛)
    # 新增社交互动阈值
    min_social_interactions_hot: int = 5      # hot最低社交互动次数
    min_social_interactions_trending: int = 2 # trending最低社交互动次数
    min_completion_rate_hot: float = 0.6      # hot最低阅读完成率
    min_completion_rate_trending: float = 0.4 # trending最低阅读完成率


class HotnessCalculator:
    """热度计算器"""
    
    def __init__(self, thresholds: Optional[HotnessThresholds] = None):
        self.thresholds = thresholds or HotnessThresholds()
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
    
    def calculate_recency_score(self, publish_time: datetime) -> float:
        """
        计算时效性评分
        使用指数衰减函数，12小时半衰期
        """
        if not publish_time:
            return 0.1
        
        now = django_timezone.now()
        if publish_time.tzinfo is None:
            publish_time = publish_time.replace(tzinfo=timezone.utc)
        if now.tzinfo is None:
            now = now.replace(tzinfo=timezone.utc)
        
        age_hours = (now - publish_time).total_seconds() / 3600.0
        
        # 超过最大年龄的文章不考虑为热点
        if age_hours > self.thresholds.max_age_hours:
            return 0.0
        
        # 指数衰减: 12小时半衰期
        recency = math.pow(0.5, age_hours / 12.0)
        return recency
    
    def calculate_engagement_score(self, metrics: HotnessMetrics) -> float:
        """
        计算用户参与度评分 - 增强版
        基于点击率、社交互动、阅读完成率等多维度指标
        """
        # 1. 点击率基础分 (40%)
        ctr_score = (metrics.ctr_1h * 3 + metrics.ctr_24h) / 4
        
        # 2. 社交互动评分 (35%)
        social_score = 0.0
        if metrics.view_count > 0:
            share_rate = metrics.share_count / metrics.view_count
            comment_rate = metrics.comment_count / metrics.view_count  
            like_rate = metrics.like_count / metrics.view_count
            favorite_rate = metrics.favorite_count / metrics.view_count
            
            # 加权社交互动：分享>收藏>评论>点赞
            social_score = (
                share_rate * 4 +      # 分享权重最高
                favorite_rate * 3 +   # 收藏次之
                comment_rate * 2 +    # 评论中等
                like_rate * 1         # 点赞基础
            ) * 25  # 归一化到0-100
        
        # 3. 阅读质量评分 (20%)
        reading_score = 0.0
        if metrics.reading_completion_rate > 0:
            # 阅读完成率高且跳出率低的内容质量更好
            completion_factor = min(metrics.reading_completion_rate, 1.0)
            bounce_penalty = max(0, 1 - metrics.bounce_rate)
            reading_score = (completion_factor * 0.7 + bounce_penalty * 0.3) * 100
        
        # 4. 停留时间评分 (5%)
        dwell_score = 0.0
        if metrics.total_dwell_time > 0:
            # 停留时间转换为分钟，设定30分钟为满分参考
            dwell_minutes = metrics.total_dwell_time / (1000 * 60)
            dwell_score = min(dwell_minutes / 30 * 100, 100)
        
        # 加权计算综合参与度
        engagement = (
            ctr_score * 40 +      # 点击率 40%
            social_score * 35 +   # 社交互动 35%  
            reading_score * 20 +  # 阅读质量 20%
            dwell_score * 5       # 停留时间 5%
        )
        
        return min(engagement, 100.0)
    
    def calculate_popularity_score(self, metrics: HotnessMetrics) -> float:
        """
        计算热度评分
        基于浏览量的对数增长
        """
        if metrics.view_count <= 0:
            return 0.0
        
        # 对数增长，避免极值
        pop_score = math.log10(metrics.view_count + 1) * 10
        
        # 1小时热度加权
        if metrics.pop_1h > 0:
            recent_boost = math.log10(metrics.pop_1h + 1) * 5
            pop_score += recent_boost
        
        return min(pop_score, 100.0)
    
    def calculate_hotness_score(self, metrics: HotnessMetrics) -> float:
        """
        计算综合热度评分
        
        算法公式:
        hotness = (recency * 0.3 + engagement * 0.4 + popularity * 0.2 + quality * 0.1)
        """
        recency = self.calculate_recency_score(metrics.publish_time)
        engagement = self.calculate_engagement_score(metrics)
        popularity = self.calculate_popularity_score(metrics)
        quality = metrics.quality_score * 100
        
        # 加权计算
        hotness = (
            recency * 30 +      # 时效性 30%
            engagement * 40 +   # 参与度 40%  
            popularity * 20 +   # 热度 20%
            quality * 10        # 质量 10%
        )
        
        return min(hotness, 100.0)
    
    def classify_article(self, metrics: HotnessMetrics) -> str:
        """
        根据热度评分和多维度指标分类文章 - 增强版
        
        分类规则:
        - hot: 高热度 + 高互动 + 高质量 + 足够浏览量
        - trending: 中等热度 + 中等互动 + 中等质量 + 适量浏览量  
        - normal: 其他
        """
        hotness = self.calculate_hotness_score(metrics)
        metrics.hotness_score = hotness
        metrics.recency_score = self.calculate_recency_score(metrics.publish_time)
        
        # 计算社交互动总数
        social_interactions = (
            metrics.share_count + 
            metrics.comment_count + 
            metrics.like_count + 
            metrics.favorite_count
        )
        
        # Hot 分类条件 - 多维度综合评估
        hot_conditions = [
            hotness >= self.thresholds.hot_score_min,
            metrics.ctr_1h >= self.thresholds.hot_ctr_min,
            metrics.view_count >= self.thresholds.min_views_hot,
            metrics.recency_score > 0.1,  # 时效性
            social_interactions >= self.thresholds.min_social_interactions_hot,  # 社交互动
        ]
        
        # 高质量内容的额外加分条件
        quality_bonus = (
            metrics.reading_completion_rate >= self.thresholds.min_completion_rate_hot or
            metrics.bounce_rate <= 0.3 or  # 低跳出率
            metrics.social_score > 0.5      # 高社交评分
        )
        
        if sum(hot_conditions) >= 4 and quality_bonus:  # 至少满足4个基础条件+质量加分
            return "hot"
        
        # Trending 分类条件 - 相对宽松的标准  
        trending_conditions = [
            hotness >= self.thresholds.trending_score_min,
            metrics.ctr_1h >= self.thresholds.trending_ctr_min,
            metrics.view_count >= self.thresholds.min_views_trending,
            metrics.recency_score > 0.05,  # 时效性要求稍低
            social_interactions >= self.thresholds.min_social_interactions_trending,
        ]
        
        if sum(trending_conditions) >= 3:  # 至少满足3个条件
            return "trending"
        
        # 默认分类
        return "normal"
    
    def fetch_article_metrics(self, article_ids: List[str], site: str = None) -> Dict[str, HotnessMetrics]:
        """
        从ClickHouse获取文章指标数据
        """
        if not article_ids:
            return {}
        
        site = site or getattr(settings, 'SITE_HOSTNAME', 'localhost')
        ch = self.get_clickhouse_client()
        if not ch:
            logger.warning("ClickHouse不可用，使用默认指标")
            return {aid: HotnessMetrics(article_id=aid) for aid in article_ids}
        
        try:
            # 构建查询
            ids_str = "','".join(article_ids)
            # 🔥 使用增强的ClickHouse schema，包含完整的社交和行为指标
            query = f"""
            SELECT 
                article_id,
                sum(clicks) as total_clicks,
                sum(impressions) as total_impressions,
                sumIf(clicks, window_start >= now() - INTERVAL 1 HOUR) as clicks_1h,
                sumIf(impressions, window_start >= now() - INTERVAL 1 HOUR) as impressions_1h,
                sumIf(clicks, window_start >= now() - INTERVAL 24 HOUR) as clicks_24h,
                sumIf(impressions, window_start >= now() - INTERVAL 24 HOUR) as impressions_24h,
                sum(shares) as share_count,
                sum(comments) as comment_count,
                sum(likes) as like_count,
                sum(favorites) as favorite_count,
                avg(reading_completion_rate) as avg_completion_rate,
                avg(bounce_rate) as avg_bounce_rate,
                avg(social_score) as avg_social_score,
                sum(dwell_ms_sum) as total_dwell_ms
            FROM article_metrics_agg 
            WHERE article_id IN ('{ids_str}') 
              AND site = %(site)s
              AND window_start >= now() - INTERVAL 72 HOUR
            GROUP BY article_id
            """
            
            rows = ch.execute(query, {"site": site})
            
            metrics_dict = {}
            for row in rows:
                article_id, total_clicks, total_impressions, clicks_1h, impressions_1h, \
                clicks_24h, impressions_24h, share_count, comment_count, like_count, \
                favorite_count, avg_completion_rate, avg_bounce_rate, avg_social_score, \
                total_dwell_ms = row
                
                # 计算点击率
                ctr_1h = (clicks_1h / impressions_1h) if impressions_1h > 0 else 0.0
                ctr_24h = (clicks_24h / impressions_24h) if impressions_24h > 0 else 0.0
                
                metrics = HotnessMetrics(
                    article_id=str(article_id),
                    ctr_1h=float(ctr_1h),
                    ctr_24h=float(ctr_24h),
                    pop_1h=float(clicks_1h or 0),
                    pop_24h=float(clicks_24h or 0),
                    view_count=int(total_clicks or 0),
                    share_count=int(share_count or 0),
                    comment_count=int(comment_count or 0),
                    like_count=int(like_count or 0),
                    favorite_count=int(favorite_count or 0),
                    reading_completion_rate=float(avg_completion_rate or 0),
                    bounce_rate=float(avg_bounce_rate or 0),
                    social_score=float(avg_social_score or 0),
                    total_dwell_time=int(total_dwell_ms or 0)
                )
                
                metrics_dict[str(article_id)] = metrics
            
            # 为没有数据的文章创建默认指标
            for aid in article_ids:
                if str(aid) not in metrics_dict:
                    metrics_dict[str(aid)] = HotnessMetrics(article_id=str(aid))
            
            return metrics_dict
            
        except Exception as e:
            logger.error(f"获取文章指标失败: {e}")
            return {aid: HotnessMetrics(article_id=aid) for aid in article_ids}
    
    def batch_classify_articles(self, article_data: List[Dict], site: str = None) -> List[Dict]:
        """
        批量分类文章
        
        Args:
            article_data: 包含文章信息的字典列表 [{id, publish_time, quality_score, ...}]
            site: 站点标识
            
        Returns:
            添加了分类信息的文章数据列表
        """
        if not article_data:
            return []
        
        # 提取文章ID
        article_ids = [str(item.get('id', item.get('article_id'))) for item in article_data]
        
        # 获取指标数据
        metrics_dict = self.fetch_article_metrics(article_ids, site)
        
        # 分类结果
        classified_articles = []
        
        for item in article_data:
            article_id = str(item.get('id', item.get('article_id')))
            metrics = metrics_dict.get(article_id, HotnessMetrics(article_id=article_id))
            
            # 补充文章元数据
            if 'publish_time' in item or 'first_published_at' in item:
                pub_time = item.get('publish_time') or item.get('first_published_at')
                if isinstance(pub_time, str):
                    try:
                        metrics.publish_time = datetime.fromisoformat(pub_time.replace('Z', '+00:00'))
                    except:
                        metrics.publish_time = django_timezone.now()
                elif hasattr(pub_time, 'replace'):  # datetime object
                    metrics.publish_time = pub_time
                else:
                    metrics.publish_time = django_timezone.now()
            else:
                metrics.publish_time = django_timezone.now()
            
            # 质量评分
            if 'quality_score' in item:
                metrics.quality_score = float(item.get('quality_score', 1.0))
            
            # 分类
            category = self.classify_article(metrics)
            
            # 复制原始数据并添加分类信息
            classified_item = item.copy()
            classified_item.update({
                'hotness_category': category,
                'hotness_score': metrics.hotness_score,
                'recency_score': metrics.recency_score,
                'ctr_1h': metrics.ctr_1h,
                'ctr_24h': metrics.ctr_24h,
                'pop_1h': metrics.pop_1h,
                'pop_24h': metrics.pop_24h,
                'engagement_score': self.calculate_engagement_score(metrics),
                'popularity_score': self.calculate_popularity_score(metrics),
            })
            
            classified_articles.append(classified_item)
        
        return classified_articles


# 默认实例
default_calculator = HotnessCalculator()


def classify_articles_batch(article_data: List[Dict], site: str = None) -> List[Dict]:
    """
    便捷函数：批量分类文章
    """
    return default_calculator.batch_classify_articles(article_data, site)


def get_hotness_score(article_id: str, site: str = None) -> Tuple[float, str]:
    """
    便捷函数：获取单篇文章的热度评分和分类
    
    Returns:
        (hotness_score, category)
    """
    metrics_dict = default_calculator.fetch_article_metrics([article_id], site)
    metrics = metrics_dict.get(article_id, HotnessMetrics(article_id=article_id))
    
    # 需要从数据库获取发布时间和质量评分
    try:
        from apps.news.models.article import ArticlePage
        page = ArticlePage.objects.filter(id=int(article_id)).first()
        if page:
            metrics.publish_time = page.first_published_at or page.last_published_at
            metrics.quality_score = getattr(page, 'quality_score', 1.0)
    except:
        metrics.publish_time = django_timezone.now()
    
    category = default_calculator.classify_article(metrics)
    return metrics.hotness_score, category
