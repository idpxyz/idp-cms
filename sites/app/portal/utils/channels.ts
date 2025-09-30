/**
 * 频道数据获取工具 - 重构版
 * 
 * 🎯 核心改进：
 * 1. 使用React cache API - 同一请求周期内自动共享结果
 * 2. 单一数据源 - 所有地方都用这个函数
 * 3. 简化缓存 - 只依赖Next.js的fetch缓存
 * 
 * ✅ 效果：
 * - Layout调用getChannels() → 发起请求
 * - Page调用getChannels() → 直接返回缓存（同一请求周期）
 * - 零重复请求，零客户端请求
 */

import { cache } from 'react';
import { endpoints } from "@/lib/config/endpoints";
import { getMainSite } from "@/lib/config/sites";

export interface Channel {
  id: string;
  name: string;
  slug: string;
  order?: number;
  homepage_order?: number;
  show_in_homepage?: boolean;
  [key: string]: any;
}

/**
 * 获取频道列表（Server Component专用）
 * 
 * 🚀 使用React cache包装，确保同一请求周期内只执行一次
 * 
 * 使用方式：
 * ```typescript
 * // Layout
 * const channels = await getChannels(); // 发起请求
 * 
 * // Page (同一请求周期)
 * const channels = await getChannels(); // 直接返回缓存 ✅
 * ```
 */
export const getChannels = cache(async (): Promise<Channel[]> => {
  try {
    const channelsUrl = endpoints.buildUrl(
      endpoints.getCmsEndpoint('/api/channels/'),
      { site: getMainSite().hostname }
    );

    const fetchConfig = endpoints.createFetchConfig({
      timeout: 15000,
      next: { 
        revalidate: 600, // Next.js缓存10分钟
        tags: ['channels'] 
      },
    });

    const response = await fetch(channelsUrl, fetchConfig);

    if (response.ok) {
      const data = await response.json();
      
      const channels = data.channels || [];
      const realChannels: Channel[] = channels.map((ch: any) => ({
        ...ch,
        id: ch.slug // 使用slug作为ID，保持一致性
      }));
      
      console.log('📡 Channels fetched (or cached):', realChannels.length);
      return realChannels;
    } else {
      if (response.status !== 429) {
        console.warn('⚠️ Failed to fetch channels, status:', response.status);
      }
    }
  } catch (error) {
    console.error('❌ Error fetching channels:', error);
  }

  return [];
});
