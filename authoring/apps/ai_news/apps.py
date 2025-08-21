from django.apps import AppConfig
import os

class AiNewsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.ai_news'
    verbose_name = 'AI资讯管理'
    
    # 解决Docker容器中的路径冲突问题
    path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'ai_news')
