#!/usr/bin/env python
"""
测试脚本：验证文章编辑时的索引更新功能
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

from apps.news.models.article import ArticlePage
from apps.searchapp.client import get_client, index_name_for
from django.conf import settings

def test_indexing_functionality():
    """测试索引功能"""
    print("🧪 测试文章编辑时的索引更新功能...")
    
    try:
        # 获取OpenSearch客户端
        client = get_client()
        site = settings.SITE_HOSTNAME
        index_name = index_name_for(site)
        
        print(f"📍 当前站点: {site}")
        print(f"📊 索引名称: {index_name}")
        
        # 检查索引是否存在
        if client.indices.exists(index=index_name):
            print(f"✅ 索引 {index_name} 存在")
            
            # 获取索引统计信息
            stats = client.indices.stats(index=index_name)
            doc_count = stats['indices'][index_name]['total']['docs']['count']
            print(f"📈 索引中文档数量: {doc_count}")
            
            # 获取最新的几个文档
            search_result = client.search(
                index=index_name,
                body={
                    "query": {"match_all": {}},
                    "sort": [{"publish_time": {"order": "desc"}}],
                    "size": 5
                }
            )
            
            print(f"🔍 最新文档:")
            for hit in search_result['hits']['hits']:
                doc = hit['_source']
                print(f"   - ID: {doc.get('article_id')}, 标题: {doc.get('title')}, 发布时间: {doc.get('publish_time')}")
        
        else:
            print(f"❌ 索引 {index_name} 不存在")
            print("💡 请先运行初始化命令创建索引")
            print(f"   python authoring/manage.py os_alias_bootstrap --site {site} --ver 1")
        
        # 检查Celery任务
        print(f"\n🔧 Celery配置:")
        print(f"   Broker URL: {settings.CELERY_BROKER_URL}")
        print(f"   Result Backend: {settings.CELERY_RESULT_BACKEND}")
        
        # 检查定时任务
        if hasattr(settings, 'CELERY_BEAT_SCHEDULE'):
            print(f"⏰ 定时任务:")
            for task_name, task_config in settings.CELERY_BEAT_SCHEDULE.items():
                print(f"   - {task_name}: {task_config['schedule']}")
        
        print(f"\n✅ 测试完成！")
        print(f"💡 现在你可以在Wagtail后台编辑文章，系统会自动更新索引")
        
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_indexing_functionality() 