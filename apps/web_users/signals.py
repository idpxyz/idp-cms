"""
Web Users 系统的 Django 信号处理器
用于在用户互动时自动同步 ArticlePage 的统计字段
"""
import logging
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db import transaction
from .models import UserInteraction, UserFavorite, UserComment

logger = logging.getLogger(__name__)


def update_article_stats(article_id):
    """
    更新指定文章的统计数据
    
    Args:
        article_id (str): 文章ID
    """
    try:
        from apps.news.models.article import ArticlePage
        
        # 统计各种互动数据
        like_count = UserInteraction.objects.filter(
            target_type='article',
            target_id=str(article_id),
            interaction_type='like'
        ).count()

        favorite_count = UserFavorite.objects.filter(
            article_id=str(article_id)
        ).count()

        comment_count = UserComment.objects.filter(
            article_id=str(article_id),
            status='published'
        ).count()

        # 更新 ArticlePage 的统计字段和动态权重
        try:
            article = ArticlePage.objects.get(id=article_id)
            article.like_count = like_count
            article.favorite_count = favorite_count
            article.comment_count = comment_count
            
            # 🚀 更新动态权重
            old_weight = article.weight
            article.update_dynamic_weight()
            new_weight = article.weight
            
            article.save(update_fields=['like_count', 'favorite_count', 'comment_count', 'weight'])
            
            logger.info(f"Updated stats for article {article_id}: "
                       f"likes={like_count}, favorites={favorite_count}, comments={comment_count}, weight={old_weight}→{new_weight}")
        except ArticlePage.DoesNotExist:
            logger.warning(f"Article {article_id} not found when updating stats")
            
    except Exception as e:
        logger.error(f"Failed to update stats for article {article_id}: {str(e)}")


@receiver(post_save, sender=UserInteraction)
def on_user_interaction_saved(sender, instance, created, **kwargs):
    """
    用户互动记录保存后的信号处理
    """
    if instance.target_type == 'article':
        # 使用事务确保数据一致性
        transaction.on_commit(lambda: update_article_stats(instance.target_id))


@receiver(post_delete, sender=UserInteraction)
def on_user_interaction_deleted(sender, instance, **kwargs):
    """
    用户互动记录删除后的信号处理
    """
    if instance.target_type == 'article':
        # 使用事务确保数据一致性
        transaction.on_commit(lambda: update_article_stats(instance.target_id))


@receiver(post_save, sender=UserFavorite)
def on_user_favorite_saved(sender, instance, created, **kwargs):
    """
    用户收藏记录保存后的信号处理
    """
    # 使用事务确保数据一致性
    transaction.on_commit(lambda: update_article_stats(instance.article_id))


@receiver(post_delete, sender=UserFavorite)
def on_user_favorite_deleted(sender, instance, **kwargs):
    """
    用户收藏记录删除后的信号处理
    """
    # 使用事务确保数据一致性
    transaction.on_commit(lambda: update_article_stats(instance.article_id))


@receiver(post_save, sender=UserComment)
def on_user_comment_saved(sender, instance, created, **kwargs):
    """
    用户评论保存后的信号处理
    """
    # 只有当评论状态为已发布时才更新统计
    if instance.status == 'published':
        # 使用事务确保数据一致性
        transaction.on_commit(lambda: update_article_stats(instance.article_id))


@receiver(post_delete, sender=UserComment)
def on_user_comment_deleted(sender, instance, **kwargs):
    """
    用户评论删除后的信号处理
    """
    # 使用事务确保数据一致性
    transaction.on_commit(lambda: update_article_stats(instance.article_id))
