## 搜索系统功能分析与实现方案（对标今日头条）

### 目标与范围
- **目标**: 构建“今日头条级”的站内搜索体验，覆盖检索、建议、热搜、历史、筛选、相关搜索、个性化排序与数据闭环。
- **范围**: 前端交互、Next.js API（代理/编排）、Django API、OpenSearch 查询与索引、ClickHouse 行为埋点、缓存与风控、监控与验收。

### 用户体验与交互（UX）
- **搜索入口**:
  - 桌面端顶部完整搜索框；移动端图标点击展开；ESC 关闭；Enter 提交；支持键盘上下选择建议。
  - 输入节流: 150–250ms 防抖；空白/重复请求拦截；长度上限与非法字符过滤。
- **实时搜索建议（Autocomplete）**:
  - 来源: 近30天高频查询、词典分词、文章标题前缀、同义词词库。
  - 展示: 8–10 条；高亮匹配片段；支持鼠标与键盘选择。
  - 质量: 去重、去停用词、按热度/新鲜度/点击率综合排序。
- **搜索历史（本地与服务端可选）**:
  - 本地 sessionStorage（匿名）+ 可选 server 侧（登录态）；至多 10–20 条；提供清空功能。
- **热搜榜（Trending）**:
  - 维度: 全站、按频道；近5分钟/1小时/24小时多窗口融合；突发权重提升。
  - 展示: Top10 列表，标注“飙升/新入榜”。
- **纠错/联想**:
  - 拼写纠错: 输入错误时给出“你要找的是：xxx？”；
  - 同义词/别名扩展: 如“AI/人工智能”、“篮球/NBA”。
- **筛选与排序（SERP 顶部工具条）**:
  - 筛选: 时间（近24h/7天/30天）、频道、地区、是否含图视频等；
  - 排序: 相关度优先（默认）、最新优先、热度优先。
- **结果页（SERP）**:
  - 列表卡片：标题高亮、摘要高亮、来源/时间、频道标签、封面图（可选）。
  - 空结果引导：展示改写建议、相关搜索、热门内容兜底。
  - 分页/游标：支持 cursor-based 翻页，稳定去重。

### 系统架构与数据流
```mermaid
flowchart LR
U[用户输入] --> F[前端搜索框]
F -->|/api/search/suggest?q=| NX[Next.js API]
F -->|/portal/search?q=| SERP[搜索结果页]
SERP -->|/api/search?q=&filters| NX
NX --> DJ[Django API]
DJ --> OS[(OpenSearch)]
DJ <-- CH[(ClickHouse埋点)]
NX <-- CDN/Cache --> U
SERP -->|search_query/search_click| CH
```

### 后端能力设计
- **召回（Recall）**:
  - OpenSearch 多字段 BM25 检索：`title^5 + summary^2 + body`，频道/地区为过滤条件；
  - 同义词扩展（synonyms）、分词词典（IK/自定义）与前缀匹配（edge_ngram）。
- **排序与重排（Ranking & Re-ranking）**:
  - 相关度分：BM25/字段加权；
  - 新鲜度分：按发布时间衰减（半衰期可调）；
  - 热度分：点击率、阅读量、收藏转发等（多源归一）；
  - 个性化分：结合匿名兴趣画像（频道/主题偏好）；
  - 点击提升：对近7天 SERP 点击过的文档做位置提升；
  - 统一得分：
    - `final_score = w_rel*rel + w_recency*recency + w_pop*pop + w_personal*personal + w_clickboost*click`
- **建议（Suggest）**:
  - prefix/edge-ngram 索引，支持`completion suggester`或自建索引；
  - 召回来源融合：热搜词、标题前缀、常见纠错映射；
  - 返回结构：`{text, type: [query|entity|channel], reason, score}`。
- **相关搜索（Related Queries）**:
  - 基于共点（co-click/co-query）、标签同现、向量近邻（可选）；
  - 零/小样本时使用规则兜底（近义词、频道热门）。
- **高亮**:
  - OS 高亮片段裁剪，前端再次安全渲染；最长摘要限制避免抖动。
- **分页**:
  - `size` 10–20；游标分页优先，避免深翻页性能问题。

### 数据与埋点（ClickHouse）
- **事件定义**：
  - `search_query`：查询发起 `{query, filters, from, device, result_count}`
  - `search_suggest_select`：点选建议 `{query, suggest_text, rank}`
  - `search_click`：点击结果 `{query, article_id, rank, position, dwell_ms}`
  - `search_refine`：二次改写 `{prev_query, new_query}`
  - `serp_dwell`：结果页停留 `{query, dwell_ms}`
- **用途**：热搜统计、点击率学习、相关搜索挖掘、质量评估与 A/B 测试。

### API 设计（对外契约）
- **检索**
```http
GET /api/search?q=关键词&page=1&limit=20&sort=rel|time|hot&channel=xxx&region=xxx&since=24h
200 { success, total, page, limit, data: [ { id, title, excerpt, image_url, source, publish_at, channel, url, highlight } ], query }
```
- **建议**
```http
GET /api/search/suggest?q=关
200 { success, data: [ { text, type, reason, score } ] }
```
- **热搜**
```http
GET /api/search/trending?site=aivoya.com&channel=all&window=1h
200 { success, data: [ { text, rank, change, score } ] }
```
- **相关搜索**
```http
GET /api/search/related?q=关键字
200 { success, data: [ "相关词1", "相关词2" ] }
```

### 前端实现要点（Next.js + React）
- 搜索框组件：
  - 受控输入 + 150–250ms 防抖；
  - 建议下拉：键盘导航、焦点管理、点击外部关闭；
  - 本地历史：最近 10–20 条，提供清空；
  - SSG/ISR：搜索页不做静态化，API 层使用 `Cache-Control: s-maxage=300, stale-while-revalidate=600`。
- SERP：
  - 顶部工具条（筛选/排序/相关搜索）；
  - 结果卡高亮、占位骨架、错误与空结果兜底；
  - 滚动加载或分页，保序与去重。

### OpenSearch 设计
- **索引与映射**：
  - `articles`：`title`(text, keyword), `summary`, `body`, `channel`, `region`, `publish_at`, `hot_score`；
  - `suggestions`：`text`(edge_ngram/completion), `type`, `hot_score`, `source`；
  - 同义词与停用词词典按站点维护。
- **查询模板（伪）**：
```json
{
  "query": {
    "bool": {
      "must": [
        { "multi_match": { "query": "${q}", "fields": ["title^5","summary^2","body"] } }
      ],
      "filter": [
        { "term": { "channel": "${channel}" } },
        { "range": { "publish_at": { "gte": "now-${since}" } } }
      ]
    }
  },
  "sort": [ { "_score": "desc" }, { "publish_at": "desc" } ],
  "highlight": { "fields": { "title": {}, "summary": {}, "body": {} } }
}
```

### 性能、缓存与稳定性
- CDN/边缘缓存 Next.js API 响应；后端查询设置超时与降级；
- 搜索建议使用本地 LRU 缓存（短期 30–60s）；
- 大促/峰值时启用只读热词与热门结果缓存；
- 断路器与重试策略；慢查询日志与阈值告警。

### 安全与风控
- 频率限制（IP/设备/用户）；
- 参数校验与长度限制；
- 反爬虫策略（Header 校验、动态规则、行为评分、必要时验证码）；
- 敏感词过滤与合规处理（命中时提示并不返回内容）。

### 监控与指标
- 指标：请求量、成功率、P95 延迟、SERP 点击率、无结果率、建议点击率、改写率、返回耗时分布；
- 告警：错误率、超时率、热词计算失败、OS 集群健康（`yellow/red`）。

### 里程碑与验收标准
- **P0（修复与打通）**
  - 修复前端 `sites/app/api/search/route.ts` 参数与后端不一致问题：后端接受 `q`，前端当前传 `search`，需改为 `q`；
  - 基础检索可用：`/portal/search?q=关键词` 正常返回且高亮；
  - 埋点：`search_query`/`search_click` 生效。
- **P1（体验增强）**
  - 上线 `suggest`/`trending`/`history`；
  - SERP 筛选与排序；空结果兜底与相关搜索；
  - 监控仪表盘与告警。
- **P2（智能化）**
  - 个性化排序融合；点击提升；A/B 测试与评估。
- **P3（高级能力）**
  - 拼写纠错、同义词管理后台；多模态搜索（图文混排/视频）。

### 已知差距与立即修复项
- 前端搜索 API 400：高概率由参数名不一致导致（`search` → `q`），需立即修复并联调；
- 结果高亮与相关搜索未接入；
- 搜索建议与热搜尚未实现；
- 行为埋点未覆盖 SERP 停留与改写事件。

### 验收用例（抽样）
- 输入“科技”显示建议；回车进入 SERP，默认相关度排序且含高亮；
- 切换“近7天/最新优先/财经频道”均生效；
- 空查询提示；拼写“苯马史”提示“本马斯/本马史”纠错；
- 热搜榜展示近1小时榜单；
- 点击第3条结果后返回 SERP，后续同查询第3条有轻微位置提升（点击提升）。


