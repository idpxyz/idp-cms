"""
频道相关API端点

包含频道列表和频道推荐文章的API实现
"""

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from apps.news.models import ArticlePage
from apps.core.models import Channel
from ..utils import (
    validate_site_parameter,
    apply_field_filtering,
    apply_include_expansion,
    generate_etag
)
from ..utils.rate_limit import CHANNELS_RATE_LIMIT
from ..utils.cache_performance import monitor_cache_performance
from .common import (
    build_recommendation_queryset,
    serialize_article_for_recommendation,
    build_recommendation_response
)


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
                # 🎨 模板信息
                "template": {
                    "id": channel.template.id if channel.template else None,
                    "name": channel.template.name if channel.template else None,
                    "slug": channel.template.slug if channel.template else None,
                    "file_name": channel.template.file_name if channel.template else None,
                } if channel.template else None,
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


@api_view(["GET"])
def channel_recommendations(request):
    """
    频道内推荐文章接口
    
    专门为频道页面提供推荐内容，使用智能算法推荐同频道内的优质文章
    
    支持参数：
    - site: 站点标识（主机名或site_id）
    - channel: 频道slug（必需）
    - size: 返回数量，默认10，最大50
    - exclude_id: 排除的文章ID（通常是当前正在阅读的文章）
    - fields: 字段白名单选择
    - include: 关联展开
    
    推荐策略：
    1. 同频道热门文章（基于CTR、浏览量）
    2. 同频道最新文章（时效性）
    3. 高质量文章（编辑精选、高权重）
    4. 相关主题文章（基于标签）
    """
    try:
        # 1. 验证站点参数
        site = validate_site_parameter(request)
        if not site:
            return Response(
                {"error": "Invalid or missing site parameter"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 2. 验证频道参数
        channel_slug = request.query_params.get("channel")
        if not channel_slug:
            return Response(
                {"error": "Missing required parameter: channel"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 3. 获取查询参数
        fields = request.query_params.get("fields", "").split(",") if request.query_params.get("fields") else []
        includes = request.query_params.get("include", "").split(",") if request.query_params.get("include") else []
        size = min(int(request.query_params.get("size", 10)), 50)  # 限制最大50条
        exclude_id = request.query_params.get("exclude_id")
        
        # 4. 验证频道是否存在
        try:
            channel = Channel.objects.get(slug=channel_slug, sites=site)
        except Channel.DoesNotExist:
            return Response(
                {"error": f"Channel '{channel_slug}' not found for this site"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # 5. 构建智能推荐查询
        # 基础查询：同频道的已发布文章
        base_queryset = ArticlePage.objects.live().filter(
            path__startswith=site.root_page.path,
            channel=channel
        )
        
        # 6. 使用共同的推荐查询构建器
        queryset = build_recommendation_queryset(base_queryset, exclude_id)
        
        # 7. 限制结果数量
        articles = queryset[:size]
        
        # 8. 序列化数据 - 使用共同的序列化函数
        serialized_articles = [
            serialize_article_for_recommendation(article)
            for article in articles
        ]
        
        # 9. 应用字段过滤
        if fields:
            serialized_articles = [
                apply_field_filtering(article_data, fields) 
                for article_data in serialized_articles
            ]
        
        # 10. 应用关联展开
        if includes:
            serialized_articles = [
                apply_include_expansion(article_data, includes)
                for article_data in serialized_articles
            ]
        
        # 11. 构建响应 - 使用共同的响应构建器
        response_data = build_recommendation_response(
            serialized_articles, site, channel, size, "smart_channel_recommendation_v1"
        )
        
        # 12. 设置响应头
        response = Response(response_data, status=status.HTTP_200_OK)
        
        # Cache-Control：频道推荐缓存较短，保证内容新鲜
        response["Cache-Control"] = "public, s-maxage=300, stale-while-revalidate=150"
        
        # ETag
        etag = generate_etag(response_data)
        response["ETag"] = f'"{etag}"'
        
        # Surrogate-Key
        surrogate_keys = [
            f"site:{site.hostname}", 
            f"channel:{channel.slug}",
            "recommendations"
        ]
        response["Surrogate-Key"] = " ".join(surrogate_keys)
        
        return response
        
    except Exception as e:
        return Response(
            {"error": f"Internal server error: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
