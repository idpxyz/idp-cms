import React from "react";
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
import { getChannels } from "@/lib/api";

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
      
      {/* Hero 区域 - 纯客户端轮播 */}
      {heroItems && heroItems.length > 0 && (
        <PageContainer padding="none">
          {/* 预加载首图，优化LCP */}
          {heroItems[0] && (
            <link
              rel="preload"
              as="image"
              href={heroItems[0].image_url}
              fetchPriority="high"
            />
          )}
          
          <HeroCarousel 
            items={heroItems}
            autoPlay={true}
            autoPlayInterval={6000}
            showDots={true}
            showArrows={true}
            heightMode="standard"
            hasRightRail={false}
            maxHeightVh={60}
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
