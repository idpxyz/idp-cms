"""
WSGI配置

用于部署Django应用的WSGI接口
"""

import os
from django.core.wsgi import get_wsgi_application

# 设置Django设置模块
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.prod")

# 获取WSGI应用
application = get_wsgi_application()