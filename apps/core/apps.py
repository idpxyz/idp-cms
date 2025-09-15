"""
Core app configuration
"""
from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.core'
    verbose_name = '核心功能'
    
    def ready(self):
        """应用准备就绪时的初始化"""
        # 导入信号处理器（如果存在）
        try:
            from . import signals
        except ImportError:
            pass
        
        # 导入 Site 模型扩展
        from .models.site import Site