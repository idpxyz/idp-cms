好的 ✅
我帮你整理一份 **《Wagtail CMS 多站点媒体管理方案说明书》**，结合你们的 **门户 + 地方子站 (aivoya.com / beijing / shanghai / …)** 架构，以及基于 **MinIO** 的存储环境。

---

# 📝 Wagtail CMS 多站点媒体管理方案说明书

## 1. 背景与目标

本项目基于 **Wagtail CMS** 构建新闻门户与多个子站点（如 `aivoya.com`、`beijing.aivoya.com`、`shanghai.aivoya.com` 等）。
现有问题：

- Wagtail 默认的媒体库（Images/Documents）为**全局共享**，站点之间未隔离。
- 运营编辑在上传和选择媒体时，容易误用其他站点资源，造成内容混乱。
- 在 MinIO 上缺乏统一规范的前缀管理，不便于存储、清理和成本核算。

目标：

- 提供一套 **逻辑隔离 + 物理隔离** 的多站点媒体管理方案。
- 确保站点独立性，同时兼顾统一存储和 CDN 分发效率。
- 在 Wagtail 后台提供清晰的管理体验和权限控制。

---

## 2. 方案总体设计

### 2.1 逻辑隔离（Wagtail Collections）

- 为每个站点建立对应的 **Collection**：

  - `Portal Media`（门户）
  - `Beijing Media`
  - `Shanghai Media`
  - `Hangzhou Media`
  - `Shenzhen Media`

- 在 Wagtail 权限系统中，给不同站点管理员分配对应 Collection 的 **上传/读取权限**。
- 上传时，默认选择本网站的 Collection。

---

### 2.2 物理隔离（MinIO Storage 前缀）

采用统一的 **两桶制（public/private）**，并在对象 Key 中引入 `tenant` + `site` 前缀。

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

- `originals/`：原始上传文件（长期保存）
- `renditions/`：缩略图/派生图（可清理）
- `transcodes/`：转码文件（可清理）
- `tmp/`：临时文件（短期保存）

---

### 2.3 权限与访问控制

- **公共文件**（新闻图片、开放资料）：存储在 `idp-media-prod-public`，经 CDN 直链访问。
- **私有文件**（后台资料、内部文档）：存储在 `idp-media-prod-private`，通过后端签发 **Presigned URL** 提供访问。
- CDN 配置：

  - `https://media.aivoya.com/portal/...`
  - `https://media.beijing.aivoya.com/...`
  - `https://media.shanghai.aivoya.com/...`

---

### 2.4 数据模型扩展（可选）

为了进一步增强站点隔离，可以扩展 `Image` / `Document` 模型：

- 在模型中增加 `site = models.ForeignKey(Site)` 字段。
- 在后台选择文件时，根据当前站点过滤，只显示本站点文件。
- 与 `Collection` 配合，实现逻辑 + 数据层的双重隔离。

---

### 2.5 生命周期管理（ILM）

在 MinIO 配置 **生命周期规则**：

- `renditions/`：90 天清理（可再生）
- `transcodes/`：30–90 天清理
- `tmp/`：7 天清理
- `originals/`：永久保存（开启版本控制）

后台任务（Celery Beat）：

- 定期清理 **数据库已删除但存储未清理的文件**
- 扫描 `tmp/` 与过期 renditions 并删除

---

## 3. 实施步骤

### 步骤 1：Collections 建立与权限配置

- 在 Wagtail 管理后台为每个站点创建对应 Collection
- 设置组权限：站点管理员仅能访问对应 Collection

### 步骤 2：自定义 Storage 后端

- 基于 `django-storages` S3Boto3Storage
- 在 `upload_to` 回调中动态注入 `{tenant}/{site}/...` 前缀
- 公共/私有文件分别走不同的存储类

### 步骤 3：模板与 URL 配置

- 所有公共文件通过 CDN 域名访问
- 私有文件使用后端签发的 Presigned URL
- 模板里可根据站点切换 `media.{site}.aivoya.com`，或统一使用 `media.aivoya.com/{site}/...`

### 步骤 4：ILM 与清理任务

- 在 MinIO 中配置 Lifecycle 规则
- 在 Django 项目中配置 Celery Beat 定时任务，清理孤儿文件

### 步骤 5：运维与监控

- 监控 MinIO 桶用量（按前缀统计）
- 配置告警（容量阈值、请求错误率）
- 按租户/站点生成月度存储和流量报表

---

## 4. 方案优缺点

### 优点

- **逻辑与物理隔离结合**，避免资源混乱
- **路径规范化**，支持成本核算与后期迁移
- **权限控制明确**，提升后台编辑体验
- **支持多站点扩展**，适合未来增加更多城市站点

### 缺点

- 需要一定的二次开发（upload_to、自定义 storage、后台过滤逻辑）
- renditions 清理后，访问老文章时可能触发重新生成（但影响很小）

---

## 5. 总结

该方案在 **Wagtail CMS + MinIO** 环境下，实现了新闻网站多站点的最佳实践：

- 使用 **Collections** 提供后台逻辑隔离
- 使用 **MinIO 前缀** 提供物理隔离
- 配合 **权限与生命周期策略**，实现安全、可扩展、可运维的媒体管理

---
