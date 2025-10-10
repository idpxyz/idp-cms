# Wagtail 图片 Rendition 自动生成机制分析

## 🔍 用户问题

> "我记得后台的逻辑好像是当用户访问的时候如果没有生成小图，会自动生成的，是这样吗？"

## ✅ 简短回答

**是，也不是。** Wagtail 确实有自动生成 rendition 的机制，但在我们当前的架构下**不适用**。

---

## 📊 Wagtail 标准的 Rendition 机制

### 方式1：通过 `get_rendition()` API（会自动生成）

```python
# 在 Python 代码中调用
image = CustomImage.objects.get(id=123)
rendition = image.get_rendition('fill-800x600|format-webp')

# 如果 rendition 不存在：
# ✅ Wagtail 会自动生成
# ✅ 保存到数据库
# ✅ 保存文件到存储

# 如果 rendition 已存在：
# ✅ 直接返回已有的 rendition
```

**这个机制在以下场景工作**：
- ✅ 模板中使用 `{% image %}` 标签
- ✅ Python 代码中调用 `get_rendition()`
- ✅ API 返回数据时（如 Hero API）

**示例 - Hero API**：
```python
# apps/api/rest/hero.py:85
image_url = article.cover.get_rendition('fill-1200x600|format-webp|webpquality-85').url
```
这里会自动生成 rendition！

---

### 方式2：通过 Wagtail 的图片服务 URL（理论上会自动生成）

Wagtail 提供了一个内置的图片服务视图，URL 格式如下：

```
/images/serve/{signature}/{image_id}/{filter_spec}/
```

**示例**：
```
/images/serve/abc123def/456/fill-800x600/filename.jpg
```

**访问此URL时**：
- ✅ Wagtail 会检查 rendition 是否存在
- ✅ 如果不存在，自动生成
- ✅ 返回生成的图片

**但是**，我们的系统**没有使用**这个 URL 格式！

---

## ❌ 我们当前的架构：不会自动生成

### 当前的图片访问流程

```
1. 前端请求
   /api/media-proxy/portal/c2-news/2025/01/images/photo.webp

2. Next.js 代理到后端
   http://authoring:8000/api/media/proxy/portal/c2-news/2025/01/images/photo.webp

3. Django media_proxy 视图
   apps/api/rest/media_proxy.py:15

4. 直接从 MinIO 获取文件
   http://minio:9000/idp-media-prod-public/portal/c2-news/2025/01/images/photo.webp

5. 如果文件不存在
   ❌ 返回 404
   ❌ 不会自动生成任何 rendition
```

### 关键代码分析

**文件**: `apps/api/rest/media_proxy.py`

```python
@require_http_methods(["GET", "HEAD"])
@cache_control(max_age=3600, public=True)
def media_proxy(request, file_path):
    """
    代理访问MinIO中的媒体文件
    """
    # 构建MinIO URL
    minio_url = f"http://minio:9000/idp-media-prod-public/{clean_file_path}"
    
    # 从MinIO获取文件
    response = requests.get(minio_url, stream=True, timeout=10)
    
    if response.status_code == 404:
        raise Http404("媒体文件不存在")  # ❌ 直接404，不生成
    
    # 返回文件
    return HttpResponse(response.content, content_type=content_type)
```

**问题**：
- ❌ 这只是一个简单的文件代理
- ❌ 没有调用 Wagtail 的 Image 模型
- ❌ 没有调用 `get_rendition()`
- ❌ **不会自动生成任何 rendition**

---

## 💡 为什么我们的方案是必需的

### 问题根源

1. **文章正文图片存储为 HTML 字符串**
   ```html
   <img src="/media/portal/c2-news/2025/01/images/photo.jpg" />
   ```

2. **前端期待同名 WebP**
   ```html
   <picture>
     <source srcset="photo.webp" />  <!-- ← 期待这个路径 -->
     <img src="photo.jpg" />
   </picture>
   ```

3. **media_proxy 只是文件代理，不生成 rendition**
   - 请求 `photo.webp`
   - 如果文件不存在 → 404 ❌
   - 不会自动生成

### 解决方案对比

#### 方案A：修改 media_proxy 自动生成（复杂）❌

```python
def media_proxy(request, file_path):
    # 检查是否请求 WebP
    if file_path.endswith('.webp'):
        # 尝试从 MinIO 获取
        response = requests.get(minio_url)
        
        if response.status_code == 404:
            # 查找对应的原图
            original_path = file_path.replace('.webp', '.jpg')
            
            # 查找 Image 对象（❌ 困难！）
            # 如何根据文件路径找到 Image 对象？
            # 需要反向查询数据库，性能差
            
            try:
                image = CustomImage.objects.get(file__icontains=original_path)
                rendition = image.get_rendition('format-webp')
                
                # 复制到同名路径
                # ...
            except:
                raise Http404()
```

**问题**：
- ❌ 需要根据文件路径反向查询 Image 对象（慢）
- ❌ 每次 404 都要查询数据库
- ❌ 可能找不到匹配的 Image 对象
- ❌ 影响性能

#### 方案B：提前生成同名 WebP 副本（我们的方案）✅

```python
# 在图片上传时自动生成
@receiver(post_save, sender=ImageModel)
def generate_essential_renditions_sync(sender, instance, created, **kwargs):
    if created:
        # 生成 WebP rendition
        rendition = instance.get_rendition('format-webp|webpquality-85')
        
        # 复制到同名路径
        webp_path = original_path.replace('.jpg', '.webp')
        storage.save(webp_path, rendition.file)
```

**优点**：
- ✅ 提前生成，访问时直接返回
- ✅ 不需要反向查询数据库
- ✅ 性能好（文件系统查找）
- ✅ 简单可靠

---

## 📋 Wagtail Rendition 机制总结

| 场景 | 是否自动生成？ | 原因 |
|-----|-------------|------|
| **模板中使用 `{% image %}`** | ✅ 是 | 调用 `get_rendition()` |
| **Python 代码调用 `get_rendition()`** | ✅ 是 | 这是 API 的功能 |
| **访问 Wagtail 图片服务 URL** | ✅ 是 | 内置服务视图 |
| **访问 MinIO 原始路径** | ❌ 否 | 只是文件访问 |
| **访问 media_proxy URL** | ❌ 否 | 只是代理，不生成 |
| **文章正文中的图片** | ❌ 否 | HTML 字符串，无法调用 API |

---

## 🎯 结论

### 用户的理解

**部分正确**：
- ✅ Wagtail 确实有自动生成 rendition 的机制
- ✅ 通过 `get_rendition()` API 确实会自动生成

**但在我们的场景下**：
- ❌ 文章正文图片是 HTML 字符串
- ❌ 通过 media_proxy 访问，只是文件代理
- ❌ **不会自动生成 rendition**

### 我们的方案仍然必需

```
✅ 上传时通过信号自动生成同名 WebP
✅ 或通过管理命令批量生成
✅ 保证文件在访问前就已存在
✅ 避免运行时生成的性能开销
```

---

## 🔄 可选的改进方案（未来）

### 方案：在 media_proxy 中添加智能降级

```python
def media_proxy(request, file_path):
    # 尝试获取请求的文件
    response = requests.get(minio_url)
    
    if response.status_code == 404 and file_path.endswith('.webp'):
        # WebP 不存在，尝试降级到原图
        original_path = file_path.replace('.webp', '.jpg')
        original_url = f"http://minio:9000/idp-media-prod-public/{original_path}"
        
        response = requests.get(original_url)
        
        if response.status_code == 200:
            # 返回原图
            return HttpResponse(response.content, content_type='image/jpeg')
    
    # 其他情况正常处理
    ...
```

**优点**：
- ✅ WebP 不存在时自动降级到原图
- ✅ 不影响性能（只是额外的一次文件请求）
- ✅ 提高容错性

**缺点**：
- ❌ 没有真正生成 WebP，只是降级
- ❌ 仍然需要提前生成 WebP 才能获得性能优势

---

## 📚 参考资料

- **Wagtail Images 文档**: https://docs.wagtail.org/en/stable/topics/images.html
- **Rendition API**: https://docs.wagtail.org/en/stable/reference/pages/model_reference.html#wagtail.images.models.AbstractRendition
- **Image Serve View**: https://docs.wagtail.org/en/stable/advanced_topics/images/image_serve_view.html

---

**分析完成时间**: 2025-10-10  
**结论**: 我们的提前生成方案是正确且必需的  
**建议**: 继续执行批量生成计划

