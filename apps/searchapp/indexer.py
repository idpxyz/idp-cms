class ArticleIndexer:
    """文章索引器 - 将 Wagtail 页面转换为 OpenSearch 文档"""
    
    def __init__(self, target_site=None):
        """
        初始化索引器
        :param target_site: 目标站点标识符，如果指定，将覆盖page.get_site()的结果
        """
        self.target_site = target_site
    
    def to_doc(self, page) -> dict:
        """将页面转换为索引文档"""
        # 标签
        try:
            tags = list(page.tags.values_list("name", flat=True)) if hasattr(page, "tags") else []
        except Exception:
            tags = []
        
        # 站点标识
        if self.target_site:
            site_identifier = self.target_site
        else:
            try:
                site_identifier = page.get_site().hostname
            except Exception:
                site_identifier = "localhost"
        
        # 频道信息
        primary_channel_slug = None
        try:
            if getattr(page, "channel", None):
                primary_channel_slug = getattr(page.channel, "slug", None)
        except Exception:
            primary_channel_slug = None
        
        # URL 与时间
        try:
            url = page.url
        except Exception:
            url = None
        # 统一发布时间逻辑：使用Wagtail原生时间作为主要源
        publish_at = None
        try:
            # 优先使用 Wagtail 的 first_published_at（更可靠）
            wagtail_time = getattr(page, "first_published_at", None)
            custom_time = getattr(page, "publish_at", None)
            
            if wagtail_time:
                publish_at = wagtail_time.isoformat()
            elif custom_time:
                # 回退到自定义时间（兼容现有数据）
                publish_at = custom_time.isoformat()
        except Exception:
            publish_at = None
        
        # 语言
        lang_code = "zh"
        try:
            if getattr(page, "language", None):
                lang_code = getattr(page.language, "code", "zh")
        except Exception:
            pass
        
        return {
            "article_id": str(page.id),
            "slug": getattr(page, "slug", None),
            "site": site_identifier,
            "tenant": site_identifier,
            "url": url,
            "title": getattr(page, "title", ""),
            "summary": getattr(page, "summary", getattr(page, "excerpt", "")),
            "body": getattr(page, "search_description", None) or getattr(page, "introduction", "") or "",
            "author": getattr(page, "author_name", ""),
            "tags": tags,
            "primary_channel_slug": primary_channel_slug or "recommend",
            # Ensure compatibility with query templates expecting 'channel' and 'publish_time'
            "channel": primary_channel_slug or "recommend",
            # 预留：path/secondary 可在需要时扩展
            "has_video": bool(getattr(page, "has_video", False)),
            "region": getattr(page, "region", "global"),
            "first_published_at": publish_at,
            "publish_time": publish_at,
            "pop_1h": 0.0, "pop_24h": 0.0, "ctr_1h": 0.0, "ctr_24h": 0.0,
            "quality_score": 1.0,
            "lang": lang_code,
        }

# 向后兼容
def article_to_doc(page) -> dict:
    """向后兼容的函数"""
    indexer = ArticleIndexer()
    return indexer.to_doc(page)
