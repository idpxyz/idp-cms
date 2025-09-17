"""
Wagtail钩子 - 根据父页面关联的站点过滤频道和地区选择器
"""

from wagtail import hooks
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.dispatch import receiver
from wagtail.signals import page_published, page_unpublished
from .services.tag_suggestion import tag_suggestion_api


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




@hooks.register('construct_page_editing_form')
def enhance_article_editing_form(page, form_class, edit_handler):
    """
    增强文章编辑表单：站点过滤 + 智能标签建议
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
    
    return form_class


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
