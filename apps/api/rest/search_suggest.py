"""
搜索建议API
基于历史搜索词、文章标题、热门查询生成搜索建议
"""

import logging
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Count, Q
from django.core.cache import cache
from apps.news.models import ArticlePage
from apps.core.site_utils import get_site_from_request
from apps.api.utils.search_utils import segment_text
import re

logger = logging.getLogger(__name__)

@api_view(["GET"])
def search_suggest(request):
    """
    搜索建议接口 - 简化版本
    """
    query = request.query_params.get("q", "").strip()
    limit = min(int(request.query_params.get("limit", 8)), 20)
    
    if not query:
        return Response({
            "success": True,
            "data": [],
            "query": query
        })
    
    # 简单的默认建议
    suggestions = [
        {"text": f"{query}新闻", "type": "default", "reason": "热门搜索", "score": 70},
        {"text": f"{query}资讯", "type": "default", "reason": "热门搜索", "score": 65},
        {"text": f"{query}报道", "type": "default", "reason": "热门搜索", "score": 60},
        {"text": f"{query}分析", "type": "default", "reason": "热门搜索", "score": 55},
        {"text": f"{query}评论", "type": "default", "reason": "热门搜索", "score": 50},
    ]
    
    # 限制数量
    final_suggestions = suggestions[:limit]
    
    return Response({
        "success": True,
        "data": final_suggestions,
        "query": query
    })


def get_title_suggestions(query, site, limit):
    """基于文章标题生成建议"""
    suggestions = []
    
    try:
        # 查找标题包含查询词的文章
        articles = ArticlePage.objects.live().filter(
            path__startswith=site.root_page.path,
            title__icontains=query
        ).values('title').order_by('-first_published_at')[:limit * 2]
        
        seen_suggestions = set()
        for article in articles:
            title = article['title']
            # 直接使用标题作为建议
            if title and title not in seen_suggestions and len(title) <= 30:
                suggestions.append({
                    "text": title,
                    "type": "title_phrase",
                    "reason": "来自文章标题",
                    "score": 80
                })
                seen_suggestions.add(title)
                
            # 也尝试提取短语
            phrases = extract_phrases_with_query(title, query)
            for phrase in phrases:
                if (phrase not in seen_suggestions and 
                    len(phrase) > len(query) and len(phrase) <= 20):
                    suggestions.append({
                        "text": phrase,
                        "type": "title_phrase", 
                        "reason": "来自文章标题",
                        "score": 75
                    })
                    seen_suggestions.add(phrase)
                    
    except Exception as e:
        logger.warning(f"Title suggestions error: {str(e)}")
    
    return suggestions[:limit]


def get_keyword_suggestions(query, site, limit):
    """基于分词生成相关词汇建议"""
    suggestions = []
    
    try:
        # 对查询进行分词
        words = segment_text(query)
        if not words:
            return suggestions
            
        # 查找包含分词的文章标题
        q_filter = Q()
        for word in words:
            q_filter |= Q(title__icontains=word)
            
        articles = ArticlePage.objects.live().filter(
            path__startswith=site.root_page.path
        ).filter(q_filter).values('title')[:limit * 3]
        
        # 从标题中提取关键词
        keyword_freq = {}
        for article in articles:
            title_words = segment_text(article['title'])
            for word in title_words:
                if len(word) >= 2 and word not in words:
                    keyword_freq[word] = keyword_freq.get(word, 0) + 1
        
        # 生成组合建议
        for word, freq in sorted(keyword_freq.items(), key=lambda x: x[1], reverse=True)[:limit]:
            combined = query + word
            if len(combined) <= 15:
                suggestions.append({
                    "text": combined,
                    "type": "keyword_combination", 
                    "reason": "相关关键词",
                    "score": 60 + freq
                })
                
    except Exception as e:
        logger.warning(f"Keyword suggestions error: {str(e)}")
    
    return suggestions


def get_channel_suggestions(query, site, limit):
    """基于频道名称生成建议"""
    suggestions = []
    
    try:
        from apps.core.models import Channel
        
        # 查找匹配的频道
        channels = Channel.objects.filter(
            sites=site,
            is_active=True,
            name__icontains=query
        )[:limit]
        
        for channel in channels:
            suggestions.append({
                "text": f"{query} {channel.name}",
                "type": "channel",
                "reason": f"在{channel.name}频道搜索",
                "score": 70
            })
            
    except Exception as e:
        logger.warning(f"Channel suggestions error: {str(e)}")
    
    return suggestions


def extract_phrases_with_query(text, query):
    """从文本中提取包含查询词的短语"""
    phrases = []
    
    try:
        # 简单的短语提取：以查询词为中心，前后扩展
        query_pos = text.lower().find(query.lower())
        if query_pos == -1:
            return phrases
            
        # 向前找词边界
        start = max(0, query_pos - 10)
        while start < query_pos and text[start] not in ' ，。！？':
            start += 1
        if start < query_pos and text[start] in ' ，。！？':
            start += 1
            
        # 向后找词边界  
        end = min(len(text), query_pos + len(query) + 10)
        while end > query_pos + len(query) and text[end-1] not in ' ，。！？':
            end -= 1
            
        phrase = text[start:end].strip()
        if phrase and len(phrase) > len(query):
            phrases.append(phrase)
            
    except Exception as e:
        logger.warning(f"Phrase extraction error: {str(e)}")
    
    return phrases
