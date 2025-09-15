"""
敏感词过滤系统
确保搜索内容符合法律法规要求
"""

import re
import os
import json
from typing import Set, List, Tuple, Optional
from django.conf import settings
from django.core.cache import cache
import logging

logger = logging.getLogger(__name__)


class SensitiveWordFilter:
    """敏感词过滤器"""
    
    def __init__(self):
        self.sensitive_words: Set[str] = set()
        self.compiled_patterns: List[re.Pattern] = []
        self._load_sensitive_words()
    
    def _load_sensitive_words(self):
        """加载敏感词库"""
        try:
            # 尝试从缓存加载
            cached_words = cache.get('sensitive_words_set')
            if cached_words:
                self.sensitive_words = cached_words
                self._compile_patterns()
                return
            
            # 从文件加载
            sensitive_words_file = os.path.join(
                settings.BASE_DIR, 'apps', 'api', 'data', 'sensitive_words.txt'
            )
            
            words = set()
            
            # 加载基础敏感词库
            if os.path.exists(sensitive_words_file):
                with open(sensitive_words_file, 'r', encoding='utf-8') as f:
                    for line in f:
                        word = line.strip()
                        if word and not word.startswith('#'):
                            words.add(word.lower())
            else:
                # 如果文件不存在，使用默认敏感词
                words.update(self._get_default_sensitive_words())
            
            self.sensitive_words = words
            self._compile_patterns()
            
            # 缓存敏感词（缓存1小时）
            cache.set('sensitive_words_set', words, 3600)
            
            logger.info(f"加载了 {len(words)} 个敏感词")
            
        except Exception as e:
            logger.error(f"加载敏感词失败: {e}")
            # 使用默认敏感词作为fallback
            self.sensitive_words = self._get_default_sensitive_words()
            self._compile_patterns()
    
    def _get_default_sensitive_words(self) -> Set[str]:
        """获取默认敏感词库"""
        return {
            # 政治敏感词
            '法轮功', '法轮大法', '李洪志', '轮子功',
            '天安门事件', '六四事件', '八九民运',
            '藏独', '疆独', '台独', '港独',
            
            # 暴力恐怖
            '恐怖主义', '恐怖分子', '爆炸', '炸弹',
            '杀人', '谋杀', '暗杀', '屠杀',
            
            # 违法犯罪
            '毒品', '贩毒', '吸毒', '海洛因',
            '赌博', '博彩', '六合彩', '赌场',
            '洗钱', '诈骗', '传销', '非法集资',
            
            # 色情低俗
            '色情', '黄色', '裸体', '性交',
            '卖淫', '嫖娼', '援交',
            
            # 迷信邪教
            '邪教', '迷信', '占卜', '算命',
            '风水', '看相', '巫术',
            
            # 其他违规内容
            '翻墙', 'vpn', '代理服务器',
            '反政府', '推翻', '革命',
        }
    
    def _compile_patterns(self):
        """编译正则表达式模式"""
        self.compiled_patterns = []
        
        for word in self.sensitive_words:
            try:
                # 创建不区分大小写的正则模式
                pattern = re.compile(re.escape(word), re.IGNORECASE)
                self.compiled_patterns.append(pattern)
            except Exception as e:
                logger.warning(f"编译敏感词 '{word}' 失败: {e}")
    
    def contains_sensitive_word(self, text: str) -> bool:
        """
        检查文本是否包含敏感词
        
        Args:
            text: 待检查的文本
            
        Returns:
            bool: 是否包含敏感词
        """
        if not text or not isinstance(text, str):
            return False
        
        text_lower = text.lower()
        
        # 快速检查：直接字符串匹配
        for word in self.sensitive_words:
            if word in text_lower:
                return True
        
        # 正则表达式检查（处理变形）
        for pattern in self.compiled_patterns:
            if pattern.search(text):
                return True
        
        return False
    
    def find_sensitive_words(self, text: str) -> List[str]:
        """
        查找文本中的敏感词
        
        Args:
            text: 待检查的文本
            
        Returns:
            List[str]: 找到的敏感词列表
        """
        if not text or not isinstance(text, str):
            return []
        
        found_words = []
        text_lower = text.lower()
        
        # 查找所有匹配的敏感词
        for word in self.sensitive_words:
            if word in text_lower:
                found_words.append(word)
        
        # 使用正则表达式查找变形词
        for pattern in self.compiled_patterns:
            matches = pattern.findall(text)
            found_words.extend(matches)
        
        # 去重并返回
        return list(set(found_words))
    
    def filter_text(self, text: str, replacement: str = '*') -> str:
        """
        过滤文本中的敏感词
        
        Args:
            text: 原始文本
            replacement: 替换字符
            
        Returns:
            str: 过滤后的文本
        """
        if not text or not isinstance(text, str):
            return text
        
        filtered_text = text
        
        # 替换敏感词
        for word in self.sensitive_words:
            if word in filtered_text.lower():
                # 保持原始大小写，用星号替换
                replacement_str = replacement * len(word)
                filtered_text = re.sub(
                    re.escape(word), 
                    replacement_str, 
                    filtered_text, 
                    flags=re.IGNORECASE
                )
        
        return filtered_text
    
    def is_search_allowed(self, query: str) -> Tuple[bool, Optional[str]]:
        """
        检查搜索查询是否被允许
        
        Args:
            query: 搜索查询
            
        Returns:
            Tuple[bool, Optional[str]]: (是否允许, 错误消息)
        """
        if not query:
            return True, None
        
        if self.contains_sensitive_word(query):
            found_words = self.find_sensitive_words(query)
            return False, f"搜索内容包含敏感词，请修改搜索条件"
        
        return True, None
    
    def reload_words(self):
        """重新加载敏感词库"""
        cache.delete('sensitive_words_set')
        self._load_sensitive_words()


# 全局敏感词过滤器实例
_sensitive_filter = None

def get_sensitive_filter() -> SensitiveWordFilter:
    """获取敏感词过滤器实例"""
    global _sensitive_filter
    if _sensitive_filter is None:
        _sensitive_filter = SensitiveWordFilter()
    return _sensitive_filter


def check_search_content(query: str) -> Tuple[bool, Optional[str]]:
    """
    便捷函数：检查搜索内容是否合规
    
    Args:
        query: 搜索查询
        
    Returns:
        Tuple[bool, Optional[str]]: (是否允许, 错误消息)
    """
    filter_instance = get_sensitive_filter()
    return filter_instance.is_search_allowed(query)


def filter_search_results(results: List[dict]) -> List[dict]:
    """
    过滤搜索结果中的敏感内容
    
    Args:
        results: 搜索结果列表
        
    Returns:
        List[dict]: 过滤后的结果
    """
    filter_instance = get_sensitive_filter()
    filtered_results = []
    
    for result in results:
        # 检查标题和摘要是否包含敏感词
        title = result.get('title', '')
        excerpt = result.get('excerpt', '')
        
        if (filter_instance.contains_sensitive_word(title) or 
            filter_instance.contains_sensitive_word(excerpt)):
            # 跳过包含敏感词的结果
            continue
        
        filtered_results.append(result)
    
    return filtered_results
