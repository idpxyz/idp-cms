# 使用统一的jieba配置
from apps.core.jieba_config import get_jieba_instance
jieba = get_jieba_instance()

from django.db.models import Q, Case, When, Value, IntegerField, F
from functools import reduce
import operator

def segment_text(text):
    """
    对文本进行中文分词
    """
    if not text:
        return []
    # 使用精确模式分词
    words = jieba.cut(text, cut_all=False)
    # 过滤掉停用词和空白
    return [w.strip() for w in words if w.strip() and len(w.strip()) > 1]

def build_search_query(search_text, fields=None):
    """
    构建搜索查询
    
    Args:
        search_text: 搜索文本
        fields: 要搜索的字段列表，每个字段是一个元组 (field_name, weight)
               例如：[('title', 10), ('introduction', 5), ('body', 1)]
    
    Returns:
        (Q对象, Case对象) 元组，用于过滤和排序
    """
    if not fields:
        fields = [('title', 10), ('introduction', 5), ('body', 1)]
    
    # 对搜索文本进行分词
    words = segment_text(search_text)
    if not words:
        return None, None
    
    # 构建每个字段的查询条件
    field_queries = []
    whens = []
    
    for field_name, base_weight in fields:
        field_word_queries = []
        
        # 1. 优先匹配完整短语（最高权重）
        phrase_query = Q(**{f"{field_name}__icontains": search_text})
        field_word_queries.append(phrase_query)
        whens.append(
            When(**{f"{field_name}__icontains": search_text}, then=Value(base_weight * 10))
        )
        
        # 2. 匹配多个词的组合（中等权重）
        if len(words) > 1:
            # 构建所有词都包含的查询
            all_words_conditions = {f"{field_name}__icontains": word for word in words}
            all_words_query = reduce(operator.and_, [
                Q(**{f"{field_name}__icontains": word}) for word in words
            ])
            field_word_queries.append(all_words_query)
            whens.append(
                When(all_words_query, then=Value(base_weight * 3))
            )
        
        # 3. 匹配单个词（基础权重，重要词汇加权）
        for word in words:
            word_query = Q(**{f"{field_name}__icontains": word})
            field_word_queries.append(word_query)
            
            # 计算词汇权重：长词 + 重要词汇加权
            word_weight = base_weight * (1 + len(word) * 0.1)
            
            # 对重要词汇给予额外权重
            important_words = ['国家', '政府', '中央', '官方', '法律', '法规', '条例', '通知', '公告']
            if word in important_words:
                word_weight *= 3  # 重要词汇权重提升3倍
            
            whens.append(
                When(word_query, then=Value(int(word_weight)))
            )
        
        # 将该字段的所有查询用OR连接
        if field_word_queries:
            field_queries.append(reduce(operator.or_, field_word_queries))
    
    # 将不同字段的查询用OR连接
    search_query = reduce(operator.or_, field_queries) if field_queries else None
    
    # 创建排序权重计算
    rank_annotation = Case(
        *whens,
        default=Value(0),
        output_field=IntegerField(),
    )
    
    return search_query, rank_annotation

def apply_search(queryset, search_text, fields=None):
    """
    应用搜索条件到查询集
    
    Args:
        queryset: Django查询集
        search_text: 搜索文本
        fields: 要搜索的字段列表，每个字段是一个元组 (field_name, weight)
    
    Returns:
        更新后的查询集，包含搜索条件和排序
    """
    if not search_text:
        return queryset
        
    search_query, rank_annotation = build_search_query(search_text, fields)
    if not search_query:
        return queryset
    
    # 添加搜索条件和排序权重
    # 创建短语匹配的排序字段
    from django.db.models import Case, When, Value, IntegerField
    
    # 为完整短语匹配创建优先级字段
    phrase_priority_whens = []
    for field_name, _ in fields or [('title', 10), ('excerpt', 5), ('body', 1)]:
        phrase_priority_whens.append(
            When(**{f"{field_name}__icontains": search_text}, then=Value(1000))
        )
    
    phrase_priority = Case(
        *phrase_priority_whens,
        default=Value(0),
        output_field=IntegerField()
    )
    
    return queryset.filter(search_query).annotate(
        search_rank=rank_annotation,
        phrase_priority=phrase_priority
    ).order_by('-phrase_priority', '-search_rank', '-last_published_at')