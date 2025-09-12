好的 ✅
下面给你一份 **Markdown 技术实施文档**，适合放在 `docs/` 目录作为团队交付文件。里面包含方案、配置、代码示例和运维要点。

---

# Wagtail CMS 多站点媒体管理技术实施文档

## 1. 背景与目标

本项目基于 **Wagtail CMS** 构建新闻门户与多个子站点（如 `aivoya.com`、`beijing.aivoya.com`、`shanghai.aivoya.com` 等）。

### 存在问题

- Wagtail 默认的媒体库（Images/Documents）为**全局共享**，不同站点的资源容易混淆。
- MinIO 缺乏统一规范的路径与清理策略，成本与管理压力较大。

### 目标

- 为不同站点提供 **逻辑隔离** 和 **物理隔离** 的媒体库。
- 提供明确的 **权限控制** 和 **访问策略**。
- 支持 **自动清理与运维监控**，降低存储成本。

---

## 2. 方案总体设计

### 2.1 逻辑隔离（Wagtail Collections）

- 每个站点创建独立 Collection：

  - `Portal Media`
  - `Beijing Media`
  - `Shanghai Media`
  - `Hangzhou Media`
  - `Shenzhen Media`

- 为不同站点管理员分配对应 Collection 的权限。
- 默认上传路径落到当前站点的 Collection。

---

### 2.2 物理隔离（MinIO 存储结构）

采用 **两桶制**：

- `idp-media-prod-public`（公共文件）
- `idp-media-prod-private`（私有文件）

对象 Key 结构：

```
{tenant}/{site}/{collection}/{yyyy}/{mm}/{category}/{hash}.{ext}
```

示例：

```
aivoya/beijing/images/2025/09/originals/3a7f...bd.jpg
aivoya/shanghai/docs/2025/09/originals/9c12...af.pdf
```

分类目录：

- `originals/`：原始文件（长期保存）
- `renditions/`：派生图（可清理）
- `transcodes/`：转码文件（可清理）
- `tmp/`：临时文件（短期保存）

---

### 2.3 权限与访问

- **公共文件**：匿名可访问，经 CDN 域名分发

  - `https://media.aivoya.com/portal/...`
  - `https://media.beijing.aivoya.com/...`

- **私有文件**：仅通过后端签发 **Presigned URL** 访问
- MinIO 桶权限：禁止匿名 LIST，公共桶仅允许 GET

---

### 2.4 生命周期管理（ILM）

- `renditions/`：90 天自动清理
- `transcodes/`：30–90 天清理
- `tmp/`：7 天清理
- `originals/`：永久保存（开启版本控制）

---

## 3. Wagtail / Django 实施

### 3.1 自定义 Storage 类

```python
# core/storages.py
from storages.backends.s3boto3 import S3Boto3Storage

class PublicMediaStorage(S3Boto3Storage):
    bucket_name = "idp-media-prod-public"
    default_acl = None
    querystring_auth = False
    file_overwrite = False

class PrivateMediaStorage(S3Boto3Storage):
    bucket_name = "idp-media-prod-private"
    default_acl = "private"
    querystring_auth = True
    file_overwrite = False
```

---

### 3.2 动态上传路径

```python
# core/media_paths.py
from datetime import datetime
from hashlib import sha256
from pathlib import Path

def build_media_path(instance, filename):
    site_slug = getattr(getattr(instance, "site", None), "slug", "portal")
    tenant = "aivoya"
    collection = getattr(getattr(instance, "collection", None), "name", "default").lower().replace(" ", "-")
    y, m = datetime.utcnow().strftime("%Y %m").split()
    ext = Path(filename).suffix.lower() or ".bin"
    h = sha256(filename.encode("utf-8")).hexdigest()[:16]

    return f"{tenant}/{site_slug}/{collection}/{y}/{m}/originals/{h}{ext}"
```

---

### 3.3 Presigned URL 视图（私有文件）

```python
# media/views.py
import boto3
from django.conf import settings
from django.http import JsonResponse

def presign_download(request, key):
    s3 = boto3.client(
        "s3",
        endpoint_url=settings.AWS_S3_ENDPOINT_URL,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )
    url = s3.generate_presigned_url(
        ClientMethod="get_object",
        Params={"Bucket": "idp-media-prod-private", "Key": key},
        ExpiresIn=600,  # 10 分钟
    )
    return JsonResponse({"url": url})
```

---

## 4. MinIO 配置

### 4.1 生命周期规则 (ILM JSON)

```json
{
  "Rules": [
    {
      "ID": "DeleteTmpAfter7Days",
      "Status": "Enabled",
      "Filter": { "Prefix": "aivoya/" },
      "Expiration": { "Days": 7 },
      "NoncurrentVersionExpiration": { "NoncurrentDays": 7 }
    },
    {
      "ID": "DeleteRenditionsAfter90Days",
      "Status": "Enabled",
      "Filter": { "Prefix": "renditions/" },
      "Expiration": { "Days": 90 }
    },
    {
      "ID": "DeleteTranscodesAfter90Days",
      "Status": "Enabled",
      "Filter": { "Prefix": "transcodes/" },
      "Expiration": { "Days": 90 }
    }
  ]
}
```

---

## 5. 后台任务（Celery Beat）

### 清理孤儿文件

```python
# tasks/cleanup.py
from django.core.files.storage import default_storage
from wagtail.images.models import Image
from wagtail.documents.models import Document

def cleanup_orphans():
    used_keys = set(Image.objects.values_list("file", flat=True)) | \
                set(Document.objects.values_list("file", flat=True))

    # 遍历存储桶，删除未被引用的对象
    all_keys = default_storage.bucket.objects.all()
    for obj in all_keys:
        if obj.key not in used_keys:
            obj.delete()
```

配置 Celery Beat 每日执行一次。

---

## 6. 运维与监控

- **监控指标**

  - 桶容量（按前缀统计）
  - 请求成功率/错误率
  - Renditions 生成速率

- **告警**

  - 容量 >80%
  - ILM 清理失败
  - Presigned URL 滥用（下载过多）

- **成本归集**

  - 按 `{tenant}/{site}/...` 前缀统计用量和流量
  - 生成月度报表供财务/客户对账

---

## 7. 总结

该方案通过 **Wagtail Collections** 实现逻辑隔离，通过 **MinIO 前缀** 实现物理隔离。结合 **权限控制、生命周期管理和后台任务**，提供了一套适合新闻门户及多站点应用的媒体管理最佳实践。

---
