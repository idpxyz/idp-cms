from .client import get_client

def norm(site:str): return site.replace(".","_")

def read_alias(site:str)->str: return f"news_{norm(site)}_articles"

def write_alias(site:str)->str: return f"news_{norm(site)}_articles_write"

def version_index(site:str, v:int)->str: return f"news_{norm(site)}_articles_v{v}"

MAPPING = {
  "settings": {"index": {"number_of_shards": 1, "number_of_replicas": 0}},
  "mappings": {"properties": {
    "article_id": {"type": "keyword"},
    "slug": {"type": "keyword"},
    "tenant": {"type": "keyword"},
    "site": {"type": "keyword"},
    "channel": {"type": "keyword"},
    "primary_channel_slug": {"type": "text", "fields": {"keyword": {"type": "keyword", "ignore_above": 256}}},
    "topic": {"type": "keyword"},
    "tags": {"type": "keyword"},
    "categories": {"type": "keyword"},
    "author": {"type": "keyword"},
    "title": {"type": "text"},
    "summary": {"type": "text"},
    "body": {"type": "text"},
    "has_video": {"type": "boolean"},
    "region": {"type": "keyword"},
    "publish_time": {"type": "date"},
    "first_published_at": {"type": "date"},
    "pop_1h": {"type": "float"},
    "pop_24h": {"type": "float"},
    "ctr_1h": {"type": "float"},
    "ctr_24h": {"type": "float"},
    "quality_score": {"type": "float"},
    "lang": {"type": "keyword"}
  }}
}

def ensure_versioned_index(site:str, v:int=1):
    os = get_client()
    idx = version_index(site, v)
    if not os.indices.exists(index=idx):
        os.indices.create(index=idx, body=MAPPING)
    actions = []
    if not os.indices.exists_alias(name=read_alias(site)):
        actions.append({"add":{"index": idx, "alias": read_alias(site)}})
    if not os.indices.exists_alias(name=write_alias(site)):
        actions.append({"add":{"index": idx, "alias": write_alias(site), "is_write_index": True}})
    if actions:
        os.indices.update_aliases(body={"actions": actions})
    return idx

def reindex_and_switch(site:str, new_version:int):
    os = get_client()
    src_alias = read_alias(site)
    dst_index = version_index(site, new_version)
    if not os.indices.exists(index=dst_index):
        os.indices.create(index=dst_index, body=MAPPING)
    os.reindex(body={"source":{"index": src_alias}, "dest":{"index": dst_index}}, wait_for_completion=True, refresh=True)
    current = os.indices.get_alias(name=read_alias(site))
    actions = []
    for idx in current.keys():
        actions.append({"remove":{"index": idx, "alias": read_alias(site)}})
        actions.append({"remove":{"index": idx, "alias": write_alias(site)}})
    actions.append({"add":{"index": dst_index, "alias": read_alias(site)}})
    actions.append({"add":{"index": dst_index, "alias": write_alias(site), "is_write_index": True}})
    os.indices.update_aliases(body={"actions": actions})
    return dst_index
