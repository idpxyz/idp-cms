"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { formatDateShort } from "@/lib/utils/date";
// Removed api-url dependency - using relative paths instead
import { trackSearch, trackSearchDwell } from "@/lib/tracking/analytics";
import SmartSearchBox from "@/components/search/SmartSearchBox";
import SearchFilters, { SearchFilters as FilterType } from "@/components/search/SearchFilters";
import RelatedSearches, { generateRelatedSearches, RelatedSearch } from "@/components/search/RelatedSearches";
import TrendingSearches from "@/components/search/TrendingSearches";
import { useSearchHistory } from "@/lib/hooks/useSearchHistory";
import SearchParamsWrapper from "@/components/common/SearchParamsWrapper";

// 强制动态渲染，禁用静态生成
export const dynamic = 'force-dynamic';

interface SearchResult {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  image_url: string | null;
  source?: string | null;
  publish_at: string;
  url: string;
  channel?:
    | string
    | {
        slug?: string;
        name?: string;
        id?: string | number;
      }
    | null;
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

function EnhancedSearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FilterType>({});
  const [relatedSearches, setRelatedSearches] = useState<RelatedSearch[]>([]);
  
  const { addToHistory } = useSearchHistory();

  // 从URL参数初始化状态
  useEffect(() => {
    const q = searchParams?.get('q') || '';
    const p = parseInt(searchParams?.get('page') || '1');
    const channel = searchParams?.get('channel') || undefined;
    const region = searchParams?.get('region') || undefined;
    const since = searchParams?.get('since') || undefined;
    const orderBy = searchParams?.get('orderBy') as FilterType['orderBy'] || undefined;
    
    setQuery(q);
    setPage(p);
    setFilters({ channel, region, since, orderBy });
    
    if (q) {
      performSearch(q, p, { channel, region, since, orderBy });
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
        limit: '20',
      });

      // 添加筛选参数
      if (searchFilters.channel) params.set('channel', searchFilters.channel);
      if (searchFilters.region) params.set('region', searchFilters.region);
      if (searchFilters.since) params.set('since', searchFilters.since);
      if (searchFilters.orderBy) params.set('order', searchFilters.orderBy);

      const response = await fetch(`/api/search?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`搜索服务错误: ${response.status}`);
      }

      const data: SearchResponse = await response.json();

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
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : '搜索服务暂时不可用');
      setResults([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [addToHistory]);

  // 处理搜索提交
  const handleSearch = useCallback((newQuery: string) => {
    const params = new URLSearchParams();
    params.set('q', newQuery);
    
    // 保留当前筛选条件
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    router.push(`/portal/search/enhanced?${params.toString()}`);
  }, [router, filters]);

  // 处理筛选变化
  const handleFiltersChange = useCallback((newFilters: FilterType) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    router.push(`/portal/search/enhanced?${params.toString()}`);
  }, [router, query]);

  // 处理分页
  const handlePageChange = useCallback((newPage: number) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('page', newPage.toString());
    router.push(`/portal/search/enhanced?${params.toString()}`);
  }, [router, searchParams]);

  // 异步生成相关搜索
  useEffect(() => {
    if (!query) {
      setRelatedSearches([]);
      return;
    }
    
    const loadRelatedSearches = async () => {
      try {
        const related = await generateRelatedSearches(query, 6);
        setRelatedSearches(related);
      } catch (error) {
        console.warn('加载相关搜索失败:', error);
        setRelatedSearches([]);
      }
    };
    
    loadRelatedSearches();
  }, [query]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 搜索头部 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1 max-w-2xl">
              <SmartSearchBox
                placeholder="搜索新闻、话题..."
                onSearch={handleSearch}
                autoFocus={false}
              />
            </div>
            <div className="text-sm text-gray-500">
              {total > 0 && `找到 ${total} 条结果`}
            </div>
          </div>
        </div>
      </div>

      {/* 筛选条件 */}
      {query && (
        <SearchFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
      )}

      <div className="max-w-6xl mx-auto px-4 py-6">
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
                <div className="text-red-500 mb-4">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">搜索出现问题</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <button
                  onClick={() => query && performSearch(query, page, filters)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  重试
                </button>
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
                            href={result.slug ? `/portal/article/${result.slug}` : result.url}
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
                          {(result.source || result.channel) && (
                            <span className="flex items-center">
                              <svg className="w-3 h-3 mr-1 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                              </svg>
                              {result.source ||
                                (typeof result.channel === 'string'
                                  ? result.channel
                                  : (result.channel?.name || result.channel?.slug || String(result.channel?.id || ''))) ||
                                '本站'}
                            </span>
                          )}
                          <span className="flex items-center">
                            <svg className="w-3 h-3 mr-1 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                            {formatDateShort(result.publish_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}

                {/* 分页 */}
                {total > 20 && (
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
                        第 {page} 页，共 {Math.ceil(total / 20)} 页
                      </span>
                      <button
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page >= Math.ceil(total / 20)}
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
              onSearchClick={handleSearch}
              timeWindow="1h"
              limit={10}
            />

            {/* 相关搜索 */}
            {query && relatedSearches.length > 0 && (
              <RelatedSearches
                query={query}
                relatedSearches={relatedSearches}
                onSearchClick={handleSearch}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EnhancedSearchPage() {
  return (
    <SearchParamsWrapper>
      <EnhancedSearchPageContent />
    </SearchParamsWrapper>
  );
}
