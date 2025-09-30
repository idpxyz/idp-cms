/**
 * 频道数据获取工具
 * 统一的channels获取逻辑，避免重复代码
 */

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
 * 使用统一的缓存策略：10分钟
 */
export async function getChannels(): Promise<Channel[]> {
  try {
    const channelsUrl = endpoints.buildUrl(
      endpoints.getCmsEndpoint('/api/channels/'),
      { site: getMainSite().hostname }
    );

    const fetchConfig = endpoints.createFetchConfig({
      timeout: 15000,
      next: { 
        revalidate: 600, // 统一缓存10分钟
        tags: ['channels'] 
      },
    });

    const response = await fetch(channelsUrl, fetchConfig);

    if (response.ok) {
      const data = await response.json();
      
      const channels = data.channels || [];
      const realChannels: Channel[] = channels.map((ch: any) => ({
        ...ch,
        id: ch.slug // 使用slug作为ID
      }));
      
      return realChannels;
    } else {
      if (response.status !== 429) {
        console.warn('Failed to fetch channels, status:', response.status);
      }
    }
  } catch (error) {
    console.error('Error fetching channels:', error);
  }

  return [];
}
