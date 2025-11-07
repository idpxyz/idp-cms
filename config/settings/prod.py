"""
生产环境配置
"""

from .base import *

# 生产环境特定配置
DEBUG = False
_allowed_hosts = os.getenv("DJANGO_ALLOWED_HOSTS", "*")
ALLOWED_HOSTS = [host.strip() for host in _allowed_hosts.split(",") if host.strip()]
if not ALLOWED_HOSTS:
    # 默认允许所有（单节点部署场景）
    ALLOWED_HOSTS = ["*"]

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
            # "sslmode": "require",  # 注释掉SSL要求，因为是内网连接
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
# 🔇 暂时禁用邮件发送功能（工作流通知不会发送邮件，但不影响工作流运行）
EMAIL_BACKEND = "django.core.mail.backends.dummy.EmailBackend"
# EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"  # 需要邮件功能时取消注释
EMAIL_HOST = os.getenv("EMAIL_HOST")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "noreply@idpcms.com")

# 安全配置（生产环境）
# 注意：单节点部署使用HTTP，SSL配置需要在Nginx层配置
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
# HSTS和SSL相关配置暂时关闭，使用HTTP直连
# SECURE_HSTS_INCLUDE_SUBDOMAINS = True
# SECURE_HSTS_SECONDS = 31536000
# SECURE_HSTS_PRELOAD = True
SECURE_SSL_REDIRECT = False  # HTTP环境，不强制SSL
SESSION_COOKIE_SECURE = False  # HTTP环境
CSRF_COOKIE_SECURE = False  # HTTP环境
X_FRAME_OPTIONS = "DENY"

# 增强安全配置
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin-allow-popups"
SECURE_CROSS_ORIGIN_EMBEDDER_POLICY = "require-corp"

# CORS配置（生产环境严格）
_cors_origins = os.getenv("CORS_ALLOWED_ORIGINS", "")
CORS_ALLOWED_ORIGINS = [origin.strip() for origin in _cors_origins.split(",") if origin.strip()]
if not CORS_ALLOWED_ORIGINS:
    # 如果未配置，使用默认值（本地开发）
    CORS_ALLOWED_ORIGINS = ["http://localhost:3000"]
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
CORS_ALLOWED_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
    "x-request-id",
]
CORS_EXPOSE_HEADERS = ["content-type", "content-disposition"]
CORS_PREFLIGHT_MAX_AGE = 86400  # 24小时

# 额外的安全中间件
SECURITY_MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "wagtail.contrib.redirects.middleware.RedirectMiddleware",
    "apps.api.middleware.security.SecureHeadersMiddleware",
    "apps.api.middleware.security.RateLimitMiddleware",
]

# 会话安全配置
SESSION_COOKIE_AGE = 3600  # 1小时
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_EXPIRE_AT_BROWSER_CLOSE = True

# CSRF安全配置
CSRF_COOKIE_AGE = 3600  # 1小时
# 允许JS读取csrftoken以在AJAX请求中设置X-CSRFToken
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = "Lax"
_csrf_origins = os.getenv("CSRF_TRUSTED_ORIGINS", "")
CSRF_TRUSTED_ORIGINS = [origin.strip() for origin in _csrf_origins.split(",") if origin.strip()]
if not CSRF_TRUSTED_ORIGINS:
    # 默认信任本地和节点IP
    CSRF_TRUSTED_ORIGINS = ["http://localhost:3000", "http://localhost:8000"]

# 密码策略
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 12}
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

# 登录尝试限制
AXES_ENABLED = True
AXES_FAILURE_LIMIT = 5
AXES_LOCK_OUT_AT_FAILURE = True
AXES_LOCK_OUT_BY_COMBINATION_USER_AND_IP = True
AXES_COOLOFF_TIME = 1  # 1小时
AXES_LOCK_OUT_BY_USER_OR_IP = True

# 日志配置（生产环境）
# 添加文件 handler
LOGGING["handlers"]["file"] = {
    "level": "INFO",
    "class": "logging.handlers.RotatingFileHandler",
    "filename": "/var/log/django/django.log",
    "maxBytes": 10485760,  # 10MB
    "backupCount": 5,
    "formatter": "verbose",
    "filters": ["request_context"],
}

# 更新 loggers 使用 file handler
LOGGING["loggers"]["django"]["handlers"] = ["console", "file"]
LOGGING["loggers"]["django"]["level"] = "WARNING"
LOGGING["loggers"]["apps"]["handlers"] = ["console", "file"]
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

# ClickHouse配置（生产环境）
CLICKHOUSE_URL = os.getenv("CLICKHOUSE_URL", "clickhouse://default:thends@clickhouse:9000/default")

# 速率限制配置（生产环境）
# 可以通过环境变量 DISABLE_RATE_LIMIT=1 来禁用
DISABLE_RATE_LIMIT = os.getenv("DISABLE_RATE_LIMIT", "0") == "1"

# 如果禁用速率限制，覆盖 REST_FRAMEWORK 配置
if DISABLE_RATE_LIMIT:
    REST_FRAMEWORK = {
        **REST_FRAMEWORK,
        "DEFAULT_THROTTLE_CLASSES": [],
        "DEFAULT_THROTTLE_RATES": {}
    }

    