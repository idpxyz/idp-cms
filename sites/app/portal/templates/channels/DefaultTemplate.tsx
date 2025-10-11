'use client';

import React from 'react';
import PageContainer from "@/components/layout/PageContainer";
import Section from "@/components/layout/Section";
import NewsContent from "../../components/NewsContent";
import ChannelStrip from "../../components/ChannelStrip";

interface ChannelTemplateProps {
  channel: any;
  channels: any[];
  tags?: string;
}

/**
 * 📄 默认频道模板
 * 用于没有自定义模板的频道
 * 
 * 🔧 客户端组件：因为使用了ChannelStrip等交互式组件
 */
const DefaultTemplate: React.FC<ChannelTemplateProps> = ({ 
  channel, 
  channels, 
  tags 
}) => {
  return (
    <PageContainer padding="adaptive">
      {/* 简洁的头部 */}
      {/* <Section space="lg">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h1 className="page-title mb-4">
            {channel.name}
          </h1>
          {channel.description && (
            <p className="text-gray-600 template-subtitle">
              {channel.description}
            </p>
          )}
        </div>
      </Section> */}

      {/* 频道内容 */}
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

      {/* 智能推荐 */}
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

export default DefaultTemplate;
