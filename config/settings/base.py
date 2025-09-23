"""
Django基础设置

这是所有环境共享的基础配置
"""

import os
import sys
from pathlib import Path
from datetime import timedelta
from corsheaders.defaults import default_headers

# 项目根目录 - 包含manage.py的目录
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# 确保apps目录在Python路径中
APPS_DIR = BASE_DIR / "apps"
if str(APPS_DIR) not in sys.path:
    sys.path.insert(0, str(APPS_DIR))

# 安全配置
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-secret-key-change-in-production")
DEBUG = int(os.getenv("DJANGO_DEBUG", "0")) == 1
ALLOWED_HOSTS = os.getenv("DJANGO_ALLOWED_HOSTS", "*").split(",")

# Django应用配置
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
]

# Wagtail应用
WAGTAIL_APPS = [
    "wagtail",
    "wagtail.admin",
    "wagtail.users",
    "wagtail.documents",
    "wagtail.images",
    "wagtail.embeds",
    "wagtail.snippets",
    "wagtail.sites",
    "wagtail.contrib.settings",
    "wagtail.search",
]

# Wagtail 功能配置
WAGTAIL_ENABLE_WHATS_NEW_BANNER = False  # 禁用新功能横幅
WAGTAIL_USER_EDIT_FORM = None           # 禁用用户编辑表单扩展
WAGTAIL_ENABLE_UPDATE_CHECK = False     # 禁用更新检查
WAGTAILADMIN_COMMENTS_ENABLED = False   # 全局禁用管理端评论系统

# 第三方应用
THIRD_PARTY_APPS = [
    "rest_framework",
    "corsheaders",
    "modelcluster",
    "taggit",
]

# 本地应用
LOCAL_APPS = [
    "apps.core",
    "apps.home", 
    "apps.news",
    "apps.searchapp",
    "apps.api",
    "apps.media",  # 媒体管理应用
    "apps.web_users",  # 网站前端用户系统
]

# 品牌化应用必须在wagtail.admin之前，按照官方文档要求
INSTALLED_APPS = DJANGO_APPS + [
    "apps.branding",  # 品牌化应用，放在wagtail.admin之前
] + WAGTAIL_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# 中间件配置
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "apps.branding.middleware.AdminRememberMeMiddleware",  # 记住我功能
    "apps.core.middleware.CorrelationIdMiddleware",
    "apps.core.middleware.ThreadLocalRequestMiddleware",  # 线程本地请求存储
    # "apps.api.middleware.idempotency.RetryableErrorMiddleware",  # 暂时禁用，待排查
    # "apps.api.middleware.idempotency.IdempotencyMiddleware",  # 暂时禁用，待进一步验证
    # "apps.api.middleware.response_standard.APIResponseStandardMiddleware",  # 暂时禁用，待修复
    # "apps.api.middleware.idempotency.IdempotencyMiddleware",  # 暂时禁用，待修复 
    # "apps.api.middleware.idempotency.CircuitBreakerResponseMiddleware",  # 暂时禁用，待修复
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "wagtail.contrib.redirects.middleware.RedirectMiddleware",
]

# URL配置
ROOT_URLCONF = "config.urls"

# 模板配置
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# WSGI/ASGI配置
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# 数据库配置
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("POSTGRES_DB", "idp_cms"),
        "USER": os.getenv("POSTGRES_USER", "idp_cms"),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD", "idp_cms"),
        "HOST": os.getenv("POSTGRES_HOST", "localhost"),
        "PORT": int(os.getenv("POSTGRES_PORT", "5432")),
        "OPTIONS": {
            "MAX_CONNS": 20,
        },
    }
}

# 缓存配置
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": os.getenv("REDIS_URL", "redis://redis:6379/1"),
        "KEY_PREFIX": "idp_cms",
        "TIMEOUT": 300,
        "VERSION": 1,
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        }
    },
    "api": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache", 
        "LOCATION": os.getenv("REDIS_URL", "redis://redis:6379/1"),
        "KEY_PREFIX": "idp_cms_api",
        "TIMEOUT": 600,
        "VERSION": 1,
    }
}

# 缓存中间件配置
CACHE_MIDDLEWARE_SECONDS = 300
CACHE_MIDDLEWARE_KEY_PREFIX = "idp_cms_middleware"
CACHE_MIDDLEWARE_ALIAS = "default"

# 国际化配置
LANGUAGE_CODE = "zh-hans"
TIME_ZONE = os.getenv("DJANGO_TIME_ZONE", "Asia/Shanghai")
USE_I18N = True
USE_TZ = True

# 静态文件配置
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# 抑制Django默认404页面的URLResolver模板错误
# 这是Django 5.2.6在DEBUG模式下的已知问题
# 在LOGGING配置中处理
STATICFILES_DIRS = [
    BASE_DIR / "static",
]

# 媒体文件配置
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# 文件存储配置（支持S3/MinIO）
if os.getenv("MINIO_ENDPOINT"):
    # MinIO 内部访问配置（用于上传）
    # 注意: 不再使用 DEFAULT_FILE_STORAGE，而是使用 STORAGES 配置
    AWS_ACCESS_KEY_ID = os.getenv("MINIO_ACCESS_KEY")
    AWS_SECRET_ACCESS_KEY = os.getenv("MINIO_SECRET_KEY")
    AWS_STORAGE_BUCKET_NAME = os.getenv("MINIO_BUCKET", "media")  # 保留用于兼容性
    AWS_S3_ENDPOINT_URL = os.getenv("MINIO_ENDPOINT")
    AWS_S3_REGION_NAME = "us-east-1"
    
    # 外部访问域名配置（用于传统桶的兼容性）
    AWS_S3_CUSTOM_DOMAIN = f"{os.getenv('MINIO_PUBLIC_DOMAIN', 'localhost:9002')}/{AWS_STORAGE_BUCKET_NAME}"
    
    # 强制使用自定义域名生成URL
    AWS_S3_USE_SSL = False
    AWS_QUERYSTRING_AUTH = False
    AWS_DEFAULT_ACL = None
    
    # 存储选项 - 多桶配置
    STORAGES = {
        "default": {
            "BACKEND": "apps.core.storages.PublicMediaStorage",
        },
        "private": {
            "BACKEND": "apps.core.storages.PrivateMediaStorage",
        },
        "staticfiles": {
            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
        },
    }
    
    # S3 兼容性设置
    AWS_S3_ADDRESSING_STYLE = "path"
    AWS_S3_SIGNATURE_VERSION = "s3v4"
    AWS_S3_VERIFY = False
    AWS_S3_FILE_OVERWRITE = False
    
    # 公共访问 URL 设置
    AWS_QUERYSTRING_AUTH = False
    AWS_DEFAULT_ACL = None
    AWS_S3_URL_PROTOCOL = "http:"
    
    # 禁用不必要的功能
    AWS_DEFAULT_ACL = None
    AWS_QUERYSTRING_AUTH = False
    AWS_S3_FILE_OVERWRITE = False
    AWS_S3_VERIFY = False
    AWS_S3_USE_SSL = False
    
    # 强制使用路径方式访问
    AWS_S3_ADDRESSING_STYLE = 'path'
    
    # S3 兼容性设置
    AWS_S3_SIGNATURE_VERSION = 's3v4'
    AWS_LOCATION = ''  # 根目录
    
    # URL 配置
    AWS_S3_URL_PROTOCOL = 'http:'
    
    # 确保生成的URL使用公共访问地址
    AWS_S3_PUBLIC_URL_PROTOCOL = 'http:'
    
    # Wagtail 媒体文件配置
    # 指定调用函数构建上传路径（稳定ID+月分桶）
    WAGTAILIMAGES_UPLOAD_PATH = "apps.core.media_paths.build_media_path"
    # 使用自定义 Image/Rendition 模型，使 upload_to 在上传时拿到 collection
    WAGTAILIMAGES_IMAGE_MODEL = 'media.CustomImage'
    WAGTAILIMAGES_RENDITION_MODEL = 'media.CustomRendition'
    WAGTAILDOCS_UPLOAD_PATH = "documents/"
    
    # 指定Wagtail图片使用我们的自定义存储
    WAGTAILIMAGES_STORAGE = "apps.core.storages.PublicMediaStorage"
else:
    # 本地存储配置（开发环境备用）
    STORAGES = {
        'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
        'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'}
    }

# 站点配置
SITE_ID = 1

    # Wagtail配置
WAGTAIL_SITE_NAME = "IDP-CMS"
# WAGTAILADMIN_BASE_URL 已废弃，使用新的统一URL配置管理器
# 保留此行仅为向后兼容，实际URL由 apps.core.url_config.URLConfig 管理
WAGTAILADMIN_BASE_URL = os.getenv("DJANGO_BASE_URL", "http://localhost:8000")

# 直接扩展 Wagtail 的 Site 模型，无需自定义模型配置

# DRF配置
REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle"
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/hour",
        "user": "1000/hour"
    }
}

# CORS配置
CORS_ALLOWED_ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")
CORS_ALLOW_CREDENTIALS = True
# 允许自定义请求头（用于前端跟踪请求ID）
CORS_ALLOW_HEADERS = list(default_headers) + [
    "x-request-id",
]

# Celery配置
CELERY_TIMEZONE = TIME_ZONE
CELERY_ENABLE_UTC = False
CELERY_BEAT_SCHEDULE = {
    # 媒体文件清理任务 - 暂时禁用以防止误删图片
    # 'cleanup-orphan-files': {
    #     'task': 'apps.media.tasks.cleanup_orphan_files',
    #     'schedule': 3600.0,  # 每小时执行一次
    # },
    # 'cleanup-temp-files': {
    #     'task': 'apps.media.tasks.cleanup_temp_files', 
    #     'schedule': 86400.0,  # 每天执行一次
    # },
    # 'cleanup-old-renditions': {
    #     'task': 'apps.media.tasks.cleanup_old_renditions',
    #     'schedule': 86400.0,  # 每天执行一次
    # },
    'generate-storage-stats': {
        'task': 'apps.media.tasks.generate_storage_stats',
        'schedule': 3600.0,  # 每小时生成一次统计
    },
    
    # 存储监控任务
    'storage-health-check': {
        'task': 'storage.health_check',
        'schedule': 300.0,  # 每5分钟执行一次健康检查
    },
    'storage-collect-metrics': {
        'task': 'storage.collect_metrics', 
        'schedule': 600.0,  # 每10分钟收集一次指标
    },
    'storage-full-monitoring': {
        'task': 'storage.full_monitoring',
        'schedule': 1800.0,  # 每30分钟执行一次完整监控
    },
    'storage-cleanup-metrics': {
        'task': 'storage.cleanup_old_metrics',
        'schedule': 86400.0,  # 每天清理一次旧数据
    },

    # DB↔OpenSearch 一致性巡检
    'db-opensearch-consistency': {
        'task': 'apps.searchapp.tasks.check_db_opensearch_consistency',
        'schedule': 600.0,  # 每10分钟检查一次
    },
    # 现代缓存系统不需要预计算任务，删除旧的聚合缓存任务
    # compute_hot 任务也已删除，现代缓存系统实时处理
    
    # 数据同步和行为分析任务
    'batch-update-article-weights': {
        'task': 'apps.core.tasks.data_sync.batch_sync_article_weights',
        'schedule': 3600.0,  # 每小时更新一次文章权重
        'kwargs': {'limit': 500},  # 每次处理500篇文章
    },
    'update-trending-cache': {
        'task': 'apps.core.tasks.data_sync.update_trending_articles_cache',
        'schedule': 300.0,  # 每5分钟更新热门文章缓存
    },
    'comprehensive-consistency-check': {
        'task': 'apps.core.tasks.data_sync.comprehensive_data_consistency_check',
        'schedule': 1800.0,  # 每30分钟做一次全面检查
    },
    'cleanup-behavior-data': {
        'task': 'apps.core.tasks.data_sync.cleanup_old_behavior_data',
        'schedule': 86400.0,  # 每天清理一次过期数据
        'kwargs': {'days_to_keep': 90},
    },
    'generate-behavior-insights': {
        'task': 'apps.core.tasks.data_sync.generate_user_behavior_insights',
        'schedule': 21600.0,  # 每6小时生成一次行为洞察
    },
}

# 日志配置变量
LOG_FILE_PATH = os.getenv("DJANGO_LOG_FILE", "/app/logs/django.log")
USE_FILE_LOGGING = True

try:
    os.makedirs(os.path.dirname(LOG_FILE_PATH), exist_ok=True)
    # 测试文件写入权限
    test_file = LOG_FILE_PATH + '.test'
    with open(test_file, 'w') as f:
        f.write('test')
    os.remove(test_file)
except Exception:
    # 目录不可写时，回退到控制台输出
    USE_FILE_LOGGING = False

# 默认broker配置（生产环境）
CELERY_BROKER_URL = os.getenv("REDIS_URL", "redis://redis:6379/1")
CELERY_RESULT_BACKEND = os.getenv("REDIS_URL", "redis://redis:6379/1")

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {thread:d} cid={correlation_id} {message}",
            "style": "{",
        },
        "simple": {
            "format": "{levelname} cid={correlation_id} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "level": "DEBUG",
            "class": "logging.StreamHandler",
            "formatter": "simple",
            "filters": ["request_context"],
        },
    },
    "filters": {
        "request_context": {
            "()": "apps.core.middleware.RequestLogContextFilter",
        }
    },
    "root": {
        "handlers": ["console"],
        "level": "WARNING",
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": os.getenv("DJANGO_LOG_LEVEL", "INFO"),
            "propagate": False,
        },
        "apps": {
            "handlers": ["console"],
            "level": "DEBUG",
            "propagate": False,
        },
        "django.template": {
            "handlers": ["console"],
            "level": "ERROR",  # 抑制VariableDoesNotExist警告
            "propagate": False,
        },
    },
}

# 如果文件日志可用，动态添加文件处理器
if USE_FILE_LOGGING:
    LOGGING["handlers"]["file"] = {
        "level": "INFO",
        "class": "logging.FileHandler", 
        "filename": LOG_FILE_PATH,
        "formatter": "verbose",
        "filters": ["request_context"],
    }
    # 为apps logger添加文件处理器
    LOGGING["loggers"]["apps"]["handlers"].append("file")

# 自定义配置
WEBHOOK_SECRET_KEY = os.getenv("WEBHOOK_SECRET_KEY", "webhook-secret-key")
SITE_HOSTNAME = os.getenv("SITE_HOSTNAME", "localhost")

# 安全配置
if not DEBUG:
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_SECONDS = 86400
    SECURE_REDIRECT_EXEMPT = []
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

# 默认主键字段类型
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# =====================
# 存储监控配置
# =====================

# 存储监控告警邮件
STORAGE_ALERT_EMAILS = [
    # 'admin@aivoya.com',
    # 'ops@aivoya.com',
]

# 监控 API 认证令牌
MONITORING_API_TOKEN = 'monitoring-token-change-in-production'

# 存储监控阈值配置
STORAGE_MONITORING_THRESHOLDS = {
    'storage_usage_percent': 80,  # 存储使用率告警阈值
    'object_count_max': 100000,   # 对象数量告警阈值
    'error_rate_percent': 5,      # 错误率告警阈值
    'response_time_ms': 1000,     # 响应时间告警阈值
}

# =====================
# 媒体路径配置
# =====================

# 租户配置 - 控制是否在路径中使用租户标识
MEDIA_USE_TENANT = False  # 设为 False 可移除路径中的租户部分
MEDIA_TENANT_NAME = 'aivoya'  # 租户标识名称，仅在 MEDIA_USE_TENANT=True 时使用

# 路径示例:
# MEDIA_USE_TENANT=True:  aivoya/portal/default/2025/09/originals/hash.png
# MEDIA_USE_TENANT=False: portal/default/2025/09/originals/hash.pngorigins