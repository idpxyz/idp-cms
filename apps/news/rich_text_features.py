"""
新闻专用富文本编辑器配置

为新闻编辑提供专业的内容编辑功能，包括自定义的新闻块
"""

from wagtail import hooks
from django.utils.html import format_html
from django.utils.safestring import mark_safe


class NewsRichTextFeatures:
    """新闻专用富文本编辑器功能配置"""
    
    # 基础编辑器配置
    BASIC_FEATURES = [
        "bold", "italic", "strikethrough",
        "h2", "h3", "h4",
        "ol", "ul", 
        "link", "image",
        "blockquote", "hr"
    ]
    
    
    # 标准新闻编辑器配置
    STANDARD_FEATURES = [
        # === 基础文本格式 ===
        "bold", "italic", "strikethrough",
        
        # === 标题层级 ===
        "h1", "h2", "h3", "h4", "h5", "h6",
        
        # === 列表结构 ===
        "ol", "ul",
        
        # === 媒体内容 ===
        "image", "embed", "document-link",
        
        # === 新闻专用结构 ===
        "blockquote",  # 引用块 - 重要声明、采访内容
        "hr",          # 分割线 - 章节分隔
        "code",        # 代码块 - 技术新闻
        
        # === 高级格式 ===
        "superscript", "subscript",  # 上标下标 - 科学新闻
        
        # === 自定义样式 ===
        "underline",  # 下划线 - 自定义实现 ✅
        
        # === 链接管理 ===
        "link",
    ]
    
    # 高级新闻编辑器配置
    ADVANCED_FEATURES = STANDARD_FEATURES + [
        # === 表格支持 ===
        # 如需表格请改用 Wagtail TableBlock（非RTE）
        
        # === 自定义新闻块 ===
        # "news-quote",      # 新闻引用块
        # "news-highlight",  # 重点突出块  
        # "news-timeline",   # 时间线块
        # "news-fact-box",   # 事实框
        # "news-related",    # 相关新闻块
    ]
    
    
    # 多媒体增强配置
    MULTIMEDIA_FEATURES = ADVANCED_FEATURES + [
        # === 社交媒体嵌入 ===
        # "twitter",         # Twitter嵌入
        # "youtube",         # YouTube视频
        # "instagram",       # Instagram嵌入
        # "weibo",          # 微博嵌入
    ]

    @classmethod
    def get_features_by_role(cls, role='standard'):
        """根据用户角色返回不同的编辑器功能"""
        
        feature_sets = {
            'basic': cls.BASIC_FEATURES,
            'standard': cls.STANDARD_FEATURES,
            'advanced': cls.ADVANCED_FEATURES,
            'multimedia': cls.MULTIMEDIA_FEATURES,
        }
        
        return feature_sets.get(role, cls.STANDARD_FEATURES)


# 自定义新闻块的样式配置
NEWS_EDITOR_CSS = """
<style>
/* 新闻编辑器增强样式 */

/* 引用块样式 */
.rich-text blockquote {
    border-left: 4px solid #007cba;
    padding: 15px 20px;
    margin: 20px 0;
    background: #f8f9fa;
    font-style: italic;
    position: relative;
}

.rich-text blockquote::before {
    content: "\\201C";
    font-size: 3em;
    color: #007cba;
    position: absolute;
    left: 8px;
    top: -5px;
    font-family: Georgia, serif;
}

/* 代码块样式 */
.rich-text code {
    background: #f4f4f4;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 2px 6px;
    font-family: 'Courier New', monospace;
    font-size: 0.9em;
}

/* 分割线样式 */
.rich-text hr {
    border: none;
    height: 2px;
    background: linear-gradient(to right, transparent, #007cba, transparent);
    margin: 30px 0;
}

/* 标题样式增强 */
.rich-text h1 { 
    color: #2c3e50; 
    border-bottom: 2px solid #007cba; 
    padding-bottom: 5px; 
}

.rich-text h2 { 
    color: #34495e; 
    border-left: 4px solid #007cba; 
    padding-left: 15px; 
}

.rich-text h3 { 
    color: #34495e; 
    border-bottom: 1px solid #bdc3c7; 
    padding-bottom: 3px; 
}

/* 列表样式优化 */
.rich-text ul li {
    margin-bottom: 8px;
    padding-left: 5px;
}

.rich-text ol li {
    margin-bottom: 8px;
    padding-left: 5px;
}

/* 链接样式 */
.rich-text a {
    color: #007cba;
    text-decoration: none;
    border-bottom: 1px dotted #007cba;
}

.rich-text a:hover {
    color: #005a8b;
    border-bottom: 1px solid #005a8b;
}

/* 图片样式 */
.rich-text img {
    max-width: 100%;
    height: auto;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    margin: 15px 0;
}

/* 表格样式 (如果启用) */
.rich-text table {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.rich-text th,
.rich-text td {
    border: 1px solid #ddd;
    padding: 12px;
    text-align: left;
}

.rich-text th {
    background: #f8f9fa;
    font-weight: 600;
    color: #2c3e50;
}

.rich-text tr:nth-child(even) {
    background: #f9f9f9;
}

/* 上标下标样式 */
.rich-text sup,
.rich-text sub {
    font-size: 0.8em;
    line-height: 0;
    position: relative;
    vertical-align: baseline;
}

.rich-text sup {
    top: -0.5em;
}

.rich-text sub {
    bottom: -0.25em;
}

/* 新闻专用块样式 (预留) */
.news-highlight {
    background: #fff3cd;
    border: 1px solid #ffeaa7;
    padding: 15px;
    border-radius: 6px;
    margin: 20px 0;
}

.news-fact-box {
    background: #e3f2fd;
    border-left: 4px solid #2196f3;
    padding: 15px;
    margin: 20px 0;
}

.news-timeline {
    border-left: 3px solid #007cba;
    padding-left: 20px;
    margin: 20px 0;
}
</style>
"""


def get_news_editor_features():
    """获取新闻编辑器的features配置"""
    return NewsRichTextFeatures.STANDARD_FEATURES


def get_advanced_news_editor_features():
    """获取高级新闻编辑器的features配置"""
    return NewsRichTextFeatures.ADVANCED_FEATURES


def get_multimedia_news_editor_features():
    """获取多媒体新闻编辑器的features配置"""
    return NewsRichTextFeatures.MULTIMEDIA_FEATURES


# 在Wagtail hooks中注册样式
@hooks.register('insert_global_admin_css')
def news_editor_css():
    """为新闻编辑器添加样式"""
    return mark_safe(NEWS_EDITOR_CSS)
