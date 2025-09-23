"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { formatDateTime } from '@/lib/utils/date';
import { getTopStoryPlaceholderImage } from '@/lib/utils/placeholderImages';

// 继承原有接口，添加新的模式支持
export interface HeroItem {
  id: string;
  title: string;
  excerpt?: string;
  image_url?: string;
  publish_time?: string;
  author?: string;
  source?: string;
  channel?: {
    id: string;
    name: string;
    slug: string;
  };
  topic?: {
    id: string;
    name: string;
    slug: string;
  };
  slug: string;
  is_breaking?: boolean;
  is_live?: boolean;
  is_event_mode?: boolean;
  media_type?: 'image' | 'data';
  tags?: string[];
}

export type HeroHeightMode = 'compact' | 'standard' | 'takeover';

export interface HeroCarouselProps {
  items: HeroItem[];
  // 新增：高度模式配置
  heightMode?: HeroHeightMode;
  hasRightRail?: boolean;
  maxHeightVh?: number;
  // 原有配置
  autoPlay?: boolean;
  autoPlayInterval?: number;
  showDots?: boolean;
  showArrows?: boolean;
  className?: string;
  onItemClick?: (item: HeroItem) => void;
}

/**
 * 增强版 HeroCarousel - 支持多种高度模式和布局
 */
export default function HeroCarousel({
  items = [],
  heightMode = 'standard',
  hasRightRail = false,
  maxHeightVh = 60,
  autoPlay = true,
  autoPlayInterval = 6000,
  showDots = true,
  showArrows = true,
  className = "",
  onItemClick,
}: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isPaused, setIsPaused] = useState(false);
  const [imageLoaded, setImageLoaded] = useState<Record<number, boolean>>({});
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  
  // 触摸滑动相关状态
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // 确保有有效的轮播项（只检查图片）
  const validItems = items.filter(item => item && item.image_url);
  const totalItems = validItems.length;

  // 动态计算高度模式
  const getHeightMode = useCallback((): HeroHeightMode => {
    // 检查是否有事件模式的内容
    const hasEventContent = validItems.some(item => 
      item.is_event_mode || 
      item.is_live
    );
    
    if (hasEventContent) {
      return 'takeover';
    }
    
    // 检查是否有重要内容
    const hasImportantContent = validItems.some(item => 
      item.is_breaking
    );
    
    if (hasImportantContent) {
      return 'standard';
    }
    
    return heightMode; // 使用传入的默认模式
  }, [validItems, heightMode]);

  const actualHeightMode = getHeightMode();

  // 根据模式和设备计算高度类名
  const getHeightClassName = useCallback(() => {
    const baseClasses = "w-full overflow-hidden";
    
    switch (actualHeightMode) {
      case 'compact':
        // 响应式紧凑模式高度
        return `${baseClasses} h-[30vh] md:h-[25vh] lg:h-[25vh] min-h-[200px] max-h-[300px] md:max-h-[350px]`;
      
      case 'takeover':
        // 响应式全屏模式
        return `${baseClasses} h-[70vh] md:h-[80vh] lg:h-[85svh] min-h-[400px]`;
      
      case 'standard':
      default:
        // 响应式标准模式
        const maxHeight = hasRightRail ? Math.min(maxHeightVh - 8, 52) : maxHeightVh;
        return `${baseClasses} h-[50vh] md:h-[55vh] lg:h-[${maxHeight}vh] min-h-[300px] max-h-[600px]`;
    }
  }, [actualHeightMode, hasRightRail, maxHeightVh]);

  // 栅格布局类名
  const getGridClassName = useCallback(() => {
    if (actualHeightMode === 'takeover') {
      return 'w-full'; // 事件模式占满全屏
    }
    return hasRightRail ? 'lg:grid lg:grid-cols-3' : 'w-full';
  }, [actualHeightMode, hasRightRail]);

  const getContentClassName = useCallback(() => {
    if (actualHeightMode === 'takeover') {
      return 'w-full';
    }
    return hasRightRail ? 'lg:col-span-2' : 'w-full';
  }, [actualHeightMode, hasRightRail]);

  // 如果没有有效项，显示占位符
  if (totalItems === 0) {
    return (
      <div className={`${getGridClassName()} bg-white flex items-center justify-center ${getHeightClassName()}`}>
        <div className={getContentClassName()}>
          <div className="text-center text-gray-500">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-300 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p>暂无轮播内容</p>
          </div>
        </div>
        {hasRightRail && actualHeightMode !== 'takeover' && (
          <aside className="hidden lg:block lg:col-span-1 pl-6">
            <div className="text-gray-400 text-sm">侧边栏区域</div>
          </aside>
        )}
      </div>
    );
  }

  // 自动播放逻辑（与原版相同）
  const startAutoPlay = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    if (isPlaying && !isPaused && totalItems > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % totalItems);
      }, autoPlayInterval);
    }
  }, [isPlaying, isPaused, totalItems, autoPlayInterval]);

  const stopAutoPlay = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    startAutoPlay();
    return stopAutoPlay;
  }, [startAutoPlay, stopAutoPlay]);

  // 鼠标悬停暂停
  const handleMouseEnter = useCallback(() => {
    setIsPaused(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPaused(false);
  }, []);

  // 手动导航
  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 3000);
  }, []);

  const goToPrevious = useCallback(() => {
    goToSlide(currentIndex === 0 ? totalItems - 1 : currentIndex - 1);
  }, [currentIndex, totalItems, goToSlide]);

  const goToNext = useCallback(() => {
    goToSlide((currentIndex + 1) % totalItems);
  }, [currentIndex, totalItems, goToSlide]);

  // 处理项目点击
  const handleItemClick = useCallback((item: HeroItem) => {
    if (onItemClick) {
      onItemClick(item);
    } else {
      window.open(`/portal/article/${item.slug}`, '_self');
    }
  }, [onItemClick]);

  // 图片加载处理
  const handleImageLoad = useCallback((index: number) => {
    setImageLoaded(prev => ({ ...prev, [index]: true }));
  }, []);

  // 触摸事件处理
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsPaused(true); // 触摸时暂停自动播放
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) {
      setTimeout(() => setIsPaused(false), 1000); // 恢复自动播放
      return;
    }
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && totalItems > 1) {
      goToNext();
    } else if (isRightSwipe && totalItems > 1) {
      goToPrevious();
    }
    
    // 延迟恢复自动播放
    setTimeout(() => setIsPaused(false), 2000);
  }, [touchStart, touchEnd, totalItems, goToNext, goToPrevious]);

  // 添加被动的触摸事件监听器
  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    // 使用被动监听器来避免性能警告
    const addPassiveTouchListeners = () => {
      carousel.addEventListener('touchstart', (e) => {
        setTouchEnd(null);
        setTouchStart(e.touches[0].clientX);
        setIsPaused(true);
      }, { passive: true });

      carousel.addEventListener('touchmove', (e) => {
        setTouchEnd(e.touches[0].clientX);
      }, { passive: true });

      carousel.addEventListener('touchend', () => {
        if (!touchStart || !touchEnd) {
          setTimeout(() => setIsPaused(false), 1000);
          return;
        }
        
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > 50;
        const isRightSwipe = distance < -50;

        if (isLeftSwipe && totalItems > 1) {
          goToNext();
        } else if (isRightSwipe && totalItems > 1) {
          goToPrevious();
        }
        
        setTimeout(() => setIsPaused(false), 2000);
      }, { passive: true });
    };

    addPassiveTouchListeners();

    return () => {
      // 清理事件监听器
      const newCarousel = carouselRef.current;
      if (newCarousel) {
        newCarousel.removeEventListener('touchstart', () => {});
        newCarousel.removeEventListener('touchmove', () => {});
        newCarousel.removeEventListener('touchend', () => {});
      }
    };
  }, [touchStart, touchEnd, totalItems, goToNext, goToPrevious]);

  const currentItem = validItems[currentIndex];

  return (
    <section className={`${getGridClassName()} ${className}`}>
      {/* 主轮播区域 */}
      <div 
        ref={carouselRef}
        className={`${getContentClassName()} ${getHeightClassName()} relative bg-white`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        role="region"
        aria-label="轮播新闻"
        tabIndex={0}
      >
        {/* 轮播容器 */}
        <div 
          className="flex transition-transform duration-700 ease-in-out h-full"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {validItems.map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              className="w-full flex-shrink-0 relative cursor-pointer group"
              onClick={() => handleItemClick(item)}
            >
              {/* 背景图片 */}
              <div className="absolute inset-0">
                <>
                  <Image
                    src={item.image_url || getTopStoryPlaceholderImage(item)}
                      alt={item.title}
                      fill
                      className={`object-cover transition-opacity duration-300 ${
                        imageLoaded[index] ? 'opacity-100' : 'opacity-0'
                      }`}
                      priority={index === 0}
                      fetchPriority={index === 0 ? 'high' : 'auto'}
                      loading={index <= 1 ? 'eager' : 'lazy'}
                      onLoad={() => handleImageLoad(index)}
                      sizes={hasRightRail ? "(min-width: 1024px) 66vw, 100vw" : "100vw"}
                    />
                    {!imageLoaded[index] && (
                      <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
                        <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </>
                
                {/* 渐变遮罩 - 更轻柔的颜色 */}
                <div className={`absolute inset-0 ${
                  actualHeightMode === 'takeover' 
                    ? 'bg-gradient-to-t from-gray-900/80 via-gray-900/40 to-transparent'
                    : 'bg-gradient-to-t from-gray-900/60 via-gray-900/20 to-transparent'
                }`}></div>
              </div>

              {/* 内容层 - 根据高度模式调整排版 */}
              <div className="absolute inset-0 flex items-end">
                <div className={`w-full ${
                  actualHeightMode === 'takeover' ? 'p-8 md:p-12 lg:p-16' : 'p-6 md:p-8'
                }`}>
                  {/* 标签区域 */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    {item.is_breaking && (
                      <span className="bg-red-600 text-white px-3 py-1 rounded text-sm font-bold animate-pulse">
                        突发
                      </span>
                    )}
                    {item.is_live && (
                      <span className="bg-red-500 text-white px-3 py-1 rounded text-sm font-bold flex items-center">
                        <span className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></span>
                        直播
                      </span>
                    )}
                    {item.channel && (
                      <span className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium">
                        {item.channel.name}
                      </span>
                    )}
                    {item.topic && (
                      <span className="bg-purple-600 text-white px-3 py-1 rounded text-sm font-medium">
                        {item.topic.name}
                      </span>
                    )}
                  </div>

                  {/* 标题 - 根据模式调整大小 - 响应式优化 */}
                  <h2 className={`text-white font-bold mb-2 md:mb-3 line-clamp-2 md:line-clamp-3 group-hover:text-blue-200 transition-colors ${
                    actualHeightMode === 'takeover' 
                      ? 'text-2xl md:text-3xl lg:text-4xl xl:text-5xl' 
                      : actualHeightMode === 'compact'
                      ? 'text-lg md:text-xl lg:text-2xl xl:text-3xl'
                      : 'text-xl md:text-2xl lg:text-3xl xl:text-4xl'
                  }`}>
                    {item.title}
                  </h2>

                  {/* 摘要 - compact 模式下隐藏 */}
                  {item.excerpt && actualHeightMode !== 'compact' && (
                    <p className={`text-gray-200 mb-4 line-clamp-2 max-w-3xl ${
                      actualHeightMode === 'takeover' 
                        ? 'text-lg md:text-xl' 
                        : 'text-base md:text-lg'
                    }`}>
                      {item.excerpt}
                    </p>
                  )}

                  {/* 元信息 */}
                  <div className="flex items-center text-gray-300 text-sm">
                    {item.source && <span className="mr-4">{item.source}</span>}
                    {item.author && <span className="mr-4">作者：{item.author}</span>}
                    {item.publish_time && <span>{formatDateTime(item.publish_time)}</span>}
                  </div>
                </div>
              </div>

              {/* Hover 覆盖效果 */}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
          ))}
        </div>

        {/* 导航控件 - 在 takeover 模式下更突出 */}
        {showArrows && totalItems > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToPrevious();
              }}
              className={`absolute left-4 top-1/2 -translate-y-1/2 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/50 ${
                actualHeightMode === 'takeover' 
                  ? 'w-16 h-16 bg-black/60 hover:bg-black/80 text-white text-xl'
                  : 'w-12 h-12 bg-black/50 hover:bg-black/70 text-white'
              }`}
              aria-label="上一张"
            >
              <svg className={actualHeightMode === 'takeover' ? 'w-8 h-8' : 'w-6 h-6'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              className={`absolute right-4 top-1/2 -translate-y-1/2 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/50 ${
                actualHeightMode === 'takeover' 
                  ? 'w-16 h-16 bg-black/60 hover:bg-black/80 text-white text-xl'
                  : 'w-12 h-12 bg-black/50 hover:bg-black/70 text-white'
              }`}
              aria-label="下一张"
            >
              <svg className={actualHeightMode === 'takeover' ? 'w-8 h-8' : 'w-6 h-6'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* 指示点 */}
        {showDots && totalItems > 1 && (
          <div className={`absolute left-1/2 -translate-x-1/2 flex space-x-2 ${
            actualHeightMode === 'takeover' ? 'bottom-8' : 'bottom-6'
          }`}>
            {validItems.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  goToSlide(index);
                }}
                className={`rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 ${
                  actualHeightMode === 'takeover' 
                    ? 'w-4 h-4' : 'w-3 h-3'
                } ${
                  index === currentIndex
                    ? 'bg-white scale-125'
                    : 'bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`跳转到第${index + 1}张`}
              />
            ))}
          </div>
        )}


      </div>

      {/* 右侧栏 - 仅在非 takeover 模式下显示 */}
      {hasRightRail && actualHeightMode !== 'takeover' && (
        <aside className="hidden lg:block lg:col-span-1 pl-6">
          <div className="h-full flex flex-col justify-start space-y-4 pt-4">
            {/* 正在直播入口 */}
            {validItems.some(item => item.is_live) && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-800 mb-2 flex items-center">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
                  正在直播
                </h3>
                <p className="text-red-700 text-sm">点击查看实时直播内容</p>
              </div>
            )}
            
            {/* 专题入口 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">热门专题</h3>
              <p className="text-blue-700 text-sm">浏览相关专题内容</p>
            </div>
            
            {/* Most Read 占位 */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">最多阅读</h3>
              <p className="text-gray-600 text-sm">热门文章列表</p>
            </div>
          </div>
        </aside>
      )}
    </section>
  );
}
