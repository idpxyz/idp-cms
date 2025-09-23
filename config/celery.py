import os
import sys
from celery import Celery
from celery.schedules import crontab

# Get the project root directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Add the project root to Python path
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

# Set the default Django settings module
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.base")

# Create the Celery app
app = Celery("idp_cms")

# Load configuration from Django settings
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks in all registered Django apps
app.autodiscover_tasks()

# Explicitly register task modules
app.autodiscover_tasks(['apps.searchapp', 'apps.core'])

# 确保所有任务都绑定到正确的应用
from celery import current_app
current_app.conf.update(app.conf)

# 配置 Celery Beat 的调度文件到可写目录，避免权限问题
_beat_file = os.environ.get("CELERY_BEAT_SCHEDULE_FILE", "/tmp/celerybeat-schedule")
try:
    os.makedirs(os.path.dirname(_beat_file), exist_ok=True)
except Exception:
    pass
app.conf.beat_schedule_filename = _beat_file

# 📊 热度标记定时任务配置
app.conf.beat_schedule = {
    # 每10分钟快速刷新热点文章（最近1小时）
    'refresh-hot-trending-fast': {
        'task': 'apps.core.tasks.hotness_tagging.refresh_hot_trending_articles',
        'schedule': 600.0,  # 10分钟
        'kwargs': {'site': os.environ.get('SITE_HOSTNAME', 'localhost')}
    },
    
    # 每30分钟全面更新热度标记（最近24小时）
    'update-hotness-tags': {
        'task': 'apps.core.tasks.hotness_tagging.update_article_hotness_tags',
        'schedule': 1800.0,  # 30分钟
        'kwargs': {'site': os.environ.get('SITE_HOSTNAME', 'localhost'), 'hours_back': 24, 'batch_size': 100}
    },
    
    # 每天凌晨3点清理过期热度标记
    'daily-hotness-cleanup': {
        'task': 'apps.core.tasks.hotness_tagging.daily_hotness_cleanup',
        'schedule': crontab(hour=3, minute=0),  # 每天3:00
        'kwargs': {'site': os.environ.get('SITE_HOSTNAME', 'localhost')}
    },
    
    # 每小时同步社交指标数据
    'sync-social-metrics': {
        'task': 'apps.core.tasks.social_sync.sync_social_metrics_task',
        'schedule': 3600.0,  # 1小时
        'kwargs': {'site': os.environ.get('SITE_HOSTNAME', 'localhost'), 'hours_back': 2}
    },
    
    # 原有的任务保持不变...
}

@app.task(bind=True)
def debug_task(self):
    print(f"Request: {self.request!r}")
