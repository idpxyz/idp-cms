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
        
        # 🖼️ 提取图片URL（封面或正文第一张图片）
        image_url, cover_image_url = self._extract_image_urls(page)
        
        # 构建基础文档
        doc = {
            "article_id": str(page.id),
            "slug": getattr(page, "slug", None),
            "site": site_identifier,
            "tenant": site_identifier,
            "url": url,
            "title": getattr(page, "title", ""),
            "summary": getattr(page, "summary", getattr(page, "excerpt", "")),
            "body": self._extract_body_text(page),
            # 🎯 新增重要搜索字段
            "excerpt": getattr(page, "excerpt", ""),  # 专门的文章摘要
            "search_description": getattr(page, "search_description", ""),  # SEO描述
            "seo_title": getattr(page, "seo_title", ""),  # SEO标题
            "topics": self._extract_topics(page),  # 主题标签
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
            # 🔥 新增统计字段用于排序和过滤
            "view_count": getattr(page, "view_count", 0),
            "comment_count": getattr(page, "comment_count", 0),
            "like_count": getattr(page, "like_count", 0),
            "favorite_count": getattr(page, "favorite_count", 0),
            "reading_time": getattr(page, "reading_time", 0),
            "updated_at": getattr(page, "updated_at", None),
            "source_type": getattr(page, "source_type", "internal"),
            "pop_1h": 0.0, "pop_24h": 0.0, "ctr_1h": 0.0, "ctr_24h": 0.0,
            "quality_score": 1.0,
            "lang": lang_code,
            # 🎯 添加Hero标记和其他重要字段用于过滤
            "is_hero": bool(getattr(page, "is_hero", False)),
            "is_featured": bool(getattr(page, "is_featured", False)),
            "weight": float(getattr(page, "weight", 0)),
            # 🖼️ 图片字段
            "image_url": image_url,
            "cover_image_url": cover_image_url,
        }
        
        # 🔥 热度标记：动态计算并添加虚拟频道标签
        if self.enable_hotness_tagging:
            doc = self._add_hotness_tags(doc, page)
        
        return doc
    
    def _extract_body_text(self, page) -> str:
        """
        从页面中提取body文本内容
        """
        try:
            # 首先尝试从实际的body字段获取内容
            if hasattr(page, 'body') and page.body:
                import re
                # 从RichTextField中移除HTML标签，提取纯文本
                text_content = re.sub(r'<[^>]+>', '', str(page.body))
                # 清理多余的空白
                text_content = ' '.join(text_content.split())
                if text_content:
                    return text_content[:2000]  # 限制长度，避免索引过大
            
            # 回退到原有逻辑
            return getattr(page, "search_description", None) or getattr(page, "introduction", "") or ""
        except Exception:
            # 出错时返回空字符串，不影响索引过程
            return ""
    
    def _extract_topics(self, page) -> list:
        """
        从页面中提取topics主题标签
        """
        topics = []
        try:
            if hasattr(page, 'topics') and page.topics:
                for topic in page.topics.all():
                    if hasattr(topic, 'name'):
                        topics.append(topic.name)
                    elif hasattr(topic, 'title'):
                        topics.append(topic.title)
                    else:
                        topics.append(str(topic))
        except Exception:
            pass
        return topics
    
    def _extract_image_urls(self, page) -> tuple:
        """
        提取图片URL
        优先使用封面图片，如果没有则从正文提取第一张图片
        返回: (image_url, cover_image_url) 元组
        """
        cover_image_url = None
        image_url = None
        
        try:
            # 1️⃣ 尝试获取封面图片
            if hasattr(page, 'cover') and page.cover:
                cover_image_url = self._get_image_url(page.cover)
                image_url = cover_image_url  # 优先使用封面图片
            
            # 2️⃣ 如果没有封面，尝试从正文提取第一张图片
            if not image_url and hasattr(page, 'extract_first_image_from_body'):
                first_image = page.extract_first_image_from_body()
                if first_image:
                    image_url = self._get_image_url(first_image)
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(
                f"提取文章 {page.id} 图片URL时出错: {e}"
            )
        
        return image_url, cover_image_url
    
    def _get_image_url(self, image) -> str:
        """
        从Wagtail Image对象获取URL
        使用URLConfig确保返回浏览器可访问的完整URL
        """
        if not image:
            return None
        
        try:
            # 获取原始文件路径（MinIO中的路径）
            if hasattr(image, 'file') and image.file:
                file_path = str(image.file.name)
                
                # 使用URLConfig构建媒体代理URL
                from apps.core.url_config import URLConfig
                # for_internal=False 确保返回浏览器可访问的URL
                return URLConfig.build_media_proxy_url(file_path, for_internal=False)
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(
                f"获取图片URL时出错: {e}"
            )
        
        return None
    
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
