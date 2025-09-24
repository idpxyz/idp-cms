"""
搜索应用工具函数
"""

from django.conf import settings


def get_site_from_article(article):
    """从文章获取站点标识符"""
    try:
        site = article.get_site()
        return site.hostname
    except Exception:
        return getattr(settings, 'SITE_HOSTNAME', 'localhost')


def normalize_site_identifier(site_identifier):
    """标准化站点标识符"""
    if not site_identifier:
        return 'localhost'
    return site_identifier.lower().replace('www.', '')


# 注意：read_alias 函数已废弃，请使用 simple_index.get_index_name() 代替
