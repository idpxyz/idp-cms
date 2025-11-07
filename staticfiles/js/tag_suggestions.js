/**
 * 文章标签自动建议功能 - 简化版
 */

class TagSuggestionWidget {
    constructor() {
        if (window.tagSuggestionActive) return;
        window.tagSuggestionActive = true;
        
        this.apiEndpoint = '/api/suggest-tags/';
        this.isLoading = false;
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        // 查找标签字段
        this.tagField = document.querySelector('#id_tags') || 
                       document.querySelector('input[name="tags"]');
        
        if (!this.tagField) {
            console.log('未找到隐藏的标签字段，页面可能还在加载中');
            return;
        }

        console.log(`找到隐藏标签字段: name="${this.tagField.name}", id="${this.tagField.id}"`);
        
        // 调试：列出所有可能的标签相关输入框
        this.debugTagInputs();

        this.createUI();
        this.bindEvents();
    }
    
    debugTagInputs() {
        console.log('=== 标签字段调试信息 ===');
        console.log('所有包含"tag"的元素:');
        document.querySelectorAll('[data-controller*="tag"], [name*="tag"], [id*="tag"], [class*="tag"]').forEach((el, i) => {
            console.log(`${i}: ${el.tagName} - name="${el.name}", id="${el.id}", class="${el.className}", controller="${el.dataset.controller}"`);
        });
    }

    createUI() {
        // 创建按钮
        this.button = document.createElement('button');
        this.button.type = 'button';
        this.button.className = 'button button-small';
        this.button.innerHTML = '🏷️ 建议标签';
        this.button.style.cssText = 'margin: 8px 0; background: #667eea; color: white; border: none; padding: 6px 12px; border-radius: 4px;';

        // 创建结果容器
        this.container = document.createElement('div');
        this.container.style.cssText = 'display: none; margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9; max-height: 300px; overflow-y: auto;';

        // 插入到页面
        const parent = this.tagField.closest('.field') || this.tagField.parentNode;
        parent.appendChild(this.button);
        parent.appendChild(this.container);
    }

    bindEvents() {
        this.button.addEventListener('click', () => this.suggest());
    }

    async suggest() {
        if (this.isLoading) return;
        
        const title = this.getFieldValue('#id_title, [name="title"]');
        const content = this.getContent();
        
        if (!title && !content) {
            alert('请先输入标题或内容');
            return;
        }

        this.setLoading(true);

        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCSRFToken()
                },
                body: JSON.stringify({ title, content })
            });

            const data = await response.json();
            
            if (data.success && data.suggestions?.length) {
                this.showSuggestions(data.suggestions);
            } else {
                this.showMessage('未找到标签建议');
            }
        } catch (error) {
            this.showMessage('网络错误，请稍后重试');
        } finally {
            this.setLoading(false);
        }
    }

    showSuggestions(suggestions) {
        this.container.innerHTML = suggestions.map((suggestion, index) => 
            `<span class="tag-item" data-tag="${suggestion.text}" style="display: inline-block; margin: 2px; padding: 4px 8px; background: #e1f5fe; border: 1px solid #01579b; border-radius: 12px; cursor: pointer; font-size: 12px;">${suggestion.text}</span>`
        ).join('');
        
        // 为每个标签项添加点击事件
        this.container.querySelectorAll('.tag-item').forEach(item => {
            item.addEventListener('click', () => {
                const tagText = item.getAttribute('data-tag');
                this.addTag(tagText);
                item.style.opacity = '0.5';
                item.style.textDecoration = 'line-through';
            });
        });
        
        this.container.style.display = 'block';
    }

    showMessage(message) {
        this.container.innerHTML = `<p style="color: #666; margin: 0;">${message}</p>`;
        this.container.style.display = 'block';
    }

    addTag(tagText) {
        // 检查是否已存在
        const currentTags = this.tagField.value;
        const existingTags = currentTags ? currentTags.split(',').map(t => t.trim()) : [];
        
        if (existingTags.includes(tagText)) {
            alert(`标签 "${tagText}" 已存在`);
            return;
        }

        console.log(`🚀 开始添加标签到Wagtail FieldPanel: ${tagText}`);
        
        // 直接模拟用户在Wagtail标签输入框中输入
        const success = this.addToWagtailTagField(tagText);
        
        if (success) {
            console.log(`✅ 成功添加到Wagtail标签组件: ${tagText}`);
        } else {
            // 备用方案：直接更新隐藏字段
            const newValue = currentTags ? `${currentTags}, ${tagText}` : tagText;
            this.tagField.value = newValue;
            
            ['input', 'change', 'blur'].forEach(eventType => {
                this.tagField.dispatchEvent(new Event(eventType, { bubbles: true }));
            });
            
            console.log(`⚠️ 使用备用方案添加标签: ${tagText}`);
        }
        
        // 成功提示
        const toast = document.createElement('div');
        toast.textContent = `✅ "${tagText}" 已添加到标签字段`;
        toast.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #4caf50; color: white; padding: 8px 16px; border-radius: 4px; z-index: 9999; font-size: 12px;';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    }

    addToWagtailTagField(tagText) {
        // 更精确地查找Wagtail标签组件的输入框
        let tagInput = null;
        
        // 方法1: 通过data-controller="w-tag"查找（最准确）
        tagInput = document.querySelector('[data-controller="w-tag"] input[type="text"]');
        
        // 方法2: 查找专门的标签字段输入框
        if (!tagInput) {
            // 查找包含标签字段的容器
            const tagLabels = document.querySelectorAll('label');
            for (const label of tagLabels) {
                if (label.textContent && label.textContent.toLowerCase().includes('标签')) {
                    const fieldContainer = label.closest('.field');
                    if (fieldContainer) {
                        tagInput = fieldContainer.querySelector('input[type="text"]:not([name*="title"]):not([id*="title"])');
                        if (tagInput) break;
                    }
                }
            }
        }
        
        // 方法3: 通过字段名查找（排除title）
        if (!tagInput) {
            tagInput = document.querySelector('input[name*="tags"]:not([name*="title"])');
        }
        
        // 方法4: 通过placeholder查找（排除非标签字段）
        if (!tagInput) {
            const inputs = document.querySelectorAll('input[placeholder*="tag" i]');
            for (const input of inputs) {
                if (!input.name.includes('title') && !input.id.includes('title') &&
                    !input.name.includes('publish_at') && !input.name.includes('time') &&
                    !input.name.includes('date') && !input.name.includes('author') &&
                    !input.name.includes('excerpt') && !input.name.includes('slug')) {
                    tagInput = input;
                    break;
                }
            }
        }
        
        if (!tagInput) {
            console.log('未找到Wagtail标签输入框，尝试所有方法均失败');
            console.log('当前页面的所有文本输入框:');
            document.querySelectorAll('input[type="text"]').forEach((input, index) => {
                console.log(`${index}: name="${input.name}", id="${input.id}", placeholder="${input.placeholder}"`);
            });
            return false;
        }
        
        console.log(`找到标签输入框: name="${tagInput.name}", id="${tagInput.id}", placeholder="${tagInput.placeholder}"`);
        
        // 验证是否为正确的标签输入框（不是title等其他字段）
        const excludedFields = ['title', 'publish_at', 'time', 'date', 'author', 'excerpt', 'slug', 'weight', 'language'];
        const isExcludedField = excludedFields.some(field => 
            (tagInput.name && tagInput.name.includes(field)) || 
            (tagInput.id && tagInput.id.includes(field))
        );
        
        if (isExcludedField) {
            console.log(`警告: 检测到选择了非标签字段 (${tagInput.name || tagInput.id})，这是错误的`);
            console.log('正在寻找正确的标签输入框...');
            
            // 尝试更精确的查找
            const correctTagInput = document.querySelector('[data-controller="w-tag"] input[type="text"]:not([name*="title"]):not([name*="publish"]):not([name*="time"]):not([name*="date"])');
            if (correctTagInput) {
                tagInput = correctTagInput;
                console.log(`找到正确的标签输入框: name="${tagInput.name}", id="${tagInput.id}"`);
            } else {
                console.log('无法找到正确的标签输入框，取消操作');
                return false;
            }
        }

        try {
            // 聚焦到输入框
            tagInput.focus();
            
            // 设置输入值
            tagInput.value = tagText;
            
            // 触发输入事件 - 让Wagtail识别输入
            const inputEvent = new Event('input', { bubbles: true, cancelable: true });
            tagInput.dispatchEvent(inputEvent);
            
            // 触发keyup事件 - 某些组件需要这个
            const keyupEvent = new Event('keyup', { bubbles: true, cancelable: true });
            tagInput.dispatchEvent(keyupEvent);
            
            // 延迟触发Enter键 - 确认添加标签
            setTimeout(() => {
                // 模拟Enter键按下
                const enterEvent = new KeyboardEvent('keydown', {
                    key: 'Enter',
                    keyCode: 13,
                    which: 13,
                    bubbles: true,
                    cancelable: true
                });
                tagInput.dispatchEvent(enterEvent);
                
                // 模拟Enter键释放
                const keyupEnter = new KeyboardEvent('keyup', {
                    key: 'Enter',
                    keyCode: 13,
                    which: 13,
                    bubbles: true,
                    cancelable: true
                });
                tagInput.dispatchEvent(keyupEnter);
                
                // 清空输入框（模拟用户添加后的状态）
                setTimeout(() => {
                    if (tagInput.value === tagText) {
                        tagInput.value = '';
                        tagInput.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }, 100);
                
            }, 50);
            
            console.log(`✅ 向Wagtail标签输入框发送: ${tagText}`);
            return true;
            
        } catch (error) {
            console.error('添加到Wagtail标签字段失败:', error);
            return false;
        }
    }


    getContent() {
        const bodyField = document.querySelector('#id_body, [name="body"]');
        if (!bodyField) return '';
        
        try {
            // 尝试解析DraftJS格式
            const draftData = JSON.parse(bodyField.value);
            if (draftData.blocks) {
                return draftData.blocks.map(block => block.text || '').join(' ');
            }
        } catch (e) {
            // 不是JSON，直接返回
        }
        
        return bodyField.value;
    }

    getFieldValue(selector) {
        const field = document.querySelector(selector);
        return field ? field.value.trim() : '';
    }

    getCSRFToken() {
        // 优先从 cookie 读取 csrftoken（Django 标准做法）
        const cookie = document.cookie
            .split('; ')
            .find(row => row.startsWith('csrftoken='));
        if (cookie) {
            return cookie.split('=')[1];
        }
        // 备用：从隐藏字段读取
        const token = document.querySelector('[name=csrfmiddlewaretoken]');
        return token ? token.value : '';
    }

    setLoading(loading) {
        this.isLoading = loading;
        this.button.disabled = loading;
        this.button.innerHTML = loading ? '⏳ 建议中...' : '🏷️ 建议标签';
    }
}

// 初始化
window.addEventListener('load', () => new TagSuggestionWidget());