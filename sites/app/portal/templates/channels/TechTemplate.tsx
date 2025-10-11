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
 * 💻 科技频道专属模板
 * 创新驱动，科技前沿
 * 
 * 🔧 客户端组件：使用了交互式组件
 */
const TechTemplate: React.FC<ChannelTemplateProps> = ({ 
  channel, 
  channels, 
  tags 
}) => {
  return (
    <PageContainer padding="adaptive">
      {/* 🎨 现代化的科技频道头部 */}
      <Section space="lg">
        <div className="relative bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 rounded-2xl p-8 border border-blue-100 overflow-hidden">
          {/* 装饰性背景 */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-blue-100/30 to-transparent rounded-full -translate-y-40 translate-x-40"></div>
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-gradient-to-tr from-cyan-100/30 to-transparent rounded-full translate-y-30 -translate-x-30"></div>
          
          <div className="relative z-10">
            {/* 主标题 */}
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-700 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white text-2xl">💻</span>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                  {channel.name}前沿
                </h1>
                <p className="text-blue-600 template-subtitle">
                  创新驱动 · 科技前沿 · 数字未来
                </p>
              </div>
            </div>

            {/* 特色描述 */}
            <p className="text-gray-700 template-description mb-8 max-w-3xl">
              {channel.description || "探索科技前沿，追踪创新动向。从人工智能到量子计算，从5G到元宇宙，我们为您带来最新的科技资讯和深度分析。"}
            </p>

            {/* 科技导航 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-blue-200 hover:bg-white/80 transition-all cursor-pointer group">
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">🤖</div>
                <h3 className="font-semibold text-gray-900 mb-1">人工智能</h3>
                <p className="news-meta text-gray-600">AI技术发展</p>
              </div>
              
              <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-blue-200 hover:bg-white/80 transition-all cursor-pointer group">
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">📱</div>
                <h3 className="font-semibold text-gray-900 mb-1">移动科技</h3>
                <p className="news-meta text-gray-600">智能设备创新</p>
              </div>
              
              <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-blue-200 hover:bg-white/80 transition-all cursor-pointer group">
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">🌐</div>
                <h3 className="font-semibold text-gray-900 mb-1">互联网+</h3>
                <p className="text-sm text-gray-600">数字化转型</p>
              </div>
              
              <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-blue-200 hover:bg-white/80 transition-all cursor-pointer group">
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">🚀</div>
                <h3 className="font-semibold text-gray-900 mb-1">创新创业</h3>
                <p className="text-sm text-gray-600">科技企业动态</p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* 📊 科技指标板 */}
      <Section space="lg">
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center text-white text-sm mr-3">📊</span>
            科技动态指标
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">2.8万</div>
              <div className="text-sm text-gray-600">科技从业者</div>
              <div className="text-xs text-green-600 mt-1">↗ +25%</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-600 mb-1">847</div>
              <div className="text-sm text-gray-600">技术文章</div>
              <div className="text-xs text-green-600 mt-1">↗ +32%</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-teal-600 mb-1">156</div>
              <div className="text-sm text-gray-600">创新项目</div>
              <div className="text-xs text-green-600 mt-1">↗ +28%</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">95%</div>
              <div className="text-sm text-gray-600">满意度</div>
              <div className="text-xs text-green-600 mt-1">↗ +3%</div>
            </div>
          </div>
        </div>
      </Section>

      {/* 📰 科技内容 */}
      <Section space="lg">
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center text-white text-sm mr-3">📰</span>
            {channel.name}最新资讯
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

export default TechTemplate;
