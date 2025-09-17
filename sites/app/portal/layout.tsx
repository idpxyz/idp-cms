import React from "react";
import { Metadata } from "next";
import { getSiteSettings } from "@/lib/api/client";
import { getMainSite } from "@/lib/config/sites";
import PortalClassicLayout from "@/layouts/layout-portal-classic";
import { ChannelProvider } from "./ChannelContext";
import { CategoryProvider } from "./CategoryContext";
import ChannelNavigation from "./ChannelNavigation";
import { endpoints } from "@/lib/config/endpoints";

export const metadata: Metadata = {
  title: "IDP-CMS 门户 - 专业新闻聚合平台",
  description:
    "IDP-CMS门户是专业的新闻聚合平台，为您提供最新、最全面的资讯服务，涵盖政治、经济、文化、科技等各个领域。",
  keywords: "新闻,资讯,聚合,平台,IDP-CMS,门户",
};

interface PortalLayoutProps {
  children: React.ReactNode;
}

// 获取频道数据（服务端）- 使用更强的缓存策略
async function getChannels() {
  try {
    const channelsUrl = endpoints.buildUrl(
      endpoints.getCmsEndpoint('/api/channels'),
      { site: getMainSite().hostname }
    );

    const fetchConfig = endpoints.createFetchConfig({
      timeout: 30000, // Increased to match other services
      next: { 
        revalidate: 7200, // 增加到2小时缓存
        tags: ['channels']
      },
      // 添加额外的缓存策略
      cache: 'force-cache',
    });

    const response = await fetch(channelsUrl, fetchConfig);

    if (response.ok) {
      const data = await response.json();
      const channels = data.channels || [];
      const recommendChannel = { id: "recommend", name: "推荐", slug: "recommend", order: -1 };
      const otherChannels = channels
        .filter((ch: any) => ch.slug !== "recommend")
        .map((ch: any) => ({
          ...ch,
          id: ch.slug // 使用slug作为ID，保持与前端期望的字符串ID一致
        }));
      console.log('Server-side channels fetched:', channels.length);
      return [recommendChannel, ...otherChannels];
    }
  } catch (error) {
    console.error('Error fetching channels in layout:', error);
  }
  
  // 返回最小可用的频道集合，而不是 null
  console.log('Using minimal fallback channels in layout');
  return [
    { id: "recommend", name: "推荐", slug: "recommend", order: -1 }
  ];
}

export default async function PortalLayout({ children }: PortalLayoutProps) {
  // 并行获取站点配置和频道数据
  const [siteSettings, initialChannels] = await Promise.all([
    getSiteSettings(getMainSite().hostname, {
      // ❗️ 增加超时时间以应对开发环境中的服务器端请求拥塞
      timeout: 30000,
      forceRefresh: false,
    }).catch(error => {
      console.error("Failed to load site settings:", error);
      throw new Error(`无法加载站点配置: ${error instanceof Error ? error.message : '未知错误'}`);
    }),
    getChannels()
  ]);

  return (
    <ChannelProvider initialChannels={initialChannels || undefined}>
      <CategoryProvider>
        <PortalClassicLayout siteSettings={siteSettings}>
          {/* 频道导航栏 - 在Layout级别，所有页面共享 */}
          <ChannelNavigation />
          {children}
        </PortalClassicLayout>
      </CategoryProvider>
    </ChannelProvider>
  );
}
