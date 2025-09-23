class ArticleIndexer:
    """文章索引器 - 将 Wagtail 页面转换为 OpenSearch 文档"""
    
    def __init__(self, target_site=None, enable_hotness_tagging=True):
        """
        初始化索引器
        :param target_site: 目标站点标识符，如果指定，将覆盖page.get_site()的结果
        :param enable_hotness_tagging: 是否启用热度标记（动态计算hot/trending）
        """
        self.target_site = target_site
        self.enable_hotness_tagging = enable_hotness_tagging
    
    def to_doc(self, page) -> dict:
        """将页面转换为索引文档"""
        # 标签
        try:
            tags = list(page.tags.values_list("name", flat=True)) if hasattr(page, "tags") else []
        except Exception:
            tags = []
        
        # 分类（使用 slug）
        categories = []
        try:
            if hasattr(page, "categories"):
                categories = list(page.categories.values_list("slug", flat=True))
        except Exception:
            categories = []
        
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
        
        # 构建基础文档
        doc = {
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
            "categories": categories,
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
            # 🎯 添加Hero标记和其他重要字段用于过滤
            "is_hero": bool(getattr(page, "is_hero", False)),
            "is_featured": bool(getattr(page, "is_featured", False)),
            "weight": float(getattr(page, "weight", 0)),
        }
        
        # 🔥 热度标记：动态计算并添加虚拟频道标签
        if self.enable_hotness_tagging:
            doc = self._add_hotness_tags(doc, page)
        
        return doc
    
    def _add_hotness_tags(self, doc: dict, page) -> dict:
        """
        添加热度标记，动态生成 hot/trending 虚拟频道标签
        """
        try:
            from apps.core.services.hotness_calculator import get_hotness_score
            
            article_id = str(page.id)
            site = doc.get('site', 'localhost')
            
            # 获取热度评分和分类
            hotness_score, category = get_hotness_score(article_id, site)
            
            # 添加热度相关字段
            doc.update({
                'hotness_score': hotness_score,
                'hotness_category': category,
            })
            
            # 🎯 关键：根据分类设置 channel 字段
            if category == 'hot':
                doc['channel'] = 'hot'
            elif category == 'trending':
                doc['channel'] = 'trending'
            # else: 保持原有的 primary_channel_slug
            
            # 保留原始频道信息（用于其他查询）
            if 'channel' in doc and doc['channel'] in ['hot', 'trending']:
                doc['original_channel'] = doc.get('primary_channel_slug', 'recommend')
            
        except Exception as e:
            # 容错：如果热度计算失败，不影响基础索引
            import logging
            logging.getLogger(__name__).warning(f"热度标记失败 {article_id}: {e}")
            doc.update({
                'hotness_score': 0.0,
                'hotness_category': 'normal',
            })
        
        return doc

# 向后兼容
def article_to_doc(page) -> dict:
    """向后兼容的函数"""
    indexer = ArticleIndexer()
    return indexer.to_doc(page)
