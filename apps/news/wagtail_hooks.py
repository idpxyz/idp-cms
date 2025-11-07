"""
Wagtail钩子 - 根据父页面关联的站点过滤频道和地区选择器
"""

from wagtail import hooks
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.dispatch import receiver
from wagtail.signals import page_published, page_unpublished
from .services.tag_suggestion import tag_suggestion_api
from django.contrib import messages
from django.shortcuts import redirect
from django.urls import reverse


def apply_site_filtering_to_form(form, site):
    """
    通用的站点过滤函数
    """
    if not site:
        return
        
    # 过滤频道
    if 'channel' in form.fields:
        from apps.core.models import Channel
        available_channels = site.channels.filter(is_active=True)
        form.fields['channel'].queryset = available_channels
        form.fields['channel'].help_text = format_html(
            '🎯 自动过滤显示 <strong>{}</strong> 站点的 {} 个可用频道',
            site.hostname,
            available_channels.count()
        )
        
        # 检查是否有专属频道
        exclusive_channels = available_channels.filter(slug__contains='local')
        if exclusive_channels.exists():
            form.fields['channel'].help_text += format_html(
                '<br/>📍 包含 {} 个专属频道',
                exclusive_channels.count()
            )
    
    # 过滤地区
    if 'region' in form.fields:
        from apps.core.models import Region
        available_regions = site.regions.filter(is_active=True)
        form.fields['region'].queryset = available_regions
        form.fields['region'].help_text = format_html(
            '🎯 自动过滤显示 <strong>{}</strong> 站点的 {} 个可用地区',
            site.hostname,
            available_regions.count()
        )




@hooks.register('before_edit_page')
def filter_channel_choices_before_edit(request, page):
    """在显示编辑表单前过滤频道选择"""
    from apps.news.models.article import ArticlePage
    
    # 只处理文章页面
    if not isinstance(page, ArticlePage):
        return
    
    # 保存用户信息到线程本地存储，供后续表单使用
    import threading
    if not hasattr(threading.current_thread(), 'wagtail_user'):
        threading.current_thread().wagtail_user = request.user


@hooks.register('construct_page_editing_form')
def enhance_article_editing_form(page, form_class, edit_handler):
    """
    增强文章编辑表单：站点过滤 + 智能标签建议 + 频道权限过滤
    """
    # 只处理ArticlePage
    from apps.news.models.article import ArticlePage
    if not isinstance(page, ArticlePage):
        return form_class
    
    # 直接修改页面的 content_panels 来添加标签建议
    try:
        _inject_tag_suggestions_to_panels(page)
    except Exception as e:
        pass
    
    # 创建自定义表单类，添加频道权限过滤
    class FilteredChannelForm(form_class):
        def __init__(self, *args, **kwargs):
            # 先获取用户
            user = kwargs.get('for_user')
            
            # 如果没有 for_user，尝试从线程本地存储获取
            if not user:
                import threading
                user = getattr(threading.current_thread(), 'wagtail_user', None)
            
            # 调用父类初始化
            super().__init__(*args, **kwargs)
            
            # 过滤频道选择器
            if user and 'channel' in self.fields:
                from apps.core.models import ChannelGroupPermission
                from django.utils.html import format_html
                
                # 如果不是超级管理员，过滤频道选择器
                if not user.is_superuser:
                    accessible_channels = ChannelGroupPermission.get_accessible_channels(user)
                    
                    if accessible_channels is not None:
                        # 🔥 关键：限制频道下拉列表的选项
                        self.fields['channel'].queryset = accessible_channels
                        
                        # 更新帮助文本，让用户知道为什么只能看到这些频道
                        channel_count = accessible_channels.count()
                        if channel_count > 0:
                            channel_names = ', '.join([c.name for c in accessible_channels[:5]])
                            if channel_count > 5:
                                remaining = channel_count - 5
                                channel_names += f' 等 {remaining} 个'
                            
                            self.fields['channel'].help_text = format_html(
                                '<div style="padding: 8px; background: #e8f4f8; border-left: 4px solid #0074a2; margin-top: 8px; border-radius: 3px;">'
                                '🔐 <strong>权限限制</strong>：您只能在以下 <strong>{}</strong> 个频道中发布文章<br/>'
                                '<span style="color: #0074a2; font-weight: 500;">{}</span>'
                                '</div>',
                                channel_count,
                                channel_names
                            )
                            
                            # 如果当前文章的频道不在允许列表中，给出警告
                            if self.instance and self.instance.channel:
                                if not accessible_channels.filter(id=self.instance.channel.id).exists():
                                    self.fields['channel'].help_text = format_html(
                                        '<div style="padding: 8px; background: #fff8e1; border-left: 4px solid #ff9800; margin-top: 8px; border-radius: 3px;">'
                                        '⚠️ <strong>注意</strong>：当前文章所在的频道"{}"不在您的权限范围内。<br/>'
                                        '您只能将其改为：<strong>{}</strong>'
                                        '</div>',
                                        self.instance.channel.name,
                                        channel_names
                                    )
                        else:
                            # 没有任何频道权限
                            self.fields['channel'].queryset = accessible_channels  # 空查询集
                            self.fields['channel'].help_text = format_html(
                                '<div style="padding: 8px; background: #ffebee; border-left: 4px solid #f44336; margin-top: 8px; border-radius: 3px;">'
                                '⚠️ <strong>无权限</strong>：您没有任何频道的发布权限，请联系管理员授权'
                                '</div>'
                            )
                            self.fields['channel'].disabled = True
    
    return FilteredChannelForm


def _inject_tag_suggestions_to_panels(page):
    """直接在页面的content_panels中注入标签建议"""
    from wagtail.admin.panels import HelpPanel
    from django.utils.html import format_html
    from django.utils.safestring import mark_safe
    
    # 获取文章内容
    title = getattr(page, 'title', '') or ''
    body_content = ''
    
    if hasattr(page, 'body') and page.body:
        body_content = str(page.body)
    
    
    if not title and not body_content:
        suggestions_html = format_html(
            '<div class="help-block" style="margin-top: 10px; padding: 12px; background: #f0f7ff; border-left: 4px solid #007cba; border-radius: 4px;">'
            '<strong style="color: #495057; display: block; margin-bottom: 8px;">🤖 AI标签建议</strong>'
            '<p style="margin: 0; font-size: 12px; color: #6c757d;">请先填写标题和正文内容，保存后重新编辑即可看到AI生成的标签建议</p>'
            '</div>'
        )
    else:
        # 生成实际建议
        try:
            result = tag_suggestion_api.get_suggestions_for_article({
                'title': title,
                'body': body_content
            })
            
            if result.get('success') and result.get('suggestions'):
                good_suggestions = [
                    s for s in result['suggestions'] 
                    if s.get('confidence', 0) > 0.6
                ][:6]
                
                if good_suggestions:
                    suggestions_html = _render_pure_python_suggestions(good_suggestions)
                    suggestions_html = format_html(
                        '<div class="help-block" style="margin-top: 10px; padding: 12px; background: #f8f9fa; border-left: 4px solid #007cba; border-radius: 4px;">'
                        '<strong style="color: #495057; display: block; margin-bottom: 8px;">🤖 AI标签建议</strong>'
                        '<p style="margin: 0 0 10px 0; font-size: 12px; color: #6c757d;">点击建议标签直接添加到标签字段</p>'
                        '{suggestions}'
                        '</div>',
                        suggestions=mark_safe(suggestions_html)
                        )
                else:
                    suggestions_html = format_html(
                        '<div class="help-block">'
                        '<strong>🤖 AI标签建议</strong>'
                        '<p>暂无高质量建议</p>'
                        '</div>'
                    )
            else:
                suggestions_html = format_html(
                    '<div class="help-block">'
                    '<strong>🤖 AI标签建议</strong>'
                    '<p>AI服务暂不可用</p>'
                    '</div>'
                )
        except Exception as e:
            suggestions_html = format_html(
                '<div class="help-block">'
                '<strong>🤖 AI标签建议</strong>'
                '<p>生成建议时出错</p>'
                '</div>'
            )
    
    # 创建帮助面板
    help_panel = HelpPanel(mark_safe(suggestions_html))
    
    # 将帮助面板添加到页面的content_panels中
    if hasattr(page, 'content_panels'):
        # 在标签字段之后插入
        new_panels = []
        for panel in page.content_panels:
            new_panels.append(panel)
            # 如果是标签字段，在其后添加建议
            if hasattr(panel, 'field_name') and panel.field_name == 'tags':
                new_panels.append(help_panel)
        
        page.content_panels = new_panels


def _apply_site_filtering(form, site):
    """应用站点过滤"""
    if site:
        apply_site_filtering_to_form(form, site)
        
        if hasattr(form, 'fields') and 'channel' in form.fields:
            available_count = form.fields['channel'].queryset.count()
            if available_count == 0:
                form.fields['channel'].help_text += format_html(
                    '<br/>⚠️ <strong>警告</strong>: 当前站点没有关联任何频道，请联系管理员配置'
                )


def _add_tag_suggestions_to_enhanced_form(form):
    """为增强表单添加智能标签建议"""
    
    # 检查是否有标签字段
    if 'tags' not in form.fields:
        return
    
    # 检查实例
    instance = getattr(form, 'instance', None)
    if not instance or not hasattr(instance, 'tags'):
        return
    
    
    # 获取文章内容
    title = getattr(instance, 'title', '') or ''
    body_content = ''
    
    if hasattr(instance, 'body') and instance.body:
        body_content = str(instance.body)
    
    
    # 如果没有内容，显示提示
    if not title and not body_content:
        original_help = form.fields['tags'].help_text or ''
        form.fields['tags'].help_text = format_html(
            '{original_help}'
            '<div class="help-block" style="margin-top: 10px; padding: 12px; background: #f0f7ff; border-left: 4px solid #007cba; border-radius: 4px;">'
            '<strong style="color: #495057; display: block; margin-bottom: 8px;">🤖 AI标签建议</strong>'
            '<p style="margin: 0; font-size: 12px; color: #6c757d;">请先填写标题和正文内容，保存后重新编辑即可看到AI生成的标签建议</p>'
            '</div>',
            original_help=original_help
        )
        return
    
    # 生成标签建议
    try:
        result = tag_suggestion_api.get_suggestions_for_article({
            'title': title,
            'body': body_content
        })
        
        
        if result.get('success') and result.get('suggestions'):
            # 过滤高质量建议
            good_suggestions = [
                s for s in result['suggestions'] 
                if s.get('confidence', 0) > 0.6
            ][:6]
            
            
            if good_suggestions:
                _inject_suggestions_into_form(form, good_suggestions)
            
    except Exception as e:
        pass




# ========== 页面发布和取消发布的清缓存功能 ==========

def get_all_site_cache_keys(instance):
    """
    获取所有站点相关的缓存键
    
    为了支持多站点聚合，我们需要清理所有相关站点的缓存
    """
    cache_keys = []
    
    # 基础缓存键模式
    base_patterns = [
        'headlines_*',
        'hot_articles_*', 
        'topics_*',
        'channels_*',
        'categories_*'
    ]
    
    # 当前站点的缓存
    try:
        current_site = instance.get_site()
        site_id = current_site.id
        
        for pattern in base_patterns:
            cache_keys.append(pattern.replace('*', f'site_{site_id}'))
            
    except:
        pass
    
    # 聚合站点的缓存（所有允许聚合的站点）
    if hasattr(instance, 'allow_aggregate') and instance.allow_aggregate:
        from wagtail.models import Site
        all_sites = Site.objects.all()
        
        for site in all_sites:
            for pattern in base_patterns:
                cache_keys.append(pattern.replace('*', f'site_{site.id}'))
    
    return cache_keys


@receiver(page_published, sender='news.ArticlePage')
def clear_cache_on_article_publish(sender, **kwargs):
    """
    文章发布时清理相关缓存
    
    这个信号处理器会在文章发布时清理所有相关的缓存，
    确保新内容能及时在前端显示
    """
    instance = kwargs['instance']
    
    try:
        # 获取需要清理的缓存键
        cache_keys = get_all_site_cache_keys(instance)
        
        # 清理缓存
        from django.core.cache import cache
        for key in cache_keys:
            cache.delete(key)
            
        # 清理页面级缓存
        if hasattr(cache, 'delete_pattern'):
            # 如果使用 Redis 等支持模式删除的缓存后端
            cache.delete_pattern(f'page_*_{instance.id}_*')
            cache.delete_pattern(f'article_list_*')
            
    except Exception as e:
        # 缓存清理失败不应该影响发布流程
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"清理缓存时出错: {str(e)}")


@receiver(page_unpublished, sender='news.ArticlePage')  
def clear_cache_on_article_unpublish(sender, **kwargs):
    """
    文章取消发布时清理相关缓存
    
    确保取消发布的文章不再出现在前端列表中
    """
    instance = kwargs['instance']
    
    try:
        # 获取需要清理的缓存键
        cache_keys = get_all_site_cache_keys(instance)
        
        # 清理缓存
        from django.core.cache import cache
        for key in cache_keys:
            cache.delete(key)
            
        # 清理页面级缓存
        if hasattr(cache, 'delete_pattern'):
            cache.delete_pattern(f'page_*_{instance.id}_*')
            cache.delete_pattern(f'article_list_*')
            
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"清理缓存时出错: {str(e)}")


# 手动清理缓存的管理命令钩子
@hooks.register('register_admin_urls')
def register_cache_management_urls():
    """
    注册缓存管理URL
    
    提供手动清理缓存的管理界面
    """
    from django.urls import path, include
    
    def clear_all_cache_view(request):
        """清理所有缓存的视图"""
        from django.core.cache import cache
        from django.http import JsonResponse
        from django.contrib.admin.views.decorators import staff_member_required
        
        @staff_member_required
        def _clear_cache(request):
            try:
                cache.clear()
                return JsonResponse({'success': True, 'message': '所有缓存已清理'})
            except Exception as e:
                return JsonResponse({'success': False, 'error': str(e)})
        
        return _clear_cache(request)
    
    # 注意：这里返回空列表，因为我们不想暴露这个功能到URL
    # 实际的缓存管理应该通过Django管理命令实现
    return []

# 如果需要更精细的缓存控制，可以在这里添加更多钩子
# 比如基于分类、标签、作者等维度的缓存清理

# 注意事项：
# 1. 缓存清理应该是幂等的，多次执行不会有副作用
# 2. 缓存清理失败不应该影响正常的发布流程  
# 3. 在高并发场景下，应该考虑使用异步任务来执行缓存清理
# 4. 缓存键的命名应该统一，避免键名冲突

# 如需删除钩子，可改用 Django 的 post_delete 连接 ArticlePage 模型


# ========== 独立的文章管理系统 ==========

from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.contrib.admin.views.decorators import staff_member_required
from django.urls import path
from django.core.paginator import Paginator
from django.db.models import Q
from wagtail.admin.menu import MenuItem
from django.views.decorators.http import require_http_methods
from django.contrib import messages


@staff_member_required
def article_management_overview(request):
    """文章管理概览页面"""
    from .models.article import ArticlePage
    
    # 获取统计数据
    stats = {
        'total': ArticlePage.objects.filter(live=True).count(),
        'hero': ArticlePage.objects.filter(live=True, is_hero=True).count(),
        'featured': ArticlePage.objects.filter(live=True, is_featured=True).count(),
        'draft': ArticlePage.objects.filter(live=False).count(),
    }
    
    # 最近的Hero文章
    recent_hero = ArticlePage.objects.filter(
        live=True, is_hero=True
    ).select_related('cover', 'channel').order_by('-first_published_at')[:5]
    
    # 最近的普通文章
    recent_normal = ArticlePage.objects.filter(
        live=True, is_hero=False
    ).select_related('cover', 'channel').order_by('-first_published_at')[:8]
    
    context = {
        'stats': stats,
        'recent_hero': recent_hero,
        'recent_normal': recent_normal,
    }
    
    return render(request, 'wagtail/article_management.html', context)


@staff_member_required
def article_list_view(request, filter_type='all'):
    """独立的文章列表页面"""
    from .models.article import ArticlePage
    
    # 基础查询
    articles = ArticlePage.objects.filter(live=True).select_related('cover', 'channel').prefetch_related('tags')
    
    # 根据过滤类型应用过滤
    if filter_type == 'hero':
        articles = articles.filter(is_hero=True)
        page_title = 'Hero轮播文章'
        filter_desc = '首页Hero轮播展示的文章'
    elif filter_type == 'normal':
        articles = articles.filter(is_hero=False)
        page_title = '普通文章'
        filter_desc = '非Hero轮播的普通文章'
    elif filter_type == 'featured':
        articles = articles.filter(is_featured=True)
        page_title = '置顶推荐文章'
        filter_desc = '标记为置顶推荐的文章'
    elif filter_type == 'draft':
        # 草稿文章：未发布的文章
        articles = ArticlePage.objects.filter(live=False).select_related('cover', 'channel').prefetch_related('tags')
        page_title = '草稿文章'
        filter_desc = '尚未发布的文章草稿'
    else:
        page_title = '所有已发布文章'
        filter_desc = '所有已发布的文章'
    
    # 搜索功能
    search = request.GET.get('search', '')
    if search:
        articles = articles.filter(
            Q(title__icontains=search) | 
            Q(excerpt__icontains=search)
        )
    
    # 分页
    paginator = Paginator(articles.order_by('-first_published_at'), 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    # 生成智能分页范围
    def get_smart_page_range(current_page, total_pages):
        """生成智能分页范围，避免页码过多"""
        if total_pages <= 7:
            return list(range(1, total_pages + 1))
        
        if current_page <= 4:
            # 当前页在前4页
            return list(range(1, 6)) + ['...', total_pages]
        elif current_page >= total_pages - 3:
            # 当前页在后4页
            return [1, '...'] + list(range(total_pages - 4, total_pages + 1))
        else:
            # 当前页在中间
            return [1, '...'] + list(range(current_page - 2, current_page + 3)) + ['...', total_pages]
    
    smart_page_range = get_smart_page_range(page_obj.number, paginator.num_pages) if paginator.num_pages > 1 else []
    
    context = {
        'articles': page_obj,
        'filter_type': filter_type,
        'page_title': page_title,
        'filter_desc': filter_desc,
        'search': search,
        'total_count': articles.count(),
        'smart_page_range': smart_page_range,
    }
    
    return render(request, 'wagtail/article_list.html', context)


@staff_member_required
def my_articles_view(request):
    """我的文章 - 显示当前用户创建的所有文章"""
    from .models.article import ArticlePage
    from apps.core.models import ChannelGroupPermission
    from wagtail.models import WorkflowState
    from django.db.models import Q, Subquery, OuterRef
    
    # 获取当前用户创建的文章
    articles = ArticlePage.objects.filter(owner=request.user).select_related('cover', 'channel').prefetch_related('tags')
    
    # 如果用户不是超级管理员，还要应用频道权限过滤
    if not request.user.is_superuser:
        accessible_channels = ChannelGroupPermission.get_accessible_channels(request.user)
        if accessible_channels is not None:
            # 允许查看：1) 在授权频道内的文章  2) 还没有设置频道的草稿
            articles = articles.filter(
                Q(channel__in=accessible_channels) | Q(channel__isnull=True)
            )
    
    # 获取所有文章的工作流状态（优化性能）
    all_article_ids = list(articles.values_list('id', flat=True))
    workflow_states = {}
    if all_article_ids:
        # 获取每篇文章的最新工作流状态
        # 注意：WorkflowState 使用 object_id 字段关联页面（通用关系）
        for state in WorkflowState.objects.filter(
            object_id__in=all_article_ids,
            status__in=[WorkflowState.STATUS_IN_PROGRESS, WorkflowState.STATUS_NEEDS_CHANGES]
        ):
            workflow_states[state.object_id] = state.status
    
    # 计算工作流相关统计
    in_moderation_count = len([s for s in workflow_states.values() if s == WorkflowState.STATUS_IN_PROGRESS])
    rejected_count = len([s for s in workflow_states.values() if s == WorkflowState.STATUS_NEEDS_CHANGES])
    
    # 统计数据
    stats = {
        'total': articles.count(),
        'published': articles.filter(live=True).count(),
        'draft': articles.filter(live=False).count(),
        'in_moderation': in_moderation_count,
        'rejected': rejected_count,
        'hero': articles.filter(live=True, is_hero=True).count(),
        'featured': articles.filter(live=True, is_featured=True).count(),
    }
    
    # 搜索功能
    search = request.GET.get('search', '')
    if search:
        articles = articles.filter(
            Q(title__icontains=search) | 
            Q(excerpt__icontains=search)
        )
    
    # 状态过滤
    status_filter = request.GET.get('status', 'all')
    if status_filter == 'published':
        articles = articles.filter(live=True)
        filter_desc = '已发布的文章'
    elif status_filter == 'draft':
        articles = articles.filter(live=False)
        filter_desc = '草稿文章'
    elif status_filter == 'in_moderation':
        # 筛选审核中的文章
        in_moderation_ids = [page_id for page_id, status in workflow_states.items() 
                            if status == WorkflowState.STATUS_IN_PROGRESS]
        articles = articles.filter(id__in=in_moderation_ids)
        filter_desc = '审核中的文章'
    elif status_filter == 'rejected':
        # 筛选被拒绝的文章
        rejected_ids = [page_id for page_id, status in workflow_states.items() 
                       if status == WorkflowState.STATUS_NEEDS_CHANGES]
        articles = articles.filter(id__in=rejected_ids)
        filter_desc = '已拒绝的文章'
    else:
        filter_desc = '所有文章'
    
    # 分页 - 使用多字段排序，草稿文章按修订时间排序
    from django.db.models import Case, When, Value, IntegerField, F
    
    # 先按是否发布排序，然后按时间排序
    articles = articles.annotate(
        sort_order=Case(
            When(live=True, then=Value(0)),  # 已发布的排在前面
            When(live=False, then=Value(1)),  # 草稿排在后面
            output_field=IntegerField(),
        )
    ).order_by('sort_order', '-latest_revision_created_at')
    
    paginator = Paginator(articles, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    # 生成智能分页范围
    def get_smart_page_range(current_page, total_pages):
        """生成智能分页范围，避免页码过多"""
        if total_pages <= 7:
            return list(range(1, total_pages + 1))
        
        if current_page <= 4:
            return list(range(1, 6)) + ['...', total_pages]
        elif current_page >= total_pages - 3:
            return [1, '...'] + list(range(total_pages - 4, total_pages + 1))
        else:
            return [1, '...'] + list(range(current_page - 2, current_page + 3)) + ['...', total_pages]
    
    smart_page_range = get_smart_page_range(page_obj.number, paginator.num_pages) if paginator.num_pages > 1 else []
    
    context = {
        'articles': page_obj,
        'stats': stats,
        'page_title': '我的文章',
        'filter_desc': filter_desc,
        'search': search,
        'status_filter': status_filter,
        'total_count': articles.count(),
        'smart_page_range': smart_page_range,
        'current_user': request.user,
    }
    
    return render(request, 'wagtail/my_articles.html', context)


@staff_member_required
def statistics_dashboard(request):
    """统计看板 - 数据可视化"""
    from .models.article import ArticlePage
    from apps.core.models import Channel
    from wagtail.models import WorkflowState
    from django.contrib.auth import get_user_model
    from django.db.models import Count, Q
    from django.utils import timezone
    from datetime import timedelta
    import json
    
    User = get_user_model()
    now = timezone.now()
    today = now.date()
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    
    # 1. 基础统计
    total_articles = ArticlePage.objects.filter(live=True).count()
    total_drafts = ArticlePage.objects.filter(live=False).count()
    total_hero = ArticlePage.objects.filter(live=True, is_hero=True).count()
    total_featured = ArticlePage.objects.filter(live=True, is_featured=True).count()
    
    # 2. 时间维度统计
    today_published = ArticlePage.objects.filter(
        live=True,
        first_published_at__date=today
    ).count()
    
    week_published = ArticlePage.objects.filter(
        live=True,
        first_published_at__gte=week_ago
    ).count()
    
    month_published = ArticlePage.objects.filter(
        live=True,
        first_published_at__gte=month_ago
    ).count()
    
    # 3. 频道分布统计
    channel_stats = ArticlePage.objects.filter(
        live=True
    ).values('channel__name').annotate(
        count=Count('id')
    ).order_by('-count')[:10]
    
    channel_labels = [stat['channel__name'] or '未分类' for stat in channel_stats]
    channel_data = [stat['count'] for stat in channel_stats]
    
    # 4. 用户发文统计（Top 10）
    user_stats = ArticlePage.objects.filter(
        live=True
    ).values('owner__username').annotate(
        count=Count('id')
    ).order_by('-count')[:10]
    
    user_labels = [stat['owner__username'] for stat in user_stats]
    user_data = [stat['count'] for stat in user_stats]
    
    # 5. 工作流统计
    in_moderation = WorkflowState.objects.filter(
        status=WorkflowState.STATUS_IN_PROGRESS
    ).count()
    
    rejected = WorkflowState.objects.filter(
        status=WorkflowState.STATUS_NEEDS_CHANGES
    ).count()
    
    approved_week = WorkflowState.objects.filter(
        status=WorkflowState.STATUS_APPROVED,
        created_at__gte=week_ago
    ).count()
    
    # 6. 最近7天发布趋势
    trend_data = []
    trend_labels = []
    for i in range(6, -1, -1):
        date = today - timedelta(days=i)
        count = ArticlePage.objects.filter(
            live=True,
            first_published_at__date=date
        ).count()
        trend_data.append(count)
        trend_labels.append(date.strftime('%m-%d'))
    
    # 7. Hero文章最近更新
    recent_hero = ArticlePage.objects.filter(
        live=True,
        is_hero=True
    ).select_related('cover', 'channel').order_by('-first_published_at')[:5]
    
    context = {
        # 基础统计
        'total_articles': total_articles,
        'total_drafts': total_drafts,
        'total_hero': total_hero,
        'total_featured': total_featured,
        
        # 时间统计
        'today_published': today_published,
        'week_published': week_published,
        'month_published': month_published,
        
        # 工作流统计
        'in_moderation': in_moderation,
        'rejected': rejected,
        'approved_week': approved_week,
        
        # 图表数据（JSON）
        'channel_labels': json.dumps(channel_labels),
        'channel_data': json.dumps(channel_data),
        'user_labels': json.dumps(user_labels),
        'user_data': json.dumps(user_data),
        'trend_labels': json.dumps(trend_labels),
        'trend_data': json.dumps(trend_data),
        
        # 最近Hero文章
        'recent_hero': recent_hero,
    }
    
    return render(request, 'wagtail/statistics_dashboard.html', context)


@staff_member_required
@require_http_methods(["POST"])
def toggle_hero_status(request, article_id):
    """切换文章的Hero状态"""
    from .models.article import ArticlePage
    
    try:
        article = get_object_or_404(ArticlePage, id=article_id)
        article.is_hero = not article.is_hero
        article.save()
        
        status = "Hero轮播" if article.is_hero else "普通文章"
        messages.success(request, f'文章《{article.title}》已设置为{status}')
        
        return JsonResponse({
            'success': True, 
            'is_hero': article.is_hero,
            'message': f'已设置为{status}'
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})


@staff_member_required
@require_http_methods(["POST"])
def toggle_featured_status(request, article_id):
    """切换文章的置顶状态"""
    from .models.article import ArticlePage
    
    try:
        article = get_object_or_404(ArticlePage, id=article_id)
        article.is_featured = not article.is_featured
        article.save()
        
        status = "置顶推荐" if article.is_featured else "普通显示"
        messages.success(request, f'文章《{article.title}》已设置为{status}')
        
        return JsonResponse({
            'success': True, 
            'is_featured': article.is_featured,
            'message': f'已设置为{status}'
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})


@hooks.register('register_admin_urls')
def register_article_management_urls():
    """注册独立的文章管理URL"""
    return [
        path('articles/', article_management_overview, name='article-management-overview'),
        path('articles/list/<str:filter_type>/', article_list_view, name='article-list'),
        path('articles/list/', article_list_view, {'filter_type': 'all'}, name='article-list-all'),
        path('articles/drafts/', article_list_view, {'filter_type': 'draft'}, name='article-list-drafts'),
        path('articles/my/', my_articles_view, name='my-articles'),
        path('articles/statistics/', statistics_dashboard, name='statistics-dashboard'),
        path('articles/toggle-hero/<int:article_id>/', toggle_hero_status, name='toggle-hero'),
        path('articles/toggle-featured/<int:article_id>/', toggle_featured_status, name='toggle-featured'),
    ]


@hooks.register('construct_main_menu')
def add_article_management_menu(request, menu_items, **kwargs):
    """添加文章管理菜单"""
    
    menu_items.append(
        MenuItem(
            '文章管理',
            '/admin/articles/',
            icon_name='doc-full-inverse',
            order=150
        )
    )
    
    # 添加"我的文章"菜单
    menu_items.append(
        MenuItem(
            '我的文章',
            '/admin/articles/my/',
            icon_name='user',
            order=155
        )
    )
    
    # 添加"统计看板"菜单
    menu_items.append(
        MenuItem(
            '统计看板',
            '/admin/articles/statistics/',
            icon_name='snippet',
            order=160
        )
    )




def _inject_suggestions_into_form(form, suggestions):
    """将建议注入到表单的标签字段"""
    
    if 'tags' not in form.fields:
        return
    
    # 生成建议HTML
    suggestions_html = _render_pure_python_suggestions(suggestions)
    
    # 更新标签字段的help_text
    original_help = form.fields['tags'].help_text or ''
    
    form.fields['tags'].help_text = format_html(
        '{original_help}'
        '<div class="help-block" style="margin-top: 10px; padding: 12px; background: #f8f9fa; border-left: 4px solid #007cba; border-radius: 4px;">'
        '<strong style="color: #495057; display: block; margin-bottom: 8px;">🤖 AI标签建议</strong>'
        '<p style="margin: 0 0 10px 0; font-size: 12px; color: #6c757d;">点击建议标签直接添加到上方标签字段</p>'
        '{suggestions}'
        '</div>',
        original_help=original_help,
        suggestions=mark_safe(suggestions_html)
    )


def _render_pure_python_suggestions(suggestions):
    """纯Python渲染标签建议HTML（使用Wagtail默认样式）"""
    
    suggestion_buttons = []
    
    for suggestion in suggestions:
        tag_text = suggestion['text']
        confidence = suggestion.get('confidence', 0)
        is_new = suggestion.get('is_new', False)
        
        # 置信度百分比
        confidence_percent = int(confidence * 100)
        
        # 使用Wagtail默认的按钮样式类
        if is_new:
            button_class = "button button-small"
            button_style = "background-color: #f39c12; border-color: #e67e22;"
            type_badge = "新"
        else:
            button_class = "button button-small button-secondary"
            button_style = ""
            type_badge = "✓"
        
        # 生成按钮HTML
        button_html = format_html(
            '<button type="button" class="{button_class}" style="margin: 2px; {button_style}" '
            'onclick="addTagToField(\'{tag_text}\')" '
            'title="置信度: {confidence_percent}%">'
            '{tag_text} <small>({confidence_percent}% {type_badge})</small>'
            '</button>',
            button_class=button_class,
            button_style=button_style,
            tag_text=tag_text,
            confidence_percent=confidence_percent,
            type_badge=type_badge
        )
        
        suggestion_buttons.append(button_html)
    
    # 添加必要的JavaScript函数
    script_html = format_html('''
        <script>
        function addTagToField(tagText) {{
            var tagInput = document.querySelector('input[name="tags"]') || document.querySelector('#id_tags');
            if (!tagInput) {{
                alert('未找到标签字段');
                return;
            }}
            
            var currentTags = tagInput.value.trim();
            var existingTags = currentTags ? currentTags.split(',').map(function(t) {{ return t.trim(); }}) : [];
            
            if (existingTags.indexOf(tagText) !== -1) {{
                alert('标签 "' + tagText + '" 已存在');
                return;
            }}
            
            var newValue = currentTags ? currentTags + ', ' + tagText : tagText;
            tagInput.value = newValue;
            
            // 触发change事件
            var event = new Event('change', {{ bubbles: true }});
            tagInput.dispatchEvent(event);
            
            // 禁用按钮
            event.target.disabled = true;
            event.target.style.opacity = '0.6';
            event.target.innerHTML += ' ✓';
        }}
        </script>
    ''')
    
    return ''.join(suggestion_buttons) + script_html


# ========== 自定义富文本编辑器功能 ==========

from wagtail.admin.rich_text.editors.draftail.features import InlineStyleFeature
from wagtail.admin.rich_text.converters.html_to_contentstate import InlineStyleElementHandler


@hooks.register('register_rich_text_features')
def register_underline_feature(features):
    """注册下划线功能"""
    feature_name = 'underline'
    type_ = 'UNDERLINE'
    tag = 'u'

    control = {
        'type': type_,
        'label': 'U',
        'description': '下划线',
    }

    features.register_editor_plugin(
        'draftail', feature_name, InlineStyleFeature(control)
    )

    db_conversion = {
        'from_database_format': {tag: InlineStyleElementHandler(type_)},
        'to_database_format': {'style_map': {type_: tag}},
    }
    
    features.register_converter_rule('contentstate', feature_name, db_conversion)




# 为下划线功能添加CSS样式
@hooks.register('insert_global_admin_css')
def underline_rich_text_css():
    """为下划线功能添加CSS样式"""
    return format_html("""
    <style>
    /* 下划线样式 - 编辑器内和前端显示 */
    .DraftEditor-root u {{ text-decoration: underline !important; }}
    .rich-text u {{ text-decoration: underline; }}
    
    /* 确保下划线在所有情况下都能正确显示 */
    .rich-text u, .DraftEditor-root u {{
        text-decoration-line: underline;
        text-decoration-style: solid;
    }}
    </style>
    """)


# ========== 频道权限检查 ==========

@hooks.register('before_edit_page')
def check_channel_permission_before_edit(request, page):
    """在编辑文章前检查频道权限"""
    from .models.article import ArticlePage
    from apps.core.models import ChannelGroupPermission
    
    # 只处理文章页面
    if not isinstance(page, ArticlePage):
        return
    
    # 超级管理员跳过检查
    if request.user.is_superuser:
        return
    
    # 检查频道权限
    if page.channel:
        accessible_channels = ChannelGroupPermission.get_accessible_channels(request.user)
        
        if accessible_channels is not None:
            # 用户有频道限制
            if not accessible_channels.filter(id=page.channel.id).exists():
                # 没有权限访问该频道
                channel_list = ', '.join([c.name for c in accessible_channels[:5]])
                messages.error(
                    request,
                    f'⚠️ 您没有权限编辑"{page.channel.name}"频道的文章。您只能编辑：{channel_list}'
                )
                return redirect(reverse('wagtailadmin_explore_root'))


@hooks.register('after_create_page')
def check_channel_permission_after_create(request, page):
    """创建文章后检查频道权限（防止绕过前端验证）"""
    from .models.article import ArticlePage
    from apps.core.models import ChannelGroupPermission
    
    # 只处理文章页面
    if not isinstance(page, ArticlePage):
        return
    
    # 超级管理员跳过检查
    if request.user.is_superuser:
        return
    
    # 检查频道权限
    if page.channel:
        accessible_channels = ChannelGroupPermission.get_accessible_channels(request.user)
        
        if accessible_channels is not None:
            # 用户有频道限制
            if not accessible_channels.filter(id=page.channel.id).exists():
                # 没有权限 - 删除刚创建的页面
                page.delete()
                
                channel_list = ', '.join([c.name for c in accessible_channels[:5]])
                messages.error(
                    request,
                    f'⚠️ 创建失败：您没有权限在"{page.channel.name}"频道创建文章。您只能在以下频道创建：{channel_list}'
                )
                return redirect(reverse('wagtailadmin_explore_root'))


# ============================================================================
# 批量操作功能
# ============================================================================

@hooks.register('register_admin_urls')
def register_bulk_actions_urls():
    """注册批量操作的URL"""
    from django.urls import path
    from apps.news.views import bulk_actions, template_actions
    
    return [
        # 批量操作
        path('articles/bulk/', bulk_actions.bulk_actions_page, name='bulk_actions'),
        path('articles/bulk/publish/', bulk_actions.bulk_publish, name='bulk_publish'),
        path('articles/bulk/unpublish/', bulk_actions.bulk_unpublish, name='bulk_unpublish'),
        path('articles/bulk/change-channel/', bulk_actions.bulk_change_channel, name='bulk_change_channel'),
        path('articles/bulk/add-tags/', bulk_actions.bulk_add_tags, name='bulk_add_tags'),
        path('articles/bulk/delete/', bulk_actions.bulk_delete, name='bulk_delete'),
        path('articles/bulk/set-publish-time/', bulk_actions.bulk_set_publish_time, name='bulk_set_publish_time'),
        path('articles/bulk/export/', bulk_actions.bulk_export, name='bulk_export'),
        
        # 文章模板
        path('articles/templates/', template_actions.template_list_view, name='template_list'),
        path('articles/templates/<int:template_id>/create/', template_actions.create_from_template, name='create_from_template'),
    ]


@hooks.register('construct_main_menu')
def add_bulk_actions_menu_item(request, menu_items):
    """添加批量操作菜单项"""
    from wagtail.admin.menu import MenuItem
    
    menu_items.append(
        MenuItem(
            '📦 批量操作',
            reverse('bulk_actions'),
            order=205,  # 在"我的文章"后面
        )
    )


@hooks.register('construct_main_menu')
def add_article_template_menu_item(request, menu_items):
    """添加文章模板菜单项"""
    from wagtail.admin.menu import MenuItem
    
    menu_items.append(
        MenuItem(
            '📄 文章模板',
            reverse('wagtailsnippets_news_articletemplate:list'),
            order=206,  # 在"批量操作"后面
        )
    )
  