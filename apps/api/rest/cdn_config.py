"""
CDN配置管理REST API

提供CDN配置的查询、管理、缓存清除等功能
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone

from apps.core.models import SiteCDNConfig, CDNProvider
from apps.core.cdn.manager import CDNManager
from ..utils.rate_limit import CDN_CONFIG_RATE_LIMIT


@api_view(["GET"])
@CDN_CONFIG_RATE_LIMIT
def get_site_cdn_config(request):
    """获取站点CDN配置"""
    try:
        site_hostname = request.query_params.get('site')
        if not site_hostname:
            return Response(
                {"error": "Missing site parameter"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 获取站点CDN配置
        cdn_config = get_object_or_404(
            SiteCDNConfig.objects.select_related('site', 'cdn_provider'),
            site__hostname=site_hostname,
            is_active=True
        )
        
        config_data = {
            "site": cdn_config.site.hostname,
            "site_name": cdn_config.site.site_name,
            "cdn_provider": {
                "name": cdn_config.cdn_provider.name,
                "type": cdn_config.cdn_provider.provider_type,
                "domain": cdn_config.cdn_domain,
            },
            "cache_strategy": cdn_config.cache_strategy,
            "ssl_enabled": cdn_config.cdn_ssl_enabled,
            "regions": [r.name for r in cdn_config.regions.all()],
            "custom_config": cdn_config.custom_config,
            "is_active": cdn_config.is_active,
            "last_cache_purge": cdn_config.last_cache_purge.isoformat() if cdn_config.last_cache_purge else None,
            "cache_hit_rate": cdn_config.cache_hit_rate,
            "created_at": cdn_config.created_at.isoformat(),
            "updated_at": cdn_config.updated_at.isoformat(),
        }
        
        return Response(config_data)
        
    except SiteCDNConfig.DoesNotExist:
        return Response(
            {"error": "CDN configuration not found for site"}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {"error": f"Internal server error: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["POST"])
@CDN_CONFIG_RATE_LIMIT
@permission_classes([IsAuthenticated])
def purge_site_cache(request):
    """清除站点CDN缓存"""
    try:
        site_hostname = request.data.get('site')
        urls = request.data.get('urls', [])
        
        if not site_hostname or not urls:
            return Response(
                {"error": "Missing site or urls parameter"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 使用CDN管理器清除缓存
        cdn_manager = CDNManager()
        result = cdn_manager.purge_site_cache(site_hostname, urls)
        
        if result['success']:
            return Response(result)
        else:
            return Response(
                result, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    except Exception as e:
        return Response(
            {"error": f"Cache purge failed: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["GET"])
@CDN_CONFIG_RATE_LIMIT
def get_site_cdn_health(request):
    """获取站点CDN健康状态"""
    try:
        site_hostname = request.query_params.get('site')
        if not site_hostname:
            return Response(
                {"error": "Missing site parameter"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 使用CDN管理器获取健康状态
        cdn_manager = CDNManager()
        health_status = cdn_manager.get_site_health_status(site_hostname)
        
        return Response(health_status)
        
    except Exception as e:
        return Response(
            {"error": f"Failed to get health status: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["GET"])
@CDN_CONFIG_RATE_LIMIT
def get_site_cdn_metrics(request):
    """获取站点CDN性能指标"""
    try:
        site_hostname = request.query_params.get('site')
        if not site_hostname:
            return Response(
                {"error": "Missing site parameter"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 使用CDN管理器获取性能指标
        cdn_manager = CDNManager()
        metrics = cdn_manager.get_site_performance_metrics(site_hostname)
        
        return Response(metrics)
        
    except Exception as e:
        return Response(
            {"error": f"Failed to get performance metrics: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["GET"])
@CDN_CONFIG_RATE_LIMIT
def get_all_cdn_status(request):
    """获取所有站点的CDN状态"""
    try:
        # 使用CDN管理器获取所有状态
        cdn_manager = CDNManager()
        all_status = cdn_manager.get_all_sites_cdn_status()
        
        return Response({
            "success": True,
            "sites_count": len(all_status),
            "sites": all_status,
            "timestamp": timezone.now().isoformat()
        })
        
    except Exception as e:
        return Response(
            {"error": f"Failed to get all CDN status: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["POST"])
@CDN_CONFIG_RATE_LIMIT
@permission_classes([IsAuthenticated])
def validate_cdn_config(request):
    """验证站点CDN配置"""
    try:
        site_hostname = request.data.get('site')
        if not site_hostname:
            return Response(
                {"error": "Missing site parameter"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 使用CDN管理器验证配置
        cdn_manager = CDNManager()
        validation_result = cdn_manager.validate_cdn_config(site_hostname)
        
        return Response(validation_result)
        
    except Exception as e:
        return Response(
            {"error": f"Failed to validate CDN config: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["GET"])
@CDN_CONFIG_RATE_LIMIT
def get_cdn_providers(request):
    """获取所有CDN服务提供商"""
    try:
        providers = CDNProvider.objects.filter(is_active=True).values(
            'id', 'name', 'provider_type', 'endpoint_url', 'created_at'
        )
        
        return Response({
            "success": True,
            "providers": list(providers),
            "count": len(providers)
        })
        
    except Exception as e:
        return Response(
            {"error": f"Failed to get CDN providers: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["GET"])
@CDN_CONFIG_RATE_LIMIT
def get_supported_cdn_types(request):
    """获取支持的CDN类型"""
    try:
        from apps.core.cdn.factory import CDNFactory
        
        supported_types = CDNFactory.get_supported_providers()
        
        return Response({
            "success": True,
            "supported_types": supported_types,
            "count": len(supported_types)
        })
        
    except Exception as e:
        return Response(
            {"error": f"Failed to get supported CDN types: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
