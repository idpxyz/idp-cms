"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  memo,
  useMemo,
} from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useChannels } from "./ChannelContext";
import { usePersonalizedChannels } from "@/lib/hooks/usePersonalizedChannels";
import MegaMenu from "./components/MegaMenu";
import MobileChannelMenu from "./components/MobileChannelMenu";

interface Channel {
  id: string;
  name: string;
  slug: string;
}

interface ChannelNavigationProps {
  channels?: Channel[]; // 现在是可选的，优先使用 Context
  enablePersonalization?: boolean; // 是否启用个性化
}

function ChannelNavigation({
  channels: propChannels,
  enablePersonalization = true,
}: ChannelNavigationProps) {
  const searchParams = useSearchParams();
  const { 
    channels: contextChannels, 
    loading, 
    error, 
    currentChannelSlug, 
    switchChannel,
    getCurrentChannel 
  } = useChannels();
  
  const channels = propChannels || contextChannels;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  // MegaMenu 状态管理
  const [megaMenuState, setMegaMenuState] = useState<{
    isOpen: boolean;
    channelSlug: string;
    channelName: string;
    channelId: string;
  }>({
    isOpen: false,
    channelSlug: '',
    channelName: '',
    channelId: '',
  });
  const [megaMenuTimer, setMegaMenuTimer] = useState<NodeJS.Timeout | null>(null);
  const activeChannelRef = useRef<HTMLButtonElement | null>(null);
  
  // 移动端菜单状态
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // 🎯 个性化频道Hook
  const {
    channels: personalizedChannels,
    strategy,
    confidence,
    interests,
    loading: personalizationLoading,
    error: personalizationError,
    refresh: refreshPersonalization,
  } = usePersonalizedChannels(channels, {
    enabled: enablePersonalization && isClient,
    fallbackToStatic: true,
  });
  
  // 选择使用个性化频道还是静态频道
  const displayChannels = useMemo(() => {
    // 如果个性化已启用、已加载完成且有数据，使用个性化频道
    if (enablePersonalization && isClient && !personalizationLoading && personalizedChannels.length > 0 && strategy !== 'static') {
      const mapped = personalizedChannels
        .filter(ch => ch.slug && ch.name) // 过滤掉无效频道
        .map(ch => ({ 
          id: ch.id || ch.slug, // 使用slug作为备用ID
          name: ch.name, 
          slug: ch.slug 
        }));
      
      
      return mapped;
    }
    
    // 否则使用静态频道（包含推荐频道）
    
    return channels || [];
  }, [enablePersonalization, isClient, personalizationLoading, personalizedChannels, channels, strategy]);
    

  
  // 🎯 新架构：不再需要复杂的状态管理
  // activeChannel 直接从 Context 获取

  // 🎯 新架构：简化的响应式布局 - 修复水合不匹配
  const [visibleCount, setVisibleCount] = useState(6);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 智能频道列表计算将在下面定义
  const { visibleChannels, moreChannels, channelWeights } = useMemo(() => {
    let channelsToUse = displayChannels;
    let weights: Record<string, number> = {};
    
    // 如果有个性化数据，直接使用个性化频道的顺序（API已经排序好了）
    if (enablePersonalization && isClient && personalizedChannels.length > 0) {
      weights = personalizedChannels.reduce((acc, ch) => {
        acc[ch.slug] = ch.weight || 0;
        return acc;
      }, {} as Record<string, number>);
      
      // 直接使用displayChannels，因为它们已经是正确映射的个性化频道
      // API已经确保推荐频道在第一位，其他频道按权重排序
      channelsToUse = displayChannels;
      
    }
    
    // 响应式显示：根据屏幕大小决定直接显示多少个，其余放入"更多"
    const count = isClient ? visibleCount : 8;
    
    // 智能重排：如果当前选中的频道在"更多"区域，将其移到显示区域的最后
    let finalChannelsToUse = [...channelsToUse];
    if (currentChannelSlug && count > 0) {
      const currentChannelIndex = finalChannelsToUse.findIndex(ch => ch.slug === currentChannelSlug);
      
      // 如果当前频道在"更多"区域（索引 >= count）
      if (currentChannelIndex >= count) {
        const currentChannel = finalChannelsToUse[currentChannelIndex];
        const visibleChannels = finalChannelsToUse.slice(0, count);
        const moreChannels = finalChannelsToUse.slice(count);
        
        // 移除当前频道从更多列表
        const updatedMoreChannels = moreChannels.filter(ch => ch.slug !== currentChannelSlug);
        
        // 将显示区域最后一个频道移到更多列表开头
        const lastVisibleChannel = visibleChannels[visibleChannels.length - 1];
        const updatedVisibleChannels = [...visibleChannels.slice(0, -1), currentChannel];
        
        // 重新组合
        finalChannelsToUse = [...updatedVisibleChannels, lastVisibleChannel, ...updatedMoreChannels];
      }
    }
    
    const result = {
      visibleChannels: finalChannelsToUse.slice(0, count),
      moreChannels: finalChannelsToUse.slice(count),
      channelWeights: weights,
    };

    return result;
  }, [displayChannels, visibleCount, isClient, enablePersonalization, personalizedChannels, currentChannelSlug]);

  // 🎯 新架构：简化的调试工具 - 修复水合不匹配
  useEffect(() => {
    if (isClient) {
      (window as any).debugChannelNav = {
        currentChannelSlug,
        channels: channels.map(ch => ({ id: ch.id, name: ch.name, slug: ch.slug })),
        loading,
        error,
        getCurrentChannel,
        testChannelSwitch: (channelSlug: string) => {
          switchChannel(channelSlug);
        }
      };
    }
  }, [isClient, currentChannelSlug, channels, loading, error, getCurrentChannel, switchChannel]);

  // 🎯 修复水合不匹配：先标记客户端已加载
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 🎯 真正的自适应计算 - 根据容器实际宽度动态计算
  useEffect(() => {
    if (!isClient) return;
    
    const calculateVisibleCount = () => {
      const container = containerRef.current;
      if (!container || displayChannels.length === 0) return;
      
      // 获取容器可用宽度
      const containerWidth = container.offsetWidth;
      
      // 预留空间给"更多"按钮和边距
      const moreButtonWidth = 80; // "更多"按钮宽度
      const spacing = 16; // space-x-4 = 16px
      const padding = 32; // 左右padding
      const availableWidth = containerWidth - moreButtonWidth - padding;
      
      // 估算单个频道按钮的平均宽度
      // 基于频道名称长度和padding计算
      const estimateButtonWidth = (name: string) => {
        // 中文字符约14px，英文字符约8px，加上padding 32px
        const chineseChars = (name.match(/[\u4e00-\u9fa5]/g) || []).length;
        const otherChars = name.length - chineseChars;
        return chineseChars * 14 + otherChars * 8 + 32;
      };
      
      let totalWidth = 0;
      let count = 0;
      
      for (const channel of displayChannels) {
        const buttonWidth = estimateButtonWidth(channel.name);
        const widthWithSpacing = totalWidth === 0 ? buttonWidth : totalWidth + spacing + buttonWidth;
        
        if (widthWithSpacing <= availableWidth) {
          totalWidth = widthWithSpacing;
          count++;
        } else {
          break;
        }
      }
      
      // 至少显示1个频道，最多显示所有频道
      const newVisibleCount = Math.max(1, Math.min(count, displayChannels.length));
      setVisibleCount(newVisibleCount);
    };

    // 使用 ResizeObserver 监听容器大小变化
    const resizeObserver = new ResizeObserver(() => {
      calculateVisibleCount();
    });
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    // 初始计算
    setTimeout(calculateVisibleCount, 0);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [isClient, displayChannels]);

  // 点击外部关闭下拉框
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // 🎯 新架构：不再需要复杂的浏览器事件监听
  // URL 参数变化会自动通过 Context 反映到组件

  // MegaMenu 控制函数
  const openMegaMenu = useCallback((channel: Channel, buttonRef: HTMLButtonElement) => {
    // 清除之前的定时器
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
    // 清除定时器
    if (megaMenuTimer) {
      clearTimeout(megaMenuTimer);
      setMegaMenuTimer(null);
    }

    setMegaMenuState({
      isOpen: false,
      channelSlug: '',
      channelName: '',
      channelId: '',
    });
    activeChannelRef.current = null;
  }, [megaMenuTimer]);

  const scheduleCloseMegaMenu = useCallback(() => {
    // 清除之前的定时器
    if (megaMenuTimer) {
      clearTimeout(megaMenuTimer);
    }

    // 设置延迟关闭
    const timer = setTimeout(() => {
      closeMegaMenu();
    }, 300); // 300ms延迟，给用户移动到菜单的时间

    setMegaMenuTimer(timer);
  }, [megaMenuTimer, closeMegaMenu]);

  // 处理频道悬停
  const handleChannelMouseEnter = useCallback((channel: Channel, event: React.MouseEvent<HTMLButtonElement>) => {
    if (!isClient) return;
    
    const buttonElement = event.currentTarget;
    
    // 延迟显示 MegaMenu，避免误触
    const timer = setTimeout(() => {
      openMegaMenu(channel, buttonElement);
    }, 200);

    setMegaMenuTimer(timer);
  }, [isClient, openMegaMenu]);

  const handleChannelMouseLeave = useCallback(() => {
    scheduleCloseMegaMenu();
  }, [scheduleCloseMegaMenu]);

  // 处理 MegaMenu 区域悬停
  const handleMegaMenuMouseEnter = useCallback(() => {
    // 清除关闭定时器
    if (megaMenuTimer) {
      clearTimeout(megaMenuTimer);
      setMegaMenuTimer(null);
    }
  }, [megaMenuTimer]);

  const handleMegaMenuMouseLeave = useCallback(() => {
    scheduleCloseMegaMenu();
  }, [scheduleCloseMegaMenu]);

  // 🎯 智能频道点击处理 - 支持动态重排
  const handleChannelClick = useCallback((channelSlug: string, isFromMoreMenu: boolean = false) => {
    
    // 关闭 MegaMenu
    closeMegaMenu();
    
    // 如果点击的是当前频道，滚动到顶部
    if (currentChannelSlug === channelSlug) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setIsDropdownOpen(false);
      return;
    }

    // 关闭下拉菜单
    setIsDropdownOpen(false);
    
    // 如果是从"更多"菜单点击的频道，需要重新排列显示顺序
    if (isFromMoreMenu) {
      // 这里我们先切换频道，重排逻辑在 useMemo 中处理
      switchChannel(channelSlug);
    } else {
      // 直接切换频道
      switchChannel(channelSlug);
    }
  }, [currentChannelSlug, switchChannel]);
  

  // 🎯 修复水合不匹配：使用真实channels数据渲染占位符，确保高度一致
  if (!isClient) {
    // 如果有channels数据，渲染真实的频道按钮（禁用状态）
    if (channels.length > 0) {
      return (
        <section className="bg-white border-b border-gray-200 sticky z-30" style={{ top: "var(--sticky-offset)" }}>
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center space-x-4 py-3 md:py-3.5">
              <div className="flex space-x-4">
                {/* 使用真实频道数据，确保占位符和hydration后的内容完全一致 */}
                {channels.slice(0, 8).map((channel) => (
                  <div key={channel.slug} className="relative">
                    <button
                      disabled
                      className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium text-gray-600 hover:text-red-500 hover:bg-gray-50 whitespace-nowrap"
                    >
                      {channel.name}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      );
    }
    
    // 如果没有channels数据，返回null避免占据空间
    return null;
  }

  // 如果没有频道数据且不在加载中，显示错误提示
  if (!loading && channels.length === 0) {
    return (
      <section className="bg-white border-b border-gray-200 sticky z-30" style={{ top: "var(--sticky-offset)" }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-center py-3 md:py-3.5">
            <div className="text-gray-500 text-sm">
              {error ? `频道加载失败: ${error}` : '暂无频道数据'}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // 🎯 个性化状态指示器
  const getPersonalizationIndicator = () => {
    if (!enablePersonalization || !isClient) return null;
    
    if (personalizationLoading) {
      return (
        <div className="text-xs text-gray-400 flex items-center">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse mr-1"></div>
          智能排序中...
        </div>
      );
    }
    
    if (strategy === 'personalized') {
      return (
        <div className="text-xs text-blue-600 flex items-center" title={`个性化置信度: ${Math.round(confidence * 100)}%`}>
          <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
          个性化 {Math.round(confidence * 100)}%
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
    <section className="bg-white border-b border-gray-200 sticky z-30" style={{ top: "var(--sticky-offset)" }}>
      <div className="max-w-7xl mx-auto px-4">
        <div
          className="flex items-center space-x-4 py-3 md:py-3.5 transition-all duration-200"
          ref={containerRef}
        >
          {/* 主要频道 - 根据容器宽度动态显示 */}
          <div className="flex space-x-4 overflow-x-auto scrollbar-hide">
            {visibleChannels.map((channel, index) => {
              const weight = channelWeights[channel.slug] || 0;
              const isHighWeight = weight > 0.05; // 权重超过5%认为是推荐频道
              const isTopRecommended = index < 3 && strategy === 'personalized'; // 前3个且个性化
              
              return (
                <div key={channel.slug} className="relative">
                  <button
                    onClick={() => handleChannelClick(channel.slug)}
                    onMouseEnter={(e) => handleChannelMouseEnter(channel, e)}
                    onMouseLeave={handleChannelMouseLeave}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap relative ${
                      currentChannelSlug === channel.slug
                        ? "bg-red-500 text-white shadow-lg"
                        : isHighWeight
                        ? "text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200"
                        : "text-gray-600 hover:text-red-500 hover:bg-gray-50"
                    }`}
                    title={weight > 0 ? `推荐权重: ${(weight * 100).toFixed(1)}%` : undefined}
                  >
                    {channel.name}
                    {isTopRecommended && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* 个性化状态指示器 */}
          <div className="flex-shrink-0">
            {getPersonalizationIndicator()}
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
                  className={`w-4 h-4 transition-transform ${
                    isDropdownOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* 下拉菜单 */}
              {isDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-w-[calc(100vw-2rem)] sm:w-80 overflow-hidden">
                  <div className="p-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                      {moreChannels.map((channel) => {
                        const weight = channelWeights[channel.slug] || 0;
                        const isRecommended = weight > 0.05;
                        
                        return (
                          <button
                            key={channel.slug}
                            onClick={() => handleChannelClick(channel.slug, true)}
                            className={`px-3 py-2 text-sm rounded-md transition-colors text-center whitespace-nowrap relative ${
                              currentChannelSlug === channel.slug
                                ? "bg-red-50 text-red-500"
                                : isRecommended
                                ? "text-red-600 hover:bg-red-50 border border-red-200"
                                : "text-gray-700 hover:bg-gray-50 hover:text-red-500"
                            }`}
                            title={weight > 0 ? `推荐权重: ${(weight * 100).toFixed(1)}%` : undefined}
                          >
                            {channel.name}
                            {isRecommended && (
                              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-400 rounded-full"></span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {moreChannels.length === 0 && (
                      <div className="text-center py-4 text-sm text-gray-500">
                        所有频道已显示在上方
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* MegaMenu */}
      {megaMenuState.isOpen && (
        <div
          onMouseEnter={handleMegaMenuMouseEnter}
          onMouseLeave={handleMegaMenuMouseLeave}
        >
          <MegaMenu
            channelId={megaMenuState.channelId}
            channelName={megaMenuState.channelName}
            channelSlug={megaMenuState.channelSlug}
            isOpen={megaMenuState.isOpen}
            onClose={closeMegaMenu}
            triggerRef={activeChannelRef}
            className="animate-in fade-in duration-200"
          />
        </div>
      )}

      {/* 移动端频道菜单 */}
      <MobileChannelMenu
        channels={channels}
        currentChannelSlug={currentChannelSlug}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
    </section>
  );
}

// 使用 memo 优化组件重新渲染
export default memo(ChannelNavigation);
