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


def read_alias(site_identifier):
    """获取站点的OpenSearch索引别名"""
    normalized = normalize_site_identifier(site_identifier)
    return f"articles_{normalized.replace('.', '_')}"
