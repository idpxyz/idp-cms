"use client";

/**
 * ChannelContext - 重构简化版
 * 
 * 🎯 核心改进：
 * 1. ❌ 删除三层缓存（globalCache、sessionStorage、initialChannels复杂逻辑）
 * 2. ❌ 删除客户端fetch请求（服务端已提供数据）
 * 3. ✅ 简化为纯状态管理 + 路由控制
 * 
 * 数据来源：
 * - 服务端通过initialChannels传入（来自getChannels()）
 * - 客户端只消费，不请求
 */

import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { Channel } from '@/lib/api';

interface ChannelContextType {
  channels: Channel[];
  currentChannelSlug: string;
  switchChannel: (channelSlug: string) => void;
  getCurrentChannel: () => Channel | undefined;
  isNavigating: boolean; // 导航状态
  setContentReady: (ready: boolean) => void; // 🚀 新增：内容就绪状态控制
}

const ChannelContext = createContext<ChannelContextType | undefined>(undefined);

interface ChannelProviderProps {
  children: ReactNode;
  initialChannels: Channel[]; // 必需，来自服务端
}

export function ChannelProvider({ children, initialChannels }: ChannelProviderProps) {
  // Next.js 路由钩子
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // 🚀 性能优化：客户端加载频道数据
  const [channels, setChannels] = useState<Channel[]>(initialChannels || []);
  const [channelsLoading, setChannelsLoading] = useState(initialChannels.length === 0);
  
  // 客户端获取个性化频道
  useEffect(() => {
    if (initialChannels.length > 0) {
      // 如果服务端已提供数据，不需要再获取
      return;
    }
    
    // 客户端获取个性化频道数据
    setChannelsLoading(true);
    fetch('/api/channels/personalized')
      .then(res => res.json())
      .then(data => {
        // API 返回格式：{ channels: [...], strategy: "...", ... }
        setChannels(data.channels || []);
        setChannelsLoading(false);
      })
      .catch(error => {
        console.error('Failed to load channels:', error);
        // 降级：使用默认频道列表
        setChannels([
          { id: 'recommend', slug: 'recommend', name: '推荐', sort_order: 0 } as Channel
        ]);
        setChannelsLoading(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // 🚀 性能优化：使用纯客户端状态管理频道，不依赖路由
  // 初始值从 URL 参数获取（用于页面刷新恢复状态）
  const initialChannelSlug = useMemo(() => {
    if (pathname === '/portal/search') return '';
    return searchParams?.get('channel') || 'recommend';
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  const [currentChannelSlug, setCurrentChannelSlug] = useState<string>(initialChannelSlug);
  
  // 🚀 导航状态：独立管理，确保立即响应
  const [isNavigatingState, setIsNavigatingState] = useState(false);
  
  // 🚀 内容就绪状态：控制骨架屏何时消失（等待异步数据加载完成）
  const [isContentReady, setIsContentReady] = useState(true); // 默认true，推荐频道会主动设为false
  
  // 🔄 监听 URL 参数变化，同步更新频道状态
  // 当通过 router.push() 导航到新频道时，URL 会变化，需要同步更新状态
  useEffect(() => {
    // 只在频道页面内同步 URL 参数
    if (pathname === '/portal' || pathname === '/portal/') {
      const urlChannel = searchParams?.get('channel') || 'recommend';
      if (urlChannel !== currentChannelSlug) {
        setCurrentChannelSlug(urlChannel);
      }
    }
  }, [pathname, searchParams]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // 统一的频道切换函数
  const switchChannel = useCallback((channelSlug: string) => {
    // 🎯 检测是否在频道页面
    const isInPortalPage = pathname === '/portal' || pathname === '/portal/';
    
    // 如果不在频道页面，使用路由导航（例如从文章页跳转到频道页）
    if (!isInPortalPage) {
      const targetUrl = channelSlug === 'recommend' 
        ? '/portal' 
        : `/portal?channel=${channelSlug}`;
      router.push(targetUrl);
      return; // 提前返回，让路由处理后续逻辑
    }
    
    // 🚀 性能优化：在频道页面内切换频道，使用纯客户端状态切换，不触发路由导航
    // 1. 立即显示骨架屏
    setIsNavigatingState(true);
    
    // 2. 重置内容就绪状态（推荐频道需要等待数据加载）
    if (channelSlug === 'recommend') {
      setIsContentReady(false); // 推荐频道需要异步加载数据
    } else {
      setIsContentReady(true); // 其他频道可以立即显示
    }
    
    // 3. 立即更新频道（同步操作）
    setCurrentChannelSlug(channelSlug);
    
    // 4. 更新 URL（不触发路由，仅用于浏览器历史和刷新恢复）
    const params = new URLSearchParams();
    const currentTags = searchParams?.get('tags');
    if (channelSlug && channelSlug !== 'recommend') params.set('channel', channelSlug);
    if (currentTags) params.set('tags', currentTags);
    const qs = params.toString();
    const newUrl = qs ? `/portal?${qs}` : '/portal';
    window.history.replaceState(null, '', newUrl);
    
    // 5. 一帧后结束导航状态（但骨架屏是否消失取决于 isContentReady）
    requestAnimationFrame(() => {
      setIsNavigatingState(false);
    });
  }, [currentChannelSlug, pathname, searchParams, router]);
  
  // 获取当前频道对象
  const getCurrentChannel = useCallback(() => {
    return channels.find(ch => ch.slug === currentChannelSlug);
  }, [channels, currentChannelSlug]);
  
  // 🚀 内容就绪状态控制函数（包装 setter，便于后续扩展）
  const handleSetContentReady = useCallback((ready: boolean) => {
    setIsContentReady(ready);
  }, []);

  // ✅ Context提供状态和方法
  const value: ChannelContextType = {
    channels,
    currentChannelSlug,
    switchChannel,
    getCurrentChannel,
    isNavigating: isNavigatingState || !isContentReady, // 🚀 导航中或内容未就绪时都显示骨架屏
    setContentReady: handleSetContentReady, // 🚀 暴露给子组件，让它们控制内容就绪状态
  };

  return (
    <ChannelContext.Provider value={value}>
      {children}
    </ChannelContext.Provider>
  );
}

export function useChannels(): ChannelContextType {
  const context = useContext(ChannelContext);
  if (context === undefined) {
    throw new Error('useChannels must be used within a ChannelProvider');
  }
  return context;
}
