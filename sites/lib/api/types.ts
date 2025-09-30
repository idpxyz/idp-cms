/**
 * 统一API响应类型定义
 * 标准化所有API接口的响应格式、错误处理、分页等
 */

// 基础响应接口
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
  debug?: DebugInfo;
}

// 分页响应接口
export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    size: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
    next_cursor?: string;
    prev_cursor?: string;
  };
}

// 错误信息结构
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  field_errors?: Record<string, string[]>;
  retry_after?: number;
}

// 响应元数据
export interface ResponseMeta {
  timestamp: string;
  request_id: string;
  version: string;
  cache_status?: 'hit' | 'miss' | 'stale';
  execution_time_ms?: number;
}

// 调试信息（仅开发环境）
export interface DebugInfo {
  strategy_type?: string;
  fallback_used?: boolean;
  cache_key?: string;
  sql_queries?: number;
  external_calls?: string[];
  [key: string]: any;
}

// 错误代码常量
export const ErrorCodes = {
  // 通用错误
  INVALID_REQUEST: 'INVALID_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  
  // 业务错误
  ARTICLE_NOT_FOUND: 'ARTICLE_NOT_FOUND',
  INVALID_SLUG: 'INVALID_SLUG',
  SITE_NOT_CONFIGURED: 'SITE_NOT_CONFIGURED',
  
  // 服务错误
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  CIRCUIT_BREAKER_OPEN: 'CIRCUIT_BREAKER_OPEN',
  TIMEOUT: 'TIMEOUT',
} as const;

// 文章相关类型
export interface Article {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  image_url: string | null;
  cover?: {
    url: string;
    alt?: string;
    width?: number;
    height?: number;
  };
  channel: {
    id: number;
    name: string;
    slug: string;
  };
  region?: string;
  publish_at: string;
  updated_at: string;
  is_featured: boolean;
  source: string;
  author: string;
  tags: string[];
  weight?: number;
  has_video?: boolean;
  language?: string;
  external_url?: string;
  
  // 新增分类和专题字段
  categories?: Array<{
    id: number;
    name: string;
    slug: string;
    description: string;
    parent_id?: number;
    parent_name?: string;
    order: number;
  }>;
  category_names?: string[];
  topic?: {
    id: number;
    title: string;
    slug: string;
    summary: string;
    is_active: boolean;
    is_featured: boolean;
    order: number;
    cover_image_url?: string;
  };
  topic_slug?: string; // 向后兼容
  topic_title?: string;
}

// 文章查找选项
export interface ArticleLookupOptions {
  site?: string;
  include_drafts?: boolean;
  include_content?: boolean;
  fallback_to_db?: boolean;
  cache_ttl?: number;
}

// 导出新的类型定义
export * from './taxonomy-types';

// 文章查找结果
export interface ArticleLookupResult {
  article: Article | null;
  source: 'cache' | 'opensearch' | 'database' | 'fallback';
  fallback_used: boolean;
  execution_time_ms: number;
}
