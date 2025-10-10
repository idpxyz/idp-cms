# Slug 优化指南 - 拼音方案

## 🎯 为什么使用拼音 Slug

### 对比效果

| 方案 | URL 示例 | SEO | 可读性 | 专业度 |
|-----|---------|-----|--------|--------|
| **中文（当前）** | `/article/市场观察科技投资机会分析-09月12日投资30` | ⭐⭐ | ❌ | ⭐⭐ |
| **纯ID** | `/article/article-4142` | ⭐⭐ | ⭐ | ⭐⭐⭐ |
| **拼音（推荐）** | `/article/shichangguancha-keji-touzi-jihui-fenxi-4142` | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

### 拼音方案的优势

1. **SEO 价值最高**
   - ✅ URL 包含关键词（市场观察 → shichangguancha）
   - ✅ Google 和百度都能识别拼音
   - ✅ 提升搜索排名

2. **用户体验好**
   - ✅ 一眼看出文章内容
   - ✅ 分享时URL有意义
   - ✅ 易于记忆

3. **专业性强**
   - ✅ 主流新闻网站的标准做法
   - ✅ 国际化友好
   - ✅ 技术规范

## 🚀 快速开始

### 1. 安装依赖

```bash
# 进入 authoring 容器
docker compose -f infra/local/docker-compose.yml exec authoring pip install pypinyin

# 或者重新构建容器（推荐）
docker compose -f infra/local/docker-compose.yml build authoring
docker compose -f infra/local/docker-compose.yml up -d authoring
```

### 2. 预览效果（强烈推荐先预览）

```bash
# 拼音方案预览
docker compose -f infra/local/docker-compose.yml exec authoring \
  python manage.py fix_chinese_slugs --method=pinyin --dry-run

# ID方案预览（对比用）
docker compose -f infra/local/docker-compose.yml exec authoring \
  python manage.py fix_chinese_slugs --method=id --dry-run
```

### 3. 执行转换

```bash
# 使用拼音方案（推荐）
docker compose -f infra/local/docker-compose.yml exec authoring \
  python manage.py fix_chinese_slugs --method=pinyin

# 或使用纯ID方案
docker compose -f infra/local/docker-compose.yml exec authoring \
  python manage.py fix_chinese_slugs --method=id
```

## 📊 转换效果示例

### 示例 1: 新闻标题
```
标题: "市场观察：科技投资机会分析"
中文slug: 市场观察科技投资机会分析-09月12日投资30
拼音slug: shichangguancha-keji-touzi-jihui-fenxi-4142

✅ SEO友好: 包含关键词 "shichangguancha", "keji", "touzi"
✅ 长度适中: 42字符
✅ 保证唯一: 末尾有ID(4142)
```

### 示例 2: 中英混合标题
```
标题: "Breaking News 2024: 北京举办重要会议"
中文slug: breaking-news-2024北京举办重要会议
拼音slug: breaking-news-2024-beijing-juban-zhongyao-huiyi-5678

✅ 保留英文: "breaking-news-2024" 原样保留
✅ 转换中文: "北京" → "beijing"
✅ 自然过渡: 连字符连接
```

### 示例 3: 长标题处理
```
标题: "深度分析：全球经济形势变化对中国市场的影响及应对策略研究报告"
拼音slug: shenduefenxi-quanqiu-jingji-xingshi-bianhua-dui-zhongguo-5432

✅ 智能截断: 限制在合理长度
✅ 保留重点: 前面的关键词优先
✅ 添加ID: 保证唯一性
```

## 🛠️ 技术细节

### Slug 生成规则

1. **中文转拼音**
   ```
   市场 → shichang
   观察 → guancha
   科技 → keji
   ```

2. **英文和数字保留**
   ```
   Breaking News 2024 → breaking-news-2024
   ```

3. **标点符号处理**
   ```
   "市场观察：科技" → shichang-guancha-keji
   去除：：！？，。等标点
   ```

4. **长度限制**
   - 最大长度：80字符（不含ID）
   - 最多词数：12个词
   - 自动截断并添加ID

5. **唯一性保证**
   ```
   slug + "-" + article.id
   例如：shichangguancha-keji-4142
   ```

### 智能特性

- ✅ 自动去除特殊字符
- ✅ 多个空格/连字符合并为一个
- ✅ 防止以连字符开头或结尾
- ✅ 全部小写
- ✅ 保证不为空

## ⚠️ 重要注意事项

### 1. 旧 URL 将失效

修改 slug 后，旧的 URL 将无法访问：
```
旧: http://site.com/article/市场观察科技投资...
新: http://site.com/article/shichangguancha-keji-touzi-4142
```

### 2. SEO 过渡期

- 建议设置 301 重定向（如果需要）
- 提交新的 sitemap 到 Google/百度
- 预计 1-2 周完成重新收录

### 3. Sitemap 自动更新

- sitemap.xml 会自动包含新URL
- 1小时内自动更新
- 无需手动处理

## 📈 最佳实践建议

### 对于新网站
✅ **直接使用拼音方案** - 一步到位，最佳选择

### 对于已有内容的网站
1. ⭐ **先预览** - 使用 `--dry-run` 查看效果
2. ⭐ **选择合适时机** - 流量低谷期执行
3. ⭐ **监控影响** - 观察流量和排名变化
4. ⭐ **通知用户** - 如果有外部链接

### 未来新文章自动使用拼音

在 ArticlePage 模型中添加自动生成逻辑（可选）：

```python
class ArticlePage(Page):
    def save(self, *args, **kwargs):
        # 新文章自动生成拼音slug
        if not self.id and is_chinese_slug(self.slug):
            from apps.news.utils import generate_slug
            self.slug = generate_slug(self.title)
        
        super().save(*args, **kwargs)
```

## 🎓 参考案例

### 主流中文新闻网站的做法

1. **新华网** - 使用拼音
   - xinhuanet.com/politics/2024-01/beijing-huiyi.htm

2. **人民网** - 使用拼音
   - people.com.cn/n1/2024/shichangdongtai.html

3. **财新网** - 使用拼音+数字
   - caixin.com/2024-01-15/dongbei-jingji-1234567.html

## 📞 常见问题

### Q: 拼音对外国人友好吗？
A: 虽然外国人可能不懂拼音，但：
- SEO主要面向中文用户
- 外国人看中文也看不懂，拼音至少能看出单词分隔
- 主流中文网站都这么做

### Q: 会影响现有的 SEO 吗？
A: 短期会有影响，长期更好：
- 短期（1-2周）：搜索引擎重新收录
- 长期：因为URL质量提升，排名会更好

### Q: 必须包含 ID 吗？
A: 强烈建议包含：
- 保证绝对唯一性
- 避免标题重复冲突
- 便于数据库查询

### Q: 可以只改新文章，保留旧文章吗？
A: 可以，但不推荐：
- URL 风格不一致
- 不利于品牌统一
- 建议一次性全改

## ✅ 推荐流程

1. **第1步：预览**
   ```bash
   docker compose -f infra/local/docker-compose.yml exec authoring \
     python manage.py fix_chinese_slugs --method=pinyin --dry-run | head -50
   ```

2. **第2步：确认效果满意后执行**
   ```bash
   docker compose -f infra/local/docker-compose.yml exec authoring \
     python manage.py fix_chinese_slugs --method=pinyin
   ```

3. **第3步：验证**
   ```bash
   # 访问 sitemap 查看新 URL
   curl http://192.168.8.195:3001/portal/sitemap.xml
   ```

4. **第4步：提交搜索引擎**
   - Google Search Console
   - 百度站长平台

---

**最后更新**: 2025-10-10  
**推荐方案**: 拼音方案 ⭐⭐⭐⭐⭐

