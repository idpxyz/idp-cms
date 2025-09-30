/**
 * 主题加载器
 *
 * 负责动态加载主题和布局组件
 * 支持主题回退和 overrides 机制
 */

import React from "react";
import {
  ThemeRegistry,
  ThemeId,
  resolveVersion,
  isValidThemeKey,
} from "./theme-registry";
import { trackThemeLoad } from "./performance";
import { siteConfigManager } from "./site-config-manager";

/**
 * 主题元数据接口
 */
export interface ThemeMeta {
  key: string;
  version: string;
  tokens: (siteTokens?: Record<string, string>) => Record<string, string>;
  layouts: Record<string, () => Promise<any>>;
}

/**
 * 加载主题元数据
 *
 * @param themeKey 主题标识
 * @param themeVersion 主题版本（可选）
 * @returns 主题元数据
 */
export async function loadTheme(
  themeKey: string,
  themeVersion?: string,
  host: string = "unknown"
): Promise<ThemeMeta> {
  // 验证主题 key 是否合法
  if (!isValidThemeKey(themeKey)) {
    console.warn(
      `Invalid theme key: ${themeKey}, falling back to localsite-default`
    );
    themeKey = "localsite-default";
  }

  const typedThemeKey = themeKey as ThemeId;
  const version = resolveVersion(typedThemeKey, themeVersion);

  // 使用性能监控包装主题加载
  return trackThemeLoad(themeKey, themeVersion || "1.0.0", host, async () => {
    try {
      // 动态加载主题模块
      const themeModule = await ThemeRegistry[typedThemeKey][version]();

      if (!themeModule?.meta) {
        throw new Error(
          `Theme module ${themeKey}@${version} does not export meta`
        );
      }

      return themeModule.meta;
    } catch (error) {
      console.error(`Failed to load theme ${themeKey}@${version}:`, error);

      // 回退到默认主题
      if (themeKey !== "localsite-default") {
        console.log("Falling back to localsite-default theme");
        return loadTheme("localsite-default", "1.0.0", host);
      }

      // 如果连默认主题都加载失败，抛出错误
      throw new Error(`Critical: Failed to load fallback theme`);
    }
  });
}

/**
 * 选择和加载布局组件
 *
 * @param meta 主题元数据
 * @param layoutKey 布局标识
 * @param host 主机名（用于查找 overrides）
 * @returns 布局组件
 */
export async function pickLayout(
  meta: ThemeMeta,
  layoutKey: string,
  host: string
): Promise<React.ComponentType<any>> {
  // 1. 优先尝试站点特定的 overrides
  if (host) {
    try {
      const overrideModule = await import(
        `@/overrides/${host}/layouts/${layoutKey}`
      );
      if (overrideModule?.default) {
        console.log(`Using override layout: ${host}/${layoutKey}`);
        return overrideModule.default;
      }
    } catch (error) {
      // overrides 不存在是正常的，继续尝试主题布局
      console.debug(`No override layout found for ${host}/${layoutKey}`);
    }
  }

  // 2. 尝试主题内置布局
  if (meta.layouts[layoutKey]) {
    try {
      const layoutModule = await meta.layouts[layoutKey]();
      if (layoutModule?.default) {
        console.log(`Using theme layout: ${meta.key}/${layoutKey}`);
        return layoutModule.default;
      }
    } catch (error) {
      console.error(`Failed to load theme layout ${layoutKey}:`, error);
    }
  }

  // 3. 回退到默认布局
  try {
    console.log(`Falling back to default layout for ${layoutKey}`);

    // 根据布局类型选择合适的回退布局
    let fallbackLayout: string;
    if (layoutKey.includes("portal")) {
      fallbackLayout = "layout-portal-classic";
    } else {
      fallbackLayout = "layout-localsite-grid";
    }

    const fallbackModule = await import(
      `@/themes/localsite-default/v1/layouts/${fallbackLayout}`
    );

    if (fallbackModule?.default) {
      return fallbackModule.default;
    }
  } catch (error) {
    console.error(`Failed to load fallback layout:`, error);
  }

  // 4. 最后的回退：返回一个基本布局
  const FallbackLayout = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      "div",
      { className: "min-h-screen bg-gray-50" },
      React.createElement(
        "div",
        { className: "max-w-7xl mx-auto px-4 py-8" },
        children
      )
    );
  FallbackLayout.displayName = "FallbackLayout";
  return FallbackLayout;
}

/**
 * 获取主题配置信息
 *
 * @param themeKey 主题标识
 * @param themeVersion 主题版本
 * @param layoutKey 布局标识
 * @param host 主机名
 * @returns 主题配置信息
 */
export async function getThemeConfig(
  themeKey: string,
  themeVersion?: string,
  layoutKey?: string,
  host?: string
) {
  const meta = await loadTheme(themeKey, themeVersion);

  const config = {
    meta,
    hasOverrides: false,
    availableLayouts: Object.keys(meta.layouts),
    resolvedVersion: resolveVersion(themeKey as ThemeId, themeVersion),
  };

  // 检查是否有 overrides
  if (host && layoutKey) {
    try {
      await import(`@/overrides/${host}/layouts/${layoutKey}`);
      config.hasOverrides = true;
    } catch {
      // 没有 overrides 是正常的
    }
  }

  return config;
}

/**
 * 预加载主题资源
 *
 * @param themeKey 主题标识
 * @param themeVersion 主题版本
 */
export async function preloadTheme(themeKey: string, themeVersion?: string) {
  try {
    await loadTheme(themeKey, themeVersion);
    console.log(`Theme ${themeKey}@${themeVersion} preloaded`);
  } catch (error) {
    console.warn(`Failed to preload theme ${themeKey}@${themeVersion}:`, error);
  }
}

/**
 * 加载主题布局组件（用于站点布局）
 *
 * @param siteSettings 站点设置
 * @returns 布局组件
 */
export async function loadThemeLayout(
  siteSettings?: any
): Promise<React.ComponentType<any>> {
  if (!siteSettings) {
    // 如果没有站点设置，使用默认主题
    return loadDefaultTheme();
  }

  const themeKey = siteSettings.theme_key || "localsite-default";
  const themeVersion = siteSettings.theme_version || "1.0.0";
  const layoutKey = siteSettings.layout_key || "layout-localsite-grid";
  const host = siteSettings.site_host || "localhost";

  try {
    // 使用配置管理器验证配置
    const validation = siteConfigManager.validateSiteConfig(siteSettings);
    if (!validation.valid) {
      console.warn("Site config validation failed:", validation.errors);
    }

    // 获取主题配置
    const themeConfig = siteConfigManager.getThemeConfig(themeKey);
    if (!themeConfig) {
      console.warn(`Theme config not found for key: ${themeKey}`);
    }

    // 获取布局配置
    const layoutConfig = siteConfigManager.getLayoutConfig(layoutKey);
    if (!layoutConfig) {
      console.warn(`Layout config not found for key: ${layoutKey}`);
    }

    // 加载主题元数据
    const meta = await loadTheme(themeKey, themeVersion, host);

    // 计算 tokens（在服务端执行函数）
    const computedTokens = meta.tokens(siteSettings.brand_tokens);

    // 选择布局组件
    const Layout = await pickLayout(meta, layoutKey, host);

    // 返回包装后的布局组件，避免函数传递问题
    const WrappedLayout = ({ children, ...props }: any) => {
      return React.createElement(
        Layout,
        {
          ...props,
          siteSettings: {
            ...siteSettings,
            computedTokens, // 传递计算后的 tokens
            themeMeta: {
              ...meta,
              tokens: computedTokens, // 替换函数为计算结果
            },
            // 添加配置管理器提供的信息
            themeConfig,
            layoutConfig,
          },
        },
        children
      );
    };

    return WrappedLayout;
  } catch (error) {
    console.error("Failed to load theme with siteSettings:", error);
    return loadDefaultTheme();
  }
}

/**
 * 加载默认主题
 */
async function loadDefaultTheme(): Promise<React.ComponentType<any>> {
  try {
    const meta = await loadTheme("localsite-default", "1.0.0", "localhost");
    const Layout = await pickLayout(meta, "layout-localsite-grid", "localhost");
    return Layout;
  } catch (error) {
    console.error("Failed to load default theme:", error);

    // 最后的回退：返回一个基本布局
    const FallbackLayout = ({ children }: { children: React.ReactNode }) =>
      React.createElement(
        "div",
        { className: "min-h-screen bg-gray-50" },
        React.createElement(
          "div",
          { className: "max-w-7xl mx-auto px-4 py-8" },
          children
        )
      );
    FallbackLayout.displayName = "FallbackLayout";
    return FallbackLayout;
  }
}
