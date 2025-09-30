/**
 * 专题服务
 * 处理所有专题相关的API调用，支持数据库驱动和聚类算法两种模式
 */

import { getMainSite } from '@/lib/config/sites';
import { endpoints } from '@/lib/config/endpoints';
import { retryService } from './RetryService';
import {
  Topic,
  TopicDetail,
  TopicsResponse,
  TopicDetailResponse,
  TrendingTopicsResponse,
  TrendingTopicDetailResponse,
  TopicQueryOptions,
  TrendingTopicsQueryOptions,
  TopicServiceError,
  TopicErrorCode,
} from './taxonomy-types';

export class TopicService {
  private static instance: TopicService;
  private readonly baseUrl: string;

  constructor() {
    // 不再需要手动管理 baseUrl，改用 endpoints
    this.baseUrl = '';  // 保留字段以保持兼容性，但不再使用
  }

  static getInstance(): TopicService {
    if (!TopicService.instance) {
      TopicService.instance = new TopicService();
    }
    return TopicService.instance;
  }

  // ==================== 数据库驱动的专题API ====================

  /**
   * 获取专题列表（数据库模式）
   */
  async getTopics(options: TopicQueryOptions = {}): Promise<Topic[]> {
    const {
      site = getMainSite().hostname,
      fields,
      active_only = true,
      featured_only = false,
      order = '-is_featured',
      limit,
      search,
    } = options;

    const params = new URLSearchParams({ site });
    
    if (fields) params.append('fields', fields);
    if (!active_only) params.append('active_only', 'false');
    if (featured_only) params.append('featured_only', 'true');
    if (order !== '-is_featured') params.append('order', order);
    if (limit) params.append('limit', limit.toString());
    if (search) params.append('search', search);

    try {
      const url = endpoints.buildUrl(
        endpoints.getCmsEndpoint('/api/topics/db/'),
        Object.fromEntries(params.entries())
      );
      
      const response = await retryService.executeWithRetry(
        () => fetch(url, endpoints.createFetchConfig()),
        { maxAttempts: 3, baseDelay: 1000 }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: TopicsResponse = await response.json();
      return data.results;
    } catch (error) {
      console.error('Failed to fetch topics:', error);
      throw this.handleError(error, 'fetch_topics');
    }
  }

  /**
   * 获取专题详情（数据库模式）
   */
  async getTopicDetail(
    slug: string,
    options: TopicQueryOptions = {}
  ): Promise<TopicDetail> {
    const {
      site = getMainSite().hostname,
      fields,
      include_articles = true,
      articles_limit = 20,
    } = options;

    const params = new URLSearchParams({ site });
    
    if (fields) params.append('fields', fields);
    if (!include_articles) params.append('include_articles', 'false');
    if (articles_limit !== 20) params.append('articles_limit', articles_limit.toString());

    try {
      const url = endpoints.buildUrl(
        endpoints.getCmsEndpoint(`/api/topics/db/${slug}/`),
        Object.fromEntries(params.entries())
      );
      
      const response = await retryService.executeWithRetry(
        () => fetch(url, endpoints.createFetchConfig()),
        { maxAttempts: 3, baseDelay: 1000 }
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw this.createError(
            TopicErrorCode.NOT_FOUND,
            `Topic '${slug}' not found`,
            { topic_slug: slug, site }
          );
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: TopicDetailResponse = await response.json();
      return data.topic;
    } catch (error) {
      console.error(`Failed to fetch topic detail for ${slug}:`, error);
      throw this.handleError(error, 'fetch_topic_detail', { slug, site });
    }
  }

  /**
   * 获取推荐专题
   */
  async getFeaturedTopics(options: TopicQueryOptions = {}): Promise<Topic[]> {
    return this.getTopics({ 
      ...options, 
      featured_only: true 
    });
  }

  /**
   * 搜索专题
   */
  async searchTopics(
    query: string,
    options: TopicQueryOptions = {}
  ): Promise<Topic[]> {
    return this.getTopics({ 
      ...options, 
      search: query 
    });
  }

  // ==================== 聚类算法的热门话题API ====================

  /**
   * 获取热门话题（聚类算法）
   */
  async getTrendingTopics(options: TrendingTopicsQueryOptions = {}): Promise<TrendingTopicsResponse> {
    const {
      site = getMainSite().hostname,
      size = 20,
      hours = 72,
      channel = [],
      region,
      lang,
      cursor,
    } = options;

    const params = new URLSearchParams({ site, size: size.toString(), hours: hours.toString() });
    
    if (channel.length > 0) {
      channel.forEach(ch => params.append('channel', ch));
    }
    if (region) params.append('region', region);
    if (lang) params.append('lang', lang);
    if (cursor) params.append('cursor', cursor);

    try {
      const url = endpoints.buildUrl(
        endpoints.getCmsEndpoint('/api/topics/trending/'),
        Object.fromEntries(params.entries())
      );
      
      const response = await retryService.executeWithRetry(
        () => fetch(url, endpoints.createFetchConfig()),
        { maxAttempts: 3, baseDelay: 1000 }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: TrendingTopicsResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch trending topics:', error);
      throw this.handleError(error, 'fetch_trending_topics');
    }
  }

  /**
   * 获取热门话题详情（聚类算法）
   */
  async getTrendingTopicDetail(
    slug: string,
    options: TrendingTopicsQueryOptions = {}
  ): Promise<TrendingTopicDetailResponse> {
    const {
      site = getMainSite().hostname,
      hours = 72,
      channel = [],
      region,
      lang,
    } = options;

    const params = new URLSearchParams({ site, hours: hours.toString() });
    
    if (channel.length > 0) {
      channel.forEach(ch => params.append('channel', ch));
    }
    if (region) params.append('region', region);
    if (lang) params.append('lang', lang);

    try {
      const url = endpoints.buildUrl(
        endpoints.getCmsEndpoint(`/api/topics/trending/${slug}/`),
        Object.fromEntries(params.entries())
      );
      
      const response = await retryService.executeWithRetry(
        () => fetch(url, endpoints.createFetchConfig()),
        { maxAttempts: 3, baseDelay: 1000 }
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw this.createError(
            TopicErrorCode.NOT_FOUND,
            `Trending topic '${slug}' not found`,
            { topic_slug: slug, site }
          );
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: TrendingTopicDetailResponse = await response.json();
      return data;
    } catch (error) {
      console.error(`Failed to fetch trending topic detail for ${slug}:`, error);
      throw this.handleError(error, 'fetch_trending_topic_detail', { slug, site });
    }
  }

  // ==================== 通用工具方法 ====================

  /**
   * 验证专题是否存在且可用
   */
  async validateTopic(slug: string, site?: string): Promise<boolean> {
    try {
      const topic = await this.getTopicDetail(slug, { site });
      return topic.is_active && topic.is_active_period;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取相关专题
   */
  async getRelatedTopics(slug: string, site?: string): Promise<Topic[]> {
    try {
      const topic = await this.getTopicDetail(slug, { site });
      // 转换 RelatedTopic 为 Topic 格式
      const related = topic.related_topics || [];
      return related.map(rt => ({
        id: rt.id,
        title: rt.title,
        slug: rt.slug,
        summary: rt.summary,
        cover_image_url: null,
        is_active: true,
        is_featured: false,
        order: 0,
        start_date: null,
        end_date: null,
        articles_count: 0,
        is_active_period: true,
        created_at: '',
        updated_at: '',
      }));
    } catch (error) {
      console.error(`Failed to get related topics for ${slug}:`, error);
      return [];
    }
  }

  /**
   * 检查专题是否在活跃期间
   */
  isTopicActive(topic: Topic): boolean {
    if (!topic.is_active) return false;

    const now = new Date();
    
    if (topic.start_date) {
      const startDate = new Date(topic.start_date);
      if (now < startDate) return false;
    }
    
    if (topic.end_date) {
      const endDate = new Date(topic.end_date);
      if (now > endDate) return false;
    }
    
    return true;
  }

  /**
   * 获取专题状态
   */
  getTopicStatus(topic: Topic): 'active' | 'upcoming' | 'expired' | 'inactive' {
    if (!topic.is_active) return 'inactive';

    const now = new Date();
    
    if (topic.start_date) {
      const startDate = new Date(topic.start_date);
      if (now < startDate) return 'upcoming';
    }
    
    if (topic.end_date) {
      const endDate = new Date(topic.end_date);
      if (now > endDate) return 'expired';
    }
    
    return 'active';
  }

  /**
   * 创建专题服务错误
   */
  private createError(
    code: TopicErrorCode,
    message: string,
    context?: { topic_slug?: string; site?: string }
  ): TopicServiceError {
    return {
      code,
      message,
      ...context,
    };
  }

  /**
   * 处理通用错误
   */
  private handleError(
    error: any,
    operation: string,
    context?: { slug?: string; site?: string }
  ): TopicServiceError {
    if (error instanceof Error && 'code' in error) {
      return error as TopicServiceError;
    }

    // 根据错误类型创建相应的错误
    if (error?.message?.includes('404') || error?.message?.includes('not found')) {
      return this.createError(
        TopicErrorCode.NOT_FOUND,
        `Topic not found during ${operation}`,
        { topic_slug: context?.slug, site: context?.site }
      );
    }

    if (error?.message?.includes('invalid') || error?.message?.includes('Invalid')) {
      return this.createError(
        TopicErrorCode.INVALID_SLUG,
        `Invalid topic slug during ${operation}`,
        { topic_slug: context?.slug, site: context?.site }
      );
    }

    // 默认错误
    return this.createError(
      TopicErrorCode.NOT_FOUND,
      `Unknown error during ${operation}: ${error?.message || 'Unknown error'}`,
      context
    );
  }
}

// 导出单例实例
export const topicService = TopicService.getInstance();
