/**
 * 频道导航组件 - 纯SSR版
 * 
 * 🎯 核心特性：
 * 1. ✅ 零闪烁：频道已在服务端个性化排序
 * 2. ✅ 简单高效：无客户端个性化逻辑
 * 3. ✅ CSS驱动：响应式断点纯CSS实现
 * 4. ✅ SSR/CSR一致：服务端渲染什么，客户端就显示什么
 * 
 * 📊 响应式断点（参考主流新闻网站）：
 * - 移动端 (<768px): 汉堡菜单
 * - 平板 (768-1023px): 4个频道
 * - 桌面 (1024-1279px): 6个频道
 * - 超大屏 (≥1280px): 8个频道
 * 
 * 数据来源：服务端已调用 getPersonalizedChannelsSSR()
 */

"use client";

import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useChannels } from "../ChannelContext";
import type { Channel } from "@/lib/api";
import {
  reorderChannelsWithCurrentActive,
  getChannelItemClassName,
  RESPONSIVE_BREAKPOINTS,
} from "./ChannelNavigation.utils";
import MegaMenu from "./MegaMenu";
import MobileChannelMenu from "./MobileChannelMenu";

interface ChannelNavigationProps {
  channels?: Channel[];
}

export default function ChannelNavigation({
  channels: propChannels,
}: ChannelNavigationProps) {
  const {
    channels: contextChannels,
    currentChannelSlug,
    switchChannel,
    getCurrentChannel,
  } = useChannels();

  // ✅ 使用已个性化排序的频道（来自SSR）
  const channels = propChannels || contextChannels;

  // 状态管理
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Refs
  const dropdownRef = useRef<HTMLDivElement>(null);
  const activeChannelRef = useRef<HTMLButtonElement | null>(null);

  // MegaMenu 状态
  const [megaMenuState, setMegaMenuState] = useState<{
    isOpen: boolean;
    channelSlug: string;
    channelName: string;
    channelId: string;
  }>({
    isOpen: false,
    channelSlug: "",
    channelName: "",
    channelId: "",
  });
  const [megaMenuTimer, setMegaMenuTimer] = useState<NodeJS.Timeout | null>(null);

  // ✅ 极简方案：所有频道都显示，支持横向滚动（参考今日头条、腾讯新闻）
  const sortedChannels = channels; // 直接使用SSR已个性化排序的频道
  
  // 🔒 分离"推荐"频道（固定）和其他频道（可滚动）
  // 使用 useMemo 避免每次渲染都创建新的引用，防止 useEffect 无限循环
  const recommendChannel = useMemo(
    () => sortedChannels.find(ch => ch.slug === 'recommend'),
    [sortedChannels]
  );
  const scrollableChannels = useMemo(
    () => sortedChannels.filter(ch => ch.slug !== 'recommend'),
    [sortedChannels]
  );
  
  // "更多"菜单状态
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  
  // 跟踪哪些频道在可视区域内
  const [visibleChannelSlugs, setVisibleChannelSlugs] = useState<Set<string>>(new Set());
  const channelButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // ✅ 点击外部关闭"更多"菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 🔍 检测哪些频道在滚动容器的可视区域内
  useEffect(() => {
    const scrollContainer = document.querySelector('.channel-scroll-container');
    if (!scrollContainer) return;

    const updateVisibleChannels = () => {
      const containerRect = scrollContainer.getBoundingClientRect();
      const visible = new Set<string>();

      // 🔒 "推荐"频道始终可见（因为它是固定的）
      if (recommendChannel) {
        visible.add(recommendChannel.slug);
      }

      // 只检查滚动容器内的频道
      scrollableChannels.forEach((channel) => {
        const button = channelButtonRefs.current.get(channel.slug);
        if (!button) return;

        const buttonRect = button.getBoundingClientRect();
        // 检查按钮是否在容器的可视区域内（至少部分可见）
        const isVisible = 
          buttonRect.right > containerRect.left && 
          buttonRect.left < containerRect.right;
        
        if (isVisible) {
          visible.add(channel.slug);
        }
      });

      // 🔧 只在实际变化时更新，避免不必要的重渲染
      setVisibleChannelSlugs(prev => {
        // 比较两个 Set 是否相同
        if (prev.size !== visible.size) return visible;
        
        // 使用 Array.from 避免 TypeScript 迭代器错误
        const visibleArray = Array.from(visible);
        for (const slug of visibleArray) {
          if (!prev.has(slug)) return visible;
        }
        return prev; // 没变化，返回原对象
      });
    };

    // 初始检测
    updateVisibleChannels();

    // 监听滚动事件
    scrollContainer.addEventListener('scroll', updateVisibleChannels);
    
    // 监听窗口大小变化
    window.addEventListener('resize', updateVisibleChannels);

    return () => {
      scrollContainer.removeEventListener('scroll', updateVisibleChannels);
      window.removeEventListener('resize', updateVisibleChannels);
    };
  }, [scrollableChannels, recommendChannel]);

  // MegaMenu 控制
  const openMegaMenu = useCallback((channel: Channel, buttonRef: HTMLButtonElement) => {
    if (megaMenuTimer) {
      clearTimeout(megaMenuTimer);
      setMegaMenuTimer(null);
    }
    setMegaMenuState({
      isOpen: true,
      channelSlug: channel.slug,
      channelName: channel.name,
      channelId: channel.id,
    });
    activeChannelRef.current = buttonRef;
  }, [megaMenuTimer]);

  const closeMegaMenu = useCallback(() => {
    const timer = setTimeout(() => {
      setMegaMenuState((prev) => ({ ...prev, isOpen: false }));
      activeChannelRef.current = null;
    }, 300);
    setMegaMenuTimer(timer);
  }, []);

  const cancelCloseMegaMenu = useCallback(() => {
    if (megaMenuTimer) {
      clearTimeout(megaMenuTimer);
      setMegaMenuTimer(null);
    }
  }, [megaMenuTimer]);

  const handleChannelClick = useCallback((channelSlug: string, scrollToView: boolean = false) => {
    switchChannel(channelSlug);
    setMegaMenuState((prev) => ({ ...prev, isOpen: false }));
    
    // 如果需要滚动到视图中（从"更多"菜单点击）
    if (scrollToView) {
      // 延迟一小段时间，确保DOM已更新
      setTimeout(() => {
        const button = channelButtonRefs.current.get(channelSlug);
        const scrollContainer = document.querySelector('.channel-scroll-container');
        
        if (button && scrollContainer) {
          const containerRect = scrollContainer.getBoundingClientRect();
          const buttonRect = button.getBoundingClientRect();
          
          // 检查按钮是否已经在可视区域内
          const isVisible = 
            buttonRect.left >= containerRect.left && 
            buttonRect.right <= containerRect.right;
          
          if (!isVisible) {
            // 只有不可见时才滚动，并且使用 'start' 而不是 'center'
            // 这样可以确保"推荐"频道始终保持在最左侧可见
            button.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'nearest', 
              inline: 'start' // 滚动到左侧刚好可见，而不是居中
            });
          }
        }
      }, 100);
    }
  }, [switchChannel]);

  const handleChannelMouseEnter = useCallback((channel: Channel, e: React.MouseEvent<HTMLButtonElement>) => {
    openMegaMenu(channel, e.currentTarget);
  }, [openMegaMenu]);

  const handleChannelMouseLeave = useCallback(() => {
    closeMegaMenu();
  }, [closeMegaMenu]);

  // ✅ 无频道数据检查（简化版，无SSR等待逻辑）
  if (channels.length === 0) {
    return (
      <section className="bg-white border-b border-gray-200 sticky z-30" style={{ top: "var(--sticky-offset)" }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-center py-3 md:py-3.5">
            <div className="text-gray-500 text-sm">暂无频道数据</div>
          </div>
        </div>
      </section>
    );
  }

  // ✅ 删除个性化状态指示器（已在SSR完成）

  return (
    <>
      <section className="bg-white border-b border-gray-200 sticky z-30" style={{ top: "var(--sticky-offset)" }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center py-3 md:py-3.5">
            {/* 🔒 固定"推荐"频道 - 始终在最左侧可见 */}
            {recommendChannel && (
              <div className="hidden md:block flex-shrink-0 mr-2">
                <button
                  ref={(el) => {
                    if (el) {
                      channelButtonRefs.current.set(recommendChannel.slug, el);
                    } else {
                      channelButtonRefs.current.delete(recommendChannel.slug);
                    }
                  }}
                  onClick={() => handleChannelClick(recommendChannel.slug)}
                  onMouseEnter={(e) => handleChannelMouseEnter(recommendChannel, e)}
                  onMouseLeave={handleChannelMouseLeave}
                  className={`
                    px-4 py-2 rounded-full text-sm font-medium
                    whitespace-nowrap transition-all duration-200
                    ${currentChannelSlug === recommendChannel.slug
                      ? "bg-red-500 text-white shadow-md"
                      : "text-gray-700 hover:text-red-500 hover:bg-gray-50"
                    }
                  `}
                >
                  {recommendChannel.name}
                </button>
              </div>
            )}

            {/* 🎯 其他频道 - 横向滚动显示（参考今日头条/腾讯新闻） */}
            <div className="hidden md:block flex-1 min-w-0 relative">
              {/* 滚动容器 - 关键：右侧padding确保内容不会滚动到"更多"按钮下方 */}
              <div className="overflow-x-auto scrollbar-hide channel-scroll-container pr-28">
                <div className="flex space-x-2">
                  {scrollableChannels.map((channel) => {
                    const isActive = currentChannelSlug === channel.slug;

                    return (
                      <button
                        key={channel.slug}
                        ref={(el) => {
                          if (el) {
                            channelButtonRefs.current.set(channel.slug, el);
                          } else {
                            channelButtonRefs.current.delete(channel.slug);
                          }
                        }}
                        onClick={() => handleChannelClick(channel.slug)}
                        onMouseEnter={(e) => handleChannelMouseEnter(channel, e)}
                        onMouseLeave={handleChannelMouseLeave}
                        className={`
                          flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium
                          whitespace-nowrap transition-all duration-200
                          ${isActive
                            ? "bg-red-500 text-white shadow-md"
                            : "text-gray-700 hover:text-red-500 hover:bg-gray-50"
                          }
                        `}
                      >
                        {channel.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* "更多"按钮 - 绝对定位在滚动区域右侧，浮在内容上方 */}
              <div className="absolute top-0 right-0 h-full flex items-center bg-gradient-to-l from-white via-white to-transparent pl-8">
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                    className="flex items-center space-x-1 px-3 py-2 rounded-full text-sm font-medium text-gray-600 hover:text-red-500 hover:bg-gray-50 transition-all"
                    aria-label="更多频道"
                  >
                    <span>更多</span>
                    <svg
                      className={`w-4 h-4 transition-transform ${showMoreMenu ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showMoreMenu && (() => {
                // 只显示不在可视区域内的频道
                const hiddenChannels = sortedChannels.filter(
                  ch => !visibleChannelSlugs.has(ch.slug)
                );

                if (hiddenChannels.length === 0) {
                  return (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-4 px-4 z-50">
                      <p className="text-sm text-gray-500 text-center">所有频道都已显示</p>
                    </div>
                  );
                }

                return (
                  <div className="absolute top-full right-0 mt-2 w-64 max-h-96 overflow-y-auto bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-xs text-gray-500">
                        隐藏的频道 ({hiddenChannels.length}/{sortedChannels.length})
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-1 p-2">
                      {hiddenChannels.map((channel) => (
                        <button
                          key={channel.slug}
                          onClick={() => {
                            handleChannelClick(channel.slug, true); // 滚动到视图中
                            setShowMoreMenu(false);
                          }}
                          className={`
                            px-3 py-2 rounded text-sm text-left transition-colors
                            ${currentChannelSlug === channel.slug
                              ? "bg-red-50 text-red-600 font-medium"
                              : "text-gray-700 hover:bg-gray-50 hover:text-red-500"
                            }
                          `}
                        >
                          {channel.name}
                        </button>
                      ))}
                    </div>
                  </div>
                );
                  })()}
                </div>
              </div>
            </div>

            {/* 移动端菜单按钮 */}
            <div className="flex-shrink-0 md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="flex items-center justify-center w-10 h-10 rounded-full text-gray-600 hover:text-red-500 hover:bg-gray-50 transition-all"
                aria-label="打开频道菜单"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* MegaMenu */}
      {megaMenuState.isOpen && (
        <MegaMenu
          isOpen={megaMenuState.isOpen}
          channelSlug={megaMenuState.channelSlug}
          channelName={megaMenuState.channelName}
          channelId={megaMenuState.channelId}
          onClose={() => setMegaMenuState((prev) => ({ ...prev, isOpen: false }))}
          triggerRef={activeChannelRef}
        />
      )}

      {/* 移动端菜单 */}
      <MobileChannelMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        channels={sortedChannels}
        currentChannelSlug={currentChannelSlug}
      />

      {/* 🎨 样式优化 */}
      <style jsx>{`
        /* 隐藏滚动条但保持滚动功能 */
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        /* 平滑滚动 */
        .scrollbar-hide {
          scroll-behavior: smooth;
        }
      `}</style>
    </>
  );
}
