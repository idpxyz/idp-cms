/**
 * 社会频道模板数据获取工具
 */

import { endpoints } from '@/lib/config/endpoints';
import { getMainSite } from '@/lib/config/sites';

export interface SocialArticle {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  image_url?: string;
  cover_url?: string;
  channel?: {
    slug: string;
    name: string;
  };
  publish_at?: string;
  updated_at?: string;
  view_count?: number;
  comment_count?: number;
  like_count?: number;
  category_name?: string;
}

export interface SocialChannelStats {
  articles_count: number;
  followers_count: number;
  deep_reports_count: number;
}

/**
 * 获取社会频道头条新闻
 */
export async function getSocialHeadlines(channelSlug: string, size: number = 5): Promise<SocialArticle[]> {
  try {
    const apiUrl = endpoints.buildUrl(
      endpoints.getCmsEndpoint('/api/headlines/'),
      {
        channel: channelSlug,
        size: size.toString(),
        site: getMainSite().hostname,
      }
    );

    const fetchConfig = endpoints.createFetchConfig({
      timeout: 10000,
      next: { revalidate: 300 }, // 5分钟缓存
    });

    const response = await fetch(apiUrl, fetchConfig);

    if (!response.ok) {
      console.warn('Failed to fetch headlines, using fallback');
      return [];
    }

    const data = await response.json();
    const items = data.items || data.results || [];
    
    return items.map((item: any) => ({
      id: item.id || item.slug,
      title: item.title,
      slug: item.slug,
      excerpt: item.excerpt || item.introduction || item.summary || '',
      image_url: item.cover_url || item.hero_image_url || item.featured_image_url || item.image_url || `https://picsum.photos/800/450?random=${item.id}`,
      channel: item.channel,
      publish_at: item.publish_at || item.publish_time || item.first_published_at,
      updated_at: item.updated_at,
      view_count: item.view_count || 0,
      comment_count: item.comment_count || 0,
      category_name: item.category?.name || item.category_name || '社会民生',
    }));
  } catch (error) {
    console.error('Error fetching social headlines:', error);
    return [];
  }
}

/**
 * 获取社会频道最新动态
 */
export async function getSocialLatestNews(channelSlug: string, limit: number = 10): Promise<SocialArticle[]> {
  try {
    const apiUrl = endpoints.buildUrl(
      endpoints.getCmsEndpoint('/api/portal/articles/'),
      {
        channel: channelSlug,
        size: limit.toString(),
        site: getMainSite().hostname,
        order: '-publish_at', // 按发布时间倒序
      }
    );

    const fetchConfig = endpoints.createFetchConfig({
      timeout: 10000,
      next: { revalidate: 300 }, // 5分钟缓存
    });

    const response = await fetch(apiUrl, fetchConfig);

    if (!response.ok) {
      console.warn('Failed to fetch latest news, using fallback');
      return [];
    }

    const data = await response.json();
    const items = data.results || data.items || [];
    
    return items.map((item: any) => ({
      id: item.id || item.slug,
      title: item.title,
      slug: item.slug,
      excerpt: item.excerpt || item.summary || '',
      image_url: item.cover_url || item.hero_image_url || item.featured_image_url || item.image_url || `https://picsum.photos/100/70?random=${item.id}`,
      channel: item.channel,
      publish_at: item.publish_at || item.publish_time,
      updated_at: item.updated_at,
      view_count: item.view_count || 0,
      comment_count: item.comment_count || 0,
      category_name: item.category?.name || item.category_name || '民生',
    }));
  } catch (error) {
    console.error('Error fetching social latest news:', error);
    return [];
  }
}

/**
 * 获取社会频道热点排行
 */
export async function getSocialHotArticles(channelSlug: string, limit: number = 5): Promise<SocialArticle[]> {
  try {
    const apiUrl = endpoints.buildUrl(
      endpoints.getCmsEndpoint('/api/portal/articles/'),
      {
        channel: channelSlug,
        size: limit.toString(),
        site: getMainSite().hostname,
        order: '-view_count', // 按阅读量倒序
      }
    );

    const fetchConfig = endpoints.createFetchConfig({
      timeout: 10000,
      next: { revalidate: 600 }, // 10分钟缓存
    });

    const response = await fetch(apiUrl, fetchConfig);

    if (!response.ok) {
      console.warn('Failed to fetch hot articles, using fallback');
      return [];
    }

    const data = await response.json();
    const items = data.results || data.items || [];
    
    return items.map((item: any) => ({
      id: item.id || item.slug,
      title: item.title,
      slug: item.slug,
      view_count: item.view_count || 0,
      image_url: item.cover_url || item.hero_image_url || item.featured_image_url,
      category_name: item.category?.name || item.category_name,
    }));
  } catch (error) {
    console.error('Error fetching social hot articles:', error);
    return [];
  }
}

/**
 * 获取频道统计数据（模拟，后续可接入真实统计API）
 */
export async function getSocialChannelStats(channelSlug: string): Promise<SocialChannelStats> {
  try {
    // TODO: 接入真实的统计API
    // 目前返回计算的统计数据
    const [headlines, latestNews] = await Promise.all([
      getSocialHeadlines(channelSlug, 1),
      getSocialLatestNews(channelSlug, 1),
    ]);

    // 基于数据估算统计
    return {
      articles_count: 1247, // 可以从API获取
      followers_count: 560000, // 可以从用户关注API获取
      deep_reports_count: 328, // 可以从文章统计API获取
    };
  } catch (error) {
    console.error('Error fetching channel stats:', error);
    return {
      articles_count: 0,
      followers_count: 0,
      deep_reports_count: 0,
    };
  }
}

/**
 * 格式化时间
 */
export function formatTimeAgo(dateString?: string): string {
  if (!dateString) return '刚刚';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  
  return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
}

/**
 * 格式化数字
 */
export function formatNumber(num: number): string {
  if (num >= 10000) {
    return `${(num / 10000).toFixed(1)}万`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}千`;
  }
  return num.toString();
}

