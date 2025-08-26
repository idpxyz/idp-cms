from django.conf import settings
from opensearchpy import OpenSearch

def get_client():
    cfg = settings.OPENSEARCH
    url = cfg["URL"]
    
    # 根据URL协议决定是否使用SSL
    use_ssl = url.startswith("https://")
    if use_ssl:
        hosts = [url]
    else:
        # 对于HTTP，保持原样
        hosts = [url]
    
    return OpenSearch(
        hosts=hosts,
        http_auth=(cfg["USERNAME"], cfg["PASSWORD"]),
        use_ssl=use_ssl,
        verify_certs=False,
        ssl_show_warn=False,
        timeout=30,
        max_retries=3,
        retry_on_timeout=True,
    )

def index_name_for(site: str) -> str:
    """
    生成站点对应的索引名称
    
    Args:
        site: 站点标识符
        
    Returns:
        str: 索引名称
    """
    from apps.core.site_utils import normalize_site_identifier
    
    normalized_site = normalize_site_identifier(site)
    return f"news_{normalized_site}_articles"
