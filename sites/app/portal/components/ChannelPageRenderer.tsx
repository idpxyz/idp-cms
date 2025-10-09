'use client';

import React, { Suspense } from 'react';
import { getChannelTemplate } from '../templates/channels';
import SocialTemplateLoading from '../templates/channels/SocialTemplateLoading';
import ChannelPageWrapper from './ChannelPageWrapper';
import { useChannels } from '../ChannelContext';
import { useSearchParams } from 'next/navigation';

/**
 * 🎪 智能频道页面渲染器 (客户端组件)
 * 
 * 🚀 性能优化：从 Context 读取当前频道，不依赖路由参数
 * - 频道切换完全在客户端进行，不触发页面重新渲染
 * - 使用骨架屏提供即时反馈
 * - 保持 URL 同步（用于刷新恢复状态）
 */
const ChannelPageRenderer: React.FC = () => {
  const { channels, currentChannelSlug } = useChannels();
  const searchParams = useSearchParams();
  const tags = searchParams?.get('tags') || undefined;
  
  // 🔍 查找对应频道
  const channel = channels.find(ch => ch.slug === currentChannelSlug);
  
  if (!channel) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            ❌ 频道不存在
          </h1>
          <p className="text-gray-600 mb-6">
            找不到频道 "{currentChannelSlug}"，请检查链接地址。
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

  // 🎨 获取对应的模板组件 - 使用完整的频道对象
  const TemplateComponent = getChannelTemplate(channel);
  
  // 📄 使用客户端包装器处理过渡效果 + Suspense
  return (
    <ChannelPageWrapper channelSlug={currentChannelSlug}>
      <Suspense fallback={<SocialTemplateLoading />}>
        {/* 🔑 关键修复：使用 key 强制 React 在频道变化时重新挂载组件 */}
        {/* 这确保了即使使用相同的模板组件，切换频道时也会完全重置状态 */}
        <TemplateComponent
          key={currentChannelSlug}
          channel={channel}
          channels={channels}
          tags={tags}
        />
      </Suspense>
    </ChannelPageWrapper>
  );
};

export default ChannelPageRenderer;
