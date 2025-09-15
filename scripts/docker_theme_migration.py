#!/usr/bin/env python3
"""
Docker 环境下的主题迁移脚本

为容器化环境优化的数据库迁移工具
"""

import os
import sys
import django
from django.conf import settings
from django.core.management import call_command

# 容器环境配置
DJANGO_SETTINGS_MODULE = os.getenv('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', DJANGO_SETTINGS_MODULE)

# 初始化 Django
django.setup()

def create_theme_migration():
    """创建主题相关的数据库迁移"""
    print("🐳 Docker环境 - 正在为 apps.core 应用创建数据库迁移文件...")
    
    try:
        # 检查是否在容器环境中
        if os.path.exists('/.dockerenv'):
            print("✅ 检测到 Docker 容器环境")
        else:
            print("⚠️  未检测到 Docker 环境，继续执行...")
        
        # 创建迁移文件
        call_command('makemigrations', 'core', verbosity=2)
        print("✅ 数据库迁移文件创建成功。")
        
        # 显示迁移状态
        print("\n📋 当前迁移状态:")
        call_command('showmigrations', 'core')
        
        print("\n🚀 下一步:")
        print("1. 检查生成的迁移文件")
        print("2. 在容器中运行: docker-compose exec web python manage.py migrate")
        print("3. 或使用管理脚本: docker-compose exec web python scripts/docker_theme_migration.py --apply")
        
    except Exception as e:
        print(f"❌ 创建数据库迁移文件失败: {e}")
        sys.exit(1)

def apply_migrations():
    """应用数据库迁移"""
    print("🐳 Docker环境 - 正在应用数据库迁移...")
    
    try:
        call_command('migrate', verbosity=2)
        print("✅ 数据库迁移应用成功。")
    except Exception as e:
        print(f"❌ 应用数据库迁移失败: {e}")
        sys.exit(1)

def check_migrations():
    """检查迁移状态"""
    print("🐳 Docker环境 - 检查迁移状态...")
    
    try:
        call_command('showmigrations')
    except Exception as e:
        print(f"❌ 检查迁移状态失败: {e}")
        sys.exit(1)

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Docker环境主题迁移工具')
    parser.add_argument('--apply', action='store_true', help='应用迁移')
    parser.add_argument('--check', action='store_true', help='检查迁移状态')
    
    args = parser.parse_args()
    
    if args.apply:
        apply_migrations()
    elif args.check:
        check_migrations()
    else:
        create_theme_migration()
