# 文章标签自动建议功能

## 🎯 功能概述

自动为文章内容建议标签，帮助编辑快速、准确地为文章添加标签，减少同义词标签混乱问题。

### ✨ 主要特性

- **NER实体识别** - 自动识别人名、地名、机构名
- **关键词抽取** - 基于TF-IDF算法提取重要关键词
- **智能匹配** - 与现有标签库匹配，避免重复和同义词
- **置信度评分** - 为每个建议提供可信度评分
- **编辑友好** - 在Wagtail管理界面中一键操作

## 🚀 安装配置

### 1. 安装依赖包

```bash
cd /opt/idp-cms
pip install -r requirements-tag-suggestions.txt

# 或者单独安装核心包
pip install jieba scikit-learn numpy
```

### 2. 初始化jieba词库

```python
# 在Django shell中运行一次
python manage.py shell

>>> import jieba
>>> jieba.initialize()
>>> print("jieba初始化完成")
```

### 3. 配置静态文件

确保JavaScript文件被正确加载到Wagtail管理界面：

```python
# 在 apps/news/wagtail_hooks.py 中添加
from django.utils.html import format_html
from wagtail import hooks

@hooks.register('insert_global_admin_js')
def global_admin_js():
    return format_html(
        '<script src="{}"></script>',
        '/static/js/tag_suggestions.js'
    )
```

### 4. 数据库迁移

确保所有迁移都已应用：

```bash
python manage.py migrate
```

## 🎮 使用方法

### 1. 在文章编辑页面

1. 打开文章编辑页面
2. 输入标题和内容
3. 点击标签字段旁的 **"🏷️ 建议标签"** 按钮
4. 在弹出的建议中点击需要的标签
5. 保存文章

### 2. 自动建议

系统会在以下情况自动生成建议：

- 输入标题或内容后2秒（内容长度>50字符）
- 内容发生变化时

### 3. API调用

#### 基本调用

```bash
curl -X POST "http://localhost:8000/api/suggest-tags/" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "人工智能技术发展迅速",
    "content": "随着深度学习和神经网络技术的不断进步，人工智能在各个领域都取得了显著突破..."
  }'
```

#### 响应示例

```json
{
  "success": true,
  "suggestions": [
    {
      "text": "人工智能",
      "type": "exact_match",
      "confidence": 0.95,
      "is_new": false,
      "tag_id": 123
    },
    {
      "text": "深度学习",
      "type": "keyword",
      "confidence": 0.85,
      "is_new": true,
      "tag_id": null
    }
  ],
  "total_count": 2,
  "message": "找到 2 个标签建议"
}
```

## 🔧 高级配置

### 1. 自定义实体识别规则

在 `apps/news/services/tag_suggestion.py` 中修改：

```python
self.entity_patterns = {
    'person': [
        r'([\u4e00-\u9fa5]{2,3})(主席|总统|部长|市长)',
        # 添加更多人名模式
    ],
    'location': [
        r'([\u4e00-\u9fa5]{2,6})(省|市|县|区)',
        # 添加更多地名模式
    ],
    # 添加新的实体类型
    'technology': [
        r'([\u4e00-\u9fa5]{2,8})(技术|系统|平台|算法)',
    ]
}
```

### 2. 调整匹配算法

```python
# 修改模糊匹配阈值
if ratio > best_ratio and ratio > 0.8:  # 改为0.7降低要求

# 修改置信度计算
confidence = base_confidence * ratio * keyword_weight
```

### 3. 集成外部API

可以集成第三方NLP服务：

```python
class ExternalNLPProcessor:
    def __init__(self):
        self.api_key = settings.NLP_API_KEY
        
    def extract_entities(self, text):
        # 调用百度AI、腾讯云等API
        response = requests.post(
            'https://aip.baidubce.com/rpc/2.0/nlp/v1/lexer',
            headers={'Content-Type': 'application/json'},
            json={'text': text}
        )
        return self.parse_response(response.json())
```

## 📊 监控和维护

### 1. 检查服务状态

```bash
curl "http://localhost:8000/api/tag-suggestion-status/"
```

### 2. 性能监控

在Django日志中查看标签建议的性能：

```bash
tail -f logs/django.log | grep "tag_suggestion"
```

### 3. 标签质量优化

定期分析标签使用情况：

```python
# Django shell
from taggit.models import Tag
from django.db.models import Count

# 查看最常用的标签
popular_tags = Tag.objects.annotate(
    usage_count=Count('taggit_taggeditem_items')
).order_by('-usage_count')[:50]

for tag in popular_tags:
    print(f"{tag.name}: {tag.usage_count} 次使用")
```

### 4. 同义词合并

```python
# 手动合并同义词标签
def merge_duplicate_tags(primary_tag_name, duplicate_names):
    from taggit.models import Tag, TaggedItem
    
    primary_tag = Tag.objects.get(name=primary_tag_name)
    
    for dup_name in duplicate_names:
        try:
            dup_tag = Tag.objects.get(name=dup_name)
            # 将所有使用重复标签的内容改为使用主标签
            TaggedItem.objects.filter(tag=dup_tag).update(tag=primary_tag)
            dup_tag.delete()
            print(f"已合并 {dup_name} → {primary_tag_name}")
        except Tag.DoesNotExist:
            print(f"标签 {dup_name} 不存在")

# 使用示例
merge_duplicate_tags("人工智能", ["AI", "artificial intelligence", "机器智能"])
```

## 🐛 故障排除

### 常见问题

1. **jieba初始化失败**
   ```bash
   # 重新安装jieba
   pip uninstall jieba
   pip install jieba
   ```

2. **标签建议按钮不显示**
   - 检查静态文件是否正确加载
   - 确认wagtail_hooks.py中的JavaScript引入
   - 查看浏览器控制台错误

3. **API返回500错误**
   - 检查Django日志
   - 确认依赖包已安装
   - 验证数据库连接

4. **中文分词效果不好**
   - 添加自定义词典：`jieba.load_userdict('userdict.txt')`
   - 调整分词模式：`jieba.cut(text, cut_all=False)`

### 性能优化

1. **缓存建议结果**
```python
from django.core.cache import cache

def get_cached_suggestions(content_hash, title, content):
    cache_key = f"tag_suggestions:{content_hash}"
    suggestions = cache.get(cache_key)
    
    if not suggestions:
        suggestions = self.generate_suggestions(title, content)
        cache.set(cache_key, suggestions, 3600)  # 缓存1小时
    
    return suggestions
```

2. **异步处理**
```python
from celery import shared_task

@shared_task
def generate_tag_suggestions_async(article_id):
    # 后台异步生成建议
    pass
```

## 📈 功能扩展

### 1. 机器学习优化

- 收集用户选择数据训练模型
- 基于文章类别调整建议权重
- 实现个性化标签建议

### 2. 批量处理

- 为历史文章批量生成标签建议
- 标签质量批量检查和清理
- 导出标签使用报告

### 3. 多语言支持

- 英文内容的标签建议
- 其他语言的NLP处理
- 跨语言标签映射

---

**联系支持**: 如有问题请联系开发团队或查看项目文档。
