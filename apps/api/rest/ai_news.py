from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db.models import Q
from apps.ai_news.models import AINewsPage
from apps.ai_news.models import AINewsPageTag

@api_view(["GET"])
def ai_news(request):
    """获取AI资讯列表"""
    # 获取查询参数
    category = request.query_params.get("category")
    search = request.query_params.get("search")
    is_hot = request.query_params.get("is_hot")
    is_top = request.query_params.get("is_top")
    page = int(request.query_params.get("page", 1))
    size = int(request.query_params.get("size", 20))
    
    # 构建查询
    queryset = AINewsPage.objects.live().public().order_by('-last_published_at')
    
    if category:
        queryset = queryset.filter(category=category)
    
    if search:
        queryset = queryset.filter(
            Q(title__icontains=search) | 
            Q(introduction__icontains=search) |
            Q(tags__name__icontains=search)
        ).distinct()
    
    if is_hot == "true":
        queryset = queryset.filter(is_hot=True)
    
    if is_top == "true":
        queryset = queryset.filter(is_top=True)
    
    # 分页
    start = (page - 1) * size
    end = start + size
    news_list = queryset[start:end]
    
    # 序列化数据
    news_data = []
    for news in news_list:
        news_data.append({
            "id": news.id,
            "title": news.title,
            "introduction": news.introduction,
            "category": news.category,
            "source": news.source,
            "source_url": news.source_url,
            "image_url": news.image_url,
            "is_hot": news.is_hot,
            "is_top": news.is_top,
            "read_count": news.read_count,
            "tags": [tag.name for tag in news.tags.all()],
            "url": news.get_url(),
            "last_published_at": news.last_published_at.isoformat() if news.last_published_at else None,
            "author_name": news.author_name,
            "has_video": news.has_video,
        })
    
    # 获取分类统计
    categories = {}
    for news in AINewsPage.objects.live().public():
        cat = news.category
        if cat not in categories:
            categories[cat] = 0
        categories[cat] += 1
    
    total = queryset.count()
    total_pages = (total + size - 1) // size  # 计算总页数
    
    return Response({
        "results": news_data,
        "count": total,
        "page": page,
        "total_pages": total_pages,
        "has_next": end < total,
        "has_prev": page > 1,
        "categories": categories,
        "filters": {
            "category": category,
            "search": search,
            "is_hot": is_hot,
            "is_top": is_top
        }
    })

@api_view(["GET"])
def ai_news_detail(request, news_id):
    """获取AI资讯详情"""
    try:
        news = AINewsPage.objects.live().public().get(id=news_id)
        
        # 获取相关资讯
        related_news = AINewsPage.objects.live().public().filter(
            category=news.category
        ).exclude(id=news_id)[:6]
        
        news_data = {
            "id": news.id,
            "title": news.title,
            "introduction": news.introduction,
            "body": news.body,
            "category": news.category,
            "source": news.source,
            "source_url": news.source_url,
            "image_url": news.image_url,
            "is_hot": news.is_hot,
            "is_top": news.is_top,
            "read_count": news.read_count,
            "tags": [tag.name for tag in news.tags.all()],
            "url": news.get_url(),
            "last_published_at": news.last_published_at.isoformat() if news.last_published_at else None,
            "author_name": news.author_name,
            "has_video": news.has_video,
            "related_news": [{
                "id": rn.id,
                "title": rn.title,
                "introduction": rn.introduction,
                "category": rn.category,
                "image_url": rn.image_url,
                "url": rn.get_url(),
            } for rn in related_news]
        }
        
        return Response(news_data)
        
    except AINewsPage.DoesNotExist:
        return Response({"error": "AI资讯不存在"}, status=404)

@api_view(["GET"])
def ai_news_categories(request):
    """获取AI资讯分类列表"""
    categories = [
        {"id": "technology", "name": "技术突破", "description": "AI技术最新突破"},
        {"id": "product", "name": "产品发布", "description": "AI产品发布信息"},
        {"id": "investment", "name": "投资融资", "description": "AI行业投资动态"},
        {"id": "research", "name": "研究突破", "description": "AI学术研究进展"},
        {"id": "policy", "name": "政策法规", "description": "AI相关政策法规"},
        {"id": "industry", "name": "行业动态", "description": "AI行业发展趋势"},
        {"id": "startup", "name": "创业公司", "description": "AI创业公司动态"},
        {"id": "academic", "name": "学术研究", "description": "AI学术研究动态"},
    ]
    
    return Response({"categories": categories})

@api_view(["GET"])
def ai_news_hot(request):
    """获取热门AI资讯"""
    hot_news = AINewsPage.objects.live().public().filter(is_hot=True).order_by('-read_count')[:10]
    
    hot_news_data = []
    for news in hot_news:
        hot_news_data.append({
            "id": news.id,
            "title": news.title,
            "introduction": news.introduction,
            "category": news.category,
            "image_url": news.image_url,
            "read_count": news.read_count,
            "url": news.get_url(),
        })
    
    return Response({"hot_news": hot_news_data})
