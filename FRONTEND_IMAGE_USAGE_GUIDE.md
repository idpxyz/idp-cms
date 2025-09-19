# 前端图片访问使用指南

本指南展示如何在不同场景下访问和使用配置好的图片缩略图规格。

## 🎯 可用的图片规格

### 轮播图 / Hero 图片
- `hero_desktop`: 1200x600 (桌面端轮播图)  
- `hero_mobile`: 800x400 (移动端轮播图)

### 文章卡片缩略图
- `card_large`: 400x300 (大卡片)
- `card_medium`: 300x200 (中等卡片)  
- `card_small`: 200x150 (小卡片)
- `mobile_card`: 320x240 (移动端卡片)

### 文章详情页
- `article_full`: 最大800x600，保持比例
- `article_inline`: 最大600x450，保持比例

### 侧边栏和推荐
- `sidebar_thumb`: 120x90 (侧边栏缩略图)
- `related_thumb`: 150x100 (相关文章缩略图)

### 响应式规格
- `responsive_xs`: 最大320x240 (超小屏)
- `responsive_sm`: 最大480x360 (小屏)
- `responsive_md`: 最大768x576 (中屏)
- `responsive_lg`: 最大1024x768 (大屏)
- `responsive_xl`: 最大1200x900 (超大屏)

### 社交媒体分享
- `og_image`: 1200x630 (Open Graph)
- `twitter_card`: 800x418 (Twitter卡片)

---

## 🔧 使用方法

### 1. Django 模板中使用

```django
{% load image_tags %}

<!-- 基本用法：获取特定规格的URL -->
<img src="{% image_url article.featured_image 'card_large' %}" alt="{{ article.title }}">

<!-- 响应式图片 -->
{% responsive_picture article.featured_image 'img-responsive' %}

<!-- 获取图片数据 -->
{% card_image_data article.featured_image 'large' as card_data %}
<img src="{{ card_data.url }}" 
     width="{{ card_data.width }}" 
     height="{{ card_data.height }}" 
     alt="{{ card_data.alt }}">

<!-- 轮播图 -->
{% hero_image_data hero_image as hero_data %}
<picture>
    <source media="(max-width: 768px)" srcset="{{ hero_data.mobile.url }}">
    <img src="{{ hero_data.desktop.url }}" alt="{{ hero_data.desktop.alt }}">
</picture>

<!-- 社交媒体元数据 -->
{% social_meta_images article.featured_image as social %}
<meta property="og:image" content="{{ social.og_image }}">
<meta name="twitter:image" content="{{ social.twitter_card }}">
```

### 2. API 使用（JSON响应）

```python
# views.py 
from apps.core.image_utils import ImageRenditionSerializer

def article_api(request, article_id):
    article = get_object_or_404(Article, id=article_id)
    
    # 序列化图片及其所有规格
    image_data = ImageRenditionSerializer.serialize_image_with_renditions(
        article.featured_image
    )
    
    return JsonResponse({
        'article': {
            'title': article.title,
            'content': article.content,
            'featured_image': image_data,  # 包含所有规格的URL
        }
    })
```

**API 响应示例：**
```json
{
  "article": {
    "title": "新闻标题",
    "featured_image": {
      "id": 123,
      "title": "图片标题",
      "description": "图片描述",
      "width": 1200,
      "height": 800,
      "original_url": "/media/originals/image.jpg",
      "renditions": {
        "hero_desktop": {
          "url": "/media/renditions/hero_desktop_image.jpg",
          "width": 1200,
          "height": 600
        },
        "card_large": {
          "url": "/media/renditions/card_large_image.jpg", 
          "width": 400,
          "height": 300
        }
        // ... 其他所有规格
      },
      "by_usage": {
        "hero": {
          "hero_desktop": { "url": "...", "width": 1200, "height": 600 },
          "hero_mobile": { "url": "...", "width": 800, "height": 400 }
        },
        "cards": {
          "card_large": { "url": "...", "width": 400, "height": 300 }
          // ... 其他卡片规格
        }
        // ... 其他分组
      }
    }
  }
}
```

### 3. JavaScript/前端框架使用

```javascript
// 获取图片数据
const imageData = await fetch('/api/articles/123').then(res => res.json());
const image = imageData.article.featured_image;

// 根据屏幕尺寸选择合适的规格
function getAppropriateImageUrl(image, usage = 'card') {
    const screenWidth = window.innerWidth;
    
    if (usage === 'hero') {
        return screenWidth <= 768 
            ? image.by_usage.hero.hero_mobile.url
            : image.by_usage.hero.hero_desktop.url;
    }
    
    if (usage === 'card') {
        if (screenWidth <= 480) return image.by_usage.cards.card_small.url;
        if (screenWidth <= 768) return image.by_usage.cards.card_medium.url;
        return image.by_usage.cards.card_large.url;
    }
    
    // 响应式规格
    if (screenWidth <= 320) return image.renditions.responsive_xs.url;
    if (screenWidth <= 480) return image.renditions.responsive_sm.url;
    if (screenWidth <= 768) return image.renditions.responsive_md.url;
    if (screenWidth <= 1024) return image.renditions.responsive_lg.url;
    return image.renditions.responsive_xl.url;
}

// React 组件示例
function ResponsiveImage({ imageData, usage = 'card', className = '' }) {
    const [imageUrl, setImageUrl] = useState('');
    
    useEffect(() => {
        const updateImage = () => {
            const url = getAppropriateImageUrl(imageData, usage);
            setImageUrl(url);
        };
        
        updateImage();
        window.addEventListener('resize', updateImage);
        return () => window.removeEventListener('resize', updateImage);
    }, [imageData, usage]);
    
    return (
        <img 
            src={imageUrl} 
            alt={imageData.description || imageData.title}
            className={className}
            loading="lazy"
        />
    );
}
```

### 4. Next.js 使用示例

```jsx
// components/OptimizedImage.jsx
import Image from 'next/image';

export default function OptimizedImage({ imageData, usage = 'card', ...props }) {
    const getImageSizes = (usage) => {
        switch (usage) {
            case 'hero':
                return '(max-width: 768px) 800px, 1200px';
            case 'card':
                return '(max-width: 480px) 200px, (max-width: 768px) 300px, 400px';
            default:
                return '(max-width: 320px) 320px, (max-width: 480px) 480px, (max-width: 768px) 768px, (max-width: 1024px) 1024px, 1200px';
        }
    };
    
    const primaryImage = usage === 'hero' 
        ? imageData.by_usage.hero.hero_desktop
        : imageData.by_usage.cards.card_large;
    
    return (
        <Image
            src={primaryImage.url}
            alt={imageData.description || imageData.title}
            width={primaryImage.width}
            height={primaryImage.height}
            sizes={getImageSizes(usage)}
            {...props}
        />
    );
}
```

### 5. 直接访问规格URL

如果您知道图片ID和需要的规格，也可以直接构造URL：

```javascript
// 假设有图片ID 123，需要 card_large 规格
const imageId = 123;
const spec = 'card_large';

// 通过API获取
const url = `/api/images/${imageId}/rendition/${spec}/`;

// 或者如果您知道文件路径模式
const renditionUrl = `/media/renditions/card_large_${imageId}.jpg`;
```

## 📱 最佳实践

### 1. 性能优化
```html
<!-- 使用 loading="lazy" -->
<img src="..." loading="lazy" alt="...">

<!-- 使用适当的尺寸 -->
<img src="..." width="400" height="300" alt="...">

<!-- 响应式图片 -->
<picture>
    <source media="(max-width: 480px)" srcset="...responsive_xs.jpg">
    <source media="(max-width: 768px)" srcset="...responsive_sm.jpg">  
    <img src="...responsive_md.jpg" alt="...">
</picture>
```

### 2. SEO 和无障碍
```html
<!-- 始终提供有意义的 alt 文本 -->
<img src="..." alt="具体描述图片内容，而非'图片'或'照片'">

<!-- 社交媒体元数据 -->
<meta property="og:image" content="{{ social.og_image }}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
```

### 3. 错误处理
```javascript
function ImageWithFallback({ imageData, usage = 'card' }) {
    const [error, setError] = useState(false);
    const [currentSrc, setCurrentSrc] = useState('');
    
    useEffect(() => {
        const primaryUrl = getAppropriateImageUrl(imageData, usage);
        setCurrentSrc(primaryUrl);
    }, [imageData, usage]);
    
    const handleError = () => {
        if (!error) {
            // 降级到原始图片
            setCurrentSrc(imageData.original_url);
            setError(true);
        }
    };
    
    return (
        <img 
            src={currentSrc}
            onError={handleError}
            alt={imageData.description || imageData.title}
        />
    );
}
```

这套系统为您的新闻网站提供了完整的图片规格管理方案，确保在不同设备和场景下都能提供最适合的图片尺寸！
