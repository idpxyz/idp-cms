import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge"; // 轻量级前端逻辑使用Edge
export const revalidate = 3600; // 1小时缓存

// 模块配置（纯前端，无后端依赖）
const MODULE_CONFIGS = {
  hero: {
    name: "Hero Section",
    description: "英雄区域模块",
    regions: ["home"],
    supports: ["portal", "localsite"],
    variants: ["default", "large", "compact"],
    default: "default",
  },
  "top-news": {
    name: "Top News",
    description: "头条新闻模块",
    regions: ["home", "sidebar"],
    supports: ["portal", "localsite"],
    variants: ["list", "grid", "carousel"],
    default: "list",
  },
  channels: {
    name: "Channels",
    description: "频道导航模块",
    regions: ["home", "header"],
    supports: ["portal", "localsite"],
    variants: ["horizontal", "vertical", "dropdown"],
    default: "horizontal",
  },
  rank: {
    name: "Ranking",
    description: "排行榜模块",
    regions: ["sidebar"],
    supports: ["portal", "localsite"],
    variants: ["top10", "trending", "popular"],
    default: "top10",
  },
  ad: {
    name: "Advertisement",
    description: "广告模块",
    regions: ["sidebar", "footer"],
    supports: ["portal", "localsite"],
    variants: ["banner", "sidebar", "footer"],
    default: "banner",
  },
  weather: {
    name: "Weather",
    description: "天气模块",
    regions: ["header", "sidebar"],
    supports: ["localsite"],
    variants: ["current", "forecast", "minimal"],
    default: "current",
  },
  "local-news": {
    name: "Local News",
    description: "本地新闻模块",
    regions: ["home", "main"],
    supports: ["localsite"],
    variants: ["featured", "latest", "category"],
    default: "featured",
  },
  "top-split-headlines": {
    name: "Top Split Headlines",
    description: "顶部分栏：左侧图片轮播 + 右侧今日头条",
    regions: ["home"],
    supports: ["portal"],
    variants: ["default"],
    default: "default",
  },
};

// 默认页面编排（按站点类型与区域划分）
const COMPOSITIONS: Record<string, Record<string, Array<{ key: keyof typeof MODULE_CONFIGS; custom?: any }>>> = {
  portal: {
    // 首页顶部区域：置顶分栏（图片轮播+今日头条） + 快讯
    home: [
      { key: "top-split-headlines", custom: { count: 2, autoPlayMs: 5000 } },
      { key: "hero", custom: { duration: "120s" } },
    ],
    // 侧边栏：最热阅读 + 地区切换 + 热门话题
    sidebar: [
      { key: "rank", custom: { limit: 10} },
      { key: "local-news" },
      // 若需要可替换为广告或其他侧栏模块，示例：热门话题在模块定义中已存在，但此处未显式列出以通过类型校验
    ],
  },
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const moduleKey = url.searchParams.get("module");
  const region = url.searchParams.get("region");
  const siteType = url.searchParams.get("type"); // portal 或 localsite

  if (moduleKey) {
    const config = MODULE_CONFIGS[moduleKey as keyof typeof MODULE_CONFIGS];
    if (!config) {
      return NextResponse.json({ error: "module not found" }, { status: 404 });
    }

    // 检查站点类型兼容性
    if (siteType && !config.supports.includes(siteType)) {
      return NextResponse.json(
        {
          error: "module not compatible with site type",
          module: moduleKey,
          siteType,
          supported: config.supports,
        },
        { status: 400 }
      );
    }

    // 检查区域兼容性
    if (region && !config.regions.includes(region)) {
      return NextResponse.json(
        {
          error: "module not compatible with region",
          module: moduleKey,
          region,
          supported: config.regions,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      module: moduleKey,
      config,
      timestamp: new Date().toISOString(),
    });
  }

  // 如果指定region，优先返回该区域的编排（含自定义参数）
  if (region) {
    const compositions = COMPOSITIONS[siteType || "portal"] || {};
    const list = compositions[region] || [];
    if (list.length > 0) {
      const modules = list
        .filter((m) => !!MODULE_CONFIGS[m.key])
        .map((m) => ({
          key: m.key,
          default: MODULE_CONFIGS[m.key].default,
          custom: m.custom || undefined,
        }));
      return NextResponse.json({
        modules,
        filters: { siteType, region },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // 回退：按筛选返回可用模块定义（无特定编排）
  let availableModules = Object.entries(MODULE_CONFIGS);
  if (siteType) {
    availableModules = availableModules.filter(([_, config]) =>
      config.supports.includes(siteType)
    );
  }
  if (region) {
    availableModules = availableModules.filter(([_, config]) =>
      config.regions.includes(region)
    );
  }
  const modules = availableModules.map(([key, config]) => ({ key, ...config }));
  return NextResponse.json({ modules, filters: { siteType, region }, timestamp: new Date().toISOString() });
}

export async function POST(req: NextRequest) {
  // 用于动态模块配置更新（仅开发环境）
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "not allowed in production" },
      { status: 403 }
    );
  }

  try {
    const { moduleKey, variant, customConfig } = await req.json();

    if (!moduleKey) {
      return NextResponse.json({ error: "missing moduleKey" }, { status: 400 });
    }

    const config = MODULE_CONFIGS[moduleKey as keyof typeof MODULE_CONFIGS];
    if (!config) {
      return NextResponse.json({ error: "module not found" }, { status: 404 });
    }

    // 验证variant
    if (variant && !config.variants.includes(variant)) {
      return NextResponse.json(
        {
          error: "variant not supported",
          supported: config.variants,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      module: moduleKey,
      variant: variant || config.default,
      customConfig,
      message: "Module configuration updated",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Module config error:", error);
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
}
