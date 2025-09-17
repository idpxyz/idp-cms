'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
// 使用内联 SVG 图标替代 lucide-react

export interface BreakingNewsItem {
  id: string;
  title: string;
  slug: string;
  publish_time: string;
  channel?: {
    id: string;
    name: string;
    slug: string;
  };
  is_urgent?: boolean;
}

export interface BreakingTickerProps {
  items: BreakingNewsItem[];
  autoPlay?: boolean;
  scrollSpeed?: number; // 像素/秒
  pauseOnHover?: boolean;
  showTimestamp?: boolean;
  className?: string;
}

export default function BreakingTicker({
  items = [],
  autoPlay = true,
  scrollSpeed = 60, // 60px/s
  pauseOnHover = true,
  showTimestamp = true,
  className = "",
}: BreakingTickerProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [currentOffset, setCurrentOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  // 格式化时间
  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return '刚刚';
    if (diffMinutes < 60) return `${diffMinutes}分钟前`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}小时前`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  // 滚动动画
  useEffect(() => {
    if (!autoPlay || isPaused || items.length === 0) return;

    const animate = () => {
      setCurrentOffset(prev => {
        const container = containerRef.current;
        const content = contentRef.current;
        
        if (!container || !content) return prev;
        
        const containerWidth = container.offsetWidth;
        const contentWidth = content.scrollWidth;
        
        // 当内容滚动到一半时重置，实现无缝循环
        // 由于内容被复制了一份，所以当滚动到内容宽度的一半时重置
        if (prev >= contentWidth / 2) {
          return 0;
        }
        
        return prev + scrollSpeed / 60; // 60fps
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [autoPlay, isPaused, scrollSpeed, items.length]);

  // 鼠标悬停控制
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

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={`bg-red-600 text-white py-2 overflow-hidden ${className}`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center">
          {/* Breaking News 标签 */}
          <div className="flex items-center space-x-2 flex-shrink-0 mr-4">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z" />
            </svg>
            <span className="font-bold text-sm uppercase tracking-wide">
              快讯
            </span>
          </div>
          
          {/* 滚动容器 */}
          <div 
            ref={containerRef}
            className="flex-1 overflow-hidden"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div 
              ref={contentRef}
              className="flex items-center space-x-8 whitespace-nowrap transition-transform"
              style={{
                transform: `translateX(-${currentOffset}px)`,
                transitionDuration: isPaused ? '0.3s' : '0s',
              }}
            >
              {items.map((item, index) => (
                <div key={`${item.id}-${index}`} className="flex items-center space-x-3 flex-shrink-0">
                  <Link 
                    href={`/portal/article/${item.slug}`}
                    className="hover:underline text-white transition-opacity hover:opacity-80"
                  >
                    <span className="text-sm font-medium">
                      {item.title}
                    </span>
                  </Link>
                  
                  {showTimestamp && (
                    <div className="flex items-center space-x-1 text-red-200">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12,6 12,12 16,14"/>
                      </svg>
                      <span className="text-xs">
                        {formatTime(item.publish_time)}
                      </span>
                    </div>
                  )}
                  
                  {item.channel && (
                    <span className="text-xs bg-red-700 px-2 py-0.5 rounded text-red-100">
                      {item.channel.name}
                    </span>
                  )}
                  
                  {item.is_urgent && (
                    <span className="text-xs bg-yellow-500 text-yellow-900 px-2 py-0.5 rounded font-bold">
                      紧急
                    </span>
                  )}
                </div>
              ))}
              
              {/* 重复内容以确保无缝循环 */}
              {items.map((item, index) => (
                <div key={`repeat-${item.id}-${index}`} className="flex items-center space-x-3 flex-shrink-0">
                  <Link 
                    href={`/portal/article/${item.slug}`}
                    className="hover:underline text-white transition-opacity hover:opacity-80"
                  >
                    <span className="text-sm font-medium">
                      {item.title}
                    </span>
                  </Link>
                  
                  {showTimestamp && (
                    <div className="flex items-center space-x-1 text-red-200">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12,6 12,12 16,14"/>
                      </svg>
                      <span className="text-xs">
                        {formatTime(item.publish_time)}
                      </span>
                    </div>
                  )}
                  
                  {item.channel && (
                    <span className="text-xs bg-red-700 px-2 py-0.5 rounded text-red-100">
                      {item.channel.name}
                    </span>
                  )}
                  
                  {item.is_urgent && (
                    <span className="text-xs bg-yellow-500 text-yellow-900 px-2 py-0.5 rounded font-bold">
                      紧急
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
