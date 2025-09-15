#!/usr/bin/env python3
"""
创建主题系统数据库迁移

为 SiteSettings 模型添加新的主题相关字段
"""

import os
import sys
import django
from django.conf import settings
from django.core.management import execute_from_command_line

def setup_django():
    """设置 Django 环境"""
    # 添加项目根目录到 Python 路径
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sys.path.insert(0, project_root)
    
    # 设置 Django 设置模块
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'authoring.settings.dev')
    
    # 初始化 Django
    django.setup()

def create_migration():
    """创建迁移文件"""
    print("创建主题系统迁移文件...")
    
    # 创建迁移
    execute_from_command_line([
        'manage.py', 
        'makemigrations', 
        'core',
        '--name', 'add_theme_fields',
        '--verbosity', '2'
    ])
    
    print("迁移文件创建完成！")

def apply_migration():
    """应用迁移"""
    print("应用迁移到数据库...")
    
    execute_from_command_line([
        'manage.py',
        'migrate',
        'core',
        '--verbosity', '2'
    ])
    
    print("迁移应用完成！")

def main():
    """主函数"""
    setup_django()
    
    if len(sys.argv) > 1 and sys.argv[1] == '--apply':
        # 应用迁移
        apply_migration()
    else:
        # 创建迁移
        create_migration()
        
        # 询问是否立即应用
        apply = input("\n是否立即应用迁移到数据库？(y/N): ").lower().strip()
        if apply in ['y', 'yes']:
            apply_migration()
        else:
            print("\n迁移文件已创建，您可以稍后运行以下命令应用迁移：")
            print("python manage.py migrate core")

if __name__ == '__main__':
    main()
