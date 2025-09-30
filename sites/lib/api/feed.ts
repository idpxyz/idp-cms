/**
 * 智能推荐Feed API客户端
 * 使用匿名用户推荐系统获取个性化内容
 */

import { endpoints } from "@/lib/config/endpoints";
import { getMainSite } from "@/lib/config/sites";
import { requestCache } from "@/lib/utils/request-cache";

export interface FeedItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  image_url?: string;
  author?: string;
  source?: string;
  channel?: {
    slug: string;
    name: string;
  };
  region?: {
    slug: string;
    name: string;
  };
  publish_at: string;
  publish_time?: string;
  updated_at?: string;
  is_featured?: boolean;
  weight?: number;
  final_score?: number;
  ctr_1h?: number;
  quality_score?: number;
  tags?: string[];
  url?: string;
  trend?: 'up' | 'down' | 'stable';
  cluster_slug?: string;
}

export interface FeedResponse {
  items: FeedItem[];
  next_cursor: string;
  debug: {
    hours: number;
    template: string;
    sort_by: string;
    site: string;
    host: string;
    user_type: 'anonymous' | 'authenticated';
    strategy_type: 'cold_start' | 'hybrid' | 'personalized' | 'fallback';
    channels: string[];
    confidence_score: number;
  };
}

export interface HeadlinesResponse {
  items: FeedItem[];
  debug: {
    site: string;
    hours: number;
    total_hits: number;
    returned_hits: number;
    candidates: number;
    clusters: number;
  };
}

export interface FeedOptions {
  size?: number;
  sort?: 'final_score' | 'popularity' | 'hot' | 'ctr';
  template?: string;
  channels?: string[];
  cursor?: string;
  hours?: number;
}

/**
 * 生成设备指纹（客户端）
 */
function generateDeviceFingerprint(): string {
  if (typeof window === 'undefined') return 'server-side';
  
  const userAgent = navigator.userAgent;
  const language = navigator.language;
  const platform = navigator.platform;
  const screenSize = `${screen.width}x${screen.height}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const colorDepth = screen.colorDepth;
  const deviceMemory = (navigator as any).deviceMemory || 'unknown';
  const hardwareConcurrency = navigator.hardwareConcurrency || 'unknown';
  
  const fingerprint = `${userAgent}_${language}_${platform}_${screenSize}_${timezone}_${colorDepth}_${deviceMemory}_${hardwareConcurrency}`;
  
  // 简单的hash函数
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  
  return Math.abs(hash).toString(16).substring(0, 16);
}

/**
 * 生成会话ID
 */
function generateSessionId(): string {
  if (typeof window === 'undefined') return 'server-session';
  
  // 尝试从localStorage获取现有会话ID
  let sessionId = localStorage.getItem('feed_session_id');
  
  if (!sessionId) {
    // 生成新的会话ID
    sessionId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('feed_session_id', sessionId);
  }
  
  return sessionId;
}

/**
 * 获取智能推荐内容
 */
export async function fetchFeed(
  options: FeedOptions = {},
  seen: string[] = []
): Promise<FeedResponse> {
  const {
    size = 20,
    sort = 'final_score',
    template,
    channels,
    cursor,
    hours
  } = options;

  // 构建查询参数
  const params = new URLSearchParams({
    size: size.toString(),
    sort,
    site: getMainSite().hostname,
  });

  if (template) {
    params.append('template', template);
  }

  if (channels && channels.length > 0) {
    channels.forEach(channel => {
      params.append('channel', channel);
    });
  }

  if (cursor) {
    params.append('cursor', cursor);
  } else if (seen && seen.length > 0) {
    // 将首屏已展示ID编码到cursor，后端可在feed中读取cursor.seen去重
    const payload = { seen };
    try {
      const token = Buffer.from(JSON.stringify(payload)).toString('base64url');
      params.append('cursor', token);
    } catch {}
  }

  if (hours) {
    params.append('hours', hours.toString());
  }

  // 在客户端使用相对路径，在服务端使用完整URL
  let url: string;
  if (typeof window !== 'undefined') {
    // 客户端：使用相对路径（注意结尾斜杠）
    url = `/api/feed/?${params.toString()}`;
  } else {
    // 服务端：使用完整URL（注意结尾斜杠）
    url = endpoints.buildUrl(endpoints.getFrontendEndpoint('/api/feed/'), Object.fromEntries(params));
  }
  

  // 客户端使用缓存，服务端直接请求
  if (typeof window !== 'undefined') {
    const cacheKey = `feed:${params.toString()}`;
    return requestCache.get(
      cacheKey,
      async () => {
        try {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'X-Session-ID': generateSessionId(),
              'User-Agent': navigator.userAgent,
            },
          });

          if (!response.ok) {
            console.warn(`Feed API degraded: ${response.status} ${response.statusText}`);
            return {
              items: [],
              next_cursor: '',
              debug: {
                hours: hours ?? 24,
                template: template ?? 'anonymous_cold_start',
                sort_by: sort,
                site: getMainSite().hostname,
                host: endpoints.getCmsEndpoint(),
                user_type: 'anonymous',
                strategy_type: 'fallback',
                channels: channels && channels.length ? channels : ['recommend'], // 🎯 降级到推荐频道
                confidence_score: 0.0,
              },
            } as FeedResponse;
          }

          return await response.json();
        } catch (err) {
          console.warn('Feed API error, using empty fallback:', err);
          return {
            items: [],
            next_cursor: '',
            debug: {
              hours: hours ?? 24,
              template: template ?? 'anonymous_cold_start',
              sort_by: sort,
              site: getMainSite().hostname,
              host: endpoints.getCmsEndpoint(),
              user_type: 'anonymous',
              strategy_type: 'fallback',
              channels: channels && channels.length ? channels : ['recommend'], // 🎯 降级到推荐频道
              confidence_score: 0.0,
            },
          } as FeedResponse;
        }
      },
      {
        ttl: 90000, // 1.5分钟缓存
        staleWhileRevalidate: true,
      }
    );
  }

  // 服务端直接请求
  try {
    const response = await fetch(url, endpoints.createFetchConfig({
      method: 'GET',
      headers: {
        'X-Session-ID': generateSessionId(),
        'User-Agent': 'Server-Side',
      },
      next: { revalidate: 120 }, // 2分钟缓存
    }));

    if (!response.ok) {
      throw new Error(`Feed API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching feed:', error);
    
    // 返回空数据而不是抛出错误
    return {
      items: [],
      next_cursor: '',
      debug: {
        hours: 24,
        template: 'anonymous_cold_start',
        sort_by: sort,
        site: getMainSite().hostname,
        host: endpoints.getCmsEndpoint(),
        user_type: 'anonymous',
        strategy_type: 'fallback',
        channels: ['recommend'], // 🎯 降级到推荐频道
        confidence_score: 0.0,
      },
    };
  }
}

/**
 * 获取“今日头条”聚合（爆发度+聚类去重）
 */
export async function fetchHeadlines(
  size: number = 8,
  hours: number = 24,
  opts?: { region?: string; lang?: string; diversity?: 'low'|'med'|'high'; cursor?: string; excludeClusterIds?: string[]; channels?: string[] }
): Promise<HeadlinesResponse> {
  const params = new URLSearchParams({
    size: String(Math.max(1, Math.min(size, 30))),
    site: getMainSite().hostname,
    hours: String(hours),
  });
  if (opts?.region) params.set('region', opts.region);
  if (opts?.lang) params.set('lang', opts.lang);
  if (opts?.diversity) params.set('diversity', opts.diversity);
  if (opts?.cursor) params.set('cursor', opts.cursor);
  if (opts?.excludeClusterIds && opts.excludeClusterIds.length > 0) {
    opts.excludeClusterIds.forEach(id => params.append('exclude_cluster_ids', id));
  }
  if (opts?.channels && opts.channels.length > 0) {
    opts.channels.forEach(ch => params.append('channel', ch));
  }

  // 客户端相对路径；服务端完整URL
  const path = `/api/headlines?${params.toString()}`;
  const url = typeof window !== 'undefined'
    ? path
    : endpoints.buildUrl(endpoints.getFrontendEndpoint('/api/headlines'), Object.fromEntries(params));

  if (typeof window !== 'undefined') {
    const cacheKey = `headlines:${params.toString()}`;
    return requestCache.get(
      cacheKey,
      async () => {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'X-Session-ID': generateSessionId(),
            'User-Agent': navigator.userAgent,
          },
        });
        if (!res.ok) throw new Error(`Headlines API error: ${res.status}`);
        return res.json();
      },
      { ttl: 60000, staleWhileRevalidate: true }
    );
  }

  const res = await fetch(url, endpoints.createFetchConfig({ method: 'GET' }));
  if (!res.ok) throw new Error(`Headlines API error: ${res.status}`);
  return res.json();
}

/**
 * 获取个性化推荐（基于用户行为）
 */
export async function fetchPersonalizedFeed(
  size: number = 20,
  sort: 'final_score' | 'popularity' | 'hot' | 'ctr' = 'final_score',
  cursor?: string
): Promise<FeedResponse> {
  return fetchFeed({
    size,
    sort,
    template: 'recommend_default',
    hours: 168, // 7天的时间窗口，确保有足够的内容
    cursor
  });
}

/**
 * 获取冷启动推荐（新用户）
 */
export async function fetchColdStartFeed(
  size: number = 20,
  cursor?: string
): Promise<FeedResponse> {
  return fetchFeed({
    size,
    sort: 'final_score',
    template: 'anonymous_cold_start',
    channels: ['recommend'], // 🎯 使用推荐频道
    hours: 720, // 30天的时间窗口，确保新用户有足够的内容
    cursor
  });
}

/**
 * 获取特定频道的推荐
 */
export async function fetchChannelFeed(
  channel: string,
  size: number = 20
): Promise<FeedResponse> {
  return fetchFeed({
    size,
    channels: [channel],
    template: 'channel_hot',
  });
}

/**
 * 获取热门内容
 */
export async function fetchHotFeed(
  size: number = 20,
  opts?: { region?: string; lang?: string; diversity?: 'low'|'med'|'high'; cursor?: string; excludeClusterIds?: string[]; hours?: number; buckets?: string }
): Promise<FeedResponse> {
  const params = new URLSearchParams({
    size: String(Math.max(1, Math.min(size, 50))),
    site: getMainSite().hostname,
    hours: String(Math.max(1, Math.min(opts?.hours ?? 168, 720))),
    buckets: opts?.buckets || '1h,6h,24h',
    diversity: opts?.diversity || 'med'
  });
  if (opts?.region) params.set('region', opts.region);
  if (opts?.lang) params.set('lang', opts.lang);
  if (opts?.cursor) params.set('cursor', opts.cursor);
  if (opts?.excludeClusterIds && opts.excludeClusterIds.length > 0) {
    opts.excludeClusterIds.forEach(id => params.append('exclude_cluster_ids', id));
  }
  const path = `/api/hot?${params.toString()}`;
  const url = typeof window !== 'undefined'
    ? path
    : endpoints.buildUrl(endpoints.getFrontendEndpoint('/api/hot'), Object.fromEntries(params));

  const res = await fetch(url, { method: 'GET' } as any);
  if (!res.ok) throw new Error(`Hot API error: ${res.status}`);
  const data = await res.json();
  return data as FeedResponse;
}

/**
 * 获取趋势内容
 */
export async function fetchTrendingFeed(
  size: number = 20
): Promise<FeedResponse> {
  return fetchFeed({
    size,
    sort: 'popularity',
    channels: ['recommend'], // 🎯 使用推荐频道代替trending
    hours: 168, // 7天的时间窗口
  });
}

/**
 * 获取最新内容
 */
export async function fetchLatestFeed(
  size: number = 20
): Promise<FeedResponse> {
  return fetchFeed({
    size,
    sort: 'final_score',
    channels: ['recommend'], // 🎯 使用推荐频道代替latest
    hours: 168, // 7天的时间窗口
  });
}

/**
 * 匿名用户推荐策略配置
 */
interface AnonymousStrategyConfig {
  confidenceThreshold: number;
  strategy: 'cold_start' | 'hybrid' | 'personalized';
  channels: string[];
  hours: number;
  template: string;
}

// 动态生成匿名用户策略配置
async function getAnonymousStrategies(): Promise<AnonymousStrategyConfig[]> {
  try {
    const strategies = await getCachedStrategies();
    return [
      {
        confidenceThreshold: 0.0,
        strategy: 'cold_start',
        channels: strategies.smart_feed.filter((ch: string) => ch !== 'recommend'), // 动态获取非推荐的智能频道
        hours: 24,
        template: 'anonymous_cold_start'
      },
      {
        confidenceThreshold: 0.3,
        strategy: 'hybrid',
        channels: ['recommend', ...strategies.smart_feed.filter((ch: string) => ch !== 'recommend').slice(0, 2)], // 推荐+前2个其他智能频道
        hours: 48,
        template: 'recommend_default'
      },
      {
        confidenceThreshold: 0.7,
        strategy: 'personalized',
        channels: ['recommend'],
        hours: 72,
        template: 'recommend_default'
      }
    ];
  } catch (error) {
    console.warn('Failed to load dynamic anonymous strategies, using fallback');
    // 降级配置
    return [
      {
        confidenceThreshold: 0.0,
        strategy: 'cold_start',
        channels: ['recommend'],
        hours: 24,
        template: 'anonymous_cold_start'
      }
    ];
  }
}

/**
 * 根据置信度获取匿名用户推荐策略（动态版本）
 */
export async function getAnonymousStrategy(confidenceScore: number): Promise<AnonymousStrategyConfig> {
  try {
    const strategies = await getAnonymousStrategies();
    // 找到最适合的策略（从高到低）
    for (let i = strategies.length - 1; i >= 0; i--) {
      if (confidenceScore >= strategies[i].confidenceThreshold) {
        return strategies[i];
      }
    }
    // 默认返回冷启动策略
    return strategies[0];
  } catch (error) {
    console.warn('Failed to get dynamic anonymous strategy, using basic fallback');
    return {
      confidenceThreshold: 0.0,
      strategy: 'cold_start',
      channels: ['recommend'],
      hours: 24,
      template: 'anonymous_cold_start'
    };
  }
}

/**
 * 动态获取频道策略配置
 */
async function getChannelStrategies() {
  try {
    // 从API获取实际频道列表
    const response = await fetch('/api/channels');
    const data = await response.json();
    const channels = data.channels || [];
    
    // 🎯 完全基于频道属性的动态分类（无硬编码）
    const strategies = {
      // 智能推荐频道：基于频道的 strategy 属性或特殊标识
      smart_feed: channels
        .filter((ch: any) => 
          ch.strategy === 'smart' || 
          ch.slug === 'recommend' ||
          ch.is_smart_feed === true ||
          ch.type === 'smart'
        )
        .map((ch: any) => ch.slug),
      
      // 传统新闻频道：没有特殊标识的普通频道
      traditional: channels
        .filter((ch: any) => 
          (!ch.strategy || ch.strategy === 'traditional') &&
          ch.slug !== 'recommend' &&
          !ch.is_smart_feed &&
          !ch.is_hybrid &&
          ch.type !== 'smart' &&
          ch.type !== 'hybrid'
        )
        .map((ch: any) => ch.slug),
      
      // 混合频道：基于频道的 strategy 属性或混合标识
      hybrid: channels
        .filter((ch: any) => 
          ch.strategy === 'hybrid' ||
          ch.is_hybrid === true ||
          ch.type === 'hybrid' ||
          // 如果没有strategy字段，可以基于频道标签或分类判断
          (ch.tags && (ch.tags.includes('political') || ch.tags.includes('policy') || ch.tags.includes('government'))) ||
          (ch.category && ch.category.toLowerCase().includes('politic')) ||
          (ch.name && ch.name.toLowerCase().includes('政策')) ||
          (ch.slug && ch.slug.includes('policy'))
        )
        .map((ch: any) => ch.slug)
    };
    
    // 如果没有明确标识的频道，进行智能默认分类
    if (strategies.smart_feed.length === 0) {
      strategies.smart_feed = ['recommend']; // 确保至少有推荐频道
    }
    
    if (strategies.traditional.length === 0) {
      // 如果没有明确的传统频道，将所有非特殊频道归为传统
      strategies.traditional = channels
        .filter((ch: any) => 
          !strategies.smart_feed.includes(ch.slug) && 
          !strategies.hybrid.includes(ch.slug)
        )
        .map((ch: any) => ch.slug);
    }
    
    return strategies;
  } catch (error) {
    console.warn('Failed to load dynamic channel strategies, using minimal fallback:', error);
    // 最小化降级配置
    return {
      smart_feed: ['recommend'],
      traditional: [], // 让系统动态发现
      hybrid: []
    };
  }
}

// 缓存策略配置
let cachedStrategies: any = null;
let strategiesPromise: Promise<any> | null = null;

/**
 * 清除策略缓存（用于测试或配置更新后重新加载）
 */
export function clearChannelStrategiesCache() {
  cachedStrategies = null;
  strategiesPromise = null;
}

/**
 * 获取缓存的频道策略配置
 */
async function getCachedStrategies() {
  if (cachedStrategies) {
    return cachedStrategies;
  }
  
  if (!strategiesPromise) {
    strategiesPromise = getChannelStrategies();
  }
  
  cachedStrategies = await strategiesPromise;
  return cachedStrategies;
}

/**
 * 判断频道是否应该使用智能推荐（动态版本）
 */
export async function shouldUseSmartFeedAsync(channelSlug: string, confidenceScore: number = 0): Promise<boolean> {
  // 🎯 推荐频道使用智能推荐，其他频道使用传统API
  if (channelSlug === 'recommend') {
    return true;
  }
  
  try {
    const strategies = await getCachedStrategies();
    
    // 混合频道根据用户置信度决定
    if (strategies.hybrid.includes(channelSlug)) {
      const useSmartFeed = confidenceScore > 0.5;
      return useSmartFeed;
    }
    
    // 智能推荐频道始终使用智能推荐
    if (strategies.smart_feed.includes(channelSlug)) {
      return true;
    }
    
    // 传统频道使用传统API
    return false;
    
  } catch (error) {
    console.warn('Failed to get dynamic strategies, falling back to safe mode:', error);
    // 🚨 降级：其他频道暂时使用传统API
    return false;
  }
}

/**
 * 同步版本（为了向后兼容）
 */
export function shouldUseSmartFeed(channelSlug: string, confidenceScore: number = 0): boolean {
  // 🎯 推荐频道使用智能推荐，其他频道使用传统API
  if (channelSlug === 'recommend') {
    return true;
  }
  
  // 🚨 其他频道暂时使用传统API，直到修复后端智能推荐系统的频道过滤逻辑
  return false;
}

/**
 * 根据推荐策略获取内容
 */
export async function fetchFeedByStrategy(
  strategy: 'cold_start' | 'hybrid' | 'personalized',
  size: number = 20,
  confidenceScore: number = 0,
  cursor?: string
): Promise<FeedResponse> {
  const strategyConfig = getAnonymousStrategy(confidenceScore);
  
  switch (strategy) {
    case 'cold_start':
      return fetchColdStartFeed(size, cursor);
    case 'hybrid':
      return fetchFeed({
        size,
        sort: 'final_score',
        template: 'recommend_default',
        channels: ['recommend'], // 🎯 简化为推荐频道
        hours: 48,
        cursor
      });
    case 'personalized':
      return fetchPersonalizedFeed(size, 'final_score', cursor);
    default:
      return fetchColdStartFeed(size, cursor);
  }
}
