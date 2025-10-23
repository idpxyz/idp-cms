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

  // ✅ 自适应方案：根据屏幕宽度动态显示频道数量
  const sortedChannels = channels; // 直接使用SSR已个性化排序的频道
  
  // 🔒 分离"推荐"频道（固定）和其他频道（可滚动）
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
  
  // 滚动容器引用
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const channelButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  
  // 跟踪哪些频道在可视区域外（用于"更多"菜单）
  const [hiddenChannelSlugs, setHiddenChannelSlugs] = useState<Set<string>>(new Set());

  // 🔍 检测哪些频道在滚动容器的可视区域外
  useEffect(() => {
    const checkVisibleChannels = () => {
      if (!scrollContainerRef.current) return;
      
      const container = scrollContainerRef.current;
      const containerRect = container.getBoundingClientRect();
      const hidden = new Set<string>();
      
      scrollableChannels.forEach((channel) => {
        const button = channelButtonRefs.current.get(channel.slug);
        if (!button) return;
        
        const buttonRect = button.getBoundingClientRect();
        // 检查按钮是否在容器的可视区域外
        const isHidden = 
          buttonRect.right < containerRect.left || 
          buttonRect.left > containerRect.right;
        
        if (isHidden) {
          hidden.add(channel.slug);
        }
      });
      
      setHiddenChannelSlugs(hidden);
    };
    
    // 初始检测
    setTimeout(checkVisibleChannels, 200);
    
    // 监听滚动事件
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkVisibleChannels);
      window.addEventListener('resize', checkVisibleChannels);
    }
    
    return () => {
      if (container) {
        container.removeEventListener('scroll', checkVisibleChannels);
      }
      window.removeEventListener('resize', checkVisibleChannels);
    };
  }, [scrollableChannels]);

  // 🎯 监听频道变化，自动滚动到选中的频道
  useEffect(() => {
    if (!currentChannelSlug || !scrollContainerRef.current) return;
    
    const button = channelButtonRefs.current.get(currentChannelSlug);
    if (button) {
      // 滚动到该频道，使其在容器中居中显示
      button.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest', 
        inline: 'center' 
      });
    }
  }, [currentChannelSlug]);

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

  const handleChannelClick = useCallback((channelSlug: string) => {
    switchChannel(channelSlug);
    setMegaMenuState((prev) => ({ ...prev, isOpen: false }));
    // 🎯 频道切换后，useEffect 会自动确保新频道可见并滚动到位
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
      <section className="bg-white border-b border-gray-200">
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
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center py-3 md:py-3.5">
            {/* 🔒 固定"推荐"频道 - 移动端和桌面端都显示 */}
            {recommendChannel && (
              <div className="flex-shrink-0 mr-2">
                <button
                  ref={(el) => {
                    if (el) {
                      channelButtonRefs.current.set(recommendChannel.slug, el);
                    } else {
                      channelButtonRefs.current.delete(recommendChannel.slug);
                    }
                  }}
                  onClick={() => handleChannelClick(recommendChannel.slug)}
                  // ⏸️ MegaMenu 暂时禁用
                  // onMouseEnter={(e) => handleChannelMouseEnter(recommendChannel, e)}
                  // onMouseLeave={handleChannelMouseLeave}
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

            {/* 🎯 其他频道 - 可横向滚动的容器，显示所有频道 */}
            <div className="flex-1 min-w-0 relative">
              {/* 频道滚动容器 - 显示所有频道 */}
              <div 
                ref={scrollContainerRef}
                className="overflow-x-auto scrollbar-hide"
                style={{ 
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
              >
                <div className="flex space-x-2 pr-20"> {/* pr-20 为"更多"按钮留出空间 */}
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
                        // ⏸️ MegaMenu 暂时禁用
                        // onMouseEnter={(e) => handleChannelMouseEnter(channel, e)}
                        // onMouseLeave={handleChannelMouseLeave}
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
              
              {/* "更多"按钮 - 桌面端显示，只有当有隐藏频道时才显示 */}
              {hiddenChannelSlugs.size > 0 && (
                <div className="hidden md:flex absolute top-0 right-0 h-full items-center bg-gradient-to-l from-white via-white to-transparent pl-8">
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
                    // 只显示在可视区域外的频道
                    const hiddenChannels = scrollableChannels.filter(ch => hiddenChannelSlugs.has(ch.slug));
                    
                    return hiddenChannels.length === 0 ? (
                      <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-4 px-4 z-50">
                        <p className="text-sm text-gray-500 text-center">所有频道都已显示</p>
                      </div>
                    ) : (
                      <div className="absolute top-full right-0 mt-2 w-64 max-h-96 overflow-y-auto bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                        <div className="px-4 py-2 border-b border-gray-100">
                          <p className="text-xs text-gray-500">
                            更多频道 ({hiddenChannels.length})
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-1 p-2">
                          {hiddenChannels.map((channel) => {
                            const isActive = currentChannelSlug === channel.slug;
                            return (
                              <button
                                key={channel.slug}
                                onClick={() => {
                                  handleChannelClick(channel.slug);
                                  setShowMoreMenu(false);
                                }}
                                className={`
                                  px-3 py-2 rounded text-sm text-left transition-colors
                                  ${isActive
                                    ? "bg-red-500 text-white font-medium shadow-sm"
                                    : "text-gray-700 hover:bg-gray-50 hover:text-red-500"
                                  }
                                `}
                              >
                                {channel.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
              )}
            </div>

            {/* 移动端汉堡菜单按钮 - 只有当有隐藏频道时才显示 */}
            {hiddenChannelSlugs.size > 0 && (
              <div className="flex-shrink-0 md:hidden ml-2">
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
            )}

          </div>
        </div>
      </section>

      {/* ⏸️ MegaMenu 暂时禁用 */}
      {/* {megaMenuState.isOpen && (
        <MegaMenu
          isOpen={megaMenuState.isOpen}
          channelSlug={megaMenuState.channelSlug}
          channelName={megaMenuState.channelName}
          channelId={megaMenuState.channelId}
          onClose={() => setMegaMenuState((prev) => ({ ...prev, isOpen: false }))}
          triggerRef={activeChannelRef}
          onMouseEnter={cancelCloseMegaMenu}
          onMouseLeave={closeMegaMenu}
        />
      )} */}

      {/* 移动端菜单 - 只显示不在可视区域内的频道 */}
      <MobileChannelMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        channels={scrollableChannels.filter(ch => hiddenChannelSlugs.has(ch.slug))}
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
