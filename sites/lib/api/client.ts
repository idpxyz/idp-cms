/**
 * API客户端 - 重构版本
 *
 * 使用统一的数据服务层，简化API调用逻辑
 */

import { SiteSettings, APIResponse } from "@/lib/types/index";
import { siteDataService } from "@/lib/services/site-data.service";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/cms/api/v1";

/**
 * 获取站点设置 - 统一入口
 * @param siteId 站点ID
 * @param options 可选配置
 * @returns 站点设置
 */
export async function getSiteSettings(
  siteId: string,
  options?: {
    forceRefresh?: boolean;
    timeout?: number;
  }
): Promise<SiteSettings> {
  return siteDataService.getSiteSettings(siteId, options);
}

/**
 * 预加载多个站点设置
 * @param siteIds 站点ID列表
 */
export async function preloadSiteSettings(siteIds: string[]): Promise<void> {
  return siteDataService.preloadSiteSettings(siteIds);
}

/**
 * 清除站点设置缓存
 * @param siteId 可选的站点ID，不传则清除所有缓存
 */
export function clearSiteSettingsCache(siteId?: string): void {
  siteDataService.clearCache(siteId);
}

/**
 * 获取文章列表
 * @param host 站点主机名
 * @param params 查询参数
 * @returns 文章列表
 */
export async function getArticles(
  host: string,
  params: Record<string, any> = {}
) {
  const url = new URL(
    `${API_BASE}/articles`,
    typeof window !== "undefined"
      ? window.location.origin
      : `http://localhost:3000`
  );
  url.searchParams.set("site", host);

  // 添加查询参数
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url.toString(), {
    next: {
      revalidate: 120,
      tags: [`site:${host}`, `articles`],
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch articles: ${response.status}`);
  }

  return response.json();
}

/**
 * 获取文章详情
 * @param host 站点主机名
 * @param slug 文章slug
 * @returns 文章详情
 */
export async function getArticle(host: string, slug: string) {
  const url = new URL(
    `${API_BASE}/articles/${slug}`,
    typeof window !== "undefined"
      ? window.location.origin
      : `http://localhost:3000`
  );
  url.searchParams.set("site", host);

  const response = await fetch(url.toString(), {
    next: {
      revalidate: 120,
      tags: [`site:${host}`, `article:${slug}`],
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch article: ${response.status}`);
  }

  return response.json();
}

/**
 * 获取频道列表
 * @param host 站点主机名
 * @returns 频道列表
 */
export async function getChannels(host: string) {
  const url = new URL(
    `${API_BASE}/channels`,
    typeof window !== "undefined"
      ? window.location.origin
      : `http://localhost:3000`
  );
  url.searchParams.set("site", host);

  const response = await fetch(url.toString(), {
    next: {
      revalidate: 120,
      tags: [`site:${host}`, "channels"],
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch channels: ${response.status}`);
  }

  return response.json();
}

/**
 * 获取地区列表
 * @param host 站点主机名
 * @returns 地区列表
 */
export async function getRegions(host: string) {
  const url = new URL(
    `${API_BASE}/regions`,
    typeof window !== "undefined"
      ? window.location.origin
      : `http://localhost:3000`
  );
  url.searchParams.set("site", host);

  const response = await fetch(url.toString(), {
    next: {
      revalidate: 120,
      tags: [`site:${host}`, "regions"],
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch regions: ${response.status}`);
  }

  return response.json();
}

/**
 * 触发缓存失效
 * @param tags 缓存标签
 * @returns 是否成功
 */
export async function revalidateCache(tags: string[]) {
  const response = await fetch("/api/proxy/cache/revalidate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tags }),
  });

  if (!response.ok) {
    throw new Error(`Failed to revalidate cache: ${response.status}`);
  }

  return response.json();
}

/**
 * 通用的API调用工具
 */
export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl?: string, defaultHeaders?: Record<string, string>) {
    this.baseUrl = baseUrl || API_BASE;
    this.defaultHeaders = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...defaultHeaders,
    };
  }

  async get<T = any>(
    endpoint: string,
    params?: Record<string, any>,
    options?: RequestInit
  ): Promise<T> {
    const url = new URL(endpoint, this.baseUrl);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: this.defaultHeaders,
      ...options,
    });

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  async post<T = any>(
    endpoint: string,
    data?: any,
    options?: RequestInit
  ): Promise<T> {
    const response = await fetch(new URL(endpoint, this.baseUrl).toString(), {
      method: "POST",
      headers: this.defaultHeaders,
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }
}

// 默认API客户端实例
export const apiClient = new ApiClient();
