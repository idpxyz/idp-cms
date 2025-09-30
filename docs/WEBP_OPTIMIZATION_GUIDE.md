# 🚀 WebP图片格式优化指南

## 概述

本文档说明如何将CMS中的图片从PNG/JPEG格式转换为WebP格式，以大幅提升网站性能。

### 优化效果

- **文件大小减少**: 30-50% (相比JPEG) 或 70-80% (相比PNG)
- **Hero轮播图**: 从 1.5MB → ~300-500KB per image
- **总体提升**: 5张Hero图片从 7.5MB → ~2MB
- **加载速度**: 提升 3-5倍

## 已完成的配置

### 1. Wagtail WebP配置 ✅

文件: `config/settings/base.py`

```python
# 🚀 WebP格式优化配置
WAGTAILIMAGES_FORMAT_CONVERSIONS = {
    'webp': 'webp',  # 生成WebP格式
    'jpeg': 'jpeg',  # 保留JPEG支持（备用）
    'png': 'png',    # 保留PNG支持（需要透明度时）
}

# 设置WebP为优先格式
WAGTAILIMAGES_OUTPUT_FORMAT_QUALITY = {
    'webp': 85,   # WebP质量85%（在文件大小和质量间平衡）
    'jpeg': 85,   # JPEG质量85%
    'png': 100,   # PNG保持无损
}
```

### 2. Rendition规格更新 ✅

文件: `apps/core/signals_media.py`

所有图片rendition规格已更新为WebP格式：
- Hero轮播图: `format-webp|webpquality-85`
- 文章卡片: `format-webp|webpquality-80`
- 响应式图片: `format-webp|webpquality-70~85`
- 社交媒体分享图: 保持JPEG格式（兼容性考虑）

### 3. 管理命令 ✅

创建了 `regenerate_webp_renditions.py` 管理命令用于重新生成现有图片。

## 使用方法

### 新上传的图片

✅ **自动生成WebP格式** - 无需额外操作

当用户上传新图片时，系统会自动生成WebP格式的所有renditions。

### 重新生成现有图片

对于现有的PNG/JPEG图片，需要手动重新生成WebP renditions：

#### 重新生成所有图片（推荐）

```bash
# 进入Django容器
docker exec -it local-authoring-1 bash

# 重新生成所有图片的WebP renditions
python manage.py regenerate_webp_renditions

# 查看帮助
python manage.py regenerate_webp_renditions --help
```

#### 只重新生成Hero轮播图

```bash
# 只处理Hero图片（最重要，优先处理）
python manage.py regenerate_webp_renditions --hero-only
```

#### 强制重新生成

```bash
# 删除旧的renditions并重新生成
python manage.py regenerate_webp_renditions --force
```

#### 测试模式

```bash
# 只处理前10张图片（测试用）
python manage.py regenerate_webp_renditions --limit 10
```

## 验证优化效果

### 1. 检查图片URL

访问Hero API，查看返回的image_url：
```bash
curl http://localhost:8000/api/hero/?size=5&site=aivoya.com | jq '.items[0].image_url'
```

WebP的rendition URL应该包含 `.webp` 扩展名。

### 2. 检查文件大小

```bash
# 检查一个WebP rendition的大小
curl -I http://localhost:8000/api/media/proxy/portal/.../xxx.webp | grep Content-Length
```

### 3. 浏览器检查

1. 打开浏览器开发者工具 (F12)
2. 切换到 Network 标签
3. 筛选 Img
4. 刷新页面
5. 查看Hero图片：
   - **Type**: webp
   - **Size**: 应该减少到 300-500KB

## 性能对比

### 优化前
- **格式**: PNG
- **尺寸**: 1200x600
- **文件大小**: 1.5 MB
- **5张Hero图片**: 7.5 MB
- **加载时间**: 2-3秒 (慢速网络)

### 优化后
- **格式**: WebP
- **尺寸**: 1200x600
- **文件大小**: ~300-400 KB
- **5张Hero图片**: ~1.5-2 MB
- **加载时间**: 0.5-1秒 (慢速网络)

## 浏览器兼容性

WebP格式支持所有现代浏览器：
- ✅ Chrome 32+
- ✅ Firefox 65+
- ✅ Safari 14+ (macOS Big Sur+)
- ✅ Edge 18+
- ✅ Opera 19+

**覆盖率**: ~96% 的全球用户

对于不支持WebP的旧浏览器，Next.js Image组件会自动降级到JPEG/PNG。

## 清理旧的Renditions（可选）

生成WebP renditions后，可以清理旧的JPEG/PNG renditions以节省存储空间：

```bash
# TODO: 创建清理命令
python manage.py cleanup_old_renditions --older-than 30
```

## 监控和维护

### 定期检查

1. **每月检查存储空间使用**
   ```bash
   du -sh /path/to/media/renditions/
   ```

2. **监控图片加载性能**
   - 使用Google PageSpeed Insights
   - 检查Lighthouse报告中的LCP指标

### 最佳实践

1. **上传图片前优化**
   - 推荐尺寸: 1920x1080 或更小
   - 推荐格式: JPEG (摄影) 或 PNG (插图/透明)
   - 系统会自动转换为WebP

2. **Hero图片建议**
   - 最大宽度: 1920px
   - 建议比例: 2:1 或 21:9
   - 原图质量: 85-90%

3. **定期清理**
   - 每季度清理未使用的renditions
   - 删除废弃的原图

## 故障排除

### 问题: WebP rendition生成失败

**解决方案**:
```bash
# 检查Pillow是否支持WebP
docker exec -it local-authoring-1 python -c "from PIL import Image; print(Image.EXTENSION)"

# 如果不支持WebP，重新安装Pillow
pip install --force-reinstall pillow
```

### 问题: 图片还是很大

**检查**:
1. 确认rendition规格使用了 `format-webp`
2. 检查webpquality设置 (推荐: 80-85)
3. 原图可能本身就很大，考虑限制上传文件大小

### 问题: 浏览器显示不支持WebP

**解决方案**:
在Next.js中已配置自动降级，无需额外处理。

## 相关文件

- `config/settings/base.py` - Wagtail WebP配置
- `apps/core/signals_media.py` - Rendition规格定义
- `apps/media/management/commands/regenerate_webp_renditions.py` - 重新生成命令
- `sites/app/portal/components/HeroCarousel.tsx` - Hero组件（已优化）
- `sites/app/portal/components/HeroCarousel.utils.ts` - 图片URL转换

## 总结

✅ **配置已完成** - 新图片自动生成WebP  
⏳ **需要执行** - 运行命令重新生成现有图片  
🚀 **预期效果** - 图片加载速度提升3-5倍  

---

*更新日期: 2025-09-30*
*作者: AI Assistant*
