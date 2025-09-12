[1 tool called]

下面基于你这份 layout.md，给出一套工程化可落地的实现与组织方案。目标是：统一布局与间距、一处配置多处生效、模块可插拔、渲染策略清晰、监控与实验内建。

### 1) 设计变量与约束（Design Tokens）
- 核心变量集中定义（可放 `sites/styles/tokens.css` 或 TS 常量）
  - 间距与容器：`--container-max: 80rem`、`--gutter-x: 1rem`、`--section-gap-y: 1rem|1.5rem|2rem`
  - 圆角与阴影：`--radius-md`、`--shadow-sm`
  - 层级与吸顶：`--z-header: 50`、`--z-nav: 30`、`--sticky-offset: 64px`
  - 品牌色与文本色：由 `siteSettings` 注入，CSS 变量挂到 `<html>` 上
- 使用约束
  - 页级容器限用统一的 `max-w-7xl mx-auto px-4`
  - Section 的上下间距用统一的 `var(--section-gap-y)` 映射到 Tailwind 原子类或自定义 class

### 2) 共享布局组件（复用容器与间距）
- `PageContainer`：统一 `max-w-7xl mx-auto px-4`，可接受 `as="section"`、`padding="none|sm|md"` 等
- `Section`：封装上下间距、标题样式及可选分割线
- 约定：页面内所有块都包在 `Section` 里，不直接在业务组件里随意加 `mt-...`

### 3) 频道导航与吸顶一致性
- 固定 `sticky top-[var(--sticky-offset)]`（通过布局 header 高度推导或直接写死 64px），并将该值在 `PortalClassicLayout` 输出到 CSS 变量
- 所有吸顶模块共用这个变量，避免局部 hardcode 造成不一致

### 4) 模块化系统（可插拔，区域化）
- 类型定义 `Module`, `Region`, `ModuleProps`（存于 `sites/components/modules/types.ts`）
- 注册表 `registry`（`sites/components/modules/registry.ts`）
  - key: `top-news`, `quick-ticker`, `most-read`, `region-switcher`, `strategy-bar`, `hot-topics` 等
  - value: 懒加载组件 + 默认配置 + 渲染策略（SSR/ISR/CSR）
- 动态渲染器 `ModuleRenderer`
  - 输入：`[{ key: 'quick-ticker', region: 'home-top', props: {...}}]`
  - 输出：按 region slots 渲染到页面（如 `home-top`, `left-column`, `right-column`, `footer`）
- 现有块抽象为模块
  - `QuickTicker`, `MostRead`, `RegionSwitcher`, `StrategyBar`, `TodayHeadlines`, `EditorsChoice`, `HotTopics`
  - 每个模块有独立 props、数据抓取逻辑（可在 server 端或客户端，见第 6 点）

### 5) 配置从接口下发（运营/AB 可控）
- `/api/frontend/modules`
  - 返回模块清单与顺序、开关、region 分配、实验分组、策略参数（如 ticker 断点速度）
  - 渲染时 SSR 先取配置（ISR 缓 5-10 分钟），再按配置加载模块
- 本地开发：无接口时可用 `fallback` 配置（项目内 JSON）

### 6) 渲染策略（SSR/ISR/CSR）清晰化
- SSR：仅壳（Header/Nav/框架）与轻量配置
- ISR：频道列表、模块清单（10 分钟）；可通过 tag 失效
- CSR：信息流（feed）与用户态模块；快讯、策略条按需 CSR
- 模块粒度策略
  - `QuickTicker`：CSR + 客户端懒加载，支持 `prefers-reduced-motion`
  - `MostRead`：CSR（读 `/api/feed?sort=hot`），或 ISR 取 `/api/news?category=hot`
  - `StrategyBar`：CSR，贴合实时调试
  - `TodayHeadlines`：ISR + 前端兜底
- 缓存
  - 接口层添加 `s-maxage` 与 SWR，错误时回退空结构但 200

### 7) 数据回退与错误边界
- `/api/feed` 已加 429/5xx 回退到 `/api/articles/`，继续保留并完善
- 前端模块数据层（hooks）统一处理：
  - 超时/429 → 走兜底（本地/缓存）
  - 空数据 → 渲染空态组件，不影响布局
- React Error Boundary：模块级兜底，不影响其他模块渲染

### 8) 统一埋点与 A/B
- 基础事件：曝光（Impression）、点击（Click）、停留（Dwell）
- 模块自带 `data-module-key`，渲染器自动注入 moduleKey 与位置
- A/B：从 `/api/frontend/modules` 下发 `variant` 或特性开关，模块按 props 生效

### 9) 快讯速度与动效治理（已落地）
- 使用断点变量控制 `--ticker-duration`（手机 80s、平板 120s、桌面 160s）
- 悬停暂停、`prefers-reduced-motion` 停止
- 如果还晕，可以进一步：
  - 降低滚动距离（每次只移动半屏）
  - 增加淡入淡出切换（非连续滚动）

### 10) 文档与守则
- StyleGuide（间距、容器、吸顶、颜色、阴影）
- Module Authoring Guide（如何注册/渲染/埋点/回退/缓存策略）
- 目录建议
  - `sites/components/layout/`：`PageContainer`, `Section`
  - `sites/components/modules/`：模块组件与 `registry.ts`
  - `sites/lib/modules/`：模块类型、渲染器
  - `sites/app/api/frontend/modules/route.ts`：配置接口

如果你同意，我可以先落地两件事：
- 抽出 `PageContainer` 与 `Section`，替换首页里的容器与 Section 间距（确保以后间距统一）
- 建立 `modules/registry` 与 `ModuleRenderer`，把 `QuickTicker/MostRead/RegionSwitcher/StrategyBar`注册成模块，并让页面通过配置渲染。