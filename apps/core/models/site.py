"""
直接扩展 Wagtail Site 模型
使用 Monkey Patching 方式添加 slug 字段
"""
from django.db import models
from django.utils.text import slugify
from wagtail.models import Site


# 直接为 Wagtail 的 Site 模型添加 slug 字段
Site.add_to_class('slug', models.SlugField(
    max_length=50,
    unique=True,
    blank=True,
    null=True,
    help_text="站点的唯一标识符，用于 URL 和代码中引用"
))


def save_with_slug(self, *args, **kwargs):
    """为 Site 模型添加自动生成 slug 的保存方法"""
    if not self.slug:
        # 智能从 hostname 生成 slug
        hostname_parts = self.hostname.lower().split('.')
        
        # 如果是子域名，使用子域名作为 slug
        if len(hostname_parts) > 2 and hostname_parts[0] not in ['www', 'api', 'admin']:
            self.slug = slugify(hostname_parts[0])
        # 如果是主域名，使用 'portal'
        elif 'aivoya.com' in self.hostname.lower() and len(hostname_parts) <= 2:
            self.slug = 'portal'
        # 如果是本地开发环境
        elif 'localhost' in self.hostname.lower() or '127.0.0.1' in self.hostname.lower():
            self.slug = 'localhost'
        else:
            # 默认从 hostname 第一部分生成
            self.slug = slugify(hostname_parts[0])
    
    # 调用原始的 save 方法
    super(Site, self).save(*args, **kwargs)


# 替换原始的 save 方法
Site.save = save_with_slug


# 添加便捷方法
def get_by_slug(cls, slug):
    """根据 slug 获取站点"""
    try:
        return cls.objects.get(slug=slug)
    except cls.DoesNotExist:
        return None


def get_by_hostname(cls, hostname):
    """根据 hostname 获取站点"""
    try:
        return cls.objects.get(hostname=hostname)
    except cls.DoesNotExist:
        return None


def get_portal_site(cls):
    """获取门户站点 (默认站点)"""
    # 尝试获取标记为默认的站点
    portal = cls.objects.filter(is_default_site=True).first()
    if portal:
        return portal
    
    # 回退到通过 slug 查找
    return cls.get_by_slug('portal')


def get_all_sites_info(cls):
    """获取所有站点的基本信息"""
    sites = cls.objects.all().values('id', 'hostname', 'slug', 'site_name', 'is_default_site')
    return list(sites)


def get_sites_by_type(cls, site_type='all'):
    """
    根据类型获取站点
    
    Args:
        site_type: 'local' (地方站), 'portal' (门户), 'all' (所有)
    """
    if site_type == 'portal':
        return cls.objects.filter(is_default_site=True)
    elif site_type == 'local':
        return cls.objects.filter(is_default_site=False)
    else:
        return cls.objects.all()


# 为 Site 类添加类方法
Site.get_by_slug = classmethod(get_by_slug)
Site.get_by_hostname = classmethod(get_by_hostname)
Site.get_portal_site = classmethod(get_portal_site)
Site.get_all_sites_info = classmethod(get_all_sites_info)
Site.get_sites_by_type = classmethod(get_sites_by_type)
