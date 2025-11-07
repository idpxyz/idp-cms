"""
自定义分页类
"""
from rest_framework.pagination import LimitOffsetPagination


class LargeLimitOffsetPagination(LimitOffsetPagination):
    """
    支持大limit的分页类，用于sitemap等场景
    """
    default_limit = 20  # 默认每页20条
    max_limit = 1000  # 最大支持1000条（用于sitemap生成）

