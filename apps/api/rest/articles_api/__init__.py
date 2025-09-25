"""
文章API模块化包

将原有的大型articles.py拆分为多个专门的模块：
- core: 核心文章功能 (list, detail)
- channels: 频道功能
- regions: 地区功能  
- portal: 门户聚合
- settings: 站点设置
- recommendations: 推荐功能
- utils: 共同工具函数
"""

# 导出所有API函数，供上级articles.py使用
from .core import articles_list, article_detail
from .channels import channels_list  
from .regions import regions_list
from .portal import portal_articles
from .settings import site_settings
# 推荐功能
from .recommendations import article_recommendations

__all__ = [
    'articles_list', 'article_detail', 'channels_list', 
    'regions_list', 'portal_articles', 'site_settings',
    'article_recommendations'  # 🆕 新增
]
