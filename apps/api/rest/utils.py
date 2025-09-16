"""
API工具函数模块

提供API相关的通用功能：
- 站点参数验证
- 字段过滤
- 关联展开
- 过滤和排序
- 缓存相关功能
"""

import json
import hashlib
from datetime import datetime, timedelta
from django.core.cache import cache
from django.conf import settings
from django.db.models import Q
from apps.api.utils.search_utils import apply_search
from wagtail.models import Site
from apps.core.site_utils import get_wagtail_site_from_request
import time


def validate_site_parameter(request):
    """
    验证站点参数
    
    支持两种方式：
    1. 通过 site 查询参数指定
    2. 通过 Host 头自动识别
    
    Args:
        request: Django request 对象（DRF Request 或 WSGIRequest）
        
    Returns:
        Site 对象或 None
    """
    # 1. 优先使用 site 查询参数 - 兼容 DRF Request 和 WSGIRequest
    if hasattr(request, 'query_params'):
        # DRF Request object
        site_param = request.query_params.get("site")
    else:
        # Django WSGIRequest object
        site_param = request.GET.get("site")
    
    if site_param:
        try:
            # 尝试作为 site_id 解析
            if site_param.isdigit():
                return Site.objects.get(id=int(site_param))
            else:
                # 作为主机名解析
                return Site.objects.get(hostname=site_param)
        except Site.DoesNotExist:
            return None
    
    # 2. 如果没有 site 参数，使用 Host 头自动识别
    return get_wagtail_site_from_request(request)


def apply_field_filtering(data, fields):
    """
    应用字段过滤
    
    Args:
        data: 原始数据字典
        fields: 允许的字段列表
        
    Returns:
        过滤后的数据字典
    """
    if not fields:
        return data
    
    # 过滤掉空字符串
    valid_fields = [f.strip() for f in fields if f.strip()]
    
    # 只保留指定的字段
    filtered_data = {}
    for field in valid_fields:
        if field in data:
            filtered_data[field] = data[field]
    
    return filtered_data


def apply_include_expansion(data, includes, article, site):
    """
    应用关联展开
    
    Args:
        data: 原始数据字典
        includes: 需要展开的关联列表
        article: 文章对象
        site: 站点对象
        
    Returns:
        展开后的数据字典
    """
    if not includes:
        return data
    
    # 过滤掉空字符串
    valid_includes = [inc.strip() for inc in includes if inc.strip()]
    
    for include in valid_includes:
        if include == "channel" and article.channel:
            # 展开频道信息
            channel = article.channel
            data["channel"] = {
                "slug": channel.slug,
                "name": channel.name,
                "description": channel.description,
                "order": channel.order,
                "is_active": channel.is_active,
            }
        
        elif include == "region" and article.region:
            # 展开地区信息
            region = article.region
            data["region"] = {
                "slug": region.slug,
                "name": region.name,
                "description": region.description,
                "order": region.order,
                "is_active": region.is_active,
            }
        
        elif include == "categories":
            # 展开分类信息
            categories = article.categories.filter(is_active=True).order_by('order', 'name')
            data["categories"] = [{
                "id": cat.id,
                "name": cat.name,
                "slug": cat.slug,
                "description": cat.description,
                "parent_id": cat.parent.id if cat.parent else None,
                "parent_name": cat.parent.name if cat.parent else None,
                "order": cat.order
            } for cat in categories]
        
        elif include == "topic" and article.topic:
            # 展开专题信息
            topic = article.topic
            data["topic"] = {
                "id": topic.id,
                "title": topic.title,
                "slug": topic.slug,
                "summary": topic.summary,
                "is_active": topic.is_active,
                "is_featured": topic.is_featured,
                "order": topic.order,
                "cover_image_url": topic.cover_image.get_rendition('width-400').url if topic.cover_image else None
            }
        
        elif include == "cover" and hasattr(article, 'cover'):
            # 展开封面图片信息
            cover = getattr(article, 'cover', None)
            if cover:
                data["cover"] = {
                    "url": cover.url if hasattr(cover, 'url') else str(cover),
                    "alt": cover.alt if hasattr(cover, 'alt') else "",
                    "title": cover.title if hasattr(cover, 'title') else ""
                }
    
    return data


def apply_filtering(queryset, query_params):
    """
    应用过滤条件
    
    Args:
        queryset: 基础查询集
        query_params: 查询参数字典
        
    Returns:
        过滤后的查询集
    """
    # 频道过滤
    channel = query_params.get("channel")
    if channel:
        if isinstance(channel, list):
            queryset = queryset.filter(channel__slug__in=channel)
        else:
            queryset = queryset.filter(channel__slug=channel)
    
    # 地区过滤
    region = query_params.get("region")
    if region:
        if isinstance(region, list):
            queryset = queryset.filter(region__slug__in=region)
        else:
            queryset = queryset.filter(region__slug=region)
    
    # 分类过滤
    categories = query_params.get("categories")
    if categories:
        if isinstance(categories, str):
            categories = [c.strip() for c in categories.split(',') if c.strip()]
        if categories:
            queryset = queryset.filter(categories__slug__in=categories).distinct()
    
    # 专题过滤
    topics = query_params.get("topics")
    if topics:
        if isinstance(topics, str):
            topics = [t.strip() for t in topics.split(',') if t.strip()]
        if topics:
            queryset = queryset.filter(topic__slug__in=topics)

    # 标签过滤（逗号分隔，多选）
    tags = query_params.get("tags")
    if tags:
        if isinstance(tags, str):
            tags = [t.strip() for t in tags.split(',') if t.strip()]
        if tags:
            from django.db.models import Q
            tag_filter = Q(tags__slug__in=tags) | Q(tags__name__in=tags)
            queryset = queryset.filter(tag_filter).distinct()
    
    # 搜索关键词（中文分词+加权）
    q = query_params.get("q")
    if q:
        # 使用分词搜索并按权重生成 search_rank（修正字段名：excerpt）
        queryset = apply_search(
            queryset,
            q,
            fields=[("title", 10), ("excerpt", 5), ("body", 1)]
        )
    
    # 是否置顶
    is_featured = query_params.get("is_featured")
    if is_featured is not None:
        if is_featured.lower() in ("true", "1", "yes"):
            queryset = queryset.filter(is_featured=True)
        elif is_featured.lower() in ("false", "0", "no"):
            queryset = queryset.filter(is_featured=False)
    
    # 时间过滤
    since = query_params.get("since")
    if since:
        try:
            from django.utils import timezone
            from datetime import timedelta
            
            # 支持多种时间格式
            if since.isdigit():
                # Unix 时间戳
                since_time = datetime.fromtimestamp(int(since))
            elif since.endswith('h'):
                # 相对小时格式: 24h, 1h
                hours = int(since[:-1])
                since_time = timezone.now() - timedelta(hours=hours)
            elif since.endswith('d'):
                # 相对天数格式: 7d, 30d
                days = int(since[:-1])
                since_time = timezone.now() - timedelta(days=days)
            elif since.endswith('m'):
                # 相对分钟格式: 30m
                minutes = int(since[:-1])
                since_time = timezone.now() - timedelta(minutes=minutes)
            else:
                # ISO 格式时间
                since_time = datetime.fromisoformat(since.replace('Z', '+00:00'))
            
            queryset = queryset.filter(first_published_at__gte=since_time)
        except (ValueError, TypeError):
            pass
    
    return queryset


def apply_ordering(queryset, order_param):
    """
    应用排序
    
    Args:
        queryset: 查询集
        order_param: 排序参数字符串
        
    Returns:
        排序后的查询集
    """
    if not order_param:
        return queryset
    
    # 解析排序参数
    order_fields = order_param.split(",")
    order_expressions = []
    
    for field in order_fields:
        field = field.strip()
        if not field:
            continue
        
        # 检查是否降序
        if field.startswith("-"):
            field_name = field[1:]
            direction = "-"
        else:
            field_name = field
            direction = ""
        
        # 映射字段名
        field_mapping = {
            "publish_at": "first_published_at",
            "updated_at": "last_published_at",
            "title": "title",
            "weight": "weight",
            "is_featured": "is_featured"
        }
        
        db_field = field_mapping.get(field_name, field_name)
        # 允许基于注解的排序字段（如 search_rank）
        if db_field == "search_rank" or hasattr(queryset.model, db_field):
            order_expressions.append(f"{direction}{db_field}")
    
    if order_expressions:
        return queryset.order_by(*order_expressions)
    
    return queryset


def generate_cache_key(prefix, params):
    """
    生成缓存键
    
    Args:
        prefix: 缓存键前缀
        params: 参数字典
        
    Returns:
        缓存键字符串
    """
    # 过滤掉 None 值和空字符串
    filtered_params = {k: v for k, v in params.items() if v is not None and v != ""}
    
    # 生成参数哈希
    param_str = json.dumps(filtered_params, sort_keys=True)
    param_hash = hashlib.md5(param_str.encode()).hexdigest()[:8]
    
    return f"{prefix}:{param_hash}"


def generate_etag(data, updated_at=None, use_timestamp=True):
    """
    生成 ETag
    
    Args:
        data: 响应数据
        updated_at: 最后更新时间
        use_timestamp: 是否优先使用时间戳
        
    Returns:
        ETag 字符串
    """
    if use_timestamp and updated_at:
        # 基于时间戳生成ETag（性能更好）
        if isinstance(updated_at, str):
            # 如果是字符串，直接使用
            timestamp_str = updated_at
        else:
            # 如果是datetime对象，转换为ISO格式
            timestamp_str = updated_at.isoformat()
        
        # 生成时间戳的哈希
        return hashlib.md5(timestamp_str.encode()).hexdigest()
    
    # 回退到基于内容的ETag生成
    data_str = json.dumps(data, sort_keys=True, default=str)
    return hashlib.md5(data_str.encode()).hexdigest()


def generate_etag_from_timestamp(updated_at):
    """
    专门基于时间戳生成ETag
    
    Args:
        updated_at: 最后更新时间
        
    Returns:
        ETag 字符串
    """
    if not updated_at:
        return None
    
    if isinstance(updated_at, str):
        timestamp_str = updated_at
    else:
        # 忽略微秒，只保留到秒级别，确保ETag稳定性
        timestamp_str = updated_at.replace(microsecond=0).isoformat()
    
    return hashlib.md5(timestamp_str.encode()).hexdigest()


def generate_cached_etag(cache_key, data, updated_at=None, cache_timeout=300):
    """
    生成缓存的ETag，避免重复计算
    
    Args:
        cache_key: 缓存键
        data: 响应数据
        updated_at: 最后更新时间
        cache_timeout: 缓存超时时间（秒）
        
    Returns:
        ETag 字符串
    """
    # 尝试从缓存获取ETag
    cached_etag = cache.get(f"etag:{cache_key}")
    if cached_etag:
        return cached_etag
    
    # 生成新的ETag
    if updated_at:
        etag = generate_etag_from_timestamp(updated_at)
    else:
        etag = generate_etag(data, use_timestamp=False)
    
    # 缓存ETag（缓存时间比内容缓存短一些）
    cache.set(f"etag:{cache_key}", etag, cache_timeout)
    
    return etag


def generate_etag_with_cache(cache_key, data, updated_at=None, cache_timeout=300):
    """
    智能ETag生成，优先使用时间戳，回退到内容哈希
    
    Args:
        cache_key: 缓存键
        data: 响应数据
        updated_at: 最后更新时间
        cache_timeout: 缓存超时时间（秒）
        
    Returns:
        ETag 字符串
    """
    # 如果有时间戳，优先使用时间戳（性能更好）
    if updated_at:
        return generate_cached_etag(cache_key, None, updated_at, cache_timeout)
    
    # 否则使用内容哈希
    return generate_cached_etag(cache_key, data, None, cache_timeout)


def generate_surrogate_keys(site, articles):
    """
    生成 Surrogate-Key 缓存标签
    
    Args:
        site: 站点对象
        articles: 文章列表
        
    Returns:
        缓存标签列表
    """
    keys = [f"site:{site.hostname}"]
    
    for article in articles:
        # 页面标签
        keys.append(f"page:{article.id}")
        
        # 频道标签
        if article.channel:
            keys.append(f"channel:{article.channel.slug}")
        
        # 地区标签
        if article.region:
            keys.append(f"region:{article.region.slug}")
    
    return keys


def get_cache_timeout(site, content_type="default"):
    """
    获取缓存超时时间
    
    Args:
        site: 站点对象
        content_type: 内容类型
        
    Returns:
        缓存超时时间（秒）
    """
    # 默认缓存时间
    default_timeouts = {
        "articles": 120,      # 文章列表和详情：2分钟
        "channels": 300,      # 频道：5分钟
        "regions": 300,       # 地区：5分钟
        "settings": 600,      # 站点配置：10分钟
        "portal": 120,        # 门户聚合：2分钟
        "default": 300        # 默认：5分钟
    }
    
    # 从站点配置获取自定义超时时间
    try:
        # TODO: 实现从站点配置获取缓存超时时间
        pass
    except:
        pass
    
    return default_timeouts.get(content_type, default_timeouts["default"])


def validate_pagination_params(page, size, max_size=100):
    """
    验证分页参数
    
    Args:
        page: 页码
        size: 每页大小
        
    Returns:
        (page, size) 元组
    """
    # 页码验证
    try:
        page = int(page)
        if page < 1:
            page = 1
    except (ValueError, TypeError):
        page = 1
    
    # 每页大小验证
    try:
        size = int(size)
        if size < 1:
            size = 20
        elif size > max_size:
            size = max_size
    except (ValueError, TypeError):
        size = 20
    
    return page, size


def format_datetime(dt):
    """
    格式化日期时间
    
    Args:
        dt: 日期时间对象
        
    Returns:
        ISO 格式字符串
    """
    if dt is None:
        return None
    
    if isinstance(dt, str):
        return dt
    
    try:
        return dt.isoformat()
    except AttributeError:
        return str(dt)


def sanitize_string(value, max_length=1000):
    """
    清理字符串
    
    Args:
        value: 原始值
        max_length: 最大长度
        
    Returns:
        清理后的字符串
    """
    if value is None:
        return ""
    
    # 转换为字符串
    value = str(value)
    
    # 去除首尾空白
    value = value.strip()
    
    # 限制长度
    if len(value) > max_length:
        value = value[:max_length] + "..."
    
    return value


def check_etag_match(request, etag):
    """
    检查ETag是否匹配
    
    Args:
        request: Django request 对象
        etag: 当前资源的ETag
        
    Returns:
        bool: 是否匹配
    """
    if_none_match = request.META.get('HTTP_IF_NONE_MATCH')
    if not if_none_match:
        return False
    
    # 移除引号
    if_none_match = if_none_match.strip('"')
    
    # 支持多个ETag（逗号分隔）
    if ',' in if_none_match:
        etags = [e.strip().strip('"') for e in if_none_match.split(',')]
        return etag.strip('"') in etags
    
    return etag.strip('"') == if_none_match


def should_return_304(request, etag):
    """
    判断是否应该返回304 Not Modified
    
    Args:
        request: Django request 对象
        etag: 当前资源的ETag
        
    Returns:
        bool: 是否应该返回304
    """
    # 检查If-None-Match
    if check_etag_match(request, etag):
        return True
    
    # 检查If-Modified-Since（可选）
    if_modified_since = request.META.get('HTTP_IF_MODIFIED_SINCE')
    if if_modified_since:
        try:
            from email.utils import parsedate_to_datetime
            if_modified_since_dt = parsedate_to_datetime(if_modified_since)
            # 这里可以添加时间比较逻辑
            pass
        except:
            pass
    
    return False


def get_last_modified(articles):
    """
    获取最后修改时间
    
    Args:
        articles: 文章列表或单个文章
        
    Returns:
        datetime: 最后修改时间
    """
    if not articles:
        return None
    
    if hasattr(articles, '__iter__') and not isinstance(articles, (str, bytes)):
        # 文章列表
        last_modified = None
        for article in articles:
            if hasattr(article, 'last_published_at') and article.last_published_at:
                if last_modified is None or article.last_published_at > last_modified:
                    last_modified = article.last_published_at
        return last_modified
    else:
        # 单个文章
        article = articles
        if hasattr(article, 'last_published_at') and article.last_published_at:
            return article.last_published_at
        return None
