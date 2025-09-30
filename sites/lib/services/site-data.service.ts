/**
 * 统一的站点数据访问服务
 *
 * 该服务负责：
 * 1. 统一客户端和服务器端的数据获取逻辑
 * 2. 提供一致的数据转换
 * 3. 统一的错误处理和缓存策略
 */

import { SiteSettings } from "@/lib/types/index";

/**
 * 原始后端数据结构
 */
interface BackendSiteData {
  meta: {
    site: string;
    site_id: number;
    theme_key: string;
    layout_key: string;
  };
  settings: {
    site_id?: string;
    site_name?: string;
    hostname?: string;
    port?: number;
    is_default_site?: boolean;
    root_page_id?: number;
    theme_key?: string;
    theme_version?: string;
    layout_key?: string;
    brand_tokens?: {
      primary?: string;
      secondary?: string;
      [key: string]: any;
    };
    modules?: {
      home?: string[];
      sidebar?: string[];
      header?: string[];
      footer?: string[];
    };
    customized?: boolean;
    brand_name?: string;
    brand_logo?: string;
    primary_color?: string | null;
    cache_timeout?: number;
    default_title?: string;
    default_description?: string;
    default_keywords?: string;
    [key: string]: any;
  };
}

/**
 * 环境配置
 */
class EnvironmentConfig {
  static getBackendUrl(): string {
    return (
      process.env.CMS_ORIGIN ||
      process.env.BACKEND_URL ||
      "http://localhost:8000"
    );
  }

  static getFrontendUrl(): string {
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
    return process.env.FRONTEND_URL || "http://localhost:3001";
  }

  static isServerSide(): boolean {
    return typeof window === "undefined";
  }
}

/**
 * 数据转换工具
 */
class DataTransformer {
  /**
   * 模块名称映射
   */
  private static moduleMapping: Record<string, string> = {
    rank: "ranking",
    ad: "ads",
    "top-news": "local-news",
    channels: "local-events",
  };

  /**
   * 标准化模块名称
   */
  static normalizeModules(modules: any): any {
    if (!modules) return null;

    const normalizeArray = (arr: string[]): string[] => {
      if (!Array.isArray(arr)) return [];
      return arr.map((module) => this.moduleMapping[module] || module);
    };

    return {
      home: normalizeArray(modules.home || []),
      sidebar: normalizeArray(modules.sidebar || []),
      header: normalizeArray(modules.header || []),
      footer: normalizeArray(modules.footer || []),
    };
  }

  /**
   * 转换后端数据为前端格式
   */
  static transformBackendData(
    backendData: BackendSiteData,
    siteId: string
  ): SiteSettings {
    const settings = backendData.settings || {};

    return {
      site_id: settings.site_id || siteId,
      site_name: settings.site_name || siteId,
      hostname: settings.hostname || siteId,
      port: settings.port || 80,
      is_default_site: settings.is_default_site || false,
      root_page_id: settings.root_page_id || 1,
      theme_key: settings.theme_key || "localsite-default",
      theme_version: settings.theme_version || "1.0.0",
      layout_key: settings.layout_key || "layout-localsite-grid",
      brand_tokens: {
        primary: settings.brand_tokens?.primary || "#3B82F6",
        secondary: settings.brand_tokens?.secondary || "#6B7280",
        font:
          settings.brand_tokens?.["font-family-base"] ||
          "'Inter', system-ui, sans-serif",
        radius: settings.brand_tokens?.["radius-md"] || "0.5rem",
        ...settings.brand_tokens,
      },
      modules: this.normalizeModules(settings.modules) || {
        home: ["local-hero", "local-news"],
        sidebar: ["weather", "services"],
      },
      brand: {
        name: settings.brand_name || siteId,
        logo_url: settings.brand_logo || "",
        description: settings.default_description || "提供最新新闻资讯",
      },
      brand_name: settings.brand_name || siteId,
      brand_logo: settings.brand_logo || "",
      seo: {
        default_title: settings.default_title || `${siteId} - 新闻资讯`,
        default_description: settings.default_description || "提供最新新闻资讯",
        default_keywords: settings.default_keywords || "新闻,资讯",
      },
      analytics: {
        google_analytics_id: "",
        track_user_behavior: true,
      },
      features: {
        recommendation: true,
        search_enabled: true,
        comments_enabled: true,
        user_registration: true,
        social_login: true,
        content_moderation: true,
        api_access: true,
        rss_feed: true,
        sitemap: true,
      },
      footer: {
        links: [],
        copyright: `© 2024 ${settings.brand_name || siteId}. All rights reserved.`,
      },
      customized: settings.customized || false,
      primary_color:
        settings.primary_color || settings.brand_tokens?.primary || "#3B82F6",
      cache_timeout: settings.cache_timeout || 300,
      default_title: settings.default_title || `${siteId} - 新闻资讯`,
      default_description: settings.default_description || "提供最新新闻资讯",
      updated_at: new Date().toISOString(),
      is_production: process.env.NODE_ENV === "production",
    };
  }

  /**
   * 创建默认配置
   */
  static createDefaultConfig(siteId: string): SiteSettings {
    return {
      site_id: siteId,
      site_name: siteId,
      hostname: siteId,
      port: 80,
      is_default_site: siteId === "localhost",
      root_page_id: 1,
      theme_key: "localsite-default",
      theme_version: "1.0.0",
      layout_key: "layout-localsite-grid",
      brand_tokens: {
        primary: "#3B82F6",
        secondary: "#6B7280",
        "font-family-base": "'Inter', system-ui, sans-serif",
        "radius-md": "0.5rem",
      },
      modules: {
        home: ["local-hero", "local-news"],
        sidebar: ["weather", "services"],
      },
      brand: {
        name: siteId,
        logo_url: "",
        description: "提供最新新闻资讯",
      },
      brand_name: siteId,
      brand_logo: "",
      seo: {
        default_title: `${siteId} - 新闻资讯`,
        default_description: "提供最新新闻资讯",
        default_keywords: "新闻,资讯",
      },
      analytics: {
        google_analytics_id: "",
        track_user_behavior: true,
      },
      features: {
        recommendation: true,
        search_enabled: true,
        comments_enabled: true,
        user_registration: true,
        social_login: true,
        content_moderation: true,
        api_access: true,
        rss_feed: true,
        sitemap: true,
      },
      footer: {
        links: [],
        copyright: `© 2024 ${siteId}. All rights reserved.`,
      },
      customized: false,
      primary_color: "#3B82F6",
      cache_timeout: 300,
      default_title: `${siteId} - 新闻资讯`,
      default_description: "提供最新新闻资讯",
      updated_at: new Date().toISOString(),
      is_production: process.env.NODE_ENV === "production",
    };
  }
}

/**
 * 统一的站点数据服务
 */
export class SiteDataService {
  private static instance: SiteDataService;
  private cache = new Map<
    string,
    { data: SiteSettings; timestamp: number; ttl: number }
  >();
  private requestTracker = new Map<string, number>(); // 跟踪请求频率
  private readonly maxRequestsPerMinute = 5; // 每分钟最多5次请求，更保守
  private lastRateLimitTime = 0; // 记录最后一次429错误的时间

  private constructor() {}

  static getInstance(): SiteDataService {
    if (!SiteDataService.instance) {
      SiteDataService.instance = new SiteDataService();
    }
    return SiteDataService.instance;
  }

  /**
   * 获取站点设置 - 统一入口
   */
  async getSiteSettings(
    siteId: string,
    options?: {
      forceRefresh?: boolean;
      timeout?: number;
    }
  ): Promise<SiteSettings> {
    const { forceRefresh = false, timeout = 30000 } = options || {};

    // 检查缓存
    if (!forceRefresh) {
      const cached = this.getCachedData(siteId);
      if (cached) {
        console.log(`Using cached site settings for ${siteId}`);
        return cached;
      }
    }

    // 检查请求频率限制
    if (!this.canMakeRequest(siteId)) {
      console.warn(`Rate limit exceeded for ${siteId}, using stale cache or default`);
      const staleCache = this.getStaleCache(siteId);
      if (staleCache) {
        this.setCachedData(siteId, staleCache, 300000);
        return staleCache;
      }
      // 如果没有过期缓存，返回默认配置
      const defaultConfig = DataTransformer.createDefaultConfig(siteId);
      this.setCachedData(siteId, defaultConfig, 300000);
      return defaultConfig;
    }

    try {
      let data: SiteSettings;

      if (EnvironmentConfig.isServerSide()) {
        // 服务器端：直接访问后端
        data = await this.fetchFromBackend(siteId, timeout);
      } else {
        // 客户端：通过前端API
        data = await this.fetchFromFrontendApi(siteId, timeout);
      }

      // 缓存数据，延长缓存时间以减少API调用
      const cacheTime = Math.max(data.cache_timeout * 1000, 300000); // 至少5分钟
      this.setCachedData(siteId, data, cacheTime);
      console.log(`Cached site settings for ${siteId} for ${cacheTime/1000} seconds`);

      return data;
    } catch (error) {
      // 特殊处理429错误
      const isRateLimit = (error as any)?.isRateLimit || (error as Error)?.message?.includes('429');
      if (isRateLimit) {
        console.warn(`Rate limit hit for ${siteId}, using cached/default config`);
        this.recordRateLimit(); // 记录429错误时间
      } else {
        console.error(`Failed to fetch site settings for ${siteId}:`, error);
      }

      // 检查是否有过期的缓存可以使用
      const staleCache = this.getStaleCache(siteId);
      if (staleCache) {
        console.log(`Using stale cache for ${siteId} due to ${isRateLimit ? 'rate limit' : 'API error'}`);
        // 对于429错误，延长缓存时间
        const cacheTime = isRateLimit ? 600000 : 300000; // 429错误缓存10分钟，其他5分钟
        this.setCachedData(siteId, staleCache, cacheTime);
        return staleCache;
      }

      // 返回默认配置
      const defaultConfig = DataTransformer.createDefaultConfig(siteId);
      const cacheTime = isRateLimit ? 600000 : 300000; // 429错误缓存10分钟，其他5分钟
      this.setCachedData(siteId, defaultConfig, cacheTime);
      console.log(`Using default config for ${siteId} due to ${isRateLimit ? 'rate limit' : 'API error'}`);

      return defaultConfig;
    }
  }

  /**
   * 从后端获取数据（服务器端）
   */
  private async fetchFromBackend(
    siteId: string,
    timeout: number = 30000
  ): Promise<SiteSettings> {
    const backendUrl = EnvironmentConfig.getBackendUrl();
    const effectiveTimeout = Math.max(timeout, 30000); // Ensure minimum 30s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), effectiveTimeout);

    try {
      const response = await fetch(
        `${backendUrl}/api/site-settings?site=${siteId}`,
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        // 对于429错误，抛出特殊的错误类型，以便上层处理
        if (response.status === 429) {
          const rateLimitError = new Error(`Rate limit exceeded: ${response.status}`);
          (rateLimitError as any).isRateLimit = true;
          throw rateLimitError;
        }
        throw new Error(
          `Backend API responded with status: ${response.status}`
        );
      }

      const backendData: BackendSiteData = await response.json();
      return DataTransformer.transformBackendData(backendData, siteId);
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * 从前端API获取数据（客户端）
   */
  private async fetchFromFrontendApi(
    siteId: string,
    timeout: number = 30000
  ): Promise<SiteSettings> {
    const frontendUrl = EnvironmentConfig.getFrontendUrl();
    const effectiveTimeout = Math.max(timeout, 30000); // Ensure minimum 30s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), effectiveTimeout);

    try {
      const response = await fetch(
        `${frontendUrl}/api/site-settings?site=${siteId}`,
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `Frontend API responded with status: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * 获取缓存数据
   */
  private getCachedData(siteId: string): SiteSettings | null {
    const cached = this.cache.get(siteId);
    if (!cached) return null;

    const now = Date.now();
    if (now > cached.timestamp + cached.ttl) {
      // 不立即删除，保留作为过期缓存
      return null;
    }

    return cached.data;
  }

  /**
   * 获取过期的缓存数据（用于降级处理）
   */
  private getStaleCache(siteId: string): SiteSettings | null {
    const cached = this.cache.get(siteId);
    if (!cached) return null;

    // 返回过期数据，但最多保留24小时
    const now = Date.now();
    const maxStaleTime = 24 * 60 * 60 * 1000; // 24小时
    if (now > cached.timestamp + maxStaleTime) {
      this.cache.delete(siteId);
      return null;
    }

    return cached.data;
  }

  /**
   * 检查是否可以发起请求（限流检查）
   */
  private canMakeRequest(siteId: string): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const fiveMinutesAgo = now - 300000;
    
    // 如果最近5分钟内有429错误，更加保守
    if (this.lastRateLimitTime > fiveMinutesAgo) {
      const timeSinceRateLimit = now - this.lastRateLimitTime;
      const waitTime = Math.min(300000, timeSinceRateLimit * 2); // 等待时间最多5分钟
      if (timeSinceRateLimit < waitTime) {
        console.log(`Still in rate limit cooldown for ${siteId}, ${Math.ceil((waitTime - timeSinceRateLimit) / 1000)}s remaining`);
        return false;
      }
    }
    
    // 清理过期的请求记录
    for (const [key, timestamp] of Array.from(this.requestTracker.entries())) {
      if (timestamp < oneMinuteAgo) {
        this.requestTracker.delete(key);
      }
    }

    // 计算最近一分钟的请求次数
    const recentRequests = Array.from(this.requestTracker.values())
      .filter(timestamp => timestamp >= oneMinuteAgo).length;

    if (recentRequests >= this.maxRequestsPerMinute) {
      console.log(`Rate limit exceeded for ${siteId}: ${recentRequests} requests in last minute`);
      return false;
    }

    // 记录此次请求
    this.requestTracker.set(`${siteId}_${now}`, now);
    return true;
  }

  /**
   * 记录429错误时间
   */
  private recordRateLimit(): void {
    this.lastRateLimitTime = Date.now();
    console.log('Rate limit hit, cooling down...');
  }

  /**
   * 记录请求时间
   */
  private recordRequest(siteId: string): void {
    const now = Date.now();
    this.requestTracker.set(`${siteId}_${now}`, now);
  }

  /**
   * 设置缓存数据
   */
  private setCachedData(siteId: string, data: SiteSettings, ttl: number): void {
    this.cache.set(siteId, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * 清除缓存
   */
  clearCache(siteId?: string): void {
    if (siteId) {
      this.cache.delete(siteId);
    } else {
      this.cache.clear();
    }
  }

  /**
   * 预加载站点数据
   */
  async preloadSiteSettings(siteIds: string[]): Promise<void> {
    const promises = siteIds.map((siteId) =>
      this.getSiteSettings(siteId).catch((error) =>
        console.warn(`Failed to preload settings for ${siteId}:`, error)
      )
    );

    await Promise.allSettled(promises);
  }
}

// 导出单例实例
export const siteDataService = SiteDataService.getInstance();

// 导出工具类
export { DataTransformer, EnvironmentConfig };
