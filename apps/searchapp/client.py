from django.conf import settings
from opensearchpy import OpenSearch
import socket
import functools
from apps.core.utils.circuit_breaker import get_breaker, CircuitOpenError


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
    
    os_client = OpenSearch(
        hosts=hosts,
        http_auth=(cfg["USERNAME"], cfg["PASSWORD"]),
        use_ssl=use_ssl,
        verify_certs=False,
        ssl_show_warn=False,
        timeout=10,
        max_retries=1,
        retry_on_timeout=False,
    )

    # Wrap critical top-level methods with circuit breaker
    breaker = get_breaker("opensearch", failure_threshold=5, recovery_timeout=30, rolling_window=60)

    def wrap(method_name: str):
        orig = getattr(os_client, method_name)
        @functools.wraps(orig)
        def wrapper(*args, **kwargs):
            return breaker.call(orig, *args, **kwargs)
        return wrapper

    # Only wrap request-like methods, do NOT wrap namespaces like 'indices'
    for name in [
        "index", "delete", "search", "count", "mget", "reindex",
    ]:
        if hasattr(os_client, name):
            setattr(os_client, name, wrap(name))

    return os_client


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
