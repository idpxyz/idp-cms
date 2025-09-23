# 🔤 统一字体系统使用指南

## 📋 概述

我们建立了一个统一的字体管理系统，让您可以在 `sites/app/globals.css` 的一个地方修改字体设置，自动影响整个网站。

## 🎯 字体类说明

### 新闻标题类
- `.news-title-large` - 大标题（头条新闻）
  - 当前: `text-xl sm:text-2xl font-bold`
- `.news-title-medium` - 中标题（智能推荐标题）
  - 当前: `text-lg sm:text-xl font-semibold`
- `.news-title-small` - 小标题（列表项标题）
  - 当前: `text-base sm:text-lg font-semibold`

### 内容文字类
- `.news-excerpt` - 新闻摘要
  - 当前: `text-base text-gray-600 leading-relaxed`
- `.news-meta` - 元信息（作者、时间等）
  - 当前: `text-sm text-gray-500 font-medium`
- `.news-meta-small` - 小元信息（交互数据等）
  - 当前: `text-xs sm:text-sm text-gray-500`

### 页面标题类
- `.page-title` - 页面主标题
  - 当前: `text-2xl sm:text-3xl font-bold`
- `.section-title` - 区块标题
  - 当前: `text-xl font-bold`

### 交互元素类
- `.button-text` - 按钮文字
  - 当前: `text-sm font-medium`
- `.link-text` - 链接文字
  - 当前: `text-base font-medium hover:text-red-600`

## 🔧 如何修改字体

### 方式一：修改现有字体类
在 `sites/app/globals.css` 中找到对应的字体类，直接修改：

```css
.news-title-medium {
  @apply text-xl sm:text-2xl font-bold text-gray-900 leading-snug;
  /* 将原来的 lg/xl 改为 xl/2xl */
}
```

### 方式二：全局调整字体大小
修改基础字体大小，影响所有相对单位：

```css
html {
  font-size: 18px; /* 从16px调整到18px，所有rem单位会相应放大 */
}
```

### 方式三：添加新的字体类
如果需要新的字体规格：

```css
.news-title-extra-large {
  @apply text-3xl sm:text-4xl font-black text-gray-900 leading-tight;
}
```

## 📁 已应用的组件

### ModernNewsItem.tsx
- 频道名称: `.news-meta`
- 发布时间: `.news-meta`
- 文章标题: `.news-title-medium`
- 文章摘要: `.news-excerpt`
- 互动数据: `.news-meta-small`

### NewsContent.tsx
- 区块标题: `.section-title`
- 列表标题: `.news-title-small`
- 头条标题: `.news-title-large`
- 头条摘要: `.news-excerpt`
- 元信息: `.news-meta`

## 💡 最佳实践

1. **统一性**: 新组件应优先使用现有字体类
2. **语义化**: 根据内容重要性选择合适的字体类
3. **响应式**: 字体类已包含响应式设计
4. **维护性**: 避免在组件中直接写字体样式

## 🚀 未来扩展

如需支持主题切换或多语言字体，可以在CSS变量中添加：

```css
:root {
  --news-title-size-large: theme('fontSize.xl');
  --news-title-size-medium: theme('fontSize.lg');
}

.theme-large-font {
  --news-title-size-large: theme('fontSize.2xl');
  --news-title-size-medium: theme('fontSize.xl');
}
```

## 📞 使用建议

- **日常调整**: 只需修改 `globals.css` 中的字体类
- **测试**: 修改后检查主要页面的显示效果
- **备份**: 重要修改前备份原有设置
