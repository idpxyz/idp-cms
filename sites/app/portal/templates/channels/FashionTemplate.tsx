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
 * 💫 时尚频道专业模板
 * 优雅 · 前沿 · 品味生活
 */
const FashionTemplate: React.FC<ChannelTemplateProps> = ({ 
  channel, 
  channels, 
  tags 
}) => {
  // 时尚数据模拟（实际应从API获取）
  const fashionData = {
    trendingTopics: 5,
    brandUpdates: 23,
    weeklyViews: '15.6万',
    fashionWeeks: 3
  };

  return (
    <PageContainer>
      {/* ✨ 时尚头部 - 杂志风格设计 */}
      <Section space="lg">
        <div className="relative bg-gradient-to-br from-pink-50 via-purple-50/30 to-rose-50/20 border-0 rounded-3xl overflow-hidden min-h-[500px]">
          {/* 优雅装饰背景 */}
          <div className="absolute inset-0">
            {/* 渐变光晕效果 */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-pink-200/20 via-purple-200/10 to-transparent rounded-full -translate-y-48 translate-x-48 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-rose-200/20 via-transparent to-transparent rounded-full translate-y-40 -translate-x-40 blur-2xl"></div>
            
            {/* 时尚几何图案 */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23d946ef' fill-opacity='1'%3E%3Cpath d='M20 20c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10zm10 0c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10z'/%3E%3C/g%3E%3C/svg%3E")`,
              backgroundSize: '40px 40px'
            }}></div>
          </div>
          
          <div className="relative z-10 p-8 lg:p-16">
            {/* 品牌标识区域 */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-12">
              <div className="mb-8 lg:mb-0">
                <div className="flex items-center space-x-6 mb-6">
                  <div className="w-24 h-24 bg-gradient-to-br from-pink-500 via-purple-500 to-rose-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-purple-500/30 border border-white/20">
                    <span className="text-white text-4xl">💫</span>
                  </div>
                  <div>
                    <div className="flex items-center space-x-4 mb-4">
                      <h1 className="text-5xl lg:text-6xl font-light text-gray-900 tracking-wide">
                        {channel.name}
                      </h1>
                      <div className="px-4 py-2 bg-gradient-to-r from-pink-100 to-purple-100 text-purple-700 text-sm font-medium rounded-full border border-purple-200/50">
                        EXCLUSIVE
                      </div>
                    </div>
                    <p className="text-purple-600 font-medium text-xl lg:text-2xl mb-3 tracking-wide">
                      Style · Beauty · Lifestyle
                    </p>
                    <div className="flex items-center space-x-6 text-sm text-gray-500">
                      <span className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse"></div>
                        <span>全球时装周同步</span>
                      </span>
                      <span>|</span>
                      <span>国际品牌独家</span>
                      <span>|</span>
                      <span>专业造型师团队</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/40 max-w-3xl">
                  <p className="text-gray-700 text-lg leading-relaxed">
                    {channel.description || "探索时尚前沿，品味生活美学。从国际时装周到街头潮流，从奢华品牌到平价好物，为您呈现最具品味的时尚资讯与生活方式指南。"}
                  </p>
                </div>
              </div>
              
              {/* 时尚数据面板 */}
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 border border-white/50 shadow-2xl shadow-purple-500/10 min-w-[280px]">
                <h3 className="text-lg font-semibold text-gray-800 mb-6 text-center">时尚影响力</h3>
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="text-3xl font-light text-pink-600 mb-1">{fashionData.weeklyViews}</div>
                    <div className="text-sm text-gray-500">周阅读量</div>
                    <div className="w-full h-1 bg-gray-200 rounded-full mt-2 overflow-hidden">
                      <div className="w-4/5 h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-light text-purple-600">{fashionData.trendingTopics}</div>
                      <div className="text-xs text-gray-500">热门话题</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-light text-rose-600">{fashionData.fashionWeeks}</div>
                      <div className="text-xs text-gray-500">时装周</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 时尚功能模块 */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="bg-white/70 backdrop-blur-sm p-5 rounded-2xl border border-white/40 hover:bg-white/90 hover:shadow-xl transition-all duration-300 cursor-pointer group">
                <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">👗</div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">时装周</h3>
                <p className="text-xs text-gray-600">全球秀场直击</p>
              </div>
              
              <div className="bg-white/70 backdrop-blur-sm p-5 rounded-2xl border border-white/40 hover:bg-white/90 hover:shadow-xl transition-all duration-300 cursor-pointer group">
                <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">💄</div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">美妆护肤</h3>
                <p className="text-xs text-gray-600">专业美容指南</p>
              </div>
              
              <div className="bg-white/70 backdrop-blur-sm p-5 rounded-2xl border border-white/40 hover:bg-white/90 hover:shadow-xl transition-all duration-300 cursor-pointer group">
                <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">✨</div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">潮流趋势</h3>
                <p className="text-xs text-gray-600">时尚风向标</p>
              </div>
              
              <div className="bg-white/70 backdrop-blur-sm p-5 rounded-2xl border border-white/40 hover:bg-white/90 hover:shadow-xl transition-all duration-300 cursor-pointer group">
                <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">👑</div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">品牌动态</h3>
                <p className="text-xs text-gray-600">奢华品牌资讯</p>
              </div>
              
              <div className="bg-white/70 backdrop-blur-sm p-5 rounded-2xl border border-white/40 hover:bg-white/90 hover:shadow-xl transition-all duration-300 cursor-pointer group">
                <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">📸</div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">街拍风格</h3>
                <p className="text-xs text-gray-600">街头时尚捕捉</p>
              </div>
              
              <div className="bg-white/70 backdrop-blur-sm p-5 rounded-2xl border border-white/40 hover:bg-white/90 hover:shadow-xl transition-all duration-300 cursor-pointer group">
                <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">🎨</div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">穿搭指南</h3>
                <p className="text-xs text-gray-600">造型搭配技巧</p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* 🌟 时尚专题展示区 */}
      <Section space="lg">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 本周热门 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/20 overflow-hidden">
              <div className="bg-gradient-to-r from-pink-500 to-purple-500 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                      <span className="text-white text-sm font-bold">🔥</span>
                    </div>
                    <h2 className="text-xl font-semibold text-white">本周时尚热点</h2>
                  </div>
                  <div className="text-pink-100 text-sm">实时更新</div>
                </div>
              </div>
              
              <div className="p-8">
                <ChannelStrip
                  channelId={channel.id}
                  channelName={channel.name}
                  channelSlug={channel.slug}
                  showCategories={true}
                  showViewMore={false}
                  articleLimit={6}
                  className="mb-0"
                />
              </div>
            </div>
          </div>
          
          {/* 时尚日历 */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl p-6 border border-purple-100">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center">
                <span className="w-6 h-6 bg-purple-500 rounded-lg flex items-center justify-center text-white text-sm mr-3">📅</span>
                时尚日历
              </h3>
              <div className="space-y-4">
                <div className="bg-white/80 rounded-xl p-4 border border-white/50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-900">巴黎时装周</span>
                    <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full">进行中</span>
                  </div>
                  <div className="text-xs text-gray-500">9月25日 - 10月3日</div>
                  <div className="w-full h-1 bg-gray-200 rounded-full mt-2 overflow-hidden">
                    <div className="w-3/4 h-full bg-purple-500 rounded-full"></div>
                  </div>
                </div>
                
                <div className="bg-white/80 rounded-xl p-4 border border-white/50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-900">纽约时装周</span>
                    <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">即将开始</span>
                  </div>
                  <div className="text-xs text-gray-500">10月8日 - 10月15日</div>
                </div>
                
                <div className="bg-white/80 rounded-xl p-4 border border-white/50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-900">米兰时装周</span>
                    <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full">计划中</span>
                  </div>
                  <div className="text-xs text-gray-500">10月20日 - 10月28日</div>
                </div>
              </div>
            </div>
            
            {/* 时尚指数 */}
            <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-3xl p-6 border border-rose-100">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center">
                <span className="w-6 h-6 bg-rose-500 rounded-lg flex items-center justify-center text-white text-sm mr-3">📈</span>
                时尚指数
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">复古风</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="w-full h-full bg-rose-500 rounded-full"></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-8">95%</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">极简风</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="w-4/5 h-full bg-purple-500 rounded-full"></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-8">82%</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">运动风</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="w-3/5 h-full bg-pink-500 rounded-full"></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-8">68%</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">朋克风</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="w-2/5 h-full bg-orange-500 rounded-full"></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-8">45%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* 💫 时尚生活方式 */}
      <Section space="lg">
        <div className="bg-gradient-to-br from-gray-50 to-purple-50/30 rounded-3xl border border-gray-200/60 overflow-hidden">
          <div className="p-8 lg:p-12">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-light text-gray-900 mb-4 flex items-center justify-center">
                <span className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-500 rounded-2xl flex items-center justify-center text-white text-lg mr-4">💫</span>
                时尚生活方式
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto text-lg">
                从时装到生活，从品味到态度，探索完整的时尚生活方式
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* 搭配指南 */}
              <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-lg hover:shadow-2xl transition-all duration-300 group">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <span className="text-white text-2xl">🎨</span>
                </div>
                <h3 className="font-bold text-gray-900 mb-4 text-xl">专业搭配指南</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  专业造型师团队精心打造的搭配方案，从基础款到高定，教你穿出品味与个性
                </p>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">搭配方案</span>
                    <span className="font-semibold text-gray-900">156套</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">用户收藏</span>
                    <span className="font-semibold text-pink-600">8.2万</span>
                  </div>
                </div>
                <button className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white py-3 rounded-xl hover:from-pink-600 hover:to-rose-600 transition-all font-medium">
                  查看搭配
                </button>
              </div>

              {/* 美妆护肤 */}
              <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-lg hover:shadow-2xl transition-all duration-300 group">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <span className="text-white text-2xl">💄</span>
                </div>
                <h3 className="font-bold text-gray-900 mb-4 text-xl">美妆护肤专区</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  专业美妆师推荐的护肤与彩妆产品，分享最新美容技巧与流行妆容教程
                </p>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">产品评测</span>
                    <span className="font-semibold text-gray-900">89篇</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">妆容教程</span>
                    <span className="font-semibold text-purple-600">42个</span>
                  </div>
                </div>
                <button className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white py-3 rounded-xl hover:from-purple-600 hover:to-indigo-600 transition-all font-medium">
                  美妆秘籍
                </button>
              </div>

              {/* 品牌故事 */}
              <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-lg hover:shadow-2xl transition-all duration-300 group">
                <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-pink-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <span className="text-white text-2xl">👑</span>
                </div>
                <h3 className="font-bold text-gray-900 mb-4 text-xl">品牌传奇故事</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  深度探索时尚品牌背后的故事，从创始历程到设计理念，解读时尚帝国的传奇
                </p>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">品牌专题</span>
                    <span className="font-semibold text-gray-900">34个</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">独家访谈</span>
                    <span className="font-semibold text-rose-600">12篇</span>
                  </div>
                </div>
                <button className="w-full bg-gradient-to-r from-rose-500 to-pink-500 text-white py-3 rounded-xl hover:from-rose-600 hover:to-pink-600 transition-all font-medium">
                  品牌故事
                </button>
              </div>
            </div>
            
            {/* VIP会员专区 */}
            <div className="mt-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 text-center">
              <div className="flex items-center justify-center space-x-4 mb-6">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-white text-lg">👑</span>
                </div>
                <h3 className="text-2xl font-bold text-white">VIP时尚俱乐部</h3>
              </div>
              <p className="text-purple-100 mb-6 max-w-2xl mx-auto">
                加入我们的VIP俱乐部，享受独家时尚资源、专属活动邀请和个人造型师服务
              </p>
              <div className="flex items-center justify-center space-x-8 text-sm text-purple-100 mb-6">
                <div className="text-center">
                  <div className="text-white font-bold text-lg">独家内容</div>
                  <div>前沿资讯</div>
                </div>
                <div className="text-center">
                  <div className="text-white font-bold text-lg">专属活动</div>
                  <div>时装周邀请</div>
                </div>
                <div className="text-center">
                  <div className="text-white font-bold text-lg">个人服务</div>
                  <div>造型师咨询</div>
                </div>
              </div>
              <button className="bg-white text-purple-600 px-8 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
                立即加入VIP
              </button>
            </div>
          </div>
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

export default FashionTemplate;
