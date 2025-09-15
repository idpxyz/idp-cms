"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { formatDateShort } from "@/lib/utils/date";

// 相对时间格式化
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return '刚刚';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分钟前`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}小时前`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}天前`;
  
  return formatDateShort(dateString);
}

// 数字格式化
function formatNumber(num: number): string {
  if (num >= 10000) return `${(num / 10000).toFixed(1)}万`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toString();
}
import { trackSearch, trackSearchDwell } from "@/lib/tracking/analytics";
import SearchFilters, { SearchFilters as FilterType } from "@/components/search/SearchFilters";
import RelatedSearches, { generateRelatedSearches } from "@/components/search/RelatedSearches";
import TrendingSearches from "@/components/search/TrendingSearches";
import { useSearchHistory } from "@/lib/hooks/useSearchHistory";

interface SearchResult {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  image_url: string | null;
  source: string;
  publish_at: string;
  url: string;
  highlight?: {
    title?: string;
    excerpt?: string;
  };
}

interface SearchResponse {
  success: boolean;
  message: string;
  data: SearchResult[];
  total: number;
  page: number;
  limit: number;
  query: string;
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FilterType>({});
  const [pageSize] = useState(10); // 每页显示数量
  
  const { addToHistory } = useSearchHistory();

  // 从URL参数初始化状态
  useEffect(() => {
    const q = searchParams.get('q') || '';
    const p = parseInt(searchParams.get('page') || '1');
    const since = searchParams.get('since') || undefined;
    const orderBy = searchParams.get('orderBy') as FilterType['orderBy'] || undefined;
    
    setQuery(q);
    setPage(p);
    setFilters({ since, orderBy });
    
    if (q) {
      performSearch(q, p, { since, orderBy });
    }
  }, [searchParams]);

  // 执行搜索
  const performSearch = useCallback(async (
    searchQuery: string, 
    searchPage: number = 1,
    searchFilters: FilterType = {}
  ) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setTotal(0);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 构建搜索URL
      const params = new URLSearchParams({
        q: searchQuery.trim(),
        page: searchPage.toString(),
        limit: pageSize.toString(),
      });

      // 添加筛选参数
      if (searchFilters.since) params.set('since', searchFilters.since);
      if (searchFilters.orderBy) {
        // 映射前端orderBy到后端sort参数
        const sortMap: Record<string, string> = {
          'relevance': 'rel',
          'date': 'time', 
          'popularity': 'hot'
        };
        params.set('sort', sortMap[searchFilters.orderBy] || 'rel');
      }

      const response = await fetch(`/api/search?${params.toString()}`);
      const data: SearchResponse = await response.json();
      
      if (!response.ok) {
        // 如果响应不是OK，尝试从响应体中获取错误信息
        throw new Error(data.message || `搜索服务错误: ${response.status}`);
      }

      if (data.success) {
        setResults(data.data || []);
        setTotal(data.total || 0);
        
        // 跟踪搜索事件
        if (searchPage === 1) {
          trackSearch(searchQuery, data.data.map(item => item.id.toString()));
          addToHistory(searchQuery);
        }
      } else {
        throw new Error(data.message || '搜索失败');
      }
    } catch (err) {
      // 区分不同类型的错误，避免将验证错误记录为系统错误
      const errorMessage = err instanceof Error ? err.message : '搜索服务暂时不可用';
      
      // 只有非用户输入错误才记录到控制台
      const isUserInputError = errorMessage.includes('包含非法字符') || 
                              errorMessage.includes('包含敏感词') ||
                              errorMessage.includes('页码过大') ||
                              errorMessage.includes('不能为空') ||
                              errorMessage.includes('过长');
      
      if (!isUserInputError) {
        console.error('Search error:', err);
      }
      
      setError(errorMessage);
      setResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [addToHistory, pageSize]);


  // 处理筛选变化
  const handleFiltersChange = useCallback((newFilters: FilterType) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    router.push(`/portal/search?${params.toString()}`);
  }, [router, query]);

  // 处理分页
  const handlePageChange = useCallback((newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`/portal/search?${params.toString()}`);
  }, [router, searchParams]);

  // 处理搜索点击（用于热搜榜和相关搜索）
  const handleSearchClick = useCallback((newQuery: string) => {
    const params = new URLSearchParams();
    params.set('q', newQuery);
    
    // 保留当前筛选条件
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    router.push(`/portal/search?${params.toString()}`);
  }, [router, filters]);

  // 生成相关搜索
  const relatedSearches = React.useMemo(() => {
    return query ? generateRelatedSearches(query, 6) : [];
  }, [query]);

  // 页面停留时间跟踪
  useEffect(() => {
    if (!query || results.length === 0) return;

    const startTime = Date.now();
    
    return () => {
      const dwellTime = Date.now() - startTime;
      if (dwellTime > 1000) { // 至少停留1秒
        trackSearchDwell(query, dwellTime);
      }
    };
  }, [query, results]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 搜索结果统计 */}
      {query && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-medium text-gray-900">
                  搜索结果: "{query}"
                </h1>
                {total > 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    找到 {total} 条相关结果
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 筛选条件 */}
      {query && (
        <SearchFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 主要搜索结果 */}
          <div className="lg:col-span-3">
            {/* 加载状态 */}
            {loading && (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="bg-white rounded-lg p-6 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded mb-4 w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            )}

            {/* 错误状态 */}
            {error && !loading && (
              <div className="bg-white rounded-lg p-8 text-center">
                <div className="mb-4">
                  {/* 根据错误类型显示不同图标 */}
                  {error.includes('包含非法字符') || error.includes('包含敏感词') ? (
                    <div className="text-yellow-500">
                      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                  ) : (
                    <div className="text-red-500">
                      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {error.includes('包含非法字符') || error.includes('包含敏感词') ? '搜索内容需要调整' : '搜索出现问题'}
                </h3>
                <p className="text-gray-600 mb-4">{error}</p>
                {error.includes('包含非法字符') || error.includes('包含敏感词') ? (
                  <p className="text-sm text-gray-500 mb-4">
                    请修改搜索关键词后重试
                  </p>
                ) : (
                  <button
                    onClick={() => query && performSearch(query, page, filters)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    重试
                  </button>
                )}
              </div>
            )}

            {/* 无结果状态 */}
            {!loading && !error && query && results.length === 0 && (
              <div className="bg-white rounded-lg p-8 text-center">
                <div className="text-gray-400 mb-4">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">未找到相关结果</h3>
                <p className="text-gray-600 mb-4">
                  试试其他关键词，或者调整筛选条件
                </p>
              </div>
            )}

            {/* 欢迎页面 */}
            {!loading && !error && !query && (
              <div className="bg-white rounded-lg p-8 text-center">
                <div className="text-blue-500 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">开始搜索</h3>
                <p className="text-gray-600 mb-4">
                  输入关键词搜索新闻、文章和话题
                </p>
              </div>
            )}

            {/* 搜索结果列表 */}
            {!loading && !error && results.length > 0 && (
              <div className="space-y-4">
                {results.map((result) => (
                  <article key={result.id} className="bg-white rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex space-x-4">
                      {result.image_url && (
                        <div className="flex-shrink-0">
                          <Image
                            src={result.image_url}
                            alt={result.title}
                            width={120}
                            height={80}
                            className="rounded-lg object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">
                          <a 
                            href={result.url}
                            className="hover:text-blue-600 transition-colors"
                            dangerouslySetInnerHTML={{
                              __html: result.highlight?.title || result.title
                            }}
                          />
                        </h2>
                        <p 
                          className="text-gray-600 text-sm mb-3 line-clamp-2"
                          dangerouslySetInnerHTML={{
                            __html: result.highlight?.excerpt || result.excerpt
                          }}
                        />
                        <div className="flex items-center flex-wrap text-xs text-gray-500 gap-x-4 gap-y-1">
                          {/* 来源信息 */}
                          {(result.source || result.channel) && (
                            <span className="flex items-center">
                              <svg className="w-3 h-3 mr-1 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                              </svg>
                              {result.source || result.channel || '本站'}
                            </span>
                          )}
                          
                          {/* 作者信息 */}
                          {result.author && (
                            <span className="flex items-center">
                              <svg className="w-3 h-3 mr-1 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                              </svg>
                              {result.author}
                            </span>
                          )}
                          
                          {/* 频道标签 */}
                          {result.channel && result.source && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {result.channel}
                            </span>
                          )}
                          
                          {/* 发布时间 */}
                          <span className="flex items-center">
                            <svg className="w-3 h-3 mr-1 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                            {formatRelativeTime(result.publish_at)}
                          </span>
                          
                          {/* 阅读量（模拟数据） */}
                          {Math.random() > 0.5 && (
                            <span className="flex items-center">
                              <svg className="w-3 h-3 mr-1 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                <path fillRule="evenodd" d="M10 18C5.373 18 1.636 14.263 1.636 9.636c0-1.318.31-2.56.862-3.66C3.74 3.85 6.608 2 10 2s6.26 1.85 7.502 3.976c.551 1.1.862 2.342.862 3.66C18.364 14.263 14.627 18 10 18zM10 16c3.314 0 6-2.686 6-6s-2.686-6-6-6-6 2.686-6 6 2.686 6 6 6z" clipRule="evenodd" />
                              </svg>
                              {formatNumber(Math.floor(Math.random() * 5000 + 100))}阅读
                            </span>
                          )}
                          
                          {/* 评论数（模拟数据） */}
                          {Math.random() > 0.7 && (
                            <span className="flex items-center">
                              <svg className="w-3 h-3 mr-1 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                              </svg>
                              {Math.floor(Math.random() * 50 + 1)}评论
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}

                {/* 分页 */}
                {total > pageSize && (
                  <div className="flex justify-center mt-8">
                    <nav className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page <= 1}
                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        上一页
                      </button>
                      <span className="px-3 py-2 text-sm text-gray-700">
                        第 {page} 页，共 {Math.ceil(total / pageSize)} 页
                      </span>
                      <button
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page >= Math.ceil(total / pageSize)}
                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        下一页
                      </button>
                    </nav>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 侧边栏 */}
          <div className="space-y-6">
            {/* 热搜榜 */}
            <TrendingSearches
              onSearchClick={handleSearchClick}
              timeWindow="1h"
              limit={10}
            />

            {/* 相关搜索 */}
            {query && relatedSearches.length > 0 && (
              <RelatedSearches
                query={query}
                relatedSearches={relatedSearches}
                onSearchClick={handleSearchClick}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}