#!/usr/bin/env python3
"""
专业新闻网站角色权限体系配置
基于新闻行业最佳实践设计的完整角色权限系统
"""

import os
import sys
import django

# 设置Django环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from django.contrib.auth.models import User, Group, Permission
from django.contrib.auth import get_user_model
from wagtail.models import Site, GroupPagePermission, GroupCollectionPermission, Collection

User = get_user_model()

def create_news_roles():
    """创建专业新闻网站角色体系"""
    
    # 新闻网站角色配置
    news_roles = [
        # 管理层
        {
            'name': '总编辑',
            'description': '整体内容战略，重大稿件审批',
            'permissions': ['add', 'change', 'delete', 'publish', 'lock', 'view'],
            'scope': 'global',
            'priority': 1
        },
        {
            'name': '副总编辑',
            'description': '协助总编，分管特定版块',
            'permissions': ['add', 'change', 'publish', 'lock', 'view'],
            'scope': 'section',
            'priority': 2
        },
        
        # 编辑层
        {
            'name': 'AI科技版块主编',
            'description': 'AI科技版块内容规划和审批',
            'permissions': ['add', 'change', 'publish', 'view'],
            'scope': 'site-a.local',
            'priority': 3
        },
        {
            'name': '综合资讯版块主编', 
            'description': '综合资讯版块内容规划和审批',
            'permissions': ['add', 'change', 'publish', 'view'],
            'scope': 'site-b.local',
            'priority': 3
        },
        {
            'name': '门户聚合主编',
            'description': '统一门户内容策划和审批',
            'permissions': ['add', 'change', 'publish', 'view'],
            'scope': 'portal.local',
            'priority': 3
        },
        {
            'name': '责任编辑',
            'description': '日常稿件编辑，事实核查',
            'permissions': ['add', 'change', 'view'],
            'scope': 'section',
            'priority': 4
        },
        {
            'name': '文字编辑',
            'description': '文字润色，格式规范',
            'permissions': ['change', 'view'],
            'scope': 'section',
            'priority': 5
        },
        
        # 内容创作层
        {
            'name': '资深记者',
            'description': '高级记者，可独立发布一般稿件',
            'permissions': ['add', 'change', 'view'],
            'scope': 'section',
            'priority': 6,
            'auto_publish': True  # 特殊标记：可自动发布一般稿件
        },
        {
            'name': '记者',
            'description': '新闻采写，现场报道',
            'permissions': ['add', 'change', 'view'],
            'scope': 'section',
            'priority': 7
        },
        {
            'name': '实习记者',
            'description': '实习阶段，需要指导',
            'permissions': ['add', 'view'],
            'scope': 'section',
            'priority': 8
        },
        {
            'name': '特约撰稿人',
            'description': '外部专家，专业领域内容创作',
            'permissions': ['add', 'view'],
            'scope': 'limited',
            'priority': 9
        },
        
        # 质量控制层
        {
            'name': '事实核查员',
            'description': '信息真实性验证，稿件标记',
            'permissions': ['view', 'change'],
            'scope': 'global',
            'priority': 10,
            'special_role': 'fact_checker'
        },
        {
            'name': '法务审核员',
            'description': '法律风险评估，合规审核',
            'permissions': ['view', 'change'],
            'scope': 'global',
            'priority': 11,
            'special_role': 'legal_reviewer'
        },
        {
            'name': '合规专员',
            'description': '监管政策合规检查',
            'permissions': ['view', 'change'],
            'scope': 'global',
            'priority': 12,
            'special_role': 'compliance_officer'
        },
        
        # 技术支持层
        {
            'name': '网站管理员',
            'description': '系统维护，权限管理',
            'permissions': ['add', 'change', 'delete', 'publish', 'lock', 'view'],
            'scope': 'global',
            'priority': 0,  # 最高优先级
            'technical_role': True
        },
        {
            'name': 'SEO专员',
            'description': '搜索优化，流量分析',
            'permissions': ['change', 'view'],
            'scope': 'global',
            'priority': 13,
            'special_role': 'seo_specialist'
        },
        
        # 运营支持层
        {
            'name': '社交媒体管理员',
            'description': '社交平台内容发布',
            'permissions': ['view'],
            'scope': 'global',
            'priority': 14,
            'special_role': 'social_media'
        },
        {
            'name': '数据分析师',
            'description': '用户行为分析，效果评估',
            'permissions': ['view'],
            'scope': 'global',
            'priority': 15,
            'special_role': 'data_analyst'
        }
    ]
    
    return news_roles

def setup_role_permissions(roles):
    """设置角色权限"""
    print('🔐 配置专业新闻网站角色权限...')
    
    # 获取页面权限对象
    page_permissions = {
        'add': Permission.objects.get(codename='add_page'),
        'change': Permission.objects.get(codename='change_page'),
        'delete': Permission.objects.get(codename='delete_page'),
        'publish': Permission.objects.get(codename='publish_page'),
        'lock': Permission.objects.get(codename='lock_page'),
        'view': Permission.objects.get(codename='view_page')
    }
    
    created_groups = {}
    
    for role in roles:
        # 创建用户组
        group, created = Group.objects.get_or_create(name=role['name'])
        if created:
            print(f'✅ 创建角色: {role["name"]} - {role["description"]}')
        else:
            print(f'📝 角色已存在: {role["name"]}')
        
        created_groups[role['name']] = group
        
        # 设置权限范围
        if role['scope'] == 'global':
            # 全局权限（根页面）
            root_page = Site.objects.get(hostname='localhost').root_page
            target_pages = [root_page]
        elif role['scope'] in ['site-a.local', 'site-b.local', 'portal.local']:
            # 特定站点权限
            site = Site.objects.get(hostname=role['scope'])
            target_pages = [site.root_page]
        elif role['scope'] == 'section':
            # 所有站点权限（用于可以跨站点工作的角色）
            target_pages = []
            for site in Site.objects.exclude(hostname='localhost'):
                target_pages.append(site.root_page)
        else:
            # 受限权限（特约撰稿人等）
            target_pages = []
        
        # 应用权限到页面
        for page in target_pages:
            # 清除现有权限避免重复
            GroupPagePermission.objects.filter(group=group, page=page).delete()
            
            # 设置新权限
            for perm_name in role['permissions']:
                permission = page_permissions[perm_name]
                GroupPagePermission.objects.create(
                    group=group,
                    page=page,
                    permission=permission
                )
            
            print(f'  ➡️ 为 {role["name"]} 设置了 {page.title} 的权限: {", ".join(role["permissions"])}')
    
    return created_groups

def create_demo_users(groups):
    """创建演示用户"""
    print('\\n👥 创建新闻网站演示用户...')
    
    demo_users = [
        # 管理层
        {'username': 'editor_chief', 'name': '王总编', 'role': '总编辑', 'password': 'chief123'},
        {'username': 'deputy_editor', 'name': '李副总', 'role': '副总编辑', 'password': 'deputy123'},
        
        # 版块主编
        {'username': 'ai_chief_editor', 'name': '张主编', 'role': 'AI科技版块主编', 'password': 'ai123'},
        {'username': 'general_chief_editor', 'name': '陈主编', 'role': '综合资讯版块主编', 'password': 'general123'},
        {'username': 'portal_chief_editor', 'name': '刘主编', 'role': '门户聚合主编', 'password': 'portal123'},
        
        # 编辑记者
        {'username': 'senior_reporter', 'name': '赵记者', 'role': '资深记者', 'password': 'senior123'},
        {'username': 'reporter01', 'name': '孙记者', 'role': '记者', 'password': 'reporter123'},
        {'username': 'intern_reporter', 'name': '周实习', 'role': '实习记者', 'password': 'intern123'},
        
        # 质量控制
        {'username': 'fact_checker', 'name': '吴核查', 'role': '事实核查员', 'password': 'fact123'},
        {'username': 'legal_reviewer', 'name': '郑律师', 'role': '法务审核员', 'password': 'legal123'},
        
        # 技术运营
        {'username': 'site_admin', 'name': '技术管理员', 'role': '网站管理员', 'password': 'admin123'},
        {'username': 'seo_specialist', 'name': 'SEO专员', 'role': 'SEO专员', 'password': 'seo123'}
    ]
    
    for user_config in demo_users:
        try:
            user, created = User.objects.get_or_create(
                username=user_config['username'],
                defaults={
                    'first_name': user_config['name'],
                    'email': f'{user_config["username"]}@newssite.com',
                    'is_staff': True,
                    'is_active': True
                }
            )
            
            if created:
                user.set_password(user_config['password'])
                user.save()
                print(f'✅ 创建用户: {user.username} ({user_config["name"]}) - {user_config["role"]}')
            else:
                print(f'📝 用户已存在: {user.username}')
            
            # 添加到对应角色组
            if user_config['role'] in groups:
                group = groups[user_config['role']]
                user.groups.add(group)
        
        except Exception as e:
            print(f'❌ 创建用户 {user_config["username"]} 时出错: {e}')

def display_role_summary():
    """显示角色配置总结"""
    print('\\n📊 新闻网站角色权限总结')
    print('=' * 70)
    
    # 按优先级排序显示
    for group in Group.objects.all().order_by('name'):
        print(f'\\n👥 角色: {group.name}')
        
        # 显示用户
        users = group.user_set.all()
        if users:
            user_list = [f'{u.username}({u.first_name})' for u in users]
            print(f'   用户: {", ".join(user_list)}')
        
        # 显示权限范围
        page_perms = GroupPagePermission.objects.filter(group=group)
        if page_perms:
            print(f'   权限范围:')
            for perm in page_perms.distinct('page'):
                permissions = page_perms.filter(page=perm.page)
                perm_names = [p.permission.name for p in permissions]
                print(f'     - {perm.page.title}: {", ".join(perm_names)}')

def main():
    """主函数"""
    print('📰 开始配置专业新闻网站角色权限体系...')
    
    # 1. 创建角色配置
    roles = create_news_roles()
    
    # 2. 设置角色权限
    groups = setup_role_permissions(roles)
    
    # 3. 创建演示用户
    create_demo_users(groups)
    
    # 4. 显示配置总结
    display_role_summary()
    
    print('\\n🎉 专业新闻网站角色权限体系配置完成！')
    
    print('\\n📋 工作流程建议:')
    print('=' * 50)
    print('📝 标准发布流程:')
    print('   记者创作 → 责任编辑初审 → 事实核查 → 法务审核 → 主编审批 → 发布')
    print('\\n⚡ 紧急新闻流程:')
    print('   记者/编辑 → 主编快速审核 → 总编辑确认 → 立即发布 → 事后补充审核')
    print('\\n🔒 敏感内容流程:')
    print('   创作 → 多重审核 → 法务+合规双重检查 → 副总编审核 → 总编确认 → 发布')
    
    print('\\n💡 测试账号 (用户名/密码):')
    print('=' * 50)
    print('👑 editor_chief / chief123     (总编辑)')
    print('🎯 ai_chief_editor / ai123     (AI科技版块主编)')
    print('✍️ senior_reporter / senior123  (资深记者)')
    print('🔍 fact_checker / fact123      (事实核查员)')
    print('⚖️ legal_reviewer / legal123   (法务审核员)')
    print('🛠️ site_admin / admin123       (网站管理员)')

if __name__ == "__main__":
    main()
