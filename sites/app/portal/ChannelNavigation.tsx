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
import { useRouter, usePathname } from "next/navigation";
import { useChannels } from "./ChannelContext";

interface Channel {
  id: string;
  name: string;
  slug: string;
}

interface ChannelNavigationProps {
  channels?: Channel[]; // 现在是可选的，优先使用 Context
}

function ChannelNavigation({
  channels: propChannels,
}: ChannelNavigationProps) {
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
  
  // 🎯 新架构：不再需要复杂的状态管理
  // activeChannel 直接从 Context 获取

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
          console.log('🧪 Testing channel switch to:', channelSlug);
          switchChannel(channelSlug);
        }
      };
    }
  }, [isClient, currentChannelSlug, channels, loading, error, getCurrentChannel, switchChannel]);
  // 🎯 新架构：简化的响应式布局 - 修复水合不匹配
  const [visibleCount, setVisibleCount] = useState(6);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 🎯 修复水合不匹配：先标记客户端已加载
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 🎯 新架构：简化的响应式处理 - 只在客户端执行
  useEffect(() => {
    if (!isClient) return;
    
    const handleResize = () => {
      // 简化的响应式逻辑，基于屏幕宽度
      const width = window.innerWidth;
      if (width < 640) {
        setVisibleCount(3);
      } else if (width < 1024) {
        setVisibleCount(5);
      } else {
        setVisibleCount(7);
      }
    };

    handleResize(); // 初始化
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isClient]);

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

  // 🎯 新架构：极简的频道点击处理
  const handleChannelClick = useCallback((channelSlug: string) => {
    console.log('🔘 Channel clicked:', channelSlug);
    
    // 如果点击的是当前频道，滚动到顶部
    if (currentChannelSlug === channelSlug) {
      console.log('📜 Same channel clicked, scrolling to top');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // 关闭下拉菜单
    setIsDropdownOpen(false);
    
    // 使用统一的切换函数 - 自动处理所有页面和状态
    switchChannel(channelSlug);
  }, [currentChannelSlug, switchChannel]);

  // 🎯 新架构：简化的频道列表计算 - 修复水合不匹配
  const { visibleChannels, moreChannels } = useMemo(() => {
    // 在客户端未加载前，使用固定数量避免水合不匹配
    const count = isClient ? visibleCount : 6;
    return {
      visibleChannels: channels.slice(0, count),
      moreChannels: channels.slice(count),
    };
  }, [channels, visibleCount, isClient]);

  // 🎯 修复水合不匹配：在客户端未加载前显示占位符
  if (!isClient) {
    return (
      <section className="bg-white border-b border-gray-200 sticky z-30" style={{ top: "var(--sticky-offset)" }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center space-x-4 py-3 md:py-3.5">
            <div className="flex space-x-4">
              {/* 占位符按钮 - 与服务端渲染保持一致 */}
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-400 animate-pulse"
                >
                  加载中...
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
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

  return (
    <section className="bg-white border-b border-gray-200 sticky z-30" style={{ top: "var(--sticky-offset)" }}>
      <div className="max-w-7xl mx-auto px-4">
        <div
          className="flex items-center space-x-4 py-3 md:py-3.5 transition-all duration-200"
          ref={containerRef}
        >
          {/* 主要频道 - 根据容器宽度动态显示 */}
          <div className="flex space-x-4 overflow-x-auto scrollbar-hide">
            {visibleChannels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => handleChannelClick(channel.slug)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  currentChannelSlug === channel.slug
                    ? "bg-red-500 text-white"
                    : "text-gray-600 hover:text-red-500"
                }`}
              >
                {channel.name}
              </button>
            ))}
          </div>

          {/* 更多频道下拉框 */}
          {moreChannels.length > 0 && (
            <div className="relative" ref={dropdownRef}>
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
                      {moreChannels.map((channel) => (
                        <button
                          key={channel.id}
                          onClick={() => handleChannelClick(channel.slug)}
                          className={`px-3 py-2 text-sm rounded-md transition-colors text-center whitespace-nowrap ${
                            currentChannelSlug === channel.slug
                              ? "bg-red-50 text-red-500"
                              : "text-gray-700 hover:bg-gray-50 hover:text-red-500"
                          }`}
                        >
                          {channel.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// 使用 memo 优化组件重新渲染
export default memo(ChannelNavigation);
