/**
 * 分类体系类型定义
 * 为新的分类和专题功能提供完整的TypeScript支持
 */

// ==================== 基础类型 ====================

/**
 * 分类类型
 */
export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  parent: number | null;
  parent_name: string | null;
  order: number;
  is_active: boolean;
  children_count: number;
  articles_count: number;
  channel_names: string[];
  created_at: string;
  updated_at: string;
  
  // 树状结构时的子分类
  children?: Category[];
}

/**
 * 专题类型
 */
export interface Topic {
  id: number;
  title: string;
  slug: string;
  summary: string;
  cover_image_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  order: number;
  start_date: string | null;
  end_date: string | null;
  articles_count: number;
  is_active_period: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 分类详情类型（包含更多信息）
 */
export interface CategoryDetail extends Category {
  children: Category[];
  recent_articles: RecentArticle[];
  breadcrumb: BreadcrumbItem[];
}

/**
 * 专题详情类型（包含更多信息）
 */
export interface TopicDetail extends Topic {
  recent_articles: RecentArticle[];
  related_topics: RelatedTopic[];
}

/**
 * 最近文章类型（用于分类和专题详情）
 */
export interface RecentArticle {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  publish_date: string;
  author_name?: string;
}

/**
 * 面包屑项类型
 */
export interface BreadcrumbItem {
  id: number;
  name: string;
  slug: string;
}

/**
 * 相关专题类型
 */
export interface RelatedTopic {
  id: number;
  title: string;
  slug: string;
  summary: string;
}

// ==================== API 响应类型 ====================

/**
 * 分类列表API响应
 */
export interface CategoriesResponse {
  results: Category[];
  count: number;
  site: {
    hostname: string;
    site_name: string;
  };
  format: 'flat' | 'tree';
}

/**
 * 分类树API响应
 */
export interface CategoriesTreeResponse {
  tree: Category[];
  site: {
    hostname: string;
    site_name: string;
  };
  metadata: {
    max_depth: string | number;
    include_counts: boolean;
    total_root_categories: number;
  };
}

/**
 * 分类详情API响应
 */
export interface CategoryDetailResponse {
  category: CategoryDetail;
  site: {
    hostname: string;
    site_name: string;
  };
}

/**
 * 专题列表API响应
 */
export interface TopicsResponse {
  results: Topic[];
  count: number;
  site: {
    hostname: string;
    site_name: string;
  };
}

/**
 * 专题详情API响应
 */
export interface TopicDetailResponse {
  topic: TopicDetail;
  site: {
    hostname: string;
    site_name: string;
  };
}

/**
 * 热门话题API响应（聚类算法）
 */
export interface TrendingTopicsResponse {
  items: TrendingTopic[];
  next_cursor: string | null;
}

/**
 * 热门话题项类型
 */
export interface TrendingTopic {
  slug: string;
  title: string;
  heat: number;
  trend: 'up' | 'down' | 'stable';
  articles_count: number;
}

/**
 * 热门话题详情API响应
 */
export interface TrendingTopicDetailResponse {
  slug: string;
  title: string;
  heat: number;
  articles: TrendingArticle[];
  count: number;
}

/**
 * 热门话题文章类型
 */
export interface TrendingArticle {
  id: string;
  article_id: string;
  title: string;
  slug: string;
  publish_time: string;
  author: string;
  topic_score: number;
}

// ==================== 标签类型与响应 ====================

export interface TagItem {
  name: string;
  slug: string;
  articles_count?: number;
}

export interface TagsListResponse {
  results: TagItem[];
  count: number;
}

export interface TagDetailResponse {
  tag: { name: string; slug: string };
  recent_articles: Array<{
    id: number;
    title: string;
    slug: string;
    publish_at: string;
    channel_slug: string;
  }>;
  articles_count: number;
}

// ==================== 查询选项类型 ====================

/**
 * 分类查询选项
 */
export interface CategoryQueryOptions {
  site?: string;
  fields?: string;
  channel?: string;
  level?: number;
  parent?: string;
  active_only?: boolean;
  format?: 'flat' | 'tree';
  order?: 'order' | 'name' | '-created_at' | 'articles_count';
  limit?: number;
  max_depth?: number;
  include_counts?: boolean;
  include_articles?: boolean;
  articles_limit?: number;
}

/**
 * 专题查询选项
 */
export interface TopicQueryOptions {
  site?: string;
  fields?: string;
  active_only?: boolean;
  featured_only?: boolean;
  order?: '-is_featured' | 'order' | '-created_at' | 'title' | 'articles_count';
  limit?: number;
  search?: string;
  include_articles?: boolean;
  articles_limit?: number;
}

/**
 * 热门话题查询选项
 */
export interface TrendingTopicsQueryOptions {
  site?: string;
  size?: number;
  hours?: number;
  channel?: string[];
  region?: string;
  lang?: string;
  cursor?: string;
}

// ==================== 文章类型扩展 ====================

/**
 * 扩展的文章类型（包含分类和专题信息）
 */
export interface ArticleWithTaxonomy {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  cover: {
    url: string;
    alt?: string;
    width?: number;
    height?: number;
  } | null;
  author_name: string;
  first_published_at: string;
  last_published_at: string;
  
  // 分类和专题信息
  categories: Category[];
  category_names: string[];
  topic: Topic | null;
  topic_slug: string; // 向后兼容
  
  // 标签
  tags: string[];
}

/**
 * 文章查询选项（扩展版）
 */
export interface ArticleQueryOptions {
  site?: string;
  fields?: string;
  include?: string; // 'categories,topics'
  channel?: string;
  region?: string;
  categories?: string; // 'tech-news,ai-news'
  topics?: string; // 'ai-development'
  q?: string;
  is_featured?: boolean;
  since?: string;
  order?: string;
  page?: number;
  size?: number;
}

// ==================== 服务错误类型 ====================

/**
 * 分类服务错误
 */
export enum CategoryErrorCode {
  NOT_FOUND = 'CATEGORY_NOT_FOUND',
  INVALID_SLUG = 'INVALID_CATEGORY_SLUG',
  SITE_MISMATCH = 'CATEGORY_SITE_MISMATCH',
  INACTIVE = 'CATEGORY_INACTIVE',
}

/**
 * 专题服务错误
 */
export enum TopicErrorCode {
  NOT_FOUND = 'TOPIC_NOT_FOUND',
  INVALID_SLUG = 'INVALID_TOPIC_SLUG',
  SITE_MISMATCH = 'TOPIC_SITE_MISMATCH',
  INACTIVE = 'TOPIC_INACTIVE',
  OUT_OF_DATE_RANGE = 'TOPIC_OUT_OF_DATE_RANGE',
}

/**
 * 分类服务错误类型
 */
export interface CategoryServiceError {
  code: CategoryErrorCode;
  message: string;
  category_slug?: string;
  site?: string;
}

/**
 * 专题服务错误类型
 */
export interface TopicServiceError {
  code: TopicErrorCode;
  message: string;
  topic_slug?: string;
  site?: string;
}
