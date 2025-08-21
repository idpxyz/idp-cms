from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db.models import Q
from apps.ai_tutorials.models import AITutorialPage
from apps.ai_tutorials.models import AITutorialPageTag

@api_view(["GET"])
def ai_tutorials(request):
    """获取AI教程列表"""
    # 获取查询参数
    category = request.query_params.get("category")
    difficulty = request.query_params.get("difficulty")
    search = request.query_params.get("search")
    is_hot = request.query_params.get("is_hot")
    is_free = request.query_params.get("is_free")
    page = int(request.query_params.get("page", 1))
    size = int(request.query_params.get("size", 20))
    
    # 构建查询
    queryset = AITutorialPage.objects.live().public().order_by('-last_published_at')
    
    if category:
        queryset = queryset.filter(category=category)
    
    if difficulty:
        queryset = queryset.filter(difficulty=difficulty)
    
    if search:
        queryset = queryset.filter(
            Q(title__icontains=search) | 
            Q(introduction__icontains=search) |
            Q(tags__name__icontains=search)
        ).distinct()
    
    if is_hot == "true":
        queryset = queryset.filter(is_hot=True)
    
    if is_free == "true":
        queryset = queryset.filter(is_free=True)
    
    # 分页
    start = (page - 1) * size
    end = start + size
    tutorials = queryset[start:end]
    
    # 序列化数据
    tutorials_data = []
    for tutorial in tutorials:
        tutorials_data.append({
            "id": tutorial.id,
            "title": tutorial.title,
            "introduction": tutorial.introduction,
            "difficulty": tutorial.difficulty,
            "duration": tutorial.duration,
            "category": tutorial.category,
            "is_hot": tutorial.is_hot,
            "is_free": tutorial.is_free,
            "student_count": tutorial.student_count,
            "rating": float(tutorial.rating),
            "tags": [tag.name for tag in tutorial.tags.all()],
            "url": tutorial.get_url(),
            "last_published_at": tutorial.last_published_at.isoformat() if tutorial.last_published_at else None,
            "author_name": tutorial.author_name,
        })
    
    # 获取分类统计
    categories = {}
    difficulties = {}
    for tutorial in AITutorialPage.objects.live().public():
        cat = tutorial.category
        if cat not in categories:
            categories[cat] = 0
        categories[cat] += 1
        
        diff = tutorial.difficulty
        if diff not in difficulties:
            difficulties[diff] = 0
        difficulties[diff] += 1
    
    return Response({
        "tutorials": tutorials_data,
        "pagination": {
            "page": page,
            "size": size,
            "total": queryset.count(),
            "has_next": end < queryset.count(),
            "has_prev": page > 1
        },
        "categories": categories,
        "difficulties": difficulties,
        "filters": {
            "category": category,
            "difficulty": difficulty,
            "search": search,
            "is_hot": is_hot,
            "is_free": is_free
        }
    })

@api_view(["GET"])
def ai_tutorial_detail(request, tutorial_id):
    """获取AI教程详情"""
    try:
        tutorial = AITutorialPage.objects.live().public().get(id=tutorial_id)
        
        # 获取相关教程
        related_tutorials = AITutorialPage.objects.live().public().filter(
            category=tutorial.category
        ).exclude(id=tutorial_id)[:6]
        
        tutorial_data = {
            "id": tutorial.id,
            "title": tutorial.title,
            "introduction": tutorial.introduction,
            "body": tutorial.body,
            "difficulty": tutorial.difficulty,
            "duration": tutorial.duration,
            "category": tutorial.category,
            "is_hot": tutorial.is_hot,
            "is_free": tutorial.is_free,
            "student_count": tutorial.student_count,
            "rating": float(tutorial.rating),
            "tags": [tag.name for tag in tutorial.tags.all()],
            "url": tutorial.get_url(),
            "last_published_at": tutorial.last_published_at.isoformat() if tutorial.last_published_at else None,
            "author_name": tutorial.author_name,
            "related_tutorials": [{
                "id": rt.id,
                "title": rt.title,
                "introduction": rt.introduction,
                "difficulty": rt.difficulty,
                "category": rt.category,
                "rating": float(rt.rating),
                "url": rt.get_url(),
            } for rt in related_tutorials]
        }
        
        return Response(tutorial_data)
        
    except AITutorialPage.DoesNotExist:
        return Response({"error": "AI教程不存在"}, status=404)

@api_view(["GET"])
def ai_tutorial_categories(request):
    """获取AI教程分类列表"""
    categories = [
        {"id": "chatbot", "name": "聊天机器人", "description": "AI聊天机器人开发教程"},
        {"id": "image-generation", "name": "图像生成", "description": "AI图像生成技术教程"},
        {"id": "video-generation", "name": "视频生成", "description": "AI视频生成技术教程"},
        {"id": "code-generation", "name": "代码生成", "description": "AI代码生成技术教程"},
        {"id": "ai-fundamentals", "name": "AI基础", "description": "AI基础知识教程"},
        {"id": "data-analysis", "name": "数据分析", "description": "AI数据分析教程"},
        {"id": "ai-ethics", "name": "AI伦理", "description": "AI伦理与责任教程"},
        {"id": "ai-business", "name": "AI商业", "description": "AI商业应用教程"},
        {"id": "nlp", "name": "自然语言处理", "description": "NLP技术教程"},
        {"id": "computer-vision", "name": "计算机视觉", "description": "计算机视觉教程"},
        {"id": "machine-learning", "name": "机器学习", "description": "机器学习基础教程"},
    ]
    
    return Response({"categories": categories})

@api_view(["GET"])
def ai_tutorial_difficulties(request):
    """获取AI教程难度等级"""
    difficulties = [
        {"id": "beginner", "name": "初级", "description": "适合初学者的基础教程"},
        {"id": "intermediate", "name": "中级", "description": "适合有一定基础的进阶教程"},
        {"id": "advanced", "name": "高级", "description": "适合高级用户的深度教程"},
    ]
    
    return Response({"difficulties": difficulties})
