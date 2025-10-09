'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/context/AuthContext';
import { getTopStories } from './TopStoriesGrid.utils';
import { getTopStoryPlaceholderImage, getSideNewsPlaceholderImage } from '@/lib/utils/placeholderImages';
import { formatTimeForSSR } from '@/lib/utils/date';

export interface TopStoryItem {
  id: string;
  title: string;
  excerpt?: string;
  slug: string;
  image_url?: string;
  publish_time: string;
  author?: string;
  channel?: {
    id: string;
    name: string;
    slug: string;
  };
  tags?: string[];
  is_featured?: boolean;
  is_editor_pick?: boolean;
  view_count?: number;
  comment_count?: number;
  reading_time?: number; // 阅读时间（分钟）
}

export interface TopStoriesGridProps {
  items?: TopStoryItem[]; // 改为可选，支持自动获取数据模式
  title?: string;
  showViewMore?: boolean;
  viewMoreLink?: string;
  className?: string;
  // 主要新闻轮播配置
  mainNewsAutoPlay?: boolean;
  mainNewsAutoPlayInterval?: number;
  showMainNewsDots?: boolean;
  pauseOnHover?: boolean;
  // 自动获取数据配置
  autoFetch?: boolean; // 新增：是否自动获取数据
  fetchLimit?: number; // 新增：获取数据的数量
  fetchOptions?: {
    excludeClusterIds?: string[];
    hours?: number;
    diversity?: 'high' | 'med' | 'low';
  }; // 新增：获取数据的选项
}

export default function TopStoriesGrid({
  items: initialItems = [],
  title = "头条新闻",
  showViewMore = true,
  viewMoreLink = "/portal/news",
  className = "",
  // 主要新闻轮播配置
  mainNewsAutoPlay = true,
  mainNewsAutoPlayInterval = 3000,
  showMainNewsDots = true,
  pauseOnHover = true,
  // 自动获取数据配置
  autoFetch = false,
  fetchLimit = 9,
  fetchOptions = {},
}: TopStoriesGridProps) {
  
  // 客户端数据状态
  const [items, setItems] = useState<TopStoryItem[]>(initialItems);
  const [isLoading, setIsLoading] = useState(autoFetch && initialItems.length === 0); // 如果需要自动获取且没有初始数据，则显示加载状态
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();
  
  // 主要新闻轮播状态管理
  const [currentMainIndex, setCurrentMainIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 客户端数据获取逻辑
  useEffect(() => {
    if (!autoFetch) return;
    
    // 如果已经有初始数据，则不立即重新获取（除非是用户状态变化）
    if (initialItems.length > 0 && items.length > 0) {
      console.log('🔄 TopStoriesGrid: 已有数据，跳过初始获取');
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        console.log('🔄 TopStoriesGrid: 客户端获取数据中...');
        console.log(`👤 用户状态: ${isAuthenticated ? `已登录 (ID: ${user?.id})` : '未登录'}`);
        
        const data = await getTopStories(fetchLimit, {
          ...fetchOptions,
          userId: isAuthenticated && user?.id ? user.id : undefined,
        });

        console.log(`✅ TopStoriesGrid: 获取到 ${data.length} 条数据`);
        setItems(data);
      } catch (err) {
        console.error('❌ TopStoriesGrid: 数据获取失败:', err);
        setError('数据获取失败，请稍后重试');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [autoFetch, fetchLimit, isAuthenticated, user?.id, JSON.stringify(fetchOptions)]);

  // 轮播逻辑
  useEffect(() => {
    if (!mainNewsAutoPlay || isPaused || items.length <= 1) return;

    intervalRef.current = setInterval(() => {
      setCurrentMainIndex(prev => (prev + 1) % Math.min(6, items.length));
    }, mainNewsAutoPlayInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [mainNewsAutoPlay, isPaused, mainNewsAutoPlayInterval, items.length]);

  // 鼠标事件处理
  const handleMouseEnter = () => {
    if (pauseOnHover) {
      setIsPaused(true);
    }
  };

  const handleMouseLeave = () => {
    if (pauseOnHover) {
      setIsPaused(false);
    }
  };

  // 手动切换到指定轮播项
  const goToSlide = (index: number) => {
    setCurrentMainIndex(index);
  };
  
  // 使用统一的SSR安全时间格式化函数

  // 格式化数字
  const formatNumber = (num: number) => {
    if (num >= 10000) {
      return `${(num / 10000).toFixed(1)}万`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  // Loading状态
  if (isLoading) {
    return (
      <section className={`bg-white ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            <div className="lg:col-span-2">
              <div className="aspect-[16/9] w-full bg-gray-200 rounded-lg" />
              <div className="mt-3 h-5 w-3/4 bg-gray-200 rounded" />
              <div className="mt-2 h-4 w-1/2 bg-gray-100 rounded" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex space-x-3">
                  <div className="w-20 h-14 bg-gray-200 rounded" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-4/5 bg-gray-200 rounded" />
                    <div className="h-3 w-2/5 bg-gray-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Error状态
  if (error) {
    return (
      <section className={`bg-white ${className}`}>
        <div className="text-center py-8">
          <div className="text-red-500 mb-2">⚠️ {error}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="text-blue-600 hover:text-blue-800 underline"
          >
            点击重试
          </button>
        </div>
      </section>
    );
  }

  // 空数据状态 - 只有在非加载状态且确实没有数据时才显示
  if (!isLoading && items.length === 0) {
    return (
      <section className={`bg-white ${className}`}>
        <div className="text-center py-8 text-gray-500">
          <div className="mb-2">📰</div>
          <div>暂无头条新闻</div>
        </div>
      </section>
    );
  }

  // 取前9条新闻 (1条主图轮播 + 8条右侧列表)
  const gridItems = items.slice(0, 9);
  // 主要新闻（左侧大图轮播）- 全部9条都参与轮播
  const mainItems = gridItems;
  const currentMainItem = mainItems[currentMainIndex] || mainItems[0];
  // 侧边新闻（右侧列表）- 显示除当前轮播项外的其他新闻，优化数量
  const sideItems = gridItems.filter((_, index) => index !== currentMainIndex).slice(0, 6);

  return (
    <section className={`bg-white ${className}`}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="page-title">{title}</h2>
        {showViewMore && (
          <Link 
            href={viewMoreLink}
            className="text-red-600 hover:text-red-700 link-text flex items-center space-x-1 transition-colors"
          >
            <span>查看更多</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}
      </div>

      {/* 网格布局 - 科学的高度同步 */}
      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8 lg:items-stretch">
        {/* 主要新闻 - 左侧大图轮播 */}
        {currentMainItem && (
          <div className="lg:col-span-3">
            <article 
              className="group cursor-pointer relative"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <Link href={`/portal/article/${currentMainItem.slug}`} className="block">
                {/* 图片容器 - 响应式优化 */}
                <div className="relative aspect-[16/9] sm:aspect-[16/9] md:aspect-[16/9] lg:aspect-[16/9] mb-4 overflow-hidden rounded-lg bg-gray-200">
                  <Image
                    src={currentMainItem.image_url || getTopStoryPlaceholderImage(currentMainItem)}
                    alt={currentMainItem.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 1024px) 100vw, 66vw"
                    priority={false}  // 不是 LCP 元素，Hero 才是，避免不必要的预加载
                    fetchPriority="auto"
                    placeholder="blur"
                    blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMzIwJyBoZWlnaHQ9JzE4MCcgeG1sbnM9J2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJz48cmVjdCBmaWxsPSIjZWVlIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+"
                  />
                  
                  {/* 标签和编辑推荐标识 */}
                  <div className="absolute top-3 left-3 flex items-center space-x-2">
                    {currentMainItem.is_editor_pick && (
                      <span className="bg-red-500 text-white px-2 py-1 news-meta-small font-bold rounded">
                        编辑推荐
                      </span>
                    )}
                    {currentMainItem.channel && (
                      <span className="bg-black bg-opacity-60 text-white px-2 py-1 news-meta-small rounded">
                        {currentMainItem.channel.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* 文章信息 */}
                <div className="space-y-2">
                  {/* 标题 */}
                  <h3 className="news-title-medium line-clamp-2 group-hover:text-red-600 transition-colors">
                    {currentMainItem.title}
                  </h3>
                  
                  {/* 简介 - 固定两行高度避免抖动 */}
                  <div className="h-10 mb-2">
                    <p className="news-excerpt line-clamp-2">
                      {currentMainItem.excerpt || ''}
                    </p>
                  </div>

                  {/* 元信息 */}
                  <div className="flex items-center justify-between news-meta-small">
                    {/* 左侧：时间、作者、阅读时间 */}
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{formatTimeForSSR(currentMainItem.publish_time)}</span>
                      </div>
                      {currentMainItem.author && (
                        <span>作者: {currentMainItem.author}</span>
                      )}
                      {currentMainItem.reading_time && (
                        <span>{currentMainItem.reading_time}分钟阅读</span>
                      )}
                    </div>

                    {/* 右侧：统计信息 */}
                    <div className="flex items-center space-x-2">
                      {currentMainItem.view_count && (
                        <div className="flex items-center space-x-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span>{formatNumber(currentMainItem.view_count)}</span>
                        </div>
                      )}
                      {currentMainItem.comment_count && (
                        <div className="flex items-center space-x-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <span>{formatNumber(currentMainItem.comment_count)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
              
              {/* 轮播指示器 - 响应式位置优化 */}
              {showMainNewsDots && mainItems.length > 1 && (
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex space-x-2">
                  {mainItems.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToSlide(index)}
                      className={`w-2 h-2 rounded-full transition-all duration-300 border border-white/50 shadow-lg ${
                        index === currentMainIndex 
                          ? 'bg-red-500 w-6 border-red-500' 
                          : 'bg-black/40 hover:bg-black/60'
                      }`}
                      aria-label={`切换到第${index + 1}条新闻`}
                    />
                  ))}
                </div>
              )}
            </article>
          </div>
        )}

        {/* 侧边新闻列表 - 右侧（桌面）/ 下方（移动） */}
        {sideItems.length > 0 && (
          <div className="lg:col-span-2 mt-6 lg:mt-0 flex flex-col h-full">
            {/* 右侧容器 - 均匀分布新闻项 */}
            <div className="flex flex-col h-full justify-between lg:justify-start lg:space-y-4">
            {sideItems.map((item, index) => (
              <article key={item.id} className="group cursor-pointer lg:flex-1">
                <Link href={`/portal/article/${item.slug}`} className="block">
                  <div className="flex space-x-4">
                    {/* 优化后的图片 - 增大尺寸 */}
                    <div className="flex-shrink-0 w-28 h-20 sm:w-32 sm:h-22 overflow-hidden rounded-lg bg-gray-200 relative">
                      <Image
                        src={item.image_url || getSideNewsPlaceholderImage(item)}
                        alt={item.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 112px, 128px"
                        priority={false} // 不是 LCP 元素，避免不必要的预加载
                        fetchPriority="auto"
                        loading="lazy"
                        placeholder="blur"
                        blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMTI4JyBoZWlnaHQ9Jzg4JyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnPjxyZWN0IGZpbGw9IiNlZWUiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiLz48L3N2Zz4="
                      />
                    </div>

                    {/* 文章信息 */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      {/* 标题 - 优化行高和间距 */}
                      <h4 className="news-title-small line-clamp-3 group-hover:text-red-600 transition-colors mb-2 leading-snug">
                        {item.title}
                      </h4>
                      
                      {/* 元信息 */}
                      <div className="flex items-center justify-between news-meta-small mt-auto">
                        <div className="flex items-center space-x-2">
                          {item.channel && (
                            <span className="text-red-600 font-medium group-hover:text-red-700">
                              {item.channel.name}
                            </span>
                          )}
                          <span>{formatTimeForSSR(item.publish_time)}</span>
                        </div>
                        {item.view_count && (
                          <span>{formatNumber(item.view_count)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </article>
            ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}