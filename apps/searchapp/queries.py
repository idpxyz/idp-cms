import json, pathlib
import logging
from django.conf import settings

# Fix the path to point to the correct configs directory
TEMPLATES_DIR = pathlib.Path("/app/configs/search_templates")

# Get logger for this module
logger = logging.getLogger(__name__)

def load_template(name:str)->dict:
    p = TEMPLATES_DIR / f"{name}.json"
    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)

def replace_in_dict(obj, old_value, new_value):
    """Recursively replace values in a nested dictionary"""
    if isinstance(obj, dict):
        for key, value in obj.items():
            if isinstance(value, str) and old_value in value:
                # For string replacement, only convert to string if new_value is not a list
                if isinstance(new_value, list):
                    # If the old_value is the entire string, replace with the list
                    if value == old_value:
                        obj[key] = new_value
                    else:
                        # For partial replacement in strings, keep as string
                        obj[key] = value.replace(old_value, str(new_value))
                else:
                    obj[key] = value.replace(old_value, str(new_value))
            elif value == old_value:
                obj[key] = new_value
            elif isinstance(value, (dict, list)):
                replace_in_dict(value, old_value, new_value)
    elif isinstance(obj, list):
        for i, value in enumerate(obj):
            if isinstance(value, str) and old_value in value:
                # For string replacement, only convert to string if new_value is not a list
                if isinstance(new_value, list):
                    # If the old_value is the entire string, replace with the list
                    if value == old_value:
                        obj[i] = new_value
                    else:
                        # For partial replacement in strings, keep as string
                        obj[i] = value.replace(old_value, str(new_value))
                else:
                    obj[i] = value.replace(old_value, str(new_value))
            elif value == old_value:
                obj[i] = new_value
            elif isinstance(value, (dict, list)):
                replace_in_dict(value, old_value, new_value)

def build_query(name:str, **params)->dict:
    obj = load_template(name)
    
    # Replace placeholders directly in the object
    replace_in_dict(obj, "__SITE__", params.get("site", settings.SITE_HOSTNAME))
    replace_in_dict(obj, "__HOURS__", params.get("hours", 72))
    
    # Handle channels
    channels = params.get("channels", [])
    if isinstance(channels, str):
        channels = [channels]
    
    # Handle special __CHANNELS_CONDITION__ placeholder for topstories
    if not channels:
        # No channel restriction - remove the should clause entirely
        replace_in_dict(obj, "__CHANNELS_CONDITION__", [])
        channels = ["hot", "trending"]  # fallback for regular __CHANNELS__ placeholder
    else:
        # Has channel restriction - use normal should clause
        channel_condition = [{"terms": {"channel": channels}}]
        replace_in_dict(obj, "__CHANNELS_CONDITION__", channel_condition)
    
    replace_in_dict(obj, "__CHANNELS__", channels)
    
    # Handle seen_ids - skip must_not condition if empty
    seen_ids = params.get("seen_ids", [])
    if isinstance(seen_ids, str):
        seen_ids = [seen_ids]
    
    if seen_ids:
        replace_in_dict(obj, "__SEEN_IDS__", seen_ids)
    else:
        # Remove the must_not condition if seen_ids is empty
        # Handle function_score queries
        if "query" in obj and "function_score" in obj["query"]:
            if "bool" in obj["query"]["function_score"]["query"]:
                if "must_not" in obj["query"]["function_score"]["query"]["bool"]:
                    # Find and remove the article_id terms query from must_not
                    must_not = obj["query"]["function_score"]["query"]["bool"]["must_not"]
                    must_not[:] = [item for item in must_not if not (isinstance(item, dict) and "terms" in item and ("article_id" in item["terms"] or "article_id.keyword" in item["terms"]))]
                    # If must_not is now empty, remove it entirely
                    if not must_not:
                        del obj["query"]["function_score"]["query"]["bool"]["must_not"]
        # Handle simple bool queries (for hero template)
        elif "query" in obj and "bool" in obj["query"]:
            if "must_not" in obj["query"]["bool"]:
                # Find and remove the article_id terms query from must_not
                must_not = obj["query"]["bool"]["must_not"]
                must_not[:] = [item for item in must_not if not (isinstance(item, dict) and "terms" in item and ("article_id" in item["terms"] or "article_id.keyword" in item["terms"]))]
                # If must_not is now empty, remove it entirely
                if not must_not:
                    del obj["query"]["bool"]["must_not"]
    
    # Handle size parameter
    size = params.get("size")
    if size:
        obj["size"] = int(size)
    
    # 🎯 Handle extra_filters - 添加对额外过滤条件的支持
    extra_filters = params.get("extra_filters", [])
    if extra_filters:
        # 处理 function_score 查询结构
        if "query" in obj and "function_score" in obj["query"]:
            if "bool" in obj["query"]["function_score"]["query"]:
                bool_query = obj["query"]["function_score"]["query"]["bool"]
                
                # 确保 must_not 数组存在
                if "must_not" not in bool_query:
                    bool_query["must_not"] = []
                
                # 添加额外的过滤条件到 must_not
                for filter_condition in extra_filters:
                    # 如果是 is_hero: False 的条件，转换为 must_not is_hero: True
                    if (isinstance(filter_condition, dict) and 
                        "term" in filter_condition and
                        "is_hero" in filter_condition["term"] and
                        filter_condition["term"]["is_hero"] is False):
                        bool_query["must_not"].append({"term": {"is_hero": True}})
                    else:
                        # 其他条件直接添加到 filter
                        if "filter" not in bool_query:
                            bool_query["filter"] = []
                        bool_query["filter"].append(filter_condition)
        
        # 处理简单的 bool 查询结构（hero模板等）
        elif "query" in obj and "bool" in obj["query"]:
            bool_query = obj["query"]["bool"]
            
            # 确保 must_not 数组存在
            if "must_not" not in bool_query:
                bool_query["must_not"] = []
            
            # 添加额外的过滤条件
            for filter_condition in extra_filters:
                # 如果是 is_hero: False 的条件，转换为 must_not is_hero: True
                if (isinstance(filter_condition, dict) and 
                    "term" in filter_condition and
                    "is_hero" in filter_condition["term"] and
                    filter_condition["term"]["is_hero"] is False):
                    bool_query["must_not"].append({"term": {"is_hero": True}})
                else:
                    # 其他条件直接添加到 filter
                    if "filter" not in bool_query:
                        bool_query["filter"] = []
                    bool_query["filter"].append(filter_condition)
    
    # Debug: log the final object before returning
    logger.info(f"DEBUG: Final object: {json.dumps(obj, ensure_ascii=False)}")
    
    return obj
