# Slug 编辑和管理指南

## 📍 在哪里编辑 Slug

### Wagtail 后台管理界面

访问地址：`http://192.168.8.195:8000/admin/`

### 文章编辑界面新增标签页

现在文章编辑页面有 **4 个标签页**：

```
┌─────────────────────────────────────────────────────┐
│  📰 内容编辑  │  🔗 推广  │  🎯 SEO  │  ⚙️ 高级设置  │
└─────────────────────────────────────────────────────┘
```

#### 1. 📰 内容编辑（第一个标签页）
- 文章标题、摘要、封面、正文
- 作者、发布时间
- 分类、标签
- 发布设置

#### 2. 🔗 推广（第二个标签页）⭐ **新增！Slug 在这里！**
```
┌────────────────────────────────────┐
│ 🔗 URL与推广设置                    │
├────────────────────────────────────┤
│ 🔗 URL与搜索                       │
│                                    │
│ Slug:                              │
│ ┌────────────────────────────────┐ │
│ │ shichangguancha-keji-4142      │ │  ← 这里编辑 slug！
│ └────────────────────────────────┘ │
│ 💡 文章URL标识符（网址中显示的部分）│
│    保存时会自动将中文转换为拼音。   │
│                                    │
│ SEO标题:                           │
│ ┌────────────────────────────────┐ │
│ │                                │ │
│ └────────────────────────────────┘ │
│                                    │
│ 搜索引擎描述:                      │
│ ┌────────────────────────────────┐ │
│ │                                │ │
│ └────────────────────────────────┘ │
│                                    │
│ 📋 菜单显示                        │
│ □ 是否在导航菜单中显示             │
└────────────────────────────────────┘
```

#### 3. 🎯 SEO（第三个标签页）⭐ **新增！**
- SEO 关键词
- 规范链接
- 社交媒体分享图片
- 结构化数据

#### 4. ⚙️ 高级设置（第四个标签页）
- 地区语言
- 来源设置

---

## 🚀 功能特性

### ✨ 自动拼音转换（已启用）

当您在"推广"标签页编辑或保存文章时：

#### 场景 1：创建新文章
1. 在"内容编辑"标签页输入标题：`市场观察：科技投资机会分析`
2. Wagtail 自动建议 slug：`市场观察科技投资机会分析`（中文）
3. **保存时自动转换**为：`shichangguancha-keji-touzi-jihui-4142`
4. 可以在"推广"标签页看到和修改

#### 场景 2：编辑现有文章
- 如果 slug 是中文，保存时自动转换为拼音
- 如果 slug 已经是英文/拼音，不会改变

#### 场景 3：手动修改 slug
- 可以在"推广"标签页直接编辑 slug
- 可以改为任何想要的值
- 如果改成中文，下次保存时会再次转换为拼音

---

## 🔄 批量修复现有文章

### 查看有多少文章需要修复

```bash
# 预览模式（不实际修改）
docker compose -f infra/local/docker-compose.yml exec authoring \
  python manage.py fix_chinese_slugs --method=pinyin --dry-run
```

### 批量修复所有中文 slug

```bash
# 使用拼音方法（推荐）
docker compose -f infra/local/docker-compose.yml exec authoring \
  python manage.py fix_chinese_slugs --method=pinyin
```

输出示例：
```
找到 44 篇中文 slug 的文章

[预览模式 - 不会实际修改]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
修复预览：

1. 文章: 市场观察：科技投资机会分析
   当前 slug: 市场观察科技投资机会分析-09月12日投资30
   新 slug: shichangguancha-keji-touzi-jihui-4142
   ✓ 会保留唯一性
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

总计: 44 篇文章需要修复
```

### 其他修复方法

```bash
# 使用ID作为slug（简单但不利于SEO）
docker compose -f infra/local/docker-compose.yml exec authoring \
  python manage.py fix_chinese_slugs --method=id --format=simple
```

---

## 📊 工作流程建议

### 对于新文章（推荐）

```
1. 创建新文章
   ↓
2. 在"内容编辑"标签页填写标题和内容
   ↓
3. 保存（或"保存草稿"）
   ↓
4. 自动转换 slug 为拼音！✅
   ↓
5. （可选）在"推广"标签页查看/修改 slug
   ↓
6. 在"SEO"标签页设置 SEO 优化
   ↓
7. 发布
```

### 对于现有文章

**选项 A：批量修复（推荐）**
```bash
# 一次性修复所有文章
docker compose -f infra/local/docker-compose.yml exec authoring \
  python manage.py fix_chinese_slugs --method=pinyin
```

**选项 B：逐个修复**
```
1. 在后台打开文章
2. 切换到"推广"标签页
3. 保存文章（无需修改内容）
4. Slug 自动转换！✅
```

---

## ⚠️ 注意事项

### URL 变更和 SEO 影响

修改 slug 会改变文章的 URL：

**修改前**：
```
http://192.168.8.195:3001/portal/article/市场观察科技投资机会分析-09月12日投资30
```

**修改后**：
```
http://192.168.8.195:3001/portal/article/shichangguancha-keji-touzi-jihui-4142
```

### 影响和应对措施

| 影响 | 说明 | 应对方案 |
|-----|------|---------|
| **搜索引擎收录** | 旧 URL 会失效，返回 404 | 实施 301 重定向 |
| **外部链接** | 其他网站的链接会失效 | 建立旧URL→新URL映射 |
| **社交媒体分享** | 已分享的链接会失效 | 保留旧URL或设置重定向 |
| **收藏/书签** | 用户保存的链接会失效 | 同上 |

### 建议策略

#### 策略 1：一次性批量修复（适合内部测试/新站）
如果网站还在开发阶段或很少有外部访问：
```bash
# 直接批量修复
docker compose -f infra/local/docker-compose.yml exec authoring \
  python manage.py fix_chinese_slugs --method=pinyin
```

#### 策略 2：保留旧URL，只修复新文章（适合生产环境）
如果网站已经上线并有外部流量：
- ✅ 新文章自动使用拼音 slug（已实现）
- ⚠️ 旧文章保持不变
- 🔄 需要时逐个手动修改并设置 301 重定向

#### 策略 3：渐进式修复 + 301重定向（推荐生产环境）
1. 记录所有旧 URL
2. 批量修复 slug
3. 实施 301 重定向规则（需要额外开发）

---

## 🧪 测试步骤

### 1. 测试新文章自动转换

1. 登录后台：`http://192.168.8.195:8000/admin/`
2. 创建新文章，标题输入中文
3. 保存
4. 切换到"🔗 推广"标签页
5. ✅ 确认 slug 已自动转换为拼音

### 2. 测试现有文章转换

1. 打开一篇旧文章（slug 是中文的）
2. 查看"🔗 推广"标签页的 slug（应该是中文）
3. 直接点击"保存"（无需修改内容）
4. 刷新页面
5. ✅ 确认 slug 已转换为拼音

### 3. 测试批量修复

```bash
# 先预览
docker compose -f infra/local/docker-compose.yml exec authoring \
  python manage.py fix_chinese_slugs --method=pinyin --dry-run

# 确认无误后执行
docker compose -f infra/local/docker-compose.yml exec authoring \
  python manage.py fix_chinese_slugs --method=pinyin
```

---

## 📚 相关文档

- **Slug 优化指南**：`/opt/idp-cms/docs/SLUG_OPTIMIZATION_GUIDE.md`
- **SEO 实施文档**：`/opt/idp-cms/docs/SEO_OPTIMIZATION_IMPLEMENTATION.md`
- **SEO 快速开始**：`/opt/idp-cms/docs/SEO_QUICK_START.md`

---

## 🆘 常见问题

### Q1: 为什么我看不到"推广"标签页？

**A**: 需要重启 authoring 服务：
```bash
docker compose -f infra/local/docker-compose.yml restart authoring
```

### Q2: Slug 没有自动转换？

**A**: 检查依赖是否安装：
```bash
docker compose -f infra/local/docker-compose.yml exec authoring pip list | grep pypinyin
```

如果没有，安装：
```bash
docker compose -f infra/local/docker-compose.yml exec authoring pip install pypinyin
```

### Q3: 修改 slug 后文章访问不了？

**A**: 这是正常的，URL 已经改变。需要：
1. 使用新 URL 访问
2. 或者实施 301 重定向

### Q4: 能不能不自动转换，让我手动输入英文？

**A**: 可以！自动转换只针对中文 slug。如果您：
1. 创建文章时直接在"推广"标签页输入英文 slug
2. 或者修改为英文 slug

系统不会再次转换，会保留您的英文 slug。

### Q5: 拼音太长怎么办？

**A**: 系统会自动限制长度（默认50字符）并在末尾添加文章ID确保唯一性。

如果还是太长，可以手动编辑为更短的英文 slug。

---

## ✅ 功能总结

| 功能 | 状态 | 说明 |
|-----|------|------|
| **推广标签页** | ✅ 已实现 | 包含 slug 编辑 |
| **SEO 标签页** | ✅ 已实现 | SEO 优化设置 |
| **自动拼音转换** | ✅ 已实现 | 保存时自动转换中文 slug |
| **批量修复工具** | ✅ 已实现 | 命令行批量修复 |
| **手动编辑 slug** | ✅ 支持 | 在推广标签页编辑 |
| **301 重定向** | ⏳ 待实现 | 需要额外开发 |

---

**更新时间**: 2025-10-10  
**版本**: 1.0

