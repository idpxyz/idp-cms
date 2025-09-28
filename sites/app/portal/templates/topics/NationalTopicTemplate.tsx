"use client";

import React from 'react';
import TopicStrip from '../../components/TopicStrip';
import { formatDateShort } from '@/lib/utils/date';

interface TopicTemplateProps {
  topic: any;
  topics?: any[];
  tags?: string;
}

/**
 * 🏛️ 国家级专题模板 - 参考AI治理页面设计
 * 大气专业的红金主题，适用于国庆、建党节等重大国家庆典
 */
const NationalTopicTemplate: React.FC<TopicTemplateProps> = ({ topic }) => {
  const [activeTab, setActiveTab] = React.useState("overview");
  
  if (!topic) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-red-600 mb-4">❌ 专题不存在</h1>
          <p className="text-gray-600">找不到指定的专题，请检查链接地址。</p>
        </div>
      </div>
    );
  }
  
  return (
    <>
      {/* 专业CSS样式 */}
      <style jsx global>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes starTwinkle {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        
        @keyframes goldenShimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        .animate-fadeInUp { animation: fadeInUp 0.8s ease-out; }
        .animate-slideInRight { animation: slideInRight 0.6s ease-out; }
        .animate-starTwinkle { animation: starTwinkle 2s ease-in-out infinite; }
        
        .national-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .national-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(220, 38, 38, 0.2);
        }
        
        .golden-shimmer {
          background: linear-gradient(45deg, #fbbf24, #f59e0b, #d97706, #fbbf24);
          background-size: 300% 300%;
          animation: goldenShimmer 3s ease-in-out infinite;
        }
      `}</style>

      <div className="min-h-screen bg-gray-50">
        {/* 国庆Hero区域 */}
        <section className="relative h-[700px] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-red-600 via-red-700 to-red-900"></div>
          
          {/* 五星背景装饰 */}
          <div className="absolute inset-0">
            {[
              { top: 'top-12', left: 'left-16', size: 'w-12 h-12', delay: '0s' },
              { top: 'top-24', left: 'right-20', size: 'w-8 h-8', delay: '0.5s' },
              { top: 'bottom-32', left: 'left-24', size: 'w-10 h-10', delay: '1s' },
              { top: 'bottom-20', left: 'right-32', size: 'w-6 h-6', delay: '1.5s' }
            ].map((star, idx) => (
              <svg key={idx} className={`absolute ${star.top} ${star.left} ${star.size} text-yellow-400 opacity-40 animate-starTwinkle`} 
                   fill="currentColor" viewBox="0 0 24 24" style={{animationDelay: star.delay}}>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            ))}
          </div>
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
          
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="max-w-6xl mx-auto px-8 text-center text-white">
              {/* 国庆标识 */}
              <div className="mb-8">
                <div className="inline-flex items-center px-6 py-3 golden-shimmer rounded-full text-red-800 font-bold text-lg shadow-2xl">
                  <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  国庆76周年特别专题
                  <svg className="w-6 h-6 ml-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
              </div>
              
              <h1 className="text-6xl lg:text-7xl font-black mb-8 animate-fadeInUp text-yellow-100 drop-shadow-2xl">
                {topic.title}
              </h1>
              
              <p className="text-2xl lg:text-3xl text-yellow-200 mb-12 leading-relaxed animate-slideInRight font-semibold">
                {topic.description || "庆祝中华人民共和国成立76周年，回顾辉煌历程，展望美好未来"}
              </p>
              
              {/* 庆祝口号 */}
              <div className="mb-8 space-y-4">
                <div className="text-3xl font-bold text-yellow-300 animate-pulse">
                  <svg className="w-8 h-8 inline mr-3 animate-starTwinkle" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  万岁中华人民共和国！万岁伟大的中国人民！
                  <svg className="w-8 h-8 inline ml-3 animate-starTwinkle" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                <div className="text-xl text-yellow-400 font-semibold animate-pulse">
                  伟大、光荣、正确的中国共产党万岁！
                </div>
              </div>
              
              {/* 专题元信息 */}
              <div className="flex flex-wrap justify-center items-center gap-8 text-lg">
                {[
                  { icon: "M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 4h6m-8 8h8a2 2 0 002-2v-8a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2z", text: "1949年10月1日建国" },
                  { icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", text: "76年辉煌历程" },
                  { icon: "M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z", text: "民族复兴之路" }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center bg-black/20 px-4 py-2 rounded-full backdrop-blur-sm">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                    </svg>
                    <span>{item.text}</span>
                  </div>
                ))}
                <div className="flex items-center bg-black/20 px-4 py-2 rounded-full backdrop-blur-sm">
                  <div className="w-6 h-6 golden-shimmer rounded-full flex items-center justify-center mr-2">
                    <span className="text-red-800 font-bold text-sm">76</span>
                  </div>
                  <span>周年庆典</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 导航标签 */}
        <section className="sticky top-0 bg-white shadow-sm z-40 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6">
            <nav className="flex space-x-8 overflow-x-auto py-4">
              {[
                { id: "overview", name: "专题概览", icon: "🏛️" },
                { id: "reports", name: "权威报道", icon: "📺" },
                { id: "history", name: "光辉历程", icon: "📜" },
                { id: "celebration", name: "庆典活动", icon: "🎊" },
                { id: "achievements", name: "伟大成就", icon: "🏆" },
                { id: "timeline", name: "历史时刻", icon: "⏰" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-red-100 text-red-700 border-2 border-red-300'
                      : 'text-gray-600 hover:text-red-600 hover:bg-gray-100'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>
        </section>

        {/* 主内容区域 */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* 专题概览 */}
          {activeTab === "overview" && (
            <div className="space-y-8">
              <div className="bg-white rounded-xl p-8 shadow-lg">
                <h2 className="text-3xl font-bold text-red-900 mb-6">🇨🇳 专题简介</h2>
                <p className="text-lg text-gray-700 leading-relaxed mb-6">
                  {topic.description || "中华人民共和国成立76周年，是一个具有深远历史意义的重要时刻。本专题全面回顾新中国成立以来的光辉历程，展现中华民族从站起来、富起来到强起来的伟大飞跃。"}
                </p>
                
                {topic.tags && topic.tags.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-red-900 mb-3">核心主题</h3>
                    <div className="flex flex-wrap gap-3">
                      {topic.tags.map((tag: any, index: number) => (
                        <span key={index} className="px-4 py-2 bg-red-100 text-red-700 rounded-full font-medium hover:bg-red-200 transition-colors cursor-pointer">
                          #{typeof tag === 'string' ? tag : tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <h3 className="text-lg font-semibold text-red-900 mb-3">76年伟大成就</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { icon: "🏛️", text: "政治建设", color: "red" },
                      { icon: "💰", text: "经济发展", color: "yellow" },
                      { icon: "🚀", text: "科技创新", color: "blue" },
                      { icon: "🌍", text: "国际地位", color: "green" }
                    ].map((item, idx) => (
                      <div key={idx} className={`text-center p-4 bg-${item.color}-50 rounded-lg`}>
                        <div className="text-2xl mb-2">{item.icon}</div>
                        <div className={`text-${item.color}-800 font-semibold`}>{item.text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { title: "权威报道", count: topic.articles_count || 0, icon: "📺", tab: "reports" },
                  { title: "光辉历程", count: "76年", icon: "📜", tab: "history" },
                  { title: "庆典活动", count: "盛大", icon: "🎊", tab: "celebration" },
                  { title: "伟大成就", count: "辉煌", icon: "🏆", tab: "achievements" },
                  { title: "历史时刻", count: "永恒", icon: "⏰", tab: "timeline" }
                ].slice(0, 5).map((item, index) => (
                  <div key={index} onClick={() => setActiveTab(item.tab)} className="national-card bg-white rounded-xl p-6 shadow-lg cursor-pointer border-l-4 border-red-500">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-3xl">{item.icon}</span>
                      <span className="text-2xl font-bold text-red-600">{item.count}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900">{item.title}</h3>
                    <p className="text-sm text-gray-600 mt-2">点击查看详细内容</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 权威报道 */}
          {activeTab === "reports" && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-red-900">📺 权威报道</h2>
              <div className="bg-gradient-to-br from-red-50 via-white to-yellow-50 rounded-2xl shadow-xl border-2 border-red-200 overflow-hidden">
                <div className="bg-gradient-to-r from-red-700 via-red-800 to-red-900 px-8 py-6 border-b-4 border-yellow-400">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center">
                        <span className="text-red-800 text-2xl font-bold">📺</span>
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-yellow-100">国庆权威报道</h3>
                        <p className="text-yellow-200 text-sm">庆祝中华人民共和国成立76周年</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 bg-gradient-to-r from-yellow-400 to-yellow-500 px-4 py-2 rounded-full">
                      <div className="w-2 h-2 bg-red-800 rounded-full animate-pulse"></div>
                      <span className="text-red-800 font-bold text-sm">实时更新</span>
                    </div>
                  </div>
                </div>
                <div className="p-8">
                  <TopicStrip
                    topicSlug={topic.slug}
                    topicTitle={topic.title}
                    topicStatus={topic.status || 'ongoing'}
                    importanceLevel="national"
                    isBreaking={topic.is_breaking || false}
                    showTags={true}
                    articleLimit={12}
                    className="mb-0"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 其他标签页内容... */}
          {activeTab !== "overview" && activeTab !== "reports" && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-red-900">
                {activeTab === "history" && "📜 光辉历程"}
                {activeTab === "celebration" && "🎊 庆典活动"}
                {activeTab === "achievements" && "🏆 伟大成就"}
                {activeTab === "timeline" && "⏰ 历史时刻"}
              </h2>
              
              <div className="bg-white rounded-xl p-8 shadow-lg text-center">
                <div className="text-6xl mb-4">
                  {activeTab === "history" && "📜"}
                  {activeTab === "celebration" && "🎊"}
                  {activeTab === "achievements" && "🏆"}
                  {activeTab === "timeline" && "⏰"}
                </div>
                <h3 className="text-2xl font-bold text-red-900 mb-4">
                  {activeTab === "history" && "76年光辉历程"}
                  {activeTab === "celebration" && "盛大庆典活动"}
                  {activeTab === "achievements" && "伟大历史成就"}
                  {activeTab === "timeline" && "重要历史时刻"}
                </h3>
                <p className="text-gray-600 leading-relaxed max-w-2xl mx-auto">
                  {activeTab === "history" && "回顾新中国成立76年来的光辉历程，从站起来、富起来到强起来的伟大飞跃。"}
                  {activeTab === "celebration" && "展示国庆庆典的盛大场面，包括阅兵式、群众游行和文艺表演等。"}
                  {activeTab === "achievements" && "展现76年来在政治、经济、科技、文化等各个领域取得的伟大成就。"}
                  {activeTab === "timeline" && "梳理中华人民共和国成立以来的重要历史节点和里程碑事件。"}
                </p>
                <div className="mt-6 p-4 bg-red-50 rounded-lg">
                  <p className="text-red-800 font-semibold">内容正在完善中，敬请期待...</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default NationalTopicTemplate;
