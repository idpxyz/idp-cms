"""
分类体系序列化器

实现 Category、Topic 等分类相关模型的序列化
"""

from rest_framework import serializers
from apps.core.models import Category
from apps.news.models import Topic, ArticlePage
from wagtail.models import Site


class CategorySerializer(serializers.ModelSerializer):
    """分类序列化器"""
    
    children_count = serializers.SerializerMethodField()
    articles_count = serializers.SerializerMethodField()
    parent_name = serializers.SerializerMethodField()
    channel_names = serializers.SerializerMethodField()
    
    class Meta:
        model = Category
        fields = [
            'id', 'name', 'slug', 'description',
            'parent', 'parent_name', 'order', 'is_active',
            'children_count', 'articles_count', 'channel_names',
            'created_at', 'updated_at'
        ]
    
    def get_children_count(self, obj):
        """获取子分类数量"""
        return obj.children.filter(is_active=True).count()
    
    def get_articles_count(self, obj):
        """获取文章数量"""
        from apps.news.models import ArticlePage
        return ArticlePage.objects.filter(categories=obj, live=True).count()
    
    def get_parent_name(self, obj):
        """获取父分类名称"""
        return obj.parent.name if obj.parent else None
    
    def get_channel_names(self, obj):
        """获取关联频道名称列表"""
        return [channel.name for channel in obj.channels.all()]


class CategoryTreeSerializer(serializers.ModelSerializer):
    """分类树序列化器 - 递归结构"""
    
    children = serializers.SerializerMethodField()
    articles_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Category
        fields = [
            'id', 'name', 'slug', 'description',
            'order', 'is_active', 'articles_count', 'children'
        ]
    
    def get_children(self, obj):
        """递归获取子分类"""
        children = obj.children.filter(is_active=True).order_by('order', 'name')
        return CategoryTreeSerializer(children, many=True, context=self.context).data
    
    def get_articles_count(self, obj):
        """获取文章数量（包含子分类）"""
        from apps.news.models import ArticlePage
        return ArticlePage.objects.filter(categories=obj, live=True).count()


class TopicSerializer(serializers.ModelSerializer):
    """专题序列化器"""
    
    articles_count = serializers.SerializerMethodField()
    cover_image_url = serializers.SerializerMethodField()
    is_active_period = serializers.SerializerMethodField()
    
    class Meta:
        model = Topic
        fields = [
            'id', 'title', 'slug', 'summary', 
            'cover_image_url', 'is_active', 'is_featured',
            'order', 'start_date', 'end_date',
            'articles_count', 'is_active_period',
            'created_at', 'updated_at'
        ]
    
    def get_articles_count(self, obj):
        """获取专题文章数量"""
        from apps.news.models import ArticlePage
        return ArticlePage.objects.filter(topic=obj, live=True).count()
    
    def get_cover_image_url(self, obj):
        """获取封面图片URL"""
        if obj.cover_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.cover_image.get_rendition('width-400').url)
        return None
    
    def get_is_active_period(self, obj):
        """判断是否在活跃期间"""
        from django.utils import timezone
        now = timezone.now()
        
        if obj.start_date and now < obj.start_date:
            return False
        if obj.end_date and now > obj.end_date:
            return False
        return True


class ArticleWithTaxonomySerializer(serializers.ModelSerializer):
    """包含分类信息的文章序列化器"""
    
    categories = CategorySerializer(many=True, read_only=True)
    topic = TopicSerializer(read_only=True)
    topic_slug = serializers.CharField(read_only=True)  # 向后兼容
    category_names = serializers.SerializerMethodField()
    
    class Meta:
        model = ArticlePage
        fields = [
            'id', 'title', 'slug', 'excerpt', 'cover',
            'author_name', 'first_published_at', 'last_published_at',
            'categories', 'category_names', 'topic', 'topic_slug',
            'tags'
        ]
    
    def get_category_names(self, obj):
        """获取分类名称列表"""
        return obj.get_category_names()


class CategoryDetailSerializer(CategorySerializer):
    """分类详情序列化器 - 包含更多信息"""
    
    children = CategorySerializer(many=True, read_only=True)
    recent_articles = serializers.SerializerMethodField()
    breadcrumb = serializers.SerializerMethodField()
    
    class Meta(CategorySerializer.Meta):
        fields = CategorySerializer.Meta.fields + [
            'children', 'recent_articles', 'breadcrumb'
        ]
    
    def get_recent_articles(self, obj):
        """获取最近的文章"""
        from apps.news.models import ArticlePage
        recent_articles = ArticlePage.objects.filter(categories=obj, live=True).order_by('-first_published_at')[:5]
        return [{
            'id': article.id,
            'title': article.title,
            'slug': article.slug,
            'publish_date': article.first_published_at
        } for article in recent_articles]
    
    def get_breadcrumb(self, obj):
        """获取面包屑导航"""
        breadcrumb = []
        current = obj
        while current:
            breadcrumb.insert(0, {
                'id': current.id,
                'name': current.name,
                'slug': current.slug
            })
            current = current.parent
        return breadcrumb


class TopicDetailSerializer(TopicSerializer):
    """专题详情序列化器 - 包含更多信息"""
    
    recent_articles = serializers.SerializerMethodField()
    related_topics = serializers.SerializerMethodField()
    
    class Meta(TopicSerializer.Meta):
        fields = TopicSerializer.Meta.fields + [
            'recent_articles', 'related_topics'
        ]
    
    def get_recent_articles(self, obj):
        """获取最近的专题文章"""
        from apps.news.models import ArticlePage
        recent_articles = ArticlePage.objects.filter(topic=obj, live=True).order_by('-first_published_at')[:10]
        return [{
            'id': article.id,
            'title': article.title,
            'slug': article.slug,
            'excerpt': article.excerpt,
            'publish_date': article.first_published_at,
            'author_name': article.author_name
        } for article in recent_articles]
    
    def get_related_topics(self, obj):
        """获取相关专题（基于标签）"""
        if not obj.tags.exists():
            return []
        
        # 获取有相同标签的其他专题
        related_topics = Topic.objects.filter(
            tags__in=obj.tags.all(),
            is_active=True
        ).exclude(id=obj.id).distinct()[:5]
        
        return [{
            'id': topic.id,
            'title': topic.title,
            'slug': topic.slug,
            'summary': topic.summary[:100] + '...' if len(topic.summary) > 100 else topic.summary
        } for topic in related_topics]
