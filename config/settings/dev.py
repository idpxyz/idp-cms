"""
开发环境配置
"""

from .base import *

# 开发环境特定配置
DEBUG = True
ALLOWED_HOSTS = ["*"]

# 数据库配置（开发环境）
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("POSTGRES_DB", "idp_cms_dev"),
        "USER": os.getenv("POSTGRES_USER", "idp_cms"),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD", "idp_cms"),
        "HOST": os.getenv("POSTGRES_HOST", "localhost"),
        "PORT": int(os.getenv("POSTGRES_PORT", "5432")),
    }
}

# 缓存配置（开发环境可以使用本地内存缓存）
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "unique-snowflake",
    },
    "api": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "api-cache",
    }
}

# 日志配置（开发环境更详细）
LOGGING["root"]["level"] = "DEBUG"
LOGGING["loggers"]["django"]["level"] = "DEBUG"

# 邮件配置（开发环境使用控制台）
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# 调试工具
INTERNAL_IPS = ["127.0.0.1", "localhost"]

# CORS配置（开发环境更宽松）
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# 安全配置（开发环境关闭）
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

# Celery配置（开发环境使用Redis）
# 使用环境变量中的Redis URL，如果没有则使用默认值
CELERY_BROKER_URL = os.getenv("REDIS_URL", "redis://redis:6379/1")
CELERY_RESULT_BACKEND = os.getenv("REDIS_URL", "redis://redis:6379/1")

# OpenSearch配置（开发环境）
OPENSEARCH = {
    "URL": "http://opensearch:9200",
    "USERNAME": "admin",
    "PASSWORD": "OpenSearch2024!@#$%",
    "SECURITY_DISABLED": True,
}