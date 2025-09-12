<!-- Doc Meta: status=in_progress; owner=Portal Team; last_updated=2025-09-12 -->

## 重构TODO（Channel + Tag + ES + 预计算）

### 0. 概要
- 目标：将“聚合/推荐/热榜/今日头条”等业务逻辑后端化，建立可运营的 Channel+Tag+Article 模型，引入搜索层（OpenSearch/ES）与离线预计算（Celery+Redis），前端仅做展示。
- 范围：数据模型、API、索引与检索、预计算与缓存、前端改造、运维与治理、验收与切换。

当前状态快照（已完成）
- Next.js 层已提供聚合 API：`/api/aggregated/headlines`、`/api/aggregated/most-read`。（已完成）
- 前端组件已改为调用聚合 API，去除了硬编码与多路并发 fetch。（已完成）
- 新增 Django 标签 API：`/api/tags/top/`、`/api/tags/<slug>/`。（已完成）
- 频道数据、新闻分页、推荐频道"recommend"已统一与修复。（已完成）
- OpenSearch 已部署并可用（Dev/QA），后续按附录A落实索引别名、深分页与观测。（已完成）

**🎉 重大进展更新（2025-09-12）**
- **阶段B完全完成**: OpenSearch集成、文档映射、索引器、API查询、前端切换全部完成
- **阶段C基本完成**: Celery+Redis预计算、头条/热榜聚合API、前端切换到Django API全部完成
- **API问题修复**: 解决了URL重定向、频道查询、字段映射等关键问题，所有API正常工作
- **"换一换"功能**: 今日头条模块实现完整的换一换功能，包括循环切片和多样性策略
- **数据完整性**: 修复了国家政策等频道的数据显示问题，确保所有频道正常工作

本 TODO 旨在将聚合逻辑迁移到后端（Django），引入 Tag 体系与搜索层，形成长期可持续架构。

---

### 1. 目标与非目标
- 目标
  - 建立可运营 Tag 系统（多标签、跨频道、可治理）。
  - Channel/Article/Tag 三者职责清晰：导航/主体/特征聚合。
  - 引入 OpenSearch/ES，承担频道流/标签流/热门标签等检索与聚合。
  - 为“今日头条/最热阅读”提供离线预计算与缓存 API，稳定低延迟。
  - 前端改造：频道/标签页走 ES，头条/热榜走后端聚合缓存 API。
  - 治理与运维：标签合并/别名、重建索引脚本、缓存策略、SLA 观测。
- 非目标（本阶段不做）
  - 个性化推荐/用户画像（为后续阶段预留策略/虚拟频道接口）。
  - 跨站内容联动（可在站点稳定后推进）。

---

### 2. 分阶段实施

#### 阶段 A：数据模型与基础 API（低风险，高收益）
1) Django 数据模型
   - 定义 `NewsTag`（基于 taggit 的扩展）
   - `ArticlePage`：主频道必选、副频道可选、`tags=ClusterTaggableManager`
   - 中间表 `ArticlePageTag(site)`，为多站点过滤打基础
2) 管理后台
   - Wagtail Snippet/Panel：标签创建/编辑/颜色/封面/描述
3) 基础 API（Django）
   - `/api/channels/`（增强：排序、layout、元信息）
   - `/api/tags/top/`、`/api/tags/<slug>/`（按标签取文章）
4) 前端最小接入
   - 文章详情展示标签；新增标签列表页/详情页（Next）

#### 阶段 B：搜索与聚合（ES/OpenSearch）
1) 基础设施
   - 部署 OpenSearch，配置 settings（Docker Compose / K8s）
2) 索引与序列化
   - Article 文档映射（频道维度+标签维度+站点维度）
   - 序列化器与索引写入 client；Wagtail 发布钩子同步索引
   - 初始化重建命令 `reindex_articles`
3) 查询与聚合
   - 频道流、标签流、热门标签 terms 聚合
   - 性能优化：浅分页（from/size）→ 游标/时间锚（search_after）预留
4) 前端切换
   - 频道页/标签页改为走 ES 查询（透过 Django API 或直连服务）

#### 阶段 C：预计算与缓存（今日头条/热榜）
1) Celery + Redis
   - 周期性任务：计算“今日头条”“最热阅读”，写入 Redis Key
   - 多样性/去重/时效/热度（权重）策略于任务中实现
2) Django 聚合 API（替代 Next 聚合层）
   - `/api/agg/headlines`、`/api/agg/hot`：仅读缓存；设置 Cache-Control/Surrogate-Key
3) 前端迁移
   - Next 前端改为调用 Django 聚合 API（完成后逐步下线 Next 聚合端点）

#### 阶段 D：治理与高级能力
1) 标签治理
   - 合并/别名/黑名单工具（管理命令+后台界面）
2) 国际化与地域（可选）
   - Tag/Article 增加 `lang/region` 或以站点区分；索引与 API 过滤
3) 策略化/虚拟频道（预留）
   - 为推荐/专题提供 `strategy/params` 或独立 `VirtualChannel`
4) 观测与质量
   - 埋点、A/B、缓存命中、端到端延迟、错误率、索引积压监控

---

### 3. 详细任务清单（WBS）

数据模型与 API（A）
- [ ] DM-1 定义 `NewsTag` 模型（颜色/描述/封面/slug 唯一）
- [ ] DM-2 `ArticlePage` 增加 `primary_channel`/`secondary_channels`/`tags`
- [ ] DM-3 `ArticlePageTag(site)` 中间表与索引
- [ ] DM-4 管理后台面板：标签、文章标签面板优化
- [x] API-1 `/api/channels/` 增强：排序、layout、元信息
- [x] API-2 `/api/tags/top/`（terms 聚合占位，A 阶段可先 DB 实现）
- [x] API-3 `/api/tags/<slug>/`（按标签返回文章列表）
- [ ] FE-1 文章详情页展示标签；标签列表/详情页路由与 UI

搜索与聚合（B）
- [x] ES-1 部署 OpenSearch & 配置（开发/测试/生产）
- [x] ES-2 Article 文档映射（频道/标签/站点/时间/URL）
- [x] ES-3 序列化器与写入 client
- [x] ES-4 发布钩子：发布/撤销/删除 → 索引增删
- [x] ES-5 重建索引命令 `reindex_articles`
- [x] ES-6 API：频道流/标签流/热门标签查询
- [x] FE-2 前端频道/标签页切换到 ES 查询

预计算与缓存（C）
- [x] PC-1 部署 Celery+Redis；心跳/监控
- [x] PC-2 任务：`compute_headlines()` 多样性+去重+时效+热度
- [x] PC-3 任务：`compute_hot()` 时间窗+权重（views/shares/comments）
- [x] PC-4 Redis Key 与 TTL 策略；失效/回填机制
- [x] API-4 `/api/agg/headlines`、`/api/agg/hot`（读缓存，Cache-Control/Surrogate-Key）
- [x] FE-3 前端调用切换到 Django 聚合 API
- [x] FE-4 移除 Next 聚合端点 `/api/aggregated/*`

治理与高级能力（D）
- [ ] GOV-1 标签合并/别名/黑名单（管理命令 + 后台）
- [ ] GOV-2 标签规范与上限（每篇 ≤ N）
- [ ] INTL-1 多语言/地域字段（可选），索引与 API 支持
- [ ] STRAT-1 虚拟频道/策略化频道的数据结构与 API（可选）
- [x] OBS-1 观测项：缓存命中、P95 延迟、错误率、索引积压、任务耗时

---

### 4. 里程碑与时间线（建议）
- ✅ M1（第1-2周）：阶段 A 基本完成（基础 API 完成，数据模型待完善）
- ✅ M2（第3-4周）：阶段 B 完成（ES 接入 + 前端切换）
- ✅ M3（第5周）：阶段 C 完成（预计算 + Django 聚合 API + 前端切换）
- [ ] M4（第6周）：阶段 D 核心项（标签治理 + 观测）

---

### 5. 依赖与运维
- OpenSearch：单节点 Dev/QA，生产至少 3 节点；磁盘与内存监控
- Redis：聚合缓存与 Celery backend；主从或哨兵（生产）
- Celery：队列并发与超时策略；失败重试与死信队列
- 安全与权限：标签/频道运营权限，API 速率限制与缓存层防护

---

### 6. 风险与缓解
- ES 运维复杂度↑ → 分阶段引入；Dev/QA 验证后再生产
- 深分页性能 → 频道长列表使用 `search_after` 或基于时间的游标
- 标签泛滥/同义词混乱 → 提供合并/别名工具与运营规范
- 聚合抖动 → 预计算 + 缓存 TTL + 双写/降级路径（缓存失效读旧值）

---

### 7. 验收标准（每阶段）
- A：文章可多标签；标签页/列表可访问；频道 API 信息完整
- B：频道/标签页数据来自 ES；P95 < 200ms（ES 查询层）
- C：头条/热榜 API 响应来自缓存；P95 < 100ms；缓存命中率 > 90%
- D：可合并/别名标签；观测指标齐全；错误率与延迟在阈值内

---

### 8. 切换与回滚
- 切换：前端灰度从 Next 聚合 API → Django 聚合 API；功能对齐后移除 Next 端点
- 回滚：保留 Next 聚合层与传统频道 API 的开关，异常时快速回切

---

### 9. 接口草案（示例）
```http
GET /api/channels/
GET /api/tags/top?size=30
GET /api/tags/{slug}?page=1&size=20
GET /api/agg/headlines
GET /api/agg/hot?cursor=
```

---

### 10. 关联事项（与现有实现衔接）
- 短期保留 Next `/api/aggregated/*` 作为过渡，待 Django 聚合稳定后下线
- 频道 API 与前端 ChannelContext 保持 slug/顺序兼容
- `recommend` 作为策略化频道保留，后续可迁入“虚拟频道”机制


