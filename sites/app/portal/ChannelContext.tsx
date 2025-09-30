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

import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { Channel } from '@/lib/api';

interface ChannelContextType {
  channels: Channel[];
  currentChannelSlug: string;
  switchChannel: (channelSlug: string) => void;
  getCurrentChannel: () => Channel | undefined;
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
  
  // ✅ 简化：直接使用服务端传入的数据，不做缓存检查
  // 🔍 调试：打印接收到的频道数据
  // 已移除频道日志输出，减少控制台噪音
  // if (typeof window !== 'undefined' && initialChannels.length > 0) {
  //   console.log(`📋 ChannelProvider 接收到 ${initialChannels.length} 个频道:`, 
  //     initialChannels.map(ch => `${ch.name}(${ch.slug})`).join(', ')
  //   );
  // }
  
  const [channels] = useState<Channel[]>(initialChannels || []);

  // 🎯 新的统一频道管理逻辑
  const currentChannelSlug = useMemo(() => {
    // 在搜索页面不显示任何频道被选中
    if (pathname === '/portal/search') {
      return '';
    }
    // 其他页面使用channel参数，默认为recommend
    return searchParams?.get('channel') || 'recommend';
  }, [pathname, searchParams]);
  
  // 统一的频道切换函数
  const switchChannel = useCallback((channelSlug: string) => {
    // console.log('🔄 Switching channel to:', channelSlug, 'from:', pathname); // 减少控制台噪音
    
    // 保留现有的 tags 查询参数
    const params = new URLSearchParams();
    const currentTags = searchParams ?.get('tags');
    if (channelSlug && channelSlug !== 'recommend') params.set('channel', channelSlug);
    if (currentTags) params.set('tags', currentTags);
    const qs = params.toString();
    const newUrl = qs ? `/portal?${qs}` : '/portal';
    
    // console.log('🎯 Navigating to:', newUrl); // 减少控制台噪音
    router.push(newUrl);
  }, [router, pathname, searchParams]);
  
  // 获取当前频道对象
  const getCurrentChannel = useCallback(() => {
    return channels.find(ch => ch.slug === currentChannelSlug);
  }, [channels, currentChannelSlug]);

  // ✅ Context只提供状态和方法，不负责数据获取
  const value: ChannelContextType = {
    channels,
    currentChannelSlug,
    switchChannel,
    getCurrentChannel,
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
