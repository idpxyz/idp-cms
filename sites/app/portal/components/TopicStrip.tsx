'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  TopicStripItem, 
  getTopicArticles,
  formatTimeAgo,
  formatNumber
} from './TopicStrip.utils';
import { getSideNewsPlaceholderImage } from '@/lib/utils/placeholderImages';

export interface TopicStripProps {
  topicSlug: string;
  topicTitle: string;
  topicStatus: string;
  importanceLevel: string;
  isBreaking: boolean;
  showTags?: boolean;
  showViewMore?: boolean;
  viewMoreLink?: string;
  articleLimit?: number;
  className?: string;
}

const TopicStrip: React.FC<TopicStripProps> = ({
  topicSlug,
  topicTitle,
  topicStatus,
  importanceLevel,
  isBreaking,
  showTags = false,
  showViewMore = true,
  viewMoreLink,
  articleLimit = 12,
  className = '',
}) => {
  const [articles, setArticles] = useState<TopicStripItem[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const tagsScrollRef = useRef<HTMLDivElement>(null);

  // 🎯 获取文章数据
  useEffect(() => {
    async function fetchArticles() {
      setIsLoading(true);
      setError('');
      
      try {
        const articlesData = await getTopicArticles(
          topicSlug, 
          selectedTag || undefined, 
          articleLimit
        );
        
        setArticles(articlesData);
        
        // 提取所有可用标签
        if (showTags) {
          const allTags = new Set<string>();
          articlesData.forEach(article => {
            article.tags.forEach(tag => allTags.add(tag));
          });
          setAvailableTags(Array.from(allTags).slice(0, 10)); // 限制标签数量
        }
      } catch (err) {
        console.error(`Error loading articles for topic ${topicSlug}:`, err);
        setError('加载失败，请稍后重试');
      } finally {
        setIsLoading(false);
      }
    }

    fetchArticles();
  }, [topicSlug, selectedTag, articleLimit, showTags]);

  // 标签点击处理
  const handleTagClick = (tag: string) => {
    setSelectedTag(tag === selectedTag ? '' : tag);
  };

  // 标签滚动控制
  const scrollTags = (direction: 'left' | 'right') => {
    if (tagsScrollRef.current) {
      const scrollAmount = 200;
      const newScrollLeft = tagsScrollRef.current.scrollLeft + 
        (direction === 'right' ? scrollAmount : -scrollAmount);
      
      tagsScrollRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };

  // 获取专题状态颜色
  const getTopicStatusColor = () => {
    if (isBreaking) return 'text-red-600 bg-red-50';
    if (topicStatus === 'ongoing') return 'text-green-600 bg-green-50';
    if (topicStatus === 'upcoming') return 'text-blue-600 bg-blue-50';
    if (topicStatus === 'concluded') return 'text-gray-600 bg-gray-50';
    if (topicStatus === 'memorial') return 'text-purple-600 bg-purple-50';
    return 'text-gray-600 bg-gray-50';
  };

  // 获取重要程度图标
  const getImportanceIcon = () => {
    if (importanceLevel === 'national') return '🏛️';
    if (importanceLevel === 'major') return '⭐';
    if (importanceLevel === 'regional') return '📍';
    if (importanceLevel === 'specialized') return '🎯';
    return '📄';
  };

  // 🎯 内容检查：如果没有文章且不在加载中，不渲染专题条带
  if (!isLoading && !error && articles.length === 0) {
    return null;
  }

  return (
    <div className={`bg-white ${className}`}>
      {/* 专题标题头部 */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          {/* 专题图标 */}
          <div className={`w-8 h-8 ${isBreaking ? 'bg-red-500' : 'bg-blue-500'} rounded-full flex items-center justify-center ${isBreaking ? 'animate-pulse' : ''}`}>
            <span className="text-white text-sm">
              {isBreaking ? '🚨' : getImportanceIcon()}
            </span>
          </div>
          
          {/* 专题标题 */}
          <div className="flex items-center space-x-2">
            <h2 className="section-title">
              {topicTitle}
            </h2>
            
            {/* 状态标识 */}
            <div className="flex items-center space-x-1">
              {isBreaking && (
                <span className="bg-red-500 text-white px-2 py-1 text-xs rounded font-bold animate-pulse">
                  突发
                </span>
              )}
              
              <span className={`px-2 py-1 text-xs rounded font-medium ${getTopicStatusColor()}`}>
                {topicStatus === 'ongoing' ? '进行中' :
                 topicStatus === 'upcoming' ? '即将开始' :
                 topicStatus === 'concluded' ? '已结束' :
                 topicStatus === 'memorial' ? '纪念回顾' : 
                 topicStatus}
              </span>
              
              {importanceLevel === 'national' && (
                <span className="bg-red-600 text-white px-2 py-1 text-xs rounded font-bold">
                  国家级
                </span>
              )}
            </div>
          </div>
          
          {/* 更新时间 */}
          <span className="news-meta">
            {isBreaking ? '实时更新' : '定期更新'}
          </span>
        </div>

        {/* 查看更多按钮 */}
        {showViewMore && (
          <Link
            href={viewMoreLink || `/portal/topic/${topicSlug}`}
            className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 transition-colors"
          >
            <span className="button-text">查看专题</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}
      </div>

      {/* 标签过滤 */}
      {showTags && availableTags.length > 0 && (
        <div className="relative mb-4">
          {/* 左滚动按钮 */}
          <button
            onClick={() => scrollTags('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center hover:bg-white transition-colors"
            aria-label="向左滚动标签"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* 标签滚动容器 */}
          <div
            ref={tagsScrollRef}
            className="flex space-x-2 overflow-x-auto scrollbar-hide px-10 py-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {/* 全部标签 */}
            <button
              onClick={() => handleTagClick('')}
              className={`flex-shrink-0 px-3 py-1 rounded-full button-text transition-all ${
                selectedTag === ''
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              全部
            </button>

            {/* 具体标签 */}
            {availableTags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className={`flex-shrink-0 px-3 py-1 rounded-full button-text transition-all ${
                  selectedTag === tag
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>

          {/* 右滚动按钮 */}
          <button
            onClick={() => scrollTags('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center hover:bg-white transition-colors"
            aria-label="向右滚动标签"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* 文章网格 */}
      <div className="space-y-4">
        {/* 加载状态 */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(articleLimit)].map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="bg-gray-200 aspect-video rounded-lg mb-3"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 错误状态 */}
        {error && (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-2">{error}</div>
            <button
              onClick={() => {
                setError('');
                // 触发重新加载
                setSelectedTag(selectedTag);
              }}
              className="text-blue-600 hover:text-blue-700 button-text"
            >
              重试
            </button>
          </div>
        )}

        {/* 文章列表 - 响应式网格 */}
        {!isLoading && !error && articles.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
            {articles.map((article, index) => (
              <Link
                key={article.id}
                href={`/portal/article/${article.slug}`}
                className="group block bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200"
              >
                {/* 文章图片 */}
                <div className="relative aspect-video bg-gray-200 overflow-hidden">
                  <Image
                    src={article.image_url || getSideNewsPlaceholderImage(article)}
                    alt={article.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-200"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    priority={false}
                    fetchPriority="auto"
                    loading="lazy"
                  />

                  {/* 标签叠加 */}
                  <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                    {/* 突发新闻标签 */}
                    {article.is_breaking && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded font-bold">
                        突发
                      </span>
                    )}
                    
                    {/* 专题重要度标签 */}
                    {article.topic_importance !== undefined && article.topic_importance >= 80 && (
                      <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded font-bold">
                        重点
                      </span>
                    )}
                    
                    {/* 直播标签 */}
                    {article.is_live && (
                      <span className="bg-red-600 text-white text-xs px-2 py-1 rounded font-bold">
                        直播
                      </span>
                    )}
                  </div>

                  {/* 专题重要度指示器 */}
                  {article.topic_importance !== undefined && (
                    <div className="absolute top-2 right-2">
                      <div className={`w-2 h-2 rounded-full ${
                        article.topic_importance >= 90 ? 'bg-red-500' :
                        article.topic_importance >= 70 ? 'bg-orange-500' :
                        article.topic_importance >= 50 ? 'bg-yellow-500' : 'bg-gray-400'
                      }`}></div>
                    </div>
                  )}
                </div>

                {/* 文章内容 */}
                <div className="p-3">
                  {/* 标题 */}
                  <h3 className="news-title-small line-clamp-2 group-hover:text-blue-600 transition-colors mb-2">
                    {article.title}
                  </h3>

                  {/* 简介 */}
                  {article.excerpt && (
                    <p className="news-excerpt line-clamp-2 mb-2 hidden sm:block">
                      {article.excerpt}
                    </p>
                  )}

                  {/* 元信息 */}
                  <div className="flex items-center justify-between news-meta-small">
                    <div className="flex items-center space-x-2">
                      <span className="truncate">{article.source}</span>
                      <span className="hidden md:inline">•</span>
                      <span className="hidden md:inline">{formatTimeAgo(article.publish_time)}</span>
                    </div>
                    
                    {/* 专题相关度评分 */}
                    {article.topic_importance !== undefined && (
                      <div className="flex items-center space-x-1">
                        <span className="text-xs text-gray-500">相关度</span>
                        <span className={`text-xs font-medium ${
                          article.topic_importance >= 80 ? 'text-red-600' :
                          article.topic_importance >= 60 ? 'text-orange-600' : 'text-gray-600'
                        }`}>
                          {article.topic_importance}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 专题标签 */}
                  {showTags && article.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {article.tags.slice(0, 3).map((tag, tagIndex) => (
                        <span 
                          key={tagIndex}
                          className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* 无数据状态 */}
        {!isLoading && !error && articles.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="mb-2">暂无相关文章</div>
            <div className="news-meta">
              {selectedTag ? '尝试选择其他标签' : '专题内容正在准备中'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopicStrip;
