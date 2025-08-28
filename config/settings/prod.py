"""
生产环境配置
"""

from .base import *

# 生产环境特定配置
DEBUG = False
ALLOWED_HOSTS = os.getenv("DJANGO_ALLOWED_HOSTS", "").split(",")

# 确保有允许的主机
if not ALLOWED_HOSTS or ALLOWED_HOSTS == [""]:
    raise ValueError("DJANGO_ALLOWED_HOSTS must be set in production")

# 数据库配置（生产环境）
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("POSTGRES_DB"),
        "USER": os.getenv("POSTGRES_USER"),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD"),
        "HOST": os.getenv("POSTGRES_HOST"),
        "PORT": int(os.getenv("POSTGRES_PORT", "5432")),
        "OPTIONS": {
            "MAX_CONNS": 20,
            "sslmode": "require",
        },
        "CONN_MAX_AGE": 60,
    }
}

# 缓存配置（生产环境必须使用Redis）
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": os.getenv("REDIS_URL"),
        "KEY_PREFIX": "idp_cms_prod",
        "TIMEOUT": 300,
        "VERSION": 1,
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
            "CONNECTION_POOL_KWARGS": {"max_connections": 50},
        }
    },
    "api": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": os.getenv("REDIS_URL"),
        "KEY_PREFIX": "idp_cms_api_prod",
        "TIMEOUT": 600,
        "VERSION": 1,
    }
}

# 静态文件配置（生产环境）
STATICFILES_STORAGE = "django.contrib.staticfiles.storage.ManifestStaticFilesStorage"

# 邮件配置（生产环境）
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = os.getenv("EMAIL_HOST")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "noreply@idpcms.com")

# 安全配置（生产环境）
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_SECONDS = 31536000  # 1年
SECURE_HSTS_PRELOAD = True
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
X_FRAME_OPTIONS = "DENY"

# CORS配置（生产环境严格）
CORS_ALLOWED_ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")
CORS_ALLOW_CREDENTIALS = True

# 日志配置（生产环境）
LOGGING["handlers"]["file"]["filename"] = "/var/log/django/django.log"
LOGGING["loggers"]["django"]["level"] = "WARNING"
LOGGING["loggers"]["apps"]["level"] = "INFO"

# 性能配置
USE_TZ = True
SESSION_ENGINE = "django.contrib.sessions.backends.cache"
SESSION_CACHE_ALIAS = "default"

# OpenSearch配置（生产环境）
OPENSEARCH = {
    "URL": os.getenv("OPENSEARCH_URL", "http://opensearch:9200"),
    "USERNAME": os.getenv("OPENSEARCH_USERNAME", "admin"),
    "PASSWORD": os.getenv("OPENSEARCH_PASSWORD", "OpenSearch2024!@#$%"),
    "SECURITY_DISABLED": os.getenv("OPENSEARCH_SECURITY_DISABLED", "false").lower() == "true",
}