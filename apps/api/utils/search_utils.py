import jieba
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
    
    for field_name, weight in fields:
        # 对每个分词结果构建查询
        word_queries = []
        for word in words:
            # 添加字段匹配条件
            word_queries.append(Q(**{f"{field_name}__icontains": word}))
            # 添加权重计算条件
            whens.append(
                When(**{f"{field_name}__icontains": word}, then=Value(weight))
            )
        
        # 将同一字段的多个分词结果用OR连接
        if word_queries:
            field_queries.append(reduce(operator.or_, word_queries))
    
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
    return queryset.filter(search_query).annotate(
        search_rank=rank_annotation
    ).order_by('-search_rank', '-last_published_at')