import os
import sys
from celery import Celery

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
app.autodiscover_tasks(['apps.searchapp'])

# 确保所有任务都绑定到正确的应用
from celery import current_app
current_app.conf.update(app.conf)

@app.task(bind=True)
def debug_task(self):
    print(f"Request: {self.request!r}")
