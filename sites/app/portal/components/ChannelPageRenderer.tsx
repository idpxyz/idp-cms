import React, { Suspense } from 'react';
import { getChannelTemplate } from '../templates/channels';
import SocialTemplateLoading from '../templates/channels/SocialTemplateLoading';
import ChannelPageWrapper from './ChannelPageWrapper';

interface ChannelPageRendererProps {
  channelSlug: string;
  channels: any[];
  tags?: string;
}

/**
 * 🎪 智能频道页面渲染器 (服务端组件)
 * 优先使用数据库配置的模板，回退到slug映射
 * 
 * 升级后的设计理念：
 * - 🎨 优先使用数据库中配置的模板信息
 * - 📁 每个频道都有独立的模板文件 (如 SocialTemplate.tsx)
 * - 🔄 支持在Wagtail后台动态切换模板
 * - 🛡️ 向后兼容：无配置时回退到slug映射
 * - 🚀 管理员友好：无需修改代码即可调整模板
 * - ⚡ 服务端渲染：支持 async 模板组件
 * - 🎨 UX 优化：频道切换时立即显示骨架屏
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

  // 🎨 获取对应的模板组件 - 使用完整的频道对象
  const TemplateComponent = getChannelTemplate(channel);
  
  // 📄 使用客户端包装器处理过渡效果 + Suspense
  return (
    <ChannelPageWrapper channelSlug={channelSlug}>
      <Suspense fallback={<SocialTemplateLoading />}>
        <TemplateComponent
          channel={channel}
          channels={channels}
          tags={tags}
        />
      </Suspense>
    </ChannelPageWrapper>
  );
};

export default ChannelPageRenderer;
