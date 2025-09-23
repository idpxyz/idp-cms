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
 * 🏛️ 社会频道专业模板
 * 专业报道 · 深度分析 · 权威发声
 */
const SocialTemplate: React.FC<ChannelTemplateProps> = ({ 
  channel, 
  channels, 
  tags 
}) => {
  // 动态数据模拟（实际应从API获取）
  const liveData = {
    todayEvents: 23,
    activeReports: 156,
    publicResponse: 89,
    solutionRate: 94
  };

  return (
    <PageContainer>
      {/* 🎯 专业化头部设计 */}
      <Section space="lg">
        <div className="relative bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 border border-slate-200/60 rounded-3xl overflow-hidden">
          {/* 几何装饰背景 */}
          <div className="absolute inset-0">
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-100/20 via-transparent to-transparent rounded-full -translate-y-48 translate-x-48"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-slate-100/30 via-transparent to-transparent rounded-full translate-y-40 -translate-x-40"></div>
            {/* 专业网格图案 */}
            <div className="absolute inset-0 opacity-[0.02]" style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, #1e293b 1px, transparent 0)`,
              backgroundSize: '24px 24px'
            }}></div>
          </div>
          
          <div className="relative z-10 p-8 lg:p-12">
            {/* 专业标识区域 */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
              <div className="flex items-center space-x-6 mb-6 lg:mb-0">
                <div className="w-20 h-20 bg-gradient-to-br from-slate-700 via-slate-600 to-slate-800 rounded-2xl flex items-center justify-center shadow-2xl shadow-slate-800/20 border border-slate-600/20">
                  <span className="text-white text-3xl">🏛️</span>
                </div>
                <div>
                  <div className="flex items-center space-x-3 mb-3">
                    <h1 className="template-title text-slate-900">
                      {channel.name}
                    </h1>
                    <div className="px-3 py-1 bg-red-100 text-red-700 template-badge rounded-full border border-red-200">
                      实时更新
                    </div>
                  </div>
                  <p className="text-slate-600 template-subtitle mb-2">
                    权威报道 · 深度分析 · 民生关注
                  </p>
                  <div className="flex items-center space-x-4 news-meta text-slate-500">
                    <span className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>24小时在线</span>
                    </span>
                    <span>|</span>
                    <span>专业记者团队</span>
                    <span>|</span>
                    <span>权威信息源</span>
                  </div>
                </div>
              </div>
              
              {/* 实时数据概览 */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 shadow-lg">
                <h3 className="template-card-title text-slate-600 mb-4 text-center">今日数据</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="template-stat-number text-blue-600">{liveData.todayEvents}</div>
                    <div className="template-stat-label text-slate-500">重要事件</div>
                  </div>
                  <div className="text-center">
                    <div className="template-stat-number text-green-600">{liveData.solutionRate}%</div>
                    <div className="template-stat-label text-slate-500">问题解决率</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 专业描述 */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/40 mb-8">
              <p className="text-slate-700 template-description max-w-4xl">
                {channel.description || "以专业的新闻视角，深度关注社会民生议题。我们致力于提供准确、及时、有深度的社会新闻报道，促进社会问题的理性讨论与有效解决。"}
              </p>
            </div>

            {/* 专业功能模块 */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="bg-white/70 backdrop-blur-sm p-4 rounded-xl border border-slate-200/50 hover:bg-white/90 hover:shadow-lg transition-all duration-300 cursor-pointer group">
                <div className="text-2xl mb-3 group-hover:scale-110 transition-transform">📊</div>
                <h3 className="template-card-title text-slate-900 mb-1">数据分析</h3>
                <p className="template-card-text text-slate-600">社会趋势洞察</p>
              </div>
              
              <div className="bg-white/70 backdrop-blur-sm p-4 rounded-xl border border-slate-200/50 hover:bg-white/90 hover:shadow-lg transition-all duration-300 cursor-pointer group">
                <div className="text-2xl mb-3 group-hover:scale-110 transition-transform">🔍</div>
                <h3 className="template-card-title text-slate-900 mb-1">深度调研</h3>
                <p className="template-card-text text-slate-600">专题调查报告</p>
              </div>
              
              <div className="bg-white/70 backdrop-blur-sm p-4 rounded-xl border border-slate-200/50 hover:bg-white/90 hover:shadow-lg transition-all duration-300 cursor-pointer group">
                <div className="text-2xl mb-3 group-hover:scale-110 transition-transform">⚖️</div>
                <h3 className="template-card-title text-slate-900 mb-1">法治观察</h3>
                <p className="template-card-text text-slate-600">法律政策解读</p>
              </div>
              
              <div className="bg-white/70 backdrop-blur-sm p-4 rounded-xl border border-slate-200/50 hover:bg-white/90 hover:shadow-lg transition-all duration-300 cursor-pointer group">
                <div className="text-2xl mb-3 group-hover:scale-110 transition-transform">🏥</div>
                <h3 className="font-semibold text-slate-900 text-sm mb-1">民生服务</h3>
                <p className="text-xs text-slate-600">公共服务信息</p>
              </div>
              
              <div className="bg-white/70 backdrop-blur-sm p-4 rounded-xl border border-slate-200/50 hover:bg-white/90 hover:shadow-lg transition-all duration-300 cursor-pointer group">
                <div className="text-2xl mb-3 group-hover:scale-110 transition-transform">💬</div>
                <h3 className="font-semibold text-slate-900 text-sm mb-1">舆情监测</h3>
                <p className="text-xs text-slate-600">社会热点追踪</p>
              </div>
              
              <div className="bg-white/70 backdrop-blur-sm p-4 rounded-xl border border-slate-200/50 hover:bg-white/90 hover:shadow-lg transition-all duration-300 cursor-pointer group">
                <div className="text-2xl mb-3 group-hover:scale-110 transition-transform">📋</div>
                <h3 className="font-semibold text-slate-900 text-sm mb-1">举报中心</h3>
                <p className="text-xs text-slate-600">问题反馈平台</p>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* 📈 专业数据仪表板 */}
      <Section space="lg">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/30 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-bold">📈</span>
                </div>
                <h2 className="text-xl font-bold text-white">社会影响力数据中心</h2>
              </div>
              <div className="text-slate-300 text-sm">实时更新</div>
            </div>
          </div>
          
          <div className="p-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center group hover:bg-slate-50 p-4 rounded-xl transition-colors">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
                  <span className="text-white text-xl">👥</span>
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-1">2.8万</div>
                <div className="text-sm text-slate-600 mb-2">今日关注人数</div>
                <div className="flex items-center justify-center space-x-1 text-xs">
                  <span className="text-green-600">↗ +18%</span>
                  <span className="text-slate-400">vs 昨日</span>
                </div>
              </div>
              
              <div className="text-center group hover:bg-slate-50 p-4 rounded-xl transition-colors">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/25 group-hover:scale-105 transition-transform">
                  <span className="text-white text-xl">✅</span>
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-1">{liveData.solutionRate}%</div>
                <div className="text-sm text-slate-600 mb-2">问题解决率</div>
                <div className="flex items-center justify-center space-x-1 text-xs">
                  <span className="text-green-600">↗ +3%</span>
                  <span className="text-slate-400">本月提升</span>
                </div>
              </div>
              
              <div className="text-center group hover:bg-slate-50 p-4 rounded-xl transition-colors">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/25 group-hover:scale-105 transition-transform">
                  <span className="text-white text-xl">⚡</span>
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-1">4.2小时</div>
                <div className="text-sm text-slate-600 mb-2">平均响应时间</div>
                <div className="flex items-center justify-center space-x-1 text-xs">
                  <span className="text-green-600">↗ -22%</span>
                  <span className="text-slate-400">效率提升</span>
                </div>
              </div>
              
              <div className="text-center group hover:bg-slate-50 p-4 rounded-xl transition-colors">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/25 group-hover:scale-105 transition-transform">
                  <span className="text-white text-xl">🎯</span>
                </div>
                <div className="text-3xl font-bold text-slate-900 mb-1">8.6分</div>
                <div className="text-sm text-slate-600 mb-2">用户满意度</div>
                <div className="flex items-center justify-center space-x-1 text-xs">
                  <span className="text-green-600">↗ +0.3</span>
                  <span className="text-slate-400">持续改善</span>
                </div>
              </div>
            </div>
            
            {/* 专业图表区域 */}
            <div className="mt-8 pt-8 border-t border-slate-200">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-slate-50 rounded-xl p-6">
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    热点事件分布
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">民生保障</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="w-16 h-full bg-blue-500 rounded-full"></div>
                        </div>
                        <span className="text-sm font-medium text-slate-900">80%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">法治建设</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="w-12 h-full bg-green-500 rounded-full"></div>
                        </div>
                        <span className="text-sm font-medium text-slate-900">60%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">社区治理</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div className="w-14 h-full bg-purple-500 rounded-full"></div>
                        </div>
                        <span className="text-sm font-medium text-slate-900">70%</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-50 rounded-xl p-6">
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    解决进度跟踪
                  </h3>
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg p-4 border border-slate-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-900">社区基础设施</span>
                        <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">已完成</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="w-full h-full bg-green-500 rounded-full"></div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-slate-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-900">教育资源配置</span>
                        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">进行中</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="w-3/4 h-full bg-blue-500 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* 📰 专业内容展示区 */}
      <Section space="lg">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/30 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-bold">📰</span>
                </div>
                <h2 className="text-xl font-bold text-white">{channel.name}权威报道</h2>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-slate-300 text-sm">24小时滚动更新</div>
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
          
          <div className="p-8">
            <ChannelStrip
              channelId={channel.id}
              channelName={channel.name}
              channelSlug={channel.slug}
              showCategories={true}
              showViewMore={false}
              articleLimit={12}
              className="mb-0"
            />
          </div>
        </div>
      </Section>

      {/* 🏛️ 专业服务平台 */}
      <Section space="lg">
        <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-2xl border border-slate-200/60 overflow-hidden">
          <div className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-3 flex items-center justify-center">
                <span className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center text-white text-sm mr-3">🏛️</span>
                专业服务平台
              </h2>
              <p className="text-slate-600 max-w-2xl mx-auto">
                提供权威、专业、高效的社会服务，促进政府与民众的有效沟通
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* 问题反馈中心 */}
              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-lg hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-white text-xl">📋</span>
                </div>
                <h3 className="font-bold text-slate-900 mb-3">问题反馈中心</h3>
                <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                  专业受理社会问题举报，建立透明高效的反馈机制，确保每个声音都被听到
                </p>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">本月处理</span>
                    <span className="font-semibold text-slate-900">247件</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">平均用时</span>
                    <span className="font-semibold text-green-600">3.2天</span>
                  </div>
                </div>
                <button className="w-full bg-red-500 text-white py-3 rounded-lg hover:bg-red-600 transition-colors font-medium">
                  提交反馈
                </button>
              </div>

              {/* 法律咨询服务 */}
              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-lg hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-white text-xl">⚖️</span>
                </div>
                <h3 className="font-bold text-slate-900 mb-3">法律咨询服务</h3>
                <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                  专业律师团队提供免费法律咨询，维护公民合法权益，促进依法治国
                </p>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">在线律师</span>
                    <span className="font-semibold text-slate-900">12位</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">满意度</span>
                    <span className="font-semibold text-green-600">96.8%</span>
                  </div>
                </div>
                <button className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium">
                  免费咨询
                </button>
              </div>

              {/* 政策解读服务 */}
              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-lg hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-white text-xl">📜</span>
                </div>
                <h3 className="font-bold text-slate-900 mb-3">政策解读服务</h3>
                <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                  权威专家深度解读最新政策，帮助公众准确理解政府政策意图和实施要点
                </p>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">解读文章</span>
                    <span className="font-semibold text-slate-900">128篇</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">专家团队</span>
                    <span className="font-semibold text-green-600">8位</span>
                  </div>
                </div>
                <button className="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 transition-colors font-medium">
                  查看解读
                </button>
              </div>
            </div>
            
            {/* 24小时服务承诺 */}
            <div className="mt-8 bg-slate-800 rounded-xl p-6 text-center">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">✓</span>
                </div>
                <h3 className="text-xl font-bold text-white">24小时专业服务承诺</h3>
              </div>
              <p className="text-slate-300 mb-4">
                我们承诺24小时内响应您的需求，专业团队随时为您提供权威、准确的服务
              </p>
              <div className="flex items-center justify-center space-x-8 text-sm">
                <div className="text-center">
                  <div className="text-green-400 font-bold text-lg">≤ 1小时</div>
                  <div className="text-slate-400">紧急事件响应</div>
                </div>
                <div className="text-center">
                  <div className="text-blue-400 font-bold text-lg">≤ 24小时</div>
                  <div className="text-slate-400">一般问题处理</div>
                </div>
                <div className="text-center">
                  <div className="text-purple-400 font-bold text-lg">100%</div>
                  <div className="text-slate-400">问题跟踪覆盖</div>
                </div>
              </div>
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

export default SocialTemplate;
