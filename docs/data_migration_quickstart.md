# 数据迁移快速开始

## 快速步骤

### 1. 导出旧数据库数据

```bash
# 导出所有数据
./scripts/export_articles_from_mysql.sh

# 或者只导出100条用于测试
./scripts/export_articles_from_mysql.sh --limit 100
```

这将在 `data/migration/exports/` 目录下生成：
- `articles.json` - 文章数据
- `categories.json` - 分类数据
- `tags.json` - 标签数据

### 2. 准备Django环境

```bash
# 激活虚拟环境（如果使用）
source venv/bin/activate  # 或 source .venv/bin/activate

# 确保数据库已迁移
python manage.py migrate

# 确保有频道数据
python manage.py shell -c "
from apps.core.models import Channel
if not Channel.objects.exists():
    Channel.objects.create(name='新闻', slug='news', order=1)
    print('已创建默认频道')
else:
    print(f'当前有 {Channel.objects.count()} 个频道')
"
```

### 3. 测试导入（推荐）

```bash
# 先测试导入10条数据
python manage.py import_old_articles --test --limit=10

# 检查结果
python manage.py shell -c "
from apps.news.models import ArticlePage
print(f'已导入 {ArticlePage.objects.count()} 篇文章')
ArticlePage.objects.first() and print(f'第一篇: {ArticlePage.objects.first().title}')
"
```

### 4. 正式导入

```bash
# 方式1：一次性导入全部
python manage.py import_old_articles

# 方式2：分批导入（推荐，更安全）
python manage.py import_old_articles --batch-size=1000

# 方式3：断点续传（如果中途失败）
python manage.py import_old_articles --start-from=5000
```

### 5. 验证导入结果

```bash
# 检查导入统计
python manage.py shell
```

```python
from apps.news.models import ArticlePage
from apps.media.models import CustomImage

# 文章统计
total = ArticlePage.objects.count()
published = ArticlePage.objects.live().count()
drafts = ArticlePage.objects.filter(live=False).count()

print(f"总文章数: {total}")
print(f"已发布: {published}")
print(f"草稿: {drafts}")

# 图片统计
with_cover = ArticlePage.objects.exclude(cover__isnull=True).count()
without_cover = ArticlePage.objects.filter(cover__isnull=True).count()

print(f"\n有封面图: {with_cover}")
print(f"无封面图: {without_cover}")

# 分类统计
with_channel = ArticlePage.objects.exclude(channel__isnull=True).count()
print(f"\n已关联频道: {with_channel}")

# 查看最新的5篇文章
print("\n最新文章:")
for article in ArticlePage.objects.order_by('-first_published_at')[:5]:
    print(f"  - {article.title} ({article.first_published_at})")
```

## 常用命令

### 查看帮助
```bash
python manage.py import_old_articles --help
```

### 导入选项

| 选项 | 说明 | 示例 |
|------|------|------|
| `--file` | 指定JSON文件 | `--file=data/custom.json` |
| `--limit` | 限制导入数量 | `--limit=100` |
| `--batch-size` | 批处理大小 | `--batch-size=500` |
| `--start-from` | 起始位置 | `--start-from=1000` |
| `--test` | 测试模式（导入10条） | `--test` |
| `--skip-images` | 跳过图片下载 | `--skip-images` |
| `--channel-slug` | 指定频道 | `--channel-slug=news` |

### 示例场景

**测试导入:**
```bash
python manage.py import_old_articles --test
```

**快速导入（跳过图片）:**
```bash
python manage.py import_old_articles --skip-images
```

**分批导入1000条:**
```bash
python manage.py import_old_articles --limit=1000 --batch-size=100
```

**从第5000条继续导入:**
```bash
python manage.py import_old_articles --start-from=5000
```

## 故障排除

### 1. SSH连接失败

**问题**: `Permission denied`

**解决**:
```bash
# 确保SSH密钥已配置
cat ~/.ssh/id_rsa.pub

# 手动测试连接
ssh root@121.41.73.49 "echo 'Connection OK'"
```

### 2. JSON文件不存在

**问题**: `文件不存在: data/migration/exports/articles.json`

**解决**:
```bash
# 重新运行导出脚本
./scripts/export_articles_from_mysql.sh --limit 100
```

### 3. 频道不存在

**问题**: `数据库中没有任何频道`

**解决**:
```bash
python manage.py shell -c "
from apps.core.models import Channel
Channel.objects.create(name='新闻', slug='news', order=1)
"
```

### 4. 图片下载失败

**问题**: 图片下载超时或失败

**解决方案**:
- 使用 `--skip-images` 跳过图片下载
- 检查网络连接
- 稍后单独处理图片

### 5. 内存不足

**问题**: 导入时内存溢出

**解决方案**:
```bash
# 减小批处理大小
python manage.py import_old_articles --batch-size=50

# 或分多次导入
python manage.py import_old_articles --limit=5000
python manage.py import_old_articles --start-from=5000 --limit=5000
```

### 6. 查看错误日志

```bash
# 错误日志位置
ls -lh data/migration/logs/

# 查看最新错误日志
tail -f data/migration/logs/errors_*.log
```

## 清理和重新导入

如果需要清空已导入的数据并重新开始：

```bash
python manage.py shell
```

```python
from apps.news.models import ArticlePage

# ⚠️ 警告：这将删除所有导入的文章！
count = ArticlePage.objects.count()
print(f"准备删除 {count} 篇文章")

# 确认后执行
# ArticlePage.objects.all().delete()
# print("已删除所有文章")
```

## 性能建议

### 对于大量数据（10万+）

1. **关闭调试模式**
   ```python
   # settings.py
   DEBUG = False
   ```

2. **使用数据库连接池**
   ```python
   # settings.py
   DATABASES = {
       'default': {
           ...
           'CONN_MAX_AGE': 600,
       }
   }
   ```

3. **分批导入**
   ```bash
   # 每次导入5000条
   for i in {0..35}; do
       start=$((i * 5000))
       python manage.py import_old_articles --start-from=$start --limit=5000
       echo "已完成 $start - $((start + 5000))"
       sleep 5
   done
   ```

4. **在后台运行**
   ```bash
   nohup python manage.py import_old_articles > import.log 2>&1 &
   
   # 查看进度
   tail -f import.log
   ```

## 导入后的优化

### 1. 重建搜索索引
```bash
python manage.py update_index
```

### 2. 更新页面树
```bash
python manage.py fixtree
```

### 3. 生成缩略图
```bash
python manage.py wagtail_update_image_renditions
```

### 4. 清理缓存
```bash
python manage.py clear_cache
```

## 下一步

导入完成后，建议：

1. **设置URL重定向** - 从旧URL重定向到新URL
2. **优化SEO** - 检查并完善SEO字段
3. **更新sitemap** - 生成新的sitemap.xml
4. **测试性能** - 检查页面加载速度
5. **备份数据** - 备份成功导入的数据

## 相关文档

- [完整迁移方案](./data_migration_plan.md)
- [数据库模型说明](../apps/news/models/article.py)
- [API文档](./api/README.md)

