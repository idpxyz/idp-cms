# 图片迁移优化方案（本地文件 + MinIO）

## 🎯 方案概述

由于旧系统的图片文件已经存在于同一台服务器上，我们采用**本地文件读取**的方式，直接从文件系统读取图片，然后通过Django的存储系统自动上传到MinIO。

### 优势

- ⚡ **极快的速度**：本地文件读取比HTTP下载快100倍+
- 💾 **MinIO存储**：自动使用新系统的存储方式（S3兼容）
- 🔄 **自动降级**：本地文件不存在时自动降级为HTTP下载
- ✅ **完全迁移**：图片永久存储在MinIO中

---

## 📁 文件路径

### 旧系统（同一台服务器）
```
服务器: 121.40.167.71
路径: /data/webapp/www/file.hubeitoday.com.cn/public
结构:
  ├── uploads/
  │   ├── allimg/
  │   │   ├── 151113/
  │   │   │   └── 2000415537-0.jpg
  │   │   └── ...
  │   └── ...
  ├── upload/
  │   └── image/
  └── img/
```

### 新系统（MinIO）
```
存储: MinIO (172.28.0.50:9000)
Bucket: media
Django配置: storages[s3] (自动处理)

图片上传流程:
1. 从本地文件读取
2. 通过 CustomImage.file.save() 保存
3. Django自动上传到MinIO
4. 返回 MinIO URL
```

---

## 🚀 使用方法

### 方式1：本地文件模式（推荐，默认）

```bash
# 从本地文件读取，自动上传到MinIO
ssh root@121.40.167.71 "cd /opt/idp-cms && \
  docker compose -f infra/production/docker-compose-ha-node1.yml exec authoring \
  python manage.py import_old_articles \
    --test \
    --limit=10"
```

**默认配置**：
- `--old-media-path`: `/data/webapp/www/file.hubeitoday.com.cn/public`
- 自动读取本地文件
- 本地文件不存在时自动降级为HTTP下载

### 方式2：强制HTTP下载模式

```bash
# 忽略本地文件，强制HTTP下载
ssh root@121.40.167.71 "cd /opt/idp-cms && \
  docker compose -f infra/production/docker-compose-ha-node1.yml exec authoring \
  python manage.py import_old_articles \
    --force-download \
    --old-site-url http://www.hubeitoday.com.cn"
```

### 方式3：自定义本地路径

```bash
# 使用自定义的本地文件路径
python manage.py import_old_articles \
  --old-media-path /path/to/old/media
```

---

## 📊 执行流程

### 图片处理逻辑

```python
对于每个图片URL（如 /uploads/allimg/151113/2000415537-0.jpg）:

1. 检查模式
   ├─ 如果 --force-download: 跳到步骤3
   └─ 否则: 继续步骤2

2. 尝试本地文件
   ├─ 拼接路径: /data/webapp/www/file.hubeitoday.com.cn/public/uploads/...
   ├─ 检查文件是否存在
   │   ├─ 存在: 读取文件内容 → 步骤4
   │   └─ 不存在: 继续步骤3

3. HTTP下载（降级）
   ├─ 拼接URL: http://www.hubeitoday.com.cn/uploads/...
   ├─ 下载图片
   └─ 获取图片内容 → 步骤4

4. 创建CustomImage
   ├─ image = CustomImage(title=...)
   ├─ image.file.save(filename, ContentFile(content))  # 自动上传到MinIO
   └─ 返回image对象
```

### 统计信息

导入完成后会显示详细统计：

```
================================================================================
📊 导入完成！
================================================================================

📄 文章统计:
  总计:         100
  ✓ 成功:      95
  ⊘ 跳过:      3
  ✗ 失败:      2

📸 图片统计:
  封面图片:
    ✓ 成功:    88
    ✗ 失败:    7
    成功率:    92.6%
  正文图片:
    ✓ 成功:    245
    ✗ 失败:    15
    成功率:    94.2%
  图片来源:
    📁 本地文件: 315 (94.6%)    ← 大部分从本地读取
    🌐 HTTP下载: 18 (5.4%)      ← 仅少量降级下载
  💾 存储到MinIO: 333 个       ← 全部存储在MinIO

⏱️  时间统计:
  总用时:       45.2 秒 (0.8 分钟)  ← 比HTTP快10倍+
  平均速度:     0.5 秒/篇

================================================================================
```

---

## 🔧 技术细节

### Django存储配置

系统已配置使用MinIO作为存储后端：

```python
# config/settings/base.py

if EnvValidator.get_str("MINIO_ENDPOINT"):
    # MinIO配置
    AWS_ACCESS_KEY_ID = EnvValidator.get_str("MINIO_ACCESS_KEY")
    AWS_SECRET_ACCESS_KEY = EnvValidator.get_str("MINIO_SECRET_KEY")
    AWS_STORAGE_BUCKET_NAME = "media"
    AWS_S3_ENDPOINT_URL = "http://172.28.0.50:9000"
    
    # 使用 storages 库
    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3.S3Storage",
        },
        "staticfiles": {
            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
        },
    }
```

### CustomImage保存过程

```python
# 当调用 image.file.save() 时:

1. ContentFile(image_content)
   └─ 创建内存中的文件对象

2. image.file.save(filename, content_file)
   ├─ Django检测到使用S3Storage
   ├─ 调用boto3上传到MinIO
   ├─ MinIO返回文件URL
   └─ 保存到数据库: file字段存储MinIO路径

3. 结果
   └─ image.file.url → http://minio-domain/media/images/xxx.jpg
```

### 文件路径处理

```python
# 示例：处理相对路径

数据库中的路径: "/uploads/allimg/151113/2000415537-0.jpg"

本地文件模式:
  相对路径: "uploads/allimg/151113/2000415537-0.jpg"  (去掉开头/)
  完整路径: /data/webapp/www/file.hubeitoday.com.cn/public/uploads/allimg/151113/2000415537-0.jpg
  检查文件: os.path.exists() → True
  读取文件: open(path, 'rb').read()

HTTP降级模式:
  完整URL: http://www.hubeitoday.com.cn/uploads/allimg/151113/2000415537-0.jpg
  下载文件: requests.get(url)
```

---

## 📈 性能对比

### 本地文件 vs HTTP下载

| 操作 | 本地文件模式 | HTTP下载模式 |
|------|------------|-------------|
| 单张图片 | ~0.05秒 | ~0.5-2秒 |
| 100张图片 | ~5秒 | ~50-200秒 |
| 10,000张图片 | ~8分钟 | ~80-300分钟 |
| **164,566张图片** | **~2-3小时** | **~20-50小时** |

**速度提升**: 约 **10-20倍** 🚀

### 预计导入时间

以164,566篇文章为例（92.5%有封面图）：

```
场景1: 仅封面图（推荐）
  图片数量: ~164,000张
  预计时间: 2-3小时
  存储占用: ~50-80GB

场景2: 封面+正文图
  图片数量: ~300,000-500,000张（估算）
  预计时间: 4-6小时
  存储占用: ~100-150GB

场景3: HTTP下载模式
  预计时间: 20-50小时
  不推荐使用 ❌
```

---

## ✅ 最佳实践

### 步骤1：验证本地文件

```bash
# 检查本地文件目录
ssh root@121.40.167.71 "ls -lh /data/webapp/www/file.hubeitoday.com.cn/public/uploads/ | head -20"

# 统计文件数量
ssh root@121.40.167.71 "find /data/webapp/www/file.hubeitoday.com.cn/public/uploads/ -type f | wc -l"

# 检查磁盘空间
ssh root@121.40.167.71 "df -h /data/webapp/www/file.hubeitoday.com.cn"
```

### 步骤2：小规模测试

```bash
# 测试10条（本地文件模式）
ssh root@121.40.167.71 "cd /opt/idp-cms && \
  docker compose -f infra/production/docker-compose-ha-node1.yml exec authoring \
  python manage.py import_old_articles \
    --test \
    --limit=10"

# 查看结果
ssh root@121.40.167.71 "cd /opt/idp-cms && \
  docker compose -f infra/production/docker-compose-ha-node1.yml exec -T authoring \
  python manage.py shell -c \"
from apps.news.models import ArticlePage
from apps.media.models import CustomImage

articles = ArticlePage.objects.all()[:10]
for a in articles:
    if a.cover:
        print(f'{a.title[:30]}: {a.cover.file.url[:60]}...')

print(f'\n总图片数: {CustomImage.objects.count()}')
\""
```

### 步骤3：中等规模测试

```bash
# 测试1000条
ssh root@121.40.167.71 "cd /opt/idp-cms && \
  docker compose -f infra/production/docker-compose-ha-node1.yml exec authoring \
  python manage.py import_old_articles \
    --limit=1000 \
    --batch-size=100"
```

### 步骤4：正式导入

```bash
# 仅封面图（推荐，快速）
ssh root@121.40.167.71 "cd /opt/idp-cms && \
  nohup docker compose -f infra/production/docker-compose-ha-node1.yml exec authoring \
  python manage.py import_old_articles \
    --skip-inline-images \
    --batch-size=1000 \
  > import_cover_only.log 2>&1 &"

# 或完整导入（封面+正文，较慢）
ssh root@121.40.167.71 "cd /opt/idp-cms && \
  nohup docker compose -f infra/production/docker-compose-ha-node1.yml exec authoring \
  python manage.py import_old_articles \
    --batch-size=1000 \
  > import_full.log 2>&1 &"

# 查看进度
ssh root@121.40.167.71 "tail -f /opt/idp-cms/import_*.log"
```

---

## 🔍 问题排查

### 问题1：本地文件找不到

```bash
# 症状
图片来源统计显示100% HTTP下载

# 检查
ssh root@121.40.167.71 "ls -la /data/webapp/www/file.hubeitoday.com.cn/public/uploads/allimg/151113/"

# 解决
确认 --old-media-path 参数正确
```

### 问题2：MinIO连接失败

```bash
# 症状
ERROR: 上传到MinIO失败

# 检查MinIO状态
ssh root@121.40.167.71 "docker ps | grep minio"

# 检查MinIO配置
ssh root@121.40.167.71 "cd /opt/idp-cms && \
  docker compose -f infra/production/docker-compose-ha-node1.yml exec -T authoring \
  python manage.py shell -c \"
from django.conf import settings
print(f'MINIO_ENDPOINT: {settings.AWS_S3_ENDPOINT_URL}')
print(f'BUCKET: {settings.AWS_STORAGE_BUCKET_NAME}')
\""
```

### 问题3：图片URL无法访问

```bash
# 症状
图片已上传到MinIO但前端无法显示

# 检查图片URL
image.file.url
# 应该类似: http://minio-domain/media/images/xxx.jpg

# 检查MinIO公共访问配置
需要确保MinIO bucket的公共读取权限已设置
```

---

## 📝 命令参数总结

```bash
python manage.py import_old_articles \
  --file <path>                    # JSON文件路径
  --limit <N>                      # 限制导入数量
  --batch-size <N>                 # 批处理大小（默认100）
  --start-from <N>                 # 从第N条开始
  --test                           # 测试模式（默认10条）
  
  # 图片相关
  --skip-images                    # 跳过所有图片
  --skip-inline-images             # 仅跳过正文图片
  --old-media-path <path>          # 本地文件路径（默认）
  --old-site-url <url>             # HTTP下载URL（降级）
  --force-download                 # 强制HTTP下载
  
  # 其他
  --channel-slug <slug>            # 默认频道
```

---

## 🎉 总结

### 核心改进

1. **本地文件优先** → 速度提升10-20倍
2. **自动MinIO存储** → 使用新系统存储方式
3. **智能降级** → 本地不存在时自动HTTP下载
4. **详细统计** → 显示本地/HTTP比例

### 推荐方案

**阶段1**：仅封面图（2-3小时）
```bash
--skip-inline-images --batch-size=1000
```

**阶段2**（可选）：补充正文图（2-3小时）
```bash
# 后续可以单独运行脚本补充正文图片
```

**最快方案**：本地文件 + MinIO = 极速迁移 🚀

