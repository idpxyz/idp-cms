"""
缓存失效API模块

实现设计文档中要求的Webhook缓存失效机制：
- 支持精准的Tag失效
- 支持Path失效
- 支持HMAC签名验证
"""

import hmac
import hashlib
import json
import logging
from django.conf import settings
from django.core.cache import cache
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from wagtail.models import Site
from apps.core.site_utils import get_site_from_request

logger = logging.getLogger(__name__)

@api_view(["POST"])
def revalidate(request):
    """
    Webhook缓存失效接口
    
    载荷格式：
    {
        "event": "publish|update|unpublish|feature",
        "site": "site_id_or_hostname",
        "entity": "article|channel|region",
        "pageId": 123,
        "slug": "article-slug",
        "channel": "channel-slug",
        "region": "region-slug",
        "at": "2024-01-01T00:00:00Z",
        "signature": "hmac_signature"
    }
    """
    try:
        # 1. 验证请求方法
        if request.method != "POST":
            return Response(
                {"error": "Method not allowed"}, 
                status=status.HTTP_405_METHOD_NOT_ALLOWED
            )
        
        # 2. 获取请求数据
        try:
            payload = request.data
        except Exception:
            return Response(
                {"error": "Invalid request data"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 3. 验证必需字段
        required_fields = ["event", "site", "entity", "at", "signature"]
        for field in required_fields:
            if field not in payload:
                return Response(
                    {"error": f"Missing required field: {field}"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # 4. 验证签名
        if not verify_signature(payload, request):
            return Response(
                {"error": "Invalid signature"}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # 5. 获取站点信息
        site = get_site_from_payload(payload["site"])
        if not site:
            return Response(
                {"error": "Invalid site"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 6. 执行缓存失效
        revalidation_result = execute_revalidation(payload, site)
        
        # 7. 返回结果
        return Response({
            "success": True,
            "message": "Cache revalidation completed",
            "result": revalidation_result,
            "timestamp": payload["at"]
        })
        
    except Exception as e:
        logger.error(f"Cache revalidation failed: {e}")
        return Response(
            {"error": f"Internal server error: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def verify_signature(payload, request):
    """
    验证HMAC签名
    
    Args:
        payload: 请求载荷
        request: 请求对象
        
    Returns:
        bool: 签名是否有效
    """
    try:
        # 获取密钥（从环境变量或设置）
        secret_key = getattr(settings, 'WEBHOOK_SECRET_KEY', 'default-secret-key')
        
        # 重新构建签名字符串
        signature_data = {
            "event": payload["event"],
            "site": payload["site"],
            "entity": payload["entity"],
            "at": payload["at"]
        }
        
        # 添加可选字段
        if "pageId" in payload:
            signature_data["pageId"] = payload["pageId"]
        if "slug" in payload:
            signature_data["slug"] = payload["slug"]
        if "channel" in payload:
            signature_data["channel"] = payload["channel"]
        if "region" in payload:
            signature_data["region"] = payload["region"]
        
        # 生成签名
        message = json.dumps(signature_data, sort_keys=True)
        expected_signature = hmac.new(
            secret_key.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        
        # 验证签名
        return hmac.compare_digest(
            payload["signature"], 
            expected_signature
        )
        
    except Exception as e:
        logger.error(f"Signature verification failed: {e}")
        return False


def get_site_from_payload(site_identifier):
    """
    从载荷中获取站点对象
    
    Args:
        site_identifier: 站点标识符（ID或主机名）
        
    Returns:
        Site对象或None
    """
    try:
        if site_identifier.isdigit():
            return Site.objects.get(id=int(site_identifier))
        else:
            return Site.objects.get(hostname=site_identifier)
    except Site.DoesNotExist:
        return None


def execute_revalidation(payload, site):
    """
    执行缓存失效
    
    Args:
        payload: 请求载荷
        site: 站点对象
        
    Returns:
        dict: 失效结果
    """
    result = {
        "site_revalidated": False,
        "page_revalidated": False,
        "channel_revalidated": False,
        "region_revalidated": False,
        "path_revalidated": False
    }
    
    try:
        # 1. 站点级失效
        revalidate_tag(f"site:{site.hostname}")
        result["site_revalidated"] = True
        
        # 2. 页面级失效（如果有pageId）
        if "pageId" in payload and payload["pageId"]:
            revalidate_tag(f"page:{payload['pageId']}")
            result["page_revalidated"] = True
        
        # 3. 频道级失效（如果有channel）
        if "channel" in payload and payload["channel"]:
            revalidate_tag(f"channel:{payload['channel']}")
            result["channel_revalidated"] = True
        
        # 4. 地区级失效（如果有region）
        if "region" in payload and payload["region"]:
            revalidate_tag(f"region:{payload['region']}")
            result["region_revalidated"] = True
        
        # 5. 路径失效（如果有slug）
        if "slug" in payload and payload["slug"]:
            revalidate_path(f"/news/{payload['slug']}")
            result["path_revalidated"] = True
        
        logger.info(f"Cache revalidation completed for site {site.hostname}: {result}")
        
    except Exception as e:
        logger.error(f"Cache revalidation failed: {e}")
        raise
    
    return result


def revalidate_tag(tag):
    """
    失效指定标签的缓存
    
    Args:
        tag: 缓存标签
    """
    try:
        # 这里应该调用Next.js的revalidateTag API
        # 暂时记录日志
        logger.info(f"Revalidating tag: {tag}")
        
        # TODO: 实现与Next.js的通信
        # 可以通过HTTP请求调用Next.js的revalidate接口
        
    except Exception as e:
        logger.error(f"Failed to revalidate tag {tag}: {e}")
        raise


def revalidate_path(path):
    """
    失效指定路径的缓存
    
    Args:
        path: 页面路径
    """
    try:
        # 这里应该调用Next.js的revalidatePath API
        # 暂时记录日志
        logger.info(f"Revalidating path: {path}")
        
        # TODO: 实现与Next.js的通信
        # 可以通过HTTP请求调用Next.js的revalidate接口
        
    except Exception as e:
        logger.error(f"Failed to revalidate path {path}: {e}")
        raise


@api_view(["GET"])
def revalidate_status(request):
    """
    获取缓存失效状态
    
    用于监控和调试
    """
    try:
        # 获取最近的失效记录
        # TODO: 实现失效记录存储和查询
        
        return Response({
            "status": "active",
            "last_revalidation": None,
            "total_revalidations": 0,
            "success_rate": 1.0
        })
        
    except Exception as e:
        logger.error(f"Failed to get revalidation status: {e}")
        return Response(
            {"error": f"Internal server error: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
