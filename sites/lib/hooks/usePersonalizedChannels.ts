/**
 * 个性化频道Hook
 * 基于用户兴趣获取和排序频道
 */

import { useState, useEffect, useCallback } from 'react';
import { getUserSession } from '../tracking/user-session';

interface PersonalizedChannel {
  id: string;
  name: string;
  slug: string;
  weight: number;
  reason?: string;
}

interface PersonalizedChannelsResponse {
  channels: PersonalizedChannel[];
  strategy: 'cold_start' | 'hybrid' | 'personalized' | 'fallback';
  confidence: number;
  interests?: Record<string, number>;
  error?: string;
}

interface UsePersonalizedChannelsOptions {
  enabled?: boolean;
  fallbackToStatic?: boolean;
  cacheTime?: number;
}

export function usePersonalizedChannels(
  staticChannels: Array<{id: string, name: string, slug: string}> = [],
  options: UsePersonalizedChannelsOptions = {}
) {
  const {
    enabled = true,
    fallbackToStatic = true,
    cacheTime = 5 * 60 * 1000 // 5分钟缓存
  } = options;

  const [personalizedChannels, setPersonalizedChannels] = useState<PersonalizedChannel[]>([]);
  const [strategy, setStrategy] = useState<string>('loading');
  const [confidence, setConfidence] = useState<number>(0);
  const [interests, setInterests] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 缓存键
  const getCacheKey = useCallback(() => {
    const session = getUserSession();
    return `personalized-channels-${session.deviceId}`;
  }, []);

  // 从缓存加载
  const loadFromCache = useCallback((): PersonalizedChannelsResponse | null => {
    if (typeof window === 'undefined') return null;
    
    try {
      const cacheKey = getCacheKey();
      const cached = sessionStorage.getItem(cacheKey);
      const cacheTimeKey = `${cacheKey}-time`;
      const cachedTimestamp = sessionStorage.getItem(cacheTimeKey);
      
      if (cached && cachedTimestamp) {
        const age = Date.now() - parseInt(cachedTimestamp);
        if (age < cacheTime) {
          return JSON.parse(cached);
        }
      }
    } catch (error) {
      console.warn('Failed to load personalized channels from cache:', error);
    }
    
    return null;
  }, [getCacheKey, cacheTime]);

  // 保存到缓存
  const saveToCache = useCallback((data: PersonalizedChannelsResponse) => {
    if (typeof window === 'undefined') return;
    
    try {
      const cacheKey = getCacheKey();
      const cacheTimeKey = `${cacheKey}-time`;
      
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
      sessionStorage.setItem(cacheTimeKey, Date.now().toString());
    } catch (error) {
      console.warn('Failed to save personalized channels to cache:', error);
    }
  }, [getCacheKey]);

  // 获取个性化频道
  const fetchPersonalizedChannels = useCallback(async (): Promise<PersonalizedChannelsResponse> => {
    const session = getUserSession();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Device-ID': session.deviceId,
      'X-Session-ID': session.sessionId,
      'X-User-ID': session.userId,
    };


    const response = await fetch('/api/channels/personalized', {
      headers,
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: PersonalizedChannelsResponse = await response.json();
    

    return data;
  }, []);

  // 主加载逻辑
  const loadChannels = useCallback(async () => {
    if (!enabled) {
      // 禁用个性化时，转换静态频道格式
      const staticPersonalized: PersonalizedChannel[] = staticChannels.map((ch, index) => ({
        ...ch,
        weight: 1.0 / staticChannels.length,
        reason: '静态配置'
      }));
      
      setPersonalizedChannels(staticPersonalized);
      setStrategy('static');
      setConfidence(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. 尝试从缓存加载
      const cached = loadFromCache();
      if (cached) {
        setPersonalizedChannels(cached.channels);
        setStrategy(cached.strategy);
        setConfidence(cached.confidence);
        setInterests(cached.interests || {});
        setLoading(false);
        return;
      }

      // 2. 从API获取
      const data = await fetchPersonalizedChannels();
      
      // 3. 更新状态
      setPersonalizedChannels(data.channels);
      setStrategy(data.strategy);
      setConfidence(data.confidence);
      setInterests(data.interests || {});
      
      // 4. 保存到缓存
      saveToCache(data);
      
    } catch (err) {
      console.error('❌ Failed to load personalized channels:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      
      // 降级到静态频道
      if (fallbackToStatic && staticChannels.length > 0) {
        const fallbackPersonalized: PersonalizedChannel[] = staticChannels.map(ch => ({
          ...ch,
          weight: 1.0 / staticChannels.length,
          reason: '降级策略'
        }));
        
        setPersonalizedChannels(fallbackPersonalized);
        setStrategy('fallback');
        setConfidence(0);
      }
    } finally {
      setLoading(false);
    }
  }, [enabled, staticChannels, fallbackToStatic, loadFromCache, fetchPersonalizedChannels, saveToCache]);

  // 刷新个性化频道
  const refresh = useCallback(async () => {
    // 清除缓存
    if (typeof window !== 'undefined') {
      try {
        const cacheKey = getCacheKey();
        sessionStorage.removeItem(cacheKey);
        sessionStorage.removeItem(`${cacheKey}-time`);
      } catch (error) {
        console.warn('Failed to clear cache:', error);
      }
    }
    
    await loadChannels();
  }, [getCacheKey, loadChannels]);

  // 初始加载
  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  // 返回Hook接口
  return {
    channels: personalizedChannels,
    strategy,
    confidence,
    interests,
    loading,
    error,
    refresh,
    
    // 调试信息
    debug: {
      enabled,
      cacheKey: typeof window !== 'undefined' ? getCacheKey() : 'ssr',
      staticChannelsCount: staticChannels.length,
      personalizedChannelsCount: personalizedChannels.length
    }
  };
}
