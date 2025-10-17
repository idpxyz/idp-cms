/**
 * ClickHouse埋点分析接口
 * 提供用户行为追踪功能
 */

import { getUserSession, updateSessionTimestamp } from "./user-session";

// 事件类型定义
export type TrackingEvent =
  | "impression"
  | "click"
  | "dwell"
  | "view"
  | "search";

// 埋点数据接口
interface TrackingData {
  event: TrackingEvent;
  article_ids: string[];
  user_id: string;
  device_id: string;
  session_id: string;
  site: string;
  channel?: string;
  dwell_ms?: number;
  search_query?: string;
  ts?: number;
}

// 配置
const TRACKING_CONFIG = {
  enabled: true, // 是否启用埋点
  batchSize: 10, // 批量发送大小
  flushInterval: 5000, // 发送间隔（毫秒）
  debounceDelay: 300, // 防抖延迟
};

// 🎯 动态获取站点标识（运行时获取，避免构建时固化）
function getSiteIdentifier(): string {
  if (typeof window === 'undefined') {
    return 'localhost';
  }
  // 🚨 重要：强制使用环境变量配置的站点标识，确保与后端数据一致
  // 这对于用户行为追踪和文章数据关联至关重要！
  const configuredSite = (window as any).NEXT_PUBLIC_PORTAL_SITE;
  if (configuredSite) {
    return configuredSite;
  }
  
  // 🎯 备用方案：根据 hostname 映射到标准站点标识
  const hostname = window.location.hostname;
  // IP 地址或 localhost 都映射到 'localhost'
  if (hostname === 'localhost' || hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    return 'localhost';
  }
  // 域名使用标准化的站点标识
  return hostname;
}

// 埋点队列
let trackingQueue: TrackingData[] = [];
let flushTimer: NodeJS.Timeout | null = null;

// 去重缓存：防止短时间内重复发送相同事件
let recentEvents = new Set<string>();
const DEDUPE_WINDOW = 2000; // 2秒去重窗口

/**
 * 发送埋点数据到后端
 */
async function sendTrackingData(data: TrackingData[]): Promise<void> {
  if (!TRACKING_CONFIG.enabled || typeof window === "undefined") {
    return;
  }

  console.log("📤 Sending tracking data:", data.length, "events");

  try {
    const response = await fetch("/api/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        events: data,
      }),
    });

    if (!response.ok) {
      console.warn("❌ Tracking data send failed:", response.status);
    } else {
      const result = await response.json();
      console.log("✅ Tracking data sent successfully:", result);
    }
  } catch (error) {
    console.warn("❌ Tracking data send error:", error);
  }
}

/**
 * 刷新埋点队列
 */
function flushTrackingQueue(): void {
  if (trackingQueue.length === 0) {
    return;
  }

  const dataToSend = [...trackingQueue];
  trackingQueue = [];

  console.log("📤 Sending", dataToSend.length, "tracking events");
  sendTrackingData(dataToSend);
}

/**
 * 添加数据到队列并处理批量发送
 */
function addToQueue(data: TrackingData): void {
  trackingQueue.push(data);

  // 达到批量大小时立即发送
  if (trackingQueue.length >= TRACKING_CONFIG.batchSize) {
    flushTrackingQueue();
    return;
  }

  // 设置定时发送
  if (flushTimer) {
    clearTimeout(flushTimer);
  }
  flushTimer = setTimeout(flushTrackingQueue, TRACKING_CONFIG.flushInterval);
}

/**
 * 基础埋点函数
 */
function track(
  event: TrackingEvent,
  articleIds: string[],
  options: {
    channel?: string;
    dwellMs?: number;
    searchQuery?: string;
  } = {}
): void {
  if (!TRACKING_CONFIG.enabled || typeof window === "undefined") {
    console.log("🚫 Tracking disabled or not in browser");
    return;
  }

  const session = getUserSession();

  const trackingData: TrackingData = {
    event,
    article_ids: articleIds,
    user_id: session.userId,
    device_id: session.deviceId,
    session_id: session.sessionId,
    site: getSiteIdentifier(), // 🎯 动态获取 site
    ts: Date.now(),
    channel: options.channel,
    dwell_ms: options.dwellMs,
    search_query: options.searchQuery,
  };

  // 🎯 去重检查：防止短时间内重复发送相同事件
  const eventKey = `${event}-${articleIds.join(',')}-${options.channel || 'default'}`;
  if (recentEvents.has(eventKey)) {
    console.log("🚫 跳过重复事件:", eventKey);
    return;
  }
  
  // 添加到去重缓存
  recentEvents.add(eventKey);
  setTimeout(() => {
    recentEvents.delete(eventKey);
  }, DEDUPE_WINDOW);

  addToQueue(trackingData);
  updateSessionTimestamp();
}

/**
 * 文章曝光追踪
 */
export function trackImpression(articleIds: string[], channel?: string): void {
  if (articleIds.length === 0) return;
  track("impression", articleIds, { channel });
}

/**
 * 文章点击追踪
 */
export function trackClick(articleId: string, channel?: string): void {
  track("click", [articleId], { channel });
}

/**
 * 文章停留时间追踪
 */
export function trackDwell(
  articleId: string,
  dwellMs: number,
  channel?: string
): void {
  if (dwellMs < 100) return; // 忽略太短的停留时间
  track("dwell", [articleId], { channel, dwellMs });
}

/**
 * 页面浏览追踪
 */
export function trackPageView(articleId: string, channel?: string): void {
  track("view", [articleId], { channel });
}

/**
 * 搜索行为追踪
 */
export function trackSearch(query: string, resultIds: string[] = []): void {
  track("search", resultIds, { searchQuery: query });
}

/**
 * 搜索结果页停留时间追踪
 */
export function trackSearchDwell(query: string, dwellMs: number): void {
  if (dwellMs < 100) return;
  track("search", [], { searchQuery: query, dwellMs });
}

/**
 * 防抖版本的曝光追踪
 */
let impressionDebounceTimer: NodeJS.Timeout | null = null;
export function trackImpressionDebounced(
  articleIds: string[],
  channel?: string
): void {
  if (impressionDebounceTimer) {
    clearTimeout(impressionDebounceTimer);
  }

  impressionDebounceTimer = setTimeout(() => {
    trackImpression(articleIds, channel);
  }, TRACKING_CONFIG.debounceDelay);
}

/**
 * 页面卸载时强制发送剩余数据
 */
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (trackingQueue.length > 0) {
      // 使用sendBeacon API确保数据能在页面卸载时发送
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/track",
          JSON.stringify({
            events: trackingQueue,
          })
        );
      } else {
        flushTrackingQueue();
      }
    }
  });

  // 页面可见性变化时也发送数据
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && trackingQueue.length > 0) {
      flushTrackingQueue();
    }
  });
}

/**
 * 配置埋点参数
 */
export function configureTracking(
  config: Partial<typeof TRACKING_CONFIG>
): void {
  Object.assign(TRACKING_CONFIG, config);
}

/**
 * 手动刷新队列（用于测试）
 */
export function flushTracking(): void {
  console.log("🔧 Manual flush triggered, queue size:", trackingQueue.length);
  flushTrackingQueue();
}

// 添加到全局对象用于调试
if (typeof window !== "undefined") {
  (window as any).flushTracking = flushTracking;
}
