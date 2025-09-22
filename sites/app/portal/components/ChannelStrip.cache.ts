/**
 * ⚡ ChannelStrip 缓存机制
 * 解决频道跳转性能问题
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class ChannelStripCache {
  private cache = new Map<string, CacheItem<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5分钟

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // 定期清理过期缓存
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.cache.forEach((item, key) => {
      if (now - item.timestamp > item.ttl) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

// 全局缓存实例
export const channelStripCache = new ChannelStripCache();

// 定期清理过期缓存（每5分钟）
if (typeof window !== 'undefined') {
  setInterval(() => {
    channelStripCache.cleanup();
  }, 5 * 60 * 1000);
}

// 缓存键生成器
export function getCacheKey(channelId: string, categorySlug?: string, limit?: number): string {
  return `channel_${channelId}_${categorySlug || 'all'}_${limit || 8}`;
}
