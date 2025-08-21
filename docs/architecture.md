# News SaaS 架构与开发者手册

<!-- toc:start -->
- [目标受众](#目标受众)
- [架构总览](#架构总览)
- [目录结构](#目录结构)
- [核心组件与边界](#核心组件与边界)
  - [Authoring（Django/Wagtail）](#authoringdjangowagtail)
  - [SaaS（多租户/计费/SSO/限流/审计）](#saas多租户计费sso限流审计)
  - [RBAC（细粒度角色/权限/作用域）](#rbac细粒度角色权限作用域)
  - [检索 & 索引](#检索-索引)
  - [信息流 API 与排序](#信息流-api-与排序)
  - [Portal（Next.js）](#portalnextjs)
- [运行配置](#运行配置)
- [Feature Flags 与 A/B](#feature-flags-与-ab)
- [ML 排序与自动化](#ml-排序与自动化)
- [多租户与计费](#多租户与计费)
- [SSO（Logto）](#ssologto)
- [细粒度 RBAC](#细粒度-rbac)
- [部署与外部依赖复用](#部署与外部依赖复用)
- [观测与审计](#观测与审计)
- [本地开发与常用命令](#本地开发与常用命令)
- [环境变量速查（节选）](#环境变量速查节选)
- [故障与排查](#故障与排查)
<!-- toc:end -->

## 目标受众
- 后端 / 前端开发、数据工程、运维 SRE、产品/运营同学
- 适用范围：单站点 MVP → 多站点 SaaS（多租户、计费、RBAC、SSO、AB/ML）

## 架构总览
- **后端**：Django + Wagtail 7.1（内容、工作流、多站点、后台），REST API（Feed/Track/Flags/…）
- **检索**：OpenSearch（按站点别名、版本化重建、零停机切换）
- **数据**：ClickHouse（曝光/点击/停留埋点 + 分钟聚合）
- **前端**：Next.js Portal（信息流：首屏 SSR + 后续 CSR 无限滚动），Logto SSO
- **SaaS 能力**：租户/订阅（Stripe）、API Key + 限流 + 审计、细粒度 RBAC（频道/PageRoot）
- **算法**：启发式 + LightGBM 排序（训练 → 上线 → 灰度）
- **自动化**：Make 任务、一键训练、Cron/systemd/Actions 夜间上线

## 目录结构
```text
authoring/                # Django + Wagtail（CMS、API、租户/计费/RBAC/SSO）
apps/                     # 业务域：core/news/api/searchapp/saas/rbac
portal/next/              # Next.js 门户（SSR 首屏 + CSR 无限滚动、Logto SSO）
infra/                    # docker-compose、本地与运维脚手架（cron/systemd/CI）
scripts/                  # 站点批处理、ML 训练与部署、定时脚本
models/                   # 排序模型工件（别名与版本）
config/                   # Feature Flags / 实验配置
docs/                     # 文档（本手册等）
logs/                     # 任务日志（本地）
.env.example              # 环境变量样例
README.md                 # 快速上手与操作指引
```

## 核心组件与边界
### Authoring（Django/Wagtail）
- `authoring/authoring/settings/base.py`：注册 `apps.*`，开启 OIDC（Logto）、中间件（API Key 鉴权+限流+审计）、缓存与 Flags。
- `authoring/authoring/urls.py`：`/api/*`、`/console/*`、`/billing/webhook`、`/oidc/*`。
- `authoring/templates/saas/*`：租户控制台、API Key、审计、计费/客户门户页面。

### SaaS（多租户/计费/SSO/限流/审计）
- `apps/saas/models.py`：`Plan / Tenant / Subscription / ApiKey / TenantMember`。
- `apps/saas/middleware/api_key_auth.py`：API Key 鉴权、每租户每分钟限速、Scope 校验、阈值告警→`apps/saas/alerts.py`。
- `apps/saas/views.py|views_billing.py|views_audit.py|urls.py`：控制台、Stripe Checkout/Portal、审计视图。
- `apps/saas/webhooks.py`：Stripe Webhook（checkout.session / subscription.*）。
- `apps/saas/auth_oidc.py`：Logto OIDC 后端，把 organizations → tenant 绑定，可授默认 RBAC 角色。

### RBAC（细粒度角色/权限/作用域）
- `apps/rbac/models.py`：`Permission / Role / RoleBinding(scope: tenant+site+channel+page_root)`。
- `apps/rbac/checks.py`：`has_perm(user, tenant, site, perm, channel)`。
- `apps/news/hooks.py`：在 Wagtail 上拦截 `create/edit/publish`，按频道校验权限。

### 检索 & 索引
- `apps/searchapp/alias.py`：索引版本化与别名切换（零停机重建）。
- `apps/searchapp/indexing.py`：索引写入/更新；发布后入索引。

### 信息流 API 与排序
- `apps/api/rest/feed.py`：召回（OpenSearch）→ 排序（启发式/LGBM）→ 多样性 → 游标分页。
- `apps/api/ml/lgbm_ranker.py`：模型懒加载与回退；`models/alias.json` 记录现行版本。
- `apps/api/rest/rank.py`：启发式打分、多样性约束（作者/主题限频）。
- `apps/api/rest/features.py`：统计特征读取（CTR、质量分等）。
- `apps/api/rest/track.py`：埋点写入 ClickHouse。

### Portal（Next.js）
- `src/pages/feed.tsx`：**首屏 SSR + CSR 无限滚动**。
- `src/libraries/logto.ts` + `src/pages/api/logto/[...logto].ts`：Logto SSO（前台）。
- `src/pages/api/me.ts`：会话自检；`src/lib/site.ts|feed.ts|track.ts|user.ts`：站点识别、取流、埋点、UserId。

## 运行配置
- `.env.example`：Stripe/Logto/配额阈值等。
- `infra/local/docker-compose.yaml`：本地一键启动；
- `infra/local/docker-compose.external.yaml`：**复用外部 Postgres/OpenSearch/MinIO** 的覆写；`.env.external` 提供样例。

## Feature Flags 与 A/B
- `config/flags.yaml`：`flags.feed.use_lgbm`、`experiments.feed_lgbm`、`flags.rbac.enabled` 等；
- `/api/flags` 读取；`/api/feed` 响应带 `algo` 用于灰度观测。

## ML 排序与自动化
- `apps/news/management/commands/export_content_features.py`：导出内容特征（Wagtail → CSV）。
- `scripts/ml/train_lgbm_example.py`：ClickHouse 拉取窗口数据 + 拼接训练 → `models/lgbm_ranker_v*.txt`。
- `authoring/manage.py switch_model`：别名切换、懒加载、失败回退。
- Make 任务：`ml-export / ml-train / ml-switch / ml-enable / ml-train-push`。
- 定时：`scripts/cron/nightly_train.sh` + `infra/systemd/*.timer|service` + `.github/workflows/nightly-train.yml`。

## 多租户与计费
- 建站：`apps/core/management/commands/add_site.py`（自动创建 Tenant + FREE 订阅 + 默认 API Key）。
- 计费：`/console/upgrade`（Stripe Checkout）、`/console/billing/portal`（Customer Portal）→ `/billing/webhook` 同步订阅。
- 限流：按 `plan.api_rpm` 每租户每分钟令牌桶；阈值告警：`ALERT_WEBHOOK_URL`。

## SSO（Logto）
- 后端：`mozilla-django-oidc`，`/oidc/authenticate/` 登录；`auth_oidc.py` 将 organizations 元数据中的 `hostname` → `Tenant`，可授 `OIDC_DEFAULT_ROLE`。
- 前端：`@logto/next` 提供登录/登出、会话、获取 claims。

## 细粒度 RBAC
- 权限枚举：`content.create/edit/publish/delete`, `media.manage`, `analytics.view/export`, `feed.config`, `flags.manage`, `users.manage`。
- 作用域：租户 + 站点 + 频道（slug）+ 可选 PageRoot。
- 控制台：`/console/rbac` 分配绑定。

## 部署与外部依赖复用
- 并存运行：`COMPOSE_PROJECT_NAME` 修改项目名避免冲突。
- 复用外部 PG/OS/MinIO：覆盖文件 `infra/local/docker-compose.external.yaml` + `.env.external`；启动时 `--scale postgres=0 --scale opensearch=0 --scale minio=0`。

## 观测与审计
- 审计模型：`apps/saas/models_audit.py::ApiAuditLog`，中间件自动记录 `/api/*`（状态、耗时、Scope、UA/IP、bytes_out）。
- 控制台：`/console/audit`；阈值告警：达到 `QUOTA_ALERT_THRESHOLD * api_rpm` 触发（冷却 `QUOTA_ALERT_COOLDOWN_MIN` 分钟）。

## 本地开发与常用命令
```bash
# 启动
docker compose -f infra/local/docker-compose.yaml up -d --build

# 迁移与预置
docker compose -f infra/local/docker-compose.yaml exec authoring python authoring/manage.py migrate
docker compose -f infra/local/docker-compose.yaml exec authoring python authoring/manage.py seed_plans
docker compose -f infra/local/docker-compose.yaml exec authoring python authoring/manage.py seed_rbac --tenant <host>

# 新建站点（自动 Tenant + FREE 订阅 + API Key）
docker compose -f infra/local/docker-compose.yaml exec authoring   python authoring/manage.py add_site --host acme.local --admin-email admin@acme.com --admin-password 'Passw0rd!'

# 训练与上线（Make）
make ml-train-push        # export -> train -> switch -> enable

# 夜间训练（任选其一）
cron:     scripts/cron/nightly_train.sh
systemd:  infra/systemd/news-ml.timer
actions:  .github/workflows/nightly-train.yml
```

## 环境变量速查（节选）
- Stripe：`STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_*` / `PUBLIC_BASE_URL`
- Logto：`LOGTO_ENDPOINT` / `LOGTO_CLIENT_ID` / `LOGTO_CLIENT_SECRET`
- 外部中间件：`DATABASE_URL` / `OPENSEARCH_URL` / `AWS_S3_ENDPOINT_URL`/`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`
- 速率与告警：`PLAN_FREE_API_RPM` / `PLAN_PRO_API_RPM` / `ALERT_WEBHOOK_URL` / `QUOTA_ALERT_THRESHOLD`
- 存储开关：`USE_S3=1`（启用 MinIO/S3 媒体存储）

## 故障与排查
- 端口/容器冲突：改 `COMPOSE_PROJECT_NAME`，或用 external 覆写并 `--scale` 禁用本地中间件。
- 索引重建失败：回滚到上一个别名版本；检查 OpenSearch heap 与分片大小（单分片 ≤30GB）。
- 模型加载失败：自动回退启发式；检查 `models/lgbm_ranker.txt` 与 `alias.json`。
- SSO 登录失败：核对 Logto 回调 URI、`issuer`、JWKS；在生产启用 `OIDC_VERIFY_SSL=True`。

---

> 备注：本手册聚焦“能跑且能扩张”的设计与实操。更细节的字段/接口请查看各 `apps/*` 模块源码与注释。
