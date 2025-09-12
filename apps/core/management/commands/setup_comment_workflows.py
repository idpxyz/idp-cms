from django.contrib.auth.models import Group
from wagtail.models import Workflow, GroupApprovalTask

def setup_comment_workflows():
    """设置评论审核工作流"""
    print("\n📝 创建评论审核工作流...")
    
    # 创建评论审核工作流
    workflow, created = Workflow.objects.get_or_create(
        name="评论审核工作流",
        defaults={
            'active': True,
        }
    )
    
    if created:
        print("✅ 创建工作流: 评论审核工作流")
    else:
        workflow.workflow_tasks.all().delete()
        print("🔄 清理现有工作流任务")
    
    # 任务1: 垃圾评论筛查
    task1 = GroupApprovalTask.objects.create(
        name="垃圾评论筛查",
        active=True
    )
    
    # 确保有垃圾评论审核组
    spam_review_group, _ = Group.objects.get_or_create(name='垃圾评论审核员')
    task1.groups.add(spam_review_group)
    
    # 任务2: 内容审核
    task2 = GroupApprovalTask.objects.create(
        name="评论内容审核",
        active=True
    )
    
    # 确保有评论审核组
    comment_review_group, _ = Group.objects.get_or_create(name='评论审核员')
    task2.groups.add(comment_review_group)
    
    # 添加任务到工作流
    workflow.workflow_tasks.create(task=task1, sort_order=0)
    workflow.workflow_tasks.create(task=task2, sort_order=1)
    
    print("✅ 评论审核工作流创建完成: 垃圾评论筛查 → 评论内容审核")
    return workflow

if __name__ == "__main__":
    try:
        setup_comment_workflows()
    except Exception as e:
        print(f"❌ 配置过程中出错: {e}")
        import traceback
        traceback.print_exc()
