import { fetchTrendingFeed } from '@/lib/api/feed';
import { getNews } from '@/lib/api/news';
import { TopStoryItem } from './TopStoriesGrid';

/**
 * 获取API URL - 兼容服务端渲染和客户端
 */
function getApiUrl(path: string): string {
  // 检测运行环境
  if (typeof window === 'undefined') {
    // 服务端环境：使用后端API的内部地址
    const baseUrl = process.env.DJANGO_API_URL || 'http://authoring:8000';
    return `${baseUrl}${path}`;
  } else {
    // 客户端环境：使用前端可访问的API地址
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    return `${baseUrl}${path}`;
  }
}

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
      console.log(`🚫 Frontend Cache SKIP: ${contentType} (no cache)`);
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
    
    console.log(`💾 Frontend Cache SET: ${key} (TTL: ${ttlSeconds}s, Type: ${contentType})`);
    
    // 自动清理
    setTimeout(() => this.cleanup(key), ttlMs);
  }
  
  static get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      console.log(`🗑️ Frontend Cache EXPIRED: ${key}`);
      return null;
    }
    
    console.log(`✅ Frontend Cache HIT: ${key} (Type: ${item.contentType})`);
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
      console.log(`🧹 Frontend Cache INVALIDATE: ${pattern} (${count} keys)`);
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
 * 使用专业的headlines API，对标今日头条级体验
 */
export async function getTopStories(
  limit: number = 9,
  options?: {
    hours?: number;
    diversity?: 'high' | 'med' | 'low';
    userId?: string; // 用户ID，用于个性化去重
    // 🎯 不再需要excludeClusterIds，后端OpenSearch自动处理Hero去重
  }
): Promise<TopStoryItem[]> {
  try {
    console.log('📰 TopStories: 获取专业头条数据...');
    
    // 构建现代缓存key
    const params = new URLSearchParams({
      size: limit.toString(),
      hours: String(options?.hours ?? 24),
      diversity: String(options?.diversity ?? 'high'),
      site: 'aivoya.com', // 🔧 恢复站点参数，后端可能需要这个参数
      mode: 'topstories' // 🎯 使用TopStories模式，后端自动排除Hero内容
    });
    // 🎯 不再需要excludeClusterIds，后端OpenSearch自动处理
    // (options?.excludeClusterIds || []).forEach(id => params.append('exclude_cluster_ids', id));
    
    // 🔧 使用统一的API URL构建方法
    const apiUrl = getApiUrl(`/api/headlines?${params.toString()}`);
    const cacheKey = `headlines_v3_${apiUrl.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    // 检查现代前端缓存
    if (typeof window !== 'undefined') {
      const cachedData = ModernFrontendCache.get(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }
    
    console.log(`🔍 TopStories: Fetching URL: ${apiUrl}`);
    
    // 智能缓存策略
    const response = await fetch(apiUrl, {
      headers: getRequestHeaders(options?.userId)
      // 移除固定的revalidate，让后端动态控制
    });
    
    if (!response.ok) {
      throw new Error(`Headlines API failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 获取现代缓存策略信息
    const contentType = response.headers.get('X-Content-Type') || data.content_type || 'normal';
    const cacheStrategy = response.headers.get('X-Cache-Strategy') || 'modern-v3';
    
    console.log(`📰 获取到 ${data.items?.length || 0} 条专业头条内容 (Type: ${contentType})`);
    console.log(`🎯 现代缓存策略: ${cacheStrategy}`);
    
    if (data.items && data.items.length > 0) {
      const topStories = data.items.map((item: any) => transformToTopStoryItem(item));
      console.log(`📰 转换后头条内容: ${topStories.length} 条`);
      
      // 现代前端缓存
      if (typeof window !== 'undefined') {
        ModernFrontendCache.set(cacheKey, topStories, contentType);
      }
      
      return topStories;
    }
    // 第一次无数据，尝试扩大时间窗、放宽多样性
    const retryParams = new URLSearchParams({
      size: limit.toString(),
      hours: String(options?.hours ?? 168), // 7天
      diversity: String(options?.diversity ?? 'med'),
      site: 'aivoya.com', // 🔧 恢复站点参数
      mode: 'topstories' // 🎯 重试时也使用TopStories模式
    });
    // 🎯 不再需要excludeClusterIds，后端OpenSearch自动处理
    // (options?.excludeClusterIds || []).forEach(id => retryParams.append('exclude_cluster_ids', id));
    const retryUrl = getApiUrl(`/api/headlines?${retryParams.toString()}`);
    console.log(`🔁 TopStories: 无数据，改用宽松参数重试: ${retryUrl}`);
    const retryRes = await fetch(retryUrl, {
      headers: getRequestHeaders(options?.userId),
      next: { revalidate: 60 }
    });
    if (retryRes.ok) {
      const retryData = await retryRes.json();
      if (retryData.items && retryData.items.length > 0) {
        const relaxed = retryData.items.map((item: any) => transformToTopStoryItem(item));
        console.log(`✅ TopStories: 宽松参数获取到 ${relaxed.length} 条`);
        return relaxed;
      }
    }
  } catch (error) {
    console.warn('🚫 Headlines API failed, no data available:', error);
  }
  
  // 兜底：使用新闻列表API（真实数据）
  try {
    console.log('🧰 TopStories: 使用新闻API兜底...');
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
        console.log(`✅ TopStories: 新闻API兜底返回 ${mapped.length} 条`);
        return mapped;
      }
    }
  } catch (e) {
    console.warn('🚫 TopStories: 新闻API兜底失败', e);
  }

  console.log('❌ TopStories: 无数据');
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
