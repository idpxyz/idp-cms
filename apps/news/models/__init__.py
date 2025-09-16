"""
News应用模型
"""

from .article import ArticlePage, ArticlePageTag
from .topic import Topic, TopicTaggedItem

__all__ = ['ArticlePage', 'ArticlePageTag', 'Topic', 'TopicTaggedItem']
