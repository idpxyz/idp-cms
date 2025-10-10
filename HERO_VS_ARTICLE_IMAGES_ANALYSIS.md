# Hero 图片 vs 文章正文图片：为什么采用不同的处理方式

## 🔍 科学分析

### 核心区别

| 维度 | Hero 封面图 | 文章正文图片 |
|-----|-----------|------------|
| **数据模型** | `ImageField` (结构化) | `RichTextField` (HTML字符串) |
| **存储方式** | 数据库字段直接引用 | 嵌入在 HTML 中 |
| **数量** | 固定（5-10张） | 不固定（0-100+张） |
| **尺寸** | 统一（1200x600） | 各异（用户决定） |
| **来源** | 专门上传的封面图 | 富文本编辑器插入 |
| **可预测性** | 高 | 低 |
| **处理时机** | 上传时即可处理 | 渲染时才知道有哪些图片 |

---

## 📊 技术实现对比

### 1. Hero 图片 - 后台预生成 WebP

**数据模型**：
```python
# apps/news/models/article.py
class ArticlePage(Page):
    cover = models.ForeignKey(
        'media.CustomImage',  # 直接引用 Image 对象
        on_delete=models.SET_NULL,
        related_name='+',
        verbose_name="封面图片"
    )
```

**API 返回**：
```python
# apps/api/rest/hero.py (Line 85)
if article.cover:
    # 🎨 后台生成 WebP rendition
    image_url = article.cover.get_rendition('fill-1200x600|format-webp|webpquality-85').url
```

**工作流程**：
```
1. 编辑上传封面图 (article.cover) 
        ↓
2. Wagtail 存储为 Image 对象
        ↓
3. API 请求时调用 get_rendition()
        ↓
4. Wagtail 图片处理引擎 (Willow)：
   - 如果 rendition 已存在 → 直接返回 URL
   - 如果不存在 → 现场生成并缓存
        ↓
5. 生成 /media/.../xxx.webp (1200x600 @ 85%)
        ↓
6. 返回 WebP URL 给前端
```

**优点**：
- ✅ 图片质量可控（统一规格）
- ✅ 只生成一次，永久缓存
- ✅ 后台有完整的图片元数据
- ✅ 可以预生成多种尺寸

---

### 2. 文章正文图片 - 前端动态处理

**数据模型**：
```python
# apps/news/models/article.py
class ArticlePage(Page):
    body = RichTextField(  # HTML 字符串！
        features=get_advanced_news_editor_features(),
        verbose_name="正文内容"
    )
```

**数据库存储**：
```html
<!-- 存储的是 HTML 字符串 -->
<p>这是一段文字</p>
<img src="/media/images/xxx.jpg" alt="图片" />
<p>另一段文字</p>
<img src="/media/images/yyy.png" width="800" />
```

**API 返回**：
```python
# apps/api/rest/articles_api/core.py (Line 232)
"body": expand_db_html(article.body).replace(
    'http://authoring:8000/api/media/proxy', 
    '/api/media-proxy'
)
```

**前端处理**：
```typescript
// sites/lib/utils/optimizeArticleImages.ts
export function optimizeArticleImages(html: string): string {
  // 🔍 正则匹配所有 <img> 标签
  const imgRegex = /<img([^>]*?)src=["']([^"']+\.(jpg|jpeg|png))["']([^>]*?)>/gi;
  
  // 🔄 动态替换为 <picture> 标签
  return html.replace(imgRegex, (match, beforeSrc, src, ext, afterSrc) => {
    const webpSrc = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    
    return `<picture>
      <source type="image/webp" srcset="${webpSrc}">
      <source type="image/jpeg" srcset="${src}">
      <img src="${src}" loading="lazy" />
    </picture>`;
  });
}
```

**工作流程**：
```
1. 编辑在富文本编辑器插入图片
        ↓
2. 图片上传到 Wagtail
        ↓
3. 编辑器生成 HTML: <img src="/media/..." />
        ↓
4. 保存到数据库 (body 字段，纯 HTML)
        ↓
5. API 返回 HTML 字符串
        ↓
6. 前端接收 HTML
        ↓
7. 前端正则替换 <img> → <picture>
        ↓
8. 浏览器渲染，尝试加载 .webp 版本
        ↓
9. 如果 .webp 存在 → 使用
   如果不存在 → 降级到原图
```

---

## 🤔 为什么不能统一处理？

### 方案A：让后台为正文图片也生成 WebP ❌

**技术挑战**：

1. **时机问题**：
   ```python
   # 何时生成？
   # 选项1：保存文章时？
   def save(self):
       # ❌ 如何解析 HTML 找出所有图片？
       # ❌ 正则解析可能不准确
       # ❌ 可能匹配到外部图片
       images = parse_html_images(self.body)
       for img in images:
           img.get_rendition('format-webp')  # 批量生成
   
   # 选项2：富文本编辑器插入时？
   # ❌ 编辑器是前端组件，无法调用 Python
   # ❌ 需要修改 Wagtail 核心代码
   ```

2. **数据结构限制**：
   ```python
   # Hero: 结构化数据，有明确引用
   article.cover → Image 对象 → 可以调用 .get_rendition()
   
   # 正文: 非结构化 HTML
   article.body → HTML 字符串 → 无法知道有哪些图片对象
   
   # 示例：
   '<img src="/media/images/abc123.jpg" />'
   # ❌ 没有 Image 对象引用，无法调用 get_rendition()
   # ❌ 只有文件路径，不知道对应哪个 Image record
   ```

3. **性能问题**：
   ```python
   # 假设文章有 50 张图片
   def save(self):
       images = extract_images_from_html(self.body)  # 解析 HTML
       for img_url in images:  # 50 次循环
           # ❌ 需要反向查询 Image 对象（慢）
           image_obj = CustomImage.objects.get(file__icontains=img_url)
           # ❌ 生成 rendition（I/O 密集）
           image_obj.get_rendition('format-webp')
       
   # 保存一篇文章可能需要 30-60 秒！
   ```

4. **外部图片问题**：
   ```html
   <!-- 编辑可能插入外部图片 -->
   <img src="https://example.com/external.jpg" />
   
   <!-- ❌ 后台无法为外部图片生成 WebP -->
   <!-- ❌ 无法控制外部资源 -->
   ```

5. **版本管理问题**：
   ```python
   # 文章可能有多个历史版本
   article.save_revision()  # Wagtail 版本系统
   
   # ❌ 每个版本的 body 都不同
   # ❌ 需要为每个版本重新解析和生成
   # ❌ 存储成本指数增长
   ```

---

### 方案B：前端动态处理（当前方案）✅

**优势**：

1. **灵活性**：
   ```typescript
   // ✅ 可以处理任何 HTML 结构
   // ✅ 不依赖后台数据模型
   // ✅ 支持外部图片（提供 fallback）
   optimizeArticleImages(html);
   ```

2. **零后台负担**：
   ```typescript
   // ✅ 不增加保存时间
   // ✅ 不增加数据库查询
   // ✅ 不需要修改 Wagtail 核心
   ```

3. **渐进增强**：
   ```html
   <!-- ✅ WebP 存在 → 使用 -->
   <!-- ✅ WebP 不存在 → 降级到原图 -->
   <!-- ✅ 向后兼容 -->
   <picture>
     <source type="image/webp" srcset="xxx.webp">
     <img src="xxx.jpg" />  <!-- fallback -->
   </picture>
   ```

4. **前端控制**：
   ```typescript
   // ✅ 可以根据设备动态优化
   // ✅ 可以添加 lazy loading
   // ✅ 可以添加响应式尺寸
   ```

---

## 💡 实际案例对比

### Hero 图片优化路径

```
用户上传 → original.jpg (5MB)
           ↓
Wagtail 处理 → fill-1200x600|format-webp|webpquality-85
           ↓
生成文件 → hero.webp (400KB)
           ↓
Next.js 优化 → 375px: 100KB
                768px: 200KB
                1200px: 400KB
           ↓
用户下载 → 移动端: 100KB
          桌面端: 400KB
```

**总优化**: 5MB → 100KB-400KB (**95-98% 减少**)

---

### 文章正文图片优化路径

```
编辑上传 → photo1.jpg (3MB)
           ↓
Wagtail 存储 → /media/images/photo1.jpg (3MB)
           ↓
富文本编辑器 → <img src="/media/.../photo1.jpg" />
           ↓
保存到数据库 → body: "<p>...<img src='...' />...</p>"
           ↓
API 返回 → HTML 字符串
           ↓
前端正则替换 → <picture>
                 <source srcset="photo1.webp" />
                 <img src="photo1.jpg" />
               </picture>
           ↓
浏览器请求 → photo1.webp
           ↓
后台检查 → 文件存在？
           ├─ 是 → 返回 photo1.webp (1MB)
           └─ 否 → 返回 photo1.jpg (3MB)
```

**当前状态**: 
- ✅ 前端已添加 `<picture>` 支持
- ❓ 后台是否生成了 `.webp` 文件？

---

## 🔧 优化建议

### 短期方案：后台批量生成 WebP

即使正文图片在 HTML 中，我们仍然可以批量生成 WebP：

```python
# 新增管理命令：批量生成 WebP
# apps/core/management/commands/generate_article_webp.py

from django.core.management.base import BaseCommand
from apps.media.models import CustomImage
from bs4 import BeautifulSoup
import re

class Command(BaseCommand):
    def handle(self, *args, **options):
        # 1. 获取所有文章中使用的图片
        all_images = CustomImage.objects.all()
        
        for image in all_images:
            try:
                # 2. 为每个图片生成 WebP rendition
                # 保持原尺寸，只转换格式
                image.get_rendition('format-webp|webpquality-85')
                print(f"✅ Generated WebP for {image.file.name}")
            except Exception as e:
                print(f"❌ Failed for {image.file.name}: {e}")
```

**运行**：
```bash
python manage.py generate_article_webp
```

**结果**：
- ✅ 为所有已上传的图片生成 WebP 版本
- ✅ 前端的 `<picture>` 标签可以找到 `.webp` 文件
- ✅ 零前端改动

---

### 中期方案：实时生成 WebP（信号监听）

```python
# apps/core/signals_media.py

from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.media.models import CustomImage

@receiver(post_save, sender=CustomImage)
def auto_generate_webp(sender, instance, created, **kwargs):
    """
    图片上传后自动生成 WebP 版本
    """
    if created:
        try:
            # 后台异步生成 WebP（不阻塞上传）
            from apps.core.tasks import generate_webp_task
            generate_webp_task.delay(instance.id)
        except Exception as e:
            # 失败也不影响图片上传
            print(f"WebP generation failed: {e}")
```

**优点**：
- ✅ 新上传的图片自动生成 WebP
- ✅ 不影响编辑器性能
- ✅ 异步处理，不阻塞上传

---

### 长期方案：CDN 自动转换

使用支持图片转换的 CDN（如 Cloudflare、AWS CloudFront）：

```nginx
# Nginx 配置示例
location /media/ {
    # 检查是否支持 WebP
    if ($http_accept ~* "webp") {
        rewrite ^(.*)\.jpg$ $1.webp last;
        rewrite ^(.*)\.png$ $1.webp last;
    }
}
```

**或者使用 Cloudflare Workers**：
```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  
  // 如果浏览器支持 WebP
  if (request.headers.get('Accept')?.includes('webp')) {
    // 尝试返回 WebP 版本
    const webpUrl = url.pathname.replace(/\.(jpg|png)$/i, '.webp')
    const webpResponse = await fetch(webpUrl)
    
    if (webpResponse.ok) {
      return webpResponse
    }
  }
  
  // 降级到原图
  return fetch(request)
}
```

---

## 📊 性能对比

### 当前状态（假设后台已生成 WebP）

| 指标 | Hero 图片 | 正文图片 |
|-----|----------|---------|
| **后台处理** | ✅ 主动生成 | ❓ 可能未生成 |
| **前端优化** | ✅ Next.js Image | ✅ `<picture>` 标签 |
| **WebP 支持** | ✅ 100% | ❓ 取决于文件是否存在 |
| **响应式尺寸** | ✅ 自动 | ❌ 固定尺寸 |
| **懒加载** | ✅ 自动 | ✅ 手动添加 |

---

## 🎯 结论

**为什么采用不同方式？**

1. **数据结构差异**：
   - Hero: `ImageField` → 结构化 → 后台处理容易
   - 正文: `RichTextField` → HTML 字符串 → 后台处理困难

2. **可预测性差异**：
   - Hero: 固定数量、统一尺寸 → 预生成高效
   - 正文: 数量/尺寸不定 → 动态处理更灵活

3. **技术成本差异**：
   - Hero: 后台处理简单（直接调用 API）
   - 正文: 后台处理复杂（需要解析 HTML、反向查询、批量生成）

4. **实际效果**：
   - Hero: 后台预生成 → 100% 保证 WebP
   - 正文: 前端动态处理 + 后台按需生成 → 逐步优化

---

## 🚀 最佳实践

**推荐策略**：

1. **Hero 图片**: 继续使用后台预生成（当前方案）✅
2. **正文图片**: 
   - ✅ 前端添加 `<picture>` 支持（已完成）
   - ✅ 后台批量生成已上传图片的 WebP（需执行）
   - ✅ 新上传图片自动生成 WebP（信号监听）

**执行步骤**：

```bash
# 1. 批量生成历史图片的 WebP
python manage.py generate_article_webp

# 2. 添加信号监听（自动生成新图片的 WebP）
# 已在 apps/core/signals_media.py

# 3. 验证
# 查看 /media/renditions/ 目录
ls -lh media/renditions/ | grep webp
```

这样，两种图片都能享受 WebP 优化，同时又符合各自的技术特点！

---

**分析完成时间**: 2025-10-10  
**结论**: 采用不同方式是合理的技术选择，但可以通过批量生成 WebP 来统一优化效果。

