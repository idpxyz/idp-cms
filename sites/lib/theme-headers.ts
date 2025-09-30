/**
 * 主题请求头工具
 *
 * 从 Next.js 请求头中提取主题相关信息
 */

import { headers } from "next/headers";

/**
 * 主题配置接口
 */
export interface ThemeHeaders {
  host: string;
  routeGroup: string;
  themeKey: string;
  layoutKey: string;
  themeVersion: string;
}

/**
 * 从请求头获取主题配置信息
 *
 * @returns 主题配置对象
 */
export async function getThemeHeaders(): Promise<ThemeHeaders> {
  const headersList = await headers();

  return {
    host:
      headersList.get("x-site-host") || headersList.get("host") || "localhost",
    routeGroup: headersList.get("x-route-group") || "portal",
    themeKey: headersList.get("x-theme-key") || "portal",
    layoutKey: headersList.get("x-layout-key") || "layout-portal-classic",
    themeVersion: headersList.get("x-theme-version") || "1.0.0",
  };
}

/**
 * 获取当前站点的主机名
 *
 * @returns 主机名
 */
export async function getHostname(): Promise<string> {
  const headersList = await headers();
  return (
    headersList.get("x-site-host") || headersList.get("host") || "localhost"
  );
}

/**
 * 获取当前路由组
 *
 * @returns 路由组 (portal | localsite)
 */
export async function getRouteGroup(): Promise<string> {
  const headersList = await headers();
  return headersList.get("x-route-group") || "portal";
}

/**
 * 检查是否为门户站点
 *
 * @returns 是否为门户站点
 */
export async function isPortalSite(): Promise<boolean> {
  return (await getRouteGroup()) === "portal";
}

/**
 * 检查是否为地方站点
 *
 * @returns 是否为地方站点
 */
export async function isLocalSite(): Promise<boolean> {
  return (await getRouteGroup()) === "localsite";
}

/**
 * 获取站点显示名称
 *
 * @returns 站点显示名称
 */
export async function getSiteDisplayName(): Promise<string> {
  const host = await getHostname();
  const routeGroup = await getRouteGroup();

  // 站点名称映射
  const siteNames: Record<string, string> = {
    localhost: "本地开发站",
    "aivoya.com": "AI旅行门户",
    "beijing.aivoya.com": "北京站",
    "shanghai.aivoya.com": "上海站",
    "hangzhou.aivoya.com": "杭州站",
    "shenzhen.aivoya.com": "深圳站",
  };

  return siteNames[host] || `${host} (${routeGroup})`;
}

/**
 * 创建主题相关的缓存标签
 *
 * @returns 缓存标签数组
 */
export async function getThemeCacheTags(): Promise<string[]> {
  const { host, themeKey, themeVersion } = await getThemeHeaders();

  return [
    `site:${host}`,
    `theme:${themeKey}`,
    `theme:${themeKey}@${themeVersion}`,
  ];
}
