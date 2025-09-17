import React from "react";
import { endpoints } from "@/lib/config/endpoints";
import { getMainSite } from "@/lib/config/sites";
import NewsContent from "./NewsContent";
import PageContainer from "@/components/layout/PageContainer";
import Section from "@/components/layout/Section";
// Hero 轮播组件
import HeroCarousel from "./components/HeroCarousel";
import { getHeroItems } from "./components/HeroCarousel.utils";
import TopStoriesGrid from "./components/TopStoriesGrid";
import { getTopStories } from "./components/TopStoriesGrid.utils";
import ChannelStrip from "./components/ChannelStrip";

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

export default async function PortalPage({ searchParams }: { searchParams?: Promise<{ channel?: string; tags?: string }> }) {
  // 频道数据现在通过 Context 提供，但我们仍需要为 NewsContent 获取一份
  const channels = await getChannels();
  const sp = searchParams ? await searchParams : undefined;
  const urlChannel = sp?.channel;
  const tags = sp?.tags;
  const initialChannelId = (urlChannel && (channels.find((c:any) => c.slug === urlChannel)?.id || urlChannel)) || channels[0]?.id || "";
  
  // 并行获取数据
  const [heroItems, topStories] = await Promise.all([
    getHeroItems(5), // 获取 Hero 轮播数据
    getTopStories(9), // 获取头条数据 (增加到9条以支持8条右侧显示)
  ]);


  return (
    <div className="min-h-screen bg-white">
      {/* 频道导航栏现在在 Layout 中 */}
      
      {/* Hero Carousel 主要轮播区域 */}
      <PageContainer padding="md">
        <HeroCarousel 
          items={heroItems}
          autoPlay={true}
          autoPlayInterval={6000}
          showDots={true}
          showArrows={true}
          heightMode="compact"
          hasRightRail={false}
          maxHeightVh={25}
          className="mb-6"
        />
      </PageContainer>

      <PageContainer padding="md">
        
        {/* Top Stories 头条网格 */}
        <Section space="md">
          <TopStoriesGrid 
            items={topStories}
            title="头条新闻"
            showViewMore={true}
            viewMoreLink="/portal/news"
          />
        </Section>

        {/* 频道条带区域 */}
        {channels.slice(1, 4).map((channel: any, index: number) => (
          <Section key={channel.id} space="lg">
            <ChannelStrip
              channelId={channel.id}
              channelName={channel.name}
              channelSlug={channel.slug}
              showCategories={true}
              showViewMore={true}
              viewMoreLink={`/portal/channel/${channel.slug}`}
              articleLimit={6}
              className="border-b border-gray-100 pb-8"
            />
          </Section>
        ))}

        <Section space="md">
          {/* 主要新闻内容区域 - 全宽度 */}
          <NewsContent
            channels={channels}
            initialChannelId={initialChannelId}
            // 当存在标签筛选时，NewsContent 将使用文章列表API按频道+标签回退
            // 而不是个性化/推荐策略
            tags={tags}
          />
        </Section>
      </PageContainer>
    </div>
  );
}
