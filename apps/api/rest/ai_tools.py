from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db.models import Q
from apps.ai_tools.models import AIToolPage
from apps.ai_tools.models import AIToolPageTag

@api_view(["GET"])
def ai_tools(request):
    """获取AI工具列表"""
    # 获取查询参数
    category = request.query_params.get("category")
    search = request.query_params.get("search")
    pricing = request.query_params.get("pricing")
    is_hot = request.query_params.get("is_hot")
    is_new = request.query_params.get("is_new")
    page = int(request.query_params.get("page", 1))
    size = int(request.query_params.get("size", 20))
    
    # 构建查询
    queryset = AIToolPage.objects.live().public()
    
    if category:
        queryset = queryset.filter(category=category)
    
    if search:
        queryset = queryset.filter(
            Q(title__icontains=search) | 
            Q(description__icontains=search) |
            Q(tags__name__icontains=search)
        ).distinct()
    
    if pricing:
        queryset = queryset.filter(pricing=pricing)
    
    if is_hot == "true":
        queryset = queryset.filter(is_hot=True)
    
    if is_new == "true":
        queryset = queryset.filter(is_new=True)
    
    # 分页
    start = (page - 1) * size
    end = start + size
    tools = queryset[start:end]
    
    # 序列化数据
    tools_data = []
    for tool in tools:
        tools_data.append({
            "id": tool.id,
            "title": tool.title,
            "description": tool.description,
            "tool_url": tool.tool_url,
            "logo_url": tool.logo_url,
            "category": tool.category,
            "pricing": tool.pricing,
            "features": tool.features,
            "rating": float(tool.rating),
            "usage_count": tool.usage_count,
            "is_hot": tool.is_hot,
            "is_new": tool.is_new,
            "tags": [tag.name for tag in tool.tags.all()],
            "url": tool.get_url(),
            "last_published_at": tool.last_published_at.isoformat() if tool.last_published_at else None,
        })
    
    # 获取分类统计
    categories = {}
    for tool in AIToolPage.objects.live().public():
        cat = tool.category
        if cat not in categories:
            categories[cat] = 0
        categories[cat] += 1
    
    total = queryset.count()
    total_pages = (total + size - 1) // size  # 计算总页数
    
    return Response({
        "results": tools_data,
        "count": total,
        "page": page,
        "total_pages": total_pages,
        "has_next": end < total,
        "has_prev": page > 1,
        "categories": categories,
        "filters": {
            "category": category,
            "search": search,
            "pricing": pricing,
            "is_hot": is_hot,
            "is_new": is_new
        }
    })

@api_view(["GET"])
def ai_tool_detail(request, tool_id):
    """获取AI工具详情"""
    try:
        tool = AIToolPage.objects.live().public().get(id=tool_id)
        
        # 获取相关工具
        related_tools = AIToolPage.objects.live().public().filter(
            category=tool.category
        ).exclude(id=tool_id)[:6]
        
        tool_data = {
            "id": tool.id,
            "title": tool.title,
            "description": tool.description,
            "tool_url": tool.tool_url,
            "logo_url": tool.logo_url,
            "category": tool.category,
            "pricing": tool.pricing,
            "features": tool.features,
            "rating": float(tool.rating),
            "usage_count": tool.usage_count,
            "is_hot": tool.is_hot,
            "is_new": tool.is_new,
            "tags": [tag.name for tag in tool.tags.all()],
            "url": tool.get_url(),
            "last_published_at": tool.last_published_at.isoformat() if tool.last_published_at else None,
            "related_tools": [{
                "id": rt.id,
                "title": rt.title,
                "description": rt.description,
                "category": rt.category,
                "rating": float(rt.rating),
                "url": rt.get_url(),
            } for rt in related_tools]
        }
        
        return Response(tool_data)
        
    except AIToolPage.DoesNotExist:
        return Response({"error": "AI工具不存在"}, status=404)

@api_view(["GET"])
def ai_tool_categories(request):
    """获取AI工具分类列表"""
    categories = [
        {"id": "text-generation", "name": "文字生成", "description": "AI文字生成工具"},
        {"id": "image-generation", "name": "图像生成", "description": "AI图像生成工具"},
        {"id": "video-generation", "name": "视频生成", "description": "AI视频生成工具"},
        {"id": "code-generation", "name": "代码生成", "description": "AI代码生成工具"},
        {"id": "audio-generation", "name": "音频生成", "description": "AI音频生成工具"},
        {"id": "data-analysis", "name": "数据分析", "description": "AI数据分析工具"},
        {"id": "chatbot", "name": "聊天机器人", "description": "AI聊天机器人工具"},
        {"id": "translation", "name": "翻译", "description": "AI翻译工具"},
        {"id": "productivity", "name": "生产力", "description": "AI生产力工具"},
        {"id": "research", "name": "研究", "description": "AI研究工具"},
        {"id": "other", "name": "其他", "description": "其他AI工具"},
    ]
    
    return Response({"categories": categories})
