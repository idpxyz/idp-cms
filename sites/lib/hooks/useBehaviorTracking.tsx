/**
 * 用户行为追踪Hook
 * 
 * 功能：
 * 1. 自动追踪页面浏览
 * 2. 追踪用户互动（点赞、收藏、分享）
 * 3. 追踪搜索行为
 * 4. 管理会话和设备ID
 */

import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/context/AuthContext';

// 类型定义
interface TrackingEvent {
  event: string;
  article_id?: number;
  user_id?: string;
  device_id: string;
  session_id: string;
  dwell_ms?: number;
  search_query?: string;
  referrer?: string;
  channel?: string;
  site?: string;
  [key: string]: any;
}

interface BehaviorTrackingHook {
  trackView: (articleId: number, additionalData?: Record<string, any>) => void;
  trackInteraction: (articleId: number, type: 'like' | 'favorite' | 'share' | 'comment', additionalData?: Record<string, any>) => void;
  trackSearch: (query: string, resultCount?: number, clickedArticleId?: number) => void;
  trackCustomEvent: (eventType: string, data?: Record<string, any>) => void;
}

// 设备ID生成和存储
const getDeviceId = (): string => {
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
};

// 会话ID生成和存储
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('session_id');
  if (!sessionId) {
    sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('session_id', sessionId);
  }
  return sessionId;
};

// 获取站点标识
const getSiteIdentifier = (): string => {
  return window.location.hostname || 'localhost';
};

// 发送追踪事件到后端
const sendTrackingEvent = async (eventData: TrackingEvent): Promise<void> => {
  try {
    const response = await fetch('/api/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    });

    if (!response.ok) {
      console.warn('Tracking event failed:', response.status);
    }
  } catch (error) {
    console.warn('Failed to send tracking event:', error);
  }
};

export const useBehaviorTracking = (): BehaviorTrackingHook => {
  const { user } = useAuth();
  const viewStartTime = useRef<number>(Date.now());
  const deviceId = useRef<string>(getDeviceId());
  const sessionId = useRef<string>(getSessionId());

  // 基础事件数据
  const getBaseEventData = useCallback(() => ({
    user_id: user?.username || '',
    device_id: deviceId.current,
    session_id: sessionId.current,
    site: getSiteIdentifier(),
    referrer: document.referrer || '',
    ts: new Date().toISOString(),
  }), [user]);

  // 追踪页面浏览
  const trackView = useCallback((articleId: number, additionalData: Record<string, any> = {}) => {
    const eventData: TrackingEvent = {
      event: 'article_view',
      article_id: articleId,
      ...getBaseEventData(),
      ...additionalData,
    };

    sendTrackingEvent(eventData);
    viewStartTime.current = Date.now();
  }, [getBaseEventData]);

  // 追踪用户互动
  const trackInteraction = useCallback((
    articleId: number, 
    type: 'like' | 'favorite' | 'share' | 'comment',
    additionalData: Record<string, any> = {}
  ) => {
    const eventData: TrackingEvent = {
      event: `article_${type}`,
      article_id: articleId,
      ...getBaseEventData(),
      ...additionalData,
    };

    sendTrackingEvent(eventData);
  }, [getBaseEventData]);

  // 追踪搜索行为
  const trackSearch = useCallback((
    query: string, 
    resultCount?: number, 
    clickedArticleId?: number
  ) => {
    const eventData: TrackingEvent = {
      event: 'search_query',
      search_query: query,
      article_id: clickedArticleId,
      result_count: resultCount,
      ...getBaseEventData(),
    };

    sendTrackingEvent(eventData);
  }, [getBaseEventData]);

  // 追踪自定义事件
  const trackCustomEvent = useCallback((
    eventType: string,
    data: Record<string, any> = {}
  ) => {
    const eventData: TrackingEvent = {
      event: eventType,
      ...getBaseEventData(),
      ...data,
    };

    sendTrackingEvent(eventData);
  }, [getBaseEventData]);

  // 页面离开时追踪停留时间
  useEffect(() => {
    const handleBeforeUnload = () => {
      const dwellTime = Date.now() - viewStartTime.current;
      if (dwellTime > 1000) { // 只有停留超过1秒才记录
        // 使用sendBeacon确保在页面卸载时也能发送
        const eventData = {
          event: 'page_dwell',
          dwell_ms: dwellTime,
          ...getBaseEventData(),
        };

        if (navigator.sendBeacon) {
          navigator.sendBeacon(
            '/api/track',
            JSON.stringify(eventData)
          );
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [getBaseEventData]);

  // 可见性变化追踪
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 页面变为不可见，记录停留时间
        const dwellTime = Date.now() - viewStartTime.current;
        if (dwellTime > 1000) {
          trackCustomEvent('page_blur', { dwell_ms: dwellTime });
        }
      } else {
        // 页面重新可见，重置计时
        viewStartTime.current = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [trackCustomEvent]);

  return {
    trackView,
    trackInteraction,
    trackSearch,
    trackCustomEvent,
  };
};

// 页面级别的自动追踪Hook
export const usePageTracking = (articleId?: number, channel?: string) => {
  const { trackView } = useBehaviorTracking();

  useEffect(() => {
    if (articleId) {
      // 自动追踪页面浏览
      trackView(articleId, { channel });
    }
  }, [articleId, channel, trackView]);
};
