import useSWR from 'swr';

/**
 * 🎣 自定义 Hook - 社会频道数据获取（基于 SWR）
 * 
 * 统一处理数据获取、加载状态、错误处理、缓存管理
 * 
 * 功能特性：
 * - ✅ 自动缓存和重用数据
 * - ✅ 自动去重请求
 * - ✅ 后台自动刷新
 * - ✅ 焦点重新验证（可配置）
 * - ✅ 网络恢复时重新验证
 * - ✅ 轮询支持（可选）
 * 
 * @template T - 数据类型
 * @param fetcher - 数据获取函数
 * @param channelSlug - 频道标识
 * @param args - 额外参数
 * 
 * @example
 * ```typescript
 * const { data, isLoading, error, retry } = useSocialData(
 *   getSocialHeadlines,
 *   'society',
 *   5
 * );
 * ```
 */
export function useSocialData<T>(
  fetcher: (channelSlug: string, ...args: any[]) => Promise<T>,
  channelSlug: string,
  ...args: any[]
) {
  // 构建唯一的缓存键
  const key = ['social-data', fetcher.name, channelSlug, ...args];

  const { data, error, isValidating, mutate } = useSWR<T>(
    key,
    () => fetcher(channelSlug, ...args),
    {
      // 缓存配置
      revalidateOnFocus: false,           // 焦点时不重新验证（避免过度请求）
      revalidateOnReconnect: true,        // 网络恢复时重新验证
      dedupingInterval: 60000,            // 60秒内去重（相同请求复用结果）
      
      // 错误重试配置
      shouldRetryOnError: true,           // 错误时重试
      errorRetryCount: 3,                 // 最多重试3次
      errorRetryInterval: 5000,           // 重试间隔5秒
      
      // 性能优化
      revalidateIfStale: true,            // 如果数据过期，自动重新验证
      keepPreviousData: true,             // 保留旧数据直到新数据到达
      
      // 错误处理
      onError: (err: Error) => {
        console.error(`Error fetching ${fetcher.name}:`, err);
      },
      
      // 成功回调
      onSuccess: (data: T) => {
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ ${fetcher.name} loaded successfully`);
        }
      }
    }
  );

  return {
    data: data ?? null,
    isLoading: !error && !data,          // 首次加载状态
    error: error ?? null,
    retry: () => mutate(),                // 重试函数
    isValidating,                         // 正在重新验证
    mutate,                               // 手动更新数据
  };
}

/**
 * 🎣 自定义 Hook - 社会频道多数据源获取（基于 SWR）
 * 
 * 用于并行获取多个数据源，每个数据源独立缓存
 * 
 * @example
 * ```typescript
 * const { data, isLoading, error, retry } = useSocialMultiData(
 *   channelSlug,
 *   [
 *     { fetcher: getSocialLatestNews, args: [3] },
 *     { fetcher: getSocialHotArticles, args: [5] }
 *   ]
 * );
 * // data = [latestNews, hotArticles]
 * ```
 */
export function useSocialMultiData<T extends any[]>(
  channelSlug: string,
  sources: Array<{
    fetcher: (channelSlug: string, ...args: any[]) => Promise<any>;
    args?: any[];
  }>
) {
  // 为每个数据源创建独立的 SWR hook
  const results = sources.map((source, index) => {
    // 构建唯一的缓存键
    const key = ['social-multi-data', source.fetcher.name, channelSlug, index, ...(source.args || [])];
    
    return useSWR(
      key,
      () => source.fetcher(channelSlug, ...(source.args || [])),
      {
        // 与单数据源相同的配置
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        dedupingInterval: 60000,
        shouldRetryOnError: true,
        errorRetryCount: 3,
        errorRetryInterval: 5000,
        revalidateIfStale: true,
        keepPreviousData: true,
        
        onError: (err: Error) => {
          console.error(`Error fetching ${source.fetcher.name}:`, err);
        },
      }
    );
  });

  // 聚合所有结果
  const data = results.every(r => r.data) 
    ? (results.map(r => r.data) as T) 
    : null;
  
  const isLoading = results.some(r => !r.error && !r.data);
  const error = results.find(r => r.error)?.error ?? null;
  const isValidating = results.some(r => r.isValidating);

  // 重试所有请求
  const retry = () => {
    results.forEach(r => r.mutate());
  };

  return {
    data,
    isLoading,
    error,
    retry,
    isValidating,
    results,  // 暴露原始结果，方便单独操作
  };
}

/**
 * 🎣 自定义 Hook - 带轮询的数据获取
 * 
 * 用于需要实时更新的数据（如统计信息）
 * 
 * @example
 * ```typescript
 * const { data, isLoading, error } = useSocialDataPolling(
 *   getSocialChannelStats,
 *   'society',
 *   30000  // 每30秒刷新一次
 * );
 * ```
 */
export function useSocialDataPolling<T>(
  fetcher: (channelSlug: string, ...args: any[]) => Promise<T>,
  channelSlug: string,
  refreshInterval: number,  // 刷新间隔（毫秒）
  ...args: any[]
) {
  const key = ['social-data-polling', fetcher.name, channelSlug, ...args];

  const { data, error, isValidating, mutate } = useSWR<T>(
    key,
    () => fetcher(channelSlug, ...args),
    {
      refreshInterval,                    // 启用轮询
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000,
      keepPreviousData: true,
      
      onError: (err: Error) => {
        console.error(`Error polling ${fetcher.name}:`, err);
      },
    }
  );

  return {
    data: data ?? null,
    isLoading: !error && !data,
    error: error ?? null,
    retry: () => mutate(),
    isValidating,
    mutate,
  };
}

/**
 * 🎣 自定义 Hook - 条件数据获取
 * 
 * 只在满足条件时才获取数据
 * 
 * @example
 * ```typescript
 * const { data, isLoading, error } = useSocialDataConditional(
 *   getSocialHeadlines,
 *   channelSlug,
 *   isVisible,  // 只在可见时获取
 *   5
 * );
 * ```
 */
export function useSocialDataConditional<T>(
  fetcher: (channelSlug: string, ...args: any[]) => Promise<T>,
  channelSlug: string,
  shouldFetch: boolean,  // 是否应该获取数据
  ...args: any[]
) {
  const key = shouldFetch 
    ? ['social-data-conditional', fetcher.name, channelSlug, ...args]
    : null;  // null 会禁用 SWR

  const { data, error, isValidating, mutate } = useSWR<T>(
    key,
    () => fetcher(channelSlug, ...args),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000,
      keepPreviousData: true,
    }
  );

  return {
    data: data ?? null,
    isLoading: shouldFetch && !error && !data,
    error: error ?? null,
    retry: () => mutate(),
    isValidating,
    mutate,
  };
}
