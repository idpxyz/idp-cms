"""
频道相关API端点

包含频道列表和频道推荐功能
"""

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from apps.core.models import Channel
from ..utils import (
    validate_site_parameter,
    apply_field_filtering,
    generate_etag
)
from ...utils.rate_limit import CHANNELS_RATE_LIMIT
from ...utils.cache_performance import monitor_cache_performance


@api_view(["GET"])
@CHANNELS_RATE_LIMIT
@monitor_cache_performance("channels_list")
def channels_list(request):
    """
    获取频道列表
    
    支持参数：
    - site: 站点标识（主机名或site_id）
    - fields: 字段白名单选择
    """
    try:
        # 1. 验证站点参数
        site = validate_site_parameter(request)
        if not site:
            return Response(
                {"error": "Invalid or missing site parameter"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 2. 获取查询参数
        fields = request.query_params.get("fields", "").split(",") if request.query_params.get("fields") else []
        
        # 3. 查询频道 - 性能优化版本
        channels = Channel.objects.filter(sites=site).select_related().order_by('order', 'name')
        
        # 4. 序列化数据 - 批量处理
        serialized_channels = [
            {
                "id": channel.id,
                "slug": channel.slug,
                "name": channel.name,
                "order": getattr(channel, 'order', 0),
                # 🆕 首页显示配置字段
                "show_in_homepage": getattr(channel, 'show_in_homepage', True),
                "homepage_order": getattr(channel, 'homepage_order', 0),
            }
            for channel in channels
        ]
        
        # 应用字段过滤
        if fields:
            serialized_channels = [
                apply_field_filtering(channel_data, fields) 
                for channel_data in serialized_channels
            ]
        
        # 5. 构建响应
        response_data = {
            "channels": serialized_channels,
            "meta": {
                "site": site.hostname,
                "site_id": site.id,
                "total": len(serialized_channels)
            }
        }
        
        # 6. 生成缓存相关头部
        response = Response(response_data)
        
        # Cache-Control
        response["Cache-Control"] = "public, s-maxage=300, stale-while-revalidate=60"
        
        # ETag
        etag = generate_etag(response_data)
        response["ETag"] = f'"{etag}"'
        
        # Surrogate-Key
        surrogate_keys = [f"site:{site.hostname}", "channels:all"]
        response["Surrogate-Key"] = " ".join(surrogate_keys)
        
        return response
        
    except Exception as e:
        return Response(
            {"error": f"Internal server error: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# 🆕 预留推荐功能 - 后续实现
# @api_view(["GET"])
# def channel_recommendations(request):
#     """
#     频道内推荐文章接口
#     
#     专门为频道页面提供推荐内容，使用智能算法推荐同频道内的优质文章
#     """
#     pass
