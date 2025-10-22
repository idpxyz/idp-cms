"""
文章评论API

提供文章页面的评论显示和管理功能
与用户评论系统集成
"""
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Count, Q, F
from django.db import transaction, IntegrityError
from django.utils.html import strip_tags
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

        # 获取并校验查询参数
        try:
            page = int(request.GET.get('page', 1))
            limit = int(request.GET.get('limit', 20))
        except ValueError:
            return JsonResponse({'success': False, 'message': '分页参数格式错误'}, status=400)

        if page < 1:
            return JsonResponse({'success': False, 'message': 'page 必须 >= 1'}, status=400)
        if limit < 1 or limit > 50:
            return JsonResponse({'success': False, 'message': 'limit 必须在 1-50 之间'}, status=400)

        offset = (page - 1) * limit

        # 仅对根评论进行分页
        root_qs = UserComment.objects.filter(
            article_id=article_id,
            status='published',
            parent__isnull=True
        ).select_related('user').order_by('-created_at')

        total = root_qs.count()
        root_comments = list(root_qs[offset:offset + limit])

        # 逐层获取所选根评论的所有子孙评论（避免全量扫描）
        all_thread_comments = list(root_comments)
        frontier = root_comments
        while frontier:
            children_qs = list(
                UserComment.objects.filter(
                    article_id=article_id,
                    status='published',
                    parent__in=frontier
                ).select_related('user').order_by('created_at')
            )
            if not children_qs:
                break
            all_thread_comments.extend(children_qs)
            frontier = children_qs

        # 序列化所需评论
        serializer = UserCommentSerializer(all_thread_comments, many=True)
        comments_data = serializer.data

        # 标注点赞状态（当前用户）
        if current_user:
            from apps.web_users.models import UserInteraction
            comment_ids = [str(comment['id']) for comment in comments_data]
            
            user_likes = set(
                UserInteraction.objects.filter(
                    user=current_user,
                    target_type='comment',
                    target_id__in=comment_ids,
                    interaction_type='like'
                ).values_list('target_id', flat=True)
            )
            
            for comment in comments_data:
                comment['is_liked'] = str(comment['id']) in user_likes
        else:
            for comment in comments_data:
                comment['is_liked'] = False

        # 为每条评论添加空的 replies 字段（便于前端直接使用）
        for comment in comments_data:
            comment.setdefault('replies', [])

        # 构建评论树结构
        comments_tree = build_comment_tree(comments_data)

        return JsonResponse({
            'success': True,
            'data': comments_tree,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,  # 根评论总数
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
        # 检查站点评论功能是否开启
        from apps.core.site_config import SiteConfigManager
        import logging
        
        logger = logging.getLogger(__name__)
        
        # 使用 localhost 作为默认站点（生产环境通常只有一个站点配置）
        config_manager = SiteConfigManager()
        try:
            # 禁用缓存避免序列化问题
            site_config = config_manager.get_config('localhost', use_cache=False)
        except Exception as e:
            # 如果 localhost 不存在，使用默认配置（评论功能关闭）
            logger.error(f"Failed to load site config for comments: {e}", exc_info=True)
            return JsonResponse({
                'success': False,
                'message': '站点配置错误，评论功能不可用'
            }, status=403)
        
        if not site_config.features.comments_enabled:
            return JsonResponse({
                'success': False,
                'message': '该站点未开启评论功能'
            }, status=403)
        
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
        # 基础清洗，去除HTML标签，防止XSS
        content = strip_tags(content)
        parent_id = data.get('parent_id')
        
        if not content:
            return JsonResponse({
                'success': False,
                'message': '评论内容不能为空'
            }, status=400)
        # 内容长度限制
        if len(content) > 2000:
            return JsonResponse({
                'success': False,
                'message': '评论内容过长（最多2000字符）'
            }, status=400)
        
        # 获取文章信息（从后端读取，不信任前端字段）
        from apps.news.models.article import ArticlePage
        try:
            article_obj = ArticlePage.objects.get(id=int(article_id))
        except (ArticlePage.DoesNotExist, ValueError):
            return JsonResponse({
                'success': False,
                'message': '文章不存在'
            }, status=404)
        article_title = article_obj.title
        article_slug = article_obj.slug
        article_channel = getattr(article_obj.channel, 'name', '默认频道')
        
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
            
            # 🔄 原子自增 ArticlePage 的 comment_count 字段
            ArticlePage.objects.filter(id=article_obj.id).update(comment_count=F('comment_count') + 1)
        
        # 序列化返回数据
        serializer = UserCommentSerializer(comment)

        # 统一返回结构，便于前端直接插入
        response_comment = dict(serializer.data)
        response_comment['is_liked'] = False
        response_comment['replies'] = []

        return JsonResponse({
            'success': True,
            'message': '评论发表成功',
            'data': response_comment
        }, status=201)
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'message': '请求数据格式错误'
        }, status=400)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"发表评论失败: {str(e)}", exc_info=True)
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
        
        from apps.web_users.models import UserInteraction

        # 可选接受期望状态: { "like": true|false }
        desired_like = None
        try:
            if request.body:
                payload = json.loads(request.body)
                if isinstance(payload, dict) and 'like' in payload:
                    desired_like = bool(payload.get('like'))
        except json.JSONDecodeError:
            desired_like = None  # 忽略解析错误，回退到切换逻辑

        with transaction.atomic():
            # 当前是否已点赞
            has_like = UserInteraction.objects.filter(
                user=user,
                target_type='comment',
                target_id=str(comment_id),
                interaction_type='like'
            ).exists()

            # 计算目标状态：若未显式指定，则执行切换
            target_like = (not has_like) if desired_like is None else desired_like
            

            if target_like and not has_like:
                # 执行点赞
                try:
                    interaction, created = UserInteraction.objects.get_or_create(
                        user=user,
                        target_type='comment',
                        target_id=str(comment_id),
                        interaction_type='like'
                    )
                except IntegrityError:
                    created = False
                if created:
                    UserComment.objects.filter(id=comment.id).update(likes=F('likes') + 1)
                action = 'liked'
                is_liked = True
            elif (not target_like) and has_like:
                # 执行取消点赞
                interaction = UserInteraction.objects.filter(
                    user=user,
                    target_type='comment',
                    target_id=str(comment_id),
                    interaction_type='like'
                ).first()
                if interaction:
                    deleted_count, _ = interaction.delete()
                    if deleted_count:
                        UserComment.objects.filter(id=comment.id).update(likes=F('likes') - 1)
                action = 'unliked'
                is_liked = False
            else:
                # 目标状态与当前一致，返回当前实际状态而非noop
                action = 'liked' if has_like else 'unliked'
                is_liked = has_like

        # 刷新点赞数
        comment.refresh_from_db(fields=['likes'])
        if comment.likes < 0:
            comment.likes = 0
            comment.save(update_fields=['likes'])

        return JsonResponse({
            'success': True,
            'data': {
                'action': action,
                'like_count': comment.likes,
                'is_liked': is_liked
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

    # 对每个父评论的回复按创建时间升序排序（如有字段）
    for c in comments_dict.values():
        if c.get('replies'):
            try:
                c['replies'].sort(key=lambda x: x.get('created_at'))
            except Exception:
                # 如果无法排序（缺少字段），忽略
                pass

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
        
        # 统计根评论数与回复数
        root_comment_count = UserComment.objects.filter(
            article_id=article_id,
            status='published',
            parent__isnull=True
        ).count()
        reply_count = total_comments - root_comment_count
        
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
