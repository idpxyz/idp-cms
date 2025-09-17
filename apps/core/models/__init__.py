"""
核心模型定义

包含系统核心功能所需的模型：
- Channel: 频道模型
- Category: 分类模型
- Region: 地区模型
- SiteSettings: 站点配置模型
- Comment: 评论模型
- CustomConfigItem: 自定义配置项模型
- Theme: 主题模型
- Font: 字体模型
- Timezone: 时区模型
- DateFormat: 日期格式模型
- CDNProvider: CDN服务提供商模型
- SiteCDNConfig: 站点CDN配置模型
- ExternalSite: 外部网站配置模型
"""

from django import forms
from django.db import models
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from wagtail.models import Site
from wagtail.admin.panels import FieldPanel, MultiFieldPanel
from wagtail.snippets.models import register_snippet
from modelcluster.models import ClusterableModel
from taggit.models import TaggedItemBase
from modelcluster.fields import ParentalKey
from taggit.managers import TaggableManager

from .comment import Comment
from .site import Site  # 导入扩展后的 Site 模型
from .site_settings import SiteSettings
from .channel import Channel, ChannelTaggedItem
from .region import Region, RegionTaggedItem
from .language import Language
from .config import CustomConfigItem
from .theme import Theme, Font
from .time_settings import Timezone, DateFormat
from .cdn import CDNProvider, SiteCDNConfig
from .external_site import ExternalSite
from .category import Category, CategoryTaggedItem

__all__ = [
    'Comment',
    'Site',
    'SiteSettings',
    'Channel',
    'ChannelTaggedItem',
    'Category',
    'CategoryTaggedItem',
    'Region', 
    'RegionTaggedItem',
    'Language',
    'CustomConfigItem',
    'Theme',
    'Font',
    'Timezone',
    'DateFormat',
    'CDNProvider',
    'SiteCDNConfig',
    'ExternalSite',
]
