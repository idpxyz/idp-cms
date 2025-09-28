/**
 * 增强的文章列表组件
 * 支持分类和专题过滤、搜索、分页等功能
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { articleService, Article, ArticleListOptions, ArticleListResponse } from '@/lib/api';

interface ArticleListProps {
  /** 显示模式 */
  mode?: 'list' | 'grid' | 'card' | 'compact';
  /** 初始查询选项 */
  initialOptions?: ArticleListOptions;
  /** 是否显示过滤器 */
  showFilters?: boolean;
  /** 是否显示搜索 */
  showSearch?: boolean;
  /** 是否显示分页 */
  showPagination?: boolean;
  /** 每页文章数量 */
  pageSize?: number;
  /** 自定义样式类名 */
  className?: string;
  /** 标题 */
  title?: string;
  /** 文章点击回调 */
  onArticleClick?: (article: Article) => void;
  /** 过滤器变化回调 */
  onFiltersChange?: (filters: ArticleListOptions) => void;
}

/**
 * 文章卡片组件
 */
const ArticleCard: React.FC<{
  article: Article;
  mode: 'list' | 'grid' | 'card' | 'compact';
  onArticleClick?: (article: Article) => void;
}> = ({ article, mode, onArticleClick }) => {
  const handleClick = (e: React.MouseEvent) => {
    if (onArticleClick) {
      e.preventDefault();
      onArticleClick(article);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getCardClassName = () => {
    const baseClasses = 'bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 hover:border-gray-300';
    
    switch (mode) {
      case 'compact':
        return `${baseClasses} p-3`;
      case 'list':
        return `${baseClasses} p-4`;
      case 'card':
      case 'grid':
      default:
        return `${baseClasses} p-6 h-full`;
    }
  };

  // 紧凑模式
  if (mode === 'compact') {
    return (
      <Link href={`/article/${article.slug}`} onClick={handleClick} className={getCardClassName()}>
        <div className="flex items-center gap-3">
          {article.cover?.url && (
            <div className="flex-shrink-0">
              <Image
                src={article.cover.url}
                alt={article.title}
                width={60}
                height={45}
                className="w-15 h-11 object-cover rounded"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
              {article.title}
            </h3>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {article.publish_at && <span>{formatDate(article.publish_at)}</span>}
              {article.category_names && article.category_names.length > 0 && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                  {article.category_names[0]}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // 列表模式
  if (mode === 'list') {
    return (
      <Link href={`/article/${article.slug}`} onClick={handleClick} className={getCardClassName()}>
        <div className="flex gap-4">
          {article.cover?.url && (
            <div className="flex-shrink-0">
              <Image
                src={article.cover.url}
                alt={article.title}
                width={160}
                height={120}
                className="w-40 h-30 object-cover rounded-lg"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {article.is_featured && (
                <span className="px-2 py-1 text-xs font-medium text-red-600 bg-red-100 rounded-full">
                  置顶
                </span>
              )}
              {article.category_names && article.category_names.length > 0 && (
                <span className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-full">
                  {article.category_names[0]}
                </span>
              )}
              {article.topic_title && (
                <span className="px-2 py-1 text-xs font-medium text-purple-600 bg-purple-100 rounded-full">
                  {article.topic_title}
                </span>
              )}
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
              {article.title}
            </h3>
            
            {article.excerpt && (
              <p className="text-gray-600 text-sm mb-3 line-clamp-3">
                {article.excerpt}
              </p>
            )}
            
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center gap-3">
                {article.author && <span>作者: {article.author}</span>}
                {article.publish_at && <span>{formatDate(article.publish_at)}</span>}
              </div>
              
              {article.tags && article.tags.length > 0 && (
                <div className="flex gap-1">
                  {article.tags.slice(0, 2).map((tag, index) => (
                    <span key={index} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // 卡片/网格模式
  return (
    <Link href={`/article/${article.slug}`} onClick={handleClick} className={getCardClassName()}>
      <div className="flex flex-col h-full">
        {article.cover?.url && (
          <div className="relative mb-4 overflow-hidden rounded-lg">
            <Image
              src={article.cover.url}
              alt={article.title}
              width={400}
              height={240}
              className="w-full h-48 object-cover"
              priority={article.is_featured}
            />
            {article.is_featured && (
              <div className="absolute top-2 left-2">
                <span className="px-2 py-1 text-xs font-medium text-white bg-red-500 rounded-full">
                  置顶
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 flex flex-col">
          <div className="flex flex-wrap gap-1 mb-2">
            {article.category_names && article.category_names.map((category, index) => (
              <span key={index} className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-full">
                {category}
              </span>
            ))}
            {article.topic_title && (
              <span className="px-2 py-1 text-xs font-medium text-purple-600 bg-purple-100 rounded-full">
                {article.topic_title}
              </span>
            )}
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-3 flex-1">
            {article.title}
          </h3>

          {article.excerpt && (
            <p className="text-gray-600 text-sm mb-4 line-clamp-3">
              {article.excerpt}
            </p>
          )}

          <div className="flex items-center justify-between text-sm text-gray-500 mt-auto">
            <div className="flex items-center gap-2">
              {article.author && <span>{article.author}</span>}
              {article.publish_at && <span>{formatDate(article.publish_at)}</span>}
            </div>
            
            {article.tags && article.tags.length > 0 && (
              <span className="text-xs text-gray-400">
                +{article.tags.length} 标签
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

/**
 * 过滤器组件
 */
const ArticleFilters: React.FC<{
  filters: ArticleListOptions;
  onFiltersChange: (filters: ArticleListOptions) => void;
}> = ({ filters, onFiltersChange }) => {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleFilterChange = (key: keyof ArticleListOptions, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg mb-6">
      <div className="flex flex-wrap gap-4 items-center">
        {/* 分类过滤 */}
        <div className="flex items-center gap-2">
          <label htmlFor="categories" className="text-sm font-medium text-gray-700">
            分类:
          </label>
          <input
            id="categories"
            type="text"
            placeholder="分类标识，多个用逗号分隔"
            value={localFilters.categories || ''}
            onChange={(e) => handleFilterChange('categories', e.target.value)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 专题过滤 */}
        <div className="flex items-center gap-2">
          <label htmlFor="topics" className="text-sm font-medium text-gray-700">
            专题:
          </label>
          <input
            id="topics"
            type="text"
            placeholder="专题标识，多个用逗号分隔"
            value={localFilters.topics || ''}
            onChange={(e) => handleFilterChange('topics', e.target.value)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 推荐过滤 */}
        <div className="flex items-center gap-2">
          <label htmlFor="featured" className="text-sm font-medium text-gray-700">
            仅推荐:
          </label>
          <input
            id="featured"
            type="checkbox"
            checked={localFilters.is_featured || false}
            onChange={(e) => handleFilterChange('is_featured', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </div>

        {/* 排序 */}
        <div className="flex items-center gap-2">
          <label htmlFor="order" className="text-sm font-medium text-gray-700">
            排序:
          </label>
          <select
            id="order"
            value={localFilters.order || '-publish_at'}
            onChange={(e) => handleFilterChange('order', e.target.value)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="-publish_at">最新发布</option>
            <option value="publish_at">最早发布</option>
            <option value="title">标题排序</option>
            <option value="-weight">权重排序</option>
          </select>
        </div>

        {/* 清空过滤器 */}
        <button
          onClick={() => {
            const cleanFilters = { site: localFilters.site };
            setLocalFilters(cleanFilters);
            onFiltersChange(cleanFilters);
          }}
          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 underline"
        >
          清空过滤器
        </button>
      </div>
    </div>
  );
};

/**
 * 分页组件
 */
const Pagination: React.FC<{
  currentPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, hasNext, hasPrev, onPageChange }) => {
  const getVisiblePages = () => {
    const pages = [];
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!hasPrev}
        className={`px-3 py-2 text-sm font-medium rounded-md ${
          hasPrev
            ? 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
            : 'text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed'
        }`}
      >
        上一页
      </button>

      {getVisiblePages().map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-3 py-2 text-sm font-medium rounded-md ${
            currentPage === page
              ? 'text-white bg-blue-600 border border-blue-600'
              : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
          }`}
        >
          {page}
        </button>
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!hasNext}
        className={`px-3 py-2 text-sm font-medium rounded-md ${
          hasNext
            ? 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
            : 'text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed'
        }`}
      >
        下一页
      </button>
    </div>
  );
};

/**
 * 文章列表主组件
 */
const ArticleList: React.FC<ArticleListProps> = ({
  mode = 'grid',
  initialOptions = {},
  showFilters = false,
  showSearch = false,
  showPagination = true,
  pageSize = 20,
  className = '',
  title,
  onArticleClick,
  onFiltersChange,
}) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    has_next: false,
    has_prev: false,
  });

  const [filters, setFilters] = useState<ArticleListOptions>({
    ...initialOptions,
    page: 1,
    size: pageSize,
  });

  const [searchQuery, setSearchQuery] = useState('');

  const fetchArticles = async (options: ArticleListOptions) => {
    try {
      setLoading(true);
      setError(null);

      const response: ArticleListResponse = await articleService.getArticles({
        include: 'categories,topics',
        ...options,
      });

      setArticles(response.items);
      setPagination(response.pagination);
    } catch (err) {
      console.error('Failed to load articles:', err);
      setError('加载文章失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles(filters);
  }, [filters]);

  const handleFiltersChange = (newFilters: ArticleListOptions) => {
    const updatedFilters = { ...newFilters, page: 1 };
    setFilters(updatedFilters);
    onFiltersChange?.(updatedFilters);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      handleFiltersChange({ ...filters, q: searchQuery.trim() });
    }
  };

  const handlePageChange = (page: number) => {
    setFilters((prev: ArticleListOptions) => ({ ...prev, page }));
    // 滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getGridClassName = () => {
    switch (mode) {
      case 'compact':
        return 'space-y-2';
      case 'list':
        return 'space-y-4';
      case 'card':
        return 'grid gap-6 md:grid-cols-2';
      case 'grid':
      default:
        return 'grid gap-6 md:grid-cols-2 lg:grid-cols-3';
    }
  };

  if (error) {
    return (
      <div className={`article-list-error ${className}`}>
        {title && <h2 className="text-2xl font-bold mb-6">{title}</h2>}
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`article-list ${className}`}>
      {title && <h2 className="text-2xl font-bold mb-6">{title}</h2>}

      {/* 搜索框 */}
      {showSearch && (
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="搜索文章..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              搜索
            </button>
          </div>
        </form>
      )}

      {/* 过滤器 */}
      {showFilters && (
        <ArticleFilters filters={filters} onFiltersChange={handleFiltersChange} />
      )}

      {/* 加载状态 */}
      {loading && (
        <div className="animate-pulse">
          <div className={getGridClassName()}>
            {Array.from({ length: pageSize }).map((_, index) => (
              <div key={index} className="bg-gray-200 rounded-lg h-64"></div>
            ))}
          </div>
        </div>
      )}

      {/* 文章列表 */}
      {!loading && (
        <>
          {articles.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-500 text-lg">暂无文章</p>
              <p className="text-gray-400 text-sm mt-1">
                {Object.keys(filters).length > 2 ? '请尝试调整筛选条件' : '请稍后再来查看'}
              </p>
            </div>
          ) : (
            <div className={getGridClassName()}>
              {articles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  mode={mode}
                  onArticleClick={onArticleClick}
                />
              ))}
            </div>
          )}

          {/* 分页 */}
          {showPagination && pagination.total > pageSize && (
            <Pagination
              currentPage={pagination.page}
              totalPages={Math.ceil(pagination.total / pageSize)}
              hasNext={pagination.has_next}
              hasPrev={pagination.has_prev}
              onPageChange={handlePageChange}
            />
          )}

          {/* 统计信息 */}
          {articles.length > 0 && (
            <div className="mt-6 text-center text-sm text-gray-500">
              共找到 {pagination.total} 篇文章，当前第 {pagination.page} 页
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ArticleList;
