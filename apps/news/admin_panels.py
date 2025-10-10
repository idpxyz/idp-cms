"""
新闻文章编辑界面优化配置

专为新闻编辑工作流设计的Wagtail管理界面
可以直接替换现有的content_panels配置
"""

from django import forms
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from wagtail.admin.panels import (
    FieldPanel, MultiFieldPanel, TabbedInterface, ObjectList, HelpPanel
)
from wagtail.admin.widgets import AdminDateTimeInput


def get_optimized_content_panels():
    """
    优化后的文章编辑界面配置
    
    设计原则：
    1. 编辑优先 - 突出编辑最常用的功能
    2. 工作流导向 - 按照新闻编辑的实际工作流程
    3. 渐进式暴露 - 核心功能置顶，高级功能可收起
    """
    
    # 主要编辑区域
    content_panels = [
        # 核心内容 - 最重要，始终展开
        MultiFieldPanel([
            HelpPanel(
                content="""
                <div style="background: #e7f3ff; padding: 12px; border-radius: 6px; margin-bottom: 10px;">
                    <strong>📝 第一步：撰写内容</strong><br/>
                    专注于文章的核心内容创作，其他设置可稍后完成
                </div>
                """
            ),
            FieldPanel('title', help_text="📰 清晰准确的标题，建议15-30字"),
            FieldPanel('excerpt', help_text="📋 文章摘要，50-100字，用于列表展示和SEO"),
            FieldPanel('cover', help_text="🖼️ 文章配图，建议16:9比例"),
            FieldPanel('body', help_text="✍️ 文章正文内容"),
        ], 
        heading="📰 文章内容", 
        classname="full"),
        
        # 新闻属性 - 编辑关心的核心属性
        MultiFieldPanel([
            HelpPanel(
                content="""
                <div style="background: #fff3e0; padding: 12px; border-radius: 6px; margin-bottom: 10px;">
                    <strong>⚡ 第二步：设置文章属性</strong><br/>
                    设置文章的基本属性，便于管理和展示
                </div>
                """
            ),
            FieldPanel('author_name', help_text="👤 记者或作者姓名"),
            FieldPanel('has_video', help_text="📹 标记是否包含视频内容"),
            FieldPanel('publish_at', 
                      widget=AdminDateTimeInput,
                      help_text="⏰ 留空立即发布，设置时间可定时发布"),
        ], 
        heading="⚡ 文章属性", 
        classname="collapsed"),
        
        # 分类与标签 - 重要但可以后设置
        MultiFieldPanel([
            HelpPanel(
                content="""
                <div style="background: #f1f8e9; padding: 12px; border-radius: 6px; margin-bottom: 10px;">
                    <strong>🏷️ 第三步：分类归档</strong><br/>
                    为文章添加分类和标签，便于读者发现和检索<br/>
                    💡 <em>提示：使用标签建议功能可以自动生成相关标签</em>
                </div>
                """
            ),
            FieldPanel('channel', help_text="📂 选择文章所属频道"),
            FieldPanel('categories', 
                      widget=forms.CheckboxSelectMultiple,
                      help_text="📝 选择相关栏目（可多选）"),
            FieldPanel('topics', 
                      widget=forms.CheckboxSelectMultiple,
                      help_text="🎯 选择相关专题（可多选）"),
            FieldPanel('tags', help_text="🏷️ 添加相关标签，支持AI智能建议"),
            _get_tag_suggestions_panel(),
        ], 
        heading="🏷️ 分类标签"),
        
        # 发布设置
        MultiFieldPanel([
            FieldPanel('is_featured', help_text="⭐ 是否在首页或频道页置顶显示"),
            FieldPanel('is_hero', help_text="🎬 是否在首页Hero轮播显示（建议选择有吸引力封面图的文章）"),
            FieldPanel('weight', help_text="📊 权重数值，越大越靠前（0为不置顶）"),
        ], 
        heading="📢 发布设置", 
        classname="collapsed"),
    ]
    
    return content_panels


def get_advanced_panels():
    """高级设置面板 - 技术配置"""
    
    return [
        HelpPanel(
            content="""
            <div style="background: #f5f5f5; padding: 12px; border-radius: 6px; margin-bottom: 10px;">
                <strong>⚙️ 高级设置</strong><br/>
                技术配置选项，一般编辑无需修改
            </div>
            """
        ),
        
        MultiFieldPanel([
            FieldPanel('region', help_text="🌍 文章相关地区"),
            FieldPanel('language', help_text="🌐 文章语言"),
        ], heading="🌍 地区语言"),
        
        MultiFieldPanel([
            FieldPanel('source_type', help_text="📍 文章来源类型"),
            FieldPanel('source_site', help_text="🔗 内部来源站点"),
            FieldPanel('external_site', help_text="🌐 外部来源网站"),
            FieldPanel('external_article_url', help_text="🔗 外部文章链接"),
            FieldPanel('allow_aggregate', help_text="🔄 是否允许在其他站点聚合"),
            FieldPanel('canonical_url', help_text="🎯 SEO规范链接"),
        ], heading="🔗 来源设置"),
    ]


def get_editorial_workflow_panels():
    """编辑工作流面板 - 编辑部协作"""
    
    return [
        HelpPanel(
            content="""
            <div style="background: #e8f5e8; padding: 12px; border-radius: 6px; margin-bottom: 10px;">
                <strong>👥 编辑工作流</strong><br/>
                编辑部内部协作和流程管理
            </div>
            """
        ),
        
        MultiFieldPanel([
            HelpPanel("这些字段需要在模型中添加"),
            # 这些字段需要在ArticlePage模型中添加
            # FieldPanel('editor_name', help_text="✏️ 责任编辑"),
            # FieldPanel('editor_notes', help_text="💬 编辑备注（内部使用）"),
        ], heading="✏️ 编辑信息"),
        
        # 可以添加更多工作流相关字段
    ]


def get_promote_panels():
    """推广面板 - 包含 Slug 和搜索引擎可见性设置"""
    from wagtail.models import Page
    
    return [
        HelpPanel(
            content="""
            <div style="background: #e3f2fd; padding: 12px; border-radius: 6px; margin-bottom: 10px;">
                <strong>🔗 URL与推广设置</strong><br/>
                设置文章的访问地址（slug）和搜索引擎展示信息
            </div>
            """
        ),
        
        MultiFieldPanel([
            FieldPanel('slug', help_text="🔗 文章URL标识符（网址中显示的部分）。保存时会自动将中文转换为拼音。"),
            FieldPanel('seo_title', help_text="📑 SEO标题（留空使用文章标题）"),
            FieldPanel('search_description', help_text="📝 搜索引擎描述（留空使用摘要）"),
        ], heading="🔗 URL与搜索"),
        
        MultiFieldPanel([
            FieldPanel('show_in_menus', help_text="📋 是否在导航菜单中显示"),
        ], heading="📋 菜单显示", classname="collapsed"),
    ]


def get_seo_panels():
    """SEO 优化面板 - 专门的 SEO 设置"""
    
    return [
        HelpPanel(
            content="""
            <div style="background: #fff8e1; padding: 12px; border-radius: 6px; margin-bottom: 10px;">
                <strong>🎯 SEO 优化</strong><br/>
                搜索引擎优化和社交媒体分享设置
            </div>
            """
        ),
        
        MultiFieldPanel([
            FieldPanel('meta_keywords', help_text="🔍 SEO关键词，用逗号分隔（留空自动使用文章标签）"),
            FieldPanel('canonical_url', help_text="🔗 规范链接（通常用于聚合文章指向原文）"),
        ], heading="🎯 搜索引擎优化"),
        
        MultiFieldPanel([
            FieldPanel('og_image', help_text="📱 社交媒体分享专用图片（推荐1200x630px，留空使用封面图）"),
            HelpPanel(
                content="""
                <div style="background: #f0f9ff; padding: 10px; border-radius: 4px; margin: 10px 0;">
                    <strong>💡 提示：</strong>社交分享图片最佳规格<br/>
                    • Facebook/LinkedIn: 1200x630px<br/>
                    • Twitter: 1200x600px<br/>
                    • 建议使用横向构图，避免重要内容靠边
                </div>
                """
            ),
        ], heading="📱 社交媒体分享"),
        
        MultiFieldPanel([
            FieldPanel('structured_data', help_text="📊 Schema.org 结构化数据（JSON格式，留空自动生成）"),
            HelpPanel(
                content="""
                <div style="background: #f3f4f6; padding: 10px; border-radius: 4px; margin: 10px 0;">
                    <strong>ℹ️ 说明：</strong><br/>
                    结构化数据帮助搜索引擎更好地理解文章内容。<br/>
                    留空时系统会自动生成符合 NewsArticle 规范的结构化数据。
                </div>
                """
            ),
        ], heading="📊 结构化数据", classname="collapsed"),
    ]


def get_tabbed_interface():
    """完整的标签页界面配置"""
    
    return TabbedInterface([
        ObjectList(get_optimized_content_panels(), heading='📰 内容编辑'),
        ObjectList(get_promote_panels(), heading='🔗 推广'),
        ObjectList(get_seo_panels(), heading='🎯 SEO'),
        ObjectList(get_advanced_panels(), heading='⚙️ 高级设置'),
        # ObjectList(get_editorial_workflow_panels(), heading='👥 编辑流程'),  # 需要模型支持
    ])


# 快速样式增强
EDITORIAL_CSS = """
<style>
/* 优化编辑界面样式 */
.full .field-panel { margin-bottom: 1.5em; }

/* 为不同面板添加颜色标识 */
.collapsed { 
    border-left: 3px solid #e0e0e0; 
    padding-left: 10px;
}

/* 重要提示样式 */
.help-block {
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 4px;
    padding: 8px 12px;
    font-size: 13px;
    color: #495057;
}

/* 字段标签优化 */
.field > label {
    font-weight: 600;
    color: #2c3e50;
}

/* 必填字段标识 */
.required label::after {
    content: " *";
    color: #e74c3c;
}

/* 标签建议按钮样式优化 */
.tag-suggest-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
    border: none !important;
    color: white !important;
    padding: 8px 16px !important;
    border-radius: 6px !important;
    font-weight: 500 !important;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
    transition: all 0.3s ease !important;
}

.tag-suggest-btn:hover {
    transform: translateY(-1px) !important;
    box-shadow: 0 4px 8px rgba(0,0,0,0.15) !important;
}
</style>
"""


def _get_tag_suggestions_panel():
    """
    动态生成标签建议面板
    """
    suggestions_html = '''
    <div class="help-block" style="margin-top: 10px; padding: 12px; background: #f8f9fa; border-left: 4px solid #007cba; border-radius: 4px;">
        <strong style="color: #495057; display: block; margin-bottom: 8px;">🤖 AI标签建议</strong>
        <p style="margin: 0 0 10px 0; font-size: 12px; color: #6c757d;">填写标题和正文后，点击按钮获取AI标签建议</p>
        <div style="margin-bottom: 10px;">
            <button type="button" id="generate-tags-btn" class="button button-small" 
                    style="background: #007cba; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">
                🤖 生成标签建议
            </button>
        </div>
        <div id="tag-suggestions-container">
            <p style="margin: 0; font-size: 12px; color: #999;">点击上方按钮获取AI建议</p>
        </div>
    </div>
    <script>
           document.addEventListener("DOMContentLoaded", function() {
               var generateBtn = document.getElementById("generate-tags-btn");
               var container = document.getElementById("tag-suggestions-container");
               if (generateBtn && container) {
                   generateBtn.addEventListener("click", function() {
                       loadTagSuggestions();
                   });
               }
           });
    
    
    function loadTagSuggestions() {
        var container = document.getElementById("tag-suggestions-container");
        var generateBtn = document.getElementById("generate-tags-btn");
        
        if (!container) return;
        
        // 获取当前标题和正文内容
        var titleField = document.querySelector("input[name=title]");
        var title = titleField ? titleField.value.trim() : "";
        
        // 获取正文内容
        var body = "";
        var bodyField = document.querySelector("[data-contentpath=body] .DraftEditor-editorContainer");
        if (bodyField) {
            body = bodyField.textContent || bodyField.innerText || "";
        }
        
        if (!title && !body) {
            container.innerHTML = '<p style="color: #e74c3c;">请先填写标题或正文内容</p>';
            return;
        }
        
        // 显示加载状态
        container.innerHTML = '<p style="color: #007cba;">正在分析内容并生成标签建议...</p>';
        if (generateBtn) {
            generateBtn.disabled = true;
            generateBtn.textContent = "生成中...";
        }
        
        // 调用AI API
        fetch("/api/suggest-tags/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCsrfToken()
            },
            body: JSON.stringify({
                title: title,
                body: body
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success && data.suggestions && data.suggestions.length > 0) {
                displaySuggestions(data.suggestions);
            } else {
                container.innerHTML = '<p style="color: #f39c12;">暂未找到合适的标签建议，请尝试丰富文章内容</p>';
            }
        })
        .catch(error => {
            container.innerHTML = '<p style="color: #e74c3c;">获取建议失败，请稍后重试</p>';
        })
        .finally(() => {
            if (generateBtn) {
                generateBtn.disabled = false;
                generateBtn.textContent = "🤖 生成标签建议";
            }
        });
    }
    
    function displaySuggestions(suggestions) {
        var container = document.getElementById("tag-suggestions-container");
        if (!container) return;
        
        var html = '<div style="margin-bottom: 8px;"><small style="color: #666;">点击标签添加到标签字段：</small></div>';
        
        suggestions.forEach(function(suggestion) {
            var confidence = Math.round(suggestion.confidence * 100);
            var isNew = suggestion.is_new;
            var buttonStyle = isNew 
                ? "background: #f39c12; color: white;" 
                : "background: #28a745; color: white;";
            var badge = isNew ? "新" : "✓";
            
            html += '<button type="button" class="tag-suggestion-btn" ' +
                    'style="' + buttonStyle + ' border: none; padding: 4px 8px; margin: 2px; ' +
                    'border-radius: 12px; font-size: 11px; cursor: pointer;" ' +
                    'onclick="addSuggestedTag(\\'' + suggestion.text + '\\', this)" ' +
                    'title="置信度: ' + confidence + '%">' +
                    suggestion.text + ' <small>(' + confidence + '% ' + badge + ')</small>' +
                    '</button>';
               });
               
               container.innerHTML = html;
    }
    
    function addSuggestedTag(tagText, buttonElement) {
        
        // 定位原生标签输入框（隐藏）
        var tagInput = document.querySelector("input[name=tags]") || document.querySelector("#id_tags");
        if (!tagInput) {
            alert("未找到标签输入框，请手动输入: " + tagText);
            return;
        }
        
        // 优先：Stimulus w-tag 控制器（支持多控制器值）
        var controllerEl = tagInput.closest("[data-controller]");
        var hasWTag = false;
        if (controllerEl && controllerEl.getAttribute) {
            var dc = controllerEl.getAttribute("data-controller") || "";
            hasWTag = (dc.split(/\s+/).indexOf("w-tag") !== -1);
        }
        if (hasWTag) {
            try {
                if (window.application && window.application.getControllerForElementAndIdentifier) {
                    var ctl = window.application.getControllerForElementAndIdentifier(controllerEl, "w-tag");
                    if (ctl && typeof ctl.addTag === "function") {
                        ctl.addTag(tagText);
                        if (buttonElement) { buttonElement.disabled = true; buttonElement.style.opacity = "0.6"; }
                        return;
                    }
                }
            } catch (e) {
                // w-tag 控制器不可用，尝试回退方案
            }
        }
        
        // 回退1：通过标签字段的DOM结构精确查找
        var tagFieldInput = null;
        
        // 方法1：通过标签字段的隐藏输入找到对应的可见输入框
        if (controllerEl && controllerEl.parentElement) {
            var tagFieldContainer = controllerEl.parentElement;
            tagFieldInput = tagFieldContainer.querySelector('input[role="combobox"]');
            if (!tagFieldInput) {
                tagFieldInput = tagFieldContainer.querySelector('input[type="text"]:not([name*="title"]):not([name*="publish"]):not([name*="author"]):not([name*="excerpt"])');
            }
        }
        
        // 方法2：通过标签标签文本查找
        if (!tagFieldInput) {
            var labels = document.querySelectorAll('label');
            for (var i = 0; i < labels.length; i++) {
                var label = labels[i];
                if (label.textContent && label.textContent.toLowerCase().includes('标签')) {
                    var fieldDiv = label.closest('.field');
                    if (fieldDiv) {
                        tagFieldInput = fieldDiv.querySelector('input[role="combobox"]') || 
                                      fieldDiv.querySelector('input[type="text"]:not([name*="title"]):not([name*="publish"])');
                        if (tagFieldInput) break;
                    }
                }
            }
        }
        
        // 方法3：通过data-controller="w-tag"查找
        if (!tagFieldInput) {
            var wtag = document.querySelector('[data-controller*="w-tag"]');
            if (wtag) {
                tagFieldInput = wtag.querySelector('input[role="combobox"]') || 
                               wtag.querySelector('input[type="text"]');
            }
        }
        
        console.log('精确查找的标签输入框:', tagFieldInput ? 
            ('name=' + tagFieldInput.name + ', id=' + tagFieldInput.id + ', role=' + tagFieldInput.getAttribute('role')) : 
            '未找到');
        
        if (tagFieldInput) {
            var cs = window.getComputedStyle(tagFieldInput);
            if (cs.display !== 'none' && cs.visibility !== 'hidden' && !tagFieldInput.disabled) {
                console.log('使用精确找到的标签输入框');
                tagFieldInput.focus();
                tagFieldInput.value = tagText;
                tagFieldInput.dispatchEvent(new Event('input', {bubbles:true}));
                // 模拟 Enter 接受标签
                var ev = new KeyboardEvent('keydown', {key:'Enter', code:'Enter', keyCode:13, which:13, bubbles:true});
                tagFieldInput.dispatchEvent(ev);
                setTimeout(function(){
                    if (buttonElement) { buttonElement.disabled = true; buttonElement.style.opacity = '0.6'; }
                }, 50);
                return;
            }
        }
        
        // 回退2：直接更新隐藏输入框值（最末手段，确保表单能提交）
        var current = (tagInput.value || '').trim().replace(/,+$/, '');
        var list = current ? current.split(',').map(function(s){return s.trim();}).filter(Boolean) : [];
        if (list.indexOf(tagText) === -1) {
            list.push(tagText);
            tagInput.value = list.join(', ');
            ["input","change"].forEach(function(ev2){ tagInput.dispatchEvent(new Event(ev2, {bubbles:true})); });
            if (buttonElement) { buttonElement.disabled = true; buttonElement.style.opacity = '0.6'; }
        }
    }
    
           function getCsrfToken() {
               var cookies = document.cookie.split(";");
               for (var i = 0; i < cookies.length; i++) {
                   var cookie = cookies[i].trim();
                   if (cookie.indexOf("csrftoken=") === 0) {
                       return cookie.substring("csrftoken=".length);
                   }
               }
               return "";
           }
           
    </script>
    '''
    
    return HelpPanel(mark_safe(suggestions_html))
