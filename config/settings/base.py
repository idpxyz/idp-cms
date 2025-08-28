"""
Django基础设置

这是所有环境共享的基础配置
"""

import os
import sys
from pathlib import Path
from datetime import timedelta

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
    "wagtail.snippets",
    "wagtail.sites",
    "wagtail.contrib.settings",
    "wagtail.search",
]

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
]

INSTALLED_APPS = DJANGO_APPS + WAGTAIL_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# 中间件配置
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
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
STATICFILES_DIRS = [
    BASE_DIR / "static",
]

# 媒体文件配置
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# 文件存储配置（支持S3/MinIO）
if os.getenv("MINIO_ENDPOINT"):
    DEFAULT_FILE_STORAGE = "storages.backends.s3boto3.S3Boto3Storage"
    AWS_S3_ENDPOINT_URL = os.getenv("MINIO_ENDPOINT")
    AWS_ACCESS_KEY_ID = os.getenv("MINIO_ACCESS_KEY")
    AWS_SECRET_ACCESS_KEY = os.getenv("MINIO_SECRET_KEY")
    AWS_STORAGE_BUCKET_NAME = os.getenv("MINIO_BUCKET", "media")
    AWS_S3_SIGNATURE_VERSION = "s3v4"
    AWS_S3_ADDRESSING_STYLE = "virtual"
    
    # MinIO 特定配置
    AWS_S3_VERIFY = False
    AWS_DEFAULT_ACL = None
    AWS_QUERYSTRING_AUTH = False
    AWS_S3_FILE_OVERWRITE = False
    AWS_LOCATION = ''
    
    # 确保使用 MinIO 而不是本地存储
    STORAGES = {
        'default': {'BACKEND': 'storages.backends.s3boto3.S3Boto3Storage'},
        'staticfiles': {'BACKEND': 'django.contrib.staticfiles.storage.StaticFilesStorage'}
    }
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
WAGTAILADMIN_BASE_URL = os.getenv("WAGTAIL_BASE_URL", "http://localhost:8000")

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
CORS_ALLOWED_ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000").split(",")
CORS_ALLOW_CREDENTIALS = True

# Celery配置
CELERY_TIMEZONE = TIME_ZONE
CELERY_ENABLE_UTC = False
CELERY_BEAT_SCHEDULE = {}

# 默认broker配置（生产环境）
CELERY_BROKER_URL = os.getenv("REDIS_URL", "redis://redis:6379/1")
CELERY_RESULT_BACKEND = os.getenv("REDIS_URL", "redis://redis:6379/1")

# 日志配置
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
            "style": "{",
        },
        "simple": {
            "format": "{levelname} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "file": {
            "level": "INFO",
            "class": "logging.FileHandler",
            "filename": BASE_DIR / "logs" / "django.log",
            "formatter": "verbose",
        },
        "console": {
            "level": "DEBUG",
            "class": "logging.StreamHandler",
            "formatter": "simple",
        },
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
            "handlers": ["console", "file"],
            "level": "DEBUG",
            "propagate": False,
        },
    },
}

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