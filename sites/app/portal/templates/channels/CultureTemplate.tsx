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
 * 🎭 文化频道专属模板
 * 传承文明，弘扬文化
 */
const CultureTemplate: React.FC<ChannelTemplateProps> = ({ 
  channel, 
  channels, 
  tags 
}) => {
  return (
    <PageContainer>
      {/* 🎨 优雅的文化频道头部 */}
      <Section space="lg">
        <div className="relative bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 rounded-2xl p-8 border border-purple-100 overflow-hidden">
          {/* 装饰性背景 */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-purple-100/30 to-transparent rounded-full -translate-y-36 translate-x-36"></div>
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-gradient-to-tr from-indigo-100/30 to-transparent rounded-full translate-y-28 -translate-x-28"></div>
          
          <div className="relative z-10">
            {/* 主标题 */}
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white text-2xl">🎭</span>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                  {channel.name}艺术
                </h1>
                <p className="text-purple-600 template-subtitle">
                  传承文明 · 弘扬文化 · 艺术人生
                </p>
              </div>
            </div>

            {/* 特色描述 */}
            <p className="text-gray-700 template-description mb-8 max-w-3xl">
              {channel.description || "探索文化之美，传承文明之光。从传统到现代，从经典到创新，我们用心呈现文化的魅力与深度。"}
            </p>

            {/* 文化导航 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-purple-200 hover:bg-white/80 transition-all cursor-pointer group">
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">🏛️</div>
                <h3 className="font-semibold text-gray-900 mb-1">历史文化</h3>
                <p className="news-meta text-gray-600">传统文化传承</p>
              </div>
              
              <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-purple-200 hover:bg-white/80 transition-all cursor-pointer group">
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">🎨</div>
                <h3 className="font-semibold text-gray-900 mb-1">艺术展览</h3>
                <p className="news-meta text-gray-600">当代艺术作品</p>
              </div>
              
              <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-purple-200 hover:bg-white/80 transition-all cursor-pointer group">
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">📚</div>
                <h3 className="font-semibold text-gray-900 mb-1">文学作品</h3>
                <p className="text-sm text-gray-600">经典与现代</p>
              </div>
              
              <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-purple-200 hover:bg-white/80 transition-all cursor-pointer group">
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">🎪</div>
                <h3 className="font-semibold text-gray-900 mb-1">文化活动</h3>
                <p className="text-sm text-gray-600">精彩文化节目</p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* 📈 文化影响力指标 */}
      <Section space="lg">
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="w-6 h-6 bg-purple-500 rounded-lg flex items-center justify-center text-white text-sm mr-3">📈</span>
            文化影响力
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 mb-1">8.9万</div>
              <div className="text-sm text-gray-600">文化爱好者</div>
              <div className="text-xs text-green-600 mt-1">↗ +18%</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600 mb-1">156</div>
              <div className="text-sm text-gray-600">艺术作品</div>
              <div className="text-xs text-green-600 mt-1">↗ +12%</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">23</div>
              <div className="text-sm text-gray-600">展览活动</div>
              <div className="text-xs text-green-600 mt-1">↗ +5%</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 mb-1">4.6</div>
              <div className="text-sm text-gray-600">用户评分</div>
              <div className="text-xs text-green-600 mt-1">↗ +0.2</div>
            </div>
          </div>
        </div>
      </Section>

      {/* 📰 文化内容 */}
      <Section space="lg">
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="w-6 h-6 bg-purple-500 rounded-lg flex items-center justify-center text-white text-sm mr-3">📰</span>
            {channel.name}精选内容
          </h2>
          
          <ChannelStrip
            channelId={channel.id}
            channelName={channel.name}
            channelSlug={channel.slug}
            showCategories={true}
            showViewMore={false}
            articleLimit={12}
            className="mb-8"
          />
        </div>
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

export default CultureTemplate;
