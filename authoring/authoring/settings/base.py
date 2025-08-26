import os
import sys
from pathlib import Path
from datetime import timedelta

# Get the project root directory
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Add the project root to Python path for Docker container
# if str(BASE_DIR) not in sys.path:
#     sys.path.insert(0, str(BASE_DIR))

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY","dev-secret")
DEBUG = int(os.getenv("DJANGO_DEBUG","1")) == 1
ALLOWED_HOSTS = os.getenv("DJANGO_ALLOWED_HOSTS","*").split(",")

INSTALLED_APPS = [
    "django.contrib.admin","django.contrib.auth","django.contrib.contenttypes",
    "django.contrib.sessions","django.contrib.messages","django.contrib.staticfiles",
    # Wagtail - Core apps (workflow is built-in to wagtail core in 7.1)
    "wagtail","wagtail.admin","wagtail.users","wagtail.documents","wagtail.images",
    "wagtail.snippets","wagtail.sites","wagtail.contrib.settings",
    "modelcluster","taggit",
    # 3rd
    "rest_framework",
    "corsheaders",  # Add CORS support
    # Apps
    "apps.core",
    "apps.home",
    "apps.news",
    "apps.searchapp",
    "apps.api",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",  # Add CORS middleware
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    # "wagtail.contrib.redirects.middleware.RedirectMiddleware",  # Commented out since app not installed
]

ROOT_URLCONF = "authoring.urls"
TEMPLATES = [{
    "BACKEND":"django.template.backends.django.DjangoTemplates",
    "DIRS":[BASE_DIR / "authoring" / "templates"],
    "APP_DIRS":True,
    "OPTIONS":{"context_processors":[
        "django.template.context_processors.debug",
        "django.template.context_processors.request",
        "django.contrib.auth.context_processors.auth",
        "django.contrib.messages.context_processors.messages",
    ]},
}]
WSGI_APPLICATION = "authoring.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("POSTGRES_DB","news"),
        "USER": os.getenv("POSTGRES_USER","news"),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD","news"),
        "HOST": os.getenv("POSTGRES_HOST","postgres"),
        "PORT": int(os.getenv("POSTGRES_PORT","5432")),
    }
}

# 优化缓存配置
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": os.getenv("REDIS_URL", "redis://redis:6379/1"),
        "KEY_PREFIX": "idp_cms",
        "TIMEOUT": 300,  # 默认5分钟超时
        "VERSION": 1,
    },
    "api": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": os.getenv("REDIS_URL", "redis://redis:6379/1"),
        "KEY_PREFIX": "idp_cms_api",
        "TIMEOUT": 600,  # API缓存10分钟超时
        "VERSION": 1,
    }
}

# 缓存中间件配置
CACHE_MIDDLEWARE_SECONDS = 300  # 5分钟
CACHE_MIDDLEWARE_KEY_PREFIX = "idp_cms_middleware"
CACHE_MIDDLEWARE_ALIAS = "default"

LANGUAGE_CODE = "zh-hans"
TIME_ZONE = os.getenv("DJANGO_TIME_ZONE","Asia/Shanghai")  # 默认使用中国时区
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "static"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# MinIO / S3
if os.getenv("MINIO_ENDPOINT"):
    DEFAULT_FILE_STORAGE = "storages.backends.s3boto3.S3Boto3Storage"
    AWS_S3_ENDPOINT_URL = os.getenv("MINIO_ENDPOINT")
    AWS_ACCESS_KEY_ID = os.getenv("MINIO_ACCESS_KEY")
    AWS_SECRET_ACCESS_KEY = os.getenv("MINIO_SECRET_KEY")
    AWS_STORAGE_BUCKET_NAME = os.getenv("MINIO_BUCKET","media")
    AWS_S3_SIGNATURE_VERSION = "s3v4"
    AWS_S3_ADDRESSING_STYLE = "virtual"

WAGTAIL_SITE_NAME = "News SaaS"
WAGTAILADMIN_BASE_URL = "http://localhost:8000"

REST_FRAMEWORK = {"DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"]}

CELERY_BROKER_URL = os.getenv("REDIS_URL","redis://redis:6379/1")
CELERY_RESULT_BACKEND = os.getenv("REDIS_URL","redis://redis:6379/1")

# Celery时区配置
CELERY_TIMEZONE = TIME_ZONE  # 使用Django的时区设置
CELERY_ENABLE_UTC = False    # 禁用UTC，使用本地时区

CELERY_BEAT_SCHEDULE = {
    "update-ctr-features-every-minute": {
        "task": "apps.searchapp.tasks.update_ctr_features",
        "schedule": timedelta(minutes=1),
        "args": []
    }
}

OPENSEARCH = {
    "URL": os.getenv("OPENSEARCH_URL","http://opensearch:9200"),
    "USERNAME": os.getenv("OPENSEARCH_USERNAME","admin"),
    "PASSWORD": os.getenv("OPENSEARCH_PASSWORD","OpenSearch2024!@#$%"),
}

# Fix for Wagtail 7.1 PostgreSQL search backend bug
# Use database backend with disabled full-text search to avoid weights bug
WAGTAILSEARCH_BACKENDS = {
    'default': {
        'BACKEND': 'wagtail.search.backends.database',
        'SEARCH_CONFIG': None,  # Disable PostgreSQL full-text search to avoid weights bug
    }
}

CLICKHOUSE_URL = os.getenv("CLICKHOUSE_URL","clickhouse://default:thends@clickhouse:9000/default")
SITE_HOSTNAME = os.getenv("SITE_HOSTNAME","localhost")

# 多站点配置
MULTI_SITE_ENABLED = True
DEFAULT_SITE_IDENTIFIER = "localhost"

# CSRF配置 - 允许前端域名
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]

# 开发环境CSRF设置
CSRF_COOKIE_SECURE = False  # 开发环境设为False
CSRF_COOKIE_HTTPONLY = False  # 允许JavaScript访问
CSRF_USE_SESSIONS = False  # 使用cookie而不是session

# 开发环境：禁用CSRF保护（仅用于开发）
CSRF_COOKIE_SECURE = False
CSRF_COOKIE_HTTPONLY = False
CSRF_USE_SESSIONS = False

# CORS settings
CORS_ALLOW_ALL_ORIGINS = os.getenv("CORS_ALLOW_ALL_ORIGINS", "True").lower() == "true"  # For development only
CORS_ALLOW_CREDENTIALS = True

# Allow specific origins if CORS_ALLOW_ALL_ORIGINS is False
if not CORS_ALLOW_ALL_ORIGINS:
    CORS_ALLOWED_ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000").split(",")

CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
    "x-ab-session",  # Allow our custom header (lowercase)
    "x-site-id",     # Allow site identification header
]
