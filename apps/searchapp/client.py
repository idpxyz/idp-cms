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

def index_name_for(site:str)->str:
    return f"news_{site.replace('.','_')}_articles"
