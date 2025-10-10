# 文章图片 WebP 优化 - 快速开始指南

## 🎯 目标

让文章正文图片也能使用 WebP 格式，实现与 Hero 图片一致的优化效果。

---

## ✅ 已完成的实施

所有代码已经实施完成，包括：

1. ✅ **自动生成功能** - 新上传图片自动生成 WebP
2. ✅ **批量处理工具** - 处理历史图片
3. ✅ **验证脚本** - 测试功能是否正常
4. ✅ **前端支持** - `<picture>` 标签已配置

---

## 🚀 立即执行（3步）

### 第一步：运行验证脚本

```bash
cd /opt/idp-cms
./test-webp-article-images.sh
```

**检查输出**，确认：
- ✅ 管理命令存在
- ✅ 演习模式正常
- ✅ WebP 生成功能正常

---

### 第二步：小范围测试

```bash
# 测试生成 10 张图片的 WebP
python manage.py generate_article_webp --limit 10
```

**预期输出**：
```
================================================================================
📊 批量生成 WebP 副本
================================================================================
总图片数: 10
...
✅ 批量处理完成
成功生成: 10
跳过: 0
失败: 0
================================================================================
```

**验证结果**：
```bash
# 查看生成的 WebP 文件
find media -type f -name "*.webp" | head -10

# 对比文件大小
ls -lh media/*/images/ | grep -E '\.(jpg|webp)$' | head -10
```

---

### 第三步：全量批量生成

```bash
# 方案 A: 分 collection 逐步生成（推荐）
python manage.py generate_article_webp --collection news
python manage.py generate_article_webp --collection politics
python manage.py generate_article_webp --collection tech
# ... 其他 collections

# 方案 B: 一次性全量生成
python manage.py generate_article_webp

# 方案 C: 限制数量分批（如果图片很多）
python manage.py generate_article_webp --limit 500
# 运行多次直到完成
```

**时间估算**：
- 小型站点（< 1000 张图片）：5-10 分钟
- 中型站点（1000-5000 张）：20-30 分钟
- 大型站点（> 5000 张）：建议分批处理

---

## 🔍 前端验证

### 测试步骤

1. **访问任意文章页面**
   ```
   https://your-site.com/portal/article/some-article
   ```

2. **打开浏览器开发者工具**
   - Chrome/Edge: F12
   - Firefox: F12
   - Safari: ⌘+Option+I

3. **查看 Network 标签**
   - 刷新页面
   - 筛选图片请求（Img）
   - 查找文章正文中的图片

4. **验证 WebP 加载**
   ```
   应该看到：
   ✅ Request: /media/.../photo.webp
   ✅ Status: 200
   ✅ Type: image/webp
   ```

5. **验证降级机制**
   ```
   如果 WebP 不存在：
   ✅ 浏览器会降级请求 photo.jpg
   ✅ 页面仍然正常显示
   ```

### 示例检查

**HTML 源码**（应该看到 `<picture>` 标签）：
```html
<picture>
  <source type="image/webp" srcset="/media/.../photo.webp">
  <source type="image/jpeg" srcset="/media/.../photo.jpg">
  <img src="/media/.../photo.jpg" loading="lazy" />
</picture>
```

**Network 请求**（应该看到 WebP 请求）：
```
Name: photo.webp
Status: 200
Type: webp
Size: 250 KB (vs 850 KB original JPG)
```

---

## 📊 监控和统计

### 查看生成统计

```bash
# 查看 WebP 文件数量
find media -type f -name "*.webp" | wc -l

# 查看 JPG 文件数量
find media -type f -name "*.jpg" -o -name "*.jpeg" | wc -l

# 计算 WebP 覆盖率
echo "WebP 覆盖率: $(($(find media -name "*.webp" | wc -l) * 100 / $(find media -name "*.jpg" -o -name "*.jpeg" | wc -l)))%"
```

### 查看文件大小节省

```bash
# WebP 总大小
du -sh media/*/*/*.webp

# JPG 总大小
du -sh media/*/*/*.jpg

# 对比单个文件
ls -lh media/*/images/some-photo.jpg
ls -lh media/*/images/some-photo.webp
```

---

## 🛠 常用命令

### 查看帮助

```bash
python manage.py generate_article_webp --help
```

### 演习模式（不实际生成）

```bash
python manage.py generate_article_webp --limit 100 --dry-run
```

### 查看处理特定 collection

```bash
# 先列出所有 collections
python manage.py shell
>>> from wagtail.models import Collection
>>> for c in Collection.objects.all():
...     print(f"{c.id}: {c.name}")

# 处理特定 collection
python manage.py generate_article_webp --collection news
```

### 强制重新生成

```bash
# 如果需要重新生成已有的 WebP
python manage.py generate_article_webp --limit 10 --force
```

---

## 🔧 故障排查

### 问题：WebP 没有生成

**检查日志**：
```bash
tail -f logs/django.log | grep -i webp
```

**手动测试**：
```bash
python manage.py shell

from wagtail.images import get_image_model
from apps.core.tasks.media_tasks import generate_original_size_webp_sync

ImageModel = get_image_model()
image = ImageModel.objects.filter(file__iendswith='.jpg').first()

if image:
    print(f"测试图片: {image.title}")
    print(f"原图路径: {image.file.name}")
    
    result = generate_original_size_webp_sync(image)
    
    if result:
        print(f"✅ WebP 生成成功: {result}")
    else:
        print("❌ WebP 生成失败")
else:
    print("❌ 没有找到 JPG 图片")
```

---

### 问题：前端没有加载 WebP

**检查点 1：WebP 文件是否存在**
```bash
# 找一张测试图片
TEST_JPG="media/portal/c2-news/2025/01/images/test.jpg"
TEST_WEBP="${TEST_JPG%.jpg}.webp"

if [ -f "$TEST_WEBP" ]; then
    echo "✅ WebP 文件存在"
    ls -lh "$TEST_WEBP"
else
    echo "❌ WebP 文件不存在"
fi
```

**检查点 2：前端优化是否启用**
```typescript
// 确认 ArticleStaticLayout.tsx 中使用了优化函数
import { optimizeArticleContent } from "@/lib/utils/optimizeArticleImages";

const optimizedContent = optimizeArticleContent(article.content);
```

**检查点 3：浏览器支持**
```javascript
// 在浏览器控制台测试
document.createElement('canvas')
  .toDataURL('image/webp')
  .indexOf('data:image/webp') === 0
  ? console.log('✅ 浏览器支持 WebP')
  : console.log('❌ 浏览器不支持 WebP');
```

---

## 📈 性能监控

### 使用 Chrome DevTools

1. 打开 Performance 面板
2. 录制页面加载
3. 查看图片加载时间
4. 对比 WebP 和 JPG 的加载速度

### 使用 Lighthouse

```bash
# 在 Chrome DevTools 中
1. 打开 Lighthouse 标签
2. 选择 Performance 类别
3. 运行审计
4. 查看 "Properly size images" 指标
```

**预期改进**：
- LCP (Largest Contentful Paint): 提升 30-50%
- 图片总体积: 减少 60-70%
- 页面加载时间: 提升 20-30%

---

## 🎓 工作原理

### 新上传图片

```
用户上传图片
    ↓
保存到 /media/.../photo.jpg
    ↓
触发 post_save 信号
    ↓
generate_original_size_webp_sync() 自动执行
    ↓
生成 Wagtail rendition (WebP)
    ↓
复制到同名路径 /media/.../photo.webp
    ↓
完成！前端可以使用
```

### 前端加载

```
文章页面渲染
    ↓
optimizeArticleContent() 处理 HTML
    ↓
<img src="photo.jpg"> 转换为
<picture>
  <source srcset="photo.webp" />
  <img src="photo.jpg" />
</picture>
    ↓
浏览器优先请求 photo.webp
    ↓
如果成功：使用 WebP ✅
如果失败：降级到 JPG ✅
```

---

## 📝 维护建议

### 定期检查

```bash
# 每月检查一次 WebP 覆盖率
python manage.py shell

from wagtail.images import get_image_model
ImageModel = get_image_model()

total_jpg = ImageModel.objects.filter(file__iendswith='.jpg').count()
# 手动检查有多少生成了 WebP

print(f"总 JPG 图片: {total_jpg}")
print(f"建议运行批量生成补充遗漏的图片")
```

### 补充遗漏

```bash
# 如果发现有图片没有 WebP，重新运行
python manage.py generate_article_webp --skip-existing
```

---

## ✅ 完成检查清单

**代码实施**：
- [x] 信号监听器更新
- [x] WebP 生成函数创建
- [x] 管理命令创建
- [x] 验证脚本创建

**功能测试**（待执行）：
- [ ] 运行验证脚本
- [ ] 小范围测试（10张图片）
- [ ] 检查生成的 WebP 文件
- [ ] 验证文件大小节省

**批量生成**（待执行）：
- [ ] 分 collection 批量生成
- [ ] 或全量批量生成
- [ ] 检查覆盖率

**前端验证**（待测试）：
- [ ] 访问文章页面
- [ ] 查看 Network 请求
- [ ] 确认加载 WebP
- [ ] 验证降级机制

**性能监控**（待部署后）：
- [ ] Lighthouse 审计
- [ ] 图片加载时间对比
- [ ] 流量节省统计

---

## 🎉 成功标志

当你看到以下现象时，说明优化成功：

1. ✅ 新上传图片后，`media` 目录下自动出现同名 `.webp` 文件
2. ✅ 浏览器 Network 中看到请求 `.webp` 文件
3. ✅ WebP 文件大小比原图小 60-70%
4. ✅ 文章页面加载速度明显提升
5. ✅ Lighthouse 性能评分提高

---

**准备好了吗？开始执行吧！** 🚀

```bash
# 第一步：验证
./test-webp-article-images.sh

# 第二步：测试
python manage.py generate_article_webp --limit 10

# 第三步：批量生成
python manage.py generate_article_webp --collection news

# 完成！🎉
```

