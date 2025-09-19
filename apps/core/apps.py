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
        # 媒体相关信号：用于修复 c0-uncategorized 的缩略图
        try:
            from . import signals_media
        except ImportError:
            pass
        
        # 导入 Site 模型扩展
        from .models.site import Site
        
        # 配置jieba缓存目录（仅设置缓存路径，不初始化）
        try:
            from .jieba_config import configure_jieba
            configure_jieba()
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"jieba配置失败: {e}")
        
        # 已移除：Collection 扩展 hooks