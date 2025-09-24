"""
文章API模块的URL配置

将模块化的API端点统一导出
"""

from .articles import articles_list, article_detail
from .channels import channels_list, channel_recommendations
from .regions import regions_list
from .portal import portal_articles
from .hero import hero_articles
from .settings import site_settings

# 导出所有API端点供URL配置使用
__all__ = [
    'articles_list',
    'article_detail', 
    'channels_list',
    'channel_recommendations',
    'regions_list',
    'portal_articles',
    'hero_articles',
    'site_settings'
]
