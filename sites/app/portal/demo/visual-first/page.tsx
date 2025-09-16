"use client";

import React from "react";
import Link from "next/link";

// Note: metadata is not supported in client components

// 模拟数据
const featuredStory = {
  id: 1,
  title: "2024年全球经济数据实时追踪",
  description: "通过互动式图表深度解析全球经济走势，实时更新关键指标数据",
  videoUrl: "https://via.placeholder.com/1200x600/1f2937/ffffff?text=交互式经济数据可视化",
  type: "interactive"
};

const videoContent = [
  {
    id: 1,
    title: "选举结果实时追踪",
    thumbnail: "https://via.placeholder.com/400x225/ef4444/ffffff?text=选举数据",
    duration: "LIVE",
    viewers: "125.6k",
    type: "live",
    category: "政治"
  },
  {
    id: 2,
    title: "气候变化可视化报告",
    thumbnail: "https://via.placeholder.com/400x225/10b981/ffffff?text=气候数据",
    duration: "12:45",
    viewers: "89.2k",
    type: "data-story",
    category: "环境"
  },
  {
    id: 3,
    title: "股市行情深度分析",
    thumbnail: "https://via.placeholder.com/400x225/3b82f6/ffffff?text=股市图表",
    duration: "8:30",
    viewers: "156.8k",
    type: "analysis",
    category: "财经"
  },
  {
    id: 4,
    title: "科技创新指数报告",
    thumbnail: "https://via.placeholder.com/400x225/8b5cf6/ffffff?text=科技指数",
    duration: "15:20",
    viewers: "73.4k",
    type: "research",
    category: "科技"
  }
];

const dataVisualizations = [
  {
    id: 1,
    title: "全球GDP增长趋势",
    type: "line-chart",
    data: "实时更新",
    image: "https://via.placeholder.com/300x200/f59e0b/ffffff?text=GDP趋势图",
    lastUpdate: "2分钟前"
  },
  {
    id: 2,
    title: "人口流动热力图",
    type: "heat-map",
    data: "地理数据",
    image: "https://via.placeholder.com/300x200/ec4899/ffffff?text=人口热力图",
    lastUpdate: "5分钟前"
  },
  {
    id: 3,
    title: "疫情传播模型",
    type: "simulation",
    data: "预测模型",
    image: "https://via.placeholder.com/300x200/06b6d4/ffffff?text=传播模型",
    lastUpdate: "1小时前"
  },
  {
    id: 4,
    title: "能源消费结构",
    type: "pie-chart",
    data: "实时统计",
    image: "https://via.placeholder.com/300x200/84cc16/ffffff?text=能源结构",
    lastUpdate: "30分钟前"
  }
];

const longFormContent = [
  {
    id: 1,
    title: "深度调查：城市化进程中的环境挑战",
    subtitle: "通过大数据分析揭示城市发展与环境保护的平衡之道",
    author: "调查团队",
    readTime: "15分钟",
    image: "https://via.placeholder.com/800x300/65a30d/ffffff?text=城市环境调查",
    type: "investigation"
  },
  {
    id: 2,
    title: "专题报道：数字经济的未来走向",
    subtitle: "结合专家访谈与数据分析，探讨数字化转型的机遇与挑战",
    author: "财经编辑部",
    readTime: "12分钟",
    image: "https://via.placeholder.com/800x300/6366f1/ffffff?text=数字经济专题",
    type: "feature"
  }
];

const realTimeData = [
  { label: "在线用户", value: "1,245,678", change: "+2.3%" },
  { label: "文章浏览", value: "8,934,521", change: "+5.7%" },
  { label: "视频观看", value: "2,156,890", change: "+12.1%" },
  { label: "互动参与", value: "456,789", change: "+8.9%" }
];

export default function VisualFirstDemo() {
  const [activeTab, setActiveTab] = React.useState("live");
  const [isPlaying, setIsPlaying] = React.useState(false);

  const getTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      "live": "bg-red-500",
      "data-story": "bg-blue-500",
      "analysis": "bg-green-500",
      "research": "bg-purple-500"
    };
    return colors[type] || "bg-gray-500";
  };

  const getTypeName = (type: string) => {
    const names: { [key: string]: string } = {
      "live": "直播",
      "data-story": "数据故事",
      "analysis": "深度分析",
      "research": "研究报告"
    };
    return names[type] || type;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* 顶部导航 */}
      <header className="bg-black/50 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                数据新闻
              </div>
            </div>
            
            {/* 导航菜单 */}
            <nav className="hidden md:flex space-x-8">
              <a href="#" className="text-blue-400 font-medium">实时数据</a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">深度报道</a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">视频专区</a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">互动图表</a>
              <a href="#" className="text-gray-300 hover:text-white transition-colors">数据分析</a>
            </nav>
            
            {/* 搜索和用户 */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="搜索数据与报道..."
                  className="w-64 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                />
                <svg className="w-5 h-5 text-gray-400 absolute right-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <button className="text-gray-300 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 实时数据指标 */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {realTimeData.map((item, index) => (
              <div key={index} className="text-center">
                <div className="text-xs text-gray-400 mb-1">{item.label}</div>
                <div className="text-lg font-bold text-white">{item.value}</div>
                <div className="text-xs text-green-400">{item.change}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 主要特色内容 */}
      <section className="relative">
        <div className="relative h-96 lg:h-[500px]">
          <img
            src={featuredStory.videoUrl}
            alt={featuredStory.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60"></div>
          
          {/* 播放按钮和内容 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center max-w-4xl px-4">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-6 mx-auto hover:bg-white/30 transition-colors"
              >
                {isPlaying ? (
                  <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zM11 8a1 1 0 112 0v4a1 1 0 11-2 0V8z" />
                  </svg>
                ) : (
                  <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                )}
              </button>
              
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                {featuredStory.title}
              </h1>
              <p className="text-xl text-gray-200 mb-6 max-w-2xl mx-auto">
                {featuredStory.description}
              </p>
              
              <div className="flex justify-center space-x-4">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                  开始探索
                </button>
                <button className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                  查看数据
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 主要内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：视频内容 (2/3) */}
          <div className="lg:col-span-2">
            {/* 标签切换 */}
            <div className="flex space-x-1 mb-6 bg-gray-800 rounded-lg p-1">
              {[
                { id: "live", name: "🔴 直播中", count: "3" },
                { id: "videos", name: "📹 视频", count: "12" },
                { id: "interactive", name: "📊 互动", count: "8" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:text-white"
                  }`}
                >
                  {tab.name}
                  <span className="ml-2 text-xs bg-gray-600 px-2 py-1 rounded-full">
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* 视频列表 */}
            <div className="space-y-6">
              {videoContent.map((video) => (
                <article key={video.id} className="bg-gray-800 rounded-xl overflow-hidden hover:bg-gray-750 transition-colors group">
                  <div className="md:flex">
                    <div className="md:w-1/3 relative">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-48 md:h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                        </svg>
                      </div>
                      <div className="absolute bottom-2 right-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium text-white ${getTypeColor(video.type)}`}>
                          {video.duration}
                        </span>
                      </div>
                    </div>
                    
                    <div className="md:w-2/3 p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium text-white ${getTypeColor(video.type)}`}>
                          {getTypeName(video.type)}
                        </span>
                        <span className="text-xs text-gray-400">{video.category}</span>
                      </div>
                      
                      <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
                        {video.title}
                      </h3>
                      
                      <div className="flex items-center text-sm text-gray-400">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        {video.viewers} 观看
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          {/* 右侧：数据可视化 (1/3) */}
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">实时数据</h2>
              
              <div className="space-y-4">
                {dataVisualizations.map((viz) => (
                  <div key={viz.id} className="bg-gray-700 rounded-lg p-4 hover:bg-gray-650 transition-colors cursor-pointer">
                    <img
                      src={viz.image}
                      alt={viz.title}
                      className="w-full h-24 object-cover rounded mb-3"
                    />
                    <h4 className="font-semibold text-white mb-1">{viz.title}</h4>
                    <div className="flex justify-between items-center text-xs text-gray-400">
                      <span>{viz.data}</span>
                      <span>更新: {viz.lastUpdate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 互动工具 */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">互动工具</h3>
              
              <div className="space-y-3">
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors">
                  📊 创建图表
                </button>
                <button className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors">
                  🗳️ 参与投票
                </button>
                <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg font-medium transition-colors">
                  💬 讨论区
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 深度内容区域 */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-white mb-8">深度报道</h2>
          
          <div className="space-y-8">
            {longFormContent.map((content) => (
              <article key={content.id} className="bg-gray-800 rounded-xl overflow-hidden hover:bg-gray-750 transition-colors">
                <div className="md:flex">
                  <div className="md:w-1/3">
                    <img
                      src={content.image}
                      alt={content.title}
                      className="w-full h-48 md:h-full object-cover"
                    />
                  </div>
                  
                  <div className="md:w-2/3 p-8">
                    <div className="flex items-center space-x-3 mb-4">
                      <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                        {content.type === "investigation" ? "深度调查" : "专题报道"}
                      </span>
                      <span className="text-gray-400 text-sm">阅读时间: {content.readTime}</span>
                    </div>
                    
                    <h3 className="text-2xl font-bold text-white mb-3 hover:text-blue-400 transition-colors cursor-pointer">
                      {content.title}
                    </h3>
                    
                    <p className="text-gray-300 text-lg mb-4 leading-relaxed">
                      {content.subtitle}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">by {content.author}</span>
                      <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                        阅读全文
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      {/* 返回演示首页 */}
      <div className="fixed bottom-6 right-6">
        <Link
          href="/portal/demo"
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors"
          title="返回演示首页"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
