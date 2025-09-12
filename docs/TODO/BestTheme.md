结论先说：你提出的「多主题（themes）+ 站点可自由选择主题 + 少量站点可做 overrides」方案在工程上**科学且可扩展**，前提是把“主题作为一等公民”落进**可注册、可版本、可灰度、可回退**的机制，并用**站点作用域**和**缓存标签**把越权与失效风暴挡住。下面给你一份**可直接落地的完整解决方案**（Wagtail 7.1 + DRF + Next.js 14，REST 出数），覆盖模型、API、前端主题系统、缓存/SEO、安全、部署与验收清单。

---

# 一、目标与原则

- **目标**：支持 Portal + 多子站，站点可在后台选择不同主题与布局；大部分站点共用官方主题，少数站点允许定制覆写（overrides）。
- **关键原则**

  1. **主题注册表**（registry）+ 版本目录：受控动态加载，避免任意字符串 import。
  2. **站点作用域强约束**：所有 REST 查询按 `site` 限定。
  3. **设计令牌（Design Tokens）**：CSS 变量驱动主题外观，组件逻辑尽量复用。
  4. **缓存与失效**：统一使用 `site:* / page:* / channel:* / region:*` 标签；Webhook 精准失效。
  5. **SEO**：门户自产文章全文；聚合文章仅摘要并 canonical 指向来源站。

---

# 二、后端（Wagtail 7.1 + DRF）

## 2.1 模型（精简关键字段）

- **Article(Page)**：`title, slug, excerpt, cover(Image), body(StreamField/RichText), publish_at, updated_at, channel(FK), region(FK), source_site(Site FK), allow_aggregate(bool), canonical_url, is_featured(bool), weight(int)`

  - 必建联合索引：`(source_site, publish_at, channel, region)`；可加 `(source_site, is_featured, weight, publish_at)`。

- **Channel(slug, name)**、**Region(slug, name, order)**
- **SiteSettings**（每站一条）

  - `theme_key: str`（如 `portal` / `localsite-default` / `magazine`）
  - `theme_version: str`（语义化版本：`1.2.0`；前端映射到 `v1/v2` 目录）
  - `layout_key: str`（如 `layout-portal-classic` / `layout-localsite-grid` / `layout-magazine`）
  - `brand_tokens: JSON`（站点级 token 覆盖，如 `--brand-primary`、圆角、字体…）
  - `modules: JSON`（首页/频道模块编排，如 `{"home":["hero","top","channels"]}`）
  - `customized: bool`（是否启用 overrides）
  - 其他：`seo_default_title`、`gtm_id`、`logo_url`…

> 门户自产文章：`source_site=portal_site`，canonical 指向门户；聚合文章：门户只摘要，canonical 指向子站原文。

## 2.2 REST API（只读公共）

- `GET /api/v1/articles?site=HOST&channel=&region=&q=&is_featured=&order=&limit=&offset=&fields=&include=`
- `GET /api/v1/articles/{slug}?site=HOST`
- `GET /api/v1/channels?site=HOST`
- `GET /api/v1/regions?site=HOST`
- `GET /api/v1/portal/articles?allow_aggregate=true&region=&channel=&order=&limit=&offset=`
- `GET /api/v1/site-settings?site=HOST`

**返回头建议**

- `Cache-Control: public, s-maxage=120, stale-while-revalidate=60`
- `ETag: <hash(updated_at)>`
- `Surrogate-Key: site:{host} page:{id} channel:{slug} region:{slug}`

## 2.3 Webhook（精准失效）

- Wagtail 发布/更新/撤稿 → `POST https://<front>/api/revalidate`
- 载荷：`{event, site, entity, pageId, slug, channel, region, at, signature(HMAC), nonce, timestamp}`
- 前端校验后：`revalidateTag('site:'+site)` + 可选 `revalidateTag('page:'+id)`/`revalidatePath('/news/'+slug)`

---

# 三、前端（Next.js 14，App Router）

## 3.1 目录与职责

```
app/
  (portal)/...                # 门户页面
  (localsite)/...             # 通用地方站页面
  api/
    revalidate/route.ts       # 接 webhook 做 revalidateTag/Path
    proxy/* (可选)            # 少量 BFF/签名拼装
themes/                       # 官方主题库（可多个版本目录）
  portal/v1/...
  localsite-default/v1/...
  magazine/v2/...
overrides/                    # 站点级完全定制（仅少量站点）
  shanghai.aivoya.com/...
base/                         # 核心通用组件与渲染器（不随站点改）
lib/
  api.ts                      # 统一封装取数
  theme-registry.ts           # 主题注册表
  theme-loader.ts             # 加载主题与布局
  tokens.ts                   # 注入 CSS 变量
middleware.ts                 # Host 分流到 (portal)/(localsite)
```

## 3.2 主题注册表（受控动态加载）

```ts
// lib/theme-registry.ts
export type ThemeId = "portal" | "localsite-default" | "magazine";
type Version = "v1" | "v2";
export const ThemeRegistry: Record<
  ThemeId,
  Record<Version, () => Promise<any>>
> = {
  portal: { v1: () => import("@/themes/portal/v1/index") },
  "localsite-default": {
    v1: () => import("@/themes/localsite-default/v1/index"),
  },
  magazine: { v2: () => import("@/themes/magazine/v2/index") },
};
export function resolveVersion(
  themeKey: ThemeId,
  themeVersion?: string
): Version {
  // 语义化版本→目录；可维护映射表（如 >=2.0→v2）
  if (themeKey === "magazine") return "v2";
  return "v1";
}
```

## 3.3 主题入口与布局

```ts
// 任一主题入口：themes/magazine/v2/index.ts
export const meta = {
  key: "magazine",
  version: "2.0.0",
  tokens: (siteTokens?: Record<string, string>) => ({
    "--brand-primary": "#0A7EFA",
    "--radius-xl": "1rem",
    ...siteTokens,
  }),
  layouts: {
    "layout-magazine": () => import("./layouts/layout-magazine"),
  },
};
```

```ts
// lib/theme-loader.ts
import { ThemeRegistry, resolveVersion } from "./theme-registry";
export async function loadTheme(themeKey: string, themeVersion?: string) {
  const key = themeKey as any;
  const ver = resolveVersion(key, themeVersion);
  return (await ThemeRegistry[key][ver]()).meta;
}
export async function pickLayout(meta: any, layoutKey: string, host: string) {
  // 站点 overrides 优先
  try {
    return (await import(`@/overrides/${host}/layouts/${layoutKey}`)).default;
  } catch {}
  // 主题布局
  if (meta.layouts[layoutKey]) return (await meta.layouts[layoutKey]()).default;
  // 回退到默认地方站布局
  return (
    await import("@/themes/localsite-default/v1/layouts/layout-localsite-grid")
  ).default;
}
```

```tsx
// lib/tokens.ts
export function TokenStyle({ tokens }: { tokens: Record<string, string> }) {
  const css = Object.entries(tokens)
    .map(([k, v]) => `--${k}:${v};`)
    .join("");
  return <style dangerouslySetInnerHTML={{ __html: `:root{${css}}` }} />;
}
```

## 3.4 页面加载流程（示例）

```tsx
// app/(localsite)/page.tsx
import { loadTheme, pickLayout } from "@/lib/theme-loader";
import { TokenStyle } from "@/lib/tokens";
import { getSiteSettings } from "@/lib/api";

export const revalidate = 120;
export default async function Home() {
  const host = getHost(); // 从 headers.host / middleware 注入
  const s = await getSiteSettings(host); // REST: /api/v1/site-settings?site=host
  const theme = await loadTheme(s.theme_key, s.theme_version);
  const Layout = await pickLayout(theme, s.layout_key, host);
  const tokens = theme.tokens(s.brand_tokens);
  return (
    <Layout>
      <TokenStyle tokens={tokens} />
      {/* 根据 s.modules 渲染模块；模块组件尽量复用 base/ 与主题内 components */}
    </Layout>
  );
}
```

## 3.5 Host 分流与内部 API

- `middleware.ts`：根域进 `(portal)`，子域进 `(localsite)`；`/_next/*` 与 `/api/*` 放行。
- 前端内部 API 仅保留：`/api/revalidate`（Webhook）、`/api/preview`（可选）、极少数 BFF `/api/proxy/*`（确需签名/拼装时才用）。

---

# 四、缓存、SEO 与安全

## 4.1 缓存策略

- **后端响应头**：`Cache-Control + ETag + Surrogate-Key`
- **Next 页面/接口**：`revalidate=120` + `tags: ['site:'+host]`；详情页额外打 `page:{id}`。
- **Webhook**：发布/更新/撤稿 → `revalidateTag('site:'+host)` + `revalidatePath('/news/[slug]')`（如有）。

## 4.2 SEO

- 门户自产文章：全文 + `<link rel="canonical" href="https://aivoya.com/news/[slug]">`
- 聚合文章：门户只摘要 + canonical 指向 `{region}.aivoya.com`
- 各站独立 `sitemap.xml`、`robots.txt`、`/feed.xml`；结构化数据 `NewsArticle`。

## 4.3 安全与越权

- **站点作用域**：所有 REST 必带 `site`；服务端以 `source_site`/`root_page` 限定范围。
- **主题白名单**：后端保存 `theme_key` 前校验必须在注册表清单内；前端仅按注册表可加载的 key/version 动态 import。
- **Webhook**：HMAC + 时间窗（±5min）+ 幂等 `nonce`。
- **proxy API**：校验 `site` 白名单；只做轻量签名/拼装，禁止在前端持有私钥。

---

# 五、部署拓扑（按增长路线）

1. **起步**：前端多实例（按站点扩）、后端单集群（读写分离），共用数据库与对象存储。
2. **中期**：前后端多实例，共用数据库/存储；热点站点可独立扩容。
3. **高隔离**：重点站点分片成独立后端/数据库；门户聚合从搜索引擎（OpenSearch）跨索引读取。

CDN/DNS 以 CNAME 将各站点指向对应前端/后端 origin；利用 `Surrogate-Key` 做边缘精准清理。

---

# 六、CI/CD 与版本治理（主题为一等公民）

- **主题版本目录**：`themes/<theme_key>/<vN>/...`；大改新建 `v2` 目录，小改发 patch。
- **灰度/回退**：`SiteSettings.theme_version` 或 `theme_channel`（beta/stable）映射到不同版本目录；切换即可回退，无需回滚代码。
- **脚手架**：`pnpm run scaffold:theme magazine@2` 生成目录骨架与默认 tokens。
- **打包检查**：仅打入注册表声明的主题文件，防止体积暴涨。

---

# 七、验收清单（上线前必须过）

1. **主题选择**：后台切换 `theme_key/layout_key/theme_version` 后，站点页面能正确渲染，且 `site:` 标签命中失效。
2. **回退与灰度**：把版本从 `2.0.0` 切回 `1.0.0` 不报错；可对小流量站做 beta。
3. **共用 vs 定制**：`customized=false` 的站点走官方主题；`customized=true` 命中 `overrides/<host>`；删除 overrides 能回退到主题。
4. **缓存命中**：后端 `ETag/Cache-Control/Surrogate-Key` 正确；前端页面 `revalidate` 与 `tags` 正确；Webhook 能精准失效。
5. **SEO**：门户自产/聚合 canonical 正确；各站 sitemap/robots/feed 无重复与缺漏。
6. **安全**：非法 `theme_key`/`site` 被拒；Webhook 未签名/过期拒绝；proxy 不充当开放代理。
7. **性能**：列表页命中缓存 P95 < 150ms；详情页命中缓存/ISR P95 < 250ms；主题切换不显著增 JS 体积。

---

# 八、最小对接代码（你可以直接抄）

**前端主题加载**：见 §3.2\~3.4 代码段。
**Webhook**（Next `/api/revalidate`）：

```ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const raw = Buffer.from(await req.arrayBuffer());
  const data = JSON.parse(raw.toString("utf8"));
  const mac = crypto
    .createHmac("sha256", process.env.WEBHOOK_SECRET!)
    .update(raw)
    .digest("hex");
  if (
    !crypto.timingSafeEqual(
      Buffer.from(mac),
      Buffer.from(data.signature || "", "hex")
    )
  )
    return NextResponse.json({ error: "bad signature" }, { status: 401 });

  // 精准失效
  // @ts-ignore
  await (global as any).revalidateTag?.(`site:${data.site}`);
  if (data.pageId)
    // @ts-ignore
    await (global as any).revalidateTag?.(`page:${data.pageId}`);
  if (data.slug)
    // @ts-ignore
    await (global as any).revalidatePath?.(`/news/${data.slug}`);
  return NextResponse.json({ ok: true }, { status: 202 });
}
```

**后端 REST 响应头（示例）**：

```py
def set_cache_headers(response, keys:list[str]):
    response['Cache-Control'] = 'public, s-maxage=120, stale-while-revalidate=60'
    response['Surrogate-Key'] = ' '.join(keys)  # ['site:beijing.aivoya.com','page:123']
    return response
```

---

## 总结

- 这套方案**科学、可扩展、可治理**：站点能自由选择主题并版本化管理；多数站点共用官方主题，少数站点可以覆写；缓存、SEO、安全与多实例部署都可控。
- 你可以先用两套主题（`portal@1`、`localsite-default@1`）上线，再追加一套新主题（`magazine@2`）做灰度验证。
- 需要的话，我可以把**主题注册表 + 三套示例主题 + overrides 示例站**打成最小可运行仓库骨架，直接起跑。
