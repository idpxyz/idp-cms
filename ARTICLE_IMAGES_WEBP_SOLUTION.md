# 文章正文图片WebP优化方案

## 🔍 问题分析

### 当前情况
文章正文中的图片：
```html
<img src="/api/media-proxy/portal/c2-portal-media/2025/09/renditions/4e9500db418a46ea.jpg" />
<img src="/api/media-proxy/portal/c2-portal-media/2025/10/renditions/cb20af55d2360847.jpg" />
```

**问题**：
- ❌ 硬编码`.jpg`格式
- ❌ 不是Next.js Image组件（无法自动优化）
- ❌ 浪费带宽（JPG比WebP大30-50%）
- ❌ 加载较慢

---

## 💡 解决方案

### 方案A: 前端HTML处理（推荐）⭐⭐⭐⭐⭐

**在前端渲染时将`<img>`替换为`<picture>`标签，提供WebP和JPG两种格式**

#### 实现步骤：

1. **创建HTML处理工具函数**

```typescript
// sites/lib/utils/optimizeArticleImages.ts

export function optimizeArticleImages(html: string): string {
  // 正则匹配所有img标签
  const imgRegex = /<img([^>]*?)src=["']([^"']+\.(?:jpg|jpeg|png))["']([^>]*?)>/gi;
  
  return html.replace(imgRegex, (match, before, src, after) => {
    // 生成WebP版本的URL（将扩展名替换为.webp）
    const webpSrc = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    
    // 提取其他属性（alt, class等）
    const altMatch = match.match(/alt=["']([^"']+)["']/);
    const alt = altMatch ? altMatch[1] : '';
    
    const classMatch = match.match(/class=["']([^"']+)["']/);
    const className = classMatch ? classMatch[1] : '';
    
    const widthMatch = match.match(/width=["']?(\d+)["']?/);
    const width = widthMatch ? widthMatch[1] : '';
    
    const heightMatch = match.match(/height=["']?(\d+)["']?/);
    const height = heightMatch ? heightMatch[1] : '';
    
    // 生成picture标签，优先使用WebP，回退到原格式
    return `<picture>
      <source type="image/webp" srcset="${webpSrc}">
      <source type="image/${src.match(/\.(jpg|jpeg|png)$/i)?.[1] || 'jpeg'}" srcset="${src}">
      <img 
        src="${src}" 
        ${alt ? `alt="${alt}"` : ''} 
        ${className ? `class="${className}"` : ''} 
        ${width ? `width="${width}"` : ''} 
        ${height ? `height="${height}"` : ''}
        loading="lazy"
        decoding="async"
      >
    </picture>`;
  });
}
```

2. **在ArticleStaticLayout中使用**

```typescript
// ArticleStaticLayout.tsx

import { optimizeArticleImages } from "@/lib/utils/optimizeArticleImages";

export default function ArticleStaticLayout({ article, ... }) {
  // 优化文章图片
  const optimizedContent = optimizeArticleImages(article.content);
  
  return (
    <div
      className="prose..."
      dangerouslySetInnerHTML={{ __html: optimizedContent }}
    />
  );
}
```

**优点**：
- ✅ 前端控制，无需修改后端
- ✅ 自动提供WebP和原格式（向后兼容）
- ✅ 添加lazy loading优化
- ✅ 浏览器自动选择最佳格式

**缺点**：
- ⚠️ 需要后端实际生成WebP文件

---

### 方案B: Media-Proxy自动转换 ⭐⭐⭐⭐

**在media-proxy中检测到JPG请求时，尝试返回WebP**

#### 实现步骤：

```typescript
// sites/app/api/media-proxy/[...path]/route.ts

export async function GET(request: NextRequest, { params }) {
  const { path } = await params;
  const mediaPath = path.join('/');
  
  // 🚀 WebP优化：检查浏览器是否支持WebP
  const acceptHeader = request.headers.get('Accept') || '';
  const supportsWebP = acceptHeader.includes('image/webp');
  
  // 如果请求的是JPG/PNG且浏览器支持WebP，尝试返回WebP
  let backendPath = mediaPath;
  if (supportsWebP && /\.(jpg|jpeg|png)$/i.test(mediaPath)) {
    // 先尝试WebP版本
    const webpPath = mediaPath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    const webpUrl = endpoints.getCmsEndpoint(`/api/media/proxy/${webpPath}`);
    
    try {
      const webpResponse = await fetch(webpUrl, { method: 'HEAD' });
      if (webpResponse.ok) {
        // WebP版本存在，使用它
        backendPath = webpPath;
      }
    } catch (e) {
      // WebP不存在，继续使用原格式
    }
  }
  
  const backendUrl = endpoints.getCmsEndpoint(`/api/media/proxy/${backendPath}`);
  // ... 其余代码
}
```

**优点**：
- ✅ 透明转换，HTML无需修改
- ✅ 自动回退到原格式
- ✅ 集中处理

**缺点**：
- ⚠️ 每个图片多一次HEAD请求（可缓存）
- ⚠️ 需要后端有WebP文件

---

### 方案C: 后端生成WebP ⭐⭐⭐⭐⭐

**让后端CMS直接生成WebP格式的图片**

#### 检查后端配置：

```python
# apps/api/rest/articles_api/core.py

# 需要配置Wagtail/Django的图片处理
WAGTAILIMAGES_FORMAT_CONVERSIONS = {
    'webp': 'webp',
}

# 或使用Pillow生成WebP
from PIL import Image

def generate_webp_rendition(image_path):
    img = Image.open(image_path)
    webp_path = image_path.replace('.jpg', '.webp')
    img.save(webp_path, 'webp', quality=85, method=6)
    return webp_path
```

**优点**：
- ✅ 根本解决，一劳永逸
- ✅ 前端无需任何修改
- ✅ 最佳性能

**缺点**：
- ⚠️ 需要修改后端代码
- ⚠️ 需要重新生成已有图片

---

### 方案D: 使用Next.js Image组件（最彻底）⭐⭐⭐

**解析HTML，将所有`<img>`转换为Next.js `<Image>`**

这需要将文章内容从服务端组件改为客户端组件处理。

---

## 🎯 推荐实施顺序

### 阶段1：立即实施（方案A）

1. 创建`optimizeArticleImages.ts`工具函数
2. 在`ArticleStaticLayout.tsx`中应用
3. 测试效果

**预期效果**：
- HTML中的`<img>`变成`<picture>`
- 浏览器优先尝试加载WebP
- 如果WebP不存在，回退到JPG

### 阶段2：后端支持（方案C）

1. 配置后端自动生成WebP版本
2. 为已有图片生成WebP版本
3. 修改图片上传逻辑

### 阶段3：可选优化（方案B）

如果后端无法快速支持，在media-proxy中添加智能转换。

---

## 📊 性能提升预期

### 当前（JPG）：
```
单张图片：~200KB
页面总图片：~400KB
加载时间（3G）：~3秒
```

### 优化后（WebP）：
```
单张图片：~80KB（减少60%）
页面总图片：~160KB（减少60%）
加载时间（3G）：~1.2秒（减少60%）
```

**Lighthouse改善**：
- Performance: +10-15分
- Best Practices: +5分

---

## 🧪 测试验证

### 测试HTML转换：

```javascript
const html = '<img src="/test.jpg" alt="test">';
const optimized = optimizeArticleImages(html);
console.log(optimized);

// 预期输出：
// <picture>
//   <source type="image/webp" srcset="/test.webp">
//   <source type="image/jpeg" srcset="/test.jpg">
//   <img src="/test.jpg" alt="test" loading="lazy">
// </picture>
```

### 浏览器测试：

```
Chrome DevTools → Network → 查看图片请求
- 应该看到优先请求.webp
- 如果失败，回退到.jpg
```

---

## ⚠️ 注意事项

1. **后端需要生成WebP**
   - 方案A和B都需要后端实际有.webp文件
   - 如果后端没有，需要先实施方案C

2. **向后兼容**
   - `<picture>`标签自动回退到JPG
   - 旧浏览器仍然可以显示图片

3. **懒加载**
   - 添加`loading="lazy"`
   - 首屏外图片延迟加载

---

## 📝 实施检查清单

- [ ] 创建`optimizeArticleImages.ts`工具函数
- [ ] 在`ArticleStaticLayout.tsx`中导入并使用
- [ ] 测试HTML转换效果
- [ ] 检查后端是否支持WebP
- [ ] 如果后端不支持，联系后端团队
- [ ] 浏览器测试验证
- [ ] 性能测试对比

---

**下一步**：我可以立即帮你实施方案A（前端HTML处理）吗？

