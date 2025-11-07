"""
现代化缓存系统 - 全新设计
为党报头条项目打造的科学、高效、可扩展的缓存架构
"""

import time
import hashlib
import json
from enum import Enum
from dataclasses import dataclass
from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timedelta
from django.core.cache import cache
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class ContentType(Enum):
    """内容类型枚举"""
    BREAKING = "breaking"      # 突发新闻
    HOT = "hot"               # 热点新闻  
    TRENDING = "trending"     #趋势新闻
    NORMAL = "normal"         # 普通新闻
    RECOMMEND = "recommend"   # 推荐内容


class CacheLayer(Enum):
    """缓存层级枚举"""
    COMPONENT = "component"   # 前端组件缓存
    NEXTJS = "nextjs"        # Next.js应用缓存
    GATEWAY = "gateway"      # API网关缓存
    BACKEND = "backend"      # Django后端缓存
    CDN = "cdn"             # CDN缓存


@dataclass
class CacheTiming:
    """缓存时间配置"""
    component: int
    nextjs: int
    gateway: int
    backend: int
    cdn: int
    
    def get_time(self, layer: CacheLayer) -> int:
        return getattr(self, layer.value)


class ModernCacheStrategy:
    """现代化缓存策略"""
    
    # 科学的缓存时间配置（秒）
    TIMING_CONFIG = {
        ContentType.BREAKING: CacheTiming(
            component=0,    # 实时
            nextjs=5,       # 5秒
            gateway=10,     # 10秒
            backend=0,      # 实时
            cdn=15          # 15秒
        ),
        ContentType.HOT: CacheTiming(
            component=5,    # 5秒
            nextjs=10,      # 10秒
            gateway=20,     # 20秒
            backend=10,     # 10秒
            cdn=30          # 30秒
        ),
        ContentType.TRENDING: CacheTiming(
            component=10,   # 10秒
            nextjs=15,      # 15秒
            gateway=30,     # 30秒
            backend=20,     # 20秒
            cdn=60          # 1分钟
        ),
        ContentType.NORMAL: CacheTiming(
            component=15,   # 15秒
            nextjs=30,      # 30秒
            gateway=60,     # 1分钟
            backend=30,     # 30秒
            cdn=120         # 2分钟
        ),
        ContentType.RECOMMEND: CacheTiming(
            component=30,   # 30秒
            nextjs=60,      # 1分钟
            gateway=120,    # 2分钟
            backend=60,     # 1分钟
            cdn=300         # 5分钟
        )
    }
    
    @classmethod
    def detect_content_type(cls, request_data: Dict[str, Any]) -> ContentType:
        """
        智能检测内容类型
        """
        diversity = request_data.get('diversity', 'high')
        hours = int(request_data.get('hours', 24))
        channels = request_data.get('channels', [])
        
        # 检查突发新闻
        if 'breaking' in channels or hours <= 1:
            return ContentType.BREAKING
        
        # 检查热点新闻  
        if diversity == 'high' and hours <= 6:
            return ContentType.HOT
        
        # 检查趋势新闻
        if 'trending' in channels or 'hot' in channels:
            return ContentType.TRENDING
        
        # 检查推荐内容
        if 'recommend' in channels or diversity == 'low':
            return ContentType.RECOMMEND
        
        return ContentType.NORMAL
    
    @classmethod
    def get_cache_time(cls, content_type: ContentType, layer: CacheLayer) -> int:
        """获取指定层级的缓存时间"""
        timing = cls.TIMING_CONFIG[content_type]
        base_time = timing.get_time(layer)
        
        # 根据当前时间动态调整
        return cls._adjust_for_time_of_day(base_time, content_type)
    
    @classmethod
    def _adjust_for_time_of_day(cls, base_time: int, content_type: ContentType) -> int:
        """根据时段动态调整缓存时间"""
        current_hour = datetime.now().hour
        
        # 新闻高峰期（6-9点，18-22点）缩短缓存
        if current_hour in [6, 7, 8, 18, 19, 20, 21, 22]:
            if content_type in [ContentType.BREAKING, ContentType.HOT]:
                return max(base_time // 2, 1)  # 最少1秒
            return max(base_time // 1.5, 5)   # 最少5秒
        
        # 深夜时段（0-5点）可以适当延长
        elif current_hour in [0, 1, 2, 3, 4, 5]:
            if content_type == ContentType.RECOMMEND:
                return min(base_time * 1.5, 600)  # 最多10分钟
            return min(base_time * 1.2, 300)      # 最多5分钟
        
        return base_time


class SmartCacheKey:
    """智能缓存Key生成器"""
    
    VERSION = "v3"  # 新版本缓存
    
    @classmethod
    def generate(cls, 
                 content_type: ContentType,
                 layer: CacheLayer,
                 site: str,
                 params: Dict[str, Any],
                 user_id: Optional[str] = None) -> str:
        """
        生成智能缓存Key
        """
        # 基础参数标准化
        param_parts = [
            f"h{params.get('hours', 24)}",
            f"d{params.get('diversity', 'high')}",
            f"s{params.get('size', 9)}",
            f"r{params.get('region', '')}" if params.get('region') else "",
            f"l{params.get('lang', '')}" if params.get('lang') else "",
        ]
        param_str = "_".join(filter(None, param_parts))
        
        # 频道参数
        channels = params.get('channels', [])
        channel_str = "_".join(sorted(channels)) if channels else "default"
        
        # 构建基础key
        base_parts = [
            "headlines",
            cls.VERSION,
            content_type.value,
            layer.value,
            site,
            param_str,
            channel_str
        ]
        
        # 个性化标识
        if user_id:
            user_hash = hashlib.md5(user_id.encode()).hexdigest()[:8]
            base_parts.append(f"u{user_hash}")
        
        return ":".join(base_parts)
    
    @classmethod
    def get_pattern_for_invalidation(cls, content_type: ContentType, site: str) -> str:
        """获取失效模式"""
        return f"headlines:{cls.VERSION}:{content_type.value}:*:{site}:*"


class CacheHeaders:
    """缓存响应头生成器"""
    
    @classmethod
    def generate_control_header(cls, content_type: ContentType) -> str:
        """生成Cache-Control头"""
        timing = ModernCacheStrategy.TIMING_CONFIG[content_type]
        
        if content_type == ContentType.BREAKING:
            return f"public, max-age={timing.gateway}, must-revalidate"
        elif content_type == ContentType.HOT:
            return f"public, max-age={timing.gateway}, stale-while-revalidate={timing.cdn}"
        else:
            return f"public, max-age={timing.gateway}, stale-while-revalidate={timing.cdn}, stale-if-error=300"
    
    @classmethod
    def generate_response_headers(cls, content_type: ContentType) -> Dict[str, str]:
        """生成完整响应头"""
        timing = ModernCacheStrategy.TIMING_CONFIG[content_type]
        
        return {
            'Cache-Control': cls.generate_control_header(content_type),
            'X-Content-Type': content_type.value,
            'X-Cache-TTL': str(timing.backend),
            'X-Gateway-TTL': str(timing.gateway),
            'X-CDN-TTL': str(timing.cdn),
            'Vary': 'X-Session-ID',
            'X-Cache-Strategy': 'modern-v3'
        }


class BreakingNewsDetector:
    """突发新闻检测器"""
    
    BREAKING_KEYWORDS = [
        '突发', '紧急', '最新', '快讯', '直播', '实时',
        '重大', '紧急通知', '重要消息', '第一时间'
    ]
    
    @classmethod
    def detect(cls, articles: List[Dict[str, Any]]) -> bool:
        """检测是否包含突发新闻"""
        if not articles:
            return False
        
        for article in articles:
            # 检查明确标记
            if article.get('is_breaking') or article.get('is_live'):
                return True
            
            # 检查标题关键词
            title = article.get('title', '').lower()
            if any(keyword in title for keyword in cls.BREAKING_KEYWORDS):
                return True
            
            # 检查发布时间（最近10分钟的内容）
            try:
                publish_time = article.get('publish_at') or article.get('publish_time')
                if publish_time:
                    if isinstance(publish_time, str):
                        publish_dt = datetime.fromisoformat(publish_time.replace('Z', '+00:00'))
                    else:
                        publish_dt = publish_time
                    
                    if datetime.now() - publish_dt.replace(tzinfo=None) < timedelta(minutes=10):
                        return True
            except:
                pass
        
        return False


class ModernCacheManager:
    """现代化缓存管理器"""
    
    @classmethod
    def get(cls, key: str) -> Optional[Any]:
        """获取缓存"""
        try:
            result = cache.get(key)
            if result:
                logger.debug(f"Cache HIT: {key}")
            return result
        except Exception as e:
            logger.error(f"Cache GET error: {e}")
            return None
    
    @classmethod
    def set(cls, key: str, value: Any, timeout: int, content_type: ContentType) -> bool:
        """设置缓存"""
        try:
            if timeout <= 0:
                logger.debug(f"Cache SKIP: {key} (TTL: {timeout}s, Type: {content_type.value})")
                return False
            
            cache.set(key, value, timeout)
            logger.info(f"Cache SET: {key} (TTL: {timeout}s, Type: {content_type.value})")
            return True
        except Exception as e:
            logger.error(f"Cache SET error: {e}")
            return False
    
    @classmethod
    def invalidate_pattern(cls, pattern: str) -> int:
        """按模式失效缓存"""
        try:
            if hasattr(cache, 'delete_pattern'):
                count = cache.delete_pattern(pattern)
                logger.info(f"Cache INVALIDATE: {pattern} ({count} keys)")
                return count
            else:
                logger.warning("Cache backend doesn't support pattern deletion")
                return 0
        except Exception as e:
            logger.error(f"Cache INVALIDATE error: {e}")
            return 0
    
    @classmethod
    def get_stats(cls) -> Dict[str, Any]:
        """获取缓存统计"""
        try:
            if hasattr(cache, 'get_stats'):
                return cache.get_stats()
            return {"message": "Stats not available"}
        except Exception as e:
            logger.error(f"Cache STATS error: {e}")
            return {"error": str(e)}


# 便捷函数
def get_cache_time(content_type: Union[str, ContentType], layer: Union[str, CacheLayer]) -> int:
    """获取缓存时间（便捷函数）"""
    if isinstance(content_type, str):
        content_type = ContentType(content_type)
    if isinstance(layer, str):
        layer = CacheLayer(layer)
    
    return ModernCacheStrategy.get_cache_time(content_type, layer)


def generate_cache_key(content_type: Union[str, ContentType], 
                      layer: Union[str, CacheLayer],
                      site: str, 
                      params: Dict[str, Any], 
                      user_id: Optional[str] = None) -> str:
    """生成缓存Key（便捷函数）"""
    if isinstance(content_type, str):
        content_type = ContentType(content_type)
    if isinstance(layer, str):
        layer = CacheLayer(layer)
    
    return SmartCacheKey.generate(content_type, layer, site, params, user_id)


def should_cache(content_type: Union[str, ContentType], layer: Union[str, CacheLayer]) -> bool:
    """判断是否应该缓存（便捷函数）"""
    cache_time = get_cache_time(content_type, layer)
    return cache_time > 0
