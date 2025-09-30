"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  // 计算正确的初始索引
  const getInitialIndex = () => {
    const validItemsCount = items.filter(item => item && item.image_url).length;
    return validItemsCount > 1 ? 1 : 0; // 有多项时从1开始（第0项是克隆的），单项时从0开始
  };
  
  const [currentIndex, setCurrentIndex] = useState(getInitialIndex());
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isPaused, setIsPaused] = useState(false);
  const [imageLoaded, setImageLoaded] = useState<Record<number, boolean>>({});
  const [isResetting, setIsResetting] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 触摸滑动相关状态
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // 确保有有效的轮播项（只检查图片）
  const validItems = items.filter(item => item && item.image_url);
  const totalItems = validItems.length;

  // 创建带克隆项的数组用于无缝循环
  const clonedItems = useMemo(() => {
    if (totalItems === 0) return [];
    if (totalItems === 1) return validItems; // 只有一项时不需要克隆
    
    // 前后各添加一个克隆项
    return [
      { ...validItems[totalItems - 1], id: `clone-last-${validItems[totalItems - 1].id}` },
      ...validItems,
      { ...validItems[0], id: `clone-first-${validItems[0].id}` }
    ];
  }, [validItems, totalItems]);

  const totalClonedItems = clonedItems.length;

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

  // 重置到真实位置的函数（无动画）
  const resetToRealPosition = useCallback((targetIndex: number) => {
    if (!containerRef.current) return;
    
    // 标记正在重置，暂停自动播放
    setIsResetting(true);
    
    // 立即更新状态，避免视觉闪烁
    setCurrentIndex(targetIndex);
    
    // 禁用过渡动画
    containerRef.current.style.transition = 'none';
    containerRef.current.style.transform = `translateX(-${targetIndex * 100}%)`;
    
    // 强制重绘并恢复动画
    void containerRef.current.offsetHeight; // 强制重绘
    containerRef.current.style.transition = 'transform 0.7s ease-in-out';
    
    // 短暂延迟后恢复播放
    setTimeout(() => {
      setIsResetting(false);
    }, 50);
  }, []);

  // 处理边界重置的效果
  useEffect(() => {
    if (totalItems <= 1 || isResetting) return;
    
    // 检测是否到达了需要重置的边界
    if (currentIndex === 0) {
      // 从克隆的最后一项重置到真实的最后一项
      setTimeout(() => resetToRealPosition(totalItems), 700); // 等待动画完成
    } else if (currentIndex === totalClonedItems - 1) {
      // 从克隆的第一项重置到真实的第一项  
      setTimeout(() => resetToRealPosition(1), 700); // 等待动画完成
    }
  }, [currentIndex, totalItems, totalClonedItems, resetToRealPosition, isResetting]);

  // 自动播放逻辑（支持无缝循环）
  const startAutoPlay = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    if (isPlaying && !isPaused && !isResetting && totalItems > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => prev + 1);
      }, autoPlayInterval);
    }
  }, [isPlaying, isPaused, isResetting, totalItems, autoPlayInterval]);

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

  // 当items改变时重置currentIndex
  useEffect(() => {
    if (totalItems > 1) {
      // 有多项时，从第1项开始（第0项是克隆的最后一项）
      setCurrentIndex(1);
    } else if (totalItems === 1) {
      // 只有一项时，使用原始数组，从第0项开始
      setCurrentIndex(0);
    } else {
      // 没有项目
      setCurrentIndex(0);
    }
  }, [totalItems]);

  // 确保容器样式初始化
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.transition = 'transform 0.7s ease-in-out';
    }
  }, []);

  // 鼠标悬停暂停
  const handleMouseEnter = useCallback(() => {
    setIsPaused(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPaused(false);
  }, []);

  // 手动导航（支持无缝循环）
  const goToSlide = useCallback((realIndex: number) => {
    if (totalItems <= 1) return;
    
    // 转换为克隆数组中的索引
    const targetIndex = realIndex + 1; // 加1因为第0项是克隆项
    setCurrentIndex(targetIndex);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 3000);
  }, [totalItems]);

  const goToPrevious = useCallback(() => {
    if (totalItems <= 1) return;
    setCurrentIndex(prev => prev - 1);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 3000);
  }, [totalItems]);

  const goToNext = useCallback(() => {
    if (totalItems <= 1) return;
    setCurrentIndex(prev => prev + 1);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 3000);
  }, [totalItems]);

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

  const currentItem = clonedItems[currentIndex] || null;

  // 计算当前真实的活跃索引（用于指示器）
  const getCurrentRealIndex = useCallback(() => {
    if (totalItems <= 1) return 0;
    
    if (currentIndex === 0) return totalItems - 1; // 克隆的最后一项对应真实最后一项
    if (currentIndex === totalClonedItems - 1) return 0; // 克隆的第一项对应真实第一项
    return currentIndex - 1; // 真实项（减1因为第0项是克隆的）
  }, [currentIndex, totalItems, totalClonedItems]);

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
            <div className="text-gray-400 news-meta">侧边栏区域</div>
          </aside>
        )}
      </div>
    );
  }

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
          ref={containerRef}
          className="flex transition-transform duration-700 ease-in-out h-full"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {clonedItems.map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              className="w-full flex-shrink-0 relative cursor-pointer group"
              onClick={() => handleItemClick(item)}
            >
              {/* 背景图片 */}
              <div className="absolute inset-0 overflow-hidden">
                <>
                  <Image
                    src={item.image_url || getTopStoryPlaceholderImage(item)}
                      alt={item.title}
                      fill
                      className="object-cover transition-all duration-300 group-hover:scale-105"
                      priority={index === 0}
                      onLoad={() => handleImageLoad(index)}
                      sizes={hasRightRail ? "(min-width: 1280px) 60vw, (min-width: 1024px) 70vw, (min-width: 768px) 85vw, 100vw" : "(min-width: 1280px) 90vw, (min-width: 768px) 95vw, 100vw"}
                    />
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
                      <span className="bg-red-600 text-white px-3 py-1 rounded button-text font-bold animate-pulse">
                        突发
                      </span>
                    )}
                    {item.is_live && (
                      <span className="bg-red-500 text-white px-3 py-1 rounded button-text font-bold flex items-center">
                        <span className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></span>
                        直播
                      </span>
                    )}
                    {item.channel && (
                      <span className="bg-blue-600 text-white px-3 py-1 rounded button-text">
                        {item.channel.name}
                      </span>
                    )}
                    {item.topic && (
                      <span className="bg-purple-600 text-white px-3 py-1 rounded button-text">
                        {item.topic.name}
                      </span>
                    )}
                  </div>

                  {/* 标题 - 根据模式调整大小 - 响应式优化 */}
                  <h2 className={`mb-2 md:mb-3 line-clamp-2 md:line-clamp-3 group-hover:text-blue-200 transition-colors ${
                    actualHeightMode === 'takeover' 
                      ? 'hero-title-takeover' 
                      : actualHeightMode === 'compact'
                      ? 'hero-title-compact'
                      : 'hero-title-normal'
                  }`}>
                    {item.title}
                  </h2>

                  {/* 摘要 - compact 模式下隐藏 */}
                  {item.excerpt && actualHeightMode !== 'compact' && (
                    <p className={`mb-4 line-clamp-2 max-w-3xl ${
                      actualHeightMode === 'takeover' 
                        ? 'hero-excerpt-large' 
                        : 'hero-excerpt-normal'
                    }`}>
                      {item.excerpt}
                    </p>
                  )}

                  {/* 元信息 */}
                  <div className="flex items-center hero-meta">
                    {item.source && <span className="mr-4">{item.source}</span>}
                    {item.author && <span className="mr-4">作者：{item.author}</span>}
                    {item.publish_time && <span>{formatDateTime(item.publish_time)}</span>}
                  </div>
                </div>
              </div>

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
                  index === getCurrentRealIndex()
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
                <p className="text-red-700 news-meta">点击查看实时直播内容</p>
              </div>
            )}
            
            {/* 专题入口 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">热门专题</h3>
              <p className="text-blue-700 news-meta">浏览相关专题内容</p>
            </div>
            
            {/* Most Read 占位 */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">最多阅读</h3>
              <p className="text-gray-600 news-meta">热门文章列表</p>
            </div>
          </div>
        </aside>
      )}
    </section>
  );
}
