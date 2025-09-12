import React from "react";
import { endpoints } from "@/lib/config/endpoints";
import { getMainSite } from "@/lib/config/sites";
import NewsContent from "./NewsContent";
import PageContainer from "@/components/layout/PageContainer";
import Section from "@/components/layout/Section";

// 获取频道列表
async function getChannels() {
  try {
    // 使用统一的端点管理器构建URL
    const channelsUrl = endpoints.buildUrl(
      endpoints.getCmsEndpoint('/api/channels'),
      { site: getMainSite().hostname }
    );

    // 使用统一的fetch配置
    const fetchConfig = endpoints.createFetchConfig({
      timeout: 15000,
      next: { revalidate: 600 }, // 缓存10分钟
    });

    const response = await fetch(channelsUrl, fetchConfig);

    if (response.ok) {
      const data = await response.json();
      console.log('Successfully fetched channels from backend:', data.channels?.length || 0);
      
      // 确保推荐频道在最前面，并将数字ID转换为字符串slug以保持一致性
      const channels = data.channels || [];
      const recommendChannel = { id: "recommend", name: "推荐", slug: "recommend", order: -1 };
      const otherChannels = channels
        .filter((ch: any) => ch.slug !== "recommend")
        .map((ch: any) => ({
          ...ch,
          id: ch.slug // 使用slug作为ID，保持与前端期望的字符串ID一致
        }));
      
      return [recommendChannel, ...otherChannels];
    } else {
      if (response.status === 429) {
        console.log('Backend API rate limited, using fallback channels');
      } else {
        console.warn('Failed to fetch channels from backend, status:', response.status);
      }
    }
  } catch (error) {
    console.error('Error fetching channels from backend:', error);
  }

  // API调用失败时只返回推荐频道，避免硬编码数据库频道
  console.log('API failed, returning minimal fallback with recommend channel only');
  return [
    { id: "recommend", name: "推荐", slug: "recommend", order: -1 },
  ];
}

export default async function PortalPage({ searchParams }: { searchParams?: Promise<{ channel?: string }> }) {
  // 频道数据现在通过 Context 提供，但我们仍需要为 NewsContent 获取一份
  const channels = await getChannels();
  const sp = searchParams ? await searchParams : undefined;
  const urlChannel = sp?.channel;
  const initialChannelId = (urlChannel && (channels.find((c:any) => c.slug === urlChannel)?.id || urlChannel)) || channels[0]?.id || "";
  return (
    <div className="min-h-screen">
      {/* 频道导航栏现在在 Layout 中 */}
      <PageContainer padding="md">
        <Section space="md">
          {/* 主要新闻内容区域 - 全宽度 */}
          <NewsContent
            channels={channels}
            initialChannelId={initialChannelId}
          />
        </Section>
      </PageContainer>
    </div>
  );
}
