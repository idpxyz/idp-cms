I'll create a prioritized TODO list (P0/P1/P2) and set the first task in progress to guide immediate next steps.

[1 tool called]

我已按优先级整理好了执行型清单，并将“SLO/SLI 与错误预算”设为进行中；下面给出分组与建议顺序。

### P0（本周内完成）
1) 定义 SLO/SLI 与错误预算（进行中）
- 完成标准：形成目标与测量口径文档（可用性/延迟/索引新鲜度等），建立初版仪表盘与告警策略
2) 健康检查端点（liveness/readiness/startup）含依赖探测
- 完成标准：各服务 `/health`、`/ready` 可返回依赖状态（DB、OpenSearch、队列），用于探针/负载均衡
3) DB↔OpenSearch 一致性监控与告警+Runbook
- 完成标准：定时/按需核对脚本、Slack 告警、重建/补偿操作手册
4) Docker 与环境配置审计（非 root、资源限额、固定基础镜像/Tag）
- 完成标准：清单化差异，CI 检查位；镜像/容器满足安全与资源规范
5) 结构化日志与关联 ID 贯通
- 完成标准：统一 JSON 日志，边缘→后端携带 trace/correlation-id；保留率与采样策略明确
6) 请求超时与熔断（关键内部/外部调用）
- 完成标准：默认超时、退避抖动策略、熔断和降级路径可验证

建议本周执行顺序：1 → 2 → 5 → 6 → 3 → 4

### P1（2–4 周内完成）
7) 统一 ArticleService（slug/ID 查找与 fallback）
- 完成标准：替换 `sites/app/api/articles/[slug]/route.ts`、`apps/api/rest/feed.py`、`sites/lib/api/feed.ts`、`NewsContent.tsx` 的重复逻辑
8) API 响应标准化（envelope、错误码、分页/排序、时间戳/时区）
- 完成标准：OpenAPI 契约、统一中间件、契约测试通过
9) 重试（带抖动）与幂等键（仅幂等/安全场景）
- 完成标准：对查询类/可重入写操作配置重试；对写操作提供幂等键（如 Redis 保障）
10) 观测性完善：SLO 仪表盘/告警、全链路追踪（OpenTelemetry）
- 完成标准：RED/USE 看板、服务间 Trace 打通、告警分级与值班 Runbook
11) 零停机迁移与数据迁移流程
- 完成标准：迁移清单、前后检查/回滚剧本、CI 门禁

### P2（1–2 个月内完成）
12) 缓存策略（键/TTL/失效事件，含边缘/应用层）
- 完成标准：设计文档与实现，发布/更新触发失效
13) CDC/事件流同步（含去重、DLQ、重放）
- 完成标准：至少一次语义、重放工具、监控与告警
14) 负载/容量测试（基线、阶梯、回归）
- 完成标准：阈值与工况脚本固化，周期性执行与报告
15) 安全加固（机密管理、SBOM、依赖/镜像扫描）
- 完成标准：集中化密钥、自动化扫描与CI阻断策略

近期两日建议行动
- 今天：完成 SLO/SLI 草案与仪表盘雏形；为各服务加 `/health` 骨架与依赖探测
- 明天：落地结构化日志与关联 ID；为关键调用统一超时/熔断配置

- 我已建立按 P0/P1/P2 的执行清单并设置了“定义 SLO/SLI 与错误预算”为进行中，明确了每项的完成标准与建议顺序。 
- 如需，我可以从健康检查与日志落地开始直接提交对应代码与配置修改。