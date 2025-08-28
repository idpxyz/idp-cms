"""
ASGI配置

用于部署Django应用的ASGI接口，支持WebSockets等异步功能
"""

import os
from django.core.asgi import get_asgi_application

# 设置Django设置模块
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.prod")

# 获取ASGI应用
application = get_asgi_application()