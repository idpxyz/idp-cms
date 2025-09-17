不建议默认全屏。**Channel Hero** 通常不做 100% 全屏，而是“占据显著面积但留出首屏下方的 Top Stories / Tabs 可见区”。给你一套可执行的尺寸与开关：

# 什么时候全屏？

* **仅在特殊态**：选举夜/大型赛事/重大灾害等“事件模式（event\_mode）”或有**重要直播**时，才用全屏/近全屏来接管注意力。
* 其他时间：保持“标准高度”，避免把频道内容全部推到折叠以下（会伤 CTR 和时长、拉高 LCP）。

# 三种模式（推荐）

| 模式                | 适用                          | Desktop 高度                           | Tablet   | Mobile   |
| ----------------- | --------------------------- | ------------------------------------ | -------- | -------- |
| **Compact**       | 日常频道头条 + 右侧栏存在              | **32–40vh**（或固定 420–520px）           | 28–36vh  | 36–44svh |
| **Standard（默认）**  | 频道有强头条，但希望 Top Stories 首屏可见 | **48–60vh**                          | 42–54vh  | 45–55svh |
| **Takeover（事件态）** | 直播 / 数据大屏 / 特大突发            | **85–95svh**（或 `calc(100svh - nav)`） | 80–90svh | 80–90svh |

> 说明
>
> * **svh** 优先于 vh（移动端地址栏收缩更稳定）。
> * 有 **右侧栏** 时，Hero 一般占**左两列**（3 栅格中的 2 栅格），高度相应取下限（例如 48vh 而不是 60vh）。
> * **视频头条**：用 16:9 容器（`aspect-ratio:16/9`），高度以容器适配而非硬性 100vh。

# 触发规则（决策）

1. `event_mode in {election, live_sport, disaster}` → **Takeover**
2. 否则若 `has_live == true` 或 `data_headline == true`（数据图表头条）且编辑“强推”为真 → **Standard**（上限 60vh）
3. 其他 → **Compact**（32–40vh）

# Wagtail Block 参数（加两个开关就够用）

```python
# 在 HeroCarouselBlock 里新增
height_mode = blocks.ChoiceBlock(
    choices=[("compact","Compact"), ("standard","Standard"), ("takeover","Takeover")],
    default="standard", label="高度模式"
)
max_height_vh = blocks.IntegerBlock(default=60, help_text="Desktop 最大高度(vh)")
show_right_rail = blocks.BooleanBlock(required=False, default=True, label="是否有右侧栏")
```

# 前端实现要点（Next.js + Tailwind 示例）

```tsx
// ChannelHero.tsx
export default function ChannelHero({ mode="standard", rightRail=false, media }: {
  mode?: "compact"|"standard"|"takeover"; rightRail?: boolean; media?: "image"|"video"|"data";
}) {
  const h = mode==="takeover" ? "min-h-[85svh]"
         : mode==="compact" ? "min-h-[36svh] md:min-h-[34vh] lg:min-h-[38vh]"
         : /* standard */     "min-h-[50svh] md:min-h-[50vh] lg:min-h-[56vh]";
  const grid = rightRail ? "lg:col-span-2" : "lg:col-span-3";
  return (
    <section className={`grid lg:grid-cols-3 ${h}`}>
      <div className={`${grid} relative overflow-hidden`}>
        {/* 图片或视频容器 */}
        <div className={media==="video" ? "aspect-video" : "h-full"}>
          {/* 这里放 Image / <video> / 数据图组件 */}
        </div>
        {/* 文字层 */}
        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/50 to-transparent text-white">
          <h1 className="text-2xl lg:text-3xl font-bold line-clamp-2">频道头条标题</h1>
          <p className="opacity-90 text-sm lg:text-base line-clamp-2">摘要…</p>
        </div>
      </div>
      {rightRail && (
        <aside className="hidden lg:block pl-6">
          {/* 正在直播 / 专题入口 / Most Read */}
        </aside>
      )}
    </section>
  );
}
```

# 内容/性能细则

* **避免 LCP 过大**：Standard/Compact 下让 Top Stories 的第一行**露头**，用户不必滚动就能看到下一组内容。
* **图片**：用 Wagtail Renditions（WebP/AVIF），Hero 图 `priority` + `sizes="(min-width:1024px) 66vw, 100vw"`。
* **视频**：`muted playsInline autoPlay loop`（事件态可展示控件）；提供 `poster`，首屏不要等待 HLS。
* **数据头条**：将图表放入 **56vh** 容器内，超出部分滚动或折叠，避免撑满屏。
* **无障碍**：文本覆盖层需满足 4.5:1 对比度；键盘可聚焦“正在直播/专题”入口。

**结论**：默认**不是全屏**。采用 **Compact/Standard** 为常态，**Takeover** 只在事件模式触发；这样既保证权威曝光，又不牺牲首屏的可见信息量与性能指标。
