"""
网站用户数据管理API

提供用户收藏、阅读历史、评论、互动等数据管理功能
"""
from django.db.models import Count, Sum
from django.utils import timezone
from datetime import timedelta
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from apps.web_users.models import (
    WebUser, UserProfile, ReadingHistory, UserComment, 
    UserFavorite, UserInteraction
)
from apps.web_users.serializers import (
    UserProfileSerializer, ReadingHistorySerializer,
    UserCommentSerializer, UserFavoriteSerializer,
    UserInteractionSerializer, UserStatsSerializer
)
from .web_auth import get_user_from_token


# ==================== 阅读历史 ====================

@api_view(['GET'])
def get_reading_history(request):
    """获取用户阅读历史"""
    user = get_user_from_token(request)
    if not user:
        return Response({
            'success': False,
            'message': '未登录或token无效'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    # 分页参数
    page = int(request.GET.get('page', 1))
    limit = min(int(request.GET.get('limit', 20)), 100)  # 最大100条
    offset = (page - 1) * limit
    
    # 获取阅读历史
    history_qs = ReadingHistory.objects.filter(user=user).order_by('-read_time')
    total = history_qs.count()
    history_list = history_qs[offset:offset + limit]
    
    return Response({
        'success': True,
        'data': ReadingHistorySerializer(history_list, many=True).data,
        'pagination': {
            'page': page,
            'limit': limit,
            'total': total,
            'has_next': offset + limit < total
        }
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
def add_reading_history(request):
    """添加阅读历史记录"""
    user = get_user_from_token(request)
    if not user:
        return Response({
            'success': False,
            'message': '未登录或token无效'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    data = request.data.copy()
    data['user'] = user.id
    
    serializer = ReadingHistorySerializer(data=data)
    if serializer.is_valid():
        # 每次都创建新的阅读记录，允许用户多次阅读同一文章
        record = serializer.save(user=user)
        
        return Response({
            'success': True,
            'message': '阅读历史记录成功',
            'data': ReadingHistorySerializer(record).data
        }, status=status.HTTP_201_CREATED)
    
    return Response({
        'success': False,
        'message': '数据无效',
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
def delete_reading_history(request, history_id):
    """删除阅读历史记录"""
    user = get_user_from_token(request)
    if not user:
        return Response({
            'success': False,
            'message': '未登录或token无效'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        history = ReadingHistory.objects.get(id=history_id, user=user)
        history.delete()
        return Response({
            'success': True,
            'message': '删除成功'
        }, status=status.HTTP_200_OK)
    except ReadingHistory.DoesNotExist:
        return Response({
            'success': False,
            'message': '记录不存在'
        }, status=status.HTTP_404_NOT_FOUND)


# ==================== 用户收藏 ====================

@api_view(['GET'])
def get_user_favorites(request):
    """获取用户收藏列表"""
    user = get_user_from_token(request)
    if not user:
        return Response({
            'success': False,
            'message': '未登录或token无效'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    # 分页参数
    page = int(request.GET.get('page', 1))
    limit = min(int(request.GET.get('limit', 20)), 100)
    offset = (page - 1) * limit
    
    # 获取收藏列表
    favorites_qs = UserFavorite.objects.filter(user=user).order_by('-created_at')
    total = favorites_qs.count()
    favorites_list = favorites_qs[offset:offset + limit]
    
    return Response({
        'success': True,
        'data': UserFavoriteSerializer(favorites_list, many=True).data,
        'pagination': {
            'page': page,
            'limit': limit,
            'total': total,
            'has_next': offset + limit < total
        }
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
def add_favorite(request):
    """添加收藏"""
    user = get_user_from_token(request)
    if not user:
        return Response({
            'success': False,
            'message': '未登录或token无效'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    data = request.data.copy()
    article_id = data.get('article_id')
    
    # 检查是否已收藏
    if UserFavorite.objects.filter(user=user, article_id=article_id).exists():
        return Response({
            'success': False,
            'message': '已经收藏过这篇文章'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    serializer = UserFavoriteSerializer(data=data)
    if serializer.is_valid():
        favorite = serializer.save(user=user)
        return Response({
            'success': True,
            'message': '收藏成功',
            'data': UserFavoriteSerializer(favorite).data
        }, status=status.HTTP_201_CREATED)
    
    return Response({
        'success': False,
        'message': '数据无效',
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
def remove_favorite(request, article_id):
    """取消收藏"""
    user = get_user_from_token(request)
    if not user:
        return Response({
            'success': False,
            'message': '未登录或token无效'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        favorite = UserFavorite.objects.get(user=user, article_id=article_id)
        favorite.delete()
        return Response({
            'success': True,
            'message': '取消收藏成功'
        }, status=status.HTTP_200_OK)
    except UserFavorite.DoesNotExist:
        return Response({
            'success': False,
            'message': '未收藏该文章'
        }, status=status.HTTP_404_NOT_FOUND)


# ==================== 用户评论 ====================

@api_view(['GET'])
def get_user_comments(request):
    """获取用户评论列表"""
    user = get_user_from_token(request)
    if not user:
        return Response({
            'success': False,
            'message': '未登录或token无效'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    # 筛选参数
    status_filter = request.GET.get('status', 'all')
    page = int(request.GET.get('page', 1))
    limit = min(int(request.GET.get('limit', 20)), 100)
    offset = (page - 1) * limit
    
    # 构建查询
    comments_qs = UserComment.objects.filter(user=user)
    if status_filter != 'all':
        comments_qs = comments_qs.filter(status=status_filter)
    
    comments_qs = comments_qs.order_by('-created_at')
    total = comments_qs.count()
    comments_list = comments_qs[offset:offset + limit]
    
    return Response({
        'success': True,
        'data': UserCommentSerializer(comments_list, many=True).data,
        'pagination': {
            'page': page,
            'limit': limit,
            'total': total,
            'has_next': offset + limit < total
        }
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
def add_comment(request):
    """发表评论"""
    user = get_user_from_token(request)
    if not user:
        return Response({
            'success': False,
            'message': '未登录或token无效'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    data = request.data.copy()
    serializer = UserCommentSerializer(data=data)
    
    if serializer.is_valid():
        comment = serializer.save(user=user)
        return Response({
            'success': True,
            'message': '评论发表成功，等待审核',
            'data': UserCommentSerializer(comment).data
        }, status=status.HTTP_201_CREATED)
    
    return Response({
        'success': False,
        'message': '数据无效',
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
def delete_comment(request, comment_id):
    """删除评论"""
    user = get_user_from_token(request)
    if not user:
        return Response({
            'success': False,
            'message': '未登录或token无效'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        comment = UserComment.objects.get(id=comment_id, user=user)
        comment.delete()
        return Response({
            'success': True,
            'message': '评论删除成功'
        }, status=status.HTTP_200_OK)
    except UserComment.DoesNotExist:
        return Response({
            'success': False,
            'message': '评论不存在'
        }, status=status.HTTP_404_NOT_FOUND)


# ==================== 用户互动 ====================

@api_view(['POST'])
def toggle_interaction(request):
    """切换用户互动（点赞/踩等）"""
    user = get_user_from_token(request)
    if not user:
        return Response({
            'success': False,
            'message': '未登录或token无效'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    target_type = request.data.get('target_type')
    target_id = request.data.get('target_id')
    interaction_type = request.data.get('interaction_type')
    
    if not all([target_type, target_id, interaction_type]):
        return Response({
            'success': False,
            'message': '参数不完整'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # 检查是否已存在
    interaction = UserInteraction.objects.filter(
        user=user,
        target_type=target_type,
        target_id=target_id,
        interaction_type=interaction_type
    ).first()
    
    if interaction:
        # 已存在，删除（取消操作）
        interaction.delete()
        return Response({
            'success': True,
            'message': f'取消{interaction.get_interaction_type_display()}',
            'action': 'removed'
        }, status=status.HTTP_200_OK)
    else:
        # 不存在，创建
        interaction = UserInteraction.objects.create(
            user=user,
            target_type=target_type,
            target_id=target_id,
            interaction_type=interaction_type
        )
        return Response({
            'success': True,
            'message': f'{interaction.get_interaction_type_display()}成功',
            'action': 'added',
            'data': UserInteractionSerializer(interaction).data
        }, status=status.HTTP_201_CREATED)


# ==================== 用户统计 ====================

@api_view(['GET'])
def get_user_stats(request):
    """获取用户统计信息"""
    user = get_user_from_token(request)
    if not user:
        return Response({
            'success': False,
            'message': '未登录或token无效'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    # 获取统计数据
    profile = user.profile
    
    # 总阅读时长（分钟）
    total_read_time = ReadingHistory.objects.filter(user=user).aggregate(
        total=Sum('read_duration')
    )['total'] or 0
    total_read_time = total_read_time // 60  # 转换为分钟
    
    # 最近7天活动
    seven_days_ago = timezone.now() - timedelta(days=7)
    recent_activity = ReadingHistory.objects.filter(
        user=user, 
        read_time__gte=seven_days_ago
    ).count()
    
    # 最喜欢的频道
    favorite_channel = ReadingHistory.objects.filter(user=user).values(
        'article_channel'
    ).annotate(
        count=Count('article_channel')
    ).order_by('-count').first()
    
    favorite_channel_name = favorite_channel['article_channel'] if favorite_channel else '暂无'
    
    stats_data = {
        'articles_read': profile.articles_read,
        'comments_count': profile.comments_count,
        'favorites_count': profile.favorites_count,
        'total_read_time': total_read_time,
        'recent_activity': recent_activity,
        'favorite_channel': favorite_channel_name,
    }
    
    return Response({
        'success': True,
        'data': stats_data
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
def check_interactions(request):
    """检查用户对特定内容的互动状态"""
    user = get_user_from_token(request)
    if not user:
        return Response({
            'success': False,
            'message': '未登录或token无效'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    target_ids = request.GET.get('target_ids', '').split(',')
    target_type = request.GET.get('target_type', 'article')
    
    if not target_ids or target_ids == ['']:
        return Response({
            'success': False,
            'message': 'target_ids参数是必需的'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # 查询用户互动
    interactions = UserInteraction.objects.filter(
        user=user,
        target_type=target_type,
        target_id__in=target_ids
    ).values('target_id', 'interaction_type')
    
    # 查询收藏状态
    favorites = UserFavorite.objects.filter(
        user=user,
        article_id__in=target_ids
    ).values_list('article_id', flat=True)
    
    # 组织返回数据
    result = {}
    for target_id in target_ids:
        result[target_id] = {
            'liked': any(i['interaction_type'] == 'like' and i['target_id'] == target_id for i in interactions),
            'favorited': target_id in favorites,
        }
    
    return Response({
        'success': True,
        'data': result
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
def get_article_stats(request, article_id):
    """获取文章的互动统计信息"""
    try:
        # 统计点赞数
        like_count = UserInteraction.objects.filter(
            target_type='article',
            target_id=article_id,
            interaction_type='like'
        ).count()
        
        # 统计收藏数
        favorite_count = UserFavorite.objects.filter(
            article_id=article_id
        ).count()
        
        # 获取当前用户的互动状态（如果已登录）
        user = get_user_from_token(request)
        user_liked = False
        user_favorited = False
        
        if user:
            user_liked = UserInteraction.objects.filter(
                user=user,
                target_type='article',
                target_id=article_id,
                interaction_type='like'
            ).exists()
            
            user_favorited = UserFavorite.objects.filter(
                user=user,
                article_id=article_id
            ).exists()
        
        return Response({
            'success': True,
            'data': {
                'article_id': article_id,
                'like_count': like_count,
                'favorite_count': favorite_count,
                'user_liked': user_liked,
                'user_favorited': user_favorited,
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'获取文章统计失败: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def toggle_article_like(request, article_id):
    """切换文章点赞状态"""
    user = get_user_from_token(request)
    if not user:
        return Response({
            'success': False,
            'message': '未登录或token无效'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        from django.db import transaction
        from apps.news.models.article import ArticlePage
        
        with transaction.atomic():
            # 检查是否已点赞
            interaction = UserInteraction.objects.filter(
                user=user,
                target_type='article',
                target_id=article_id,
                interaction_type='like'
            ).first()
            
            if interaction:
                # 已点赞，取消点赞
                interaction.delete()
                action = 'unliked'
            else:
                # 未点赞，添加点赞
                UserInteraction.objects.create(
                    user=user,
                    target_type='article',
                    target_id=article_id,
                    interaction_type='like'
                )
                action = 'liked'
            
            # 重新统计点赞数
            like_count = UserInteraction.objects.filter(
                target_type='article',
                target_id=article_id,
                interaction_type='like'
            ).count()
            
            # 🔄 同步更新 ArticlePage 的 like_count 字段
            try:
                article = ArticlePage.objects.get(id=article_id)
                article.like_count = like_count
                article.save(update_fields=['like_count'])
            except ArticlePage.DoesNotExist:
                # 文章不存在，记录日志但不影响用户操作
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Article {article_id} not found when updating like_count")
        
        return Response({
            'success': True,
            'data': {
                'action': action,
                'like_count': like_count,
                'is_liked': action == 'liked'
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'点赞操作失败: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def toggle_article_favorite(request, article_id):
    """切换文章收藏状态"""
    user = get_user_from_token(request)
    if not user:
        return Response({
            'success': False,
            'message': '未登录或token无效'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        from django.db import transaction
        from apps.news.models.article import ArticlePage
        
        with transaction.atomic():
            # 检查是否已收藏
            favorite = UserFavorite.objects.filter(
                user=user,
                article_id=article_id
            ).first()
            
            if favorite:
                # 已收藏，取消收藏
                favorite.delete()
                action = 'unfavorited'
            else:
                # 未收藏，添加收藏
                # 获取文章信息填充收藏记录
                try:
                    article = ArticlePage.objects.get(id=article_id)
                    article_title = article.title
                    article_slug = article.slug
                    article_channel = article.channel.name if article.channel else '未分类'
                    article_excerpt = article.excerpt or ''
                    article_image_url = ''
                    if article.cover and getattr(article.cover, 'file', None):
                        try:
                            article_image_url = article.cover.file.url
                        except Exception:
                            article_image_url = ''
                    article_publish_time = article.first_published_at
                except ArticlePage.DoesNotExist:
                    # 文章不存在，使用默认值
                    article_title = request.data.get('article_title', f'文章{article_id}')
                    article_slug = request.data.get('article_slug', f'article-{article_id}')
                    article_channel = request.data.get('article_channel', '未分类')
                    article_excerpt = ''
                    article_image_url = ''
                    article_publish_time = None
                
                UserFavorite.objects.create(
                    user=user,
                    article_id=article_id,
                    article_title=article_title,
                    article_slug=article_slug,
                    article_channel=article_channel,
                    article_excerpt=article_excerpt,
                    article_image_url=article_image_url,
                    article_publish_time=article_publish_time
                )
                action = 'favorited'
            
            # 重新统计收藏数
            favorite_count = UserFavorite.objects.filter(
                article_id=article_id
            ).count()
            
            # 🔄 同步更新 ArticlePage 的 favorite_count 字段
            try:
                article = ArticlePage.objects.get(id=article_id)
                article.favorite_count = favorite_count
                article.save(update_fields=['favorite_count'])
            except ArticlePage.DoesNotExist:
                # 文章不存在，记录日志但不影响用户操作
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Article {article_id} not found when updating favorite_count")
        
        return Response({
            'success': True,
            'data': {
                'action': action,
                'favorite_count': favorite_count,
                'is_favorited': action == 'favorited'
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'success': False,
            'message': f'收藏操作失败: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ==================== 用户评论管理API ====================

@api_view(['GET'])
def get_user_comments(request):
    """获取用户的所有评论"""
    user = get_user_from_token(request)
    if not user:
        return Response({
            'success': False,
            'message': '未登录或token无效'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    # 筛选参数
    status_filter = request.GET.get('status', 'all')
    page = int(request.GET.get('page', 1))
    limit = min(int(request.GET.get('limit', 20)), 100)
    offset = (page - 1) * limit
    
    # 构建查询 - 获取用户在所有文章中的评论
    comments_qs = UserComment.objects.filter(user=user)
    if status_filter != 'all':
        comments_qs = comments_qs.filter(status=status_filter)
    
    comments_qs = comments_qs.order_by('-created_at')
    total = comments_qs.count()
    comments_list = comments_qs[offset:offset + limit]
    
    # 序列化数据
    serializer = UserCommentSerializer(comments_list, many=True)
    
    return Response({
        'success': True,
        'data': serializer.data,
        'pagination': {
            'page': page,
            'limit': limit,
            'total': total,
            'has_next': offset + limit < total
        }
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
def add_comment(request):
    """发表评论（此API用于用户评论管理，实际的文章评论应使用文章评论API）"""
    user = get_user_from_token(request)
    if not user:
        return Response({
            'success': False,
            'message': '未登录或token无效'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    # 注意：此API主要用于兼容性，实际的文章评论应使用专门的文章评论API
    data = request.data.copy()
    serializer = UserCommentSerializer(data=data)
    
    if serializer.is_valid():
        comment = serializer.save(user=user)
        return Response({
            'success': True,
            'message': '评论发表成功',
            'data': UserCommentSerializer(comment).data
        }, status=status.HTTP_201_CREATED)
    
    return Response({
        'success': False,
        'message': '数据无效',
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
def delete_comment(request, comment_id):
    """删除评论"""
    user = get_user_from_token(request)
    if not user:
        return Response({
            'success': False,
            'message': '未登录或token无效'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        comment = UserComment.objects.get(id=comment_id, user=user)
        comment.delete()
        return Response({
            'success': True,
            'message': '评论删除成功'
        }, status=status.HTTP_200_OK)
    except UserComment.DoesNotExist:
        return Response({
            'success': False,
            'message': '评论不存在或无权限删除'
        }, status=status.HTTP_404_NOT_FOUND)
