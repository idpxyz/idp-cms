import { NextRequest, NextResponse } from "next/server";
import { getSiteRouteMap, getThemeConfigMap, getMainSite } from "@/lib/config/sites";

// 使用统一的站点配置
const SITE_ROUTES = getSiteRouteMap();

// 使用统一的主题配置
const SITE_THEME_CONFIG = getThemeConfigMap();

// 路径前缀映射（用于localhost访问）
const PATH_ROUTES = {
  "/beijing": "beijing", // 北京站
  "/shanghai": "shanghai", // 上海站
  "/hangzhou": "hangzhou", // 杭州站
  "/shenzhen": "shenzhen", // 深圳站
  "/portal": "portal", // 门户站
};

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const hostname = host.split(":")[0]; // 移除端口号
  const pathname = request.nextUrl.pathname;

  // 如果是API请求，不重写路由
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // 特殊路径不重写（直接访问的页面）
  const specialPaths = ["/config-demo", "/config-demo/"];
  if (specialPaths.includes(pathname)) {
    return NextResponse.next();
  }

  // 检查是否是localhost的路径前缀访问
  if (hostname === "localhost") {
    // 检查路径前缀
    for (const [prefix, routeGroup] of Object.entries(PATH_ROUTES)) {
      if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
        const url = request.nextUrl.clone();
        // 移除前缀，重写到对应的路由组
        url.pathname = `/${routeGroup}${pathname.replace(prefix, "")}`;

        const response = NextResponse.rewrite(url);
        response.headers.set("x-site-host", prefix.slice(1)); // 移除开头的/
        response.headers.set("x-route-group", routeGroup);

        // 添加主题信息
        const localThemeConfig =
          SITE_THEME_CONFIG["localhost"] || SITE_THEME_CONFIG[getMainSite().hostname];
        response.headers.set("x-theme-key", localThemeConfig.theme_key);
        response.headers.set("x-layout-key", localThemeConfig.layout_key);
        response.headers.set("x-theme-version", "1.0.0");

        return response;
      }
    }
  }

  // 确定路由组
  const routeGroup =
    SITE_ROUTES[hostname as keyof typeof SITE_ROUTES] || "localsite";

  // 特殊处理：如果是/portal路径，直接重写到portal目录
  if (
    request.nextUrl.pathname === "/portal" ||
    request.nextUrl.pathname.startsWith("/portal/")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = `/portal${request.nextUrl.pathname.replace(/^\/portal/, "")}`;

    const response = NextResponse.rewrite(url);
    response.headers.set("x-site-host", hostname);
    response.headers.set("x-route-group", "portal");

    // 添加门户主题信息
    const portalThemeConfig =
      SITE_THEME_CONFIG[hostname as keyof typeof SITE_THEME_CONFIG] ||
      SITE_THEME_CONFIG[getMainSite().hostname];
    response.headers.set("x-theme-key", portalThemeConfig.theme_key);
    response.headers.set("x-layout-key", portalThemeConfig.layout_key);
    response.headers.set("x-theme-version", "1.0.0");

    return response;
  }

  // 重写路由到对应的路径
  const url = request.nextUrl.clone();
  url.pathname = `/${routeGroup}${url.pathname}`;

  // 添加站点信息到请求头
  const response = NextResponse.rewrite(url);
  response.headers.set("x-site-host", hostname);
  response.headers.set("x-route-group", routeGroup);

  // 添加主题相关信息到请求头
  const themeConfig =
    SITE_THEME_CONFIG[hostname as keyof typeof SITE_THEME_CONFIG] ||
    SITE_THEME_CONFIG[getMainSite().hostname]; // 默认回退到门户配置

  response.headers.set("x-theme-key", themeConfig.theme_key);
  response.headers.set("x-layout-key", themeConfig.layout_key);
  response.headers.set("x-theme-version", "1.0.0"); // 默认版本

  return response;
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径，除了：
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
