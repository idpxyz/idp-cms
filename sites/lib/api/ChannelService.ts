/**
 * 频道服务
 * 处理所有频道相关的API调用
 * 
 * 🎯 核心特性：
 * 1. 使用React cache API - 同一请求周期内自动共享结果
 * 2. 单例模式 - 与其他Service保持一致
 * 3. 服务端专用 - 优化SSR性能
 */

import { cache } from 'react';
import { endpoints } from '@/lib/config/endpoints';
import { getMainSite } from '@/lib/config/sites';

/**
 * 频道接口定义
 */
export interface Channel {
  id: string;
  name: string;
  slug: string;
  order?: number;
  
  // 首页显示配置
  show_in_homepage?: boolean;
  homepage_order?: number;
  
  // 模板配置
  template?: {
    id: number;
    name: string;
    slug: string;
    file_name: string;
  } | null;
  
  [key: string]: any;
}

/**
 * 频道查询选项
 */
export interface ChannelQueryOptions {
  site?: string;
  active_only?: boolean;
  limit?: number;
  order?: string;
}

/**
 * 频道API响应格式
 */
interface ChannelsResponse {
  channels: any[];
  [key: string]: any;
}

/**
 * 频道服务错误类型
 */
export enum ChannelErrorCode {
  FETCH_FAILED = 'fetch_failed',
  NETWORK_ERROR = 'network_error',
  PARSE_ERROR = 'parse_error',
  INVALID_RESPONSE = 'invalid_response',
}

/**
 * 频道服务错误
 */
export class ChannelServiceError extends Error {
  constructor(
    public code: ChannelErrorCode,
    message: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'ChannelServiceError';
  }
}

/**
 * 频道服务
 * 
 * 使用方式：
 * ```typescript
 * // Server Component中
 * import { channelService } from '@/lib/api';
 * const channels = await channelService.getChannels();
 * 
 * // 或者使用便捷函数
 * import { getChannels } from '@/lib/api';
 * const channels = await getChannels();
 * ```
 */
export class ChannelService {
  private static instance: ChannelService;

  constructor() {
    // 🚀 智能endpoints在每次调用时自动检测环境，无需存储baseUrl
  }

  static getInstance(): ChannelService {
    if (!ChannelService.instance) {
      ChannelService.instance = new ChannelService();
    }
    return ChannelService.instance;
  }

  /**
   * 获取频道列表（使用React cache优化）
   * 
   * 🚀 使用React cache包装，确保同一请求周期内只执行一次
   * 
   * @param options 查询选项
   * @returns 频道列表
   * 
   * @example
   * ```typescript
   * // Layout
   * const channels = await channelService.getChannels(); // 发起请求
   * 
   * // Page (同一请求周期)
   * const channels = await channelService.getChannels(); // 直接返回缓存 ✅
   * ```
   */
  getChannels = cache(async (options: ChannelQueryOptions = {}): Promise<Channel[]> => {
    const {
      site = getMainSite().hostname,
    } = options;

    try {
      const channelsUrl = endpoints.buildUrl(
        endpoints.getCmsEndpoint('/api/channels/'),
        { site }
      );

      const fetchConfig = endpoints.createFetchConfig({
        timeout: 15000,
        next: { 
          revalidate: 600, // Next.js缓存10分钟
          tags: ['channels'] 
        },
      });

      const response = await fetch(channelsUrl, fetchConfig);

      if (!response.ok) {
        if (response.status !== 429) {
          console.warn('⚠️ Failed to fetch channels, status:', response.status);
        }
        throw new ChannelServiceError(
          ChannelErrorCode.FETCH_FAILED,
          `HTTP ${response.status}: ${response.statusText}`,
          { status: response.status }
        );
      }

      const data: ChannelsResponse = await response.json();
      
      const channels = data.channels || [];
      const transformedChannels: Channel[] = channels.map((ch: any) => ({
        ...ch,
        id: ch.slug // 使用slug作为ID，保持一致性
      }));
      
      console.log('📡 Channels fetched (or cached):', transformedChannels.length);
      return transformedChannels;

    } catch (error) {
      console.error('❌ Error fetching channels:', error);
      
      if (error instanceof ChannelServiceError) {
        throw error;
      }
      
      throw this.handleError(error, 'fetch_channels');
    }
  });

  /**
   * 获取单个频道详情
   * 
   * @param slug 频道slug
   * @returns 频道详情或undefined
   */
  async getChannelBySlug(slug: string): Promise<Channel | undefined> {
    const channels = await this.getChannels();
    return channels.find(ch => ch.slug === slug);
  }

  /**
   * 获取首页显示的频道
   * 
   * @returns 配置为首页显示的频道列表，按homepage_order排序
   */
  async getHomepageChannels(): Promise<Channel[]> {
    const channels = await this.getChannels();
    return channels
      .filter(ch => ch.show_in_homepage === true)
      .sort((a, b) => {
        const aOrder = a.homepage_order ?? a.order ?? 0;
        const bOrder = b.homepage_order ?? b.order ?? 0;
        return aOrder - bOrder;
      });
  }

  /**
   * 获取服务端个性化频道（SSR专用）
   * 
   * 🎯 核心特性：
   * - 在服务端调用后端个性化API
   * - 转发用户cookies和headers
   * - 自动降级到静态频道（API失败时）
   * - 使用React cache优化
   * 
   * @param requestHeaders - Next.js headers() 返回的headers对象
   * @returns 个性化排序的频道列表
   * 
   * @example
   * ```typescript
   * import { headers } from 'next/headers';
   * 
   * const headersList = headers();
   * const channels = await channelService.getPersonalizedChannelsSSR(headersList);
   * ```
   */
  getPersonalizedChannelsSSR = cache(async (
    requestHeaders?: Headers | Map<string, string> | { [key: string]: string }
  ): Promise<Channel[]> => {
    try {
      // 构建个性化API URL
      const currentSite = getMainSite().hostname;
      console.log(`🌐 当前站点: ${currentSite}`);
      const apiUrl = endpoints.buildUrl(
        endpoints.getCmsEndpoint('/api/channels/personalized'),
        { site: currentSite }
      );
      console.log(`📡 请求个性化API: ${apiUrl}`);
      
      // 🔑 构建headers，转发用户信息
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
      
      // 转发cookies和相关headers
      if (requestHeaders) {
        // 处理不同类型的headers
        let cookieValue: string | null = null;
        let userAgentValue: string | null = null;
        let forwardedForValue: string | null = null;
        let deviceIdValue: string | null = null;
        let sessionIdValue: string | null = null;
        let userIdValue: string | null = null;
        
        if (requestHeaders instanceof Headers) {
          cookieValue = requestHeaders.get('cookie');
          userAgentValue = requestHeaders.get('user-agent');
          forwardedForValue = requestHeaders.get('x-forwarded-for');
          deviceIdValue = requestHeaders.get('x-device-id');
          sessionIdValue = requestHeaders.get('x-session-id');
          userIdValue = requestHeaders.get('x-user-id');
        } else if (requestHeaders instanceof Map) {
          cookieValue = requestHeaders.get('cookie') || null;
          userAgentValue = requestHeaders.get('user-agent') || null;
          forwardedForValue = requestHeaders.get('x-forwarded-for') || null;
          deviceIdValue = requestHeaders.get('x-device-id') || null;
          sessionIdValue = requestHeaders.get('x-session-id') || null;
          userIdValue = requestHeaders.get('x-user-id') || null;
        } else {
          cookieValue = requestHeaders['cookie'] || null;
          userAgentValue = requestHeaders['user-agent'] || null;
          forwardedForValue = requestHeaders['x-forwarded-for'] || null;
          deviceIdValue = requestHeaders['x-device-id'] || null;
          sessionIdValue = requestHeaders['x-session-id'] || null;
          userIdValue = requestHeaders['x-user-id'] || null;
        }
        
        if (cookieValue) {
          headers['Cookie'] = cookieValue;
        }
        if (userAgentValue) {
          headers['User-Agent'] = userAgentValue;
        }
        if (forwardedForValue) {
          headers['X-Forwarded-For'] = forwardedForValue;
        }
        // 🔑 转发用户标识信息用于个性化推荐
        if (deviceIdValue) {
          headers['X-Device-ID'] = deviceIdValue;
        }
        if (sessionIdValue) {
          headers['X-Session-ID'] = sessionIdValue;
        }
        if (userIdValue) {
          headers['X-User-ID'] = userIdValue;
        }
      }
      
      const response = await fetch(apiUrl, {
        headers,
        // 🔧 增加超时时间到5秒，开发环境可能较慢
        signal: AbortSignal.timeout(5000),
        next: { 
          revalidate: 300, // 5分钟缓存，与后端一致
          tags: ['personalized-channels'] 
        },
      });
      
      if (!response.ok) {
        console.warn(`⚠️ 个性化API返回 ${response.status}，降级到静态频道`);
        return await this.getChannels(); // 降级到静态
      }
      
      const data = await response.json();
      
      // 转换为Channel格式
      const channels: Channel[] = (data.channels || []).map((ch: any) => ({
        id: ch.slug || ch.id,
        name: ch.name,
        slug: ch.slug,
        order: ch.order,
        show_in_homepage: ch.show_in_homepage,
        homepage_order: ch.homepage_order,
        template: ch.template,
        ...ch
      }));
      
      console.log(`📡 SSR个性化频道: ${channels.length}个 (策略: ${data.strategy}, 置信度: ${data.confidence})`);
      console.log(`🔍 频道列表:`, channels.map(ch => `${ch.name}(${ch.slug})`).join(', '));
      return channels;
      
    } catch (error) {
      console.error('❌ SSR个性化失败:', error);
      // 降级到静态频道
      return await this.getChannels();
    }
  });

  /**
   * 错误处理
   */
  private handleError(error: any, operation: string): ChannelServiceError {
    if (error instanceof TypeError) {
      return new ChannelServiceError(
        ChannelErrorCode.NETWORK_ERROR,
        `Network error during ${operation}`,
        error
      );
    }

    if (error instanceof SyntaxError) {
      return new ChannelServiceError(
        ChannelErrorCode.PARSE_ERROR,
        `Failed to parse response during ${operation}`,
        error
      );
    }

    return new ChannelServiceError(
      ChannelErrorCode.FETCH_FAILED,
      `Failed to ${operation}: ${error.message || 'Unknown error'}`,
      error
    );
  }
}

// 导出单例实例
export const channelService = ChannelService.getInstance();

// 导出便捷函数（保持向后兼容）
export const getChannels = channelService.getChannels;
export const getChannelBySlug = channelService.getChannelBySlug.bind(channelService);
export const getHomepageChannels = channelService.getHomepageChannels.bind(channelService);
export const getPersonalizedChannelsSSR = channelService.getPersonalizedChannelsSSR;
