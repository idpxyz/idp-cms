/**
 * 站点配置管理器 - 重构版本
 *
 * 主要用于主题和布局配置的管理
 * 站点数据获取通过 SiteDataService 处理
 */

import { SiteSettings } from "@/lib/types/index";
import { siteDataService } from "@/lib/services/site-data.service";

// 为了向后兼容，保留 SiteConfig 接口
export type SiteConfig = SiteSettings;

export interface ThemeConfig {
  key: string;
  version: string;
  name: string;
  description: string;
  layouts: Record<string, string>;
  modules: Record<string, string>;
}

export interface LayoutConfig {
  key: string;
  name: string;
  description: string;
  component: string;
}

/**
 * 站点配置管理器 - 简化版本
 * 专注于主题和布局配置管理
 */
export class SiteConfigManager {
  private static instance: SiteConfigManager;

  private constructor() {}

  static getInstance(): SiteConfigManager {
    if (!SiteConfigManager.instance) {
      SiteConfigManager.instance = new SiteConfigManager();
    }
    return SiteConfigManager.instance;
  }

  /**
   * 获取站点配置（委托给 SiteDataService）
   */
  async getSiteConfig(siteId: string): Promise<SiteConfig | null> {
    try {
      return await siteDataService.getSiteSettings(siteId);
    } catch (error) {
      console.error(`Failed to get site config for ${siteId}:`, error);
      return null;
    }
  }

  /**
   * 获取主题配置
   */
  getThemeConfig(themeKey: string): ThemeConfig | null {
    const themeRegistry: Record<string, ThemeConfig> = {
      portal: {
        key: "portal",
        version: "1.0.0",
        name: "门户主题",
        description: "适用于门户网站的现代化主题",
        layouts: {
          default: "layout-portal-grid",
          classic: "layout-portal-classic",
        },
        modules: {
          hero: "@/components/modules/portal/hero",
          stats: "@/components/modules/portal/stats",
          features: "@/components/modules/portal/features",
          "news-grid": "@/components/modules/portal/news-grid",
          "featured-carousel": "@/components/modules/portal/featured-carousel",
          cta: "@/components/modules/portal/cta",
        },
      },
      "localsite-default": {
        key: "localsite-default",
        version: "1.0.0",
        name: "地方站默认主题",
        description: "适用于地方新闻站的简洁主题",
        layouts: {
          default: "layout-localsite-grid",
          classic: "layout-localsite-classic",
        },
        modules: {
          "local-hero": "@/components/modules/localsite/local-hero",
          "local-news": "@/components/modules/localsite/local-news",
          "local-events": "@/components/modules/localsite/local-events",
          weather: "@/components/modules/common/weather",
          traffic: "@/components/modules/common/traffic",
          services: "@/components/modules/common/services",
          contact: "@/components/modules/common/contact",
        },
      },
      magazine: {
        key: "magazine",
        version: "1.0.0",
        name: "杂志主题",
        description: "适用于杂志风格的内容展示",
        layouts: {
          default: "layout-magazine-grid",
          classic: "layout-magazine-classic",
        },
        modules: {
          "featured-article": "@/components/modules/magazine/featured-article",
          "article-grid": "@/components/modules/magazine/article-grid",
          "category-nav": "@/components/modules/magazine/category-nav",
        },
      },
    };

    return themeRegistry[themeKey as keyof typeof themeRegistry] || null;
  }

  /**
   * 获取布局配置
   */
  getLayoutConfig(layoutKey: string): LayoutConfig | null {
    const layoutRegistry: Record<string, LayoutConfig> = {
      "layout-portal-grid": {
        key: "layout-portal-grid",
        name: "门户网格布局",
        description: "现代化的网格布局，适合门户首页",
        component: "@/layouts/layout-portal-grid",
      },
      "layout-portal-classic": {
        key: "layout-portal-classic",
        name: "门户经典布局",
        description: "传统的门户布局，内容丰富",
        component: "@/layouts/layout-portal-classic",
      },
      "layout-localsite-grid": {
        key: "layout-localsite-grid",
        name: "地方站网格布局",
        description: "适合地方新闻站的简洁布局",
        component: "@/layouts/layout-localsite-grid",
      },
      "layout-localsite-classic": {
        key: "layout-localsite-classic",
        name: "地方站经典布局",
        description: "传统的地方站布局",
        component: "@/layouts/layout-localsite-classic",
      },
      "layout-magazine-grid": {
        key: "layout-magazine-grid",
        name: "杂志网格布局",
        description: "杂志风格的网格布局",
        component: "@/layouts/layout-magazine-grid",
      },
      "layout-magazine-classic": {
        key: "layout-magazine-classic",
        name: "杂志经典布局",
        description: "传统的杂志布局",
        component: "@/layouts/layout-magazine-classic",
      },
    };

    return layoutRegistry[layoutKey as keyof typeof layoutRegistry] || null;
  }

  /**
   * 清除缓存（委托给 SiteDataService）
   */
  clearCache(siteId?: string): void {
    siteDataService.clearCache(siteId);
  }

  /**
   * 获取所有可用站点
   */
  getAvailableSites(): string[] {
    return [
      "localhost",
      "aivoya.com",
      "beijing.aivoya.com",
      "shanghai.aivoya.com",
      "hangzhou.aivoya.com",
      "shenzhen.aivoya.com",
    ];
  }

  /**
   * 验证站点配置
   */
  validateSiteConfig(config: SiteConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.site_id) errors.push("Missing site_id");
    if (!config.theme_key) errors.push("Missing theme_key");
    if (!config.layout_key) errors.push("Missing layout_key");
    if (!config.brand_tokens) errors.push("Missing brand_tokens");

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// 导出单例实例
export const siteConfigManager = SiteConfigManager.getInstance();

/**
 * 工具函数：获取站点配置（简化调用）
 */
export async function getSiteConfig(
  siteId: string
): Promise<SiteConfig | null> {
  return siteConfigManager.getSiteConfig(siteId);
}

/**
 * 工具函数：获取主题配置（简化调用）
 */
export function getThemeConfig(themeKey: string): ThemeConfig | null {
  return siteConfigManager.getThemeConfig(themeKey);
}

/**
 * 工具函数：获取布局配置（简化调用）
 */
export function getLayoutConfig(layoutKey: string): LayoutConfig | null {
  return siteConfigManager.getLayoutConfig(layoutKey);
}

/**
 * 工具函数：验证站点配置（简化调用）
 */
export function validateSiteConfig(config: SiteConfig): {
  valid: boolean;
  errors: string[];
} {
  return siteConfigManager.validateSiteConfig(config);
}

/**
 * 工具函数：清除配置缓存（简化调用）
 */
export function clearConfigCache(siteId?: string): void {
  siteConfigManager.clearCache(siteId);
}

/**
 * 工具函数：获取所有可用站点（简化调用）
 */
export function getAvailableSites(): string[] {
  return siteConfigManager.getAvailableSites();
}
