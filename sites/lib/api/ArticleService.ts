/**
 * 统一文章服务
 * 集中处理文章查找、格式转换、fallback等逻辑
 */

import { endpoints } from '@/lib/config/endpoints';
import { getMainSite } from '@/lib/config/sites';
import { Article, ArticleLookupOptions, ArticleLookupResult } from './types';
import { retryService } from './RetryService';

// 新增：支持分类和专题的文章查询选项
export interface ArticleListOptions {
  site?: string;
  fields?: string;
  include?: string; // 'categories,topics'
  channel?: string;
  region?: string;
  categories?: string; // 'tech-news,ai-news'
  topics?: string; // 'ai-development'
  tags?: string; // 'ai,tech'
  q?: string; // 搜索关键词
  is_featured?: boolean;
  since?: string;
  order?: string;
  page?: number;
  size?: number;
}

// 文章列表API响应类型
export interface ArticleListResponse {
  items: Article[];
  pagination: {
    page: number;
    size: number;
    total: number;
    has_next: boolean;
    has_prev: boolean;
  };
  meta: {
    site: string;
    site_id: number;
  };
}

export class ArticleService {
  private static instance: ArticleService;

  static getInstance(): ArticleService {
    if (!ArticleService.instance) {
      ArticleService.instance = new ArticleService();
    }
    return ArticleService.instance;
  }

  /**
   * 根据slug查找文章
   */
  async findBySlug(
    slug: string,
    options: ArticleLookupOptions = {}
  ): Promise<ArticleLookupResult> {
    const startTime = Date.now();
    const {
      site,
      include_drafts = false,
      include_content = true,
      fallback_to_db = true,
      cache_ttl = 600,
    } = options;

    // 站点候选列表：优先指定站点，然后主站，最后localhost
    const candidateSites = site 
      ? [site] 
      : [getMainSite().hostname, 'localhost'];

    let article: Article | null = null;
    let source: ArticleLookupResult['source'] = 'database';
    let fallback_used = false;

    // 依次尝试候选站点
    for (const candidateSite of candidateSites) {
      try {
        const result = await this.fetchFromBackend(slug, candidateSite, {
          include_drafts,
          include_content,
          cache_ttl,
        });

        if (result.article) {
          article = result.article;
          source = result.source;
          fallback_used = candidateSite !== candidateSites[0];
          break;
        }
      } catch (error) {
        console.warn(`Failed to fetch article from ${candidateSite}:`, error);
        // 继续尝试下一个站点
      }
    }

    return {
      article,
      source,
      fallback_used,
      execution_time_ms: Date.now() - startTime,
    };
  }

  /**
   * 从后端API获取文章（带重试机制）
   */
  private async fetchFromBackend(
    slug: string,
    site: string,
    options: {
      include_drafts: boolean;
      include_content: boolean;
      cache_ttl: number;
    }
  ): Promise<{ article: Article | null; source: ArticleLookupResult['source'] }> {
    // 使用重试服务包装获取逻辑
    return retryService.executeWithRetry(
      async () => {
        const cmsUrl = endpoints.buildUrl(
          endpoints.getCmsEndpoint(`/api/articles/${encodeURIComponent(slug)}/`),
          { 
            site, 
            include: 'channel,region',
            ...(options.include_drafts && { include_drafts: 'true' }),
          }
        );

        try {
        const backend = await retryService.fetch(cmsUrl, {
          method: 'GET',
          headers: endpoints.createFetchConfig({
            timeout: 1500, // 🚀 优化：减少超时到1.5秒
            next: {
              revalidate: options.cache_ttl,
              tags: [`article:${slug}`],
            },
          }).headers,
        }, {
          timeout: 1500, // 🚀 优化：减少超时到1.5秒
          maxAttempts: 1, // 单层重试，外层还有重试
          baseDelay: 200, // 🚀 优化：减少重试延迟到200ms
        });

          const articleData = backend && (
            (backend as any).article || 
            (backend as any).data || 
            backend
          );

          if (!articleData || !articleData.slug) {
            return { article: null, source: 'database' };
          }

          const article = this.transformArticleData(articleData, options.include_content);
          
          // 根据响应判断来源
          const source: ArticleLookupResult['source'] = 'database';

          return { article, source };
        } catch (error: any) {
          if (error.status === 404) {
            return { article: null, source: 'database' };
          }
          throw error;
        }
      },
      {
        maxAttempts: 1, // 🚀 优化：减少重试次数到1次（快速失败）
        baseDelay: 200, // 🚀 优化：减少延迟到200ms
        maxDelay: 1000, // 🚀 优化：减少最大延迟到1秒
        retryCondition: (error) => {
          // 重试5xx错误和网络错误，但不重试404和超时
          if (error.message && error.message.includes('404')) return false;
          if (error.status === 404) return false;
          // 🚀 优化：不重试超时错误，快速失败
          if (error.message && error.message.includes('timeout')) return false;
          if (error.name === 'AbortError') return false;
          return (error.message && (
            error.message.includes('500') || 
            error.message.includes('503')
          )) || error.name === 'TypeError';
        }
      }
    );
  }

  /**
   * 转换后端文章数据为标准格式
   */
  private transformArticleData(data: any, includeContent: boolean = true): Article {
    return {
      id: data.id,
      title: data.title,
      slug: data.slug,
      content: includeContent ? this.transformContent(data.body || data.content) : '',
      excerpt: data.excerpt || data.introduction || '',
      image_url: data.cover?.url || null,
      cover: data.cover ? {
        url: data.cover.url,
        alt: data.cover.alt || data.title,
        width: data.cover.width,
        height: data.cover.height,
      } : undefined,
      channel: data.channel || (data.channel_slug ? {
        id: 0,
        name: data.channel_name || data.channel_slug,
        slug: data.channel_slug,
      } : {
        id: 0,
        name: '未知频道',
        slug: 'unknown',
      }),
      region: data.region || '',
      publish_at: data.publish_at || data.first_published_at,
      updated_at: data.updated_at || data.last_published_at,
      is_featured: data.is_featured || false,
      source: (data.channel && data.channel.name) || 
              data.channel_name || 
              data.channel_slug || 
              '未知来源',
      author: data.author || data.author_name || '',
      tags: data.tags || [],
      weight: data.weight,
      has_video: data.has_video,
      language: data.language,
      external_url: data.external_article_url,
      // SEO 字段
      canonical_url: data.canonical_url,
      external_article_url: data.external_article_url,
      seo: data.seo || undefined,
    };
  }

  /**
   * 转换内容格式（JSON块 -> HTML）
   */
  private transformContent(content: any): string {
    try {
      if (typeof content === 'string') {
        const trimmed = content.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          const blocks = JSON.parse(trimmed);
          if (Array.isArray(blocks)) {
            return blocks.map((block: any) => {
              const type = block?.type || 'paragraph';
              const value = block?.value || '';
              
              switch (type) {
                case 'paragraph':
                  return `<p>${value}</p>`;
                case 'heading':
                  const depth = block.depth || 2;
                  return `<h${depth}>${value}</h${depth}>`;
                case 'list':
                  const items = (block.items || []).map((item: string) => `<li>${item}</li>`).join('');
                  return block.ordered ? `<ol>${items}</ol>` : `<ul>${items}</ul>`;
                case 'quote':
                  return `<blockquote>${value}</blockquote>`;
                case 'code':
                  return `<pre><code>${value}</code></pre>`;
                case 'image':
                  return `<img src="${block.url}" alt="${block.alt || ''}" />`;
                default:
                  return `<p>${value}</p>`;
              }
            }).join('');
          }
        }
        return content;
      }
      return '';
    } catch (error) {
      console.warn('Failed to transform content:', error);
      return typeof content === 'string' ? content : '';
    }
  }

  /**
   * 批量查找文章
   */
  async findBySlugs(
    slugs: string[],
    options: ArticleLookupOptions = {}
  ): Promise<Record<string, ArticleLookupResult>> {
    const results: Record<string, ArticleLookupResult> = {};
    
    // 并行请求所有文章
    const promises = slugs.map(async (slug) => {
      const result = await this.findBySlug(slug, options);
      return { slug, result };
    });

    const resolvedResults = await Promise.all(promises);
    
    for (const { slug, result } of resolvedResults) {
      results[slug] = result;
    }

    return results;
  }

  /**
   * 预热缓存
   */
  async warmupCache(slugs: string[], site?: string): Promise<void> {
    console.log(`Warming up cache for ${slugs.length} articles...`);
    
    await this.findBySlugs(slugs, {
      site,
      include_content: false, // 只预热元数据
      cache_ttl: 3600, // 1小时缓存
    });
  }

  // ==================== 新增：文章列表获取方法 ====================

  /**
   * 获取文章列表
   */
  async getArticles(options: ArticleListOptions = {}): Promise<ArticleListResponse> {
    const {
      site = getMainSite().hostname,
      fields,
      include,
      channel,
      region,
      categories,
      topics,
      tags,
      q,
      is_featured,
      since,
      order,
      page = 1,
      size = 20,
    } = options;

    const params = new URLSearchParams({ site, page: page.toString(), size: size.toString() });
    
    if (fields) params.append('fields', fields);
    if (include) params.append('include', include);
    if (channel) params.append('channel', channel);
    if (region) params.append('region', region);
    if (categories) params.append('categories', categories);
    if (topics) params.append('topics', topics);
    if (tags) params.append('tags', tags);
    if (q) params.append('q', q);
    if (is_featured !== undefined) params.append('is_featured', is_featured.toString());
    if (since) params.append('since', since);
    if (order) params.append('order', order);

    try {
      const cmsUrl = endpoints.buildUrl(
        endpoints.getCmsEndpoint('/api/articles/'),
        Object.fromEntries(params.entries())
      );

      const response = await retryService.executeWithRetry(
        () => fetch(cmsUrl, endpoints.createFetchConfig()),
        { maxAttempts: 3, baseDelay: 1000 }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ArticleListResponse = await response.json();
      
      // 转换文章数据
      data.items = data.items.map(article => this.transformArticleData(article, false));
      
      return data;
    } catch (error) {
      console.error('Failed to fetch articles list:', error);
      throw error;
    }
  }

  /**
   * 按分类获取文章
   */
  async getArticlesByCategory(
    categorySlug: string,
    options: ArticleListOptions = {}
  ): Promise<ArticleListResponse> {
    return this.getArticles({ 
      ...options, 
      categories: categorySlug 
    });
  }

  /**
   * 按专题获取文章
   */
  async getArticlesByTopic(
    topicSlug: string,
    options: ArticleListOptions = {}
  ): Promise<ArticleListResponse> {
    return this.getArticles({ 
      ...options, 
      topics: topicSlug 
    });
  }

  /**
   * 按多个分类获取文章
   */
  async getArticlesByCategories(
    categorySlugs: string[],
    options: ArticleListOptions = {}
  ): Promise<ArticleListResponse> {
    return this.getArticles({ 
      ...options, 
      categories: categorySlugs.join(',') 
    });
  }

  /**
   * 获取推荐文章
   */
  async getFeaturedArticles(options: ArticleListOptions = {}): Promise<ArticleListResponse> {
    return this.getArticles({ 
      ...options, 
      is_featured: true 
    });
  }

  /**
   * 搜索文章
   */
  async searchArticles(
    query: string,
    options: ArticleListOptions = {}
  ): Promise<ArticleListResponse> {
    return this.getArticles({ 
      ...options, 
      q: query 
    });
  }

  /**
   * 获取最近文章
   */
  async getRecentArticles(
    since: string = '24h',
    options: ArticleListOptions = {}
  ): Promise<ArticleListResponse> {
    return this.getArticles({ 
      ...options, 
      since,
      order: '-publish_at' 
    });
  }

  /**
   * 清除文章缓存
   */
  async invalidateCache(slug: string): Promise<void> {
    // 这里可以实现缓存失效逻辑
    // 例如调用Next.js的revalidateTag
    if (typeof window === 'undefined') {
      // 服务端环境
      try {
        // 可以通过API调用后端的缓存清除接口
        console.log(`Invalidating cache for article: ${slug}`);
      } catch (error) {
        console.warn('Failed to invalidate cache:', error);
      }
    }
  }
}

// 导出单例实例
export const articleService = ArticleService.getInstance();

