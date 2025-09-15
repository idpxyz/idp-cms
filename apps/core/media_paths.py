"""
动态媒体路径生成器
根据站点、集合、时间等信息生成标准化的存储路径
"""
from datetime import datetime
from hashlib import sha256
from pathlib import Path
from django.utils.text import slugify
from django.conf import settings
from wagtail.models import Site


def _infer_site_from_collection(collection):
    """
    从集合智能推断站点 slug
    
    Args:
        collection: Wagtail Collection 对象
        
    Returns:
        str: 站点 slug
    """
    if not collection:
        return 'portal'
    
    collection_name = collection.name.lower()
    
    # 获取所有站点信息，避免硬编码
    try:
        sites = Site.get_all_sites_info()
        
        # 尝试匹配集合名称中的站点信息
        for site_info in sites:
            site_slug = site_info.get('slug', '')
            if site_slug and site_slug != 'portal' and site_slug in collection_name:
                return site_slug
        
        # 如果没有匹配到，返回默认值
        return 'portal'
        
    except Exception:
        # 如果数据库查询失败，返回默认值
        return 'portal'


def build_media_path(instance, filename):
    """
    构建媒体文件的存储路径
    
    格式: {tenant}/{site}/{collection}/{yyyy}/{mm}/{category}/{hash}.{ext}
    
    Args:
        instance: 文件关联的模型实例 (Image/Document)
        filename: 原始文件名
        
    Returns:
        str: 标准化的存储路径
    """
    # 1. 获取租户信息（可配置）
    use_tenant = getattr(settings, 'MEDIA_USE_TENANT', True)
    tenant = getattr(settings, 'MEDIA_TENANT_NAME', 'aivoya') if use_tenant else None
    
    # 2. 获取站点信息 - 优先使用新的 site 字段
    site_slug = "portal"  # 默认站点
    
    if hasattr(instance, 'site') and instance.site:
        # 优先使用实例的站点字段
        site_slug = getattr(instance.site, 'slug', 'portal')
    elif hasattr(instance, '_request') and instance._request:
        # 从请求中获取站点信息
        try:
            from apps.core.site_utils import get_site_from_request
            site_slug = get_site_from_request(instance._request)
        except ImportError:
            # 如果导入失败，使用默认值
            pass
    elif hasattr(instance, 'collection') and instance.collection:
        # 尝试从集合名称智能推断站点
        site_slug = _infer_site_from_collection(instance.collection)
    
    # 3. 获取集合信息
    collection = "default"
    if hasattr(instance, 'collection') and instance.collection:
        collection = slugify(instance.collection.name.lower())
    
    # 4. 生成时间路径
    now = datetime.utcnow()
    year = now.strftime("%Y")
    month = now.strftime("%m")
    
    # 5. 确定文件分类 - 使用新的 file_category 字段
    category = "originals"  # 默认为原始文件
    
    # 优先使用实例的 file_category 字段
    if hasattr(instance, 'file_category') and instance.file_category:
        category = instance.file_category
    elif hasattr(instance, '__class__'):
        # 根据文件类型或实例类型确定分类
        class_name = instance.__class__.__name__
        module_name = instance.__class__.__module__
        
        # 调试信息 - 在生产环境中可以移除
        # print(f"DEBUG: class_name={class_name}, module_name={module_name}")
        
        # 检查是否是 Wagtail 图片变体
        if class_name == 'Rendition' or 'rendition' in class_name.lower():
            category = "renditions"
        # 检查模块名来确定是否是变体
        elif 'wagtailimages' in module_name and 'rendition' in module_name.lower():
            category = "renditions"
        # 更广泛的检查 - 如果是 wagtailimages 模块且不是主图片类
        elif 'wagtailimages' in module_name and class_name not in ['Image', 'CustomImage']:
            category = "renditions"
        # 检查是否是转码文件
        elif 'transcode' in class_name.lower():
            category = "transcodes"
        # 其他媒体处理相关的类
        elif any(keyword in class_name.lower() for keyword in ['thumbnail', 'resize', 'crop']):
            category = "renditions"
    
    # 6. 生成文件哈希和扩展名
    ext = Path(filename).suffix.lower() or ".bin"
    file_hash = sha256(f"{filename}{now.isoformat()}".encode("utf-8")).hexdigest()[:16]
    
    # 7. 构建完整路径
    if tenant:
        path = f"{tenant}/{site_slug}/{collection}/{year}/{month}/{category}/{file_hash}{ext}"
    else:
        path = f"{site_slug}/{collection}/{year}/{month}/{category}/{file_hash}{ext}"
    
    return path


def build_temp_media_path(instance, filename):
    """
    构建临时媒体文件的存储路径
    
    Args:
        instance: 文件关联的模型实例
        filename: 原始文件名
        
    Returns:
        str: 临时文件存储路径
    """
    # 临时文件存储在 tmp/ 目录下
    use_tenant = getattr(settings, 'MEDIA_USE_TENANT', True)
    tenant = getattr(settings, 'MEDIA_TENANT_NAME', 'aivoya') if use_tenant else None
    site_slug = "portal"
    
    if hasattr(instance, '_request') and instance._request:
        try:
            from apps.core.site_utils import get_site_from_request
            site_slug = get_site_from_request(instance._request)
        except ImportError:
            # 如果导入失败，使用默认值
            pass
    
    # 生成时间路径
    now = datetime.utcnow()
    year = now.strftime("%Y")
    month = now.strftime("%m")
    day = now.strftime("%d")
    
    # 生成文件哈希和扩展名
    ext = Path(filename).suffix.lower() or ".bin"
    file_hash = sha256(f"{filename}{now.isoformat()}".encode("utf-8")).hexdigest()[:16]
    
    # 构建临时文件路径
    if tenant:
        path = f"{tenant}/{site_slug}/tmp/{year}/{month}/{day}/{file_hash}{ext}"
    else:
        path = f"{site_slug}/tmp/{year}/{month}/{day}/{file_hash}{ext}"
    
    return path


def get_site_from_collection_name(collection_name):
    """
    从集合名称推断站点标识
    
    Args:
        collection_name: 集合名称
        
    Returns:
        str: 站点标识
    """
    if not collection_name:
        return "portal"
    
    name_lower = collection_name.lower()
    
    # 动态获取所有站点信息
    try:
        sites = Site.get_all_sites_info()
        
        # 尝试匹配集合名称中的站点信息
        for site_info in sites:
            site_slug = site_info.get('slug', '')
            if site_slug and site_slug in name_lower:
                return site_slug
        
        # 如果没有匹配到，返回默认值
        return "portal"
        
    except Exception:
        # 如果数据库查询失败，返回默认值
        return "portal"


def validate_media_path(path):
    """
    验证媒体路径格式是否正确
    
    Args:
        path: 媒体文件路径
        
    Returns:
        bool: 路径是否有效
    """
    if not path:
        return False
    
    try:
        parts = path.split('/')
        
        # 至少应该有6个部分: tenant/site/collection/year/month/category/filename
        if len(parts) < 6:
            return False
        
        tenant, site, collection, year, month = parts[:5]
        
        # 验证年份格式
        if not year.isdigit() or len(year) != 4:
            return False
        
        # 验证月份格式  
        if not month.isdigit() or not (1 <= int(month) <= 12):
            return False
        
        return True
        
    except (ValueError, IndexError):
        return False
