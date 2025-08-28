#!/usr/bin/env python
"""
Django管理脚本

用于执行各种Django管理任务
"""
import os
import sys

if __name__ == "__main__":
    # 设置默认的Django设置模块
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")
    
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    
    execute_from_command_line(sys.argv)