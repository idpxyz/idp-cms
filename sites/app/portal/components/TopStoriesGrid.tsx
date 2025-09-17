'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';

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
  items: TopStoryItem[];
  title?: string;
  showViewMore?: boolean;
  viewMoreLink?: string;
  className?: string;
  // 主要新闻轮播配置
  mainNewsAutoPlay?: boolean;
  mainNewsAutoPlayInterval?: number;
  showMainNewsDots?: boolean;
  pauseOnHover?: boolean;
}

export default function TopStoriesGrid({
  items = [],
  title = "头条新闻",
  showViewMore = true,
  viewMoreLink = "/portal/news",
  className = "",
  // 主要新闻轮播配置
  mainNewsAutoPlay = true,
  mainNewsAutoPlayInterval = 3000,
  showMainNewsDots = true,
  pauseOnHover = true,
}: TopStoriesGridProps) {
  
  // 主要新闻轮播状态管理
  const [currentMainIndex, setCurrentMainIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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
  
  // 格式化时间
  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return `${diffInMinutes}分钟前`;
    } else if (diffInHours < 24) {
      return `${diffInHours}小时前`;
    } else {
      return date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  // 格式化数字
  const formatNumber = (num: number) => {
    if (num >= 10000) {
      return `${(num / 10000).toFixed(1)}万`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  if (items.length === 0) {
    return null;
  }

  // 取前9条新闻 (1条主图轮播 + 8条右侧列表)
  const gridItems = items.slice(0, 9);
  // 主要新闻（左侧大图轮播）- 全部9条都参与轮播
  const mainItems = gridItems;
  const currentMainItem = mainItems[currentMainIndex] || mainItems[0];
  // 侧边新闻（右侧列表）- 显示除当前轮播项外的其他新闻
  const sideItems = gridItems.filter((_, index) => index !== currentMainIndex).slice(0, 8);

  return (
    <section className={`bg-white ${className}`}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        {showViewMore && (
          <Link 
            href={viewMoreLink}
            className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center space-x-1 transition-colors"
          >
            <span>查看更多</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}
      </div>

      {/* 网格布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* 主要新闻 - 左侧大图轮播 */}
        {currentMainItem && (
          <div className="lg:col-span-2">
            <article 
              className="group cursor-pointer relative"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <Link href={`/portal/article/${currentMainItem.slug}`} className="block">
                {/* 图片容器 */}
                <div className="relative aspect-[16/9] mb-4 overflow-hidden rounded-lg bg-gray-200">
                  {currentMainItem.image_url ? (
                    <Image
                      src={currentMainItem.image_url}
                      alt={currentMainItem.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 1024px) 100vw, 66vw"
                      priority
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                      <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  
                  {/* 标签和编辑推荐标识 */}
                  <div className="absolute top-3 left-3 flex items-center space-x-2">
                    {currentMainItem.is_editor_pick && (
                      <span className="bg-red-500 text-white px-2 py-1 text-xs font-bold rounded">
                        编辑推荐
                      </span>
                    )}
                    {currentMainItem.channel && (
                      <span className="bg-black bg-opacity-60 text-white px-2 py-1 text-xs rounded">
                        {currentMainItem.channel.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* 文章信息 */}
                <div className="space-y-2">
                  {/* 标题 */}
                  <h3 className="text-xl font-bold text-gray-900 line-clamp-2 group-hover:text-red-600 transition-colors">
                    {currentMainItem.title}
                  </h3>
                  
                  {/* 简介 - 固定两行高度避免抖动 */}
                  <div className="h-10 mb-2">
                    <p className="text-gray-600 line-clamp-2 text-sm leading-5">
                      {currentMainItem.excerpt || ''}
                    </p>
                  </div>

                  {/* 元信息 */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    {/* 左侧：时间、作者、阅读时间 */}
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{formatTime(currentMainItem.publish_time)}</span>
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
              
              {/* 轮播指示器 - 放在图片区域内，不会遮挡文字 */}
              {showMainNewsDots && mainItems.length > 1 && (
                <div className="absolute top-4 right-4 flex space-x-2">
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

        {/* 侧边新闻列表 - 右侧 */}
        {sideItems.length > 0 && (
          <div className="space-y-4">
            {sideItems.map((item, index) => (
              <article key={item.id} className="group cursor-pointer">
                <Link href={`/portal/article/${item.slug}`} className="block">
                  <div className="flex space-x-3">
                    {/* 小图 */}
                    <div className="flex-shrink-0 w-20 h-14 overflow-hidden rounded bg-gray-200">
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={item.title}
                          width={80}
                          height={56}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          sizes="80px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* 文章信息 */}
                    <div className="flex-1 min-w-0">
                      {/* 标题 */}
                      <h4 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-red-600 transition-colors mb-1">
                        {item.title}
                      </h4>
                      
                      {/* 元信息 */}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-2">
                          {item.channel && (
                            <span className="text-red-600 font-medium group-hover:text-red-700">
                              {item.channel.name}
                            </span>
                          )}
                          <span>{formatTime(item.publish_time)}</span>
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
        )}
      </div>
    </section>
  );
}