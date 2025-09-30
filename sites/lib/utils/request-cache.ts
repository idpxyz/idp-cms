/**
 * 客户端请求缓存和去重工具
 * 减少重复API调用，提升用户体验
 */

interface CacheEntry {
  data: any;
  timestamp: number;
  expiry: number;
}

class RequestCache {
  private cache = new Map<string, CacheEntry>();
  private inflightRequests = new Map<string, Promise<any>>();

  /**
   * 获取缓存数据或执行请求
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: {
      ttl?: number; // 缓存时间（毫秒）
      staleWhileRevalidate?: boolean; // 是否允许返回过期数据
    } = {}
  ): Promise<T> {
    const { ttl = 60000, staleWhileRevalidate = true } = options; // 默认1分钟缓存
    const now = Date.now();

    // 检查缓存
    const cached = this.cache.get(key);
    if (cached) {
      // 缓存未过期，直接返回
      if (now < cached.expiry) {
        return cached.data;
      }
      
      // 缓存过期但允许返回过期数据，异步更新
      if (staleWhileRevalidate) {
        this.refreshInBackground(key, fetcher, ttl);
        return cached.data;
      }
    }

    // 检查是否有进行中的请求
    if (this.inflightRequests.has(key)) {
      return await this.inflightRequests.get(key)!;
    }

    // 执行新请求
    const promise = this.executeRequest(key, fetcher, ttl);
    this.inflightRequests.set(key, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      this.inflightRequests.delete(key);
    }
  }

  private async executeRequest<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number
  ): Promise<T> {
    try {
      const data = await fetcher();
      const now = Date.now();
      
      // 存入缓存
      this.cache.set(key, {
        data,
        timestamp: now,
        expiry: now + ttl,
      });
      
      return data;
    } catch (error) {
      // 请求失败时，如果有过期缓存，返回过期缓存
      const cached = this.cache.get(key);
      if (cached) {
        console.warn(`Request failed for ${key}, returning stale data:`, error);
        return cached.data;
      }
      throw error;
    }
  }

  private async refreshInBackground<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number
  ): Promise<void> {
    // 避免重复的后台刷新
    if (this.inflightRequests.has(key)) {
      return;
    }

    const promise = this.executeRequest(key, fetcher, ttl);
    this.inflightRequests.set(key, promise);

    try {
      await promise;
    } catch (error) {
      console.warn(`Background refresh failed for ${key}:`, error);
    } finally {
      this.inflightRequests.delete(key);
    }
  }

  /**
   * 清除指定缓存
   */
  clear(key: string): void {
    this.cache.delete(key);
    this.inflightRequests.delete(key);
  }

  /**
   * 清除所有缓存
   */
  clearAll(): void {
    this.cache.clear();
    this.inflightRequests.clear();
  }

  /**
   * 清除过期缓存
   */
  cleanup(): void {
    const now = Date.now();
    this.cache.forEach((entry, key) => {
      if (now > entry.expiry + 300000) { // 过期5分钟后清理
        this.cache.delete(key);
      }
    });
  }
}

// 全局实例
export const requestCache = new RequestCache();

// 定期清理过期缓存
if (typeof window !== 'undefined') {
  setInterval(() => {
    requestCache.cleanup();
  }, 5 * 60 * 1000); // 每5分钟清理一次
}
