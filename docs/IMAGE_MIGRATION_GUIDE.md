# 图片迁移处理指南

## 📋 图片类型

### 1. **封面图片（Cover Image）**
- 字段：`ArticlePage.cover`
- 来源：旧数据库的 `article.img` 字段
- 存储：Wagtail的 `CustomImage` 模型

### 2. **正文图片（Inline Images）**
- 位置：文章正文HTML中的 `<img>` 标签
- 来源：旧数据库的 `article_info.info` 字段
- 问题：可能仍指向旧服务器URL

---

## ✅ 当前实现（已有功能）

### 封面图片处理 ✅

```python
# apps/news/management/commands/import_old_articles.py

def download_and_create_image(self, image_url, title):
    """下载图片并创建CustomImage"""
    if not image_url or not image_url.startswith('http'):
        return None

    try:
        # 1. 下载图片
        response = requests.get(image_url, timeout=10)
        response.raise_for_status()

        # 2. 获取文件名
        filename = os.path.basename(image_url.split('?')[0])
        
        # 3. 创建CustomImage对象
        image = CustomImage(title=title[:100])
        image.file.save(filename, ContentFile(response.content), save=True)
        
        return image
    except Exception as e:
        # 记录失败但不中断导入
        return None
```

**特点**：
- ✅ 自动下载图片到服务器
- ✅ 保存为Wagtail的CustomImage
- ✅ 失败不中断整体导入
- ✅ 支持跳过图片下载（`--skip-images`）

---

## ⚠️ 需要完善的部分

### 正文图片处理 ⚠️

**当前问题**：
```python
def convert_html_to_richtext(self, html):
    """转换HTML为Wagtail RichText格式"""
    # 当前只清理HTML，没有处理图片URL
    soup = BeautifulSoup(html, 'html.parser')
    for tag in soup(['script', 'style']):
        tag.decompose()
    return str(soup)
```

**问题**：
```html
<!-- 导入后的正文可能包含旧服务器的图片URL -->
<img src="http://old-server.com/uploads/2024/image.jpg">
<!-- 如果旧服务器关闭，图片将无法显示 -->
```

---

## 🎯 完整解决方案

### 方案1：下载所有正文图片（推荐）✨

**优势**：
- ✅ 完全独立，不依赖旧服务器
- ✅ 图片永久保存
- ✅ 加载速度快

**劣势**：
- ❌ 导入时间长
- ❌ 占用存储空间
- ❌ 可能有图片下载失败

**实现步骤**：

```python
def convert_html_to_richtext(self, html):
    """转换HTML并下载图片"""
    if not html:
        return ''
    
    soup = BeautifulSoup(html, 'html.parser')
    
    # 移除script和style
    for tag in soup(['script', 'style']):
        tag.decompose()
    
    # 处理所有img标签
    if not self.options['skip_images']:
        for img_tag in soup.find_all('img'):
            old_url = img_tag.get('src')
            if old_url and old_url.startswith('http'):
                # 下载并替换URL
                new_image = self.download_and_create_image(
                    old_url, 
                    'inline-image'
                )
                if new_image:
                    # 替换为新的图片URL
                    img_tag['src'] = new_image.file.url
                else:
                    # 下载失败，保留原URL或移除
                    pass
    
    return str(soup)
```

### 方案2：URL重写（快速方案）⚡

**优势**：
- ✅ 导入速度快
- ✅ 不占用存储空间
- ✅ 实现简单

**劣势**：
- ❌ 依赖旧服务器
- ❌ 需要配置反向代理

**实现**：
```python
def convert_html_to_richtext(self, html):
    """重写图片URL"""
    if not html:
        return ''
    
    soup = BeautifulSoup(html, 'html.parser')
    
    # 移除script和style
    for tag in soup(['script', 'style']):
        tag.decompose()
    
    # 重写图片URL
    for img_tag in soup.find_all('img'):
        old_url = img_tag.get('src')
        if old_url:
            # 替换为代理URL
            if old_url.startswith('http://old-server.com'):
                img_tag['src'] = old_url.replace(
                    'http://old-server.com',
                    'https://new-server.com/legacy-images'
                )
    
    return str(soup)
```

### 方案3：混合方案（平衡）⚖️

**策略**：
- 封面图片：下载到本地 ✅
- 正文图片：先尝试下载，失败则保留原URL

**实现**：
```python
def download_inline_image(self, image_url):
    """下载正文图片（带重试和降级）"""
    try:
        # 尝试下载
        image = self.download_and_create_image(image_url, 'inline')
        if image:
            return image.file.url
        else:
            return image_url  # 失败则返回原URL
    except:
        return image_url  # 失败则返回原URL
```

---

## 🛠️ 推荐实现

### 增强版图片处理

我建议创建一个增强版的 `convert_html_to_richtext` 函数：

```python
def convert_html_to_richtext(self, html):
    """转换HTML为Wagtail RichText格式并处理图片"""
    if not html:
        return ''

    try:
        soup = BeautifulSoup(html, 'html.parser')
        
        # 移除script和style标签
        for tag in soup(['script', 'style']):
            tag.decompose()

        # 处理图片（如果未跳过图片下载）
        if not self.options.get('skip_images'):
            image_count = 0
            for img_tag in soup.find_all('img'):
                old_src = img_tag.get('src')
                
                # 跳过空src或相对路径
                if not old_src:
                    continue
                
                # 转换相对路径为绝对路径
                if not old_src.startswith('http'):
                    old_src = urljoin(self.options.get('old_site_url', ''), old_src)
                
                # 下载图片
                try:
                    new_image = self.download_and_create_image(
                        old_src,
                        f'inline-image-{image_count}'
                    )
                    
                    if new_image:
                        # 替换为新URL
                        img_tag['src'] = new_image.file.url
                        # 保留alt属性
                        if not img_tag.get('alt'):
                            img_tag['alt'] = f'Image {image_count}'
                        image_count += 1
                    else:
                        # 下载失败，根据选项决定
                        if self.options.get('remove_failed_images'):
                            img_tag.decompose()  # 移除图片
                        else:
                            pass  # 保留原URL
                            
                except Exception as e:
                    self.stdout.write(self.style.WARNING(
                        f'  正文图片处理失败: {old_src[:50]}... - {str(e)}'
                    ))
        
        # 其他清理...
        cleaned_html = str(soup)
        return cleaned_html
        
    except Exception as e:
        self.stdout.write(self.style.WARNING(f'  HTML转换警告: {str(e)}'))
        return html
```

---

## 📊 导入命令参数

### 当前参数
```bash
python manage.py import_old_articles \
  --file data/migration/exports/articles.json \
  --skip-images              # 跳过所有图片下载
  --limit 10                 # 限制导入数量
  --batch-size 100           # 批处理大小
```

### 建议新增参数
```bash
python manage.py import_old_articles \
  --skip-cover-images        # 跳过封面图片
  --skip-inline-images       # 跳过正文图片
  --remove-failed-images     # 移除下载失败的图片
  --old-site-url http://old.com  # 旧站点URL（用于相对路径转换）
  --max-image-size 5242880   # 最大图片大小（5MB）
  --image-timeout 30         # 图片下载超时（秒）
```

---

## 📁 图片存储位置

### Wagtail默认存储
```python
# CustomImage 保存路径
MEDIA_ROOT/images/
  ├── original_images/
  │   └── image_abc123.jpg      # 原始图片
  └── images/                   # 各种尺寸的缩略图
      ├── image_abc123.2e16d0ba.fill-200x200.jpg
      └── image_abc123.2e16d0ba.fill-800x600.jpg
```

### 配置（settings.py）
```python
# 媒体文件配置
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Wagtail图片配置
WAGTAILIMAGES_MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB
```

---

## 🔍 图片统计

### 导入完成后的统计

```python
print(f"图片导入统计：")
print(f"  封面图片下载成功: {self.stats['images_downloaded']}")
print(f"  封面图片下载失败: {self.stats['images_failed']}")
print(f"  正文图片下载成功: {self.stats['inline_images_downloaded']}")
print(f"  正文图片下载失败: {self.stats['inline_images_failed']}")
```

---

## 🚀 实施步骤

### 步骤1：检查旧系统图片情况

```bash
# 1. 查看有多少文章有封面图片
ssh root@121.41.73.49 "docker exec \$(docker ps | grep mysql | awk '{print \$1}') \
  mysql -ujrhb -p'6VSPmPbuFGnZO1%C' jrhb -e \
  'SELECT COUNT(*), COUNT(img) FROM article WHERE img IS NOT NULL AND img != \"\"'"

# 2. 查看图片URL模式
ssh root@121.41.73.49 "docker exec \$(docker ps | grep mysql | awk '{print \$1}') \
  mysql -ujrhb -p'6VSPmPbuFGnZO1%C' jrhb -e \
  'SELECT img FROM article WHERE img IS NOT NULL LIMIT 10'"
```

### 步骤2：测试导入（带图片）

```bash
# 测试10条，下载图片
python manage.py import_old_articles --test --limit=10

# 测试10条，跳过图片
python manage.py import_old_articles --test --limit=10 --skip-images
```

### 步骤3：查看图片是否成功

```python
# Django Shell
from apps.news.models import ArticlePage
from apps.media.models import CustomImage

# 查看导入的文章
articles = ArticlePage.objects.all()[:10]
for a in articles:
    print(f"{a.title[:30]}: cover={a.cover is not None}")

# 查看图片数量
print(f"总图片数: {CustomImage.objects.count()}")
```

### 步骤4：正式导入

```bash
# 分批导入，带图片
python manage.py import_old_articles --batch-size=1000
```

---

## ⚡ 性能优化

### 并发下载图片

```python
from concurrent.futures import ThreadPoolExecutor

def download_images_batch(self, image_urls):
    """批量并发下载图片"""
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {
            executor.submit(
                self.download_and_create_image, url, f'img-{i}'
            ): url for i, url in enumerate(image_urls)
        }
        
        results = {}
        for future in futures:
            url = futures[future]
            try:
                results[url] = future.result()
            except Exception as e:
                results[url] = None
        
        return results
```

---

## 📝 总结

### 推荐方案（根据情况选择）

| 场景 | 方案 | 命令 |
|------|------|------|
| **完全迁移** | 下载所有图片 | `--batch-size=1000` |
| **快速测试** | 跳过图片 | `--skip-images --limit=100` |
| **旧服务器保留** | URL重写 | 自定义实现 |
| **混合方案** | 封面下载，正文保留 | `--skip-inline-images` |

### 下一步

您想要哪种方案？我可以：

1. ✅ **完善当前脚本**：增强正文图片处理
2. ✅ **先测试导入**：看看当前封面图片下载效果
3. ✅ **检查旧系统**：查看图片URL格式和数量
4. ✅ **提供配置建议**：存储、性能等

**您希望如何处理图片？**

