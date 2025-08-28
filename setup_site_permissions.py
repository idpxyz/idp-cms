#!/usr/bin/env python3
"""
配置多站点权限管理
为不同用户设置特定站点的编辑权限
"""

import os
import sys
import django

# 设置Django环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from django.contrib.auth.models import User, Group
from django.contrib.auth import get_user_model
from wagtail.models import Site, GroupPagePermission, GroupCollectionPermission, Collection
from wagtail.permission_policies import ModelPermissionPolicy
from apps.home.models import HomePage

User = get_user_model()

def create_user_groups():
    """创建用户组"""
    groups_config = [
        {
            'name': 'AI科技站点编辑',
            'description': '可以编辑AI科技站点的内容',
            'site_hostname': 'site-a.local'
        },
        {
            'name': '综合门户编辑',
            'description': '可以编辑综合资讯门户的内容',
            'site_hostname': 'site-b.local'
        },
        {
            'name': '统一门户编辑',
            'description': '可以编辑统一门户的内容',
            'site_hostname': 'portal.local'
        },
        {
            'name': '超级编辑',
            'description': '可以编辑所有站点的内容',
            'site_hostname': 'all'
        }
    ]
    
    created_groups = {}
    
    for group_config in groups_config:
        group, created = Group.objects.get_or_create(
            name=group_config['name']
        )
        if created:
            print(f"✅ 创建用户组: {group.name}")
        else:
            print(f"📝 用户组已存在: {group.name}")
        
        created_groups[group_config['site_hostname']] = group
    
    return created_groups

def setup_page_permissions(groups):
    """设置页面权限"""
    print("\n🔐 设置页面权限...")
    
    # 为每个站点设置权限
    site_permissions = [
        {
            'site_hostname': 'site-a.local',
            'group_key': 'site-a.local',
            'permissions': ['add', 'edit', 'publish', 'lock']
        },
        {
            'site_hostname': 'site-b.local',
            'group_key': 'site-b.local',
            'permissions': ['add', 'edit', 'publish', 'lock']
        },
        {
            'site_hostname': 'portal.local',
            'group_key': 'portal.local',
            'permissions': ['add', 'edit', 'publish', 'lock']
        }
    ]
    
    for perm_config in site_permissions:
        try:
            site = Site.objects.get(hostname=perm_config['site_hostname'])
            group = groups[perm_config['group_key']]
            
            # 为站点根页面设置权限
            for permission_type in perm_config['permissions']:
                page_permission, created = GroupPagePermission.objects.get_or_create(
                    group=group,
                    page=site.root_page,
                    permission_type=permission_type
                )
                if created:
                    print(f"✅ 为 {group.name} 添加了 {permission_type} 权限到 {site.site_name}")
        
        except Site.DoesNotExist:
            print(f"❌ 站点 {perm_config['site_hostname']} 不存在")
        except Exception as e:
            print(f"❌ 设置权限时出错: {e}")
    
    # 为超级编辑组设置所有权限
    if 'all' in groups:
        super_group = groups['all']
        root_page = Site.objects.get(hostname='localhost').root_page
        
        for permission_type in ['add', 'edit', 'publish', 'lock']:
            page_permission, created = GroupPagePermission.objects.get_or_create(
                group=super_group,
                page=root_page,
                permission_type=permission_type
            )
            if created:
                print(f"✅ 为 {super_group.name} 添加了根页面 {permission_type} 权限")

def setup_collection_permissions(groups):
    """设置集合权限（图片、文档等）"""
    print("\n📁 设置集合权限...")
    
    try:
        # 获取根集合
        root_collection = Collection.get_first_root_node()
        
        # 为每个组设置集合权限
        for group_key, group in groups.items():
            if group_key != 'all':
                # 创建站点专属集合
                collection_name = f"{group.name}资源"
                site_collection, created = Collection.objects.get_or_create(
                    name=collection_name,
                    defaults={'path': root_collection._get_children_path_interval(1)[0]}
                )
                
                if created:
                    root_collection.add_child(instance=site_collection)
                    print(f"✅ 创建集合: {collection_name}")
                
                # 设置集合权限
                for permission_type in ['add', 'change', 'delete']:
                    collection_permission, created = GroupCollectionPermission.objects.get_or_create(
                        group=group,
                        collection=site_collection,
                        permission=f'{permission_type}_image'
                    )
                    if created:
                        print(f"✅ 为 {group.name} 添加了 {permission_type}_image 权限")
                
                # 文档权限
                for permission_type in ['add', 'change', 'delete']:
                    collection_permission, created = GroupCollectionPermission.objects.get_or_create(
                        group=group,
                        collection=site_collection,
                        permission=f'{permission_type}_document'
                    )
            else:
                # 超级编辑组获得根集合的所有权限
                for permission_type in ['add', 'change', 'delete']:
                    for resource_type in ['image', 'document']:
                        collection_permission, created = GroupCollectionPermission.objects.get_or_create(
                            group=group,
                            collection=root_collection,
                            permission=f'{permission_type}_{resource_type}'
                        )
                        if created:
                            print(f"✅ 为 {group.name} 添加了根集合 {permission_type}_{resource_type} 权限")
    
    except Exception as e:
        print(f"❌ 设置集合权限时出错: {e}")

def create_demo_users(groups):
    """创建演示用户"""
    print("\n👥 创建演示用户...")
    
    demo_users = [
        {
            'username': 'ai_editor',
            'first_name': '张',
            'last_name': '小明',
            'email': 'ai_editor@example.com',
            'group_key': 'site-a.local',
            'description': 'AI科技站点编辑'
        },
        {
            'username': 'general_editor',
            'first_name': '李',
            'last_name': '小红',
            'email': 'general_editor@example.com', 
            'group_key': 'site-b.local',
            'description': '综合门户编辑'
        },
        {
            'username': 'portal_editor',
            'first_name': '王',
            'last_name': '小强',
            'email': 'portal_editor@example.com',
            'group_key': 'portal.local',
            'description': '统一门户编辑'
        },
        {
            'username': 'super_editor',
            'first_name': '赵',
            'last_name': '管理员',
            'email': 'super_editor@example.com',
            'group_key': 'all',
            'description': '超级编辑'
        }
    ]
    
    for user_config in demo_users:
        try:
            user, created = User.objects.get_or_create(
                username=user_config['username'],
                defaults={
                    'first_name': user_config['first_name'],
                    'last_name': user_config['last_name'],
                    'email': user_config['email'],
                    'is_staff': True,  # 必须是staff才能访问管理界面
                    'is_active': True
                }
            )
            
            if created:
                user.set_password('demo123456')  # 设置默认密码
                user.save()
                print(f"✅ 创建用户: {user.username} ({user_config['description']})")
            else:
                print(f"📝 用户已存在: {user.username}")
            
            # 添加到对应的用户组
            if user_config['group_key'] in groups:
                group = groups[user_config['group_key']]
                user.groups.add(group)
                print(f"   ➡️ 已添加到用户组: {group.name}")
        
        except Exception as e:
            print(f"❌ 创建用户 {user_config['username']} 时出错: {e}")

def display_permission_summary():
    """显示权限配置总结"""
    print("\n📊 权限配置总结:")
    print("=" * 60)
    
    for group in Group.objects.all():
        print(f"\n👥 用户组: {group.name}")
        
        # 显示用户
        users = group.user_set.all()
        if users:
            print(f"   用户: {', '.join([u.username for u in users])}")
        
        # 显示页面权限
        page_perms = GroupPagePermission.objects.filter(group=group)
        if page_perms:
            print(f"   页面权限:")
            for perm in page_perms:
                print(f"     - {perm.page.title}: {perm.permission_type}")
        
        # 显示集合权限
        collection_perms = GroupCollectionPermission.objects.filter(group=group)
        if collection_perms:
            print(f"   集合权限:")
            for perm in collection_perms:
                print(f"     - {perm.collection.name}: {perm.permission}")

def main():
    """主函数"""
    print("🔐 开始配置多站点权限管理...")
    
    # 1. 创建用户组
    groups = create_user_groups()
    
    # 2. 设置页面权限
    setup_page_permissions(groups)
    
    # 3. 设置集合权限
    setup_collection_permissions(groups)
    
    # 4. 创建演示用户
    create_demo_users(groups)
    
    # 5. 显示配置总结
    display_permission_summary()
    
    print("\n🎉 权限配置完成！")
    print("\n💡 测试步骤:")
    print("1. 访问 http://localhost:8000/admin/")
    print("2. 使用以下账号登录测试:")
    print("   - ai_editor / demo123456 (只能编辑AI科技站点)")
    print("   - general_editor / demo123456 (只能编辑综合门户)")  
    print("   - portal_editor / demo123456 (只能编辑统一门户)")
    print("   - super_editor / demo123456 (可以编辑所有站点)")
    print("3. 观察不同用户看到的页面树是否不同")

if __name__ == "__main__":
    main()
