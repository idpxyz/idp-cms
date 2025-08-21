# News-SaaS (Complete)

Wagtail 7.1 Authoring + OpenSearch (召回/别名/版本化) + ClickHouse (埋点/热点) + Next.js Portal + Celery/Redis + MinIO + Docker Compose。

## 快速开始

```bash
cp .env.example .env
docker compose -f infra/local/docker-compose.yaml up -d --build

# 创建管理员
docker compose -f infra/local/docker-compose.yaml exec authoring python authoring/manage.py createsuperuser

# 初始化站点
docker compose -f infra/local/docker-compose.yaml exec authoring   python authoring/manage.py bootstrap_sites   --portal-domain=portal.local:8000 --a-domain=region-a.local:8000 --b-domain=region-b.local:8000

# 初始化 ClickHouse
docker compose -f infra/local/docker-compose.yaml exec clickhouse   clickhouse-client --queries-file=/app/scripts/init_clickhouse.sql

# 初始化 OpenSearch（版本化索引 + 别名）
docker compose -f infra/local/docker-compose.yaml exec authoring   python authoring/manage.py os_alias_bootstrap --site ${SITE_HOSTNAME:-site-a.local} --version 1
```

访问：Wagtail Admin http://localhost:8000/admin/ ，Portal http://localhost:3000/feed

## 重建索引并切换别名

```bash
docker compose -f infra/local/docker-compose.yaml exec authoring   python authoring/manage.py os_reindex_switch --site ${SITE_HOSTNAME:-site-a.local} --new-version 2
```

## 查询模板

- 模板存放于 `configs/search_templates/`，通过 `/api/feed?template=recommend_default&channel=recommend&channel=tech` 使用。
- 占位符：`__SITE__`、`__HOURS__`、`__SEEN_IDS__`、`__CHANNELS__`、`__CHANNEL__`。

## Feature Flags & A/B

- 环境变量：`FF_FEED_USE_LGBM`、`FF_FEED_DIVERSITY_AUTHOR_LIMIT`、`FF_FEED_DIVERSITY_TOPIC_LIMIT`、`FF_RECALL_WINDOW_HOURS`。
- 请求头：`X-AB-Session` 用于确定性 10% 实验（窄 24h 召回窗）。

下面把这条启动命令的**参数含义**、**可填值规范**、以及**执行后会发生什么**讲清楚，便于你一次跑通、本地和生产都可复用。

```bash
docker compose -f infra/local/docker-compose.yaml exec authoring \
  python authoring/manage.py bootstrap_sites \
  --portal-domain=portal.local:8000 \
  --a-domain=site-a.local:8000 \
  --b-domain=site-b.local:8000
```

# 参数解释

- `--portal-domain=<host[:port]>`

  - 用途：注册**门户站点**（Portal）/ 默认站点的域名，写入 Wagtail `Site` 与 Django `ALLOWED_HOSTS` 等（具体实现以命令为准）。
  - 期望格式：纯主机名，可带端口；**不要**带协议（`http://`/`https://`）和路径。
  - 示例：`portal.local`、`portal.dev.company.com`、`portal.local:8000`

- `--a-domain=<host[:port]>`

  - 用途：创建**租户子站 A** 的域名（Wagtail `Site` + 对应 `Tenant` + 默认首页/菜单等初始化）。
  - 期望格式同上。
  - 示例：`site-a.local`、`news-a.company.com`、`site-a.local:8000`

- `--b-domain=<host[:port]>`

  - 用途：创建**租户子站 B** 的域名（同 A）。
  - 期望格式同上。
  - 示例：`site-b.local`、`news-b.company.com`、`site-b.local:8000`

> 说明：三个参数都是**必填**（这条命令的“多站点样例”初始化场景）。如果你只想建一个站，可以用我们之前的 `add_site` 命令；`bootstrap_sites` 更偏“开箱即用演示/联调”——一次拉起 Portal + 两个子站，方便 A/B、跨站验证。

# 可填内容与校验规范

**主机名（host）**

- 允许：英文字母、数字、`-`、`.` 组合，长度 ≤ 253。
- 不允许：协议（`http://`、`https://`）、URI 路径、通配符（`*`）、空格。
- 本地开发建议在 `/etc/hosts` 添加解析：

  ```bash
  127.0.0.1 portal.local site-a.local site-b.local
  ```

**端口（port，可选）**

- 纯数字，范围 `1–65535`。
- 本地默认：

  - `authoring` 暴露 `8000`（Django/Wagtail）
  - `portal` 暴露 `3000`（Next.js）

- 你在参数里写 `:8000` 的意思是：该域名将通过宿主机的 8000 端口访问 **后端**（Wagtail）。生产上通常不写端口（80/443 由反代提供）。

**不要**写：

- `https://portal.local:8000/`（× 含协议/路径）
- `portal.local/abc`（× 含路径）
- `portal_local`（× 含下划线）

# 执行后会创建/修改的内容（典型行为）

> 具体以你仓库中的实现为准，通用上会完成这些初始化步骤：

1. **Wagtail Sites**

   - 创建 3 条 `Site` 记录：`portal.local[:port]`、`site-a.local[:port]`、`site-b.local[:port]`（端口位填写到 Wagtail 的 `port` 字段）。
   - 各自挂载对应的根页面（Portal 站点可指向一个 Portal 或中转页，A/B 指向各自首页）。

2. **SaaS / 多租户**

   - 为 `site-a` / `site-b` 自动创建 `Tenant`、`Subscription(FREE)`、默认 `ApiKey`（通常会在命令行打印一次性明文，注意保存）。
   - 为每站点建默认权限组（`admins/editors`）与 Collection（素材库）隔离。

3. **搜索与索引**

   - 为两个子站创建 OpenSearch 别名与初始索引（如 `news-site-a`、`news-site-b`），同时做必要的 mapping/template 初始化。

4. **控制台/菜单**

   - 后台 `/console` 能看到两个租户卡片（站点 A/B）、其 API Key、套餐（FREE）、以及“升级/Portal”等。

5. **开发环境联调友好项**

   - `ALLOWED_HOSTS`/CORS/CSRF（如涉及）写入/合并相应域名（具体随实现）。
   - 可能设定其中一个为默认站点（Wagtail 的 `is_default_site`），便于无 host 访问时兜底。

# 本地与生产的填写建议

- **本地（Compose，后端在 8000 端口）**

  ```bash
  --portal-domain=portal.local:8000 \
  --a-domain=site-a.local:8000 \
  --b-domain=site-b.local:8000
  ```

  然后访问：

  - 后台（任一站点）：`http://site-a.local:8000/admin/`
  - Portal（Next.js）：`http://localhost:3000/feed`（或 `http://portal.local:3000`，取决于你的前端反代/hosts 设置）

- **生产（有反向代理，80/443）**

  ```bash
  --portal-domain=portal.example.com \
  --a-domain=a.example.com \
  --b-domain=b.example.com
  ```

  - 不写端口，由 Nginx/Traefik 负责把 80/443 转发到容器内部端口。
  - 记得同步设置 `PUBLIC_BASE_URL=https://portal.example.com`（Stripe/重定向用），以及 Logto 回调域名等。

# 常见问题与排错

- **“域名已存在 / Site 重复”**
  说明你已跑过一次；命令一般是幂等/跳过已存在，你也可以去 Django Admin → Sites 检查、或改域名重试。
- **无法解析域名**
  本地需要 `/etc/hosts`；容器内如果要访问宿主服务，确认 `extra_hosts: host.docker.internal:host-gateway` 是否配置。
- **端口冲突**
  改 Compose 的 `ports:` 或把参数里的 `:8000` 改成你映射的宿主端口（例如 `:18000`），保持与实际映射一致。
- **Portal 与后端跨域**
  若 Portal 通过 `http://localhost:3000` 访问后端的 `site-*.local:8000`，需在后端 CORS/CSRF/ALLOWED_HOSTS 中允许这几个域名（我们默认已处理，若自定义请确认）。

# 实用示例（一次跑通）

```bash
# hosts
echo "127.0.0.1 portal.local site-a.local site-b.local" | sudo tee -a /etc/hosts

# 启动容器
docker compose -f infra/local/docker-compose.yaml up -d --build

# 初始化三站
docker compose -f infra/local/docker-compose.yaml exec authoring \
  python authoring/manage.py bootstrap_sites \
  --portal-domain=portal.local:8000 \
  --a-domain=site-a.local:8000 \
  --b-domain=site-b.local:8000
```

---

如果你计划**只建一个站**做 MVP，更合适的是跑：

```bash
docker compose -f infra/local/docker-compose.yaml exec authoring \
  python authoring/manage.py add_site \
  --host news.local --port 8000 \
  --name "News" \
  --admin-email admin@news.local --admin-password 'Passw0rd!'
```

后面再追加第二/第三个站，或改回 `bootstrap_sites` 做演示环境。需要我把 `bootstrap_sites` 的“仅 Portal + 一个站”参数支持加上吗？我可以给它补个 `--single` 模式。
