# 🔧 CSS格式化KeyError问题修复指南

## 📋 问题描述

在访问 `/admin/` 页面时出现以下错误：

```
KeyError at /admin/
'\n    border-left'
Exception Location: /usr/local/lib/python3.11/site-packages/django/utils/html.py, line 145, in format_html
Raised during: wagtail.admin.views.home.HomeView
```

## 🎯 问题原因

这个错误的根本原因是在Wagtail hooks中使用了 `format_html()` 函数来处理包含CSS的字符串。

### ❌ **错误的做法**
```python
@hooks.register('insert_global_admin_css')
def global_admin_css():
    return format_html('''
        <style>
        .my-class {
            color: red;
        }
        </style>
    ''')
```

### 🐛 **为什么会出错？**

1. **`format_html()` 的作用**：这个函数用于安全地格式化HTML字符串，会解析 `{}` 作为格式化占位符
2. **CSS中的花括号**：CSS规则中包含大量的 `{` 和 `}` 字符
3. **解析冲突**：`format_html()` 试图将CSS中的花括号解析为格式化占位符，但找不到对应的参数，导致KeyError

### 🔍 **具体错误分析**

当 `format_html()` 遇到这样的CSS：
```css
.collapsed {
    border-left: 3px solid #e0e0e0;
}
```

它会尝试将 `{` 和 `}` 解析为格式化占位符，但找不到名为 `border-left` 的参数，从而抛出KeyError。

## ✅ **解决方案**

### 方案1：使用 `mark_safe()` (推荐)

```python
from django.utils.safestring import mark_safe

@hooks.register('insert_global_admin_css')
def global_admin_css():
    return mark_safe('''
        <style>
        .my-class {
            color: red;
        }
        </style>
    ''')
```

### 方案2：转义花括号

```python
@hooks.register('insert_global_admin_css')
def global_admin_css():
    return format_html('''
        <style>
        .my-class {{
            color: red;
        }}
        </style>
    ''')
```

但这种方法容易出错，不推荐。

### 方案3：外部CSS文件

1. 将CSS移到 `static/css/` 目录
2. 使用 `format_html()` 引用CSS文件：

```python
@hooks.register('insert_global_admin_css')
def global_admin_css():
    return format_html('<link rel="stylesheet" href="/static/css/admin-custom.css">')
```

## 🔧 **修复步骤**

### 1. 添加必要的导入
```python
from django.utils.safestring import mark_safe
```

### 2. 替换 `format_html()` 为 `mark_safe()`
```python
# 修复前
return format_html(css_string)

# 修复后  
return mark_safe(css_string)
```

### 3. 如果使用了双花括号转义，改回单花括号
```python
# 修复前（双花括号转义）
.my-class {{
    color: red;
}}

# 修复后（正常CSS）
.my-class {
    color: red;
}
```

## 📁 **本项目中的修复**

### 修复的文件：

1. **`apps/news/rich_text_features.py`**
   ```python
   # 修复前
   return format_html(NEWS_EDITOR_CSS)
   
   # 修复后
   return mark_safe(NEWS_EDITOR_CSS)
   ```

2. **`apps/news/wagtail_hooks.py`**
   ```python
   # 修复前
   return format_html('''<style>/* CSS with {{ }} */</style>''')
   
   # 修复后
   return mark_safe('''<style>/* CSS with { } */</style>''')
   ```

## ⚠️ **注意事项**

### 1. 安全性考虑
- `mark_safe()` 不会对内容进行HTML转义
- 确保CSS内容来源可信，避免XSS攻击
- 如果CSS内容来自用户输入，仍需要进行适当的验证

### 2. 何时使用各种方法

| 方法 | 使用场景 | 优点 | 缺点 |
|------|----------|------|------|
| `mark_safe()` | 静态CSS，内容可信 | 简单直接，性能好 | 不进行HTML转义 |
| `format_html()` | 需要动态插入变量的HTML | 安全，防XSS | 不适合处理CSS |
| 外部CSS文件 | 大量样式，复杂布局 | 缓存友好，易维护 | 需要额外文件管理 |

### 3. 最佳实践

1. **CSS样式**使用 `mark_safe()`
2. **动态HTML内容**使用 `format_html()`
3. **大型样式表**使用外部CSS文件
4. **混合内容**分别处理不同部分

## ✅ **验证修复**

修复完成后，可以通过以下方式验证：

```bash
# 1. 检查Django配置
python manage.py check

# 2. 测试admin页面访问
curl -I http://localhost:8000/admin/

# 3. 检查应用日志
docker compose logs authoring --tail=20
```

如果没有出现KeyError，且admin页面可以正常重定向到登录页面，说明修复成功。

## 🎉 **总结**

这个问题的关键是理解 `format_html()` 和 `mark_safe()` 的不同用途：

- **`format_html()`**：用于安全地格式化包含变量的HTML
- **`mark_safe()`**：用于标记已知安全的HTML字符串

对于包含CSS的静态内容，应该使用 `mark_safe()` 而不是 `format_html()`。
