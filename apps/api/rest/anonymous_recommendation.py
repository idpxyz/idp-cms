"""
匿名用户推荐系统

实现类似今日头条的匿名用户推荐逻辑
"""

import hashlib
import time
from typing import Dict, List, Optional, Tuple
from django.core.cache import cache
from django.conf import settings
from clickhouse_driver import Client
from apps.core.flags import flag
from apps.core.site_utils import get_site_from_request
from apps.core.models import Channel
from apps.core.utils.circuit_breaker import get_breaker


class AnonymousRecommendationEngine:
    """匿名用户推荐引擎"""
    
    def __init__(self):
        self.breaker = get_breaker("clickhouse", failure_threshold=5, recovery_timeout=30, rolling_window=60)
        self.ch_client = Client.from_url(settings.CLICKHOUSE_URL)
        self.cache_timeout = 300  # 5分钟缓存
    
    def get_device_fingerprint(self, request) -> str:
        """生成设备指纹"""
        # 使用User-Agent + IP + 其他设备特征
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        ip = self._get_client_ip(request)
        
        # 生成设备指纹
        fingerprint_data = f"{user_agent}_{ip}"
        return hashlib.md5(fingerprint_data.encode()).hexdigest()[:16]
    
    def _get_client_ip(self, request) -> str:
        """获取客户端IP"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip or 'unknown'
    
    def get_session_id(self, request) -> str:
        """获取或生成会话ID"""
        session_id = request.headers.get('X-Session-ID')
        if not session_id:
            # 生成基于时间戳的会话ID
            session_id = f"anon_{int(time.time() * 1000)}"
        return session_id
    
    def get_anonymous_user_profile(self, device_id: str, session_id: str, site: str) -> Dict:
        """获取匿名用户画像"""
        cache_key = f"anon_profile_{device_id}_{site}"
        profile = cache.get(cache_key)
        
        if profile is None:
            profile = self._build_anonymous_profile(device_id, session_id, site)
            cache.set(cache_key, profile, self.cache_timeout)
        
        return profile
    
    def _build_anonymous_profile(self, device_id: str, session_id: str, site: str) -> Dict:
        """构建匿名用户画像"""
        # 1. 分析设备历史行为
        device_history = self._get_device_behavior_history(device_id, site)
        
        # 2. 分析当前会话行为
        session_behavior = self._get_session_behavior(session_id, site)
        
        # 3. 分析站点热门内容
        site_trends = self._get_site_trends(site)
        
        # 4. 构建用户画像
        profile = {
            "user_type": "anonymous",
            "device_id": device_id,
            "session_id": session_id,
            "interests": self._extract_interests(device_history, session_behavior),
            "preferred_channels": self._get_preferred_channels(device_history, site_trends),
            "content_preferences": self._get_content_preferences(device_history),
            "recency_preference": self._get_recency_preference(device_history),
            "diversity_level": self._get_diversity_level(device_history),
            "confidence_score": self._calculate_confidence_score(device_history, session_behavior)
        }
        
        return profile
    
    def _get_device_behavior_history(self, device_id: str, site: str) -> List[Dict]:
        """获取设备历史行为"""
        try:
            query = f"""
            SELECT 
                channel,
                COUNT(*) as view_count,
                AVG(dwell_ms) as avg_dwell,
                MAX(ts) as last_view,
                COUNT(DISTINCT article_id) as unique_articles
            FROM events 
            WHERE device_id = '{device_id}' 
            AND site = '{site}' 
            AND event = 'view'
            AND ts >= now() - INTERVAL 7 DAY
            GROUP BY channel
            ORDER BY view_count DESC
            LIMIT 10
            """
            
            result = self.breaker.call(self.ch_client.execute, query)
            
            return [
                {
                    "channel": row[0],
                    "view_count": row[1],
                    "avg_dwell": row[2],
                    "last_view": row[3],
                    "unique_articles": row[4]
                }
                for row in result
            ]
        except Exception as e:
            print(f"Error getting device history: {e}")
            return []
    
    def _get_session_behavior(self, session_id: str, site: str) -> List[Dict]:
        """获取当前会话行为"""
        try:
            query = f"""
            SELECT 
                channel,
                article_id,
                event,
                dwell_ms,
                ts
            FROM events 
            WHERE session_id = '{session_id}' 
            AND site = '{site}' 
            AND ts >= now() - INTERVAL 1 HOUR
            ORDER BY ts DESC
            LIMIT 50
            """
            
            result = self.breaker.call(self.ch_client.execute, query)
            
            return [
                {
                    "channel": row[0],
                    "article_id": row[1],
                    "event": row[2],
                    "dwell_ms": row[3],
                    "ts": row[4]
                }
                for row in result
            ]
        except Exception as e:
            print(f"Error getting session behavior: {e}")
            return []
    
    def _get_site_trends(self, site: str) -> Dict:
        """获取站点趋势数据"""
        try:
            query = f"""
            SELECT 
                channel,
                COUNT(*) as total_views,
                AVG(dwell_ms) as avg_dwell,
                COUNT(DISTINCT device_id) as unique_devices
            FROM events 
            WHERE site = '{site}' 
            AND event = 'view'
            AND ts >= now() - INTERVAL 24 HOUR
            GROUP BY channel
            ORDER BY total_views DESC
            """
            
            result = self.breaker.call(self.ch_client.execute, query)
            
            trends = {}
            for row in result:
                trends[row[0]] = {
                    "total_views": row[1],
                    "avg_dwell": row[2],
                    "unique_devices": row[3]
                }
            
            return trends
        except Exception as e:
            print(f"Error getting site trends: {e}")
            return {}
    
    def _extract_interests(self, device_history: List[Dict], session_behavior: List[Dict]) -> Dict[str, float]:
        """提取用户兴趣标签"""
        interests = {}
        
        # 基于设备历史
        for behavior in device_history:
            channel = behavior["channel"]
            weight = behavior["view_count"] * (behavior["avg_dwell"] / 1000)  # 观看次数 * 平均停留时间
            interests[channel] = interests.get(channel, 0) + weight
        
        # 基于当前会话（权重更高）
        for behavior in session_behavior:
            if behavior["event"] == "view":
                channel = behavior["channel"]
                weight = behavior["dwell_ms"] / 1000  # 停留时间
                interests[channel] = interests.get(channel, 0) + weight * 2  # 当前会话权重翻倍
        
        # 归一化
        total_weight = sum(interests.values())
        if total_weight > 0:
            interests = {k: v / total_weight for k, v in interests.items()}
        
        return interests
    
    def _get_preferred_channels(self, device_history: List[Dict], site_trends: Dict) -> List[Tuple[str, float]]:
        """获取偏好频道列表"""
        channel_weights = {}
        
        # 基于个人历史
        for behavior in device_history:
            channel = behavior["channel"]
            weight = behavior["view_count"] * 0.7  # 个人历史权重
            channel_weights[channel] = channel_weights.get(channel, 0) + weight
        
        # 基于站点趋势（冷启动）
        for channel, trend in site_trends.items():
            weight = trend["total_views"] * 0.3  # 站点趋势权重
            channel_weights[channel] = channel_weights.get(channel, 0) + weight
        
        # 排序并返回
        sorted_channels = sorted(channel_weights.items(), key=lambda x: x[1], reverse=True)
        return sorted_channels[:10]  # 返回前10个频道
    
    def _get_content_preferences(self, device_history: List[Dict]) -> Dict:
        """获取内容偏好"""
        preferences = {
            "preferred_dwell_time": 0,
            "preferred_content_type": "mixed",
            "engagement_level": "medium"
        }
        
        if device_history:
            avg_dwell = sum(b["avg_dwell"] for b in device_history) / len(device_history)
            preferences["preferred_dwell_time"] = avg_dwell
            
            # 根据停留时间判断内容偏好
            if avg_dwell > 30000:  # 30秒以上
                preferences["preferred_content_type"] = "long_form"
                preferences["engagement_level"] = "high"
            elif avg_dwell < 10000:  # 10秒以下
                preferences["preferred_content_type"] = "short_form"
                preferences["engagement_level"] = "low"
        
        return preferences
    
    def _get_recency_preference(self, device_history: List[Dict]) -> str:
        """获取时效性偏好"""
        if not device_history:
            return "balanced"
        
        # 分析最近查看内容的时间分布
        recent_views = [b for b in device_history if b["last_view"]]
        if not recent_views:
            return "balanced"
        
        # 如果用户经常查看最新内容，偏好时效性
        avg_recency = sum(b["last_view"].timestamp() for b in recent_views) / len(recent_views)
        current_time = time.time()
        hours_ago = (current_time - avg_recency) / 3600
        
        if hours_ago < 2:
            return "recent"
        elif hours_ago < 24:
            return "balanced"
        else:
            return "timeless"
    
    def _get_diversity_level(self, device_history: List[Dict]) -> str:
        """获取多样性偏好"""
        if not device_history:
            return "high"  # 新用户需要更多多样性
        
        unique_channels = len(set(b["channel"] for b in device_history))
        total_views = sum(b["view_count"] for b in device_history)
        
        diversity_ratio = unique_channels / total_views if total_views > 0 else 0
        
        if diversity_ratio > 0.3:
            return "high"
        elif diversity_ratio > 0.1:
            return "medium"
        else:
            return "low"
    
    def _calculate_confidence_score(self, device_history: List[Dict], session_behavior: List[Dict]) -> float:
        """计算推荐置信度"""
        confidence = 0.0
        
        # 基于历史数据量
        if device_history:
            confidence += min(len(device_history) / 10, 1.0) * 0.4
        
        # 基于会话活跃度
        if session_behavior:
            confidence += min(len(session_behavior) / 5, 1.0) * 0.6
        
        return min(confidence, 1.0)
    
    def get_active_channels(self, site_id: int) -> List[str]:
        """从数据库获取活跃频道列表"""
        try:
            # 获取该站点的活跃频道
            active_channels = Channel.objects.filter(
                sites__id=site_id,
                is_active=True
            ).values_list('slug', flat=True).order_by('order', 'name')
            
            channels_list = list(active_channels)
            
            # 如果该站点没有频道，尝试获取所有活跃频道
            if not channels_list:
                all_active_channels = Channel.objects.filter(
                    is_active=True
                ).values_list('slug', flat=True).order_by('order', 'name')
                channels_list = list(all_active_channels)
            
            return channels_list
        except Exception as e:
            # 记录错误日志
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to get active channels for site {site_id}: {e}")
            
            # 如果数据库查询失败，返回空列表
            return []
    
    def get_recommendation_strategy(self, profile: Dict, site) -> Dict:
        """根据用户画像获取推荐策略"""
        confidence = profile["confidence_score"]
        interests = profile["interests"]
        preferred_channels = profile["preferred_channels"]
        diversity_level = profile["diversity_level"]
        
        # 获取当前站点的所有活跃频道
        active_channels = self.get_active_channels(site.id)
        
        # 如果没有活跃频道，使用fallback策略
        if not active_channels:
            return {
                "type": "fallback",
                "channels": [],
                "weights": {},
                "diversity_boost": 0,
                "error": "No active channels available"
            }
        
        if confidence < 0.3:
            # 低置信度：使用冷启动策略，使用所有活跃频道
            strategy = {
                "type": "cold_start",
                "channels": active_channels,
                "weights": self._calculate_equal_weights(active_channels),
                "diversity_boost": 0.3
            }
        elif confidence < 0.7:
            # 中等置信度：混合策略，结合用户偏好和热门频道
            preferred_channel_names = [ch[0] for ch in preferred_channels[:5]]
            # 从活跃频道中选择热门频道作为补充
            popular_channels = [ch for ch in active_channels[:3] if ch not in preferred_channel_names]
            hybrid_channels = preferred_channel_names + popular_channels
            
            strategy = {
                "type": "hybrid",
                "channels": hybrid_channels,
                "weights": self._calculate_channel_weights(preferred_channels, interests),
                "diversity_boost": 0.2
            }
        else:
            # 高置信度：个性化策略
            strategy = {
                "type": "personalized",
                "channels": [ch[0] for ch in preferred_channels[:8]],
                "weights": self._calculate_channel_weights(preferred_channels, interests),
                "diversity_boost": 0.1 if diversity_level == "low" else 0.2
            }
        
        return strategy
    
    def _calculate_equal_weights(self, channels: List[str]) -> Dict[str, float]:
        """为频道列表计算平均权重"""
        if not channels:
            return {}
        
        weight_per_channel = 1.0 / len(channels)
        return {channel: weight_per_channel for channel in channels}
    
    def _calculate_channel_weights(self, preferred_channels: List[Tuple[str, float]], interests: Dict[str, float]) -> Dict[str, float]:
        """计算频道权重"""
        weights = {}
        
        # 基于偏好频道
        for channel, weight in preferred_channels:
            weights[channel] = weight
        
        # 基于兴趣标签
        for channel, interest in interests.items():
            weights[channel] = weights.get(channel, 0) + interest * 0.5
        
        # 归一化
        total_weight = sum(weights.values())
        if total_weight > 0:
            weights = {k: v / total_weight for k, v in weights.items()}
        
        return weights


def get_anonymous_recommendation_config(request, site: str) -> Dict:
    """获取匿名用户推荐配置"""
    engine = AnonymousRecommendationEngine()
    
    # 获取设备指纹和会话ID
    device_id = engine.get_device_fingerprint(request)
    session_id = engine.get_session_id(request)
    
    # 获取用户画像
    profile = engine.get_anonymous_user_profile(device_id, session_id, site)
    
    # 获取推荐策略 - 需要将site字符串转换为Site对象
    from wagtail.models import Site
    try:
        site_obj = Site.objects.filter(hostname=site).first()
        if not site_obj:
            site_obj = Site.objects.get(is_default_site=True)
    except Exception:
        site_obj = Site.objects.get(is_default_site=True)
    
    strategy = engine.get_recommendation_strategy(profile, site_obj)
    
    return {
        "profile": profile,
        "strategy": strategy,
        "device_id": device_id,
        "session_id": session_id
    }
