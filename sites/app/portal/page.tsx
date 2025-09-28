import React from "react";
import { endpoints } from "@/lib/config/endpoints";
import { getMainSite } from "@/lib/config/sites";
import NewsContent from "./components/NewsContent";
import PageContainer from "@/components/layout/PageContainer";
import Section from "@/components/layout/Section";
// Hero 轮播组件
import HeroCarousel from "./components/HeroCarousel";
import { getHeroItems } from "./components/HeroCarousel.utils";
import TopStoriesGrid from "./components/TopStoriesGrid";
import ChannelStrip from "./components/ChannelStrip";
import ChannelPageRenderer from "./components/ChannelPageRenderer";
import { getTopStories } from "./components/TopStoriesGrid.utils";
import { getTopStoriesDefaultHours } from "@/lib/config/content-timing";

// 获取要在首页显示的频道条带（简化版）
function getHomepageChannelStrips(channels: any[]): any[] {
  const filteredChannels = channels
    .filter((channel: any) => {
      // 🎯 完全由后台控制 - 移除硬编码的频道排除逻辑
      // 只依赖后台配置的 show_in_homepage 字段
      return channel.show_in_homepage === true;
    })
    .sort((a: any, b: any) => {
      // 按首页显示顺序排序，如果没有则使用原始order
      const aOrder = a.homepage_order ?? a.order ?? 0;
      const bOrder = b.homepage_order ?? b.order ?? 0;
      return aOrder - bOrder;
    });
    // 🎯 移除硬编码数量限制 - 完全由后台控制
    // 运营人员通过设置 show_in_homepage 来控制显示的频道数量

  return filteredChannels;
}

// 获取频道列表
async function getChannels() {
  try {
    // 使用统一的端点管理器构建URL
    const channelsUrl = endpoints.buildUrl(
      endpoints.getCmsEndpoint('/api/channels/'),
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
      
      // 直接返回数据库中的真实频道，不添加虚拟频道
      const channels = data.channels || [];
      const realChannels = channels.map((ch: any) => ({
        ...ch,
        id: ch.slug // 使用slug作为ID，保持与前端期望的字符串ID一致
      }));
      
      return realChannels;
    } else {
      if (response.status === 429) {
      } else {
        console.warn('Failed to fetch channels from backend, status:', response.status);
      }
    }
  } catch (error) {
    console.error('Error fetching channels from backend:', error);
  }

  // API调用失败时返回空数组，避免显示虚拟频道
  console.warn('频道API调用失败，返回空频道列表');
  return [];
}

export default async function PortalPage({ searchParams }: { searchParams?: Promise<{ channel?: string; tags?: string }> }) {
  const channels = await getChannels();
  const sp = searchParams ? await searchParams : undefined;
  const urlChannel = sp?.channel;
  const tags = sp?.tags;
  
  // 🎯 页面类型判断
  const isHomepage = !urlChannel;
  const isChannelPage = !!urlChannel;
  
  // 🔀 如果是频道页，渲染完全不同的页面结构
  if (isChannelPage) {
    return <ChannelPageRenderer 
      channelSlug={urlChannel} 
      channels={channels} 
      tags={tags} 
    />;
  }
  
  // 🏠 首页逻辑保持不变
  const initialChannelId = channels[0]?.id || "";
  const channelStrips = getHomepageChannelStrips(channels);
  
  // 🚀 并行获取 Hero 轮播数据和头条新闻数据
  const [heroItems, topStoriesData] = await Promise.all([
    getHeroItems(5).catch(error => {
      console.error("Failed to fetch hero items:", error);
      return []; // 获取失败时返回空数组，不影响页面渲染
    }),
    getTopStories(9, { 
      hours: getTopStoriesDefaultHours(), // 🎯 使用集中化配置，平衡数据量和时效性
      diversity: 'high'
      // 🎯 不再需要excludeClusterIds，后端OpenSearch自动处理Hero去重
    }).catch(error => {
      console.error("Failed to fetch top stories:", error);
      return []; // 获取失败时返回空数组，不影响页面渲染
    })
  ]);


  return (
    <div className="min-h-screen bg-white">
      {/* 频道导航栏现在在 Layout 中 */}
      {/* 快讯滚动条已移至 Layout 层，所有页面共享 */}
      
      {/* Hero Carousel 主要轮播区域 - 只在有数据时显示 */}
      {heroItems && heroItems.length > 0 && (
        <PageContainer padding="md">
          <HeroCarousel 
            items={heroItems}
            autoPlay={true}
            autoPlayInterval={6000}
            showDots={true}
            showArrows={true}
            heightMode="standard"
            hasRightRail={false}
            maxHeightVh={45}
            className="mb-6"
          />
        </PageContainer>
      )}

      <PageContainer padding="md">
        
        {/* Top Stories 头条网格 - 服务端预获取数据 */}
        <Section space="md">
          <TopStoriesGrid 
            items={topStoriesData}
            autoFetch={false}
            title="头条新闻"
            showViewMore={true}
            viewMoreLink="/portal/news"
          />
        </Section>

        {/* 频道条带区域 */}
        {/* 使用简化的配置化显示逻辑 */}
        {channelStrips.map((channel: any, index: number) => (
          <Section key={channel.id} space="lg">
            <ChannelStrip
              channelId={channel.id}
              channelName={channel.name}
              channelSlug={channel.slug}
              showCategories={true}
              showViewMore={true}
              viewMoreLink={`/portal?channel=${channel.slug}`}
              articleLimit={8}
              className=""
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
