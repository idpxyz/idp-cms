import { NextRequest, NextResponse } from "next/server";
import { validateSiteSettings } from "@/lib/schemas";
import { siteDataService } from "@/lib/services/site-data.service";

/**
 * 前端 API 路由：获取站点设置
 *
 * 使用统一的数据服务层，简化逻辑和提高可维护性
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const site = searchParams.get("site");

    if (!site) {
      return NextResponse.json(
        { error: "Site parameter is required" },
        { status: 400 }
      );
    }

    // 使用统一的数据服务获取站点设置
    const siteSettings = await siteDataService.getSiteSettings(site, {
      timeout: 15000,
    });

    // 验证数据（非强制性，只是警告）
    const validationResult = validateSiteSettings(siteSettings);
    if (!validationResult) {
      console.warn(
        `Site settings validation failed for ${site}, but continuing with available data`
      );
    }

    // 动态设置缓存策略
    const cacheMaxAge = siteSettings.cache_timeout || 180;
    const headers = {
      "Cache-Control": `public, max-age=${cacheMaxAge}, s-maxage=${cacheMaxAge}`,
      "Surrogate-Key": `site-settings-${site}`,
      "X-Site-ID": String(siteSettings.site_id),
      "X-Theme-Key": siteSettings.theme_key,
    };

    return NextResponse.json(validationResult || siteSettings, { headers });
  } catch (error) {
    console.error(`Failed to get site settings for ${request.url}:`, error);

    // 返回错误信息，让客户端处理
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-cache",
        },
      }
    );
  }
}

/**
 * 健康检查端点
 */
export async function HEAD(request: NextRequest) {
  return new NextResponse(null, { status: 200 });
}

/**
 * 预加载多个站点设置（可选的性能优化端点）
 */
export async function POST(request: NextRequest) {
  try {
    const { sites } = await request.json();

    if (!Array.isArray(sites)) {
      return NextResponse.json(
        { error: "Sites parameter must be an array" },
        { status: 400 }
      );
    }

    // 预加载站点数据
    await siteDataService.preloadSiteSettings(sites);

    return NextResponse.json({
      message: "Sites preloaded successfully",
      sites: sites,
    });
  } catch (error) {
    console.error("Failed to preload sites:", error);
    return NextResponse.json(
      { error: "Failed to preload sites" },
      { status: 500 }
    );
  }
}
