/**
 * 频道导航组件 - 重构版
 * 
 * 🎯 设计原则：
 * 1. 简单 > 复杂：使用CSS断点而非JavaScript计算
 * 2. 可预测 > 动态：固定断点，用户体验一致
 * 3. CSS > JavaScript：零运行时开销
 * 4. 服务端 > 客户端：100% SSR/CSR一致
 * 
 * 📊 响应式断点（参考主流新闻网站）：
 * - 移动端 (<768px): 汉堡菜单
 * - 平板 (768-1023px): 4个频道
 * - 桌面 (1024-1279px): 6个频道
 * - 超大屏 (≥1280px): 8个频道
 * 
 * 参考项目中其他组件：HeroCarousel, ChannelStrip
 */

"use client";

import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useChannels } from "../ChannelContext";
import { usePersonalizedChannels } from "@/lib/hooks/usePersonalizedChannels";
import {
  sortChannelsByPriority,
  reorderChannelsWithCurrentActive,
  getChannelItemClassName,
  RESPONSIVE_BREAKPOINTS,
  type Channel,
} from "./ChannelNavigation.utils";
import MegaMenu from "./MegaMenu";
import MobileChannelMenu from "./MobileChannelMenu";

interface ChannelNavigationProps {
  channels?: Channel[];
  enablePersonalization?: boolean;
}

export default function ChannelNavigation({
  channels: propChannels,
  enablePersonalization = true,
}: ChannelNavigationProps) {
  const {
    channels: contextChannels,
    currentChannelSlug,
    switchChannel,
    getCurrentChannel,
  } = useChannels();

  const channels = propChannels || contextChannels;

  // 状态管理
  const [isClient, setIsClient] = useState(false);
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

  // 个性化频道
  const {
    channels: personalizedChannels,
    strategy,
    confidence,
  } = usePersonalizedChannels(channels, {
    enabled: enablePersonalization && isClient,
    fallbackToStatic: true,
  });

  // 选择使用个性化频道还是静态频道
  const displayChannels = useMemo(() => {
    if (enablePersonalization && isClient && personalizedChannels.length > 0) {
      return personalizedChannels.map((pCh) => {
        const original = channels.find((ch) => ch.slug === pCh.slug);
        return original
          ? { ...original, id: original.id || original.slug }
          : { id: pCh.slug, name: pCh.name, slug: pCh.slug };
      });
    }
    return channels || [];
  }, [enablePersonalization, isClient, personalizedChannels, channels, strategy]);

  // 按优先级排序并智能重排（当前频道优先）
  const sortedChannels = useMemo(() => {
    // 使用最大断点的数量（8个）作为可见数量
    const maxVisibleCount = RESPONSIVE_BREAKPOINTS.xl.visibleCount;
    return reorderChannelsWithCurrentActive(displayChannels, currentChannelSlug, maxVisibleCount);
  }, [displayChannels, currentChannelSlug]);

  // 分组：前10个用于显示（CSS控制显示数量），其余放入"更多"菜单
  const visibleChannels = sortedChannels.slice(0, 10);
  const moreChannels = sortedChannels.slice(10);

  // 个性化权重
  const channelWeights = useMemo(() => {
    const weights: Record<string, number> = {};
    personalizedChannels.forEach((ch) => {
      weights[ch.slug] = ch.weight || 0;
    });
    return weights;
  }, [personalizedChannels]);

  // 客户端标记
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 点击外部关闭下拉框
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
  }, [switchChannel]);

  const handleChannelMouseEnter = useCallback((channel: Channel, e: React.MouseEvent<HTMLButtonElement>) => {
    openMegaMenu(channel, e.currentTarget);
  }, [openMegaMenu]);

  const handleChannelMouseLeave = useCallback(() => {
    closeMegaMenu();
  }, [closeMegaMenu]);

  // SSR时不渲染（等待客户端hydration）
  if (!isClient) {
    return (
      <section className="bg-white border-b border-gray-200 sticky z-30" style={{ top: "var(--sticky-offset)" }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="h-[52px]" /> {/* 占位，保持高度 */}
        </div>
      </section>
    );
  }

  // 无频道数据
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

  // 个性化状态指示器
  const PersonalizationIndicator = () => {
    if (!enablePersonalization || !isClient || strategy === 'static') return null;

    if (strategy === 'personalized') {
      return (
        <div className="text-xs text-blue-600 flex items-center" title={`个性化置信度: ${Math.round(confidence * 100)}%`}>
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
          个性化
        </div>
      );
    }

    if (strategy === 'hybrid') {
      return (
        <div className="text-xs text-green-600 flex items-center" title={`混合推荐置信度: ${Math.round(confidence * 100)}%`}>
          <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
          智能推荐
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <section className="bg-white border-b border-gray-200 sticky z-30" style={{ top: "var(--sticky-offset)" }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center space-x-4 py-3 md:py-3.5">
            {/* 🎯 主要频道 - 使用CSS控制响应式显示 */}
            <div className="hidden md:flex space-x-4 overflow-x-auto scrollbar-hide">
              {visibleChannels.map((channel, index) => {
                const weight = channelWeights[channel.slug] || 0;
                const isHighWeight = weight > 0.05;
                const isActive = currentChannelSlug === channel.slug;

                return (
                  <div key={channel.slug} className="relative">
                    <button
                      onClick={() => handleChannelClick(channel.slug)}
                      onMouseEnter={(e) => handleChannelMouseEnter(channel, e)}
                      onMouseLeave={handleChannelMouseLeave}
                      className={`
                        ${getChannelItemClassName(index)}
                        flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium
                        whitespace-nowrap transition-all duration-300
                        ${isActive
                          ? "bg-red-500 text-white shadow-lg"
                          : isHighWeight
                          ? "text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200"
                          : "text-gray-600 hover:text-red-500 hover:bg-gray-50"
                        }
                      `}
                      title={weight > 0 ? `推荐权重: ${(weight * 100).toFixed(1)}%` : undefined}
                    >
                      {channel.name}
                      {isHighWeight && index < 3 && strategy === 'personalized' && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* 个性化状态指示器 */}
            <div className="hidden md:flex flex-shrink-0">
              <PersonalizationIndicator />
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

            {/* 更多频道下拉框 - 桌面端显示 */}
            {moreChannels.length > 0 && (
              <div className="relative hidden md:block" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center space-x-1 px-4 py-2 rounded-full text-sm font-medium text-gray-600 hover:text-red-500 hover:bg-gray-50 transition-all"
                >
                  <span>更多</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isDropdownOpen && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    {moreChannels.map((channel) => (
                      <button
                        key={channel.slug}
                        onClick={() => {
                          handleChannelClick(channel.slug);
                          setIsDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-red-500 transition-colors"
                      >
                        {channel.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
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

      {/* 🎨 响应式CSS - 基于断点控制显示数量 */}
      <style jsx>{`
        /* 移动端：全部隐藏（使用汉堡菜单） */
        @media (max-width: 767px) {
          .channel-item {
            display: none !important;
          }
        }

        /* 平板：显示前4个 */
        @media (min-width: 768px) and (max-width: 1023px) {
          .channel-item-4,
          .channel-item-5,
          .channel-item-6,
          .channel-item-7,
          .channel-item-8,
          .channel-item-9 {
            display: none;
          }
        }

        /* 桌面：显示前6个 */
        @media (min-width: 1024px) and (max-width: 1279px) {
          .channel-item-6,
          .channel-item-7,
          .channel-item-8,
          .channel-item-9 {
            display: none;
          }
        }

        /* 超大屏：显示前8个 */
        @media (min-width: 1280px) {
          .channel-item-8,
          .channel-item-9 {
            display: none;
          }
        }

        /* 滚动条隐藏 */
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </>
  );
}
