import os, hashlib

def _env_bool(key:str, default:bool=False)->bool:
    v = os.getenv(key)
    if v is None: return default
    return v.lower() in ("1","true","yes","on")

def _env_int(key:str, default:int)->int:
    try: return int(os.getenv(key, ""))
    except: return default

FLAGS = {
    "feed.use_lgbm": _env_bool("FF_FEED_USE_LGBM", False),
    "feed.diversity.limit_author": _env_int("FF_FEED_DIVERSITY_AUTHOR_LIMIT", 3),
    "feed.diversity.limit_topic": _env_int("FF_FEED_DIVERSITY_TOPIC_LIMIT", 3),
    "recall.window_hours": _env_int("FF_RECALL_WINDOW_HOURS", 72),
}

def flag(name, default=None): return FLAGS.get(name, default)

def ab_bucket(test_name:str, key:str, percent:int)->bool:
    if percent <= 0: return False
    if percent >= 100: return True
    h = hashlib.md5((str(key)+":"+test_name).encode()).hexdigest()
    return (int(h[:8],16) % 100) < percent
