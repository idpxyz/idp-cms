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
    搜索建议接口 - 改进版本
    基于实际文章内容生成有意义的建议，去除无意义的通用后缀
    """
    query = request.query_params.get("q", "").strip()
    limit = min(int(request.query_params.get("limit", 8)), 20)
    
    if not query:
        return Response({
            "success": True,
            "data": [],
            "query": query
        })
    
    # 获取当前站点标识符
    try:
        site_identifier = get_site_from_request(request)
    except Exception:
        site_identifier = "localhost"
    
    # 缓存键
    cache_key = f"search_suggest:{site_identifier}:{query}:{limit}"
    cached_result = cache.get(cache_key)
    if cached_result:
        return Response(cached_result)
    
    suggestions = []
    
    try:
        # 从文章标题中寻找相关建议
        from apps.news.models import ArticlePage
        
        # 查找标题包含查询词的文章
        articles = ArticlePage.objects.live().filter(
            title__icontains=query
        ).values('title').distinct()[:limit * 2]
        
        seen_titles = set()
        for article in articles:
            title = article['title'].strip()
            if (title and 
                title.lower() not in seen_titles and 
                len(title) <= 50 and
                query.lower() in title.lower()):
                
                suggestions.append({
                    "text": title,
                    "type": "article_title",
                    "reason": "来自相关文章",
                    "score": 90
                })
                seen_titles.add(title.lower())
        
        # 如果基于标题的建议不够，添加查询词本身
        if len(suggestions) < limit:
            suggestions.append({
                "text": query,
                "type": "exact_match",
                "reason": "精确搜索",
                "score": 50
            })
            
        # 添加一些语义扩展（基于常见的相关词汇）
        if len(suggestions) < limit and len(query) > 1:
            semantic_extensions = []
            
            # 根据查询词的类别添加相关扩展
            if any(word in query for word in ['科技', '技术', '创新']):
                semantic_extensions = ['人工智能', '区块链', '云计算', '大数据']
            elif any(word in query for word in ['经济', '金融', '投资']):
                semantic_extensions = ['股市', '基金', '银行', '保险']
            elif any(word in query for word in ['教育', '学习', '培训']):
                semantic_extensions = ['在线教育', '职业培训', '学历提升']
            elif any(word in query for word in ['健康', '医疗', '养生']):
                semantic_extensions = ['中医', '西医', '保健', '运动']
            
            for ext in semantic_extensions[:2]:  # 最多添加2个
                if len(suggestions) < limit:
                    suggestions.append({
                        "text": f"{query} {ext}",
                        "type": "semantic_extension",
                        "reason": "相关主题",
                        "score": 40
                    })
    
    except Exception as e:
        logger.warning(f"Search suggest error: {str(e)}")
        # 出错时返回原始查询
        suggestions = [{
            "text": query,
            "type": "fallback",
            "reason": "精确搜索",
            "score": 30
        }]
    
    # 按分数排序并限制数量
    final_suggestions = sorted(suggestions, key=lambda x: x['score'], reverse=True)[:limit]
    
    # 缓存结果 (5分钟)
    result = {
        "success": True,
        "data": final_suggestions,
        "query": query
    }
    cache.set(cache_key, result, 300)
    
    return Response(result)


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
