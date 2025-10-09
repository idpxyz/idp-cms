import { SWRConfiguration } from 'swr';

/**
 * 🔧 SWR 全局配置
 * 
 * 为社会频道模板提供统一的 SWR 配置
 * 可在需要时通过 SWRConfig 组件应用到组件树
 */

/**
 * 默认配置 - 适用于大多数场景
 */
export const defaultSWRConfig: SWRConfiguration = {
  // 缓存策略
  revalidateOnFocus: false,           // 焦点时不重新验证（避免过度请求）
  revalidateOnReconnect: true,        // 网络恢复时重新验证
  dedupingInterval: 60000,            // 60秒内去重（相同请求复用结果）
  
  // 错误重试
  shouldRetryOnError: true,           // 错误时重试
  errorRetryCount: 3,                 // 最多重试3次
  errorRetryInterval: 5000,           // 重试间隔5秒
  
  // 性能优化
  revalidateIfStale: true,            // 如果数据过期，自动重新验证
  keepPreviousData: true,             // 保留旧数据直到新数据到达
  
  // 超时设置
  focusThrottleInterval: 5000,        // 焦点事件节流（5秒内只触发一次）
  
  // 错误处理
  onError: (error, key) => {
    console.error(`SWR Error [${key}]:`, error);
  },
  
  // 成功回调（开发环境）
  onSuccess: (data, key) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`SWR Success [${key}]`);
    }
  },
};

/**
 * 实时数据配置 - 用于需要频繁更新的数据
 * 例如：统计信息、在线人数等
 */
export const realtimeSWRConfig: SWRConfiguration = {
  ...defaultSWRConfig,
  refreshInterval: 30000,             // 每30秒自动刷新
  revalidateOnFocus: true,            // 焦点时重新验证
  dedupingInterval: 10000,            // 10秒去重
};

/**
 * 静态数据配置 - 用于很少变化的数据
 * 例如：频道列表、分类配置等
 */
export const staticSWRConfig: SWRConfiguration = {
  ...defaultSWRConfig,
  revalidateOnReconnect: false,       // 网络恢复时不重新验证
  dedupingInterval: 300000,           // 5分钟去重
  revalidateIfStale: false,           // 不自动重新验证过期数据
};

/**
 * 高频数据配置 - 用于用户频繁访问的数据
 * 例如：头条新闻、热门文章等
 */
export const highFrequencySWRConfig: SWRConfiguration = {
  ...defaultSWRConfig,
  dedupingInterval: 30000,            // 30秒去重
  errorRetryCount: 5,                 // 最多重试5次
  keepPreviousData: true,             // 始终保留旧数据
};

/**
 * 预加载配置 - 用于预加载数据
 */
export const prefetchSWRConfig: SWRConfiguration = {
  ...defaultSWRConfig,
  revalidateOnMount: false,           // 挂载时不重新验证
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
};

/**
 * 获取配置类型
 */
export type SWRConfigType = 
  | 'default'
  | 'realtime'
  | 'static'
  | 'highFrequency'
  | 'prefetch';

/**
 * 根据类型获取配置
 */
export function getSWRConfig(type: SWRConfigType = 'default'): SWRConfiguration {
  switch (type) {
    case 'realtime':
      return realtimeSWRConfig;
    case 'static':
      return staticSWRConfig;
    case 'highFrequency':
      return highFrequencySWRConfig;
    case 'prefetch':
      return prefetchSWRConfig;
    default:
      return defaultSWRConfig;
  }
}

/**
 * SWR 缓存键生成器
 * 确保缓存键的一致性和唯一性
 */
export class SWRKeyGenerator {
  /**
   * 生成社会频道数据的缓存键
   */
  static socialData(
    fetcherName: string,
    channelSlug: string,
    ...args: any[]
  ): [string, string, string, ...any[]] {
    return ['social-data', fetcherName, channelSlug, ...args];
  }

  /**
   * 生成多数据源的缓存键
   */
  static multiData(
    fetcherName: string,
    channelSlug: string,
    index: number,
    ...args: any[]
  ): [string, string, string, number, ...any[]] {
    return ['social-multi-data', fetcherName, channelSlug, index, ...args];
  }

  /**
   * 生成轮询数据的缓存键
   */
  static pollingData(
    fetcherName: string,
    channelSlug: string,
    ...args: any[]
  ): [string, string, string, ...any[]] {
    return ['social-data-polling', fetcherName, channelSlug, ...args];
  }

  /**
   * 生成条件数据的缓存键
   */
  static conditionalData(
    fetcherName: string,
    channelSlug: string,
    shouldFetch: boolean,
    ...args: any[]
  ): [string, string, string, ...any[]] | null {
    if (!shouldFetch) return null;
    return ['social-data-conditional', fetcherName, channelSlug, ...args];
  }
}

/**
 * SWR 缓存管理器
 * 用于手动管理缓存
 */
export class SWRCacheManager {
  /**
   * 清除所有社会频道相关缓存
   */
  static clearAllSocialCache() {
    if (typeof window === 'undefined') return;
    
    // 这里需要访问 SWR 的缓存实例
    // 实际使用时需要配合 useSWRConfig() hook
    console.log('Clearing all social channel cache...');
  }

  /**
   * 清除特定频道的缓存
   */
  static clearChannelCache(channelSlug: string) {
    if (typeof window === 'undefined') return;
    
    console.log(`Clearing cache for channel: ${channelSlug}`);
  }

  /**
   * 预加载数据
   */
  static prefetchData<T>(
    key: any[],
    fetcher: () => Promise<T>
  ): Promise<T> {
    // 实际使用时需要配合 mutate() 函数
    return fetcher();
  }
}

/**
 * 使用示例：
 * 
 * ```typescript
 * // 1. 在组件中使用默认配置
 * const { data } = useSocialData(getSocialHeadlines, 'society', 5);
 * 
 * // 2. 在应用根节点应用全局配置
 * import { SWRConfig } from 'swr';
 * import { defaultSWRConfig } from './config/swrConfig';
 * 
 * <SWRConfig value={defaultSWRConfig}>
 *   <App />
 * </SWRConfig>
 * 
 * // 3. 使用特定配置
 * const config = getSWRConfig('realtime');
 * 
 * // 4. 生成缓存键
 * const key = SWRKeyGenerator.socialData('getSocialHeadlines', 'society', 5);
 * ```
 */

