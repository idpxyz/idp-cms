'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ChannelStripItem, 
  ChannelStripCategory, 
  getChannelCategories, 
  getChannelArticles,
  formatTimeAgo,
  formatNumber
} from './ChannelStrip.utils';

export interface ChannelStripProps {
  channelId: string;
  channelName: string;
  channelSlug: string;
  showCategories?: boolean;
  showViewMore?: boolean;
  viewMoreLink?: string;
  articleLimit?: number;
  className?: string;
}

const ChannelStrip: React.FC<ChannelStripProps> = ({
  channelId,
  channelName,
  channelSlug,
  showCategories = true,
  showViewMore = true,
  viewMoreLink,
  articleLimit = 6,
  className = '',
}) => {
  const [categories, setCategories] = useState<ChannelStripCategory[]>([]);
  const [articles, setArticles] = useState<ChannelStripItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const categoriesScrollRef = useRef<HTMLDivElement>(null);

  // 获取分类数据
  useEffect(() => {
    if (!showCategories) return;

    async function fetchCategories() {
      try {
        const categoriesData = await getChannelCategories(channelSlug);
        setCategories(categoriesData);
      } catch (err) {
        console.error(`Error loading categories for channel ${channelSlug}:`, err);
      }
    }

    fetchCategories();
  }, [channelSlug, showCategories]);

  // 获取文章数据
  useEffect(() => {
    async function fetchArticles() {
      setIsLoading(true);
      setError('');
      
      try {
        const articlesData = await getChannelArticles(
          channelSlug, 
          selectedCategory || undefined, 
          articleLimit
        );
        setArticles(articlesData);
        console.log(`Loaded ${articlesData.length} articles for ${channelSlug}`);
      } catch (err) {
        console.error(`Error loading articles for channel ${channelSlug}:`, err);
        setError('加载失败，请稍后重试');
      } finally {
        setIsLoading(false);
      }
    }

    fetchArticles();
  }, [channelSlug, selectedCategory, articleLimit]);

  // 分类点击处理
  const handleCategoryClick = (categorySlug: string) => {
    setSelectedCategory(categorySlug === selectedCategory ? '' : categorySlug);
  };

  // 分类滚动控制
  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoriesScrollRef.current) {
      const scrollAmount = 200;
      const newScrollLeft = categoriesScrollRef.current.scrollLeft + 
        (direction === 'right' ? scrollAmount : -scrollAmount);
      
      categoriesScrollRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className={`bg-white ${className}`}>
      {/* 频道标题头部 */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          {/* 频道图标/Logo */}
          <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">
              {channelName.charAt(0)}
            </span>
          </div>
          
          {/* 频道名称 */}
          <h2 className="text-xl font-bold text-gray-900">
            {channelName}
          </h2>
          
          {/* 更新时间 */}
          <span className="text-sm text-gray-500">
            实时更新
          </span>
        </div>

        {/* 查看更多按钮 */}
        {showViewMore && (
          <Link
            href={viewMoreLink || `/portal/channel/${channelSlug}`}
            className="flex items-center space-x-1 text-red-600 hover:text-red-700 transition-colors"
          >
            <span className="text-sm font-medium">查看更多</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}
      </div>

      {/* 分类 Chips 横向滚动 */}
      {showCategories && categories.length > 0 && (
        <div className="relative mb-4">
          {/* 左滚动按钮 */}
          <button
            onClick={() => scrollCategories('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center hover:bg-white transition-colors"
            aria-label="向左滚动分类"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* 分类滚动容器 */}
          <div
            ref={categoriesScrollRef}
            className="flex space-x-2 overflow-x-auto scrollbar-hide px-10 py-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {/* 全部分类 */}
            <button
              onClick={() => handleCategoryClick('')}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === ''
                  ? 'bg-red-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              全部
            </button>

            {/* 具体分类 */}
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.slug)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === category.slug
                    ? 'bg-red-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.name}
                {category.count !== undefined && (
                  <span className="ml-1 text-xs opacity-75">
                    ({formatNumber(category.count)})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* 右滚动按钮 */}
          <button
            onClick={() => scrollCategories('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center hover:bg-white transition-colors"
            aria-label="向右滚动分类"
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                setSelectedCategory(selectedCategory);
              }}
              className="text-red-600 hover:text-red-700 text-sm"
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
                className="group block bg-white rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200"
              >
                {/* 文章图片 */}
                <div className="relative aspect-video bg-gray-200 overflow-hidden">
                  {article.image_url ? (
                    <Image
                      src={article.image_url}
                      alt={article.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-200"
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-gray-300 to-gray-400 flex items-center justify-center">
                      <span className="text-gray-600 text-sm">暂无图片</span>
                    </div>
                  )}

                  {/* 突发/直播标签 */}
                  {(article.is_breaking || article.is_live) && (
                    <div className="absolute top-2 left-2">
                      {article.is_breaking && (
                        <span className="bg-red-500 text-white text-xs px-2 py-1 rounded font-bold">
                          突发
                        </span>
                      )}
                      {article.is_live && (
                        <span className="bg-red-600 text-white text-xs px-2 py-1 rounded font-bold ml-1">
                          直播
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* 文章内容 - 响应式间距 */}
                <div className="p-2 md:p-3">
                  {/* 标题 - 响应式字体 */}
                  <h3 className="font-medium text-gray-900 line-clamp-2 group-hover:text-red-600 transition-colors mb-1 md:mb-2 text-xs md:text-sm leading-4 md:leading-5">
                    {article.title}
                  </h3>

                  {/* 简介 - 在移动端隐藏以节省空间 */}
                  {article.excerpt && (
                    <p className="text-gray-600 text-xs line-clamp-2 mb-1 md:mb-2 leading-3 md:leading-4 hidden sm:block">
                      {article.excerpt}
                    </p>
                  )}

                  {/* 元信息 - 响应式显示 */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-1 md:space-x-2">
                      <span className="truncate">{article.source}</span>
                      <span className="hidden md:inline">•</span>
                      <span className="hidden md:inline">{formatTimeAgo(article.publish_time)}</span>
                    </div>
                    
                    {/* 阅读量和评论数 - 移动端简化 */}
                    {(article.view_count || article.comment_count) && (
                      <div className="flex items-center space-x-1 md:space-x-2">
                        {article.view_count && (
                          <span className="hidden md:inline">{formatNumber(article.view_count)}阅读</span>
                        )}
                        {article.comment_count && (
                          <span>{formatNumber(article.comment_count)}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* 无数据状态 */}
        {!isLoading && !error && articles.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="mb-2">暂无相关文章</div>
            <div className="text-sm">请稍后再试或选择其他分类</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChannelStrip;
