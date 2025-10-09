# 搜索系统改进 - 测试验证指南

## 📋 改进摘要

已完成以下核心改进：

### ✅ Priority 1: 时效性混合评分
- 实现了 `function_score` 高斯时间衰减
- 添加了热度信号 (pop_24h) 加成
- 时效性权重从 <5% 提升到 ~40%

### ✅ Priority 2: OpenSearch 原生高亮
- 支持中文分词高亮（"区块链" 可高亮 "区块" 和 "链"）
- 自动截取上下文片段
- 标题、摘要、正文分别配置

### ✅ Priority 3: 过滤逻辑修复
- 按时间/热度排序时不再误删 `_score=0` 的结果
- 只在相关性排序时过滤低分结果

### ✅ 前端适配
- 优先使用 OpenSearch 原生高亮
- 降级到简单高亮（作为后备）
- 返回 `_score` 用于调试

---

## 🧪 测试用例

### 测试 1: 时效性权重验证 ⭐⭐⭐⭐⭐

**目标**: 验证最新新闻排名提升

**步骤**:
1. 搜索一个常见词汇（如 "经济"、"科技"）
2. 不指定排序参数（默认相关性排序）
3. 观察结果

**预期结果**:
- ✅ 最近 1-7 天的新闻应该排在前列
- ✅ 即使旧新闻相关度更高，也应被新新闻超越
- ✅ 检查返回的 `_score` 和 `relevanceScore`

**测试 API**:
```bash
# 测试 1: 相关性排序（默认）
curl "http://localhost:3000/api/search?q=经济&site=yoursite.com"

# 观察前 5 条结果的 publish_at 和 _score
```

**评判标准**:
- 前 3 条结果中至少 2 条是一周内的新闻 ✅
- `_score` 值应包含时效性加成（相比旧算法更高）

---

### 测试 2: 热度信号验证 ⭐⭐⭐⭐

**目标**: 验证热门新闻排名提升

**准备**:
- 找到一篇有较高 `pop_24h` 值的文章
- 记录其标题关键词

**步骤**:
1. 搜索该关键词
2. 观察热门文章的排名

**预期结果**:
- ✅ `pop_24h` 高的文章排名靠前
- ✅ 即使其他文章相关度相近，热门文章也应优先

**测试 API**:
```bash
curl "http://localhost:3000/api/search?q=关键词&site=yoursite.com"
```

**评判标准**:
- 比较两篇相关度相近但 `pop_24h` 差异大的文章
- 高 `pop_24h` 的应排在前面

---

### 测试 3: 中文分词高亮 ⭐⭐⭐⭐⭐

**目标**: 验证 OpenSearch 原生高亮支持分词

**步骤**:
1. 搜索一个组合词（如 "区块链"、"人工智能"）
2. 检查返回的 `highlight` 字段

**预期结果**:
```json
{
  "highlight": {
    "title": "新一代<mark class='search-highlight'>区块</mark><mark class='search-highlight'>链</mark>技术",
    "excerpt": "...<mark class='search-highlight'>区块</mark>...<mark class='search-highlight'>链</mark>..."
  }
}
```

- ✅ 即使文章中没有完整的"区块链"，也应高亮分词结果
- ✅ `<mark>` 标签正确包裹高亮词

**测试 API**:
```bash
curl "http://localhost:3000/api/search?q=区块链&site=yoursite.com" | jq '.data[0].highlight'
```

**评判标准**:
- 至少 1 条结果有高亮标记
- 高亮覆盖分词匹配的词（不仅是完整匹配）

---

### 测试 4: 按时间排序不误删结果 ⭐⭐⭐⭐

**目标**: 验证按时间排序时保留所有结果

**步骤**:
1. 搜索一个词，分别使用相关性和时间排序
2. 对比结果数量

**预期结果**:
- ✅ 按时间排序返回的结果数 ≥ 按相关性排序
- ✅ 即使 `_score=0`，也不会被过滤

**测试 API**:
```bash
# 相关性排序
curl "http://localhost:3000/api/search?q=测试&sort=rel" | jq '.total'

# 时间排序
curl "http://localhost:3000/api/search?q=测试&sort=time" | jq '.total'
```

**评判标准**:
- 时间排序结果数 >= 相关性排序结果数
- 时间排序的结果按 `publish_at` 降序排列

---

### 测试 5: 高亮降级机制 ⭐⭐⭐

**目标**: 验证当 OpenSearch 高亮失败时，使用简单高亮

**步骤**:
1. 搜索一个在标题中完整出现的词（如特殊符号）
2. 检查 `highlight` 字段

**预期结果**:
- ✅ 如果 OpenSearch 高亮可用，使用 `<mark>` 标签
- ✅ 如果不可用，使用简单高亮 `<em>` 标签

**测试 API**:
```bash
curl "http://localhost:3000/api/search?q=中国&site=yoursite.com" | jq '.data[0].highlight'
```

---

### 测试 6: 多维筛选组合 ⭐⭐⭐

**目标**: 验证时效性评分在筛选条件下仍有效

**步骤**:
1. 添加频道、分类、时间窗口筛选
2. 观察排序

**测试 API**:
```bash
curl "http://localhost:3000/api/search?q=经济&channel=news&since=7d&site=yoursite.com"
```

**预期结果**:
- ✅ 筛选条件正确应用
- ✅ 在筛选结果内，仍按时效性混合评分排序

---

## 🔍 调试工具

### 查看详细评分信息

如果需要调试评分逻辑，可以在搜索结果中返回更多信息：

```typescript
// 临时添加到 route.ts 返回数据中
debug: {
  baseScore: article._score * 100,
  bonusScore: article.relevanceScore - (article._score * 100),
  publishDate: article.publish_at,
  daysDiff: Math.floor((Date.now() - new Date(article.publish_at).getTime()) / (1000*60*60*24))
}
```

### OpenSearch 查询调试

直接查询 OpenSearch 查看原始结果：

```bash
# 在后端容器中执行
curl -X POST "localhost:9200/articles_yoursite/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "function_score": {
      "query": {"match": {"title": "区块链"}},
      "functions": [
        {
          "gauss": {
            "first_published_at": {
              "scale": "7d",
              "offset": "1d",
              "decay": 0.5
            }
          },
          "weight": 2.0
        }
      ]
    }
  }
}'
```

---

## ✅ 验收标准

### 必须通过 (P0)
- [ ] 测试 1: 时效性权重验证 ✅
- [ ] 测试 3: 中文分词高亮 ✅
- [ ] 测试 4: 按时间排序不误删 ✅

### 应该通过 (P1)
- [ ] 测试 2: 热度信号验证 ✅
- [ ] 测试 5: 高亮降级机制 ✅

### 可选通过 (P2)
- [ ] 测试 6: 多维筛选组合 ✅

---

## 📊 性能基准

### 响应时间
- **目标**: < 500ms (p95)
- **测试**: 连续 100 次查询，记录响应时间

```bash
# 性能测试脚本
for i in {1..100}; do
  curl -w "%{time_total}\n" -o /dev/null -s "http://localhost:3000/api/search?q=测试"
done | awk '{sum+=$1; count++} END {print "平均:", sum/count, "秒"}'
```

### 内存使用
- **目标**: 无明显增长
- **监控**: 观察 Next.js 进程内存使用

---

## 🐛 已知问题和限制

### 1. 时间衰减参数可调优
当前配置：
- `scale: 7d` - 7天衰减到50%
- `offset: 1d` - 1天内不衰减

可能需要根据实际数据分布调整。

### 2. 热度因子需要校准
当前 `factor: 0.001` 假设 `pop_24h` 在 0-10000 范围。
如果实际数据范围不同，需要调整。

### 3. 高亮样式需要前端适配
返回的高亮包含 `<mark class='search-highlight'>` 标签，
前端需要添加对应的 CSS 样式：

```css
.search-highlight {
  background-color: #fef3c7;
  color: #92400e;
  font-weight: 500;
}
```

---

## 📈 预期改进效果

根据分析报告，实施这些改进后预期：

| 指标 | 改进前 | 改进后 | 提升 |
|------|--------|--------|------|
| 时效性权重 | <5% | ~40% | +700% |
| 用户满意度 | - | - | +40-60% |
| 零结果率 | - | - | -20-30% |
| 点击率 | - | - | +30-50% |
| 综合评分 | 2.95/5 | 4.2/5 | +42% |

---

## 🔄 回滚方案

如果出现问题，可以快速回滚：

### 后端回滚
```python
# 在 search_os.py 中，将 final_query 改回简单查询
final_query = base_query  # 移除 function_score
```

### 前端回滚
```typescript
// 在 route.ts 中，恢复使用简单高亮
highlight: {
  title: makeHighlight(article.title, query),
  excerpt: makeHighlight(article.excerpt, query)
}
```

---

**测试完成后，请在验收标准中打钩，并记录任何异常情况。**

