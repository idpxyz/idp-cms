# 文章图片 WebP 优化 - Docker Compose 快速开始

## 🐳 Docker 环境说明

- **Compose 文件**: `infra/local/docker-compose.yml`
- **后端容器**: `authoring`
- **前端容器**: `sites`

---

## 🚀 快速开始（3步）

### 第一步：验证环境

```bash
# 确保容器正在运行
cd /opt/idp-cms
docker compose -f infra/local/docker-compose.yml ps

# 应该看到 authoring 和 sites 容器状态为 Up
```

如果容器未运行，先启动：
```bash
cd infra/local
docker compose up -d
```

---

### 第二步：运行验证脚本

```bash
cd /opt/idp-cms
./test-webp-article-images.sh
```

这个脚本会自动：
- ✅ 检查 Docker 环境
- ✅ 测试管理命令
- ✅ 运行演习模式
- ✅ 生成测试 WebP
- ✅ 检查文件对比

---

### 第三步：批量生成 WebP

#### 选项A：小范围测试（推荐先做）

```bash
docker compose -f infra/local/docker-compose.yml exec authoring \
  python manage.py generate_article_webp --limit 10
```

#### 选项B：按 collection 批量生成

```bash
# 查看可用的 collections
docker compose -f infra/local/docker-compose.yml exec authoring \
  python manage.py shell -c "
from wagtail.models import Collection
for c in Collection.objects.all():
    print(f'{c.id}: {c.name}')
"

# 生成特定 collection
docker compose -f infra/local/docker-compose.yml exec authoring \
  python manage.py generate_article_webp --collection news
```

#### 选项C：全量生成

```bash
docker compose -f infra/local/docker-compose.yml exec authoring \
  python manage.py generate_article_webp
```

---

## 📊 常用 Docker 命令

### 查看生成的 WebP 文件

```bash
# 查看 WebP 文件数量
docker compose -f infra/local/docker-compose.yml exec authoring \
  bash -c "find media -name '*.webp' | wc -l"

# 查看示例文件
docker compose -f infra/local/docker-compose.yml exec authoring \
  find media -name "*.webp" | head -10

# 查看文件大小
docker compose -f infra/local/docker-compose.yml exec authoring \
  ls -lh media/*/images/*.webp | head -5
```

### 对比文件大小

```bash
docker compose -f infra/local/docker-compose.yml exec authoring bash -c '
for jpg in $(find media -name "*.jpg" | head -5); do
  webp="${jpg%.jpg}.webp"
  if [ -f "$webp" ]; then
    echo "JPG:  $(ls -lh $jpg | awk "{print \$5}") - $jpg"
    echo "WebP: $(ls -lh $webp | awk "{print \$5}") - $webp"
    echo ""
  fi
done
'
```

### 查看容器日志

```bash
# 查看后端容器日志（实时）
docker compose -f infra/local/docker-compose.yml logs -f authoring

# 查看最近100行日志
docker compose -f infra/local/docker-compose.yml logs --tail=100 authoring

# 搜索 WebP 相关日志
docker compose -f infra/local/docker-compose.yml logs authoring | grep -i webp
```

### 进入容器调试

```bash
# 进入后端容器
docker compose -f infra/local/docker-compose.yml exec authoring bash

# 在容器内手动测试
cd /app
python manage.py shell

>>> from wagtail.images import get_image_model
>>> from apps.core.tasks.media_tasks import generate_original_size_webp_sync
>>> ImageModel = get_image_model()
>>> image = ImageModel.objects.filter(file__iendswith='.jpg').first()
>>> result = generate_original_size_webp_sync(image)
>>> print(result)
```

---

## 🔍 验证 WebP 加载

### 方法1：在容器内测试

```bash
# 检查 WebP 文件是否可访问
docker compose -f infra/local/docker-compose.yml exec authoring bash -c '
  TEST_JPG=$(find media -name "*.jpg" | head -1)
  TEST_WEBP="${TEST_JPG%.jpg}.webp"
  
  echo "原图: $TEST_JPG"
  echo "WebP: $TEST_WEBP"
  
  if [ -f "$TEST_WEBP" ]; then
    echo "✅ WebP 文件存在"
    ls -lh "$TEST_WEBP"
  else
    echo "❌ WebP 文件不存在"
  fi
'
```

### 方法2：通过浏览器测试

1. 访问文章页面：`http://localhost:3000/portal/article/some-article`
2. 打开开发者工具 → Network
3. 筛选图片请求
4. 查看是否请求 `.webp` 文件

### 方法3：直接访问 WebP URL

```bash
# 假设有图片 /media/portal/c2-news/2025/01/images/photo.jpg
# 尝试访问 WebP 版本
curl -I http://localhost:8000/media/portal/c2-news/2025/01/images/photo.webp

# 应该返回 200 OK
# Content-Type: image/webp
```

---

## 🛠 故障排查

### 问题1：容器未运行

```bash
# 检查容器状态
docker compose -f infra/local/docker-compose.yml ps

# 启动容器
cd infra/local
docker compose up -d

# 查看启动日志
docker compose logs authoring
```

### 问题2：权限问题

```bash
# 如果提示权限不足，检查文件权限
docker compose -f infra/local/docker-compose.yml exec authoring \
  ls -la media/

# 可能需要调整权限
docker compose -f infra/local/docker-compose.yml exec authoring \
  chown -R www-data:www-data media/
```

### 问题3：Python 包缺失

```bash
# 进入容器检查
docker compose -f infra/local/docker-compose.yml exec authoring bash

# 检查 Pillow 是否安装 WebP 支持
python -c "from PIL import Image; print(Image.PILLOW_VERSION)"
python -c "from PIL import features; print('WebP:', features.check('webp'))"

# 如果 WebP 支持为 False，需要重新安装 Pillow
pip install --force-reinstall pillow
```

### 问题4：Celery 任务问题

```bash
# 如果使用异步任务，检查 Celery
docker compose -f infra/local/docker-compose.yml exec authoring \
  celery -A config inspect active

# 查看 Celery 日志
docker compose -f infra/local/docker-compose.yml logs celery
```

---

## 📈 监控和统计

### 实时监控文件生成

```bash
# 在一个终端监控日志
docker compose -f infra/local/docker-compose.yml logs -f authoring

# 在另一个终端执行生成
docker compose -f infra/local/docker-compose.yml exec authoring \
  python manage.py generate_article_webp --limit 50
```

### 统计 WebP 覆盖率

```bash
docker compose -f infra/local/docker-compose.yml exec authoring bash -c '
total_jpg=$(find media -name "*.jpg" -o -name "*.jpeg" | wc -l)
total_webp=$(find media -name "*.webp" | wc -l)

echo "总 JPG/JPEG 图片: $total_jpg"
echo "已生成 WebP: $total_webp"

if [ $total_jpg -gt 0 ]; then
  coverage=$((total_webp * 100 / total_jpg))
  echo "WebP 覆盖率: ${coverage}%"
fi
'
```

### 计算节省的空间

```bash
docker compose -f infra/local/docker-compose.yml exec authoring bash -c '
jpg_size=$(find media -name "*.jpg" -exec stat -c%s {} + | awk "{sum+=\$1} END {print sum}")
webp_size=$(find media -name "*.webp" -exec stat -c%s {} + | awk "{sum+=\$1} END {print sum}")

echo "JPG 总大小: $((jpg_size / 1024 / 1024)) MB"
echo "WebP 总大小: $((webp_size / 1024 / 1024)) MB"

if [ $jpg_size -gt 0 ]; then
  saved=$((100 - (webp_size * 100 / jpg_size)))
  echo "节省空间: ${saved}%"
fi
'
```

---

## 🔄 定期维护

### 每周检查（可设置 cron）

```bash
#!/bin/bash
# weekly-webp-check.sh

docker compose -f /opt/idp-cms/infra/local/docker-compose.yml exec -T authoring \
  python manage.py generate_article_webp --skip-existing

echo "✅ 每周 WebP 补充完成"
```

### 手动补充遗漏的图片

```bash
# 只生成缺失的 WebP（跳过已存在的）
docker compose -f infra/local/docker-compose.yml exec authoring \
  python manage.py generate_article_webp --skip-existing
```

---

## 🎯 推荐的执行顺序

### 第一次部署

```bash
# 1. 验证环境
cd /opt/idp-cms
./test-webp-article-images.sh

# 2. 小范围测试
docker compose -f infra/local/docker-compose.yml exec authoring \
  python manage.py generate_article_webp --limit 10

# 3. 检查结果
docker compose -f infra/local/docker-compose.yml exec authoring \
  find media -name "*.webp" | head -10

# 4. 按 collection 批量生成
docker compose -f infra/local/docker-compose.yml exec authoring \
  python manage.py generate_article_webp --collection news

# 5. 继续其他 collections
docker compose -f infra/local/docker-compose.yml exec authoring \
  python manage.py generate_article_webp --collection politics

# 6. 最后全量检查（补充遗漏）
docker compose -f infra/local/docker-compose.yml exec authoring \
  python manage.py generate_article_webp --skip-existing
```

### 后续维护

```bash
# 每周或每月执行一次，补充新上传的图片
docker compose -f infra/local/docker-compose.yml exec authoring \
  python manage.py generate_article_webp --skip-existing --limit 1000
```

---

## 📝 简化命令（可选）

创建别名简化命令：

```bash
# 添加到 ~/.bashrc 或 ~/.zshrc
alias dkc-auth='docker compose -f /opt/idp-cms/infra/local/docker-compose.yml exec authoring'
alias dkc-webp='dkc-auth python manage.py generate_article_webp'

# 使用别名
source ~/.bashrc

# 简化的命令
dkc-webp --limit 10
dkc-webp --collection news
dkc-auth find media -name "*.webp" | head -10
```

---

## ✅ 验证清单

### 环境验证
- [ ] Docker Compose 已安装
- [ ] 容器 authoring 正在运行
- [ ] 容器 sites 正在运行

### 功能验证
- [ ] 验证脚本运行成功
- [ ] 管理命令可用
- [ ] 演习模式正常
- [ ] 实际生成成功

### 生成验证
- [ ] 小范围测试（10张）成功
- [ ] WebP 文件存在于容器内
- [ ] 文件大小减少 60-70%

### 前端验证
- [ ] 访问文章页面
- [ ] Network 中看到 .webp 请求
- [ ] 图片正常显示
- [ ] 降级机制正常（WebP 不存在时）

---

## 🎉 完成标志

当你看到以下现象时，说明部署成功：

1. ✅ `./test-webp-article-images.sh` 全部通过
2. ✅ 容器内可以看到 `.webp` 文件
3. ✅ 浏览器请求显示使用 WebP
4. ✅ WebP 文件比原图小 60-70%
5. ✅ 页面加载速度提升

---

## 📚 相关文档

- **详细实施报告**: `ARTICLE_IMAGES_WEBP_IMPLEMENTATION.md`
- **技术分析**: `HERO_VS_ARTICLE_IMAGES_ANALYSIS.md`
- **通用快速开始**: `WEBP_ARTICLE_IMAGES_QUICK_START.md`

---

**准备好了吗？开始执行！** 🚀

```bash
# 一键启动
cd /opt/idp-cms
./test-webp-article-images.sh
```

