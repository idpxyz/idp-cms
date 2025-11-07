from wagtail import hooks
from wagtail.admin.menu import MenuItem, SubmenuMenuItem
from wagtail.admin.ui.tables import Column, Table
from wagtail.admin.views import generic
from wagtail.models import Site
from django.urls import reverse
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _
from django.shortcuts import redirect
from django.contrib import messages
# Wagtail 7.1 中 modeladmin 已被移除，使用 snippets 替代
# from wagtail.contrib.modeladmin.options import (
#     ModelAdmin, ModelAdminGroup, modeladmin_register)
# from wagtail.contrib.modeladmin.views import IndexView
from .models import SiteSettings, Channel, Region, Language, ExternalSite, CDNProvider, SiteCDNConfig, ChannelGroupPermission


@hooks.register('construct_main_menu')
def add_site_config_menu(request, menu_items, **kwargs):
    """添加站点配置管理菜单"""
    # 获取所有站点
    sites = Site.objects.all()
    
    # 创建子菜单项
    submenu_items = []
    for site in sites:
        try:
            settings = SiteSettings.get_for_site(site)
            config_url = reverse('wagtailsnippets:edit', args=['core', 'sitesettings', settings.id])
            
            submenu_items.append(
                MenuItem(
                    f"{site.site_name} ({site.hostname})",
                    config_url,
                    icon_name='site',
                    classname='icon icon-site'
                )
            )
        except Exception:
            # 如果获取配置失败，跳过
            continue
    
    # 添加站点配置子菜单
    if submenu_items:
        menu_items.append(
            SubmenuMenuItem(
                _('站点配置'),
                submenu_items,
                icon_name='site',
                classname='icon icon-site',
                order=200
            )
        )


@hooks.register('construct_explorer_page_queryset')
def filter_sites_by_user_permissions(parent_page, pages, request, **kwargs):
    """根据用户权限过滤站点页面"""
    # 这里可以添加基于用户角色的站点过滤逻辑
    return pages


from wagtail.admin import widgets as wagtailadmin_widgets

@hooks.register('register_page_listing_buttons')
def add_site_config_button(page, user, next_url=None):
    """在页面列表中添加站点配置按钮"""
    # 只对根页面显示配置按钮
    if page.depth == 1:
        try:
            site = page.get_site()
            if site:
                settings = SiteSettings.get_for_site(site)
                config_url = reverse('wagtailsnippets:edit', args=['core', 'sitesettings', settings.id])
                
                yield wagtailadmin_widgets.ListingButton(
                    _('站点配置'),
                    config_url,
                    priority=10
                )
        except Exception:
            pass


class SiteConfigOverviewView(generic.IndexView):
    """站点配置概览视图"""
    template_name = 'wagtail/site_config_overview.html'
    page_title = _('站点配置概览')
    page_kwarg = 'p'
    
    def get_queryset(self):
        """获取所有站点的配置"""
        sites = Site.objects.all()
        configs = []
        
        for site in sites:
            try:
                settings = SiteSettings.get_for_site(site)
                configs.append({
                    'site': site,
                    'settings': settings,
                    'status': settings.config_status,
                    'summary': settings.config_summary,
                })
            except Exception:
                configs.append({
                    'site': site,
                    'settings': None,
                    'status': {'is_valid': False, 'score': 0, 'warnings': ['配置加载失败']},
                    'summary': None,
                })
        
        return configs
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['configs'] = self.get_queryset()
        return context


@hooks.register('register_admin_urls')
def register_site_config_urls():
    """注册站点配置相关的URL"""
    from django.urls import path
    
    return [
        path('site-config-overview/', SiteConfigOverviewView.as_view(), name='site-config-overview'),
    ]


@hooks.register('construct_main_menu')
def add_site_config_overview_menu(request, menu_items, **kwargs):
    """添加站点配置概览菜单"""
    menu_items.append(
        MenuItem(
            _('站点配置概览'),
            reverse('site-config-overview'),
            icon_name='site',
            classname='icon icon-site',
            order=199
        )
    )


@hooks.register('construct_page_chooser_queryset')
def filter_pages_by_site(pages, request, **kwargs):
    """根据当前站点过滤页面选择器中的页面"""
    # 这里可以添加基于站点的页面过滤逻辑
    return pages


@hooks.register('before_edit_page')
def before_edit_page(request, page, **kwargs):
    """编辑页面前的处理"""
    # 可以在这里添加基于站点配置的验证逻辑
    pass


@hooks.register('after_edit_page')
def after_edit_page(request, page, **kwargs):
    """编辑页面后的处理"""
    # 可以在这里添加基于站点配置的后处理逻辑
    pass


# CDN配置管理 - 使用新的Wagtail管理界面
from wagtail.admin.panels import FieldPanel
from wagtail.snippets.models import register_snippet
from .models import CDNProvider, SiteCDNConfig

# CDN模型已经在model定义中用@register_snippet装饰器注册，无需重复注册


@hooks.register('construct_main_menu')
def add_cdn_menu(request, menu_items, **kwargs):
    """添加CDN管理菜单"""
    from django.urls import reverse
    
    try:
        # 添加CDN服务提供商菜单
        menu_items.append(
            MenuItem(
                'CDN服务提供商',
                reverse('wagtailsnippets_core_cdnprovider:list'),
                icon_name='globe',
                classname='icon icon-globe',
                order=300
            )
        )
        
        # 添加站点CDN配置菜单
        menu_items.append(
            MenuItem(
                '站点CDN配置',
                reverse('wagtailsnippets_core_sitecdnconfig:list'),
                icon_name='site',
                classname='icon icon-site',
                order=301
            )
        )
    except Exception as e:
        # 如果URL解析失败，跳过菜单添加
        print(f"CDN菜单添加失败: {e}")
        pass



# 暂时注释掉 modeladmin 相关代码，使用 Django admin 管理
# 或者通过 Wagtail snippets 管理 ExternalSite


# 字体和主题预览功能
# 通过自定义CSS和JavaScript在snippet页面显示预览效果

@hooks.register('insert_global_admin_css')
def add_font_preview_styles():
    """字体和主题预览样式"""
    return """
    <style>
    /* 字体预览样式 */
    .font-preview-sample {
        font-size: 16px;
        padding: 8px 12px;
        margin: 8px 0;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: #f9f9f9;
        display: inline-block;
    }
    
    /* 主题预览样式 */
    .theme-preview-sample {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px;
        margin: 8px 0;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: #f9f9f9;
    }
    
    .theme-color-block {
        width: 40px;
        height: 30px;
        border-radius: 3px;
        border: 1px solid #ccc;
    }
    
    /* 在snippet列表中添加预览 */
    .snippet-list .font-preview,
    .snippet-list .theme-preview {
        max-width: 200px;
        font-size: 14px;
    }
    </style>
    """



@hooks.register('insert_global_admin_js')
def add_font_preview_script():
    """字体预览功能的JavaScript"""
    return """
    <script>
    document.addEventListener('DOMContentLoaded', function() {
        // 字体预览功能
        function updateFontPreview() {
            const previewArea = document.getElementById('font-preview-area');
            const cssValueField = document.querySelector('input[name="css_value"]');
            const nameField = document.querySelector('input[name="name"]');
            
            if (previewArea && cssValueField) {
                const fontFamily = cssValueField.value || 'inherit';
                const fontName = nameField ? nameField.value : '字体';
                
                previewArea.innerHTML = `
                    <div class="font-preview-sample" style="font-family: ${fontFamily};">
                        <h4>📝 ${fontName} 字体预览</h4>
                        <div style="font-size: 18px; margin: 8px 0;">
                            <div style="font-weight: normal;">常规文本：这是${fontName}的预览效果 Regular Text Preview 123456</div>
                            <div style="font-weight: bold; margin-top: 8px;">粗体文本：这是${fontName}的粗体效果 Bold Text Preview 123456</div>
                            <div style="font-style: italic; margin-top: 8px;">斜体文本：这是${fontName}的斜体效果 Italic Text Preview 123456</div>
                        </div>
                        <small style="color: #666;">CSS字体值: ${fontFamily}</small>
                    </div>
                `;
            }
        }
        
        // 监听字段变化
        const cssField = document.querySelector('input[name="css_value"]');
        const nameField = document.querySelector('input[name="name"]');
        
        if (cssField) {
            cssField.addEventListener('input', updateFontPreview);
            updateFontPreview(); // 初始化预览
        }
        
        if (nameField) {
            nameField.addEventListener('input', updateFontPreview);
        }
        
        // 在snippet列表页面添加预览列
        setTimeout(function() {
            const fontRows = document.querySelectorAll('tbody tr');
            fontRows.forEach(function(row) {
                const firstCell = row.querySelector('td:first-child a');
                if (firstCell && firstCell.textContent.includes('🔤')) {
                    const fontFamily = extractFontFamily(firstCell.textContent);
                    const previewCell = document.createElement('td');
                    previewCell.innerHTML = `<div class="font-preview-sample" style="font-family: ${fontFamily}; font-size: 14px; padding: 4px 8px;">Aa字体</div>`;
                    row.appendChild(previewCell);
                }
            });
        }, 500);
        
        function extractFontFamily(text) {
            const match = text.match(/- (.+)$/);
            return match ? match[1] : 'inherit';
        }
    });
    </script>
    """


# ==========================================
# 频道权限控制
# ==========================================

@hooks.register('construct_snippet_listing_queryset')
def filter_channels_by_permission(queryset, request):
    """
    根据用户权限过滤频道列表
    
    只显示用户有权访问的频道
    """
    # 仅对 Channel 模型进行过滤
    if queryset.model != Channel:
        return queryset
    
    # 超级管理员可以看到所有频道
    if request.user.is_superuser:
        return queryset
    
    # 获取用户可访问的频道
    accessible_channels = ChannelGroupPermission.get_accessible_channels(request.user)
    
    # 如果返回 None，表示无限制，返回所有频道
    if accessible_channels is None:
        return queryset
    
    # 否则只返回可访问的频道
    return accessible_channels


@hooks.register('before_edit_snippet')
def check_channel_edit_permission(request, instance):
    """
    检查用户是否有权编辑该频道
    """
    if isinstance(instance, Channel):
        if not request.user.is_superuser:
            if not ChannelGroupPermission.user_can_edit_channel(request.user, instance):
                messages.error(request, _('您没有权限编辑该频道'))
                return redirect('wagtailsnippets:list', 'core', 'channel')


@hooks.register('before_delete_snippet')
def check_channel_delete_permission(request, instance):
    """
    检查用户是否有权删除该频道
    """
    if isinstance(instance, Channel):
        if not request.user.is_superuser:
            # 只有有编辑权限的用户才能删除
            if not ChannelGroupPermission.user_can_edit_channel(request.user, instance):
                messages.error(request, _('您没有权限删除该频道'))
                return redirect('wagtailsnippets:list', 'core', 'channel')


@hooks.register('construct_main_menu')
def add_channel_permission_menu(request, menu_items, **kwargs):
    """添加频道权限管理菜单"""
    try:
        # 只有超级管理员可以看到权限管理菜单
        if request.user.is_superuser:
            menu_items.append(
                MenuItem(
                    '🔐 频道权限管理',
                    reverse('wagtailsnippets_core_channelgrouppermission:list'),
                    icon_name='lock',
                    classname='icon icon-lock',
                    order=250
                )
            )
    except Exception as e:
        # 如果URL解析失败，跳过菜单添加
        print(f"频道权限菜单添加失败: {e}")
        pass
