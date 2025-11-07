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
        
        # 获取所有可用频道（包含template信息）
        try:
            # 通过hostname查找，使用select_related预加载template
            channels_qs = Channel.objects.filter(
                sites__hostname=site,
                is_active=True
            ).select_related('template').order_by('order')
            
            # 手动序列化，包含template信息
            all_channels = [
                {
                    'id': channel.id,
                    'name': channel.name,
                    'slug': channel.slug,
                    'order': channel.order,
                    'show_in_homepage': channel.show_in_homepage,
                    'homepage_order': channel.homepage_order,
                    # 🎨 添加模板信息
                    'template': {
                        'id': channel.template.id if channel.template else None,
                        'name': channel.template.name if channel.template else None,
                        'slug': channel.template.slug if channel.template else None,
                        'file_name': channel.template.file_name if channel.template else None,
                    } if channel.template else None,
                }
                for channel in channels_qs
            ]
            
            # 🚫 移除降级到默认站点的逻辑，避免显示不属于当前站点的频道
            if not all_channels:
                logger.warning(f"站点 {site} 没有关联任何频道，请在Django后台为该站点配置频道")
                    
        except Exception as channel_error:
            logger.error(f"频道查询失败: {channel_error}")
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
        
        # 🚫 移除降级策略，完全由后台控制
        return JsonResponse({
            "channels": [],
            "strategy": "error",
            "confidence": 0.0,
            "error": "频道数据获取失败，请联系管理员在后台配置频道数据",
            "debug": {
                "error_detail": str(e),
                "message": "系统不提供默认频道，需要管理员在Django后台配置"
            }
        }, status=500)


def _sort_channels_by_strategy(channels, strategy, profile):
    """根据策略对频道进行排序"""
    strategy_type = strategy.get("type", "personalized")
    channel_weights = strategy.get("weights", {})
    recommended_channels = strategy.get("channels", [])
    
    # 创建频道slug到频道对象的映射
    channel_map = {ch["slug"]: ch for ch in channels}
    
    if strategy_type == "cold_start":
        # 冷启动：使用默认顺序，但根据站点热度分配权重
        result = []
        total_channels = len(channels) + 1  # +1 for recommend channel
        
        # 为不同频道分配不同权重（基于一般用户偏好）
        for i, channel in enumerate(channels):
            # 前面的频道权重稍高，但差异不大
            base_weight = 0.8 / len(channels)  # 为普通频道分配80%的权重
            position_bonus = max(0.02 - i * 0.005, 0)  # 前面的频道有位置加成
            channel_weight = base_weight + position_bonus
            
            result.append({
                **channel,
                "weight": channel_weight,
                "reason": f"冷启动推荐 (位置: {i+1})"
            })
        
        # 添加推荐频道到最前面，分配较高权重
        result.insert(0, {
            "id": "recommend",
            "name": "推荐", 
            "slug": "recommend",
            "weight": 0.2,  # 为推荐频道分配20%权重
            "reason": "系统推荐频道"
        })
        
        # 归一化权重
        total_weight = sum(ch["weight"] for ch in result)
        if total_weight > 0:
            for ch in result:
                ch["weight"] = ch["weight"] / total_weight
        
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
        
        # 计算推荐频道的权重总和
        recommended_weight_sum = sum(channel_weights.get(slug, 0) for slug in sorted_recommended if slug in channel_map)
        total_channels = len(channels) + 1  # +1 for recommend channel
        
        # 为推荐频道分配权重，确保它们有明显的差异
        for i, slug in enumerate(sorted_recommended):
            if slug in channel_map:
                channel = channel_map[slug]
                # 推荐频道权重递减，但保持在较高水平
                original_weight = channel_weights.get(slug, 0.1)
                adjusted_weight = max(0.15 - i * 0.03, 0.05)  # 从15%开始，每个递减3%，最低5%
                
                result.append({
                    **channel,
                    "weight": adjusted_weight,
                    "reason": f"基于{strategy_type}推荐 (原权重: {original_weight:.3f})"
                })
                added_slugs.add(slug)
        
        # 2. 计算剩余权重为其他频道分配
        used_weight = sum(ch["weight"] for ch in result)
        remaining_weight = max(0.6 - used_weight, 0.2)  # 为其他频道保留至少20%的权重
        other_channels = [ch for ch in channels if ch["slug"] not in added_slugs]
        
        if other_channels:
            weight_per_other = remaining_weight / len(other_channels)
            for channel in other_channels:
                result.append({
                    **channel,
                    "weight": weight_per_other,
                    "reason": "补充频道"
                })
        
        # 3. 添加推荐频道到最前面（如果不存在）
        recommend_exists = any(ch.get("slug") == "recommend" for ch in result)
        if not recommend_exists:
            result.insert(0, {
                "id": "recommend",
                "name": "推荐", 
                "slug": "recommend",
                "weight": 0.25,  # 最高权重，确保排在前面
                "reason": "系统推荐频道"
            })
        
        # 4. 重新归一化权重，确保总和为1
        total_weight = sum(ch["weight"] for ch in result)
        if total_weight > 0:
            for ch in result:
                ch["weight"] = ch["weight"] / total_weight
        
        return result
    
    else:
        # 降级策略：返回原顺序，但使用差异化权重
        result = []
        
        # 为普通频道分配权重，前面的稍高
        for i, channel in enumerate(channels):
            base_weight = 0.75 / len(channels)  # 为普通频道分配75%权重
            position_bonus = max(0.03 - i * 0.008, 0)  # 位置加成
            channel_weight = base_weight + position_bonus
            
            result.append({
                **channel,
                "weight": channel_weight,
                "reason": f"降级策略 (位置: {i+1})"
            })
        
        # 添加推荐频道到最前面，分配较高权重
        result.insert(0, {
            "id": "recommend",
            "name": "推荐", 
            "slug": "recommend",
            "weight": 0.25,  # 为推荐频道分配25%权重
            "reason": "系统推荐频道"
        })
        
        # 归一化权重
        total_weight = sum(ch["weight"] for ch in result)
        if total_weight > 0:
            for ch in result:
                ch["weight"] = ch["weight"] / total_weight
        
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
