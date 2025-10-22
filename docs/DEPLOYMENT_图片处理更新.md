# 部署指南：图片处理系统更新

## 📋 更新清单

本次更新包含以下改进：

### 后端改进
- ✅ 文章模型新增自动提取正文图片功能
- ✅ Wagtail 管理界面新增封面图片提示
- ✅ 添加 beautifulsoup4 依赖

### 前端改进
- ✅ 本地默认封面图片系统（替代外部 picsum）
- ✅ 优化图片显示逻辑
- ✅ 统一视觉风格

### 新增文件
- ✅ 13 个分类的默认封面 SVG 图片
- ✅ 默认封面生成脚本

---

## 🚀 部署步骤

### 1. 安装新依赖

```bash
cd /opt/idp-cms
pip install beautifulsoup4>=4.12.0
```

或者重新安装所有依赖：

```bash
pip install -r requirements.txt
```

### 2. 生成默认封面图片

```bash
cd /opt/idp-cms
python3 scripts/generate_default_covers.py
```

**预期输出**：
```
正在生成默认封面图片到: /opt/idp-cms/sites/public/images/default-covers
✓ 已生成: default.svg
✓ 已生成: politics.svg
✓ 已生成: economy.svg
...
成功生成 13 个默认封面图片!
```

### 3. 检查生成的文件

```bash
ls -lh sites/public/images/default-covers/
```

应该看到 13 个 SVG 文件。

### 4. 前端构建（如果使用 Next.js）

```bash
cd /opt/idp-cms/sites
npm install  # 如果有新的依赖
npm run build
```

### 5. 重启服务

**开发环境**：
```bash
# Django
python manage.py runserver

# Next.js
cd sites && npm run dev
```

**生产环境**：
```bash
# 重启 Django/Gunicorn
systemctl restart idp-cms

# 重启 Next.js (如果单独部署)
pm2 restart idp-cms-frontend
```

---

## ✅ 验证部署

### 1. 检查后端

访问 Wagtail 管理界面，创建或编辑一篇文章：

1. 打开文章编辑页面
2. 查看"封面图片"字段上方是否有黄色提示框
3. 尝试不上传封面，直接在正文插入图片
4. 保存并发布
5. 查看前端是否正确显示图片

### 2. 检查前端

访问网站首页：

1. 查看文章列表中的图片
2. 对于没有封面的文章，应显示对应分类的默认封面
3. 检查图片加载速度（应比之前更快）
4. 确认没有图片加载失败或显示错乱

### 3. 检查默认封面

在浏览器中访问：
```
http://your-domain/images/default-covers/default.svg
http://your-domain/images/default-covers/tech.svg
http://your-domain/images/default-covers/sports.svg
```

应该能看到彩色渐变的 SVG 图片。

### 4. 测试三种场景

**场景 1：有封面的文章**
- 创建文章 → 上传封面图片 → 发布
- 首页应显示上传的封面

**场景 2：无封面但正文有图片**
- 创建文章 → 不上传封面 → 在正文插入图片 → 发布
- 首页应显示正文的第一张图片

**场景 3：无封面也无正文图片**
- 创建文章 → 不上传封面 → 正文只有文字 → 发布
- 首页应显示对应分类的默认封面（例如"科技"文章显示紫色 💻 图标）

---

## 🔧 故障排除

### 问题：默认封面图片不显示

**可能原因**：
1. 图片未生成
2. 路径不正确
3. 静态文件未正确配置

**解决方案**：
```bash
# 1. 检查文件是否存在
ls sites/public/images/default-covers/

# 2. 重新生成
python3 scripts/generate_default_covers.py

# 3. 检查 Next.js 静态文件配置
# 确保 sites/public/images 目录可以被访问
```

### 问题：beautifulsoup4 导入错误

**错误信息**：
```
ModuleNotFoundError: No module named 'bs4'
```

**解决方案**：
```bash
pip install beautifulsoup4
```

### 问题：自动提取图片失败

**检查日志**：
```bash
# 查看 Django 日志
tail -f logs/django.log

# 查找相关警告
grep "提取文章.*正文图片时出错" logs/django.log
```

**常见原因**：
- 正文中的图片不是 Wagtail 管理的图片（外部图片链接）
- HTML 格式异常

### 问题：前端仍然显示 Picsum 图片

**检查步骤**：
1. 清除浏览器缓存
2. 检查 `sites/lib/utils/placeholderImages.ts` 中的配置
3. 重新构建前端：`npm run build`
4. 检查 localStorage 缓存：清空或等待过期（5分钟）

---

## 🔄 回滚方案

如果更新出现问题，可以回滚：

### Git 回滚

```bash
cd /opt/idp-cms
git log --oneline -n 5  # 查看最近的提交
git revert <commit-hash>  # 回滚到指定版本
```

### 手动回滚

1. 从 requirements.txt 移除 beautifulsoup4
2. 恢复 `apps/news/models/article.py` 的旧版本
3. 恢复 `sites/lib/utils/placeholderImages.ts` 的旧版本
4. 删除 `sites/public/images/default-covers/` 目录
5. 重启服务

---

## 📊 监控建议

### 关键指标

部署后，监控以下指标：

1. **图片加载速度**
   - 首页 LCP (Largest Contentful Paint) 应有所改善
   - 默认封面 SVG 加载时间 < 10ms

2. **错误日志**
   - 监控是否有图片提取相关的错误
   - 检查是否有 404 错误（默认封面图片）

3. **用户体验**
   - 首页文章卡片是否都有图片
   - 图片加载是否流畅
   - 是否有视觉混乱

### 监控命令

```bash
# 检查 Django 日志中的图片相关错误
tail -f logs/django.log | grep -i "image\|cover\|图片"

# 检查 Nginx 访问日志中的默认封面访问
tail -f /var/log/nginx/access.log | grep "default-covers"

# 统计默认封面使用情况
grep "default-covers" /var/log/nginx/access.log | wc -l
```

---

## 📝 更新记录

**更新日期**：2025-10-20

**版本**：v1.0

**影响范围**：
- 后端：文章模型、Wagtail 管理界面
- 前端：图片显示组件、占位图片系统
- 依赖：新增 beautifulsoup4

**兼容性**：
- ✅ 向后兼容，现有文章不受影响
- ✅ 无需数据库迁移
- ✅ 无需修改现有 API

**性能影响**：
- ✅ 正面影响：本地图片加载更快
- ✅ 正面影响：无外部依赖，更稳定
- ⚠️ 轻微影响：保存文章时需提取图片（一次性操作）

---

## 🎉 部署完成

如果所有验证步骤都通过，恭喜你成功部署了图片处理系统更新！

**下一步**：
1. 通知编辑团队新功能
2. 监控几天确保稳定
3. 可选：为现有文章批量提取封面图片

**需要帮助？**
- 查看详细文档：`docs/图片处理方案.md`
- 快速开始：`docs/QUICK_START_图片处理.md`


