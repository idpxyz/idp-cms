"""
核心应用视图
"""

from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.db import connection
from django.core.cache import cache
from django.conf import settings
import json
import time


@csrf_exempt
@require_http_methods(["GET"])
def health_check(request):
    """
    健康检查端点
    
    用于监控系统状态和部署脚本的健康检查
    """
    health_status = {
        "status": "ok",
        "timestamp": time.time(),
        "version": "1.0.0",
        "environment": getattr(settings, 'DJANGO_SETTINGS_MODULE', 'unknown'),
        "checks": {}
    }
    
    # 数据库连接检查
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            health_status["checks"]["database"] = {
                "status": "ok",
                "message": "数据库连接正常"
            }
    except Exception as e:
        health_status["checks"]["database"] = {
            "status": "error",
            "message": f"数据库连接失败: {str(e)}"
        }
        health_status["status"] = "error"
    
    # Redis缓存检查
    try:
        cache.set("health_check", "ok", 10)
        if cache.get("health_check") == "ok":
            health_status["checks"]["cache"] = {
                "status": "ok",
                "message": "Redis缓存正常"
            }
        else:
            health_status["checks"]["cache"] = {
                "status": "error",
                "message": "Redis缓存读写失败"
            }
            health_status["status"] = "error"
    except Exception as e:
        health_status["checks"]["cache"] = {
            "status": "error",
            "message": f"Redis缓存连接失败: {str(e)}"
        }
        health_status["status"] = "error"
    
    # 文件系统检查
    try:
        import os
        test_file = "/tmp/health_check_test"
        with open(test_file, "w") as f:
            f.write("test")
        os.remove(test_file)
        health_status["checks"]["filesystem"] = {
            "status": "ok",
            "message": "文件系统正常"
        }
    except Exception as e:
        health_status["checks"]["filesystem"] = {
            "status": "error",
            "message": f"文件系统检查失败: {str(e)}"
        }
        health_status["status"] = "error"
    
    # 应用配置检查
    try:
        required_settings = [
            'SECRET_KEY',
            'DATABASES',
            'CACHES',
            'ALLOWED_HOSTS'
        ]
        
        missing_settings = []
        for setting in required_settings:
            if not hasattr(settings, setting):
                missing_settings.append(setting)
        
        if missing_settings:
            health_status["checks"]["configuration"] = {
                "status": "error",
                "message": f"缺少必要配置: {', '.join(missing_settings)}"
            }
            health_status["status"] = "error"
        else:
            health_status["checks"]["configuration"] = {
                "status": "ok",
                "message": "应用配置正常"
            }
    except Exception as e:
        health_status["checks"]["configuration"] = {
            "status": "error",
            "message": f"配置检查失败: {str(e)}"
        }
        health_status["status"] = "error"
    
    # 返回状态码
    if health_status["status"] == "ok":
        return JsonResponse(health_status, status=200)
    else:
        return JsonResponse(health_status, status=503)


@csrf_exempt
@require_http_methods(["GET"])
def system_info(request):
    """
    系统信息端点
    
    返回系统基本信息和状态
    """
    import platform
    import psutil
    
    system_info = {
        "system": {
            "platform": platform.platform(),
            "python_version": platform.python_version(),
            "django_version": getattr(settings, 'DJANGO_VERSION', 'unknown'),
        },
        "resources": {
            "cpu_percent": psutil.cpu_percent(interval=1),
            "memory_percent": psutil.virtual_memory().percent,
            "disk_percent": psutil.disk_usage('/').percent,
        },
        "application": {
            "debug": getattr(settings, 'DEBUG', False),
            "allowed_hosts": getattr(settings, 'ALLOWED_HOSTS', []),
            "database_engine": getattr(settings, 'DATABASES', {}).get('default', {}).get('ENGINE', 'unknown'),
            "cache_backend": getattr(settings, 'CACHES', {}).get('default', {}).get('BACKEND', 'unknown'),
        }
    }
    
    return JsonResponse(system_info)


@csrf_exempt
@require_http_methods(["GET"])
def security_status(request):
    """
    安全状态端点
    
    返回当前安全配置状态
    """
    security_status = {
        "security_headers": {
            "x_content_type_options": True,
            "x_frame_options": True,
            "x_xss_protection": True,
            "referrer_policy": True,
            "content_security_policy": True,
        },
        "cors": {
            "enabled": hasattr(settings, 'CORS_ALLOWED_ORIGINS'),
            "allowed_origins_count": len(getattr(settings, 'CORS_ALLOWED_ORIGINS', [])),
            "credentials_allowed": getattr(settings, 'CORS_ALLOW_CREDENTIALS', False),
        },
        "csrf": {
            "enabled": True,
            "trusted_origins_count": len(getattr(settings, 'CSRF_TRUSTED_ORIGINS', [])),
        },
        "ssl": {
            "redirect_enabled": getattr(settings, 'SECURE_SSL_REDIRECT', False),
            "hsts_enabled": getattr(settings, 'SECURE_HSTS_SECONDS', 0) > 0,
        },
        "session": {
            "secure": getattr(settings, 'SESSION_COOKIE_SECURE', False),
            "httponly": getattr(settings, 'SESSION_COOKIE_HTTPONLY', False),
            "samesite": getattr(settings, 'SESSION_COOKIE_SAMESITE', 'Lax'),
        }
    }
    
    return JsonResponse(security_status)


# =====================
# 存储监控相关视图
# =====================

@require_http_methods(["GET"])
def storage_health_check(request):
    """
    存储健康检查端点
    
    返回存储系统的健康状态，适用于容器健康检查
    """
    try:
        from apps.core.monitoring.storage_monitor import storage_monitor
        
        # 获取缓存的指标（避免频繁检查）
        cached_metrics = storage_monitor.get_cached_metrics()
        
        if cached_metrics:
            # 使用缓存的指标快速检查
            health_status = {
                'timestamp': cached_metrics.get('timestamp', ''),
                'overall_status': 'healthy',
                'metrics': cached_metrics,
                'source': 'cache'
            }
        else:
            # 执行完整健康检查
            health_status = storage_monitor.check_health()
            health_status['source'] = 'live'
        
        # 根据状态返回相应的 HTTP 状态码
        http_status = 200
        if health_status['overall_status'] == 'warning':
            http_status = 200  # 警告状态仍返回 200，但在响应中标记
        elif health_status['overall_status'] == 'critical':
            http_status = 503  # 服务不可用
        
        return JsonResponse(health_status, status=http_status)
        
    except Exception as e:
        return JsonResponse({
            'timestamp': '',
            'overall_status': 'critical',
            'error': str(e),
            'source': 'error'
        }, status=503)


@require_http_methods(["GET"])
def storage_metrics(request):
    """
    存储指标端点
    
    返回详细的存储指标，用于监控和告警
    """
    try:
        from apps.core.monitoring.storage_monitor import storage_monitor
        
        # 检查是否强制刷新
        force_refresh = request.GET.get('refresh', 'false').lower() == 'true'
        
        if force_refresh:
            metrics = storage_monitor._collect_storage_metrics()
            storage_monitor.cache_metrics(metrics)
        else:
            metrics = storage_monitor.get_cached_metrics()
            if not metrics:
                metrics = storage_monitor._collect_storage_metrics()
                storage_monitor.cache_metrics(metrics)
        
        return JsonResponse({
            'timestamp': metrics.get('timestamp', ''),
            'metrics': metrics,
            'cache_info': {
                'is_cached': not force_refresh,
                'cache_timeout': storage_monitor.cache_timeout
            }
        })
        
    except Exception as e:
        return JsonResponse({
            'error': str(e),
            'timestamp': ''
        }, status=500)


@require_http_methods(["GET"])
def simple_health_check(request):
    """
    简单健康检查端点
    
    用于 Docker Compose 的 healthcheck，返回简单的状态
    """
    try:
        from apps.core.monitoring.storage_monitor import storage_monitor
        
        # 快速检查 S3 连接
        connection_check = storage_monitor._check_s3_connection()
        
        if connection_check['status'] == 'passed':
            from django.http import HttpResponse
            return HttpResponse('OK', status=200, content_type='text/plain')
        else:
            from django.http import HttpResponse
            return HttpResponse('FAIL', status=503, content_type='text/plain')
            
    except Exception as e:
        from django.http import HttpResponse
        return HttpResponse('ERROR', status=503, content_type='text/plain')


@require_http_methods(["GET"])
def liveness_probe(request):
    """
    进程存活检查（Liveness）
    仅用于判断进程是否存活，不依赖外部服务。
    """
    return HttpResponse('OK', status=200, content_type='text/plain')


@require_http_methods(["GET"])
def readiness_check(request):
    """
    就绪检查（Readiness）
    检查关键依赖（数据库、缓存）是否可用。
    失败返回503，以避免流量进入未就绪实例。
    """
    status_data = {
        "status": "ok",
        "checks": {}
    }

    # 数据库检查
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        status_data["checks"]["database"] = {"status": "ok"}
    except Exception as e:
        status_data["checks"]["database"] = {"status": "error", "message": str(e)}
        status_data["status"] = "error"

    # 缓存检查
    try:
        cache_key = "readiness_check"
        cache.set(cache_key, "ok", 5)
        if cache.get(cache_key) == "ok":
            status_data["checks"]["cache"] = {"status": "ok"}
        else:
            status_data["checks"]["cache"] = {"status": "error", "message": "cache r/w failed"}
            status_data["status"] = "error"
    except Exception as e:
        status_data["checks"]["cache"] = {"status": "error", "message": str(e)}
        status_data["status"] = "error"

    http_status = 200 if status_data["status"] == "ok" else 503
    return JsonResponse(status_data, status=http_status)


@require_http_methods(["GET"])
def startup_check(request):
    """
    启动完成检查（Startup）
    用于延迟就绪探针的开始，确保应用完成初始化。
    当前实现：验证基本配置加载与数据库可连。
    """
    try:
        # 配置项存在性检查
        _ = settings.SECRET_KEY
        _ = settings.DATABASES
        # 轻量数据库探测
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return HttpResponse('STARTED', status=200, content_type='text/plain')
    except Exception as e:
        return HttpResponse(f'NOT_READY: {e}', status=503, content_type='text/plain')


@require_http_methods(["POST"])
@csrf_exempt
def trigger_monitoring(request):
    """
    触发监控周期端点
    
    允许外部触发完整的监控周期
    """
    try:
        # 检查是否有权限（简单的 token 验证）
        auth_token = request.headers.get('Authorization', '')
        expected_token = getattr(settings, 'MONITORING_API_TOKEN', 'monitoring-token')
        
        if auth_token != f'Bearer {expected_token}':
            return JsonResponse({
                'error': 'Unauthorized'
            }, status=401)
        
        from apps.core.monitoring.storage_monitor import storage_monitor
        
        # 运行监控周期
        health_status = storage_monitor.run_monitoring_cycle()
        
        return JsonResponse({
            'message': '监控周期已完成',
            'health_status': health_status
        })
        
    except Exception as e:
        return JsonResponse({
            'error': str(e)
        }, status=500)
