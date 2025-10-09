'use client';

import React from 'react';
import PageContainer from "@/components/layout/PageContainer";
import Section from "@/components/layout/Section";
import NewsContent from "../../components/NewsContent";
import ChannelStrip from "../../components/ChannelStrip";
import HeroCarousel from "../../components/HeroCarousel";
import TopStoriesGrid from "../../components/TopStoriesGrid";
import { getHeroItems } from "../../components/HeroCarousel.utils";
import { getTopStories } from "../../components/TopStoriesGrid.utils";
import { getTopStoriesDefaultHours } from "@/lib/config/content-timing";
import { useChannels } from "../../ChannelContext";

// 获取要在首页显示的频道条带
function getHomepageChannelStrips(channels: any[]): any[] {
  const filteredChannels = channels
    .filter((channel: any) => {
      // 完全由后台控制
      return channel.show_in_homepage === true;
    })
    .sort((a: any, b: any) => {
      const aOrder = a.homepage_order ?? a.order ?? 0;
      const bOrder = b.homepage_order ?? b.order ?? 0;
      return aOrder - bOrder;
    });

  return filteredChannels;
}

interface ChannelTemplateProps {
  channel: any;
  channels: any[];
  tags?: string;
}

/**
 * 📄 推荐频道模板（客户端组件）
 * 包含 Hero 轮播、头条新闻和智能推荐流
 */
const RecommendTemplate: React.FC<ChannelTemplateProps> = ({ 
  channel, 
  channels, 
  tags 
}) => {
  const { setContentReady } = useChannels(); // 🚀 获取内容就绪状态控制函数
  
  // 🚀 状态：初始为空，避免 Hydration Mismatch
  const [heroItems, setHeroItems] = React.useState<any[]>([]);
  const [topStories, setTopStories] = React.useState<any[]>([]);
  
  // 获取要在首页显示的频道条带
  const channelStrips = React.useMemo(() => 
    getHomepageChannelStrips(channels), 
    [channels]
  );
  
  // 🚀 LCP 优化：立即从缓存加载数据，然后后台更新（避免 Hydration Mismatch）
  React.useEffect(() => {
    // ⚡ 立即标记内容就绪，快速隐藏骨架屏
    setContentReady(true);
    
    // 🎯 客户端首次渲染后，立即从缓存加载数据（避免 Hydration Mismatch）
    const loadFromCache = () => {
      try {
        // 加载 Hero 缓存
        const heroCached = localStorage.getItem('hero_cache');
        if (heroCached) {
          const heroData = JSON.parse(heroCached);
          const heroAge = Date.now() - heroData.timestamp;
          if (heroAge < 5 * 60 * 1000) { // 5分钟有效期
            setHeroItems(heroData.items);
          }
        }
        
        // 加载 TopStories 缓存
        const topStoriesCached = localStorage.getItem('topstories_cache');
        if (topStoriesCached) {
          const topStoriesData = JSON.parse(topStoriesCached);
          const topStoriesAge = Date.now() - topStoriesData.timestamp;
          if (topStoriesAge < 5 * 60 * 1000) { // 5分钟有效期
            setTopStories(topStoriesData.items);
          }
        }
      } catch (e) {
        console.warn('Failed to load from cache:', e);
      }
    };
    
    // 立即从缓存加载
    loadFromCache();
    
    // 后台静默加载最新数据（更新缓存）
    const loadLatestData = async () => {
      try {
        const [heroData, topStoriesData] = await Promise.all([
          getHeroItems(5).catch(() => []),
          getTopStories(9, { 
            hours: getTopStoriesDefaultHours(),
            diversity: 'high'
          }).catch(() => [])
        ]);
        
        // 更新状态和缓存
        if (heroData && heroData.length > 0) {
          setHeroItems(heroData);
          try {
            localStorage.setItem('hero_cache', JSON.stringify({
              items: heroData,
              timestamp: Date.now()
            }));
          } catch (e) {
            console.warn('Failed to cache hero data:', e);
          }
        }
        
        if (topStoriesData && topStoriesData.length > 0) {
          setTopStories(topStoriesData);
          try {
            localStorage.setItem('topstories_cache', JSON.stringify({
              items: topStoriesData,
              timestamp: Date.now()
            }));
          } catch (e) {
            console.warn('Failed to cache topstories data:', e);
          }
        }
      } catch (error) {
        console.error('Failed to load latest data:', error);
      }
    };
    
    loadLatestData();
  }, [setContentReady]);
  
  // 🚀 LCP 优化：预加载第一张 Hero 图片
  React.useEffect(() => {
    if (heroItems && heroItems.length > 0 && heroItems[0].image_url) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = heroItems[0].image_url;
      link.fetchPriority = 'high' as any;
      document.head.appendChild(link);
      
      return () => {
        try {
          document.head.removeChild(link);
        } catch (e) {
          // Link may have already been removed
        }
      };
    }
  }, [heroItems]);
  
  return (
    <>
      {/* Hero 区域 - 渐进式加载 */}
      <PageContainer padding="none">
        {heroItems && heroItems.length > 0 ? (
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
        ) : (
          // 🎯 LCP 优化：Hero 占位符，避免布局偏移 (CLS)，保持高度一致
          <div className="relative w-full h-[50vh] md:h-[55vh] lg:h-[60vh] min-h-[300px] max-h-[600px] bg-gradient-to-r from-gray-100 to-gray-50 animate-pulse">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <div className="w-16 h-16 border-4 border-gray-200 border-t-gray-400 rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-sm">加载精彩内容...</p>
              </div>
            </div>
          </div>
        )}
      </PageContainer>

      <PageContainer padding="md">
        {/* Top Stories 头条网格 - 渐进式加载 */}
        {topStories && topStories.length > 0 ? (
          <Section space="md">
            <TopStoriesGrid 
              items={topStories}
              autoFetch={false}
              title="头条新闻"
              showViewMore={true}
              viewMoreLink="/portal/news"
            />
          </Section>
        ) : (
          // 🎯 LCP 优化：TopStories 占位符，避免布局偏移
          <Section space="md">
            <div className="mb-6 h-8 w-32 bg-gray-200 animate-pulse rounded"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100 animate-pulse">
                  <div className="aspect-video bg-gradient-to-r from-gray-100 to-gray-50"></div>
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* 频道条带区域 */}
        {channelStrips.map((channelItem: any) => (
          <Section key={channelItem.id} space="lg">
            <ChannelStrip
              channelId={channelItem.id}
              channelName={channelItem.name}
              channelSlug={channelItem.slug}
              showCategories={false}
              showViewMore={true}
              viewMoreLink={`/portal?channel=${channelItem.slug}`}
              articleLimit={8}
            />
          </Section>
        ))}

        {/* 智能推荐 */}
        <Section space="md">
          <NewsContent
            channels={channels}
            initialChannelId={channel.id}
            tags={tags}
          />
        </Section>
      </PageContainer>
    </>
  );
};

export default RecommendTemplate;

