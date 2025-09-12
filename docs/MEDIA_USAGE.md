# 媒体文件访问指南

## 概述

本系统提供了完整的媒体文件管理解决方案，支持多站点、多尺寸图片访问，以及私有文件的安全访问。

## 图片访问方式

### 1. 模板中使用

#### 基本用法

```html
<!-- 加载模板标签 -->
{% load media_tags %}

<!-- 显示原始图片 -->
<img src="{{ image.file.url }}" alt="{{ image.title }}" />

<!-- 显示指定尺寸的变体 -->
<img src="{% media_image_url image 'max-800x600' %}" alt="{{ image.title }}" />

<!-- 显示缩略图 -->
<img src="{% media_thumbnail_url image %}" alt="{{ image.title }}" />
```

#### 响应式图片

```html
<!-- 使用响应式图片标签 -->
{% media_responsive_image image 'max-800x600' '图片描述' 'img-fluid' %}

<!-- 使用新闻图片标签（推荐） -->
{% news_image image 'large' '新闻图片' 'img-fluid' %}
```

#### 多种尺寸支持

```html
<!-- 生成srcset -->
{% media_image_srcset image '{"max-400x300": "400w", "max-800x600": "800w",
"max-1200x900": "1200w"}' as srcset %}
<img
  src="{% media_image_url image 'max-800x600' %}"
  srcset="{{ srcset }}"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  alt="{{ image.title }}"
/>
```

### 2. Python 代码中使用

```python
from apps.media.utils import get_image_url, get_news_image_urls, get_thumbnail_url

# 获取原始图片URL
original_url = get_image_url(image)

# 获取指定尺寸的变体URL
medium_url = get_image_url(image, 'max-800x600')

# 获取缩略图URL
thumbnail_url = get_thumbnail_url(image, 'fill-300x200')

# 获取所有尺寸的URL
all_urls = get_news_image_urls(image)
# 返回: {
#     'original': '...',
#     'thumbnail': '...',
#     'medium': '...',
#     'large': '...',
#     'hero': '...'
# }
```

### 3. API 访问

#### 获取图片信息

```javascript
// GET /api/media/image/123/
fetch("/api/media/image/123/")
  .then((response) => response.json())
  .then((data) => {
    console.log("图片信息:", data);
    console.log("缩略图:", data.renditions.thumbnail);
    console.log("中等尺寸:", data.renditions.medium);
  });
```

#### 获取特定变体

```javascript
// GET /api/media/image/123/rendition/max-800x600/
fetch("/api/media/image/123/rendition/max-800x600/")
  .then((response) => response.json())
  .then((data) => {
    console.log("变体URL:", data.url);
    console.log("尺寸:", data.width, "x", data.height);
  });
```

## 图片尺寸规格

### 预定义尺寸

- **thumbnail**: `fill-300x200` - 缩略图
- **medium**: `max-800x600` - 中等尺寸
- **large**: `max-1200x900` - 大尺寸
- **hero**: `fill-1920x1080` - 英雄图片

### 自定义尺寸

```python
# 最大尺寸（保持比例）
'max-800x600'  # 最大宽度800px，最大高度600px

# 填充尺寸（裁剪到指定尺寸）
'fill-300x200'  # 填充到300x200px

# 固定宽度
'width-500'     # 宽度500px，高度自适应

# 固定高度
'height-300'    # 高度300px，宽度自适应
```

## 存储结构

### 文件路径格式

```
idp-media-prod-public/
└── portal/                    # 站点标识
    └── default/               # 集合名称
        └── 2025/              # 年份
            └── 09/            # 月份
                ├── originals/ # 原始文件
                │   └── hash.png
                └── renditions/ # 变体文件
                    └── hash.max-800x600.png
```

### 访问 URL

- **原始文件**: `http://localhost:9002/idp-media-prod-public/portal/default/2025/09/originals/hash.png`
- **变体文件**: `http://localhost:9002/idp-media-prod-public/portal/default/2025/09/renditions/hash.max-800x600.png`

## 私有文件访问

### 获取预签名 URL

```javascript
// 需要登录
fetch("/api/media/presign-download/private-file-key/", {
  headers: {
    Authorization: "Bearer your-token",
  },
})
  .then((response) => response.json())
  .then((data) => {
    // 使用预签名URL下载文件
    window.open(data.url);
  });
```

## 性能优化

### 1. 懒加载

```html
<!-- 使用懒加载 -->
{% news_image image 'large' '图片描述' 'img-fluid' %}
<!-- 默认启用懒加载 -->
```

### 2. 缓存策略

- 原始文件：长期缓存
- 变体文件：中期缓存（90 天）
- 临时文件：短期缓存（7 天）

### 3. CDN 配置

```python
# 生产环境配置
AWS_S3_CUSTOM_DOMAIN = 'media.yourdomain.com'
```

## 最佳实践

### 1. 图片选择

- 新闻列表：使用 `thumbnail` 或 `medium`
- 新闻详情：使用 `large` 或 `original`
- 首页轮播：使用 `hero`

### 2. 响应式设计

```html
<picture>
  <source
    media="(max-width: 768px)"
    srcset="{% media_image_url image 'max-400x300' %}"
  />
  <source
    media="(max-width: 1200px)"
    srcset="{% media_image_url image 'max-800x600' %}"
  />
  <img
    src="{% media_image_url image 'max-1200x900' %}"
    alt="{{ image.title }}"
  />
</picture>
```

### 3. 错误处理

```html
{% if image %} {% news_image image 'medium' '图片描述' %} {% else %}
<div class="placeholder">暂无图片</div>
{% endif %}
```

## 故障排除

### 常见问题

1. **图片不显示**

   - 检查 MinIO 服务是否运行
   - 验证文件路径是否正确
   - 确认权限设置

2. **变体不生成**

   - 检查图片格式是否支持
   - 验证过滤器规格是否正确
   - 查看 Celery 任务是否正常

3. **访问速度慢**
   - 启用 CDN
   - 使用适当的图片尺寸
   - 启用懒加载

### 调试命令

```bash
# 检查存储状态
docker compose exec authoring python manage.py monitor_storage

# 查看图片信息
docker compose exec authoring python manage.py shell -c "
from wagtail.images.models import Image
image = Image.objects.first()
print(f'图片: {image.title}')
print(f'原始URL: {image.file.url}')
rendition = image.get_rendition('max-800x600')
print(f'变体URL: {rendition.url}')
"
```
