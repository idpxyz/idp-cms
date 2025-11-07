"""
Celery 任务 - 文章定时发布
"""
from celery import shared_task
from django.utils import timezone
from django.db import transaction
import logging

logger = logging.getLogger(__name__)


@shared_task(name='news.publish_scheduled_articles')
def publish_scheduled_articles():
    """
    定时任务：检查并发布已到发布时间的文章
    
    每分钟执行一次，检查所有：
    1. 未发布（live=False）的文章
    2. 设置了 publish_at 字段
    3. publish_at 时间已到或已过
    
    自动发布这些文章
    """
    from apps.news.models import ArticlePage
    
    now = timezone.now()
    
    # 查找所有需要发布的文章
    articles_to_publish = ArticlePage.objects.filter(
        live=False,  # 未发布
        publish_at__isnull=False,  # 设置了发布时间
        publish_at__lte=now  # 发布时间已到
    ).select_related('owner')
    
    published_count = 0
    failed_count = 0
    
    for article in articles_to_publish:
        try:
            with transaction.atomic():
                # 🔐 检查用户是否有发布权限
                user = article.owner
                if not user:
                    logger.warning(
                        f'⚠️ 跳过文章（无作者）: ID={article.id}, 标题=《{article.title}》'
                    )
                    failed_count += 1
                    continue
                
                # 检查用户是否有发布权限
                # 超级管理员或有publish权限的用户可以直接发布
                has_publish_permission = (
                    user.is_superuser or
                    user.has_perm('wagtailadmin.access_admin') and
                    user.page_permissions.filter(
                        page=article,
                        permission_type='publish'
                    ).exists()
                )
                
                if not has_publish_permission:
                    # 用户没有发布权限，提交到工作流（如果有）
                    workflow = article.get_workflow()
                    if workflow:
                        logger.info(
                            f'⏳ 文章提交到工作流: ID={article.id}, '
                            f'标题=《{article.title}》, '
                            f'作者={user.username} (无发布权限)'
                        )
                        # 提交到工作流
                        workflow.start(article, user=user)
                        # 清除定时发布时间（已提交工作流）
                        article.publish_at = None
                        article.save(update_fields=['publish_at'])
                        published_count += 1
                    else:
                        logger.warning(
                            f'⚠️ 跳过文章（用户无发布权限且无工作流）: '
                            f'ID={article.id}, 标题=《{article.title}》, '
                            f'作者={user.username}'
                        )
                        # 清除定时发布时间（避免重复尝试）
                        article.publish_at = None
                        article.save(update_fields=['publish_at'])
                        failed_count += 1
                    continue
                
                # 用户有发布权限，正常发布
                revision = article.get_latest_revision()
                if revision:
                    # 发布最新修订版本
                    revision.publish(user=user)
                    logger.info(
                        f'✅ 自动发布文章成功: ID={article.id}, '
                        f'标题=《{article.title}》, '
                        f'计划发布时间={article.publish_at}, '
                        f'作者={user.username}'
                    )
                    published_count += 1
                else:
                    # 没有修订版本，直接设置为已发布
                    article.live = True
                    article.has_unpublished_changes = False
                    article.save()
                    logger.info(
                        f'✅ 自动发布文章成功（无修订版本）: ID={article.id}, '
                        f'标题=《{article.title}》'
                    )
                    published_count += 1
                    
        except Exception as e:
            logger.error(
                f'❌ 自动发布文章失败: ID={article.id}, '
                f'标题=《{article.title}》, '
                f'错误={str(e)}',
                exc_info=True
            )
            failed_count += 1
    
    if published_count > 0 or failed_count > 0:
        logger.info(
            f'📊 定时发布任务完成: '
            f'成功={published_count}, 失败={failed_count}, '
            f'执行时间={now.strftime("%Y-%m-%d %H:%M:%S")}'
        )
    
    return {
        'published': published_count,
        'failed': failed_count,
        'executed_at': now.isoformat()
    }


@shared_task(name='news.clean_expired_scheduled_articles')
def clean_expired_scheduled_articles():
    """
    清理任务：标记过期的定时发布文章
    
    每小时执行一次，检查所有：
    1. 未发布（live=False）的文章
    2. 设置了 publish_at 字段
    3. publish_at 时间已过超过7天
    
    记录日志提醒管理员
    """
    from apps.news.models import ArticlePage
    from datetime import timedelta
    
    now = timezone.now()
    seven_days_ago = now - timedelta(days=7)
    
    # 查找过期文章
    expired_articles = ArticlePage.objects.filter(
        live=False,
        publish_at__isnull=False,
        publish_at__lt=seven_days_ago
    ).select_related('owner')
    
    count = expired_articles.count()
    
    if count > 0:
        logger.warning(
            f'⚠️ 发现 {count} 篇定时发布文章已过期超过7天仍未发布，请检查：'
        )
        
        for article in expired_articles[:10]:  # 只记录前10篇
            logger.warning(
                f'  - ID={article.id}, 标题=《{article.title}》, '
                f'计划发布时间={article.publish_at}, '
                f'作者={article.owner.username if article.owner else "未知"}'
            )
        
        if count > 10:
            logger.warning(f'  ... 还有 {count - 10} 篇未列出')
    
    return {
        'expired_count': count,
        'checked_at': now.isoformat()
    }

