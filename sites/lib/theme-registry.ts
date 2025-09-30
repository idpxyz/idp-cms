/**
 * 主题注册表系统
 *
 * 提供类型安全的主题加载机制，防止任意字符串导入
 * 支持版本化主题管理和动态加载
 */

// 支持的主题标识符（类型安全）
export type ThemeId =
  | "portal"
  | "localsite-default"
  | "magazine"
  | "beijing"
  | "shanghai";

// 支持的版本目录
export type Version = "v1" | "v2";

/**
 * 主题注册表
 *
 * 每个主题包含不同版本的动态导入函数
 * 使用 lazy import 实现按需加载
 */
export const ThemeRegistry: Record<
  ThemeId,
  Record<Version, () => Promise<any>>
> = {
  portal: {
    v1: () =>
      Promise.resolve({
        meta: {
          id: "portal",
          key: "portal",
          version: "1.0.0",
          name: "Portal",
          description: "现代化门户主题，适用于新闻网站和内容平台",
          layouts: {
            "layout-portal-modern": () =>
              import("@/themes/portal/v1/layouts/layout-portal-modern"),
            "layout-portal-magazine": () =>
              import("@/themes/portal/v1/layouts/layout-portal-magazine"),
          },
          modules: {
            "hero-banner": () =>
              import("@/themes/portal/v1/components/hero-banner"),
            "news-grid": () =>
              import("@/themes/portal/v1/components/news-grid"),
            "featured-carousel": () =>
              import("@/themes/portal/v1/components/featured-carousel"),
          },
          tokens: (siteTokens?: Record<string, string>) => ({
            primary: "#3B82F6",
            secondary: "#6B7280",
            accent: "#8B5CF6",
            ...siteTokens,
          }),
        },
      }),
    v2: () =>
      Promise.resolve({
        meta: {
          id: "portal",
          key: "portal",
          version: "2.0.0",
          name: "Portal v2",
          description: "门户主题v2版本，增强功能和性能",
          layouts: { "layout-portal-modern": async () => null },
          modules: {},
          tokens: (siteTokens?: Record<string, string>) => ({
            primary: "#3B82F6",
            secondary: "#6B7280",
            accent: "#8B5CF6",
            ...siteTokens,
          }),
        },
      }),
  },
  "localsite-default": {
    v1: () =>
      Promise.resolve({
        meta: {
          id: "localsite-default",
          key: "localsite-default",
          version: "1.0.0",
          name: "LocalSite Default",
          description: "地方站点默认主题，提供列表和砌墙布局",
          layouts: {
            "layout-localsite-list": () =>
              import(
                "@/themes/localsite-default/v1/layouts/layout-localsite-list"
              ),
            "layout-localsite-masonry": () =>
              import(
                "@/themes/localsite-default/v1/layouts/layout-localsite-masonry"
              ),
          },
          modules: {
            "local-hero": () =>
              import("@/themes/localsite-default/v1/components/local-hero"),
            "local-news": () =>
              import("@/themes/localsite-default/v1/components/local-news"),
            "local-sidebar": () =>
              import("@/themes/localsite-default/v1/components/local-sidebar"),
          },
          tokens: (siteTokens?: Record<string, string>) => ({
            primary: "#10B981",
            secondary: "#6B7280",
            accent: "#059669",
            ...siteTokens,
          }),
        },
      }),
    v2: () =>
      Promise.resolve({
        meta: {
          id: "localsite-default",
          key: "localsite-default",
          version: "2.0.0",
          name: "LocalSite Default v2",
          description: "地方站点默认主题v2版本，优化体验",
          layouts: { "layout-localsite-list": async () => null },
          modules: {},
          tokens: (siteTokens?: Record<string, string>) => ({
            primary: "#10B981",
            secondary: "#6B7280",
            accent: "#059669",
            ...siteTokens,
          }),
        },
      }),
  },
  magazine: {
    v1: () =>
      Promise.resolve({
        meta: {
          id: "magazine",
          key: "magazine",
          version: "1.0.0",
          name: "Magazine v1",
          description: "杂志风格主题v1版本，经典布局",
          layouts: { "layout-magazine": async () => null },
          modules: {},
          tokens: (siteTokens?: Record<string, string>) => ({
            primary: "#DC2626",
            secondary: "#6B7280",
            accent: "#B91C1C",
            ...siteTokens,
          }),
        },
      }),
    v2: () =>
      Promise.resolve({
        meta: {
          id: "magazine",
          key: "magazine",
          version: "2.0.0",
          name: "Magazine",
          description: "杂志风格主题，适用于编辑类和特色内容展示",
          layouts: {
            "layout-magazine": () =>
              import("@/themes/magazine/v2/layouts/layout-magazine"),
            "layout-magazine-minimal": () =>
              import("@/themes/magazine/v2/layouts/layout-magazine-minimal"),
            "layout-magazine-editorial": () =>
              import("@/themes/magazine/v2/layouts/layout-magazine-editorial"),
          },
          modules: {
            "magazine-hero": () =>
              import("@/themes/magazine/v2/components/magazine-hero"),
            "magazine-grid": () =>
              import("@/themes/magazine/v2/components/magazine-grid"),
            "magazine-feature": () =>
              import("@/themes/magazine/v2/components/magazine-feature"),
          },
          tokens: (siteTokens?: Record<string, string>) => ({
            primary: "#DC2626",
            secondary: "#6B7280",
            accent: "#B91C1C",
            ...siteTokens,
          }),
        },
      }),
  },
  beijing: {
    v1: () =>
      Promise.resolve({
        meta: {
          id: "beijing",
          key: "beijing",
          version: "1.0.0",
          name: "Beijing Classic",
          description: "北京站点经典主题，红色主题风格",
          layouts: {
            "layout-beijing-classic": () =>
              import("@/layouts/layout-beijing-classic"),
          },
          modules: {},
          tokens: (siteTokens?: Record<string, string>) => ({
            primary: "#DC2626",
            secondary: "#6B7280",
            accent: "#B91C1C",
            ...siteTokens,
          }),
        },
      }),
    v2: () =>
      Promise.resolve({
        meta: {
          id: "beijing",
          key: "beijing",
          version: "2.0.0",
          name: "Beijing Classic v2",
          description: "北京站点经典主题v2版本",
          layouts: { "layout-beijing-classic": async () => null },
          modules: {},
          tokens: (siteTokens?: Record<string, string>) => ({
            primary: "#DC2626",
            secondary: "#6B7280",
            accent: "#B91C1C",
            ...siteTokens,
          }),
        },
      }),
  },
  shanghai: {
    v1: () =>
      Promise.resolve({
        meta: {
          id: "shanghai",
          key: "shanghai",
          version: "1.0.0",
          name: "Shanghai Classic",
          description: "上海站点经典主题，蓝色主题风格",
          layouts: {
            "layout-shanghai-classic": () =>
              import("@/layouts/layout-shanghai-classic"),
          },
          modules: {},
          tokens: (siteTokens?: Record<string, string>) => ({
            primary: "#2563EB",
            secondary: "#6B7280",
            accent: "#1D4ED8",
            ...siteTokens,
          }),
        },
      }),
    v2: () =>
      Promise.resolve({
        meta: {
          id: "shanghai",
          key: "shanghai",
          version: "2.0.0",
          name: "Shanghai Classic v2",
          description: "上海站点经典主题v2版本",
          layouts: { "layout-shanghai-classic": async () => null },
          modules: {},
          tokens: (siteTokens?: Record<string, string>) => ({
            primary: "#2563EB",
            secondary: "#6B7280",
            accent: "#1D4ED8",
            ...siteTokens,
          }),
        },
      }),
  },
};

/**
 * 语义化版本到目录版本的映射
 *
 * @param themeKey 主题标识
 * @param themeVersion 语义化版本号 (如: "1.0.0", "2.1.3")
 * @returns 对应的目录版本 (如: "v1", "v2")
 */
export function resolveVersion(
  themeKey: ThemeId,
  themeVersion?: string
): Version {
  if (!themeVersion) {
    // 默认版本映射
    const defaults: Record<ThemeId, Version> = {
      portal: "v1",
      "localsite-default": "v1",
      magazine: "v2",
      beijing: "v1",
      shanghai: "v1",
    };
    return defaults[themeKey];
  }

  // 解析语义化版本
  const majorVersion = parseInt(themeVersion.split(".")[0]);

  // 版本映射策略：主版本号 >= 2 使用 v2，否则使用 v1
  if (majorVersion >= 2) {
    return "v2";
  }

  return "v1";
}

/**
 * 验证主题 key 是否在白名单内
 *
 * @param themeKey 要验证的主题标识
 * @returns 是否为合法的主题标识
 */
export function isValidThemeKey(themeKey: string): themeKey is ThemeId {
  return Object.keys(ThemeRegistry).includes(themeKey);
}

/**
 * 获取所有可用的主题列表
 *
 * @returns 主题元数据列表
 */
export function getAvailableThemes() {
  return [
    {
      key: "portal" as ThemeId,
      name: "门户主题",
      description: "适用于门户站点的现代化主题",
      versions: ["v1", "v2"],
    },
    {
      key: "localsite-default" as ThemeId,
      name: "通用地方站主题",
      description: "适用于地方站点的通用主题",
      versions: ["v1", "v2"],
    },
    {
      key: "magazine" as ThemeId,
      name: "杂志主题",
      description: "适用于杂志风格的主题",
      versions: ["v1", "v2"],
    },
  ];
}

/**
 * 检查主题版本是否存在
 *
 * @param themeKey 主题标识
 * @param version 版本号
 * @returns 版本是否存在
 */
export function hasThemeVersion(themeKey: ThemeId, version: Version): boolean {
  return themeKey in ThemeRegistry && version in ThemeRegistry[themeKey];
}
