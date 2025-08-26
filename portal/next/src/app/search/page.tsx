"use client";
import { useEffect, useReducer, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Search, Filter, Clock, TrendingUp, Newspaper, Zap, BookOpen, User, ArrowRight, Sparkles, Target } from "lucide-react";
import Navigation from "@/components/Navigation";
import { fetchFeed } from "@/lib/feed";
import { aiToolsApi, aiNewsApi } from "@/lib/aiApiService";
import { FeedItem } from "@/types/feed";
import { AITool, AINews } from "@/types/ai";

// 状态管理类型定义
interface SearchState {
  results: SearchResult[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  currentPage: number;
  activeFilter: 'all' | 'tools' | 'news' | 'recommendations' | 'tutorials';
  sortBy: 'relevance' | 'date' | 'popularity';
  searchInput: string;
  searchLoading: boolean;
  isInitialized: boolean;
}

type SearchAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_LOADING_MORE'; payload: boolean }
  | { type: 'SET_RESULTS'; payload: SearchResult[] }
  | { type: 'APPEND_RESULTS'; payload: SearchResult[] }
  | { type: 'SET_HAS_MORE'; payload: boolean }
  | { type: 'SET_CURRENT_PAGE'; payload: number }
  | { type: 'SET_ACTIVE_FILTER'; payload: 'all' | 'tools' | 'news' | 'recommendations' | 'tutorials' }
  | { type: 'SET_SORT_BY'; payload: 'relevance' | 'date' | 'popularity' }
  | { type: 'SET_SEARCH_INPUT'; payload: string }
  | { type: 'SET_SEARCH_LOADING'; payload: boolean }
  | { type: 'SET_INITIALIZED'; payload: boolean }
  | { type: 'RESET_STATE' };

// 状态reducer
const searchReducer = (state: SearchState, action: SearchAction): SearchState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_LOADING_MORE':
      return { ...state, loadingMore: action.payload };
    case 'SET_RESULTS':
      return { ...state, results: action.payload };
    case 'APPEND_RESULTS':
      return { ...state, results: [...state.results, ...action.payload] };
    case 'SET_HAS_MORE':
      return { ...state, hasMore: action.payload };
    case 'SET_CURRENT_PAGE':
      return { ...state, currentPage: action.payload };
    case 'SET_ACTIVE_FILTER':
      return { ...state, activeFilter: action.payload };
    case 'SET_SORT_BY':
      return { ...state, sortBy: action.payload };
    case 'SET_SEARCH_INPUT':
      return { ...state, searchInput: action.payload };
    case 'SET_SEARCH_LOADING':
      return { ...state, searchLoading: action.payload };
    case 'SET_INITIALIZED':
      return { ...state, isInitialized: action.payload };
    case 'RESET_STATE':
      return {
        ...state,
        results: [],
        currentPage: 1,
        hasMore: true,
        activeFilter: 'all'
      };
    default:
      return state;
  }
};

interface SearchResult {
  type: 'recommendation' | 'tool' | 'news' | 'tutorial';
  id: string;
  title: string;
  description: string;
  url: string;
  score?: number;
  metadata?: any;
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  
  // 使用useReducer替代多个useState，提高性能
  const [state, dispatch] = useReducer(searchReducer, {
    results: [],
    loading: !!query,
    loadingMore: false,
    hasMore: true,
    currentPage: 1,
    activeFilter: 'all' as const,
    sortBy: 'relevance' as const,
    searchInput: query,
    searchLoading: false,
    isInitialized: false,
  });
  
  const sentinel = useRef<HTMLDivElement>(null);

  // 使用useMemo优化分类统计计算，避免重复计算
  const searchCategories = useMemo(() => [
    { id: 'all', label: '全部', icon: Search, count: state.results.length },
    { id: 'recommendations', label: '智能推荐', icon: Target, count: state.results.filter(r => r.type === 'recommendation').length },
    { id: 'tools', label: 'AI工具', icon: Zap, count: state.results.filter(r => r.type === 'tool').length },
    { id: 'news', label: 'AI资讯', icon: Newspaper, count: state.results.filter(r => r.type === 'news').length },
    { id: 'tutorials', label: '技术教程', icon: BookOpen, count: state.results.filter(r => r.type === 'tutorial').length },
  ], [state.results]);

  const performSearch = useCallback(async (page = 1, append = false, searchQuery?: string) => {
    const currentQuery = searchQuery || query;
    
    if (!currentQuery.trim()) {
      return;
    }
    
    if (page === 1) {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_RESULTS', payload: [] });
      dispatch({ type: 'SET_CURRENT_PAGE', payload: 1 });
      dispatch({ type: 'SET_HAS_MORE', payload: true });
    } else {
      dispatch({ type: 'SET_LOADING_MORE', payload: true });
    }

    try {
      const searchResults: SearchResult[] = [];
      const pageSize = 10; // 每页加载10条

      // 计算每个数据源的分页参数
      const feedPageSize = Math.ceil(pageSize * 0.4); // 智能推荐占40%
      const toolsPageSize = Math.ceil(pageSize * 0.3); // AI工具占30%
      const newsPageSize = Math.ceil(pageSize * 0.3); // AI资讯占30%

      // 并行搜索各个数据源
      const [feedResponse, toolsResponse, newsResponse] = await Promise.allSettled([
        fetchFeed(undefined, 'final_score'),
        aiToolsApi.getTools({ search: currentQuery, size: toolsPageSize * page, page: page }),
        aiNewsApi.getNews({ search: currentQuery, size: newsPageSize * page, page: page })
      ]);

      // 处理智能推荐结果（只在第一页加载）
      if (page === 1 && feedResponse.status === 'fulfilled') {
        const recommendations = feedResponse.value.items
          .filter(item => {
            const lowerQuery = currentQuery.toLowerCase();
            const titleMatch = item.title.toLowerCase().includes(lowerQuery);
            const bodyMatch = item.body?.toLowerCase().includes(lowerQuery);
            const tagsMatch = item.tags && typeof item.tags === 'string' 
              ? item.tags.toLowerCase().includes(lowerQuery) 
              : false;
            
            return titleMatch || bodyMatch || tagsMatch;
          })
          .slice(0, feedPageSize);

        recommendations.forEach(item => {
          searchResults.push({
            type: 'recommendation',
            id: item.id,
            title: item.title,
            description: item.body?.slice(0, 150) + '...' || '',
            url: `/news/${item.id}`,
            score: item.final_score,
            metadata: {
              channel: item.channel,
              publish_time: item.publish_time,
              pop_24h: item.pop_24h
            }
          });
        });
      }

      // 处理AI工具结果
      if (toolsResponse.status === 'fulfilled') {
        const tools = toolsResponse.value.results || [];
        // 只取当前页的新数据
        const startIndex = toolsPageSize * (page - 1);
        const endIndex = toolsPageSize * page;
        const pageTools = tools.slice(startIndex, endIndex);
        
        pageTools.forEach(tool => {
          // 检查是否已存在，避免重复
          const exists = (append ? state.results : []).some((r: SearchResult) => r.type === 'tool' && r.id === tool.id.toString());
          if (!exists) {
            searchResults.push({
              type: 'tool',
              id: tool.id.toString(),
              title: tool.title,
              description: tool.description,
              url: tool.tool_url,
              metadata: {
                category: tool.category,
                pricing: tool.pricing,
                rating: tool.rating
              }
            });
          }
        });
      }

      // 处理AI新闻结果
      if (newsResponse.status === 'fulfilled') {
        const news = newsResponse.value.results || [];
        // 只取当前页的新数据
        const startIndex = newsPageSize * (page - 1);
        const endIndex = newsPageSize * page;
        const pageNews = news.slice(startIndex, endIndex);
        
        pageNews.forEach(article => {
          // 检查是否已存在，避免重复
          const exists = (append ? state.results : []).some((r: SearchResult) => r.type === 'news' && r.id === article.id.toString());
          if (!exists) {
            searchResults.push({
              type: 'news',
              id: article.id.toString(),
              title: article.title,
              description: article.introduction,
              url: `/news/${article.id}`,
              metadata: {
                source: article.source,
                publish_time: article.last_published_at,
                read_count: article.read_count
              }
            });
          }
        });
      }

      // 根据相关性排序
      searchResults.sort((a, b) => {
        const aRelevance = calculateRelevance(a, query);
        const bRelevance = calculateRelevance(b, query);
        return bRelevance - aRelevance;
      });

      // 设置结果
      if (append && page > 1) {
        dispatch({ type: 'APPEND_RESULTS', payload: searchResults });
      } else {
        dispatch({ type: 'SET_RESULTS', payload: searchResults });
      }

      // 检查是否还有更多数据
      dispatch({ type: 'SET_HAS_MORE', payload: searchResults.length >= 8 }); // 如果返回的结果少于8条，认为没有更多数据
      dispatch({ type: 'SET_CURRENT_PAGE', payload: page });
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_LOADING_MORE', payload: false });
    }
  }, [query]);

  const calculateRelevance = (result: SearchResult, searchQuery: string): number => {
    const lowerQuery = searchQuery.toLowerCase();
    const lowerTitle = result.title.toLowerCase();
    const lowerDesc = result.description.toLowerCase();
    
    let score = 0;
    
    // 标题匹配权重更高
    if (lowerTitle.includes(lowerQuery)) score += 10;
    if (lowerTitle === lowerQuery) score += 20;
    
    // 描述匹配
    if (lowerDesc.includes(lowerQuery)) score += 5;
    
    // 类型权重（智能推荐优先）
    if (result.type === 'recommendation') score += 3;
    else if (result.type === 'news') score += 2;
    else if (result.type === 'tool') score += 1;
    
    // 结果自身的评分
    if (result.score) score += result.score * 0.1;
    
    return score;
  };

  const loadMore = useCallback(() => {
    if (!state.loadingMore && state.hasMore && query) {
      performSearch(state.currentPage + 1, true, query);
    }
  }, [state.loadingMore, state.hasMore, state.currentPage, query, performSearch]);

  useEffect(() => {
    if (query && !state.isInitialized) {
      // 初始化时，如果有URL查询参数，执行搜索
      dispatch({ type: 'SET_SEARCH_INPUT', payload: query });
      dispatch({ type: 'RESET_STATE' });
      performSearch(1, false, query);
      dispatch({ type: 'SET_INITIALIZED', payload: true });
    } else if (!query && !state.isInitialized) {
      // 如果没有查询参数，初始化状态但不执行搜索
      dispatch({ type: 'SET_INITIALIZED', payload: true });
    }
    // 移除对 state.searchInput 的依赖，避免用户输入时自动搜索
  }, [query, state.isInitialized, performSearch]);

  // 监听浏览器前进/后退按钮
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const newQuery = urlParams.get('q') || '';
      if (newQuery !== query) {
        dispatch({ type: 'SET_SEARCH_INPUT', payload: newQuery });
        dispatch({ type: 'RESET_STATE' });
        if (newQuery) {
          performSearch(1, false, newQuery);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [query, performSearch]);

  // 无限滚动监听
  useEffect(() => {
    if (!sentinel.current || !state.hasMore) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !state.loading && !state.loadingMore && state.hasMore) {
          loadMore();
        }
      },
      { rootMargin: '300px' }
    );
    
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [loadMore, state.loading, state.loadingMore, state.hasMore]);

  // 当筛选或排序改变时，重新搜索（只在有查询参数时）
  useEffect(() => {
    if (query && state.isInitialized) {
      dispatch({ type: 'SET_CURRENT_PAGE', payload: 1 });
      dispatch({ type: 'SET_HAS_MORE', payload: true });
      performSearch(1, false, query);
    }
  }, [state.activeFilter, state.sortBy, query, performSearch, state.isInitialized]);

  const handleNewSearch = (newQuery: string) => {
    if (!newQuery.trim()) return;
    
    // 使用 history pushState 而不是 window.location.href，避免页面刷新
    const newUrl = `/search?q=${encodeURIComponent(newQuery)}`;
    window.history.pushState(null, '', newUrl);
    
    // 更新查询状态
    dispatch({ type: 'SET_SEARCH_INPUT', payload: newQuery });
    
    // 重置搜索状态
    dispatch({ type: 'RESET_STATE' });
    
    // 直接调用现有的 performSearch 函数，避免重复代码
    performSearch(1, false, newQuery);
  };

  // 处理搜索输入变化，只更新状态，不自动搜索
  const handleSearchInputChange = (value: string) => {
    dispatch({ type: 'SET_SEARCH_INPUT', payload: value });
    
    // 如果输入为空，清空结果
    if (!value.trim()) {
      dispatch({ type: 'SET_RESULTS', payload: [] });
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleNewSearch(state.searchInput);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNewSearch(state.searchInput);
    }
  };

  const filteredResults = state.results.filter((result: SearchResult) => {
    if (state.activeFilter === 'all') return true;
    if (state.activeFilter === 'recommendations') return result.type === 'recommendation';
    if (state.activeFilter === 'tools') return result.type === 'tool';
    if (state.activeFilter === 'news') return result.type === 'news';
    if (state.activeFilter === 'tutorials') return result.type === 'tutorial';
    return true;
  });

  const sortedResults = [...filteredResults].sort((a, b) => {
    if (state.sortBy === 'relevance') {
      return calculateRelevance(b, query) - calculateRelevance(a, query);
    } else if (state.sortBy === 'date') {
      const aDate = new Date(a.metadata?.publish_time || a.metadata?.last_published_at || '1970-01-01');
      const bDate = new Date(b.metadata?.publish_time || b.metadata?.last_published_at || '1970-01-01');
      return bDate.getTime() - aDate.getTime();
    } else if (state.sortBy === 'popularity') {
      const aPopularity = a.metadata?.pop_24h || a.metadata?.read_count || a.metadata?.rating || 0;
      const bPopularity = b.metadata?.pop_24h || b.metadata?.read_count || b.metadata?.rating || 0;
      return bPopularity - aPopularity;
    }
    return 0;
  });

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'tool') {
      window.open(result.url, '_blank');
    } else {
      window.location.href = result.url;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Search Header */}
      <header className="bg-white shadow-sm border-b pt-16">
        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="mb-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={state.searchInput}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="搜索AI工具、资讯、技术..."
                  className="w-full pl-10 pr-6 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={state.searchLoading}
                />
              </div>
              <button 
                type="submit"
                disabled={state.searchLoading || !state.searchInput.trim()}
                className="btn-primary px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {state.searchLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>搜索中...</span>
                  </>
                ) : (
                  <span>搜索</span>
                )}
              </button>
            </div>
          </form>

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {query ? '搜索结果' : '搜索'}
              </h1>
              <p className="text-gray-600 mt-1">
                {query ? `为 "${query}" 找到 ${sortedResults.length} 个结果` : '输入关键词开始搜索AI工具、资讯、技术教程'}
              </p>
            </div>
            
            {/* Sort Options */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">排序:</span>
                <select 
                  value={state.sortBy} 
                  onChange={(e) => dispatch({ type: 'SET_SORT_BY', payload: e.target.value as any })}
                  className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="relevance">相关性</option>
                  <option value="date">时间</option>
                  <option value="popularity">热度</option>
                </select>
              </div>
            </div>
          </div>

          {/* Category Filters - 只在有查询时显示 */}
          {query && (
            <div className="flex items-center space-x-4 overflow-x-auto pb-2">
              {searchCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => dispatch({ type: 'SET_ACTIVE_FILTER', payload: category.id as any })}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                    state.activeFilter === category.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <category.icon className="w-4 h-4" />
                  <span className="font-medium">{category.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    state.activeFilter === category.id ? 'bg-blue-500' : 'bg-gray-300'
                  }`}>
                    {category.count}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Search Results */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {state.loading ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
            <p className="text-gray-600">正在搜索相关内容...</p>
          </div>
        ) : sortedResults.length > 0 ? (
          <>
            <div className="space-y-6">
              {sortedResults.map((result, index) => (
                <SearchResultCard 
                  key={`${result.type}-${result.id}-${index}`}
                  result={result} 
                  index={index}
                  query={query}
                  onClick={() => handleResultClick(result)}
                />
              ))}
            </div>

            {/* 无限滚动加载指示器 */}
            <div ref={sentinel} className="h-1" />
            
            {state.loadingMore && (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span className="text-gray-600">加载更多搜索结果...</span>
                </div>
              </div>
            )}

            {!state.hasMore && sortedResults.length > 10 && (
              <div className="text-center py-8">
                <div className="text-gray-500">
                  <p className="text-lg font-medium mb-2">🎉 所有搜索结果已加载完毕</p>
                  <p className="text-sm">共找到 {sortedResults.length} 个相关结果</p>
                </div>
              </div>
            )}
          </>
        ) : query ? (
          <div className="text-center py-16">
            <div className="text-gray-400 mb-4">
              <Search className="w-16 h-16 mx-auto mb-4" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">未找到相关结果</h3>
            <p className="text-gray-600 mb-6">
              尝试使用不同的关键词或浏览我们的推荐内容
            </p>
            <div className="flex justify-center space-x-4">
              <button 
                onClick={() => window.location.href = '/feed'}
                className="btn-primary px-6 py-3"
              >
                浏览智能推荐
              </button>
              <button 
                onClick={() => window.location.href = '/tools'}
                className="btn-secondary px-6 py-3"
              >
                浏览AI工具
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-gray-400 mb-4">
              <Search className="w-16 h-16 mx-auto mb-4" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">请输入搜索关键词</h3>
            <p className="text-gray-600 mb-6">
              在上方搜索框中输入您想找的内容
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

// 搜索结果卡片组件
const SearchResultCard = ({ 
  result, 
  index, 
  query, 
  onClick 
}: { 
  result: SearchResult; 
  index: number; 
  query: string;
  onClick: () => void;
}) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'recommendation': return <Target className="w-5 h-5 text-blue-600" />;
      case 'tool': return <Zap className="w-5 h-5 text-purple-600" />;
      case 'news': return <Newspaper className="w-5 h-5 text-green-600" />;
      case 'tutorial': return <BookOpen className="w-5 h-5 text-orange-600" />;
      default: return <Search className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'recommendation': return '智能推荐';
      case 'tool': return 'AI工具';
      case 'news': return 'AI资讯';
      case 'tutorial': return '技术教程';
      default: return '其他';
    }
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? 
        <mark key={i} className="bg-yellow-200 font-medium">{part}</mark> : 
        part
    );
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0 mt-1">
          {getTypeIcon(result.type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              {getTypeName(result.type)}
            </span>
            {result.metadata?.channel && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {result.metadata.channel}
              </span>
            )}
            {result.metadata?.pricing && (
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                result.metadata.pricing === 'free' ? 'bg-green-100 text-green-800' :
                result.metadata.pricing === 'freemium' ? 'bg-blue-100 text-blue-800' :
                'bg-orange-100 text-orange-800'
              }`}>
                {result.metadata.pricing === 'free' ? '免费' : 
                 result.metadata.pricing === 'freemium' ? '免费版' : 
                 '付费'}
              </span>
            )}
          </div>
          
          <h3 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
            {highlightText(result.title, query)}
          </h3>
          
          <p className="text-gray-600 leading-relaxed mb-4">
            {highlightText(result.description, query)}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              {result.metadata?.publish_time && (
                <span className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  {new Date(result.metadata.publish_time).toLocaleDateString('zh-CN')}
                </span>
              )}
              {result.score && (
                <span className="flex items-center">
                  <Sparkles className="w-4 h-4 mr-1" />
                  评分 {result.score.toFixed(1)}
                </span>
              )}
              {result.metadata?.pop_24h && (
                <span className="flex items-center">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  热度 {result.metadata.pop_24h.toFixed(1)}
                </span>
              )}
              {result.metadata?.read_count && (
                <span className="flex items-center">
                  <User className="w-4 h-4 mr-1" />
                  {result.metadata.read_count.toLocaleString()} 阅读
                </span>
              )}
            </div>
            <div className="flex items-center text-blue-600 text-sm font-medium group-hover:text-blue-700">
              <span>{result.type === 'tool' ? '访问工具' : '查看详情'}</span>
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
};
