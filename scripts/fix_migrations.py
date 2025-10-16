#!/usr/bin/env python
"""
修复已知的迁移冲突
在全新部署时自动处理 core 应用的迁移历史问题
"""
import os
import sys
import django

# 设置 Django 环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.prod')
django.setup()

from django.db import connection
from django.db.migrations.recorder import MigrationRecorder

def fix_collection_extension_migrations():
    """
    修复 CollectionExtension 相关的迁移冲突
    
    问题：0025 和 0026 都试图创建同一个表，然后 0027-0030 删除它
    解决：检查表是否存在，如果存在则直接标记这些迁移为已完成
    """
    recorder = MigrationRecorder(connection)
    
    # 检查表是否存在
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'core_collectionextension'
            );
        """)
        table_exists = cursor.fetchone()[0]
    
    # 需要处理的迁移
    migrations_to_fake = [
        ('core', '0026_add_collection_extension'),
        ('core', '0027_remove_collection_extension'),
        ('core', '0028_delete_collectionextension'),
        ('core', '0029_cleanup_collectionextension_contenttype'),
        ('core', '0030_delete_collectionextension'),
    ]
    
    # 检查哪些迁移已应用
    applied = set(recorder.applied_migrations())
    
    if table_exists:
        print("✓ 发现 core_collectionextension 表已存在")
        print("  标记冲突的迁移为已完成...")
        
        for app, name in migrations_to_fake:
            if (app, name) not in applied:
                recorder.record_applied(app, name)
                print(f"  ✓ 已标记: {app}.{name}")
            else:
                print(f"  - 已存在: {app}.{name}")
    else:
        print("✓ 表不存在，迁移将正常运行")
    
    print("\n✅ 迁移冲突修复完成")

if __name__ == '__main__':
    try:
        fix_collection_extension_migrations()
        sys.exit(0)
    except Exception as e:
        print(f"❌ 错误: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)

