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

import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { Channel } from '@/lib/api';

interface ChannelContextType {
  channels: Channel[];
  currentChannelSlug: string;
  switchChannel: (channelSlug: string) => void;
  getCurrentChannel: () => Channel | undefined;
  isNavigating: boolean; // 新增：导航状态
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
  const [isPending, startTransition] = useTransition();
  
  // ✅ 简化：直接使用服务端传入的数据，不做缓存检查
  const [channels] = useState<Channel[]>(initialChannels || []);
  
  // 🚀 乐观更新：立即更新选中状态，不等待路由完成
  const [optimisticChannelSlug, setOptimisticChannelSlug] = useState<string | null>(null);

  // 🎯 计算当前频道 slug（优先使用乐观更新的值）
  const urlChannelSlug = useMemo(() => {
    // 在搜索页面不显示任何频道被选中
    if (pathname === '/portal/search') {
      return '';
    }
    // 其他页面使用channel参数，默认为recommend
    return searchParams?.get('channel') || 'recommend';
  }, [pathname, searchParams]);
  
  // 🎯 实际显示的频道 slug（乐观更新 > URL 参数）
  const currentChannelSlug = optimisticChannelSlug || urlChannelSlug;
  
  // 当 URL 真正更新后，清除乐观更新状态
  useEffect(() => {
    if (optimisticChannelSlug && optimisticChannelSlug === urlChannelSlug) {
      setOptimisticChannelSlug(null);
    }
  }, [urlChannelSlug, optimisticChannelSlug]);
  
  // 统一的频道切换函数（带乐观更新）
  const switchChannel = useCallback((channelSlug: string) => {
    // 🚀 立即更新选中状态（乐观更新）
    setOptimisticChannelSlug(channelSlug);
    
    // 保留现有的 tags 查询参数
    const params = new URLSearchParams();
    const currentTags = searchParams?.get('tags');
    if (channelSlug && channelSlug !== 'recommend') params.set('channel', channelSlug);
    if (currentTags) params.set('tags', currentTags);
    const qs = params.toString();
    const newUrl = qs ? `/portal?${qs}` : '/portal';
    
    // 使用 startTransition 包装路由更新，提供更流畅的体验
    startTransition(() => {
      router.push(newUrl);
    });
  }, [router, searchParams, startTransition]);
  
  // 获取当前频道对象
  const getCurrentChannel = useCallback(() => {
    return channels.find(ch => ch.slug === currentChannelSlug);
  }, [channels, currentChannelSlug]);

  // ✅ Context提供状态和方法
  const value: ChannelContextType = {
    channels,
    currentChannelSlug,
    switchChannel,
    getCurrentChannel,
    isNavigating: isPending, // 导航进行中的状态
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
