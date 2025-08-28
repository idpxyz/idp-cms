"""
测试环境配置
"""

from .base import *

# 测试环境特定配置
DEBUG = False
ALLOWED_HOSTS = ["*"]

# 数据库配置（测试环境使用内存数据库）
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

# 缓存配置（测试环境使用本地内存）
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "test-cache",
    }
}

# 密码验证（测试环境简化）
AUTH_PASSWORD_VALIDATORS = []

# 邮件配置（测试环境）
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# 日志配置（测试环境静默）
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "null": {
            "class": "logging.NullHandler",
        },
    },
    "root": {
        "handlers": ["null"],
    },
}

# 媒体文件（测试环境使用临时目录）
import tempfile
MEDIA_ROOT = tempfile.mkdtemp()

# 静态文件（测试环境）
STATICFILES_STORAGE = "django.contrib.staticfiles.storage.StaticFilesStorage"

# 安全配置（测试环境关闭）
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

# Celery配置（测试环境同步执行）
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# OpenSearch配置（测试环境）
OPENSEARCH = {
    "URL": "http://localhost:9200",
    "USERNAME": "admin",
    "PASSWORD": "OpenSearch2024!@#$%",
    "SECURITY_DISABLED": True,
}
