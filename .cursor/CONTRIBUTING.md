# CONTRIBUTING — News SaaS

面向：后端、前端、搜索、数据工程与运维同学。**先读根目录的 `.cursorrules`**，Cursor/AI 生成代码需遵守其中约束。

## TL;DR（远程容器 + VS Code 开发）
1. 开发机 VS Code：安装 Remote-SSH、Dev Containers、Python、ESLint。
2. 连接远程机（192.168.8.195）：`Remote-SSH: Connect to Host…`，打开 `/opt/news-saas/app`。
3. （可选）`Dev Containers: Reopen in Container` 选择 `authoring` 或 `portal`。
4. 起容器：`docker compose -f infra/local/docker-compose.yaml up -d --build`
5. 调试：`Terminal -> Run Task...` → **Start Django (debugpy)** / **Start Next dev (inspect)**；
   再 **Run and Debug** → **Attach: Django (5678)** / **Attach: Next.js (9229)**。
6. 访问：`http://localhost:3000/feed`（必要时 `?site=site-a.local`）或 hosts 映射域名。

## 分支与提交规范
- **Branch**：`feat/<scope>-<short>`、`fix/<scope>-<short>`、`chore/…`、`docs/…`、`refactor/…`
- **Conventional Commits**：
  - `feat(api): add feed cursor pagination`
  - `fix(search): alias switch fallback`
  - `chore(dev): add vscode tasks`
- 每个 PR 只做一件事；大改动分多 PR。

## 后端（Django/Wagtail）
- 位置：`apps/<domain>/`；API 在 `apps/api/rest/`；搜索在 `apps/searchapp/`。
- 必带多租户过滤与 RBAC 校验：
  ```py
  from apps.rbac.checks import has_perm
  assert has_perm(request.user, tenant, site, "analytics.view")
  ```
- 迁移：改模型必须 `makemigrations`；PR 附变更摘要。
- 测试：
  ```bash
  docker compose -f infra/local/docker-compose.yaml exec authoring pytest -q
  ```
- 日志：`logging.getLogger(__name__)`；不要打印 secrets。

## 前端（Next.js）
- SSR：`getServerSideProps` 用 Host 或 `?site=` 识别站点；SSR 调后端用 `FEED_API_URL`。
- CSR：用 `NEXT_PUBLIC_FEED_API_URL`；types 放 `src/types/*`，fetch 封装到 `src/lib/*`。
- 测试：`npm test`（如配置了 Jest/RTL）。

## OpenSearch
- 新 mapping → 新索引（`news-<site>-v<ts>`），构建完成后别名切换到 `news-<site>`；**禁止**在线改 mapping。
- 查询必须含站点/租户过滤；size 上限与排序字段白名单。

## ML 排序
- 训练工序：`make ml-export` → `make ml-train` → `make ml-switch` → `make ml-enable`
- 回退：别名回滚 + 启用启发式。

## 文档与工具
- 开发者手册：`docs/architecture.md`（`make -f Makefile.docs docs-toc` 生成索引）
- 一键初始化：`make bootstrap-portal-only | bootstrap-single | bootstrap-multi`
- 单根目录部署：`make -f Makefile.root up-root`

## PR 检查清单
- [ ] 目录落位正确（apps/api/rest/*、apps/searchapp/*、portal/next/*）
- [ ] RBAC + 多租户过滤已实现
- [ ] 配置项默认关闭，并写入 `config/flags.yaml`（如新增特性）
- [ ] 有迁移/索引脚本/Make 任务（如涉及）
- [ ] 有最小测试与 README/注释
- [ ] 通过本地/容器端到端自测

任何与规则冲突的地方，请在 PR 描述中说明理由与迁移方案。
