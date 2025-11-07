'use client';

import React from 'react';
import PageContainer from "@/components/layout/PageContainer";
import Section from "@/components/layout/Section";
import NewsContent from "../../components/NewsContent";
import ChannelStrip from "../../components/ChannelStrip";
import SocialHeadlines from './components/SocialHeadlines';
import SocialNewsSection from './components/SocialNewsSection';
import SocialChannelStats from './components/SocialChannelStats';

interface ChannelTemplateProps {
  channel: any;
  channels: any[];
  tags?: string;
}

/**
 * 📰 社会频道专业新闻模板
 * 专业新闻布局 · 头条聚焦 · 深度报道
 * 
 * 架构说明：
 * - 简单的单文件模板（与系统其他模板一致）
 * - 数据获取由各个子组件自行管理
 * - 组件高度复用和可组合
 */
const SocialTemplate: React.FC<ChannelTemplateProps> = ({ 
  channel, 
  channels, 
  tags 
}) => {
  return (
    <PageContainer padding="adaptive">
      {/* 🎯 频道标题栏和统计信息 */}
      {/* <Section space="sm">
        <SocialChannelStats 
          channelSlug={channel.slug} 
          channelName={channel.name}
        />
      </Section> */}

      {/* 📺 头条新闻区域 (Hero Section) */}
      {/* <Section space="md">
        <SocialHeadlines channelSlug={channel.slug} limit={5} />
      </Section> */}

      {/* 📰 最新报道 + 热门文章 */}
      <Section space="lg">
        <SocialNewsSection channelSlug={channel.slug} />
      </Section>

      {/* 📋 频道文章流 */}
      <Section space="lg">
        <ChannelStrip
          channelId={channel.id}
          channelName={channel.name}
          channelSlug={channel.slug}
          showCategories={true}
          showViewMore={false}
          articleLimit={12}
        />
      </Section>

      {/* 🎲 智能推荐 */}
      <Section space="md">
        <NewsContent
          channels={channels}
          initialChannelId={channel.id}
          tags={tags}
        />
      </Section>
    </PageContainer>
  );
};

export default SocialTemplate;
