"""
简化的 OpenSearch 索引管理 - 适合新项目的直接方案
去除复杂的别名系统，采用直接索引模式
"""
from .client import get_client
from django.conf import settings


def get_index_name(site: str = None) -> str:
    """获取站点对应的索引名称 - 简化版本"""
    site = site or getattr(settings, 'SITE_HOSTNAME', 'localhost')
    # 简化命名：去掉端口号，统一格式
    site_clean = site.split(':')[0]  # 去掉端口号
    normalized_site = site_clean.replace(".", "_").replace("-", "_")
    return f"articles_{normalized_site}"


# 完整对齐的映射定义
ARTICLE_MAPPING = {
    "settings": {
        "index": {
            "number_of_shards": 1,
            "number_of_replicas": 0,
            # 增强型中文分词配置（OpenSearch 3.0优化）
            "analysis": {
                "analyzer": {
                    "chinese_analyzer": {
                        "tokenizer": "standard",
                        "char_filter": ["html_strip"],
                        "filter": ["lowercase", "cjk_width", "cjk_bigram", "stop_chinese"]
                    },
                    "chinese_search_analyzer": {
                        "tokenizer": "standard", 
                        "char_filter": ["html_strip"],
                        "filter": ["lowercase", "cjk_width", "cjk_bigram", "stop_chinese"]  # ✅ 添加 cjk_bigram 保持一致
                    },
                    "chinese_keyword_analyzer": {
                        "tokenizer": "keyword",
                        "filter": ["lowercase", "trim"]
                    }
                },
                "filter": {
                    "stop_chinese": {
                        "type": "stop",
                        "stopwords": ["的", "了", "在", "是", "和", "与", "但", "而", "因", "为", "由", "从", "到", "这", "那", "个", "之", "以", "及", "将", "会", "可", "所", "有", "等", "等等", "或者", "如果", "虽然", "但是", "因为", "所以"]
                    }
                }
            }
        }
    },
    "mappings": {
        "properties": {
            # === 基础标识字段 ===
            "article_id": {"type": "keyword"},
            "slug": {"type": "keyword"},
            "site": {"type": "keyword"},
            "tenant": {"type": "keyword"},
            "url": {"type": "text", "fields": {"raw": {"type": "keyword", "ignore_above": 512}}},
            
            # === 内容字段 ===
            "title": {
                "type": "text", 
                "analyzer": "chinese_analyzer",
                "search_analyzer": "chinese_search_analyzer",
                "fields": {
                    "raw": {"type": "keyword", "ignore_above": 256},
                    "suggest": {
                        "type": "text",
                        "analyzer": "chinese_analyzer"
                    }
                }
            },
            "summary": {
                "type": "text", 
                "analyzer": "chinese_analyzer",
                "search_analyzer": "chinese_search_analyzer"
            },
            "body": {
                "type": "text", 
                "analyzer": "chinese_analyzer",
                "search_analyzer": "chinese_search_analyzer"
            },
            # 🎯 新增重要搜索字段
            "excerpt": {
                "type": "text",
                "analyzer": "chinese_analyzer", 
                "search_analyzer": "chinese_search_analyzer"
            },
            "search_description": {
                "type": "text",
                "analyzer": "chinese_analyzer",
                "search_analyzer": "chinese_search_analyzer"
            },
            "seo_title": {
                "type": "text",
                "analyzer": "chinese_analyzer",
                "search_analyzer": "chinese_search_analyzer",
                "fields": {
                    "raw": {"type": "keyword", "ignore_above": 256}
                }
            },
            
            # === 作者信息 ===
            "author": {"type": "keyword"},  # 对应 author_name
            
            # === 分类与标签 ===
            "channel": {"type": "keyword"},
            "primary_channel_slug": {"type": "keyword"},
            "original_channel": {"type": "keyword"},
            "categories": {"type": "keyword"},  # 数组类型
            "tags": {"type": "keyword"},        # 数组类型
            "topics": {"type": "keyword"},      # 🎯 主题标签数组
            "region": {"type": "keyword"},
            
            # === 语言信息 ===
            "lang": {"type": "keyword"},
            
            # === 布尔标记 ===
            "has_video": {"type": "boolean"},
            "is_hero": {"type": "boolean"},
            "is_featured": {"type": "boolean"},
            
            # === 数值权重 ===
            "weight": {"type": "float"},
            "quality_score": {"type": "float"},
            
            # === 时间字段 ===
            "publish_time": {"type": "date"},
            "first_published_at": {"type": "date"},
            "updated_at": {"type": "date"},  # 🔥 更新时间
            
            # === 统计数据 ===
            "view_count": {"type": "long"},
            "comment_count": {"type": "long"},
            "like_count": {"type": "long"},
            "favorite_count": {"type": "long"},
            "reading_time": {"type": "integer"},
            
            # === 实时热度数据 ===
            "pop_1h": {"type": "float"},
            "pop_24h": {"type": "float"},
            "ctr_1h": {"type": "float"},
            "ctr_24h": {"type": "float"},
            
            # === 热度计算 ===
            "hotness_score": {"type": "float"},
            "hotness_category": {"type": "keyword"},  # hot, trending, normal
            
            # === 聚合相关 ===
            "source_type": {"type": "keyword"},        # internal, external
            "allow_aggregate": {"type": "boolean"},
            "canonical_url": {"type": "keyword"},
            "external_article_url": {"type": "keyword"},
        }
    }
}


def ensure_index(site: str = None) -> str:
    """确保索引存在 - 简化版本"""
    index_name = get_index_name(site)
    client = get_client()
    
    if not client.indices.exists(index=index_name):
        client.indices.create(index=index_name, body=ARTICLE_MAPPING)
        print(f"✅ 创建索引: {index_name}")
    else:
        print(f"📋 索引已存在: {index_name}")
    
    return index_name


def update_mapping_if_needed(site: str = None) -> bool:
    """更新映射（如果需要） - 安全的增量更新"""
    index_name = get_index_name(site)
    client = get_client()
    
    try:
        # 只更新 mappings 部分，不影响现有数据
        client.indices.put_mapping(
            index=index_name,
            body=ARTICLE_MAPPING["mappings"]
        )
        print(f"✅ 更新映射: {index_name}")
        return True
    except Exception as e:
        print(f"⚠️ 映射更新失败: {e}")
        return False


def delete_index(site: str = None, confirm: bool = False) -> bool:
    """删除索引 - 危险操作，需要确认"""
    if not confirm:
        print("❌ 删除索引需要 confirm=True")
        return False
    
    index_name = get_index_name(site)
    client = get_client()
    
    try:
        client.indices.delete(index=index_name)
        print(f"🗑️ 删除索引: {index_name}")
        return True
    except Exception as e:
        print(f"⚠️ 删除失败: {e}")
        return False


def get_index_info(site: str = None) -> dict:
    """获取索引信息"""
    index_name = get_index_name(site)
    client = get_client()
    
    try:
        return {
            "index_name": index_name,
            "exists": client.indices.exists(index=index_name),
            "doc_count": client.count(index=index_name)["count"] if client.indices.exists(index=index_name) else 0,
            "mapping": client.indices.get_mapping(index=index_name) if client.indices.exists(index=index_name) else None
        }
    except Exception as e:
        return {"error": str(e)}
