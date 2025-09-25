"""
文章API统一入口 - 保持向后兼容性

将原有的大型articles.py拆分为模块化结构，同时保持所有现有导入路径有效。
这样既实现了代码组织的优化，又确保了零破坏性的升级。
"""

# 从模块化子目录导入所有功能
from .articles_api.core import articles_list, article_detail
from .articles_api.channels import channels_list  
from .articles_api.regions import regions_list
from .articles_api.portal import portal_articles
from .articles_api.settings import site_settings
from .articles_api.recommendations import article_recommendations

# 导出所有API函数，保持现有导入路径有效
# 这样 config/urls.py 中的导入语句完全不需要改变
__all__ = [
    'articles_list',        # 文章列表
    'article_detail',       # 文章详情
    'channels_list',        # 频道列表
    'regions_list',         # 地区列表
    'portal_articles',      # 门户聚合
    'site_settings',        # 站点设置
    'article_recommendations'  # 🆕 文章推荐 (新增功能)
]
