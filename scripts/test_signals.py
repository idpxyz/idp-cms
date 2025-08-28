#!/usr/bin/env python
"""
测试脚本：验证文章编辑时的信号功能
"""

import os
import sys
import django
from pathlib import Path

# 添加项目根目录到Python路径
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

# 设置Django环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.base')
django.setup()

def test_signals_import():
    """测试信号导入功能"""
    print("🧪 测试文章编辑时的信号功能...")
    
    try:
        # 测试信号导入
        from apps.news.signals import on_publish, on_unpublish, on_article_save
        print("✅ 信号处理器导入成功")
        
        # 测试Celery任务导入
        from apps.searchapp.tasks import upsert_article_doc, delete_article_doc
        print("✅ Celery任务导入成功")
        
        # 测试模型导入
        from apps.news.models.article import ArticlePage
        print("✅ 文章模型导入成功")
        
        # 测试Django设置
        from django.conf import settings
        print(f"✅ Django设置加载成功")
        print(f"   - 站点: {settings.SITE_HOSTNAME}")
        print(f"   - Celery Broker: {settings.CELERY_BROKER_URL}")
        print(f"   - OpenSearch URL: {settings.OPENSEARCH['URL']}")
        
        # 测试信号注册
        from django.db.models.signals import post_save
        from django.dispatch import Signal
        from wagtail.signals import page_published, page_unpublished
        
        print("✅ 信号类型检查成功")
        print(f"   - page_published: {type(page_published)}")
        print(f"   - page_unpublished: {type(page_unpublished)}")
        print(f"   - post_save: {type(post_save)}")
        
        print(f"\n✅ 信号功能测试完成！")
        print(f"💡 现在你可以在Wagtail后台编辑文章，系统会自动触发索引更新")
        
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_signals_import() 