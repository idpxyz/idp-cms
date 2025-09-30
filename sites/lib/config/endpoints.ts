/**
 * 🚀 智能端点管理器 - 一次性重构版本
 * 核心原则：环境感知 + 智能路由 + 外部友好
 * 
 * ✅ 自动检测运行环境（server/client）
 * ✅ 服务端：高性能内部直连
 * ✅ 客户端：外部友好API代理
 * ✅ 完全向后兼容
 */

import { env } from './env';

// 执行环境类型
type RuntimeEnvironment = 'server' | 'client';

// 端点配置接口（保持向后兼容）
interface EndpointConfig {
  cms: {
    origin: string;
    timeout: number;
  };
  frontend: {
    origin: string;
    timeout: number;
  };
  search: {
    origin: string;
    timeout: number;
  };
}

// 🧠 智能端点管理器
class SmartEndpointManager {
  private static instance: SmartEndpointManager;
  private config: EndpointConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  static getInstance(): SmartEndpointManager {
    if (!SmartEndpointManager.instance) {
      SmartEndpointManager.instance = new SmartEndpointManager();
    }
    return SmartEndpointManager.instance;
  }

  private loadConfig(): EndpointConfig {
    return {
      cms: {
        origin: env.getCmsOrigin(),
        timeout: env.get('CMS_TIMEOUT'),
      },
      frontend: {
        origin: env.getFrontendOrigin(),
        timeout: env.get('FRONTEND_TIMEOUT'),
      },
      search: {
        origin: env.getSearchOrigin(),
        timeout: env.get('SEARCH_TIMEOUT'),
      },
    };
  }

  /**
   * 🧠 智能检测运行环境
   */
  private detectEnvironment(): RuntimeEnvironment {
    return typeof window === 'undefined' ? 'server' : 'client';
  }

  /**
   * 🎯 智能获取CMS端点 - 核心重构功能
   * 服务端：使用内部地址，高性能直连
   * 客户端：使用API代理，外部友好
   */
  getCmsEndpoint(path: string = ''): string {
    const environment = this.detectEnvironment();
    const cleanPath = path.replace(/^\/+/, '');
    
    if (environment === 'server') {
      // 🔧 服务端：使用内部Docker地址，高性能直连
      const baseUrl = env.getCmsOrigin().replace(/\/$/, '');
      return cleanPath ? `${baseUrl}/${cleanPath}` : baseUrl;
    } else {
      // 🌐 客户端：使用统一API代理，外部友好
      if (cleanPath.startsWith('api/')) {
        return cleanPath ? `/api/backend/${cleanPath.replace('api/', '')}` : '/api/backend';
      } else {
        return cleanPath ? `/api/backend/${cleanPath}` : '/api/backend';
      }
    }
  }

  /**
   * 🔄 智能获取用户相关API端点
   */
  getUserEndpoint(path: string = ''): string {
    const environment = this.detectEnvironment();
    const cleanPath = path.replace(/^\/+/, '');
    
    if (environment === 'server') {
      const cmsOrigin = env.getCmsOrigin().replace(/\/$/, '');
      return cleanPath ? `${cmsOrigin}/api/web-users/${cleanPath}` : `${cmsOrigin}/api/web-users`;
    } else {
      return cleanPath ? `/api/backend/web-users/${cleanPath}` : '/api/backend/web-users';
    }
  }

  /**
   * 📊 智能获取分析端点
   */
  getAnalyticsEndpoint(path: string = ''): string {
    const environment = this.detectEnvironment();
    const cleanPath = path.replace(/^\/+/, '');
    
    if (environment === 'server') {
      const cmsOrigin = env.getCmsOrigin().replace(/\/$/, '');
      return cleanPath ? `${cmsOrigin}/api/analytics/${cleanPath}` : `${cmsOrigin}/api/analytics`;
    } else {
      return cleanPath ? `/api/backend/analytics/${cleanPath}` : '/api/backend/analytics';
    }
  }

  /**
   * 🖼️ 智能获取媒体代理端点
   */
  getMediaProxyEndpoint(path: string = ''): string {
    const cleanPath = path.replace(/^\/+/, '');
    // 媒体代理总是使用前端路由，确保外部访问
    return cleanPath ? `/api/media-proxy/${cleanPath}` : '/api/media-proxy';
  }

  // 获取前端API端点（保持向后兼容）
  getFrontendEndpoint(path: string = ''): string {
    const cleanPath = path.replace(/^\/+/, '');
    return cleanPath ? `/${cleanPath}` : '';
  }

  // 获取搜索引擎端点（保持向后兼容）
  getSearchEndpoint(path: string = ''): string {
    const baseUrl = this.config.search.origin.replace(/\/$/, '');
    const cleanPath = path.replace(/^\//, '');
    return cleanPath ? `${baseUrl}/${cleanPath}` : baseUrl;
  }

  // 获取超时配置（保持向后兼容）
  getCmsTimeout(): number {
    return this.config.cms.timeout;
  }

  getFrontendTimeout(): number {
    return this.config.frontend.timeout;
  }

  getSearchTimeout(): number {
    return this.config.search.timeout;
  }

  // 获取当前环境（保持向后兼容）
  getEnvironment(): string {
    return env.get('NODE_ENV');
  }

  // 获取完整配置（用于调试，保持向后兼容）
  getConfig(): EndpointConfig {
    return { ...this.config };
  }

  /**
   * 🏗️ 智能构建带参数的URL
   */
  buildUrl(baseUrl: string, params: Record<string, string | number | boolean | undefined>): string {
    try {
      // 如果是相对路径，添加临时base
      const url = baseUrl.startsWith('/') ? new URL(baseUrl, 'http://localhost') : new URL(baseUrl);
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, value.toString());
        }
      });
      // 如果原来是相对路径，返回相对路径
      return baseUrl.startsWith('/') ? url.pathname + url.search : url.toString();
    } catch (error) {
      console.warn('构建URL失败，回退到原始URL:', baseUrl, error);
      return baseUrl;
    }
  }

  /**
   * ⚡ 环境感知的Fetch配置创建器
   */
  createFetchConfig(options: {
    method?: string;
    timeout?: number;
    headers?: Record<string, string>;
    cache?: RequestCache;
    next?: NextFetchRequestConfig;
  } = {}): RequestInit & { signal?: AbortSignal } {
    const environment = this.detectEnvironment();
    const {
      method = 'GET',
      timeout = environment === 'server' ? 5000 : 10000, // 服务端更快超时
      headers = {},
      cache = 'default',
      next,
    } = options;

    const effectiveTimeout = Math.max(timeout || this.getCmsTimeout(), 8000);
    
    // 创建兼容的 AbortSignal
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), effectiveTimeout);
    
    const config: RequestInit & { signal?: AbortSignal; next?: NextFetchRequestConfig } = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Environment': environment,
        'X-Request-ID': headers['X-Request-ID'] || (globalThis as any).crypto?.randomUUID?.() || Math.random().toString(36).slice(2),
        ...headers,
      },
      cache,
      signal: controller.signal,
    };
    
    // 清理超时定时器（如果请求完成）
    const cleanup = () => clearTimeout(timeoutId);
    controller.signal.addEventListener('abort', cleanup);

    if (next) {
      config.next = next;
    }

    return config;
  }

  /**
   * 🔍 获取调试信息
   */
  getDebugInfo() {
    const environment = this.detectEnvironment();
    return {
      environment,
      cmsEndpoint: this.getCmsEndpoint(),
      userEndpoint: this.getUserEndpoint(),
      mediaEndpoint: this.getMediaProxyEndpoint(),
      analyticsEndpoint: this.getAnalyticsEndpoint(),
      config: this.getConfig(),
      timestamp: new Date().toISOString(),
    };
  }
}

// 🚀 导出智能端点管理器实例（一次性替换）
export const endpoints = SmartEndpointManager.getInstance();

// 导出类型（保持向后兼容）
export type { EndpointConfig };

// 🎯 智能便捷函数 - 自动环境感知
export const getCmsUrl = (path: string = '') => endpoints.getCmsEndpoint(path);
export const getUserApiUrl = (path: string = '') => endpoints.getUserEndpoint(path);
export const getAnalyticsApiUrl = (path: string = '') => endpoints.getAnalyticsEndpoint(path);
export const getMediaUrl = (path: string = '') => endpoints.getMediaProxyEndpoint(path);

// 传统便捷函数（保持向后兼容）
export const getFrontendUrl = (path: string = '') => endpoints.getFrontendEndpoint(path);
export const getSearchUrl = (path: string = '') => endpoints.getSearchEndpoint(path);
