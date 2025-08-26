"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { fetchFeed } from "@/lib/feed";
import { track } from "@/lib/track";
import { FeedItem } from "@/types/feed";
import Navigation from "@/components/Navigation";

export default function FeedPage(){
  const searchParams = useSearchParams();
  const router = useRouter();
  const searchQuery = searchParams.get('search');
  const [items, setItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<string|undefined>();
  const [loading, setLoading] = useState(true); // 初始状态设为 true，表示正在加载
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState<string>('final_score');
  const [isInitialized, setIsInitialized] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  // 处理文章点击
  const handleItemClick = useCallback(async (item: FeedItem) => {
    // 发送点击跟踪
    track("click", [item.article_id]);
    
    try {
      // 先尝试获取实际的内容ID
      const response = await fetch(`/api/feed-to-content/${item.article_id}`);
      
      if (response.ok) {
        const mapping = await response.json();
        // 使用映射后的真实ID和URL
        router.push(mapping.url);
      } else {
        // 如果映射失败，回退到原来的逻辑
        console.warn(`Mapping failed for ${item.article_id}, using fallback navigation`);
        
        // 根据channel确定路由路径
        let path = '';
        if (item.channel === 'ai-news' || item.channel === 'news' || item.channel === 'tech' || item.channel === 'recommend') {
          // 大部分内容都导航到新闻页面
          path = `/news/${item.article_id}`;
        } else if (item.channel === 'ai-tools' || item.channel === 'tools') {
          path = `/tools/${item.article_id}`;
        } else if (item.channel === 'ai-tutorials' || item.channel === 'tutorials') {
          path = `/tutorials/${item.article_id}`;
        } else {
          // 默认导航到新闻页面
          path = `/news/${item.article_id}`;
        }
        
        router.push(path);
      }
    } catch (error) {
      console.error('Error mapping feed article ID:', error);
      // 发生错误时回退到原来的逻辑
      const path = `/news/${item.article_id}`;
      router.push(path);
    }
  }, [router]);

  const load = useCallback(async (isRefresh = false) => {
    // 如果不是刷新且没有更多数据，直接返回
    if (!isRefresh && !hasMore) return;
    
    // 如果正在加载且不是刷新，避免重复请求
    if (loading && !isRefresh) return;
    
    setLoading(true);
    try {
      const currentCursor = isRefresh ? undefined : cursor;
      const {items: newItems, next_cursor} = await fetchFeed(currentCursor, sortBy);
      if (newItems.length === 0) {
        setHasMore(false);
      } else {
        if (isRefresh) {
          setItems(newItems);
          setHasMore(true);
        } else {
          setItems(prev => [...prev, ...newItems]);
        }
        setCursor(next_cursor);
      }
    } catch (error) {
      console.error('Failed to load feed:', error);
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, hasMore, sortBy]);

  useEffect(() => {
    // 初始加载
    if (!isInitialized) {
      load(true);
      setIsInitialized(true);
    }
  }, []); 

  // 当排序方式改变时，重新加载数据
  useEffect(() => {
    if (isInitialized) {
      // 清空数据并重新加载
      setItems([]);
      setCursor(undefined);
      setHasMore(true);
      load(true);
    }
  }, [sortBy, isInitialized]);

  // 处理排序方式改变
  const handleSortChange = (newSort: string) => {
    if (newSort !== sortBy) {
      setSortBy(newSort);
    }
  };

  useEffect(() => {
    if (!sentinel.current || !hasMore) return;
    
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loading && hasMore) {
          load();
        }
      },
      { rootMargin: "800px" }
    );
    
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, [load, hasMore]); // 依赖 load 函数和 hasMore 状态

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      {/* Header */}
      <header className="bg-white shadow-sm border-b pt-16">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {searchQuery ? `搜索结果: "${searchQuery}"` : '智能推荐'}
              </h1>
              <p className="text-gray-600 mt-1">
                {searchQuery ? '基于您的搜索关键词的相关内容' : '基于OpenSearch的个性化内容推荐'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* 排序选择器 */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">排序:</span>
                <select 
                  value={sortBy} 
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="final_score">🎯 智能推荐</option>
                  <option value="popularity">🔥 24小时热门</option>
                  <option value="hot">⚡ 最新热点</option>
                  <option value="ctr">👆 高点击率</option>
                </select>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  实时推荐
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Loading State */}
        {items.length === 0 && loading && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
            <p className="text-gray-600">正在为您智能推荐内容...</p>
          </div>
        )}

        {/* Feed Items */}
        <div className="space-y-6">
          {items.map((item, index) => (
            <article 
              key={`${sortBy}-${item.id}-${index}`} 
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer active:scale-[0.99]"
              onClick={() => handleItemClick(item)}
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                    {index + 1}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {item.channel || 'ai-news'}
                    </span>
                    {item.publish_time && (
                      <span className="text-sm text-gray-500">
                        {new Date(item.publish_time).toLocaleDateString('zh-CN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    )}
                  </div>
                  
                  <h2 className="text-xl font-semibold text-gray-900 mb-3 line-clamp-2">
                    {item.title}
                  </h2>
                  
                  <p className="text-gray-600 leading-relaxed mb-4 line-clamp-3">
                    {(item.body || "").slice(0, 200)}...
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      {sortBy === 'popularity' && (
                        <span>🔥 24h热度: {item.pop_24h?.toFixed(1) || '0.0'}</span>
                      )}
                      {sortBy === 'hot' && (
                        <span>⚡ 1h热度: {item.pop_1h?.toFixed(1) || '0.0'}</span>
                      )}
                      {sortBy === 'ctr' && (
                        <span>👆 24h点击率: {item.ctr_24h?.toFixed(1) || '0.0'}%</span>
                      )}
                      {sortBy === 'final_score' && (
                        <span>🎯 综合评分: {item.final_score?.toFixed(1) || '0.0'}</span>
                      )}
                      <span>📊 质量分: {item.quality_score?.toFixed(1) || '0.0'}</span>
                    </div>
                    <button className="text-blue-600 hover:text-blue-800 font-medium">
                      阅读全文 →
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Loading More */}
        <div ref={sentinel} style={{height: 1}} />
        
        {loading && hasMore && items.length > 0 && (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span className="text-gray-600">加载更多智能推荐...</span>
            </div>
          </div>
        )}

        {/* No More Content */}
        {!hasMore && items.length > 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <p className="text-lg font-medium mb-2">🎉 您已浏览完所有推荐内容</p>
              <p className="text-sm">稍后将为您推荐更多精彩内容</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && items.length === 0 && (
          <div className="text-center py-16">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">暂无推荐内容</h3>
            <p className="text-gray-600 mb-6">我们正在为您准备精彩的AI资讯和工具推荐</p>
            <button 
              onClick={() => load(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              刷新推荐
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
