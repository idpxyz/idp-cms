from django.apps import AppConfig


class WebUsersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.web_users'
    verbose_name = '网站用户管理'
    
    def ready(self):
        """应用准备就绪时导入信号处理器"""
        import apps.web_users.signals
