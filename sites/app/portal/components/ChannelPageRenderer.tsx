'use client';

import React from 'react';
import { getChannelTemplate } from '../templates/channels';

interface ChannelPageRendererProps {
  channelSlug: string;
  channels: any[];
  tags?: string;
}

/**
 * 🎪 简化的频道页面渲染器
 * 基于频道slug自动选择对应的模板文件
 * 
 * 新的设计理念：
 * - 每个频道都有独立的模板文件 (如 SocialTemplate.tsx)
 * - 基于频道slug自动选择模板 (social -> SocialTemplate)
 * - 无需复杂的JSON配置，直接在代码中定制
 * - 更易维护，更灵活，更可控
 */
const ChannelPageRenderer: React.FC<ChannelPageRendererProps> = ({
  channelSlug,
  channels,
  tags
}) => {
  // 🔍 查找对应频道
  const channel = channels.find(ch => ch.slug === channelSlug);
  
  if (!channel) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            ❌ 频道不存在
          </h1>
          <p className="text-gray-600 mb-6">
            找不到频道 "{channelSlug}"，请检查链接地址。
          </p>
          <a 
            href="/portal" 
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            返回首页
          </a>
        </div>
      </div>
    );
  }

  // 🎨 获取对应的模板组件
  const TemplateComponent = getChannelTemplate(channelSlug);
  
  // 📄 渲染模板
  return (
    <TemplateComponent
      channel={channel}
      channels={channels}
      tags={tags}
    />
  );
};

export default ChannelPageRenderer;
