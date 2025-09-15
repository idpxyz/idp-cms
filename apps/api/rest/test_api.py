from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.http import JsonResponse
import datetime

@api_view(['GET'])
def test_headlines(request):
    """测试端点，支持换一换功能"""
    from datetime import datetime, timedelta
    
    size = int(request.query_params.get('size', 5))
    seed = int(request.query_params.get('seed', 0))  # 换一换种子
    
    # 基于种子生成不同的头条内容
    base_topics = [
        "重要消息", "突发事件", "深度报道", "独家分析", "热点关注", 
        "最新动态", "权威发布", "专题报告", "现场直击", "特别关注"
    ]
    
    channels = ["tech", "finance", "society", "politics", "entertainment", "sports"]
    
    headlines = []
    for i in range(1, size + 1):
        # 使用种子和索引生成伪随机内容
        topic_idx = (seed + i) % len(base_topics)
        channel_idx = (seed + i) % len(channels)
        
        headlines.append({
            "id": f"test-headline-{seed}-{i}",
            "title": f"【换一换-{seed + 1}】{base_topics[topic_idx]} {i} - {channels[channel_idx]}领域最新资讯",
            "summary": f"这是第{seed + 1}批次的测试头条新闻 {i}，涵盖{channels[channel_idx]}领域的重要内容。",
            "image_url": f"https://picsum.photos/seed/{seed + i}/300/150",
            "url": f"/test-article-{seed}-{i}",
            "slug": f"test-article-{seed}-{i}",
            "channel": channels[channel_idx],
            "primary_channel_slug": channels[channel_idx],
            "author": f"编辑{(seed + i) % 5 + 1}",
            "publish_time": (datetime.now() - timedelta(hours=i + seed)).isoformat(),
            "trend": "up" if (i + seed) % 3 == 0 else ("down" if (i + seed) % 3 == 1 else "stable")
        })
    
    return Response({
        "headlines": headlines,
        "total": len(headlines),
        "seed": seed,
        "status": "success"
    })

@api_view(['GET'])
def test_hot(request):
    """简单的测试端点，返回模拟的热门数据"""
    return JsonResponse({
        "items": [
            {
                "id": "hot-test-1",
                "title": "热门测试文章 1 - 最新动态",
                "slug": "hot-test-1",
                "summary": "这是一条热门测试文章",
                "channel": "recommend"
            },
            {
                "id": "hot-test-2",
                "title": "热门测试文章 2 - 重要资讯", 
                "slug": "hot-test-2",
                "summary": "这是第二条热门测试文章",
                "channel": "recommend"
            }
        ],
        "total": 2,
        "next_cursor": None
    })
