"""
文章评论API

提供文章页面的评论显示和管理功能
与用户评论系统集成
"""
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Count, Q
from apps.web_users.models import WebUser, UserComment
from apps.web_users.serializers import UserCommentSerializer
from apps.api.rest.web_auth import get_user_from_token
import json


@require_http_methods(["GET"])
def get_article_comments(request, article_id):
    """获取文章的所有评论"""
    try:
        # 获取当前用户（如果已登录）
        current_user = get_user_from_token(request)
        
        # 获取查询参数
        page = int(request.GET.get('page', 1))
        limit = min(int(request.GET.get('limit', 20)), 50)  # 最大50条
        offset = (page - 1) * limit
        
        # 获取文章的所有已发布评论，按时间倒序
        comments_qs = UserComment.objects.filter(
            article_id=article_id,
            status='published'
        ).select_related('user').order_by('-created_at')
        
        total = comments_qs.count()
        comments_list = comments_qs[offset:offset + limit]
        
        # 序列化评论数据
        serializer = UserCommentSerializer(comments_list, many=True)
        comments_data = serializer.data
        
        # 如果用户已登录，添加点赞状态
        if current_user:
            from apps.web_users.models import UserInteraction
            # 获取用户对这些评论的点赞状态
            comment_ids = [comment['id'] for comment in comments_data]
            user_likes = set(
                UserInteraction.objects.filter(
                    user=current_user,
                    target_type='comment',
                    target_id__in=[str(cid) for cid in comment_ids],
                    interaction_type='like'
                ).values_list('target_id', flat=True)
            )
            
            # 为每条评论添加是否点赞的标记
            for comment in comments_data:
                comment['is_liked'] = str(comment['id']) in user_likes
        else:
            # 未登录用户，所有评论都未点赞
            for comment in comments_data:
                comment['is_liked'] = False
        
        # 构建评论树结构
        comments_tree = build_comment_tree(comments_data)
        
        return JsonResponse({
            'success': True,
            'data': comments_tree,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'has_next': offset + limit < total
            }
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'获取评论失败: {str(e)}'
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def add_article_comment(request, article_id):
    """为文章添加评论"""
    try:
        # 验证用户认证
        user = get_user_from_token(request)
        if not user:
            return JsonResponse({
                'success': False,
                'message': '未登录或token无效'
            }, status=401)
        
        # 解析请求数据
        data = json.loads(request.body)
        content = data.get('content', '').strip()
        parent_id = data.get('parent_id')
        
        if not content:
            return JsonResponse({
                'success': False,
                'message': '评论内容不能为空'
            }, status=400)
        
        # 获取文章信息（从前端传递或者从其他地方获取）
        article_title = data.get('article_title', f'文章 {article_id}')
        article_slug = data.get('article_slug', article_id)
        article_channel = data.get('article_channel', '默认频道')
        
        # 处理父评论信息
        parent_comment = None
        parent_content = ''
        parent_author = ''
        
        if parent_id:
            try:
                parent_comment = UserComment.objects.get(
                    id=parent_id, 
                    article_id=article_id,
                    status='published'
                )
                parent_content = parent_comment.content[:100]  # 截取前100字符
                parent_author = parent_comment.user.nickname or parent_comment.user.username
            except UserComment.DoesNotExist:
                return JsonResponse({
                    'success': False,
                    'message': '父评论不存在'
                }, status=400)
        
        # 创建评论并同步更新文章统计
        from django.db import transaction
        from apps.news.models.article import ArticlePage
        
        with transaction.atomic():
            # 创建评论
            comment = UserComment.objects.create(
                user=user,
                article_id=article_id,
                article_title=article_title,
                article_slug=article_slug,
                article_channel=article_channel,
                content=content,
                parent=parent_comment,
                parent_content=parent_content,
                parent_author=parent_author,
                status='published'  # 直接发布，或者设为pending等待审核
            )
            
            # 🔄 同步更新 ArticlePage 的 comment_count 字段
            try:
                # 重新统计该文章的评论数（只统计已发布的评论）
                comment_count = UserComment.objects.filter(
                    article_id=article_id,
                    status='published'
                ).count()
                
                article = ArticlePage.objects.get(id=article_id)
                article.comment_count = comment_count
                article.save(update_fields=['comment_count'])
            except ArticlePage.DoesNotExist:
                # 文章不存在，记录日志但不影响评论创建
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Article {article_id} not found when updating comment_count")
        
        # 序列化返回数据
        serializer = UserCommentSerializer(comment)
        
        return JsonResponse({
            'success': True,
            'message': '评论发表成功',
            'data': serializer.data
        }, status=201)
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'message': '请求数据格式错误'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'发表评论失败: {str(e)}'
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def toggle_comment_like(request, comment_id):
    """切换评论点赞状态"""
    try:
        # 验证用户认证
        user = get_user_from_token(request)
        if not user:
            return JsonResponse({
                'success': False,
                'message': '未登录或token无效'
            }, status=401)
        
        # 检查评论是否存在
        try:
            comment = UserComment.objects.get(id=comment_id, status='published')
        except UserComment.DoesNotExist:
            return JsonResponse({
                'success': False,
                'message': '评论不存在'
            }, status=404)
        
        # 这里应该有一个独立的点赞表，现在先简化处理
        # 可以创建一个 CommentLike 模型来记录点赞关系
        
        # 临时实现：模拟点赞切换
        from apps.web_users.models import UserInteraction
        
        interaction, created = UserInteraction.objects.get_or_create(
            user=user,
            target_type='comment',
            target_id=str(comment_id),
            interaction_type='like'
        )
        
        if not created:
            # 已存在，删除（取消点赞）
            interaction.delete()
            action = 'unliked'
        else:
            # 新创建（点赞）
            action = 'liked'
        
        # 更新评论点赞数（需要重新计算）
        like_count = UserInteraction.objects.filter(
            target_type='comment',
            target_id=str(comment_id),
            interaction_type='like'
        ).count()
        
        comment.likes = like_count
        comment.save(update_fields=['likes'])
        
        return JsonResponse({
            'success': True,
            'data': {
                'action': action,
                'like_count': like_count
            }
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'操作失败: {str(e)}'
        }, status=500)


def build_comment_tree(comments_data):
    """构建评论树结构"""
    # 将扁平的评论列表转换为树形结构
    comments_dict = {}
    root_comments = []
    
    # 第一遍：创建所有评论的字典
    for comment in comments_data:
        comment_id = str(comment['id'])
        comment['replies'] = []
        comments_dict[comment_id] = comment
    
    # 第二遍：构建树形结构
    for comment in comments_data:
        parent_id = comment.get('parent')
        if parent_id and str(parent_id) in comments_dict:
            # 这是一个回复，添加到父评论的replies中
            comments_dict[str(parent_id)]['replies'].append(comment)
        else:
            # 这是一个根评论
            root_comments.append(comment)
    
    return root_comments


@require_http_methods(["GET"])
def get_comment_stats(request, article_id):
    """获取文章评论统计"""
    try:
        # 统计文章的评论数据
        total_comments = UserComment.objects.filter(
            article_id=article_id,
            status='published'
        ).count()
        
        # 统计回复数
        reply_count = UserComment.objects.filter(
            article_id=article_id,
            status='published',
            parent__isnull=False
        ).count()
        
        # 统计根评论数
        root_comment_count = total_comments - reply_count
        
        return JsonResponse({
            'success': True,
            'data': {
                'total_comments': total_comments,
                'root_comments': root_comment_count,
                'replies': reply_count
            }
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'获取统计失败: {str(e)}'
        }, status=500)
