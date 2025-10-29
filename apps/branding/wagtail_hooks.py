# apps/branding/wagtail_hooks.py
from wagtail import hooks
from django.templatetags.static import static
from django.utils.html import format_html

@hooks.register("insert_global_admin_css")
def add_admin_css():
    return format_html('<link rel="stylesheet" href="{}">', static("css/cms-admin.css"))

@hooks.register("construct_main_menu")
def hide_help_menu_item(request, menu_items):
    """移除管理界面左侧的帮助菜单项"""
    menu_items[:] = [item for item in menu_items if item.name not in ['help']]

@hooks.register("insert_global_admin_js")
def hide_editor_guide_js():
    """通过JavaScript移除Wagtail editor guide链接"""
    return format_html(
        """
        <script>
        (function() {{
            // 移除所有指向Wagtail文档的链接
            function removeEditorGuide() {{
                // 方法1: 通过href属性移除
                const urlSelectors = [
                    'a[href*="docs.wagtail.org"]',
                    'a[href*="editor-guide"]',
                    'a[href*="wagtail.org"]',
                    '[data-action*="wagtail-editor-guide"]'
                ];
                
                urlSelectors.forEach(function(selector) {{
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(function(el) {{
                        const li = el.closest('li');
                        if (li) {{
                            li.style.display = 'none';
                            li.remove();
                        }} else {{
                            el.style.display = 'none';
                            el.remove();
                        }}
                    }});
                }});
                
                // 方法2: 通过文本内容移除（最强力）
                const allLinks = document.querySelectorAll('a');
                allLinks.forEach(function(link) {{
                    const text = link.textContent.toLowerCase();
                    const href = link.getAttribute('href') || '';
                    
                    // 如果链接文本或href包含 "wagtail"、"editor guide" 等关键词
                    if (text.includes('wagtail') || 
                        text.includes('editor guide') || 
                        text.includes('editor-guide') ||
                        href.includes('wagtail.org') ||
                        href.includes('docs.wagtail')) {{
                        
                        const li = link.closest('li');
                        if (li) {{
                            li.style.display = 'none';
                            setTimeout(function() {{ li.remove(); }}, 10);
                        }} else {{
                            link.style.display = 'none';
                            setTimeout(function() {{ link.remove(); }}, 10);
                        }}
                    }}
                }});
            }}
            
            // 立即执行
            removeEditorGuide();
            
            // DOM加载完成后再次执行
            if (document.readyState === 'loading') {{
                document.addEventListener('DOMContentLoaded', removeEditorGuide);
            }} else {{
                removeEditorGuide();
            }}
            
            // 延迟执行（处理异步加载的内容）
            setTimeout(removeEditorGuide, 100);
            setTimeout(removeEditorGuide, 500);
            setTimeout(removeEditorGuide, 1000);
            
            // 监听动态加载的内容
            const observer = new MutationObserver(function(mutations) {{
                removeEditorGuide();
            }});
            
            observer.observe(document.body, {{
                childList: true,
                subtree: true
            }});
        }})();
        </script>
        """
    )
