## 项目概览

面向资讯型门户与企业内容平台的智能搜索与推荐系统，提供“今日头条级”搜索体验：覆盖中文分词、高亮、建议与历史、热搜榜、相关搜索、筛选与排序，以及个性化频道推荐与行为追踪分析，兼顾性能、安全与合规。

### 为客户带来的价值
- **更高的检索效率**：搜索建议与历史降低输入成本，相关搜索扩展信息获取半径。
- **更强的内容分发能力**：热搜榜与个性化频道提升分发效率与点击率。
- **更好的可观测性**：全链路搜索与停留（dwell）埋点，助力运营增长与产品迭代。
- **企业级安全与合规**：参数校验、敏感词过滤、降级策略与审计日志。

---

## 核心能力一览

### 搜索体验（SERP）
- **中文分词与相关性**：基于 jieba 分词与多字段加权匹配（标题/摘要/正文），支持短语优先、重要词加权与长词偏好。
- **高亮渲染**：结果标题与摘要关键字高亮，提升可读性与点击意愿。
- **搜索建议（Autocomplete）**：输入实时返回建议，融合本地历史与服务端候选。
- **搜索历史**：本地保存 10–20 条可清空，空框聚焦即显“最近搜索”。
- **热搜榜（Trending）**：基于 ClickHouse 实时聚合，支持 5m/1h/24h 窗口与状态标识（热/升/降/新/稳）。
- **相关搜索**：基于启发式规则（后续可接入共点/共词/co-query）。
- **筛选与排序**：支持时间窗口（今天/7天/30天）与排序（相关度/最新/热度）。
- **分页策略**：默认每页 10 条，稳定展示，避免深翻页性能退化。

### 个性化与频道导航
- **个性化频道列表**：结合匿名兴趣画像与频道权重，动态排序，全量可见，推荐优先靠前。
- **智能更多与重排**：从“更多”点击的频道自动顶至可视区域尾部，替换末位频道。
- **自适应宽度**：基于 ResizeObserver 动态计算可见频道数，PC/移动一致体验。

### 行为追踪与分析
- **事件上报**：search、dwell、click、view 等，统一经后端落地至 ClickHouse。
- **停留时间（Dwell）**：IntersectionObserver 计算可视区域停留时长，前端去噪（<100ms 忽略）。
- **搜索链路追踪**：支持 query、SERP 停留、结果点击等关键链路指标分析。

### 安全与合规
- **请求参数校验**：拦截 SQL 注入/XSS/危险字符；分页与排序白名单校验。
- **敏感词过滤**：基于可维护词库的查询合规校验；结果侧可选过滤。
- **降级与兜底**：接口异常时返回温和降级数据（热搜/建议等），保证体验连续性。

### 性能与可靠性
- **缓存与超时**：前端 API 设置 CDN 缓存头；后端接口含合理超时与失败回退。
- **ETag/条件请求（Conditional Requests）**：
  - 后端为列表与详情类 GET 接口计算并返回 `ETag`（见 `generate_etag`）。
  - 客户端/边缘可携带 `If-None-Match` 发起条件请求，命中直接返回 `304 Not Modified`，显著降低回源与响应体传输成本。
  - 对静态不频繁更新的资源可结合 `Last-Modified/If-Modified-Since`（按需开启）。
- **Surrogate-Key（CDN 软失效）**：
  - 响应头标注 `Surrogate-Key`（见 `generate_surrogate_keys`），按站点/频道/资源维度标记。
  - 运营侧可对某一类内容执行选择性软失效，避免全量清缓存（更快更稳）。
- **Cache-Control 策略**：
  - BFF 层为可缓存接口设置：`Cache-Control: public, s-maxage=300, stale-while-revalidate=600`。
  - 结合 CDN 启用 `SWR`，保障流量高峰时命中率与回源受控。
  - 私有数据或易变数据不设置 CDN 缓存，或标记 `no-store`。
- **稳定可回退**：接口异常时启用降级（默认热搜/建议/频道），保证用户无感知或低扰动体验。
- **SSR/CSR 兼容**：组件“客户端安全访问”处理 window 对象与导航行为。
- **稳态 UI**：空结果/错误/加载骨架等多状态友好展示。

---

## 技术架构

### 整体架构
- **前端**：Next.js（App Router），组件化 SERP 与导航，API Route 作为 BFF 层。
- **后端**：Django REST Framework，统一鉴权、过滤、排序与数据聚合。
- **数据/分析**：ClickHouse 存储行为事件与热搜聚合，Wagtail/Article 模型为内容源。
- **任务调度**：Celery Beat 周期任务，日志/调度路径使用 /tmp 规避权限问题。

### 关键技术点
- **中文检索**：jieba 分词 + 多字段权重 + 短语优先 + 重要词（如“国家/政府”）加权。
- **热搜计算**：滑动窗口 + 去噪规则（空/低频过滤）+ 状态标识计算。
- **自适应导航**：ResizeObserver 计算可见区；“更多”与主区双向置换。
- **前端追踪**：事件批量上报，冪等与阈值控制，dwell 去噪。

---

## 关键接口说明（BFF/后端）

### 搜索
- **GET `/api/search`**（BFF）
  - **参数**：`q`、`page`、`limit`、`since`（24h/7d/30d）、`sort`（rel/time/hot）
  - **返回**：列表（含高亮字段、封面、来源、时间、URL）、`total`
  - **安全**：参数校验 + 敏感词校验，错误消息前端直显
  - **示例**：
    - 请求：`/api/search?q=科技&since=7d&sort=time&page=1&limit=10`
    - 响应（节选）：
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "title": "市场观察：科技投资机会分析",
      "highlight": {"title": "市场观察：<em>科技</em>投资机会分析", "excerpt": "…<em>科技</em>产业…"},
      "excerpt": "……",
      "image_url": "https://cdn.example.com/covers/123.jpg",
      "url": "/portal/article/slug",
      "source": "新华社",
      "publish_at": "2025-09-10T08:00:00Z"
    }
  ],
  "total": 345,
  "page": 1,
  "limit": 10,
  "query": "科技"
}
```

### 搜索建议
- **GET `/api/search/suggest`**（BFF→后端）
  - **参数**：`q`、`limit`
  - **返回**：建议列表（类型/理由/得分）
  - **示例**：
```json
{
  "success": true,
  "data": [
    {"text": "科技新闻", "type": "default", "reason": "热门搜索", "score": 70},
    {"text": "科技分析", "type": "default", "reason": "热门搜索", "score": 55}
  ],
  "query": "科技"
}
```

### 热搜榜
- **GET `/api/search/trending`**（BFF→后端）
  - **参数**：`window`（5m/1h/24h）、`limit`、`channel?`
  - **返回**：热词、排名、变化（hot/up/down/new/stable）、计数等
  - **示例**：
```json
{
  "success": true,
  "data": [
    {"text": "科技", "rank": 1, "change": "hot", "score": 1101, "count": 110},
    {"text": "国家政策", "rank": 2, "change": "up", "score": 263, "count": 26}
  ],
  "window": "1h",
  "site": "aivoya.com"
}
```

### 个性化频道
- **GET `/api/channels/personalized`**（BFF→后端）
  - **返回**：全量频道，含推荐权重、排序与理由；异常时返回全量静态频道兜底
  - **示例**：
```json
{
  "success": true,
  "channels": [
    {"slug": "recommend", "name": "推荐", "weight": 1.0, "reason": "系统默认"},
    {"slug": "technology", "name": "科技", "weight": 0.86, "reason": "近期关注科技内容"}
  ]
}
```

### 行为追踪
- **POST `/api/track`**（后端）
  - **字段**：`event`、`article_ids[]`、`channel`、`site`、`dwell_ms?`、`search_query?`、`ts`
  - **落地**：ClickHouse `events` 表（含 dwell_ms 与 search_query 字段）

---

## 事件追踪规范（Analytics Schema）

### 统一事件上报 `/api/track`
- **公共字段**：
  - `ts`（可选，ms）：事件时间戳，缺省由服务端生成 UTC 时间
  - `event`：`search` | `dwell` | `click` | `view`
  - `article_ids[]`：关联文章 ID 列表（search 事件可为空）
  - `channel`：频道上下文（默认 recommend）
  - `site`：站点标识（hostname）
- **事件特有字段**：
  - `dwell_ms`：停留毫秒（前端忽略 <100ms；文章页通常上报 >5000ms）
  - `search_query`：搜索查询词（仅 `event=search`）

### 上报示例
```json
{
  "event": "search",
  "article_ids": [],
  "search_query": "科技",
  "channel": "search",
  "site": "aivoya.com",
  "ts": 1694764800000
}
```
```json
{
  "event": "dwell",
  "article_ids": ["12345"],
  "dwell_ms": 12000,
  "channel": "technology",
  "site": "aivoya.com"
}
```

### ClickHouse 落库（`events` 表）
- 字段：`ts`, `user_id`, `device_id`, `session_id`, `event`, `article_id`, `channel`, `site`, `dwell_ms`, `search_query`
- 热搜查询示例：按时间窗聚合 `search_query` 的 `COUNT(*)` 与 `COUNT(DISTINCT device_id)` 排序

---

## 限流与错误模型

### 限流（Rate Limit）
- 核心接口（如 `/api/articles/`）支持可配置限流装饰器，按 IP/设备/用户三种维度组合，防止恶意刷请求与突发流量冲击。
- 典型策略：每分钟 N 次、每小时 M 次（可按环境/站点调整）。

### 错误与降级
- **错误响应形态**：
```json
{ "success": false, "message": "搜索关键词包含非法字符", "data": [], "total": 0 }
```
- **降级策略**：
  - 热搜：ClickHouse 不可达 → 返回可控的默认热词集合
  - 个性化频道：推荐失败 → 返回全量静态频道（推荐权重为缺省）
  - 搜索：无结果/错误 → 显示热门/改写建议与错误提示文案

---

---

## 前端组件目录（节选）

### 搜索页（SERP）
- **`sites/app/portal/search/page.tsx`**
  - **功能**：加载结果、过滤排序、分页、错误与空态、结果高亮；SERP 停留上报
  - **UI**：主内容宽度与首页一致（max-w-7xl），单一搜索框（导航栏）

### 智能搜索框
- **`sites/components/search/SmartSearchBox.tsx`**
  - **能力**：建议/历史/键盘导航/清空/空框聚焦显示历史；与全站导航无缝集成

### 热搜榜
- **`sites/components/search/TrendingSearches.tsx`**
  - **能力**：多窗口切换、状态标识（🔥/↗/↘/✨/→），降级默认数据

### 搜索过滤
- **`sites/components/search/SearchFilters.tsx`**
  - **能力**：时间窗口与排序；统一宽度（max-w-7xl）

---

## 数据与指标（ClickHouse）

### 事件表（`events`）关键字段
- **ts**：事件时间（UTC）
- **event**：search/dwell/click/view 等
- **article_id**：关联文章（搜索事件允许为空）
- **channel/site**：上下文信息
- **dwell_ms**：停留时长（毫秒）
- **search_query**：搜索查询词（仅 search 事件）

### 核心指标示例
- **搜索成功率/错误率**、**P95 响应时间**、**热搜词覆盖率**
- **SERP 停留时长**、**建议点击率**、**无结果率**、**改写率（后续）**

---

## 安全与隐私

### 输入与接口安全
- **参数校验**：长度、类型、白名单、分页与排序限制
- **攻击防护**：SQL 注入/XSS/危险字符拦截；服务端敏感词库合规校验

### 隐私
- **搜索历史**：仅存储在本地（LocalStorage），支持一键清空
- **上报数据**：仅用于统计分析的匿名信息（不含敏感个人身份数据）

---

## 运维与部署（概述）

### 运行环境
- **前端**：Node.js / Next.js
- **后端**：Python / Django / DRF / Wagtail
- **分析**：ClickHouse；Celery + Beat 定时任务

### 配置要点
- **日志路径**：Django 日志写入 `/tmp/django.log`；Celery Beat 调度文件 `/tmp/celerybeat-schedule`
- **连接配置**：统一使用 `CLICKHOUSE_URL`；Next.js BFF 统一站点参数

---

## 路线图（Roadmap）

### 短期增量
- **排序融合**：相关度 + 新鲜度 + 热度 + 个性化 + 点击提升
- **拼写纠错/同义词**：词典与管理后台
- **监控面板**：QPS、成功率、P95、无结果率、建议点击率、改写率
- **A/B 实验**：排序权重与位置偏置评估

### 中期演进
- **OpenSearch/向量检索**：更强的召回与排序能力
- **更丰富的相关搜索**：共点/共现/图谱增强

---

## 验收清单（节选）
- **输入“科技”**：建议下拉可用，键盘上下选择与回车生效
- **SERP 默认相关度排序并有高亮**；切换“近7天/最新优先”有效
- **空结果**：显示热门兜底/改写建议
- **热搜榜**：展示近 1 小时榜单并标注“热/升/降/新/稳”
- **搜索框体验**：空框聚焦显示历史，可一键清空

---

## 联系与支持
- **技术对接**：可根据业务域与安全合规需求进行定制化对接
- **二开能力**：组件化、接口化、数据化三层可插拔，适配多站点多业务形态

---

## 全系统功能与特点（完整清单）

> 本章节从“内容 → 渠道 → 分发 → 搜索 → 分析 → 运维”全链路视角，全面介绍系统能力。

### 1. 内容管理（CMS / Wagtail）
- **文章模型（ArticlePage）**：标题、slug、摘要、正文富文本、封面、频道、区域、标签、发布时间、是否置顶/权重等。
- **发布工作流**：支持 `go_live_at`、`expire_at`、草稿/发布、版本与修订，适配多角色协同。
- **站点管理（Site）**：基于 Wagtail 多站点能力，支持域名/站点根配置，内容按站点隔离。
- **权限与角色**：提供示例脚本（`setup_news_roles.py`、`setup_site_permissions.py`）快速初始化编辑权限与站点权限。
- **品牌化后台**：`apps/branding` 改造 Wagtail Admin UI（登录页、基础布局、主题）。

### 2. 多站点与品牌主题
- **多站点配置**：`config/sites/*.yaml` 描述站点属性与默认频道/导航，BFF 按主站点透传参数。
- **主题与品牌**：支持主题模板扩展与静态资源覆盖，前后台一致的品牌体验。

### 3. 媒体与文件存储
- **对象存储适配**：`apps/core/storages.py`，本地/MinIO/阿里云 OSS 统一抽象。
- **CDN 与签名下载**：`apps/core/cdn/aliyun.py`、预签名 URL（配套测试用例）。
- **生命周期策略**：`infra/minio/lifecycle-*.json` 示例策略；生产可挂载对应云厂商生命周期。

### 4. 内容采集与数据源
- **采集接口**：`apps/api/rest/crawler_api.py` + `config/crawler_api_settings.py`，用于对接外部数据源。
- **初始化脚本**：`create_recent_articles.py` 等辅助脚本；支持按需批量导入。

### 5. 门户与前端体验（Next.js）
- **门户布局**：`layouts/layout-portal-classic.tsx`，统一导航、搜索、响应式容器（max-w-7xl）。
- **频道导航**：`ChannelNavigation.tsx` & `ChannelContext.tsx`，自适应可视数 + 智能重排 + 个性化排序。
- **文章详情**：封面/正文/元信息展示；进入可视区即计算停留，上报 `dwell`。
- **搜索系统**：详见上文（搜索体验章节）。

### 6. 分发与推荐
- **个性化频道**：`/api/channels/personalized/`，综合匿名兴趣、站点频道权重、兜底策略。
- **热搜榜**：`/api/search/trending/`，支持滑窗与状态指示（🔥/↗/↘/✨/→）。
- **相关搜索与建议**：组件化封装，后续可无缝接入更智能的联想/共现算法。

### 7. 数据与分析（ClickHouse）
- **统一事件流**：`/api/track` 接收 `search`、`dwell`、`click`、`view` 等。
- **热搜计算**：按站点/频道与时间窗实时聚合，缓存 5 分钟，支持降级默认值。
- **指标沉淀**：可延伸至仪表盘（成功率、P95、无结果率、建议 CTR、SERP 停留等）。

### 8. 安全与合规
- **输入防护**：参数校验、危险字符/XSS/SQL 注入拦截；分页/排序白名单；时间窗合法性验证。
- **敏感词**：`apps/api/utils/sensitive_words.py` + 文本词库；查询与结果两侧可控过滤。
- **频率限制**：`apps/api/utils/rate_limit.py` 可对关键接口施加限流策略。

### 9. 性能与稳定性
- **缓存头**：BFF 输出 `s-maxage/stale-while-revalidate`；后端端到端超时与降级兜底。
- **SSR 安全**：组件内判断 `typeof window`，避免 SSR 报错；空态/骨架屏保障渲染体验。
- **分页策略**：限制最大页码与单页大小，防止深翻页导致的性能退化。

### 10. 运维与部署
- **多环境**：`infra/local`（本地开发 Docker Compose）、`infra/production`（生产编排）。
- **任务调度**：Celery + Beat，调度文件写入 `/tmp/celerybeat-schedule`；日志输出 `/tmp/django.log`。
- **发布脚本**：`deploy-production.sh`、`env.production.example` 提供上线指引。
- **安全审计**：`infra/audit/*` 安全说明与基线文档。

### 11. 测试与质量
- **单元与集成**：`tests/*` 覆盖存储、预签名、基础接口可用性。
- **可观测性**：后端日志、BFF 报错提示与前端友好错误文案。

---

## 快速对比（客户视角）

- **体验**：搜索与分发双轮驱动，首页-频道-搜索完整闭环；移动与桌面一致的响应式表现。
- **效果**：热搜与个性化频道提高点击率；搜索建议与相关搜索降低零结果率。
- **安全**：从输入校验到敏感词过滤、从限流到兜底，贴合企业合规要求。
- **可扩展**：接口化与组件化设计，快速接入第三方检索（OpenSearch/ES）与画像系统。


