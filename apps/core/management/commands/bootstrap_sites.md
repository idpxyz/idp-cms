# Bootstrap Sites 用户指南

管理命令 **`bootstrap_sites`** 扩展为支持两样新功能：

1. **`--portal-only`**：只创建 Portal 站点（不建任何租户站）。
2. **统一的管理员账号**（`--admin-email` / `--admin-password`）：**对本次创建的所有站点生效**；如未提供，默认用 `admin@<host>` 与 `'Passw0rd!'`（生产请改强口令）。

**下载补丁：**

---

### 用法示例

**A. 只建 Portal（`--portal-only`）**

```bash
docker compose -f infra/local/docker-compose.yaml exec authoring \
  python authoring/manage.py bootstrap_sites \
  --portal-only \
  --portal-domain=portal.local:8000 \
  --portal-name="Portal" \
  --admin-email admin@portal.local \
  --admin-password 'Passw0rd!' \
  --default
```

**B. 单站模式（Portal + 1 个站）**

```bash
docker compose -f infra/local/docker-compose.yaml exec authoring \
  python authoring/manage.py bootstrap_sites \
  --single \
  --portal-domain=portal.local:8000 \
  --site-domain=news.local:8000 \
  --name "News" \
  --admin-email admin@corp.local \
  --admin-password 'Passw0rd!' \
  --default
```

> 这里的 `--admin-*` 会同时用于 Portal 与 `news.local` 这两个站点；如果不传，则各自默认 `admin@<host>`。

**C. 多站模式（Portal + A/B 两站）**

```bash
docker compose -f infra/local/docker-compose.yaml exec authoring \
  python authoring/manage.py bootstrap_sites \
  --portal-domain=portal.local:8000 \
  --a-domain=site-a.local:8000 \
  --b-domain=site-b.local:8000 \
  --name "News" \
  --admin-email admin@corp.local \
  --admin-password 'Passw0rd!' \
  --default
```

---

### 参数规范

#### 域名格式

- `--portal-domain`、`--site-domain`、`--a-domain`、`--b-domain` 格式：`host[:port]`，**不要**带协议或路径。

#### 站点模式

- `--portal-only`：只创建 Portal，与其他模式互斥
- `--single`：启用单站模式，必须提供 `--site-domain`（或用 `--a-domain` 代替）
- 默认多站：要求 `--a-domain` 和 `--b-domain` 都提供

#### 其他参数

- `--name`：租户站点的展示名（单站用 `News`，多站会生成 `News A / News B`）
- `--admin-email`：管理员邮箱，不提供时默认为 `admin@<host>`
- `--admin-password`：管理员密码，不提供时默认为 `'Passw0rd!'`（建议在生产环境显式指定）
- `--default`：将**第一个**创建的站点标记为 Wagtail 默认站（兜底匹配）

#### 互斥逻辑

`--portal-only` 与 `--single`/多站模式的互斥逻辑已处理：

- `--portal-only`：只创建 Portal
- `--single`：需要 `--site-domain`（或用 `--a-domain` 代替）
- 默认多站：要求 `--a-domain` 和 `--b-domain` 都提供

### 运行时它会做什么

- 内部通过 `call_command('add_site', ...)` 逐个创建站点（复用你已有的建站流程：Wagtail Site、Tenant、FREE 订阅、默认 API Key 等）。
- 打印创建的站点及 `hosts` 提示，便于本地快速访问。
