"""
文章模板相关视图
"""

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse
from django.views.decorators.http import require_http_methods

from apps.news.models import ArticleTemplate, ArticlePage
from apps.core.models import ChannelGroupPermission


@login_required
@require_http_methods(["GET"])
def template_list_view(request):
    """
    模板列表页面
    显示所有可用的文章模板
    """
    templates = ArticleTemplate.objects.filter(is_active=True).order_by('-usage_count', 'template_type', 'name')
    
    # 按类型分组
    templates_by_type = {}
    for template in templates:
        type_name = template.get_template_type_display()
        if type_name not in templates_by_type:
            templates_by_type[type_name] = []
        templates_by_type[type_name].append(template)
    
    context = {
        'templates': templates,
        'templates_by_type': templates_by_type,
        'popular_templates': ArticleTemplate.get_popular_templates(5),
    }
    
    return render(request, 'wagtail/template_list.html', context)


@login_required
@require_http_methods(["GET"])
def create_from_template(request, template_id):
    """
    从模板创建文章
    将模板内容预填充到新文章中
    """
    template = get_object_or_404(ArticleTemplate, id=template_id, is_active=True)
    
    # 检查用户是否有权限访问模板指定的频道
    if template.default_channel:
        if not request.user.is_superuser:
            accessible_channels = ChannelGroupPermission.get_accessible_channels(request.user)
            if template.default_channel not in accessible_channels:
                messages.error(request, f'⚠️ 您没有权限在"{template.default_channel.name}"频道创建文章')
                return redirect('template_list')
    
    # 增加模板使用计数
    template.increment_usage()
    
    # 构建预填充的URL参数
    from urllib.parse import urlencode
    params = {}
    
    if template.title_template:
        params['title'] = template.title_template
    if template.excerpt_template:
        params['excerpt'] = template.excerpt_template
    if template.default_channel:
        params['channel'] = template.default_channel.id
    if template.default_tags:
        params['tags'] = template.default_tags
    if template.default_author_name:
        params['author_name'] = template.default_author_name
    
    # 获取文章根页面
    from wagtail.models import Page
    try:
        # 假设文章根页面是ID为3或者标题为"文章"的页面
        article_index = Page.objects.filter(depth=3).first()
        if not article_index:
            article_index = Page.objects.get(depth=2).get_children().first()
        
        # 构建创建文章的URL
        add_url = reverse('wagtailadmin_pages:add', args=('news', 'articlepage', article_index.id))
        
        # 添加查询参数
        if params:
            add_url += '?' + urlencode(params)
        
        messages.success(
            request,
            f'✅ 已应用模板：{template.name}，请继续完善文章内容'
        )
        
        return redirect(add_url)
        
    except Exception as e:
        messages.error(request, f'❌ 无法创建文章：{str(e)}')
        return redirect('template_list')

