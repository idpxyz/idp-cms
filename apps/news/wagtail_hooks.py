"""
Wagtail钩子 - 根据父页面关联的站点过滤频道和地区选择器
"""

from wagtail import hooks
from django.utils.html import format_html


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
def filter_article_editing_form(page, form_class, edit_handler):
    """
    为ArticlePage编辑表单过滤频道和地区字段
    """
    from apps.news.models.article import ArticlePage
    
    if isinstance(page, ArticlePage):
        current_site = page.get_site()
        
        class SiteFilteredEditForm(form_class):
            def __init__(self, *args, **kwargs):
                super().__init__(*args, **kwargs)
                apply_site_filtering_to_form(self, current_site)
        
        return SiteFilteredEditForm
    
    return form_class


@hooks.register('construct_page_creation_form')
def filter_article_creation_form(page_class, form_class, edit_handler):
    """
    为ArticlePage创建表单过滤频道和地区字段
    """
    from apps.news.models.article import ArticlePage
    
    if page_class == ArticlePage:
        
        class SiteFilteredCreationForm(form_class):
            def __init__(self, *args, **kwargs):
                super().__init__(*args, **kwargs)
                
                # 获取父页面和站点信息
                parent_page = self._get_parent_page_from_context(*args, **kwargs)
                current_site = None
                
                if parent_page:
                    try:
                        current_site = parent_page.get_site()
                    except:
                        pass
                
                # 应用过滤
                if current_site:
                    apply_site_filtering_to_form(self, current_site)
                    # 添加调试信息
                    if 'channel' in self.fields:
                        self.fields['channel'].help_text += format_html(
                            '<br/>🔍 当前创建位置: {}<br/>',
                            parent_page.title if parent_page else '未知'
                        )
                else:
                    # 如果无法确定站点，显示警告
                    if hasattr(self, 'fields'):
                        if 'channel' in self.fields:
                            self.fields['channel'].help_text = "⚠️ 无法确定当前站点，显示所有频道（请确保在正确的站点页面下创建文章）"
                        if 'region' in self.fields:
                            self.fields['region'].help_text = "⚠️ 无法确定当前站点，显示所有地区（请确保在正确的站点页面下创建文章）"
            
            def _get_parent_page_from_context(self, *args, **kwargs):
                """从多种来源获取父页面"""
                parent_page = None
                
                # 方法1: 从instance获取（如果已设置）
                if hasattr(self, 'instance') and self.instance and hasattr(self.instance, 'get_parent'):
                    try:
                        parent_page = self.instance.get_parent()
                        if parent_page and parent_page.depth > 1:  # 确保不是根页面
                            return parent_page
                    except:
                        pass
                
                # 方法2: 从初始数据获取
                if 'initial' in kwargs and kwargs['initial']:
                    parent_page = kwargs['initial'].get('parent_page')
                    if parent_page:
                        return parent_page
                
                # 方法3: 尝试从全局变量获取（在before_create_page钩子中设置）
                import threading
                local_data = getattr(threading.current_thread(), '_wagtail_article_context', None)
                if local_data and 'parent_page' in local_data:
                    return local_data['parent_page']
                
                return None
        
        return SiteFilteredCreationForm
    
    return form_class

# 添加一个视图钩子来确保父页面信息正确传递
@hooks.register('before_create_page')
def ensure_parent_page_context(request, parent_page, page_class):
    """
    确保父页面信息在创建页面时正确传递
    """
    from apps.news.models.article import ArticlePage
    import threading
    
    if page_class == ArticlePage and parent_page:
        # 使用线程本地存储保存父页面信息
        thread = threading.current_thread()
        if not hasattr(thread, '_wagtail_article_context'):
            thread._wagtail_article_context = {}
        
        thread._wagtail_article_context['parent_page'] = parent_page
        try:
            thread._wagtail_article_context['parent_site'] = parent_page.get_site()
        except:
            pass
        
        print(f"DEBUG: 设置父页面上下文 - {parent_page.title} ({parent_page.get_site().hostname})")

