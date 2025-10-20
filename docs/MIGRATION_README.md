# 文章数据迁移指南

## 概述

本指南用于将旧MySQL数据库（121.41.73.49）的文章数据迁移到新的Wagtail CMS系统。

- **数据源**: MySQL jrhb 数据库
- **文章总数**: 177,918篇
- **目标系统**: Wagtail CMS + Django
- **预计时间**: 6-12小时（取决于网络和服务器性能）

## 📚 文档导航

| 文档 | 说明 | 适用人群 |
|------|------|----------|
| [快速开始](./data_migration_quickstart.md) | 快速上手指南 | ⭐ 推荐首先阅读 |
| [完整方案](./data_migration_plan.md) | 详细的技术方案和设计 | 技术负责人 |

## 🚀 快速开始（3步）

### 第1步：导出数据

```bash
# 导出前100条测试数据
./scripts/export_articles_from_mysql.sh --limit 100
```

### 第2步：测试导入

```bash
# 测试导入10条
python manage.py import_old_articles --test --limit=10
```

### 第3步：正式导入

```bash
# 导入全部数据
python manage.py import_old_articles
```

详细步骤请查看 [快速开始文档](./data_migration_quickstart.md)

## 📁 文件结构

```
/opt/idp-cms/
├── docs/
│   ├── MIGRATION_README.md          # 本文件
│   ├── data_migration_quickstart.md # 快速开始指南 ⭐
│   └── data_migration_plan.md       # 完整技术方案
├── scripts/
│   └── export_articles_from_mysql.sh # 数据导出脚本
├── apps/news/management/commands/
│   └── import_old_articles.py       # 数据导入命令
└── data/migration/
    ├── exports/                     # 导出的JSON文件
    ├── images/                      # 下载的图片
    └── logs/                        # 错误日志
```

## 🔄 迁移流程图

```
┌─────────────────┐
│  旧MySQL数据库   │
│  (121.41.73.49) │
└────────┬────────┘
         │
         │ 1. 导出数据
         │ export_articles_from_mysql.sh
         ▼
┌─────────────────┐
│  JSON文件        │
│  articles.json   │
└────────┬────────┘
         │
         │ 2. 数据转换
         │ import_old_articles.py
         ▼
┌─────────────────┐
│  Wagtail CMS    │
│  ArticlePage    │
└─────────────────┘
```

## 📊 数据映射

### 核心字段映射

| 旧数据库 | 新系统 | 说明 |
|---------|--------|------|
| article.title | ArticlePage.title | 文章标题 |
| article_info.info | ArticlePage.body | 文章正文 |
| article.img | ArticlePage.cover | 封面图片 |
| article.author | ArticlePage.author_name | 作者 |
| article.cate_id | ArticlePage.channel | 频道/分类 |
| article.tags | ArticlePage.tags | 标签 |
| article.add_time | ArticlePage.first_published_at | 发布时间 |

完整映射请查看 [完整方案文档](./data_migration_plan.md#三字段映射表)

## 🎯 关键特性

### ✅ 已实现

- ✅ 文章基本信息迁移
- ✅ 文章正文内容迁移
- ✅ 封面图片下载和保存
- ✅ SEO字段迁移
- ✅ 标签关联
- ✅ 发布状态转换
- ✅ 时间戳转换
- ✅ 批量导入
- ✅ 断点续传
- ✅ 错误日志
- ✅ 进度显示

### 🔄 可选功能

- ⚪ 分类映射（需手动配置）
- ⚪ 点击量统计迁移
- ⚪ 评论数据迁移
- ⚪ 用户数据迁移

## ⚠️ 重要提示

### 导入前准备

1. **备份现有数据**
   ```bash
   python manage.py dumpdata > backup_before_import.json
   ```

2. **确保有足够的磁盘空间**
   - 图片可能占用数GB空间
   - 数据库需要额外空间

3. **检查网络连接**
   - SSH连接稳定性
   - 图片下载带宽

### 导入过程中

1. **不要中断进程** - 使用 `--batch-size` 分批处理更安全
2. **监控内存使用** - 大批量导入时注意内存
3. **查看错误日志** - 及时发现问题

### 导入完成后

1. **验证数据完整性**
2. **重建搜索索引**
3. **更新sitemap**
4. **设置URL重定向**

## 🛠️ 故障排除

### 常见问题

1. **SSH连接失败**
   - 检查SSH密钥配置
   - 手动测试: `ssh root@121.41.73.49 "echo OK"`

2. **图片下载失败**
   - 使用 `--skip-images` 跳过图片
   - 稍后单独处理图片

3. **内存不足**
   - 减小 `--batch-size` 参数
   - 分多次导入

详细故障排除请查看 [快速开始文档](./data_migration_quickstart.md#故障排除)

## 📈 性能参考

基于测试环境的估算：

| 数据量 | 预计时间 | 建议方式 |
|--------|---------|---------|
| 100条 | 1-2分钟 | 直接导入 |
| 1,000条 | 10-20分钟 | 直接导入 |
| 10,000条 | 2-3小时 | 分批导入 |
| 100,000条 | 20-30小时 | 分批+后台运行 |
| 177,918条 | 30-40小时 | 分批+后台运行+断点续传 |

*注：实际时间取决于网络速度、服务器性能和是否下载图片*

## 🔍 验证清单

导入完成后请检查：

- [ ] 文章总数是否正确
- [ ] 已发布文章数量
- [ ] 封面图片完整性
- [ ] 标签关联
- [ ] 频道/分类关联
- [ ] 发布时间正确性
- [ ] SEO字段完整性
- [ ] URL slug唯一性
- [ ] 正文内容完整性
- [ ] 外链和来源信息

验证脚本：
```bash
python manage.py shell < scripts/verify_migration.py
```

## 📞 支持

如有问题，请：

1. 查看错误日志: `data/migration/logs/errors_*.log`
2. 查看文档: [快速开始](./data_migration_quickstart.md)
3. 查看代码注释: `apps/news/management/commands/import_old_articles.py`

## 🔗 相关资源

- [Wagtail 官方文档](https://docs.wagtail.org/)
- [Django 管理命令](https://docs.djangoproject.com/en/stable/howto/custom-management-commands/)
- [数据库模型文档](../apps/news/models/article.py)

## 📝 变更日志

- 2024-10-20: 初始版本，支持基础文章迁移
- 待添加: 评论迁移、用户迁移、统计数据迁移

---

**重要**: 开始迁移前，请务必先阅读 [快速开始文档](./data_migration_quickstart.md) 并在测试环境中验证！

