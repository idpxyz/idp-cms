"""
地区相关API端点

包含地区列表的API实现
"""

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from apps.core.models import Region
from ..utils import (
    validate_site_parameter,
    apply_field_filtering,
    generate_etag
)


@api_view(["GET"])
def regions_list(request):
    """
    获取地区列表
    
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
        
        # 3. 查询地区
        regions = Region.objects.filter(sites=site).order_by('order', 'name')
        
        # 4. 序列化数据
        serialized_regions = []
        for region in regions:
            region_data = {
                "id": region.id,
                "slug": region.slug,
                "name": region.name,
                "order": getattr(region, 'order', 0)
            }
            
            # 应用字段过滤
            if fields:
                region_data = apply_field_filtering(region_data, fields)
            
            serialized_regions.append(region_data)
        
        # 5. 构建响应
        response_data = {
            "regions": serialized_regions,
            "meta": {
                "site": site.hostname,
                "site_id": site.id,
                "total": len(serialized_regions)
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
        surrogate_keys = [f"site:{site.hostname}", "regions:all"]
        response["Surrogate-Key"] = " ".join(surrogate_keys)
        
        return response
        
    except Exception as e:
        return Response(
            {"error": f"Internal server error: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
