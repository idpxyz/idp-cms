"""
个性化频道排序API
基于用户兴趣推断对频道进行个性化排序
"""

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.cache import cache_page
from apps.core.site_utils import get_site_from_request
from .anonymous_recommendation import get_anonymous_recommendation_config
from apps.core.models import Channel
import logging

logger = logging.getLogger(__name__)

@require_http_methods(["GET"])
@cache_page(60 * 5)  # 缓存5分钟
def personalized_channels(request):
    """
    获取个性化排序的频道列表
    
    返回格式:
    {
        "channels": [
            {"id": "tech", "name": "科技", "slug": "tech", "weight": 0.35},
            {"id": "sports", "name": "体育", "slug": "sports", "weight": 0.25}
        ],
        "strategy": "personalized|hybrid|cold_start",
        "confidence": 0.85
    }
    """
    try:
        site = get_site_from_request(request)
        
        # 获取用户推荐配置（包含兴趣分析）
        rec_config = get_anonymous_recommendation_config(request, site)
        
        strategy = rec_config.get("strategy", {})
        profile = rec_config.get("profile", {})
        
        # 获取所有可用频道
        try:
            # 首先尝试通过hostname查找
            all_channels = list(Channel.objects.filter(
                sites__hostname=site,
                is_active=True
            ).values('id', 'name', 'slug', 'order').order_by('order'))
            
            # 如果没有找到，尝试使用默认站点
            if not all_channels:
                from wagtail.models import Site as WagtailSite
                default_site = WagtailSite.objects.filter(is_default_site=True).first()
                if default_site:
                    all_channels = list(Channel.objects.filter(
                        sites__id=default_site.id,
                        is_active=True
                    ).values('id', 'name', 'slug', 'order').order_by('order'))
                    
        except Exception as channel_error:
            logger.warning(f"频道查询失败: {channel_error}")
            all_channels = []
        
        # 根据策略类型进行个性化排序
        personalized_channels_list = _sort_channels_by_strategy(
            all_channels, strategy, profile
        )
        
        return JsonResponse({
            "channels": personalized_channels_list,
            "strategy": strategy.get("type", "fallback"),
            "confidence": profile.get("confidence_score", 0.0),
            "interests": profile.get("interests", {}),
            "debug": {
                "total_channels": len(all_channels),
                "personalized_count": len(personalized_channels_list),
                "strategy_details": strategy
            }
        })
        
    except Exception as e:
        logger.error(f"个性化频道获取失败: {e}")
        
        # 降级策略：返回默认频道顺序
        try:
            fallback_site = get_site_from_request(request)
            fallback_channels = list(Channel.objects.filter(
                sites__hostname=fallback_site,
                is_active=True
            ).values('id', 'name', 'slug', 'order').order_by('order'))
            
            # 如果没有找到，使用默认站点
            if not fallback_channels:
                from wagtail.models import Site as WagtailSite
                default_site = WagtailSite.objects.filter(is_default_site=True).first()
                if default_site:
                    fallback_channels = list(Channel.objects.filter(
                        sites__id=default_site.id,
                        is_active=True
                    ).values('id', 'name', 'slug', 'order').order_by('order'))
        except:
            # 最终降级：硬编码基本频道
            fallback_channels = [
                {"id": "recommend", "name": "推荐", "slug": "recommend", "order": 0},
                {"id": "tech", "name": "科技", "slug": "tech", "order": 1},
                {"id": "sports", "name": "体育", "slug": "sports", "order": 2},
            ]
        
        return JsonResponse({
            "channels": [
                {**ch, "weight": 1.0 / len(fallback_channels)} 
                for ch in fallback_channels
            ],
            "strategy": "fallback",
            "confidence": 0.0,
            "error": str(e)
        })


def _sort_channels_by_strategy(channels, strategy, profile):
    """根据策略对频道进行排序"""
    strategy_type = strategy.get("type", "fallback")
    channel_weights = strategy.get("weights", {})
    recommended_channels = strategy.get("channels", [])
    
    # 创建频道slug到频道对象的映射
    channel_map = {ch["slug"]: ch for ch in channels}
    
    if strategy_type == "cold_start":
        # 冷启动：使用默认顺序，但添加权重
        result = []
        for channel in channels:
            result.append({
                **channel,
                "weight": channel_weights.get(channel["slug"], 1.0 / (len(channels) + 1)),
                "reason": "冷启动推荐"
            })
        
        # 添加推荐频道到最前面
        result.insert(0, {
            "id": "recommend",
            "name": "推荐", 
            "slug": "recommend",
            "weight": 1.0 / (len(channels) + 1),
            "reason": "系统推荐频道"
        })
        
        return result
        
    elif strategy_type in ["hybrid", "personalized"]:
        # 个性化/混合：优先显示推荐频道
        result = []
        added_slugs = set()
        
        # 1. 先添加推荐频道（按权重排序）
        sorted_recommended = sorted(
            recommended_channels,
            key=lambda slug: channel_weights.get(slug, 0),
            reverse=True
        )
        
        for slug in sorted_recommended:
            if slug in channel_map:
                channel = channel_map[slug]
                result.append({
                    **channel,
                    "weight": channel_weights.get(slug, 0.1),
                    "reason": f"基于{strategy_type}推荐"
                })
                added_slugs.add(slug)
        
        # 2. 再添加其他频道（保持原顺序，但权重较低）
        for channel in channels:
            if channel["slug"] not in added_slugs:
                result.append({
                    **channel,
                    "weight": 0.05,  # 较低权重
                    "reason": "补充频道"
                })
        
        # 3. 添加推荐频道到最前面（如果不存在）
        recommend_exists = any(ch.get("slug") == "recommend" for ch in result)
        if not recommend_exists:
            result.insert(0, {
                "id": "recommend",
                "name": "推荐", 
                "slug": "recommend",
                "weight": 0.2,  # 较高权重，确保排在前面
                "reason": "系统推荐频道"
            })
        
        return result
    
    else:
        # 降级策略：返回原顺序，并添加推荐频道
        result = [
            {**ch, "weight": 1.0 / (len(channels) + 1), "reason": "默认顺序"}
            for ch in channels
        ]
        
        # 添加推荐频道到最前面
        result.insert(0, {
            "id": "recommend",
            "name": "推荐", 
            "slug": "recommend",
            "weight": 1.0 / (len(channels) + 1),
            "reason": "系统推荐频道"
        })
        
        return result


def get_user_channel_preferences(request, site):
    """获取用户频道偏好（调试用）"""
    try:
        rec_config = get_anonymous_recommendation_config(request, site)
        return JsonResponse({
            "profile": rec_config.get("profile", {}),
            "strategy": rec_config.get("strategy", {}),
            "timestamp": rec_config.get("timestamp")
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)
