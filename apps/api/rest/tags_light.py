from rest_framework.decorators import api_view, throttle_classes
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Count
from django.contrib.contenttypes.models import ContentType
from apps.core.site_utils import get_site_from_request
from ..utils.rate_limit import FEED_RATE_LIMIT as TAG_RATE_LIMIT


@api_view(["GET"])
@throttle_classes([])
@TAG_RATE_LIMIT
def tags_list(request):
    """
    轻量标签列表：返回名称、slug、文章计数
    可选参数：limit（默认50，最大200），site 自动按 Host 或 ?site 推断
    """
    try:
        limit = max(1, min(int(request.query_params.get("limit", 50)), 200))
    except Exception:
        limit = 50

    # 站点推断（若需要可用于后续多站点隔离扩展）
    _ = get_site_from_request(request)

    # 基于 ArticlePage 的标签计数（轻量实现，按内容类型过滤）
    from taggit.models import Tag
    from apps.news.models import ArticlePage

    # 通过自定义 through 模型的反向关系统计（news_articlepagetag_items）
    # 仅统计存在 ArticlePageTag 关联的标签
    qs = (
        Tag.objects.filter(news_articlepagetag_items__isnull=False)
        .annotate(articles_count=Count("news_articlepagetag_items", distinct=True))
        .order_by("-articles_count", "name")[:limit]
    )

    data = [
        {"name": t.name, "slug": t.slug, "articles_count": getattr(t, "articles_count", 0)}
        for t in qs
    ]

    return Response({"results": data, "count": len(data)})


@api_view(["GET"])
@throttle_classes([])
@TAG_RATE_LIMIT
def tag_detail(request, slug: str):
    """
    轻量标签详情：返回标签基本信息与最近文章（最多10条）
    参数：size（默认10，最大20）
    """
    try:
        size = max(1, min(int(request.query_params.get("size", 10)), 20))
    except Exception:
        size = 10

    from taggit.models import Tag
    from apps.news.models import ArticlePage

    try:
        tag = Tag.objects.get(slug=slug)
    except Tag.DoesNotExist:
        return Response({"error": "Tag not found"}, status=status.HTTP_404_NOT_FOUND)

    articles_qs = (
        ArticlePage.objects.live()
        .filter(tags__slug=slug)
        .order_by("-first_published_at")[:size]
        .select_related("channel", "region")
    )

    articles = [
        {
            "id": a.id,
            "title": a.title,
            "slug": a.slug,
            "publish_at": a.first_published_at,
            "channel_slug": getattr(a.channel, "slug", "") if a.channel else "",
        }
        for a in articles_qs
    ]

    return Response({
        "tag": {"name": tag.name, "slug": tag.slug},
        "recent_articles": articles,
        "articles_count": ArticlePage.objects.live().filter(tags__slug=slug).count(),
    })


