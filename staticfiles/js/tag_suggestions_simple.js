/**
 * 简化版标签建议功能
 * 纯事件驱动，无复杂的DOM操作
 */

document.addEventListener('DOMContentLoaded', function() {
    // 为所有标签建议按钮绑定事件
    document.addEventListener('click', function(event) {
        if (event.target.closest('.tag-suggestion-btn')) {
            const btn = event.target.closest('.tag-suggestion-btn');
            
            // 如果已经使用过，忽略
            if (btn.classList.contains('used')) {
                return;
            }
            
            const tagText = btn.dataset.tag;
            if (tagText) {
                addTagToField(tagText, btn);
            }
        }
    });
});

function addTagToField(tagText, buttonElement) {
    // 查找标签输入框
    const tagInput = document.querySelector('input[name="tags"]') || 
                    document.querySelector('#id_tags');
    
    if (!tagInput) {
        alert('未找到标签字段');
        return;
    }
    
    // 获取当前标签
    const currentTags = tagInput.value.trim();
    const existingTags = currentTags ? currentTags.split(',').map(t => t.trim()) : [];
    
    // 检查重复
    if (existingTags.includes(tagText)) {
        alert(`标签 "${tagText}" 已存在`);
        return;
    }
    
    // 添加新标签
    const newValue = currentTags ? `${currentTags}, ${tagText}` : tagText;
    tagInput.value = newValue;
    
    // 触发change事件
    tagInput.dispatchEvent(new Event('change', { bubbles: true }));
    tagInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    // 更新按钮状态
    buttonElement.classList.add('used');
    buttonElement.innerHTML += ' <span style="color: #4caf50;">✓</span>';
    
    // 简单的成功提示
    showToast(`✅ "${tagText}" 已添加`);
}

function showToast(message) {
    // 创建简单的Toast提示
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4caf50;
        color: white;
        padding: 8px 16px;
        border-radius: 4px;
        z-index: 9999;
        font-size: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(toast);
    
    // 2秒后移除
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 2000);
}
