"""
爬虫数据写入API

为外部爬虫程序提供批量数据写入接口，支持：
- 批量文章创建和更新  
- 外部数据源处理
- API密钥认证
- 数据验证和去重
- 错误处理和日志记录
"""

import logging
from datetime import datetime, timezone
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils.decorators import method_decorator
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import transaction
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.authentication import BaseAuthentication
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework import status
from wagtail.models import Site, Page
from apps.news.models.article import ArticlePage
from apps.core.models import Channel, Region, Language, ExternalSite, Category
from apps.news.models import Topic
from apps.core.site_utils import get_site_from_request
import json
import hashlib
import hmac

logger = logging.getLogger(__name__)

# API密钥配置 - 在settings.py中配置
# CRAWLER_API_KEYS = {
#     'crawler_bot_1': 'your-secret-key-here',
#     'news_scraper': 'another-secret-key',  
# }


class CrawlerAPIAuthentication(BaseAuthentication):
    """
    爬虫API密钥认证
    
    Headers:
    X-API-Key: your_api_key
    X-API-Client: your_client_name
    """
    def authenticate(self, request):
        api_key = request.META.get('HTTP_X_API_KEY')
        client_name = request.META.get('HTTP_X_API_CLIENT')
        
        if not api_key or not client_name:
            return None
            
        # 从settings获取有效的API密钥
        valid_keys = getattr(settings, 'CRAWLER_API_KEYS', {})
        
        if client_name not in valid_keys:
            return None
            
        expected_key = valid_keys[client_name]
        
        # 验证API密钥
        if not hmac.compare_digest(api_key, expected_key):
            return None
            
        # 返回一个虚拟用户标识，表示通过了认证
        return (client_name, None)


class CrawlerAPIPermission(BasePermission):
    """
    爬虫API权限控制
    """
    def has_permission(self, request, view):
        # 只允许已认证的爬虫客户端
        return request.user and isinstance(request.user, str)


def validate_article_data(data):
    """
    验证文章数据格式和必需字段
    """
    required_fields = ['title', 'body', 'site']
    errors = []
    
    for field in required_fields:
        if field not in data or not data[field]:
            errors.append(f"Missing required field: {field}")
    
    # URL格式验证
    if 'external_article_url' in data and data['external_article_url']:
        import re
        url_pattern = re.compile(
            r'^https?://'  # http:// or https://
            r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain...
            r'localhost|'  # localhost...
            r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
            r'(?::\d+)?'  # optional port
            r'(?:/?|[/?]\S+)$', re.IGNORECASE)
        
        if not url_pattern.match(data['external_article_url']):
            errors.append("Invalid external_article_url format")
    
    # 日期格式验证
    if 'publish_at' in data and data['publish_at']:
        try:
            datetime.fromisoformat(data['publish_at'].replace('Z', '+00:00'))
        except ValueError:
            errors.append("Invalid publish_at format, expected ISO format")
    
    # 分类格式验证（可选）
    if 'categories' in data and data['categories'] is not None:
        if not isinstance(data['categories'], list):
            errors.append("'categories' must be a list of strings or objects")
        else:
            for c in data['categories']:
                if not isinstance(c, (str, dict)):
                    errors.append("Each category must be a string or an object with slug/name")
                    break

    # 主题格式验证（可选）
    if 'topic' in data and data['topic'] is not None:
        if not isinstance(data['topic'], (str, dict)):
            errors.append("'topic' must be a string (slug) or an object")

    # 兼容：若提供了topic_slug也允许，但建议使用topic
    if 'topic_slug' in data and data['topic_slug'] and 'topic' not in data:
        if not isinstance(data['topic_slug'], str):
            errors.append("'topic_slug' must be a string")

    return errors


def get_or_create_channel(channel_data, site):
    """
    获取或创建频道
    """
    if isinstance(channel_data, str):
        # 如果是字符串，按名称查找或创建
        channel, created = Channel.objects.get_or_create(
            name=channel_data,
            defaults={'slug': channel_data.lower().replace(' ', '-')}
        )
        # 确保频道关联到站点
        if site not in channel.sites.all():
            channel.sites.add(site)
    elif isinstance(channel_data, dict):
        # 如果是字典，支持更详细的配置
        channel, created = Channel.objects.get_or_create(
            slug=channel_data.get('slug', channel_data['name'].lower().replace(' ', '-')),
            defaults={
                'name': channel_data['name'],
                'description': channel_data.get('description', ''),
                'order': channel_data.get('order', 0)
            }
        )
        if site not in channel.sites.all():
            channel.sites.add(site)
    else:
        return None
        
    return channel


def get_or_create_region(region_data, site):
    """
    获取或创建地区
    """
    if isinstance(region_data, str):
        region, created = Region.objects.get_or_create(
            name=region_data,
            defaults={'slug': region_data.lower().replace(' ', '-')}
        )
        if site not in region.sites.all():
            region.sites.add(site)
    elif isinstance(region_data, dict):
        region, created = Region.objects.get_or_create(
            slug=region_data.get('slug', region_data['name'].lower().replace(' ', '-')),
            defaults={
                'name': region_data['name'],
                'description': region_data.get('description', ''),
                'order': region_data.get('order', 0)
            }
        )
        if site not in region.sites.all():
            region.sites.add(site)
    else:
        return None
        
    return region


def get_or_create_external_site(external_site_data):
    """
    获取或创建外部站点
    """
    if isinstance(external_site_data, str):
        # 如果是字符串，当作域名处理
        external_site, created = ExternalSite.objects.get_or_create(
            domain=external_site_data,
            defaults={'name': external_site_data}
        )
    elif isinstance(external_site_data, dict):
        external_site, created = ExternalSite.objects.get_or_create(
            domain=external_site_data['domain'],
            defaults={
                'name': external_site_data.get('name', external_site_data['domain']),
                'description': external_site_data.get('description', ''),
                'is_trusted': external_site_data.get('is_trusted', False)
            }
        )
    else:
        return None
        
    return external_site


def get_or_create_category(category_data, site):
    """
    获取或创建分类（Category）
    支持字符串（作为名称）或对象（含 name/slug）
    """
    if isinstance(category_data, str):
        # 以名称为主，生成slug
        from django.utils.text import slugify
        slug = slugify(category_data)
        category, _ = Category.objects.get_or_create(
            slug=slug,
            defaults={
                'name': category_data,
                'description': '',
                'is_active': True,
            }
        )
    elif isinstance(category_data, dict):
        name = category_data.get('name')
        slug = category_data.get('slug')
        if not slug and name:
            from django.utils.text import slugify
            slug = slugify(name)
        if not slug:
            return None
        category, _ = Category.objects.get_or_create(
            slug=slug,
            defaults={
                'name': name or slug,
                'description': category_data.get('description', ''),
                'is_active': category_data.get('is_active', True),
            }
        )
    else:
        return None

    # 站点关联
    try:
        if site not in category.sites.all():
            category.sites.add(site)
    except Exception:
        # Category 可能未配置sites字段时忽略
        pass

    return category


def get_or_create_topic(topic_data):
    """
    获取或创建主题（Topic）
    支持字符串（slug）或对象（含 slug/name/title 等）
    """
    if isinstance(topic_data, str):
        slug = topic_data
        topic, _ = Topic.objects.get_or_create(
            slug=slug,
            defaults={'title': slug.replace('-', ' ')}
        )
        return topic
    elif isinstance(topic_data, dict):
        slug = topic_data.get('slug')
        title = topic_data.get('title') or topic_data.get('name')
        if not slug and title:
            from django.utils.text import slugify
            slug = slugify(title)
        if not slug:
            return None
        topic, _ = Topic.objects.get_or_create(
            slug=slug,
            defaults={'title': title or slug.replace('-', ' ')}
        )
        return topic
    else:
        return None


def create_or_update_article(article_data, site, update_existing=True):
    """
    创建或更新文章
    """
    # 生成唯一标识符用于去重
    unique_identifier = None
    if 'external_article_url' in article_data and article_data['external_article_url']:
        unique_identifier = article_data['external_article_url']
    else:
        # 使用标题+站点生成hash
        content_hash = hashlib.md5(
            f"{article_data['title']}{site.hostname}".encode('utf-8')
        ).hexdigest()[:8]
        unique_identifier = f"local_{content_hash}"
    
    # 查找现有文章
    existing_article = None
    if update_existing and 'external_article_url' in article_data:
        try:
            existing_article = ArticlePage.objects.get(
                external_article_url=article_data['external_article_url']
            )
        except ArticlePage.DoesNotExist:
            pass
    
    # 获取父页面 (站点的文章根页面)
    try:
        # 假设每个站点的文章都在 /news/ 路径下
        parent_page = site.root_page.get_children().filter(slug='news').first()
        if not parent_page:
            # 如果没有news页面，使用root页面
            parent_page = site.root_page
    except Exception as e:
        logger.error(f"Failed to get parent page for site {site.hostname}: {e}")
        parent_page = site.root_page
    
    # 处理关联数据
    channel = None
    if 'channel' in article_data and article_data['channel']:
        channel = get_or_create_channel(article_data['channel'], site)
    
    region = None 
    if 'region' in article_data and article_data['region']:
        region = get_or_create_region(article_data['region'], site)
    
    language = None
    if 'language' in article_data and article_data['language']:
        try:
            language = Language.objects.get(code=article_data['language'])
        except Language.DoesNotExist:
            pass
    
    external_site = None
    if 'external_site' in article_data and article_data['external_site']:
        external_site = get_or_create_external_site(article_data['external_site'])

    # 处理主题（Topic）
    topic_obj = None
    if 'topic' in article_data and article_data['topic']:
        topic_obj = get_or_create_topic(article_data['topic'])
    elif 'topic_slug' in article_data and article_data['topic_slug']:
        topic_obj = get_or_create_topic(article_data['topic_slug'])

    # 处理分类（Category）
    categories_objs = None
    if 'categories' in article_data and article_data['categories'] is not None:
        categories_objs = []
        for c in article_data['categories']:
            cat = get_or_create_category(c, site)
            if cat is not None:
                categories_objs.append(cat)
    elif 'category' in article_data and article_data['category']:
        # 兼容单个分类
        single_cat = get_or_create_category(article_data['category'], site)
        categories_objs = [single_cat] if single_cat is not None else []
    
    # 准备文章字段
    article_fields = {
        'title': article_data['title'],
        'body': article_data.get('body', ''),
        'excerpt': article_data.get('excerpt', ''),
        'author_name': article_data.get('author_name', ''),
        'topic': topic_obj,
        'has_video': article_data.get('has_video', False),
        'source_type': 'external' if 'external_article_url' in article_data else 'internal',
        'external_article_url': article_data.get('external_article_url', ''),
        'canonical_url': article_data.get('canonical_url', ''),
        'allow_aggregate': article_data.get('allow_aggregate', True),
        'is_featured': article_data.get('is_featured', False),
        'weight': article_data.get('weight', 0),
        'channel': channel,
        'region': region,
        'language': language,
        'external_site': external_site,
    }
    
    # 处理发布时间
    if 'publish_at' in article_data and article_data['publish_at']:
        try:
            publish_at = datetime.fromisoformat(article_data['publish_at'].replace('Z', '+00:00'))
            article_fields['publish_at'] = publish_at
        except ValueError:
            logger.warning(f"Invalid publish_at format: {article_data['publish_at']}")
    
    # 生成slug
    from django.utils.text import slugify
    base_slug = slugify(article_data['title'])[:50]
    if not base_slug:
        base_slug = f"article-{unique_identifier}"
    
    if existing_article and update_existing:
        # 更新现有文章
        for field, value in article_fields.items():
            setattr(existing_article, field, value)
        
        existing_article.save()
        # 更新分类（如提供）
        if categories_objs is not None:
            existing_article.categories.set(categories_objs)
        # 更新标签
        if 'tags' in article_data and article_data['tags']:
            existing_article.tags.clear()
            for tag_name in article_data['tags']:
                if tag_name.strip():
                    existing_article.tags.add(tag_name.strip())
        logger.info(f"Updated existing article: {existing_article.title}")
        return existing_article, False  # False表示是更新操作
    else:
        # 创建新文章
        # 确保slug唯一性
        slug = base_slug
        counter = 1
        while ArticlePage.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
        
        article_fields['slug'] = slug

        # 创建文章页面
        new_article = ArticlePage(**article_fields)
        parent_page.add_child(instance=new_article)

        # 设置分类（如提供）
        if categories_objs is not None:
            new_article.categories.set(categories_objs)

        # 处理标签
        if 'tags' in article_data and article_data['tags']:
            new_article.tags.clear()
            for tag_name in article_data['tags']:
                if tag_name.strip():
                    new_article.tags.add(tag_name.strip())

        # 发布文章
        if article_data.get('live', True):
            new_article.save_revision().publish()

        logger.info(f"Created new article: {new_article.title}")
        return new_article, True  # True表示是创建操作


@csrf_exempt
@api_view(['POST'])
@authentication_classes([CrawlerAPIAuthentication])
@permission_classes([CrawlerAPIPermission])
def bulk_create_articles(request):
    """
    批量创建文章API
    
    POST /api/crawler/articles/bulk
    
    Headers:
    X-API-Key: your_api_key
    X-API-Client: your_client_name
    Content-Type: application/json
    
    Body:
    {
        "site": "example.com",  // 目标站点
        "articles": [
            {
                "title": "文章标题",
                "body": "文章内容",
                "excerpt": "摘要",
                "author_name": "作者名", 
                "channel": "科技" | {"name": "科技", "slug": "tech"},
                "region": "北京" | {"name": "北京", "slug": "beijing"}, 
                "language": "zh-CN",
                "categories": ["tech", {"name": "科技", "slug": "tech"}],
                "topic": "ai-topic" | {"slug": "ai-topic", "title": "AI"},
                "external_article_url": "https://source.com/article/123",
                "external_site": "source.com" | {"domain": "source.com", "name": "来源站"},
                "canonical_url": "https://canonical.com/article/123",
                "publish_at": "2024-01-01T10:00:00Z",
                "has_video": false,
                "allow_aggregate": true,
                "is_featured": false,
                "weight": 0,
                "tags": ["标签1", "标签2"],
                "live": true
            }
        ],
        "update_existing": true,  // 是否更新已存在的文章
        "dry_run": false         // 是否为试运行模式
    }
    """
    try:
        # 解析请求数据
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return Response(
                {"error": "Invalid JSON format"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 验证必需字段
        if 'site' not in data or 'articles' not in data:
            return Response(
                {"error": "Missing required fields: site, articles"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 获取目标站点
        try:
            site = Site.objects.get(hostname=data['site'])
        except Site.DoesNotExist:
            return Response(
                {"error": f"Site '{data['site']}' not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        articles_data = data['articles']
        update_existing = data.get('update_existing', True)
        dry_run = data.get('dry_run', False)
        
        if not isinstance(articles_data, list):
            return Response(
                {"error": "Articles must be a list"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 验证文章数据
        validation_errors = []
        for i, article_data in enumerate(articles_data):
            article_data['site'] = data['site']  # 添加站点信息
            errors = validate_article_data(article_data)
            if errors:
                validation_errors.append({"index": i, "errors": errors})
        
        if validation_errors:
            return Response(
                {"error": "Validation failed", "details": validation_errors}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 如果是试运行，返回验证结果
        if dry_run:
            return Response({
                "message": "Dry run successful",
                "site": data['site'],
                "article_count": len(articles_data),
                "validation": "passed"
            })
        
        # 批量处理文章
        results = []
        created_count = 0
        updated_count = 0
        error_count = 0
        
        with transaction.atomic():
            for i, article_data in enumerate(articles_data):
                try:
                    article, is_created = create_or_update_article(
                        article_data, site, update_existing
                    )
                    
                    if is_created:
                        created_count += 1
                        action = "created"
                    else:
                        updated_count += 1
                        action = "updated"
                    
                    # 处理标签
                    if 'tags' in article_data and article_data['tags']:
                        article.tags.clear()
                        for tag_name in article_data['tags']:
                            if tag_name.strip():
                                article.tags.add(tag_name.strip())
                    
                    results.append({
                        "index": i,
                        "id": article.id,
                        "title": article.title,
                        "slug": article.slug,
                        "action": action,
                        "success": True
                    })
                    
                except Exception as e:
                    error_count += 1
                    results.append({
                        "index": i,
                        "error": str(e),
                        "success": False
                    })
                    logger.error(f"Failed to process article at index {i}: {e}")
        
        # 记录操作日志
        logger.info(
            f"Bulk article operation completed by {request.user}. "
            f"Site: {site.hostname}, Created: {created_count}, "
            f"Updated: {updated_count}, Errors: {error_count}"
        )
        
        return Response({
            "message": "Bulk operation completed",
            "site": data['site'],
            "summary": {
                "total": len(articles_data),
                "created": created_count,
                "updated": updated_count,
                "errors": error_count
            },
            "results": results
        }, status=status.HTTP_201_CREATED if created_count > 0 else status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Unexpected error in bulk_create_articles: {e}")
        return Response(
            {"error": f"Internal server error: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@csrf_exempt
@api_view(['POST'])
@authentication_classes([CrawlerAPIAuthentication])
@permission_classes([CrawlerAPIPermission])
def check_duplicate_articles(request):
    """
    检查重复文章API
    
    POST /api/crawler/articles/check-duplicates
    
    Body:
    {
        "site": "example.com",
        "articles": [
            {
                "title": "文章标题",
                "external_article_url": "https://source.com/article/123"
            }
        ]
    }
    
    Response:
    {
        "results": [
            {
                "index": 0,
                "is_duplicate": true,
                "existing_article": {
                    "id": 123,
                    "title": "现有文章标题",
                    "slug": "existing-article"
                }
            }
        ]
    }
    """
    try:
        data = json.loads(request.body)
        
        if 'site' not in data or 'articles' not in data:
            return Response(
                {"error": "Missing required fields: site, articles"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            site = Site.objects.get(hostname=data['site'])
        except Site.DoesNotExist:
            return Response(
                {"error": f"Site '{data['site']}' not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        articles_data = data['articles']
        results = []
        
        for i, article_data in enumerate(articles_data):
            is_duplicate = False
            existing_article = None
            
            # 按URL查找重复
            if 'external_article_url' in article_data and article_data['external_article_url']:
                try:
                    existing = ArticlePage.objects.get(
                        external_article_url=article_data['external_article_url']
                    )
                    is_duplicate = True
                    existing_article = {
                        "id": existing.id,
                        "title": existing.title,
                        "slug": existing.slug,
                        "publish_at": existing.first_published_at.isoformat() if existing.first_published_at else None
                    }
                except ArticlePage.DoesNotExist:
                    pass
            
            # 按标题查找重复（可选）
            if not is_duplicate and 'title' in article_data:
                existing_by_title = ArticlePage.objects.filter(
                    title=article_data['title']
                ).first()
                
                if existing_by_title:
                    is_duplicate = True
                    existing_article = {
                        "id": existing_by_title.id,
                        "title": existing_by_title.title,
                        "slug": existing_by_title.slug,
                        "publish_at": existing_by_title.first_published_at.isoformat() if existing_by_title.first_published_at else None
                    }
            
            results.append({
                "index": i,
                "is_duplicate": is_duplicate,
                "existing_article": existing_article
            })
        
        return Response({"results": results})
        
    except Exception as e:
        logger.error(f"Error in check_duplicate_articles: {e}")
        return Response(
            {"error": f"Internal server error: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@authentication_classes([CrawlerAPIAuthentication])
@permission_classes([CrawlerAPIPermission])
def get_site_info(request):
    """
    获取站点信息API - 帮助爬虫了解目标站点的结构
    
    GET /api/crawler/sites/{site_hostname}/info
    """
    try:
        site_hostname = request.GET.get('site')
        if not site_hostname:
            return Response(
                {"error": "Missing site parameter"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            site = Site.objects.get(hostname=site_hostname)
        except Site.DoesNotExist:
            return Response(
                {"error": f"Site '{site_hostname}' not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # 获取站点的频道、地区、分类、语言、主题
        channels = list(Channel.objects.filter(sites=site).values('id', 'name', 'slug'))
        regions = list(Region.objects.filter(sites=site).values('id', 'name', 'slug'))
        categories = list(Category.objects.filter(sites=site, is_active=True).values('id', 'name', 'slug'))
        languages = list(Language.objects.all().values('id', 'name', 'code'))
        topics = list(Topic.objects.all().values('id', 'title', 'slug'))
        
        return Response({
            "site": {
                "id": site.id,
                "hostname": site.hostname,
                "site_name": site.site_name,
                "is_default_site": site.is_default_site
            },
            "channels": channels,
            "regions": regions,
            "categories": categories,
            "languages": languages,
            "topics": topics,
            "article_fields": {
                "required": ["title", "body", "site"],
                "optional": [
                    "excerpt", "author_name", "channel", "region", "language",
                    "categories", "category", "topic", "topic_slug", "external_article_url", "external_site",
                    "canonical_url", "publish_at", "has_video", "allow_aggregate",
                    "is_featured", "weight", "tags", "live"
                ]
            }
        })
        
    except Exception as e:
        logger.error(f"Error in get_site_info: {e}")
        return Response(
            {"error": f"Internal server error: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
