"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { endpoints } from "@/lib/config/endpoints";
import { getMainSite } from "@/lib/config/sites";

// 全局缓存，防止多次加载
let globalChannelsCache: Channel[] | null = null;
let globalChannelsCacheTime: number = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10分钟缓存
const STORAGE_KEY = 'idp-cms-channels-cache';
const STORAGE_TIME_KEY = 'idp-cms-channels-cache-time';

// 从浏览器存储加载缓存
const loadChannelsFromStorage = (): { channels: Channel[] | null; cacheTime: number } => {
  try {
    if (typeof window === 'undefined') return { channels: null, cacheTime: 0 };
    
    const storedChannels = sessionStorage.getItem(STORAGE_KEY);
    const storedTime = sessionStorage.getItem(STORAGE_TIME_KEY);
    
    if (storedChannels && storedTime) {
      const channels = JSON.parse(storedChannels);
      const cacheTime = parseInt(storedTime);
      
      // 检查缓存是否仍然有效
      if (Date.now() - cacheTime < CACHE_DURATION) {
        return { channels, cacheTime };
      }
    }
  } catch (error) {
    console.warn('Failed to load channels from storage:', error);
  }
  
  return { channels: null, cacheTime: 0 };
};

// 保存频道到浏览器存储
const saveChannelsToStorage = (channels: Channel[], cacheTime: number) => {
  try {
    if (typeof window === 'undefined') return;
    
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(channels));
    sessionStorage.setItem(STORAGE_TIME_KEY, cacheTime.toString());
  } catch (error) {
    console.warn('Failed to save channels to storage:', error);
  }
};

interface Channel {
  id: string;
  name: string;
  slug: string;
  order?: number;
  
  // 🆕 首页显示配置（简化版）
  show_in_homepage?: boolean;      // 是否在首页显示频道条带
  homepage_order?: number;         // 首页显示顺序
  
  // 🎨 模板配置（新版）
  template?: {                     // 关联的模板信息
    id: number;
    name: string;
    slug: string;
    file_name: string;
  } | null;
}

interface ChannelContextType {
  channels: Channel[];
  loading: boolean;
  error: string | null;
  refreshChannels: () => Promise<void>;
  // 新增的统一频道管理接口
  currentChannelSlug: string;
  switchChannel: (channelSlug: string) => void;
  getCurrentChannel: () => Channel | undefined;
}

const ChannelContext = createContext<ChannelContextType | undefined>(undefined);

// 最小化默认频道列表 - 仅包含首页频道，避免硬编码数据库频道
// 真实频道数据应该完全来自数据库API
const DEFAULT_CHANNELS: Channel[] = [
  { id: "recommend", name: "首页", slug: "recommend", order: -1 },
];

interface ChannelProviderProps {
  children: ReactNode;
  initialChannels?: Channel[];
}

export function ChannelProvider({ children, initialChannels }: ChannelProviderProps) {
  // Next.js 路由钩子
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // 初始化时优先使用缓存数据
  const getInitialChannels = (): Channel[] => {
    const now = Date.now();
    
    // 首先检查全局内存缓存
    if (globalChannelsCache && (now - globalChannelsCacheTime) < CACHE_DURATION) {
      console.log('Using global cached channels data');
      return globalChannelsCache;
    }
    
    // 然后检查浏览器存储缓存
    const { channels: storedChannels, cacheTime: storedTime } = loadChannelsFromStorage();
    if (storedChannels) {
      console.log('Using stored channels data');
      // 同步到全局缓存
      globalChannelsCache = storedChannels;
      globalChannelsCacheTime = storedTime;
      return storedChannels;
    }
    
    // 最后使用提供的初始数据或默认数据
    const channels = initialChannels || DEFAULT_CHANNELS;
    
    // 如果提供了初始数据，更新缓存
    if (initialChannels && initialChannels.length > 0) {
      globalChannelsCache = initialChannels;
      globalChannelsCacheTime = now;
      saveChannelsToStorage(initialChannels, now);
    }
    
    return channels;
  };

  const [channels, setChannels] = useState<Channel[]>(getInitialChannels);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🎯 新的统一频道管理逻辑
  const currentChannelSlug = useMemo(() => {
    // 在搜索页面不显示任何频道被选中
    if (pathname === '/portal/search') {
      return '';
    }
    // 其他页面使用channel参数，默认为recommend
    return searchParams.get('channel') || 'recommend';
  }, [pathname, searchParams]);
  
  // 统一的频道切换函数
  const switchChannel = useCallback((channelSlug: string) => {
    console.log('🔄 Switching channel to:', channelSlug, 'from:', pathname);
    
    // 保留现有的 tags 查询参数
    const params = new URLSearchParams();
    const currentTags = searchParams.get('tags');
    if (channelSlug && channelSlug !== 'recommend') params.set('channel', channelSlug);
    if (currentTags) params.set('tags', currentTags);
    const qs = params.toString();
    const newUrl = qs ? `/portal?${qs}` : '/portal';
    
    console.log('🎯 Navigating to:', newUrl);
    router.push(newUrl);
  }, [router, pathname, searchParams]);
  
  // 获取当前频道对象
  const getCurrentChannel = useCallback(() => {
    return channels.find(ch => ch.slug === currentChannelSlug);
  }, [channels, currentChannelSlug]);

  const fetchChannels = async (): Promise<Channel[]> => {
    try {
      const channelsUrl = endpoints.buildUrl(
        endpoints.getCmsEndpoint('/api/channels'),
        { site: getMainSite().hostname }
      );

      const fetchConfig = endpoints.createFetchConfig({
        timeout: 15000, // 增加超时时间
        next: { 
          revalidate: 3600,
          tags: ['channels']
        },
      });

      const response = await fetch(channelsUrl, fetchConfig);

      if (response.ok) {
        const data = await response.json();
        
        // 检查是否有有效的频道数据
        if (!data.channels || !Array.isArray(data.channels) || data.channels.length === 0) {
          console.warn('Backend returned empty or invalid channels data');
          throw new Error('Invalid channels data from backend');
        }
        
        console.log('Successfully fetched channels from backend:', data.channels.length);
        
        const channels = data.channels;
        const recommendChannel = { id: "recommend", name: "首页", slug: "recommend", order: -1 };
        const otherChannels = channels
          .filter((ch: any) => ch.slug !== "recommend")
          .map((ch: any) => ({
            ...ch,
            id: ch.slug // 使用slug作为ID，保持与前端期望的字符串ID一致
          }));
        
        return [recommendChannel, ...otherChannels];
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.warn(`Backend API error: ${response.status} - ${errorData.error || response.statusText}`);
        throw new Error(`Backend API error: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching channels from backend:', error);
      throw error;
    }
  };

  const refreshChannels = async () => {
    setLoading(true);
    setError(null);
    try {
      const newChannels = await fetchChannels();
      setChannels(newChannels);
      
      // 更新全局缓存和浏览器存储
      const now = Date.now();
      globalChannelsCache = newChannels;
      globalChannelsCacheTime = now;
      saveChannelsToStorage(newChannels, now);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch channels');
      // API失败时只保留首页频道，不使用硬编码的数据库频道
      console.warn('Failed to fetch channels, using minimal fallback');
      setChannels(DEFAULT_CHANNELS);
    } finally {
      setLoading(false);
    }
  };

  // 只在客户端初始化时获取一次频道数据（如果没有提供初始数据且缓存已过期）
  useEffect(() => {
    const now = Date.now();
    const hasFreshGlobalCache = globalChannelsCache && (now - globalChannelsCacheTime) < CACHE_DURATION;
    const { channels: storedChannels } = loadChannelsFromStorage();
    const hasFreshStoredCache = storedChannels && storedChannels.length > 0;
    
    // 只有在没有初始数据且所有缓存都已过期的情况下才获取新数据
    if (!initialChannels && !hasFreshGlobalCache && !hasFreshStoredCache) {
      console.log('Fetching fresh channels data - no cache available');
      refreshChannels();
    } else {
      console.log('Skipping channels fetch - using cached or initial data');
    }
  }, []); // 移除依赖，避免重复执行

  const value: ChannelContextType = {
    channels,
    loading,
    error,
    refreshChannels,
    // 新的统一接口
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
