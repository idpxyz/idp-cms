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
    
    # Handle channel
    channel = params.get("channel", "recommend")
    if isinstance(channel, list):
        channel = channel[0] if channel else "recommend"
    replace_in_dict(obj, "__CHANNEL__", channel)
    
    # Handle channels - convert terms query to multiple term queries in should clause
    channels = params.get("channels", ["recommend"])
    if isinstance(channels, str):
        channels = [channels]
    
    if "query" in obj and "function_score" in obj["query"]:
        if "bool" in obj["query"]["function_score"]["query"]:
            if "should" in obj["query"]["function_score"]["query"]["bool"]:
                should_clause = obj["query"]["function_score"]["query"]["bool"]["should"]
                # Find and replace the channels terms query
                for i, item in enumerate(should_clause):
                    if isinstance(item, dict) and "terms" in item and "channel" in item["terms"]:
                        # Replace with multiple term queries
                        new_should = []
                        for ch in channels:
                            new_should.append({"term": {"channel": ch}})
                        should_clause[i:i+1] = new_should
                        break
    
    # Handle seen_ids - skip must_not condition if empty
    seen_ids = params.get("seen_ids", [])
    if isinstance(seen_ids, str):
        seen_ids = [seen_ids]
    
    if seen_ids:
        replace_in_dict(obj, "__SEEN_IDS__", seen_ids)
    else:
        # Remove the must_not condition if seen_ids is empty
        if "query" in obj and "function_score" in obj["query"]:
            if "bool" in obj["query"]["function_score"]["query"]:
                if "must_not" in obj["query"]["function_score"]["query"]["bool"]:
                    # Find and remove the article_id terms query from must_not
                    must_not = obj["query"]["function_score"]["query"]["bool"]["must_not"]
                    must_not[:] = [item for item in must_not if not (isinstance(item, dict) and "terms" in item and ("article_id" in item["terms"] or "article_id.keyword" in item["terms"]))]
                    # If must_not is now empty, remove it entirely
                    if not must_not:
                        del obj["query"]["function_score"]["query"]["bool"]["must_not"]
    
    # Debug: log the final object before returning
    logger.info(f"DEBUG: Final object: {json.dumps(obj, ensure_ascii=False)}")
    
    return obj
