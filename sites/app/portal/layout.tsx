import React from "react";
import { Metadata } from "next";
import { getSiteSettings } from "@/lib/api/client";
import { getMainSite } from "@/lib/config/sites";
import PortalClassicLayout from "@/layouts/layout-portal-classic";
import { ChannelProvider } from "./ChannelContext";
import { CategoryProvider } from "./CategoryContext";
import ChannelNavigation from "./ChannelNavigation";
import { endpoints } from "@/lib/config/endpoints";
import { getBreakingNews } from "./components/BreakingTicker.utils";

export const metadata: Metadata = {
  title: "党报头条 - 倾听人民的声音",
  description:
    "党报头条是权威主流媒体融合平台，坚持党媒属性，传播党的声音，服务人民群众， 倾听人民的声音。聚焦要闻时政、民生服务、经济发展、文化传承、科技创新等重点领域，打造有思想、有温度、有品质的新闻资讯服务。",
  keywords: "党报头条,主流媒体,融媒体,要闻时政,民生服务,权威资讯,党的声音,人民的声音,新闻平台",
  openGraph: {
    title: "党报头条 - 倾听人民的声音",
    description: "倾听人民的声音，聚焦要闻时政、民生服务、经济发展、文化传承、科技创新等重点领域，打造有思想、有温度、有品质的新闻资讯服务。",
    type: "website",
    locale: "zh_CN",
  },
  robots: {
    index: true,
    follow: true,
  },
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
      const recommendChannel = { id: "recommend", name: "首页", slug: "recommend", order: -1 };
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
    { id: "recommend", name: "首页", slug: "recommend", order: -1 }
  ];
}

export default async function PortalLayout({ children }: PortalLayoutProps) {
  // 并行获取站点配置、频道数据和快讯数据
  const [siteSettings, initialChannels, breakingNewsData] = await Promise.all([
    getSiteSettings(getMainSite().hostname, {
      // ❗️ 增加超时时间以应对开发环境中的服务器端请求拥塞
      timeout: 30000,
      forceRefresh: false,
    }).catch(error => {
      console.error("Failed to load site settings:", error);
      throw new Error(`无法加载站点配置: ${error instanceof Error ? error.message : '未知错误'}`);
    }),
    getChannels(),
    // 🚀 服务端预获取快讯数据，避免客户端延迟显示
    getBreakingNews(8).catch(error => {
      console.error("Failed to fetch breaking news:", error);
      return []; // 快讯获取失败时返回空数组，不影响页面渲染
    })
  ]);

  return (
    <ChannelProvider initialChannels={initialChannels || undefined}>
      <CategoryProvider>
        <PortalClassicLayout 
          siteSettings={siteSettings}
          initialBreakingNews={breakingNewsData}
        >
          {/* 频道导航栏 - 在Layout级别，所有页面共享 */}
          <ChannelNavigation />
          {children}
        </PortalClassicLayout>
      </CategoryProvider>
    </ChannelProvider>
  );
}
