"""
搜索API参数校验工具
防止SQL注入、XSS攻击和恶意参数
"""

import re
import html
from typing import Optional, Dict, Any, List
from django.core.exceptions import ValidationError


class SearchValidator:
    """搜索参数校验器"""
    
    # 危险的SQL关键词
    SQL_INJECTION_PATTERNS = [
        r'\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b',
        r'[;\'"\\]',  # 危险字符
        r'--',        # SQL注释
        r'/\*.*?\*/', # SQL块注释
        r'\bunion\b',
        r'\bor\b.*=.*',
        r'\band\b.*=.*',
    ]
    
    # XSS攻击模式
    XSS_PATTERNS = [
        r'<script[^>]*>',
        r'</script>',
        r'javascript:',
        r'on\w+\s*=',  # onclick, onload等
        r'<iframe[^>]*>',
        r'<object[^>]*>',
        r'<embed[^>]*>',
    ]
    
    # 允许的排序字段
    ALLOWED_SORT_FIELDS = {
        'rel', 'relevance',      # 相关度
        'time', 'date',          # 时间
        'hot', 'popularity',     # 热度
        '-rel', '-relevance',
        '-time', '-date',
        '-hot', '-popularity',
    }
    
    # 允许的时间窗口
    ALLOWED_TIME_WINDOWS = {
        '24h', '7d', '30d', '1h', '3h', '12h',
        '1d', '3d', '7d', '14d', '30d', '90d'
    }
    
    @classmethod
    def validate_search_query(cls, query: str) -> str:
        """
        校验搜索查询字符串
        
        Args:
            query: 用户输入的搜索查询
            
        Returns:
            str: 清理后的查询字符串
            
        Raises:
            ValidationError: 如果查询包含危险内容
        """
        if not query or not isinstance(query, str):
            raise ValidationError("搜索查询不能为空")
        
        # 长度限制
        if len(query) > 200:
            raise ValidationError("搜索查询过长，最多200个字符")
        
        if len(query.strip()) < 1:
            raise ValidationError("搜索查询不能为空")
        
        # 检查SQL注入
        query_lower = query.lower()
        for pattern in cls.SQL_INJECTION_PATTERNS:
            if re.search(pattern, query_lower, re.IGNORECASE):
                raise ValidationError("搜索查询包含非法字符")
        
        # 检查XSS攻击
        for pattern in cls.XSS_PATTERNS:
            if re.search(pattern, query, re.IGNORECASE):
                raise ValidationError("搜索查询包含非法字符")
        
        # HTML转义
        cleaned_query = html.escape(query.strip())
        
        # 移除多余的空格
        cleaned_query = re.sub(r'\s+', ' ', cleaned_query)
        
        return cleaned_query
    
    @classmethod
    def validate_pagination(cls, page: Any, limit: Any) -> tuple[int, int]:
        """
        校验分页参数
        
        Args:
            page: 页码
            limit: 每页数量
            
        Returns:
            tuple[int, int]: (页码, 每页数量)
            
        Raises:
            ValidationError: 如果参数无效
        """
        try:
            page = int(page) if page else 1
            limit = int(limit) if limit else 10
        except (ValueError, TypeError):
            raise ValidationError("分页参数必须是数字")
        
        if page < 1:
            raise ValidationError("页码必须大于0")
        
        if page > 1000:  # 防止深翻页
            raise ValidationError("页码过大，请使用搜索条件缩小范围")
        
        if limit < 1 or limit > 50:
            raise ValidationError("每页数量必须在1-50之间")
        
        return page, limit
    
    @classmethod
    def validate_sort_field(cls, sort: Optional[str]) -> Optional[str]:
        """
        校验排序字段
        
        Args:
            sort: 排序字段
            
        Returns:
            Optional[str]: 有效的排序字段
            
        Raises:
            ValidationError: 如果排序字段无效
        """
        if not sort:
            return None
        
        if not isinstance(sort, str):
            raise ValidationError("排序参数必须是字符串")
        
        sort = sort.strip().lower()
        
        if sort not in cls.ALLOWED_SORT_FIELDS:
            raise ValidationError(f"无效的排序字段: {sort}")
        
        return sort
    
    @classmethod
    def validate_time_window(cls, since: Optional[str]) -> Optional[str]:
        """
        校验时间窗口参数
        
        Args:
            since: 时间窗口
            
        Returns:
            Optional[str]: 有效的时间窗口
            
        Raises:
            ValidationError: 如果时间窗口无效
        """
        if not since:
            return None
        
        if not isinstance(since, str):
            raise ValidationError("时间窗口参数必须是字符串")
        
        since = since.strip().lower()
        
        if since not in cls.ALLOWED_TIME_WINDOWS:
            raise ValidationError(f"无效的时间窗口: {since}")
        
        return since
    
    @classmethod
    def validate_channel(cls, channel: Optional[str]) -> Optional[str]:
        """
        校验频道参数
        
        Args:
            channel: 频道标识
            
        Returns:
            Optional[str]: 清理后的频道标识
            
        Raises:
            ValidationError: 如果频道参数无效
        """
        if not channel:
            return None
        
        if not isinstance(channel, str):
            raise ValidationError("频道参数必须是字符串")
        
        channel = channel.strip()
        
        # 频道名只允许字母、数字、中文、下划线、连字符
        if not re.match(r'^[\w\u4e00-\u9fa5-]+$', channel):
            raise ValidationError("无效的频道标识")
        
        if len(channel) > 50:
            raise ValidationError("频道标识过长")
        
        return channel
    
    @classmethod
    def validate_search_params(cls, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        校验所有搜索参数
        
        Args:
            params: 搜索参数字典
            
        Returns:
            Dict[str, Any]: 校验并清理后的参数
            
        Raises:
            ValidationError: 如果任何参数无效
        """
        validated = {}
        
        # 校验查询字符串
        if 'q' in params:
            validated['q'] = cls.validate_search_query(params['q'])
        
        # 校验分页
        page, limit = cls.validate_pagination(
            params.get('page'), 
            params.get('limit')
        )
        validated['page'] = page
        validated['limit'] = limit
        
        # 校验排序
        sort = cls.validate_sort_field(params.get('sort'))
        if sort:
            validated['sort'] = sort
        
        # 校验时间窗口
        since = cls.validate_time_window(params.get('since'))
        if since:
            validated['since'] = since
        
        # 校验频道
        channel = cls.validate_channel(params.get('channel'))
        if channel:
            validated['channel'] = channel
        
        return validated


def validate_search_request(request_params: Dict[str, Any]) -> Dict[str, Any]:
    """
    便捷函数：校验搜索请求参数
    
    Args:
        request_params: 请求参数字典
        
    Returns:
        Dict[str, Any]: 校验后的参数
        
    Raises:
        ValidationError: 如果参数无效
    """
    return SearchValidator.validate_search_params(request_params)
