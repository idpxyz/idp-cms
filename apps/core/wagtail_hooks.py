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

from .models import SiteSettings


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


# 注册CDN模型为snippets
register_snippet(CDNProvider)
register_snippet(SiteCDNConfig)


@hooks.register('construct_main_menu')
def add_cdn_menu(request, menu_items, **kwargs):
    """添加CDN管理菜单"""
    from django.urls import reverse
    
    try:
        # 添加CDN服务提供商菜单
        menu_items.append(
            MenuItem(
                'CDN服务提供商',
                reverse('wagtailsnippets:list', args=['core', 'cdnprovider']),
                icon_name='globe',
                classname='icon icon-globe',
                order=300
            )
        )
        
        # 添加站点CDN配置菜单
        menu_items.append(
            MenuItem(
                '站点CDN配置',
                reverse('wagtailsnippets:list', args=['core', 'sitecdnconfig']),
                icon_name='site',
                classname='icon icon-site',
                order=301
            )
        )
    except Exception as e:
        # 如果URL解析失败，跳过菜单添加
        print(f"CDN菜单添加失败: {e}")
        pass
