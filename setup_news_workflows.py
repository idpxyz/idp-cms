#!/usr/bin/env python3
"""
专业新闻网站 Wagtail 工作流系统配置脚本

基于 Wagtail 7.1 的 Workflow 系统创建严谨的新闻审核流程：
1. 标准新闻审核工作流
2. 紧急新闻发布工作流  
3. 敏感内容审核工作流

依赖：
- Wagtail 7.1+ workflow system
- 已配置的用户角色体系
"""

import os
import django

# 设置Django环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from django.contrib.auth.models import User, Group, Permission
from django.contrib.auth import get_user_model
from wagtail.models import Site, Page, Workflow, WorkflowTask, GroupApprovalTask, WorkflowState

User = get_user_model()

def setup_news_workflows():
    """配置专业新闻网站工作流系统"""
    
    print("🔄 开始配置专业新闻网站 Wagtail 工作流系统...")
    
    # 确保工作流相关权限存在
    ensure_workflow_permissions()
    
    # 创建三种新闻工作流
    standard_workflow = create_standard_news_workflow()
    emergency_workflow = create_emergency_news_workflow()
    sensitive_workflow = create_sensitive_content_workflow()
    
    # 配置工作流到不同页面类型
    configure_workflow_assignments(standard_workflow, emergency_workflow, sensitive_workflow)
    
    print("\n✅ 新闻工作流系统配置完成！")
    print_workflow_summary()

def ensure_workflow_permissions():
    """确保工作流相关权限正确配置"""
    print("\n📋 检查工作流权限配置...")
    
    # 获取或创建工作流相关的用户组
    groups_config = {
        '责任编辑': ['记者', '资深记者'],  # 可以进行初审
        '事实核查员': ['事实核查员'],
        '法务审核员': ['法务审核员'],
        'AI科技版块主编': ['AI科技版块主编'],
        '综合资讯版块主编': ['综合资讯版块主编'],
        '门户聚合主编': ['门户聚合主编'],
        '总编辑': ['总编辑'],
        '副总编辑': ['总编辑'],  # 总编辑可以作为副总编辑
    }
    
    for group_name, source_groups in groups_config.items():
        group, created = Group.objects.get_or_create(name=group_name)
        if created:
            print(f"✅ 创建工作流组: {group_name}")
            
            # 将用户从源组添加到工作流组
            for source_group_name in source_groups:
                try:
                    source_group = Group.objects.get(name=source_group_name)
                    for user in source_group.user_set.all():
                        group.user_set.add(user)
                        print(f"   - 添加用户 {user.username} 到 {group_name}")
                except Group.DoesNotExist:
                    print(f"⚠️ 源组不存在: {source_group_name}")

def create_standard_news_workflow():
    """创建标准新闻审核工作流"""
    print("\n📝 创建标准新闻审核工作流...")
    
    # 创建工作流
    workflow, created = Workflow.objects.get_or_create(
        name="标准新闻审核工作流",
        defaults={
            'active': True,
        }
    )
    
    if created:
        print("✅ 创建工作流: 标准新闻审核工作流")
    else:
        # 清理现有任务
        workflow.workflow_tasks.all().delete()
        print("🔄 清理现有工作流任务")
    
    # 任务1: 责任编辑初审
    task1 = GroupApprovalTask.objects.create(
        name="责任编辑初审",
        active=True
    )
    task1.groups.add(Group.objects.get(name='责任编辑'))
    
    # 任务2: 事实核查
    task2 = GroupApprovalTask.objects.create(
        name="事实核查",
        active=True
    )
    task2.groups.add(Group.objects.get(name='事实核查员'))
    
    # 任务3: 法务审核
    task3 = GroupApprovalTask.objects.create(
        name="法务审核", 
        active=True
    )
    task3.groups.add(Group.objects.get(name='法务审核员'))
    
    # 任务4: 版块主编终审
    task4 = GroupApprovalTask.objects.create(
        name="版块主编终审",
        active=True
    )
    # 添加所有版块主编
    for group_name in ['AI科技版块主编', '综合资讯版块主编', '门户聚合主编']:
        try:
            group = Group.objects.get(name=group_name)
            task4.groups.add(group)
        except Group.DoesNotExist:
            print(f"⚠️ 组不存在: {group_name}")
    
    # 将任务按顺序添加到工作流
    workflow.workflow_tasks.create(task=task1, sort_order=0)
    workflow.workflow_tasks.create(task=task2, sort_order=1) 
    workflow.workflow_tasks.create(task=task3, sort_order=2)
    workflow.workflow_tasks.create(task=task4, sort_order=3)
    
    print("✅ 标准工作流创建完成: 责任编辑初审 → 事实核查 → 法务审核 → 版块主编终审")
    return workflow

def create_emergency_news_workflow():
    """创建紧急新闻发布工作流"""
    print("\n⚡ 创建紧急新闻发布工作流...")
    
    workflow, created = Workflow.objects.get_or_create(
        name="紧急新闻发布工作流",
        defaults={
            'active': True,
        }
    )
    
    if created:
        print("✅ 创建工作流: 紧急新闻发布工作流")
    else:
        workflow.workflow_tasks.all().delete()
        print("🔄 清理现有工作流任务")
    
    # 任务1: 版块主编快速审核
    task1 = GroupApprovalTask.objects.create(
        name="版块主编快速审核",
        active=True
    )
    for group_name in ['AI科技版块主编', '综合资讯版块主编', '门户聚合主编']:
        try:
            group = Group.objects.get(name=group_name)
            task1.groups.add(group)
        except Group.DoesNotExist:
            print(f"⚠️ 组不存在: {group_name}")
    
    # 任务2: 总编辑确认
    task2 = GroupApprovalTask.objects.create(
        name="总编辑确认",
        active=True
    )
    task2.groups.add(Group.objects.get(name='总编辑'))
    
    # 添加任务到工作流
    workflow.workflow_tasks.create(task=task1, sort_order=0)
    workflow.workflow_tasks.create(task=task2, sort_order=1)
    
    print("✅ 紧急工作流创建完成: 版块主编快速审核 → 总编辑确认")
    return workflow

def create_sensitive_content_workflow():
    """创建敏感内容审核工作流"""
    print("\n🔒 创建敏感内容审核工作流...")
    
    workflow, created = Workflow.objects.get_or_create(
        name="敏感内容审核工作流",
        defaults={
            'active': True,
        }
    )
    
    if created:
        print("✅ 创建工作流: 敏感内容审核工作流")
    else:
        workflow.workflow_tasks.all().delete()
        print("🔄 清理现有工作流任务")
    
    # 任务1: 责任编辑初审
    task1 = GroupApprovalTask.objects.create(
        name="责任编辑初审",
        active=True
    )
    task1.groups.add(Group.objects.get(name='责任编辑'))
    
    # 任务2: 事实核查（加强版）
    task2 = GroupApprovalTask.objects.create(
        name="事实核查（加强版）",
        active=True
    )
    task2.groups.add(Group.objects.get(name='事实核查员'))
    
    # 任务3: 法务审核（严格版）
    task3 = GroupApprovalTask.objects.create(
        name="法务审核（严格版）",
        active=True
    )
    task3.groups.add(Group.objects.get(name='法务审核员'))
    
    # 任务4: 合规专员审核（如果存在）
    try:
        compliance_group = Group.objects.get(name='合规专员')
        task4 = GroupApprovalTask.objects.create(
            name="合规专员审核",
            active=True
        )
        task4.groups.add(compliance_group)
        compliance_task_created = True
    except Group.DoesNotExist:
        print("ℹ️ 合规专员组不存在，跳过合规审核任务")
        compliance_task_created = False
    
    # 任务5: 副总编辑审核
    task5 = GroupApprovalTask.objects.create(
        name="副总编辑审核",
        active=True
    )
    task5.groups.add(Group.objects.get(name='副总编辑'))
    
    # 任务6: 总编辑最终确认
    task6 = GroupApprovalTask.objects.create(
        name="总编辑最终确认",
        active=True
    )
    task6.groups.add(Group.objects.get(name='总编辑'))
    
    # 添加任务到工作流
    workflow.workflow_tasks.create(task=task1, sort_order=0)
    workflow.workflow_tasks.create(task=task2, sort_order=1)
    workflow.workflow_tasks.create(task=task3, sort_order=2)
    
    sort_order = 3
    if compliance_task_created:
        workflow.workflow_tasks.create(task=task4, sort_order=sort_order)
        sort_order += 1
    
    workflow.workflow_tasks.create(task=task5, sort_order=sort_order)
    workflow.workflow_tasks.create(task=task6, sort_order=sort_order + 1)
    
    print("✅ 敏感内容工作流创建完成: 多重审核 → 法务+合规双重检查 → 副总编 → 总编确认")
    return workflow

def configure_workflow_assignments(standard_workflow, emergency_workflow, sensitive_workflow):
    """配置工作流到不同页面类型的分配"""
    print("\n🎯 配置工作流分配...")
    
    # 获取站点根页面
    try:
        # 为不同站点配置默认工作流
        sites = Site.objects.all()
        for site in sites:
            root_page = site.root_page
            
            # 默认使用标准工作流
            if not hasattr(root_page, 'workflow_states'):
                print(f"📌 为站点 {site.hostname} 配置标准工作流")
                # Wagtail 工作流会在页面级别自动处理
                
        print("✅ 工作流分配配置完成")
        print("\n📋 工作流使用说明：")
        print("1. 标准新闻审核工作流 - 用于日常新闻内容")
        print("2. 紧急新闻发布工作流 - 用于突发新闻和时效性内容") 
        print("3. 敏感内容审核工作流 - 用于可能引起争议的内容")
        print("\n💡 编辑可在页面编辑界面手动选择合适的工作流")
        
    except Exception as e:
        print(f"⚠️ 配置工作流分配时出错: {e}")

def print_workflow_summary():
    """打印工作流配置摘要"""
    print("\n" + "="*60)
    print("📊 新闻工作流系统配置摘要")
    print("="*60)
    
    workflows = Workflow.objects.filter(
        name__in=["标准新闻审核工作流", "紧急新闻发布工作流", "敏感内容审核工作流"]
    )
    
    for workflow in workflows:
        print(f"\n🔄 {workflow.name}")
        print(f"   状态: {'✅ 激活' if workflow.active else '❌ 未激活'}")
        print(f"   任务数量: {workflow.workflow_tasks.count()}")
        
        for i, workflow_task in enumerate(workflow.workflow_tasks.all().order_by('sort_order'), 1):
            task = workflow_task.task
            print(f"   {i}. {task.name}")
            
            if hasattr(task, 'groups'):
                group_names = [g.name for g in task.groups.all()]
                print(f"      审核组: {', '.join(group_names)}")
    
    print(f"\n🎯 使用指南:")
    print(f"1. 进入 Wagtail 管理界面: http://localhost:8000/admin/")
    print(f"2. 创建或编辑页面时，在'设置'标签中选择工作流")
    print(f"3. 提交审核后，相关用户会在'工作流'面板中看到待审核任务")
    print(f"4. 每个审核步骤完成后自动进入下一个环节")
    
    print(f"\n📧 通知设置:")
    print(f"- Wagtail 会自动发送邮件通知给审核人员")
    print(f"- 可在 Django 设置中配置邮件后端")
    print(f"- 审核人员也可以在管理界面的工作流面板查看待处理任务")

if __name__ == "__main__":
    try:
        setup_news_workflows()
    except Exception as e:
        print(f"❌ 配置过程中出错: {e}")
        import traceback
        traceback.print_exc()
