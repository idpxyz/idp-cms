def article_to_doc(page) -> dict:
    tags = [t.name for t in getattr(page, "tags", []).all()] if hasattr(page, "tags") else []
    return {
        "article_id": str(page.id),
        "tenant": page.get_site().hostname,
        "site": page.get_site().hostname,
        "channel": getattr(page, "channel_slug","recommend"),
        "topic": getattr(page, "topic_slug",""),
        "tags": tags,
        "author": getattr(page, "author_name",""),
        "title": page.title,
        "body": page.search_description or getattr(page,"introduction","") or "",
        "has_video": bool(getattr(page, "has_video", False)),
        "region": getattr(page, "region","global"),
        "publish_time": (page.first_published_at.isoformat() if page.first_published_at else None),
        "pop_1h": 0.0, "pop_24h": 0.0, "ctr_1h": 0.0, "ctr_24h": 0.0,
        "quality_score": 1.0, "lang": getattr(page, "language","zh"),
    }
