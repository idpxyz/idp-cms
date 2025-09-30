/**
 * 分类服务
 * 处理所有分类相关的API调用
 */

import { getMainSite } from '@/lib/config/sites';
import { retryService } from './RetryService';
import { endpoints } from '@/lib/config/endpoints';
import {
  Category,
  CategoryDetail,
  CategoriesResponse,
  CategoriesTreeResponse,
  CategoryDetailResponse,
  CategoryQueryOptions,
  CategoryServiceError,
  CategoryErrorCode,
} from './taxonomy-types';

export class CategoryService {
  private static instance: CategoryService;

  constructor() {
    // 🚀 智能endpoints在每次调用时自动检测环境，无需存储baseUrl
  }

  static getInstance(): CategoryService {
    if (!CategoryService.instance) {
      CategoryService.instance = new CategoryService();
    }
    return CategoryService.instance;
  }

  /**
   * 获取分类列表
   */
  async getCategories(options: CategoryQueryOptions = {}): Promise<Category[]> {
    const {
      site = getMainSite().hostname,
      fields,
      channel,
      level,
      parent,
      active_only = true,
      format = 'flat',
      order = 'order',
      limit,
    } = options;

    const params = new URLSearchParams({ site });
    
    if (fields) params.append('fields', fields);
    if (channel) params.append('channel', channel);
    if (level) params.append('level', level.toString());
    if (parent) params.append('parent', parent);
    if (!active_only) params.append('active_only', 'false');
    if (format !== 'flat') params.append('format', format);
    if (order !== 'order') params.append('order', order);
    if (limit) params.append('limit', limit.toString());

    try {
      // 🚀 使用智能端点直接获取categories API路径
      const categoriesUrl = endpoints.getCmsEndpoint(`/api/categories/?${params.toString()}`);
      const response = await retryService.executeWithRetry(
        () => fetch(categoriesUrl),
        { maxAttempts: 3, baseDelay: 1000 }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: CategoriesResponse = await response.json();
      return data.results;
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      throw this.handleError(error, 'fetch_categories');
    }
  }

  /**
   * 获取分类树
   */
  async getCategoriesTree(options: CategoryQueryOptions = {}): Promise<Category[]> {
    const {
      site = getMainSite().hostname,
      channel,
      max_depth,
      include_counts = true,
    } = options;

    const params = new URLSearchParams({ site });
    
    if (channel) params.append('channel', channel);
    if (max_depth) params.append('max_depth', max_depth.toString());
    if (!include_counts) params.append('include_counts', 'false');

    try {
      // 🚀 使用智能端点直接获取categories tree API路径
      const treeUrl = endpoints.getCmsEndpoint(`/api/categories/tree/?${params.toString()}`);
      const response = await retryService.executeWithRetry(
        () => fetch(treeUrl),
        { maxAttempts: 3, baseDelay: 1000 }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: CategoriesTreeResponse = await response.json();
      return data.tree;
    } catch (error) {
      console.error('Failed to fetch categories tree:', error);
      throw this.handleError(error, 'fetch_categories_tree');
    }
  }

  /**
   * 获取分类详情
   */
  async getCategoryDetail(
    slug: string,
    options: CategoryQueryOptions = {}
  ): Promise<CategoryDetail> {
    const {
      site = getMainSite().hostname,
      fields,
      include_articles = false,
      articles_limit = 10,
    } = options;

    const params = new URLSearchParams({ site });
    
    if (fields) params.append('fields', fields);
    if (include_articles) params.append('include_articles', 'true');
    if (articles_limit !== 10) params.append('articles_limit', articles_limit.toString());

    try {
      // 🚀 使用智能端点直接获取category detail API路径
      const detailUrl = endpoints.getCmsEndpoint(`/api/categories/${slug}/?${params.toString()}`);
      const response = await retryService.executeWithRetry(
        () => fetch(detailUrl),
        { maxAttempts: 3, baseDelay: 1000 }
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw this.createError(
            CategoryErrorCode.NOT_FOUND,
            `Category '${slug}' not found`,
            { category_slug: slug, site }
          );
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: CategoryDetailResponse = await response.json();
      return data.category;
    } catch (error) {
      console.error(`Failed to fetch category detail for ${slug}:`, error);
      throw this.handleError(error, 'fetch_category_detail', { slug, site });
    }
  }

  /**
   * 根据频道获取分类
   */
  async getCategoriesByChannel(
    channelSlug: string,
    options: CategoryQueryOptions = {}
  ): Promise<Category[]> {
    return this.getCategories({ 
      ...options, 
      channel: channelSlug 
    });
  }

  /**
   * 获取顶级分类
   */
  async getRootCategories(options: CategoryQueryOptions = {}): Promise<Category[]> {
    return this.getCategories({ 
      ...options, 
      level: 1 
    });
  }

  /**
   * 获取子分类
   */
  async getChildCategories(
    parentSlug: string,
    options: CategoryQueryOptions = {}
  ): Promise<Category[]> {
    return this.getCategories({ 
      ...options, 
      parent: parentSlug 
    });
  }

  /**
   * 搜索分类
   */
  async searchCategories(
    query: string,
    options: CategoryQueryOptions = {}
  ): Promise<Category[]> {
    const categories = await this.getCategories(options);
    
    // 客户端搜索过滤（后端API暂不支持搜索参数）
    const lowerQuery = query.toLowerCase();
    return categories.filter(category =>
      category.name.toLowerCase().includes(lowerQuery) ||
      category.description.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * 验证分类是否存在且可用
   */
  async validateCategory(slug: string, site?: string): Promise<boolean> {
    try {
      const category = await this.getCategoryDetail(slug, { site });
      return category.is_active;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取分类面包屑导航
   */
  async getCategoryBreadcrumb(slug: string, site?: string): Promise<Array<{id: number; name: string; slug: string}>> {
    try {
      const category = await this.getCategoryDetail(slug, { site });
      return category.breadcrumb || [];
    } catch (error) {
      console.error(`Failed to get breadcrumb for category ${slug}:`, error);
      return [];
    }
  }

  /**
   * 创建分类服务错误
   */
  private createError(
    code: CategoryErrorCode,
    message: string,
    context?: { category_slug?: string; site?: string }
  ): CategoryServiceError {
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
  ): CategoryServiceError {
    if (error instanceof Error && 'code' in error) {
      return error as CategoryServiceError;
    }

    // 根据错误类型创建相应的错误
    if (error?.message?.includes('404') || error?.message?.includes('not found')) {
      return this.createError(
        CategoryErrorCode.NOT_FOUND,
        `Category not found during ${operation}`,
        { category_slug: context?.slug, site: context?.site }
      );
    }

    if (error?.message?.includes('invalid') || error?.message?.includes('Invalid')) {
      return this.createError(
        CategoryErrorCode.INVALID_SLUG,
        `Invalid category slug during ${operation}`,
        { category_slug: context?.slug, site: context?.site }
      );
    }

    // 默认错误
    return this.createError(
      CategoryErrorCode.NOT_FOUND,
      `Unknown error during ${operation}: ${error?.message || 'Unknown error'}`,
      context
    );
  }
}

// 导出单例实例
export const categoryService = CategoryService.getInstance();
