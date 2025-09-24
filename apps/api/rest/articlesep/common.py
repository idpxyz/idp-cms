"""
文章API共同工具函数

包含各个文章API模块中共享的工具函数和业务逻辑
"""

from django.utils import timezone
from datetime import timedelta


def get_recommendation_reason(article):
    """
    获取推荐理由
    
    Args:
        article: ArticlePage实例
        
    Returns:
        str: 推荐理由文本
    """
    reasons = []
    
    if article.is_featured:
        reasons.append("编辑精选")
    if article.is_hero:
        reasons.append("首页推荐")
    if article.weight and article.weight > 0:
        reasons.append(f"高权重({article.weight})")
    if hasattr(article, 'view_count') and article.view_count and article.view_count > 1000:
        reasons.append("热门文章")
    
    # 如果没有特殊原因，则基于时间
    if not reasons:
        if article.first_published_at and article.first_published_at > timezone.now() - timedelta(days=1):
            reasons.append("最新发布")
        else:
            reasons.append("相关内容")
    
    return " • ".join(reasons) if reasons else "推荐内容"


def build_recommendation_queryset(base_queryset, exclude_id=None):
    """
    构建智能推荐查询集
    
    Args:
        base_queryset: 基础查询集
        exclude_id: 要排除的文章ID
        
    Returns:
        QuerySet: 排序后的查询集
    """
    from django.db.models import Case, When, IntegerField, F
    
    queryset = base_queryset
    
    # 排除指定文章（如当前正在阅读的文章）
    if exclude_id:
        try:
            queryset = queryset.exclude(id=int(exclude_id))
        except (ValueError, TypeError):
            pass
    
    # 智能推荐算法 - 多维度排序
    queryset = queryset.annotate(
        recommendation_score=Case(
            # 编辑精选文章：+1000分
            When(is_featured=True, then=1000),
            # Hero文章：+500分
            When(is_hero=True, then=500),
            # 默认：基础分数
            default=0,
            output_field=IntegerField()
        ) + 
        # 文章权重：权重*10
        Case(
            When(weight__isnull=False, then=F('weight') * 10),
            default=0,
            output_field=IntegerField()
        )
    ).order_by(
        '-recommendation_score',    # 推荐分数优先
        '-first_published_at',      # 时间新颖性
        '-view_count',              # 热度指标
        'id'                        # 稳定排序
    )
    
    # 性能优化：预取关联数据
    queryset = queryset.select_related('channel', 'region', 'cover').prefetch_related('topics', 'tags', 'categories')
    
    return queryset


def serialize_article_for_recommendation(article):
    """
    序列化文章数据用于推荐接口
    
    Args:
        article: ArticlePage实例
        
    Returns:
        dict: 序列化后的文章数据
    """
    return {
        "id": article.id,
        "title": article.title,
        "slug": article.slug,
        "summary": getattr(article, 'excerpt', '') or getattr(article, 'summary', ''),
        "publish_time": article.first_published_at.isoformat() if article.first_published_at else None,
        "url": article.url if hasattr(article, 'url') else None,
        "author": getattr(article, 'author_name', ''),
        "channel": {
            "id": article.channel.id,
            "name": article.channel.name,
            "slug": article.channel.slug
        } if article.channel else None,
        "cover": {
            "id": article.cover.id,
            "title": article.cover.title,
            "url": article.cover.file.url if article.cover.file else None,
        } if article.cover else None,
        "is_featured": article.is_featured,
        "is_hero": article.is_hero,
        "weight": article.weight,
        "view_count": getattr(article, 'view_count', 0),
        "recommendation_reason": get_recommendation_reason(article)
    }


def build_recommendation_response(articles, site, channel, size, algorithm_name="smart_recommendation_v1"):
    """
    构建推荐接口的标准响应格式
    
    Args:
        articles: 文章列表
        site: 站点对象
        channel: 频道对象
        size: 请求大小
        algorithm_name: 算法名称
        
    Returns:
        dict: 标准化的响应数据
    """
    return {
        "articles": articles,
        "meta": {
            "site": site.hostname,
            "channel": {
                "id": channel.id,
                "name": channel.name,
                "slug": channel.slug
            } if channel else None,
            "total": len(articles),
            "size": size,
            "algorithm": algorithm_name,
            "strategy": "featured + weight + recency + popularity"
        }
    }
