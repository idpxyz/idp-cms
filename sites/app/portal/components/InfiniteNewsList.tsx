'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { fetchFeed, fetchFeedByStrategy, getAnonymousStrategy, FeedItem } from '@/lib/api/feed';
import { endpoints } from '@/lib/config/endpoints';
import { getDefaultSite } from '@/lib/config/sites';
import { formatDate } from '@/lib/utils/date';
import Link from 'next/link';
import Image from 'next/image';

interface InfiniteNewsListProps {
  initialSize?: number;
  className?: string;
  useSmartStrategy?: boolean; // 是否使用智能策略
}

const InfiniteNewsList: React.FC<InfiniteNewsListProps> = ({
  initialSize = 20,
  className = '',
  useSmartStrategy = true
}) => {
  const [articles, setArticles] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confidenceScore, setConfidenceScore] = useState(0); // 用户置信度

  // 加载更多文章
  const loadMoreArticles = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);

    try {
      let response: any;
      
      if (useSmartStrategy) {
        // 使用智能推荐策略
        const strategy = getAnonymousStrategy(confidenceScore);
        response = await fetchFeedByStrategy(strategy.strategy, initialSize, confidenceScore);
        
        // 更新置信度
        if (response.debug?.confidence_score !== undefined) {
          setConfidenceScore(response.debug.confidence_score);
        }
      } else {
        // 使用传统推荐
        response = await fetchFeed({
          size: initialSize,
          sort: 'final_score',
          hours: 168, // 7天内的文章
          cursor: cursor || undefined,
        });
      }

      if (response.items.length === 0) {
        setHasMore(false);
      } else {
        setArticles(prev => cursor ? [...prev, ...response.items] : response.items);
        setCursor(response.next_cursor || null);
        
        // 如果返回的文章数量少于请求数量，说明没有更多了
        if (response.items.length < initialSize) {
          setHasMore(false);
        }
      }
    } catch (err) {
      console.error('加载文章失败:', err);
      setError('加载文章失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, cursor, initialSize, useSmartStrategy, confidenceScore]);

  // 初始加载
  useEffect(() => {
    if (articles.length === 0 && !loading) {
      loadMoreArticles();
    }
  }, [articles.length, loading, loadMoreArticles]);

  // 滚动监听
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop
        >= document.documentElement.offsetHeight - 1000 // 提前1000px加载
      ) {
        loadMoreArticles();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMoreArticles]);

  const renderArticleCard = (article: FeedItem, index: number) => (
    <div
      key={`${article.id}-${index}`}
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden"
    >
      <div className="flex">
        {/* 文章图片 */}
        {article.image_url && (
          <div className="w-32 h-24 flex-shrink-0">
            <Image
              src={article.image_url}
              alt={article.title}
              width={128}
              height={96}
              className="w-full h-full object-cover"
              onError={(e) => {
                // 图片加载失败时隐藏
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        )}

        {/* 文章内容 */}
        <div className="flex-1 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            {article.channel && (
              <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs">
                {article.channel.name}
              </span>
            )}
            {article.author && (
              <span>{article.author}</span>
            )}
            <span>•</span>
            <span>{formatDate(article.publish_time || article.publish_at)}</span>
            {article.is_featured && (
              <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs">
                精选
              </span>
            )}
          </div>

          <Link 
            href={article.url || `/portal/news/${article.id}`}
            className="block group"
          >
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-2 line-clamp-2">
              {article.title}
            </h3>
            
            {article.excerpt && (
              <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                {article.excerpt}
              </p>
            )}
          </Link>

          {/* 文章标签 */}
          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {article.tags.slice(0, 3).map((tag, tagIndex) => (
                <span
                  key={tagIndex}
                  className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* 文章指标 */}
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
            {article.quality_score && (
              <span>质量分: {article.quality_score.toFixed(1)}</span>
            )}
            {article.final_score && (
              <span>综合分: {article.final_score.toFixed(1)}</span>
            )}
            {article.ctr_1h !== undefined && (
              <span>点击率: {(article.ctr_1h * 100).toFixed(1)}%</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`w-full ${className}`}>
      {/* 标题 */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {useSmartStrategy ? '智能推荐' : '最新资讯'}
            </h2>
            <p className="text-gray-600">
              {useSmartStrategy 
                ? '基于您的偏好和行为智能推荐内容' 
                : '为您精选最新、最有价值的新闻资讯'
              }
            </p>
          </div>
          <Link 
            href="/portal/news"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
          >
            查看全部吗 →
          </Link>
        </div>
        
        {/* 智能策略状态指示 */}
        {useSmartStrategy && confidenceScore > 0 && (
          <div className="text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded p-2 mt-2">
            🧠 智能推荐系统 · 置信度: {confidenceScore >= 0.7 ? '高 (精准推荐)' : confidenceScore >= 0.3 ? '中 (学习中)' : '低 (探索中)'}
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          <button
            onClick={() => {
              setError(null);
              loadMoreArticles();
            }}
            className="ml-2 text-red-600 hover:text-red-800 underline"
          >
            重试
          </button>
        </div>
      )}

      {/* 文章列表 */}
      <div className="space-y-4">
        {articles.map((article, index) => renderArticleCard(article, index))}
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">加载中...</span>
          </div>
        </div>
      )}

      {/* 没有更多内容 */}
      {!hasMore && articles.length > 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>已加载全部内容</p>
        </div>
      )}

      {/* 无内容提示 */}
      {!loading && articles.length === 0 && !error && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3v3m0 0v3m0-3h3m-3 0h-3" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无新闻内容</h3>
          <p className="text-gray-500">请稍后再来查看最新资讯</p>
        </div>
      )}

      {/* 手动加载更多按钮 */}
      {hasMore && !loading && articles.length > 0 && (
        <div className="text-center mt-8">
          <button
            onClick={loadMoreArticles}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            加载更多
          </button>
        </div>
      )}
    </div>
  );
};

export default InfiniteNewsList;
