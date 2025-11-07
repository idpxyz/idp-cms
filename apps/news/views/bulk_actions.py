"""
批量操作视图
为文章管理提供批量操作功能
"""

import csv
import json
from datetime import datetime
from io import StringIO

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.db import transaction
from django.http import HttpResponse, JsonResponse
from django.shortcuts import render, redirect
from django.utils import timezone
from django.views.decorators.http import require_http_methods, require_POST

from apps.news.models import ArticlePage
from apps.core.models import Channel, ChannelGroupPermission


@login_required
@require_http_methods(["GET"])
def bulk_actions_page(request):
    """
    批量操作页面
    显示所有文章供选择和批量操作
    """
    user = request.user
    
    # 获取用户可访问的频道
    if user.is_superuser:
        accessible_channels = Channel.objects.all()
        articles = ArticlePage.objects.all()
    else:
        accessible_channels = ChannelGroupPermission.get_accessible_channels(user)
        # 只显示用户有权限访问的频道下的文章
        articles = ArticlePage.objects.filter(channel__in=accessible_channels)
    
    # 过滤条件
    channel_filter = request.GET.get('channel')
    status_filter = request.GET.get('status')  # live, draft
    search = request.GET.get('search', '')
    
    if channel_filter:
        articles = articles.filter(channel_id=channel_filter)
    
    if status_filter == 'live':
        articles = articles.filter(live=True)
    elif status_filter == 'draft':
        articles = articles.filter(live=False)
    
    if search:
        articles = articles.filter(title__icontains=search)
    
    # 排序
    articles = articles.order_by('-latest_revision_created_at')
    
    # 分页
    paginator = Paginator(articles, 50)
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)
    
    context = {
        'page_obj': page_obj,
        'articles': page_obj.object_list,
        'accessible_channels': accessible_channels,
        'channel_filter': channel_filter,
        'status_filter': status_filter,
        'search': search,
    }
    
    return render(request, 'wagtail/bulk_actions.html', context)


@login_required
@require_POST
def bulk_publish(request):
    """批量发布文章"""
    article_ids = request.POST.getlist('article_ids[]')
    
    if not article_ids:
        return JsonResponse({'success': False, 'message': '请选择要发布的文章'}, status=400)
    
    user = request.user
    success_count = 0
    failed_count = 0
    errors = []
    
    with transaction.atomic():
        for article_id in article_ids:
            try:
                article = ArticlePage.objects.get(id=article_id)
                
                # 检查权限
                if not user.is_superuser:
                    if not article.channel or article.channel not in ChannelGroupPermission.get_accessible_channels(user):
                        errors.append(f'《{article.title}》: 无权限')
                        failed_count += 1
                        continue
                
                # 发布文章
                revision = article.get_latest_revision()
                if revision:
                    revision.publish(user=user)
                    success_count += 1
                else:
                    article.live = True
                    article.has_unpublished_changes = False
                    article.save()
                    success_count += 1
                    
            except ArticlePage.DoesNotExist:
                errors.append(f'ID {article_id}: 文章不存在')
                failed_count += 1
            except Exception as e:
                errors.append(f'ID {article_id}: {str(e)}')
                failed_count += 1
    
    message = f'成功发布 {success_count} 篇文章'
    if failed_count > 0:
        message += f'，失败 {failed_count} 篇'
    
    return JsonResponse({
        'success': True,
        'message': message,
        'success_count': success_count,
        'failed_count': failed_count,
        'errors': errors[:10]  # 最多返回10个错误
    })


@login_required
@require_POST
def bulk_unpublish(request):
    """批量取消发布文章"""
    article_ids = request.POST.getlist('article_ids[]')
    
    if not article_ids:
        return JsonResponse({'success': False, 'message': '请选择要取消发布的文章'}, status=400)
    
    user = request.user
    success_count = 0
    failed_count = 0
    errors = []
    
    with transaction.atomic():
        for article_id in article_ids:
            try:
                article = ArticlePage.objects.get(id=article_id)
                
                # 检查权限
                if not user.is_superuser:
                    if not article.channel or article.channel not in ChannelGroupPermission.get_accessible_channels(user):
                        errors.append(f'《{article.title}》: 无权限')
                        failed_count += 1
                        continue
                
                # 取消发布
                article.live = False
                article.has_unpublished_changes = True
                article.save()
                success_count += 1
                    
            except ArticlePage.DoesNotExist:
                errors.append(f'ID {article_id}: 文章不存在')
                failed_count += 1
            except Exception as e:
                errors.append(f'ID {article_id}: {str(e)}')
                failed_count += 1
    
    message = f'成功取消发布 {success_count} 篇文章'
    if failed_count > 0:
        message += f'，失败 {failed_count} 篇'
    
    return JsonResponse({
        'success': True,
        'message': message,
        'success_count': success_count,
        'failed_count': failed_count,
        'errors': errors[:10]
    })


@login_required
@require_POST
def bulk_change_channel(request):
    """批量修改频道"""
    article_ids = request.POST.getlist('article_ids[]')
    new_channel_id = request.POST.get('channel_id')
    
    if not article_ids:
        return JsonResponse({'success': False, 'message': '请选择文章'}, status=400)
    
    if not new_channel_id:
        return JsonResponse({'success': False, 'message': '请选择目标频道'}, status=400)
    
    try:
        new_channel = Channel.objects.get(id=new_channel_id)
    except Channel.DoesNotExist:
        return JsonResponse({'success': False, 'message': '频道不存在'}, status=400)
    
    user = request.user
    
    # 检查用户是否有目标频道的权限
    if not user.is_superuser:
        accessible_channels = ChannelGroupPermission.get_accessible_channels(user)
        if new_channel not in accessible_channels:
            return JsonResponse({'success': False, 'message': '您无权访问目标频道'}, status=403)
    
    success_count = 0
    failed_count = 0
    errors = []
    
    with transaction.atomic():
        for article_id in article_ids:
            try:
                article = ArticlePage.objects.get(id=article_id)
                
                # 检查源频道权限
                if not user.is_superuser:
                    if article.channel and article.channel not in accessible_channels:
                        errors.append(f'《{article.title}》: 无权限')
                        failed_count += 1
                        continue
                
                article.channel = new_channel
                article.save()
                success_count += 1
                    
            except ArticlePage.DoesNotExist:
                errors.append(f'ID {article_id}: 文章不存在')
                failed_count += 1
            except Exception as e:
                errors.append(f'ID {article_id}: {str(e)}')
                failed_count += 1
    
    message = f'成功修改 {success_count} 篇文章的频道'
    if failed_count > 0:
        message += f'，失败 {failed_count} 篇'
    
    return JsonResponse({
        'success': True,
        'message': message,
        'success_count': success_count,
        'failed_count': failed_count,
        'errors': errors[:10]
    })


@login_required
@require_POST
def bulk_add_tags(request):
    """批量添加标签"""
    article_ids = request.POST.getlist('article_ids[]')
    tags_to_add = request.POST.get('tags', '').strip()
    
    if not article_ids:
        return JsonResponse({'success': False, 'message': '请选择文章'}, status=400)
    
    if not tags_to_add:
        return JsonResponse({'success': False, 'message': '请输入标签'}, status=400)
    
    # 解析标签（逗号或空格分隔）
    new_tags = [tag.strip() for tag in tags_to_add.replace('，', ',').split(',') if tag.strip()]
    
    user = request.user
    accessible_channels = None if user.is_superuser else ChannelGroupPermission.get_accessible_channels(user)
    
    success_count = 0
    failed_count = 0
    errors = []
    
    with transaction.atomic():
        for article_id in article_ids:
            try:
                article = ArticlePage.objects.get(id=article_id)
                
                # 检查权限
                if not user.is_superuser:
                    if article.channel and article.channel not in accessible_channels:
                        errors.append(f'《{article.title}》: 无权限')
                        failed_count += 1
                        continue
                
                # 获取现有标签
                existing_tags = [tag.strip() for tag in article.tags.split(',') if tag.strip()] if article.tags else []
                
                # 合并新标签（去重）
                all_tags = list(set(existing_tags + new_tags))
                article.tags = ', '.join(all_tags)
                article.save()
                success_count += 1
                    
            except ArticlePage.DoesNotExist:
                errors.append(f'ID {article_id}: 文章不存在')
                failed_count += 1
            except Exception as e:
                errors.append(f'ID {article_id}: {str(e)}')
                failed_count += 1
    
    message = f'成功为 {success_count} 篇文章添加标签'
    if failed_count > 0:
        message += f'，失败 {failed_count} 篇'
    
    return JsonResponse({
        'success': True,
        'message': message,
        'success_count': success_count,
        'failed_count': failed_count,
        'errors': errors[:10]
    })


@login_required
@require_POST
def bulk_delete(request):
    """批量删除文章（仅草稿）"""
    article_ids = request.POST.getlist('article_ids[]')
    
    if not article_ids:
        return JsonResponse({'success': False, 'message': '请选择要删除的文章'}, status=400)
    
    user = request.user
    accessible_channels = None if user.is_superuser else ChannelGroupPermission.get_accessible_channels(user)
    
    success_count = 0
    failed_count = 0
    errors = []
    
    with transaction.atomic():
        for article_id in article_ids:
            try:
                article = ArticlePage.objects.get(id=article_id)
                
                # 只能删除草稿
                if article.live:
                    errors.append(f'《{article.title}》: 已发布的文章不能删除')
                    failed_count += 1
                    continue
                
                # 检查权限
                if not user.is_superuser:
                    if article.channel and article.channel not in accessible_channels:
                        errors.append(f'《{article.title}》: 无权限')
                        failed_count += 1
                        continue
                
                article.delete()
                success_count += 1
                    
            except ArticlePage.DoesNotExist:
                errors.append(f'ID {article_id}: 文章不存在')
                failed_count += 1
            except Exception as e:
                errors.append(f'ID {article_id}: {str(e)}')
                failed_count += 1
    
    message = f'成功删除 {success_count} 篇草稿'
    if failed_count > 0:
        message += f'，失败 {failed_count} 篇'
    
    return JsonResponse({
        'success': True,
        'message': message,
        'success_count': success_count,
        'failed_count': failed_count,
        'errors': errors[:10]
    })


@login_required
@require_POST
def bulk_set_publish_time(request):
    """批量设置发布时间"""
    article_ids = request.POST.getlist('article_ids[]')
    publish_at = request.POST.get('publish_at', '').strip()
    
    if not article_ids:
        return JsonResponse({'success': False, 'message': '请选择文章'}, status=400)
    
    # 解析时间
    publish_datetime = None
    if publish_at:
        try:
            publish_datetime = datetime.strptime(publish_at, '%Y-%m-%d %H:%M')
            publish_datetime = timezone.make_aware(publish_datetime)
        except ValueError:
            return JsonResponse({'success': False, 'message': '时间格式错误，请使用 YYYY-MM-DD HH:MM'}, status=400)
    
    user = request.user
    accessible_channels = None if user.is_superuser else ChannelGroupPermission.get_accessible_channels(user)
    
    success_count = 0
    failed_count = 0
    errors = []
    
    with transaction.atomic():
        for article_id in article_ids:
            try:
                article = ArticlePage.objects.get(id=article_id)
                
                # 检查权限
                if not user.is_superuser:
                    if article.channel and article.channel not in accessible_channels:
                        errors.append(f'《{article.title}》: 无权限')
                        failed_count += 1
                        continue
                
                article.publish_at = publish_datetime
                article.save()
                success_count += 1
                    
            except ArticlePage.DoesNotExist:
                errors.append(f'ID {article_id}: 文章不存在')
                failed_count += 1
            except Exception as e:
                errors.append(f'ID {article_id}: {str(e)}')
                failed_count += 1
    
    if publish_datetime:
        message = f'成功为 {success_count} 篇文章设置发布时间'
    else:
        message = f'成功清除 {success_count} 篇文章的发布时间'
    
    if failed_count > 0:
        message += f'，失败 {failed_count} 篇'
    
    return JsonResponse({
        'success': True,
        'message': message,
        'success_count': success_count,
        'failed_count': failed_count,
        'errors': errors[:10]
    })


@login_required
@require_http_methods(["GET"])
def bulk_export(request):
    """批量导出文章为CSV"""
    article_ids = request.GET.getlist('article_ids')
    
    if not article_ids:
        messages.error(request, '请选择要导出的文章')
        return redirect('bulk_actions')
    
    user = request.user
    accessible_channels = None if user.is_superuser else ChannelGroupPermission.get_accessible_channels(user)
    
    # 获取文章
    articles = ArticlePage.objects.filter(id__in=article_ids)
    
    # 过滤权限
    if not user.is_superuser:
        articles = articles.filter(channel__in=accessible_channels)
    
    # 创建CSV
    output = StringIO()
    writer = csv.writer(output)
    
    # 写入表头
    writer.writerow([
        'ID', '标题', '摘要', '作者', '频道', '标签', 
        '状态', '发布时间', '创建时间', '最后修改时间'
    ])
    
    # 写入数据
    for article in articles:
        writer.writerow([
            article.id,
            article.title,
            article.excerpt or '',
            article.author_name or '',
            article.channel.name if article.channel else '',
            article.tags or '',
            '已发布' if article.live else '草稿',
            article.publish_at.strftime('%Y-%m-%d %H:%M') if article.publish_at else '',
            article.first_published_at.strftime('%Y-%m-%d %H:%M') if article.first_published_at else '',
            article.latest_revision_created_at.strftime('%Y-%m-%d %H:%M') if article.latest_revision_created_at else '',
        ])
    
    # 返回CSV文件
    response = HttpResponse(output.getvalue(), content_type='text/csv; charset=utf-8-sig')
    response['Content-Disposition'] = f'attachment; filename="articles_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv"'
    
    return response

