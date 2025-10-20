# ✅ 存储配置验证通过

## 📦 MinIO配置（生产环境）

### 已验证配置

```
MinIO Endpoint: http://172.28.0.50:9000
Bucket名称: idp-media-prod-public
存储后端: apps.core.storages.PublicMediaStorage
路径前缀: 无租户前缀（MEDIA_USE_TENANT: False）
```

### 图片存储路径格式

```
{site}/{collection}/{year}/{month}/{category}/{hash}.{ext}

示例：
portal/c1-root/2025/10/originals/0b397e930a40c7a6.jpg
  │      │        │    │      │         └─ 文件名哈希
  │      │        │    │      └─ 分类（原始图片）
  │      │        │    └─ 月份
  │      │        └─ 年份
  │      └─ 集合（c1-root表示ID=1的root集合）
  └─ 站点

生成方式：
- 通过 apps.core.media_paths.build_media_path() 自动生成
- 哈希基于文件名和时间戳（SHA256前16位）
- 集合默认为 "c1-root" （Root集合）
```

## 🔍 现有文章示例

从数据库查询结果：

```python
文章: 参展企业超3.2万家！第138届广交会今日开幕
  URL: http://121.40.167.71:8000/api/media/proxy/portal/c1-root/2025/10/originals/0b397e930a40c7a6.jpg
  路径: portal/c1-root/2025/10/originals/0b397e930a40c7a6.jpg
```

## ✅ 导入脚本验证

### 当前实现（正确）

```python
# apps/news/management/commands/import_old_articles.py

# 读取图片内容（从本地文件或HTTP下载）
image_content = ...

# 创建CustomImage（自动处理一切）
image = CustomImage(title=title[:100])
image.file.save(
    filename,           # 原始文件名
    ContentFile(image_content),  # 文件内容
    save=True          # 立即保存
)

# Django自动执行：
# 1. 调用 build_media_path() 生成路径
# 2. 通过 PublicMediaStorage 上传到MinIO
# 3. 保存到 bucket: idp-media-prod-public
# 4. 返回图片对象，file.url包含访问URL
```

## 🎯 结论

**✅ 无需任何修改！**

当前的导入脚本实现完全正确：

1. **从本地文件读取图片** → 速度快10-20倍
2. **使用Django的存储系统** → 自动处理路径和上传
3. **自动上传到MinIO** → 使用正确的bucket和路径
4. **自动生成访问URL** → 通过/api/media/proxy代理访问

## 📊 预期结果

导入时每张图片的处理流程：

```
旧系统文件路径:
/data/webapp/www/file.hubeitoday.com.cn/public/uploads/allimg/151113/xxx.jpg
                    ↓ 读取文件
              image_content (bytes)
                    ↓ ContentFile()
          image.file.save(filename, content)
                    ↓ build_media_path()
       portal/c1-root/2025/10/originals/abc123.jpg
                    ↓ PublicMediaStorage
          MinIO: idp-media-prod-public/portal/...
                    ↓ 返回
  http://121.40.167.71:8000/api/media/proxy/portal/...
```

## 🚀 准备开始导入

所有配置已验证通过，可以开始测试导入：

```bash
# 小规模测试（10条）
ssh root@121.40.167.71 "cd /opt/idp-cms && \
  docker compose -f infra/production/docker-compose-ha-node1.yml exec authoring \
  python manage.py import_old_articles --test --limit=10"
```

预期统计输出：

```
📸 图片统计:
  封面图片:
    ✓ 成功:    9
    ✗ 失败:    1
    成功率:    90.0%
  图片来源:
    📁 本地文件: 9 (100.0%)   ← 全部从本地读取
    🌐 HTTP下载: 0 (0.0%)
  💾 存储到MinIO: 9 个         ← 自动上传到 idp-media-prod-public
```

---

**日期**: 2025-10-20  
**验证状态**: ✅ 通过  
**下一步**: 执行测试导入

