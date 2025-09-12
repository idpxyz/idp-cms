import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge"; // 轻量级前端逻辑使用Edge
export const revalidate = 3600; // 1小时缓存

// 主题配置（纯前端，无后端依赖）
const THEME_CONFIGS = {
  portal: {
    name: "Portal Theme",
    description: "门户站点主题",
    variants: ["classic", "modern", "minimal"],
    default: "classic",
  },
  "localsite-default": {
    name: "Local Site Default",
    description: "地方站点默认主题",
    variants: ["default", "compact", "wide"],
    default: "default",
  },
  "localsite-shanghai": {
    name: "Shanghai Local Theme",
    description: "上海地方站点主题",
    variants: ["shanghai", "modern", "traditional"],
    default: "shanghai",
  },
  "localsite-beijing": {
    name: "Beijing Local Theme",
    description: "北京地方站点主题",
    variants: ["beijing", "classic", "contemporary"],
    default: "beijing",
  },
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const themeKey = url.searchParams.get("theme");
  const variant = url.searchParams.get("variant");

  if (themeKey) {
    const config = THEME_CONFIGS[themeKey as keyof typeof THEME_CONFIGS];
    if (!config) {
      return NextResponse.json({ error: "theme not found" }, { status: 404 });
    }

    // 如果指定了variant，检查是否支持
    if (variant && !config.variants.includes(variant)) {
      return NextResponse.json(
        {
          error: "variant not supported",
          theme: themeKey,
          variant,
          supported: config.variants,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      theme: themeKey,
      variant: variant || config.default,
      config,
      timestamp: new Date().toISOString(),
    });
  }

  // 返回所有主题配置
  const availableThemes = Object.entries(THEME_CONFIGS).map(
    ([key, config]) => ({
      key,
      ...config,
    })
  );

  return NextResponse.json({
    themes: availableThemes,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  // 用于动态主题配置更新（仅开发环境）
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "not allowed in production" },
      { status: 403 }
    );
  }

  try {
    const { themeKey, variant, customTokens } = await req.json();

    if (!themeKey) {
      return NextResponse.json({ error: "missing themeKey" }, { status: 400 });
    }

    const config = THEME_CONFIGS[themeKey as keyof typeof THEME_CONFIGS];
    if (!config) {
      return NextResponse.json({ error: "theme not found" }, { status: 404 });
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

    // 这里可以添加自定义令牌验证逻辑

    return NextResponse.json({
      success: true,
      theme: themeKey,
      variant: variant || config.default,
      customTokens,
      message: "Theme configuration updated",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Theme config error:", error);
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }
}
