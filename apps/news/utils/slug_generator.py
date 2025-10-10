"""
智能 Slug 生成器
支持中文转拼音，生成 SEO 友好的 URL slug
"""

import re
from pypinyin import lazy_pinyin, Style


class SlugGenerator:
    """
    智能 slug 生成器
    
    特点：
    1. 中文转拼音
    2. 保留英文和数字
    3. 自动去除特殊字符
    4. 限制长度
    5. 保证唯一性（通过添加ID）
    """
    
    # 最大长度配置
    MAX_SLUG_LENGTH = 80  # Wagtail 推荐最大100，我们保留一些空间给ID
    MAX_WORDS = 12  # 最多包含12个词
    
    @classmethod
    def generate_from_title(cls, title: str, article_id: int = None, 
                           include_id: bool = True, max_length: int = None) -> str:
        """
        从标题生成 slug
        
        Args:
            title: 文章标题
            article_id: 文章ID（用于保证唯一性）
            include_id: 是否在slug中包含ID
            max_length: 自定义最大长度
            
        Returns:
            生成的 slug
            
        Examples:
            >>> generate_from_title("市场观察：科技投资机会分析", 4142)
            'shichangguancha-keji-touzi-jihui-fenxi-4142'
            
            >>> generate_from_title("Breaking News 2024", 100)
            'breaking-news-2024-100'
        """
        if not title:
            return f"article-{article_id}" if article_id else "article"
        
        max_length = max_length or cls.MAX_SLUG_LENGTH
        
        # 1. 预处理：去除标点符号，保留中文、英文、数字
        # 常见的标题格式标点
        title = re.sub(r'[：:！!？?，,。.、｜|—\-\s]+', ' ', title)
        title = title.strip()
        
        # 2. 分词处理
        words = title.split()
        processed_parts = []
        
        for word in words:
            # 检查是否包含中文
            if re.search(r'[\u4e00-\u9fff]', word):
                # 中文转拼音
                pinyin_parts = lazy_pinyin(word, style=Style.NORMAL)
                processed_parts.extend(pinyin_parts[:5])  # 每个词最多5个拼音
            else:
                # 英文和数字直接使用
                # 清理特殊字符
                clean_word = re.sub(r'[^\w]', '', word)
                if clean_word:
                    processed_parts.append(clean_word.lower())
        
        # 3. 限制词数
        processed_parts = processed_parts[:cls.MAX_WORDS]
        
        # 4. 组合成 slug
        slug = '-'.join(processed_parts)
        
        # 5. 再次清理（防止有遗漏的特殊字符）
        slug = re.sub(r'[^\w\-]', '', slug)
        slug = re.sub(r'-+', '-', slug)  # 多个连字符合并为一个
        slug = slug.strip('-')
        
        # 6. 添加ID（可选，但强烈推荐）
        if include_id and article_id:
            # 确保总长度不超过限制
            id_suffix = f"-{article_id}"
            available_length = max_length - len(id_suffix)
            
            if len(slug) > available_length:
                slug = slug[:available_length].rstrip('-')
            
            slug = f"{slug}{id_suffix}"
        else:
            # 不包含ID时，直接截断
            if len(slug) > max_length:
                slug = slug[:max_length].rstrip('-')
        
        # 7. 确保不为空
        if not slug or slug == '-':
            slug = f"article-{article_id}" if article_id else "article"
        
        return slug.lower()
    
    @classmethod
    def generate_short_slug(cls, title: str, article_id: int = None) -> str:
        """
        生成短 slug（只包含关键词）
        
        适合标题很长的情况
        
        Examples:
            >>> generate_short_slug("市场观察：科技投资机会分析 - 09月12日投资30", 4142)
            'shichangguancha-keji-touzi-4142'
        """
        # 只取前6个词
        original_max = cls.MAX_WORDS
        cls.MAX_WORDS = 6
        
        slug = cls.generate_from_title(title, article_id, include_id=True, max_length=60)
        
        cls.MAX_WORDS = original_max
        return slug
    
    @classmethod
    def is_chinese_slug(cls, slug: str) -> bool:
        """
        检查 slug 是否包含中文字符
        
        Args:
            slug: 要检查的 slug
            
        Returns:
            True 如果包含中文
        """
        return bool(re.search(r'[\u4e00-\u9fff]', slug))
    
    @classmethod
    def validate_slug(cls, slug: str) -> tuple[bool, str]:
        """
        验证 slug 是否符合规范
        
        Args:
            slug: 要验证的 slug
            
        Returns:
            (is_valid, message) 元组
        """
        if not slug:
            return False, "Slug 不能为空"
        
        if cls.is_chinese_slug(slug):
            return False, "Slug 不应包含中文字符"
        
        if len(slug) > 100:  # Wagtail 的限制
            return False, "Slug 长度超过100字符"
        
        if not re.match(r'^[\w\-]+$', slug):
            return False, "Slug 只能包含字母、数字、连字符和下划线"
        
        if slug.startswith('-') or slug.endswith('-'):
            return False, "Slug 不能以连字符开头或结尾"
        
        return True, "Slug 有效"


# 便捷函数
def generate_slug(title: str, article_id: int = None) -> str:
    """快捷方式：生成标准 slug"""
    return SlugGenerator.generate_from_title(title, article_id)


def generate_short_slug(title: str, article_id: int = None) -> str:
    """快捷方式：生成短 slug"""
    return SlugGenerator.generate_short_slug(title, article_id)


def is_chinese_slug(slug: str) -> bool:
    """快捷方式：检查是否为中文 slug"""
    return SlugGenerator.is_chinese_slug(slug)

