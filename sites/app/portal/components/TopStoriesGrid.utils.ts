import { fetchTrendingFeed } from '@/lib/api/feed';
import { getNews } from '@/lib/api/news';
import { TopStoryItem } from './TopStoriesGrid';
import { endpoints } from '@/lib/config/endpoints';
import { getTopStoriesDefaultHours, getTopStoriesRetryHours } from '@/lib/config/content-timing';

// 现代化前端缓存系统
interface ModernCacheItem {
  data: any;
  expiry: number;
  contentType: string;
  timestamp: number;
}

class ModernFrontendCache {
  private static cache = new Map<string, ModernCacheItem>();
  
  // 现代化缓存时间配置
  private static readonly CACHE_TIMES: Record<string, number> = {
    'breaking': 0,      // 突发新闻实时
    'hot': 5,          // 热点5秒
    'trending': 10,    // 趋势10秒
    'normal': 15,      // 普通15秒
    'recommend': 30    // 推荐30秒
  };
  
  static set(key: string, data: any, contentType: string): void {
    const ttlSeconds = this.CACHE_TIMES[contentType] || 15;
    
    if (ttlSeconds <= 0) {
      return;
    }
    
    const ttlMs = ttlSeconds * 1000;
    const expiry = Date.now() + ttlMs;
    
    this.cache.set(key, {
      data,
      expiry,
      contentType,
      timestamp: Date.now()
    });
    
    
    // 自动清理
    setTimeout(() => this.cleanup(key), ttlMs);
  }
  
  static get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
  
  static invalidate(pattern: string): number {
    let count = 0;
    const keysToDelete: string[] = [];
    
    this.cache.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      count++;
    });
    
    if (count > 0) {
    }
    return count;
  }
  
  private static cleanup(key: string): void {
    const item = this.cache.get(key);
    if (item && Date.now() > item.expiry) {
      this.cache.delete(key);
    }
  }
  
  static getStats(): { size: number; items: Array<{key: string; contentType: string; age: number}> } {
    const now = Date.now();
    const items: Array<{key: string; contentType: string; age: number}> = [];
    
    this.cache.forEach((item, key) => {
      items.push({
        key,
        contentType: item.contentType,
        age: Math.round((now - item.timestamp) / 1000)
      });
    });
    
    return { size: this.cache.size, items };
  }
}

// 生成客户端会话ID（用于去重）
function generateSessionId(): string {
  if (typeof window !== 'undefined') {
    // 尝试从 sessionStorage 获取已存在的 sessionId
    let sessionId = sessionStorage.getItem('headlines_session_id');
    if (!sessionId) {
      // 生成新的随机会话ID
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('headlines_session_id', sessionId);
    }
    return sessionId;
  }
  return 'ssr_session'; // SSR fallback
}

// 获取请求头配置（包含用户信息）
function getRequestHeaders(userId?: string): HeadersInit {
  const sessionId = userId ? `user_${userId}` : generateSessionId();
  return {
    'X-Session-ID': sessionId,
    'Content-Type': 'application/json',
  };
}

/**
 * 获取头条新闻数据
 * 使用专用的TopStories API，包含复杂的推荐算法
 */
export async function getTopStories(
  limit: number = 9,
  options?: {
    hours?: number;
    diversity?: 'high' | 'med' | 'low';
    userId?: string; // 用户ID，用于个性化去重
    excludeClusterIds?: string[]; // 可选的聚类排除ID
  }
): Promise<TopStoryItem[]> {
  try {
    // 构建现代缓存key
    const params = new URLSearchParams({
      size: limit.toString(),
      hours: String(options?.hours ?? getTopStoriesDefaultHours()), // 🎯 使用集中化配置
      diversity: String(options?.diversity ?? 'high'),
      site: 'aivoya.com'
    });
    
    // 添加排除的聚类ID（如果提供）
    if (options?.excludeClusterIds && options.excludeClusterIds.length > 0) {
      options.excludeClusterIds.forEach(id => params.append('exclude_cluster_ids', id));
    }
    
    // 🎯 使用专用的TopStories API端点
    const apiUrl = endpoints.getCmsEndpoint(`/api/topstories/?${params.toString()}`);
    const cacheKey = `topstories_v4_${apiUrl.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    // 检查现代前端缓存
    if (typeof window !== 'undefined') {
      const cachedData = ModernFrontendCache.get(cacheKey);
      if (cachedData) {
        console.log(`📦 Using cached TopStories data`);
        return cachedData;
      }
    }
    
    console.log(`🔍 Fetching TopStories from dedicated API: ${apiUrl}`);
    
    // 智能缓存策略
    const response = await fetch(apiUrl, {
      headers: getRequestHeaders(options?.userId),
      next: { revalidate: 60 }, // TopStories需要更频繁更新
      signal: AbortSignal.timeout(8000), // 8秒超时，允许复杂计算
    });
    
    if (!response.ok) {
      throw new Error(`TopStories API failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 获取现代缓存策略信息
    const contentType = response.headers.get('X-Content-Type') || data.content_type || 'normal';
    const cacheStrategy = response.headers.get('X-Cache-Strategy') || 'topstories-v4';
    
    console.log(`📊 TopStories API response: ${data.items?.length || 0} items, cache: ${cacheStrategy}`);
    
    if (data.items && data.items.length > 0) {
      const topStories = data.items.map((item: any) => transformToTopStoryItem(item));
      
      // 现代前端缓存
      if (typeof window !== 'undefined') {
        ModernFrontendCache.set(cacheKey, topStories, contentType);
      }
      
      console.log(`✅ Processed ${topStories.length} TopStories items`);
      return topStories;
    }
    // 第一次无数据，尝试扩大时间窗、放宽多样性
    console.log('📝 No TopStories found, trying with relaxed parameters...');
    const retryParams = new URLSearchParams({
      size: limit.toString(),
      hours: String(getTopStoriesRetryHours(options?.hours)), // 🎯 使用集中化重试配置
      diversity: String(options?.diversity ?? 'med'), // 放宽多样性
      site: 'aivoya.com'
    });
    
    // 重试时也包含排除ID（如果有）
    if (options?.excludeClusterIds && options.excludeClusterIds.length > 0) {
      options.excludeClusterIds.forEach(id => retryParams.append('exclude_cluster_ids', id));
    }
    
    const retryUrl = endpoints.getCmsEndpoint(`/api/topstories/?${retryParams.toString()}`);
    console.log(`🔄 Retrying TopStories with relaxed params: ${retryUrl}`);
    
    const retryRes = await fetch(retryUrl, {
      headers: getRequestHeaders(options?.userId),
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8000),
    });
    
    if (retryRes.ok) {
      const retryData = await retryRes.json();
      if (retryData.items && retryData.items.length > 0) {
        const relaxed = retryData.items.map((item: any) => transformToTopStoryItem(item));
        console.log(`✅ Retry successful: ${relaxed.length} TopStories items`);
        return relaxed;
      }
    }
  } catch (error) {
    console.warn('🚫 Headlines API failed, no data available:', error);
  }
  
  // 兜底：使用新闻列表API（真实数据）
  try {
    const newsRes = await getNews('recommend', 1, limit * 2);
    if (newsRes?.data?.length > 0) {
      const mapped = newsRes.data
        .filter((it: any) => it.cover?.url || it.image_url)
        .slice(0, limit)
        .map((it: any) => ({
          id: String(it.id),
          title: it.title,
          excerpt: it.excerpt || it.summary || '',
          slug: it.slug || `article-${it.id}`,
          image_url: it.cover?.url || it.image_url,
          publish_time: it.publish_at || it.first_published_at || it.created_at,
          author: it.author_name || it.author || '',
          channel: it.channel ? {
            id: it.channel.slug || String(it.channel.id || ''),
            name: it.channel.name,
            slug: it.channel.slug || String(it.channel.id || '')
          } : undefined,
          tags: it.tags || [],
          is_featured: !!it.is_featured,
          is_editor_pick: !!it.is_editor_pick,
          view_count: it.view_count || 0,
          comment_count: it.comment_count || 0,
          reading_time: it.reading_time || 3,
        }));
      if (mapped.length > 0) {
        return mapped;
      }
    }
  } catch (e) {
    console.warn('🚫 TopStories: 新闻API兜底失败', e);
  }

  return [];

}

/**
 * 转换headlines API数据为TopStoryItem格式
 */
function transformToTopStoryItem(item: any): TopStoryItem {
  return {
    id: item.id.toString(),
    title: item.title,
    excerpt: item.excerpt || item.summary || '',
    slug: item.slug || `article-${item.id}`,
    image_url: item.cover?.url || item.image_url,
    publish_time: item.publish_at || item.first_published_at || item.created_at,
    author: item.author_name || item.author || '',
    channel: item.channel ? (
      typeof item.channel === 'string' ? {
        id: item.channel,
        name: item.channel,
        slug: item.channel
      } : {
        id: item.channel.slug || item.channel.id?.toString() || '',
        name: item.channel.name || '',
        slug: item.channel.slug || item.channel.id?.toString() || ''
      }
    ) : undefined,
    tags: item.tags || [],
    is_featured: item.is_featured || false,
    is_editor_pick: item.is_editor_pick || false,
    view_count: item.view_count || 0,
    comment_count: item.comment_count || 0,
    reading_time: item.reading_time || 3,
  };
}

  // 以下代码已废弃，保留备查
  /*
  try {
    // 首先尝试获取热门推荐内容
    const trendingResponse = await fetchTrendingFeed(limit * 2);
    
    if (trendingResponse.items && trendingResponse.items.length > 0) {
      return trendingResponse.items
        .filter(item => item.image_url)
        .slice(0, limit)
        .map(item => ({
          id: item.id,
          title: item.title,
          excerpt: item.excerpt,
          slug: item.slug,
          image_url: item.image_url,
          publish_time: item.publish_time || item.publish_at,
          author: item.author,
          channel: item.channel ? {
            id: item.channel.slug || 'unknown',
            name: item.channel.name,
            slug: item.channel.slug || 'unknown'
          } : undefined,
          tags: item.tags || [],
          is_featured: item.is_featured || false,
          is_editor_pick: false,
          view_count: Math.floor(Math.random() * 10000) + 1000,
          comment_count: Math.floor(Math.random() * 100) + 10,
          reading_time: Math.floor(Math.random() * 10) + 3,
        }));
    }
  } catch (error) {
    console.warn('Failed to fetch trending feed for top stories:', error);
  }

  try {
    // 备选方案：使用传统新闻API
    const newsResponse = await getNews('recommend', 1, limit * 2);
    
    if (newsResponse.data && newsResponse.data.length > 0) {
      return newsResponse.data
        .filter(item => item.image_url || item.cover?.url)
        .slice(0, limit)
        .map(item => ({
          id: item.id,
          title: item.title,
          excerpt: item.excerpt || item.introduction,
          slug: item.slug,
          image_url: item.image_url || item.cover?.url,
          publish_time: item.publish_at,
          author: item.author,
          channel: item.channel ? {
            id: item.channel.slug || 'unknown',
            name: item.channel.name,
            slug: item.channel.slug || 'unknown'
          } : undefined,
          tags: item.tags || [],
          is_featured: item.is_featured || false,
          is_editor_pick: false,
          view_count: Math.floor(Math.random() * 10000) + 1000,
          comment_count: Math.floor(Math.random() * 100) + 10,
          reading_time: Math.floor(Math.random() * 10) + 3,
        }));
    }
  } catch (error) {
    console.warn('Failed to fetch news for top stories:', error);
  }

  // 此处原有代码已废弃，不再使用mock数据
  */
