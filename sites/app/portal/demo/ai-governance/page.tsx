"use client";

import React from "react";
import Link from "next/link";

// AI与治理专题数据
const topicInfo = {
  id: "ai-governance-2024",
  title: "AI与治理：塑造人工智能的未来",
  subtitle: "探索人工智能治理的全球趋势、政策框架与监管挑战",
  description: "随着人工智能技术的快速发展，如何建立有效的治理框架成为全球关注的焦点。本专题深入分析各国AI政策、监管动态、伦理标准及其对产业发展的影响。",
  coverImage: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwMCIgaGVpZ2h0PSI2MDAiIHZpZXdCb3g9IjAgMCAxMjAwIDYwMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGRlZnM+CjxsaW5lYXJHcmFkaWVudCBpZD0iYWktZ3JhZGllbnQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgo8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMWUzYThmIi8+CjxzdG9wIG9mZnNldD0iNTAlIiBzdG9wLWNvbG9yPSIjM2I4MmY2Ii8+CjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzYzNjZmMSIvPgo8L2xpbmVhckdyYWRpZW50Pgo8L2RlZnM+CjxyZWN0IHdpZHRoPSIxMjAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0idXJsKCNhaS1ncmFkaWVudCkiLz4KPHN2ZyB4PSI1MCIgeT0iNTAiIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMjQgMjQiIGZpbGw9Im5vbmUiPgo8cGF0aCBkPSJNMTIgMkw2LjUgNy41IDEyIDEzIDE3LjUgNy41IDEyIDJaIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9IjAuMyIvPgo8L3N2Zz4KPHR4dCB4PSI2MDAiIHk9IjI4MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjQ4IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkFJ5LiO5rK755CG5LiT6aKYPC90ZXh0Pgo8dGV4dCB4PSI2MDAiIHk9IjM0MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjI0IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuOCkiIHRleHQtYW5jaG9yPSJtaWRkbGUiPuWbveWGheWklOiuvuWujOaVtOOAgeS4reWbveOAgeasp+ebnyDkuInluKfnm5HnrqHmoYblmbY8L3RleHQ+Cjx0ZXh0IHg9IjYwMCIgeT0iMzgwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC42KSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+MjAyNCDlubTkuIvljKrlubQgfCDniJbovpHml7bpl7Q6IDIwMjQtMTAtMTg8L3RleHQ+CjxjaXJjbGUgY3g9IjIwMCIgY3k9IjQ1MCIgcj0iNDAiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4yKSIvPgo8Y2lyY2xlIGN4PSIxMDAwIiBjeT0iMTUwIiByPSI2MCIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjE1KSIvPgo8Y2lyY2xlIGN4PSIxMDUwIiBjeT0iNTAwIiByPSI1MCIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+CjxyZWN0IHg9IjgwIiB5PSIxODAiIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiByeD0iMTAiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPgo8L3N2Zz4=",
  tags: ["人工智能", "政策监管", "科技伦理", "数字治理", "创新发展"],
  channels: ["科技", "政策", "国际"],
  publishDate: "2024年10月18日",
  updateDate: "2024年10月18日",
  articlesCount: 24,
  readTime: "45分钟阅读",
  difficulty: "专业级",
  author: "专题编辑部"
};

// 核心政策文档
const policyDocuments = [
  {
    id: 1,
    title: "《欧盟人工智能法案》深度解读：全球首部AI综合监管法律",
    summary: "分析欧盟AI法案的核心条款、分级监管体系及对全球AI治理的深远影响",
    type: "政策解读",
    country: "欧盟",
    publishDate: "2024-10-15",
    readTime: "12分钟",
    difficulty: "专业",
    tags: ["欧盟", "AI法案", "监管框架"],
    featured: true
  },
  {
    id: 2,
    title: "中国《人工智能治理白皮书》要点分析",
    summary: "深入解析中国AI治理理念、监管原则和实施路径",
    type: "政策文档",
    country: "中国",
    publishDate: "2024-10-12",
    readTime: "15分钟", 
    difficulty: "专业",
    tags: ["中国", "治理白皮书", "监管政策"]
  },
  {
    id: 3,
    title: "美国《AI权利法案》蓝图：算法问责的新标准",
    summary: "美国政府发布的AI权利保护框架及其对技术开发的要求",
    type: "政策蓝图",
    country: "美国",
    publishDate: "2024-10-08",
    readTime: "10分钟",
    difficulty: "中级",
    tags: ["美国", "权利法案", "算法问责"]
  },
  {
    id: 4,
    title: "新加坡AI治理框架2.0：务实监管的亚洲模式",
    summary: "新加坡更新AI治理框架，强调创新与安全的平衡",
    type: "框架更新",
    country: "新加坡",
    publishDate: "2024-10-05",
    readTime: "8分钟",
    difficulty: "中级",
    tags: ["新加坡", "治理框架", "务实监管"]
  }
];

// 热点分析文章
const analysisArticles = [
  {
    id: 5,
    title: "大模型时代的数据治理挑战：版权、隐私与公平性",
    summary: "深度分析大语言模型训练数据的法律风险和治理难点",
    type: "深度分析",
    category: "技术治理",
    publishDate: "2024-10-16",
    readTime: "18分钟",
    author: "AI治理研究院",
    views: "15.2K",
    featured: true
  },
  {
    id: 6,
    title: "AI生成内容的法律边界：从著作权到深度伪造",
    summary: "探讨AI创作内容的知识产权归属和法律责任认定",
    type: "法律分析",
    category: "知识产权",
    publishDate: "2024-10-14",
    readTime: "14分钟",
    author: "科技法学专家",
    views: "12.8K"
  },
  {
    id: 7,
    title: "算法偏见的检测与纠正：技术方法与政策工具",
    summary: "介绍算法公平性评估技术和反偏见政策措施",
    type: "技术方法",
    category: "算法公平",
    publishDate: "2024-10-11",
    readTime: "16分钟",
    author: "算法伦理专家",
    views: "9.5K"
  },
  {
    id: 8,
    title: "跨境数据流动的AI治理困境与解决方案",
    summary: "分析AI模型训练中的数据跨境传输合规要求",
    type: "合规指南",
    category: "数据治理",
    publishDate: "2024-10-09",
    readTime: "13分钟",
    author: "数据合规顾问",
    views: "11.3K"
  }
];

// 产业影响报告
const industryReports = [
  {
    id: 9,
    title: "金融业AI应用的监管适应性研究报告",
    summary: "银行、保险、证券等金融机构AI应用的合规要求分析",
    type: "行业报告",
    industry: "金融",
    publishDate: "2024-10-13",
    pageCount: 45,
    downloadCount: "2.1K"
  },
  {
    id: 10,
    title: "医疗AI监管现状与发展趋势白皮书",
    summary: "医疗AI产品审批、临床应用和责任认定的全面分析",
    type: "白皮书",
    industry: "医疗",
    publishDate: "2024-10-10",
    pageCount: 38,
    downloadCount: "1.8K"
  },
  {
    id: 11,
    title: "自动驾驶AI系统的安全标准与测试规范",
    summary: "自动驾驶技术的安全认证要求和测试方法论",
    type: "技术标准",
    industry: "汽车",
    publishDate: "2024-10-07",
    pageCount: 52,
    downloadCount: "1.5K"
  }
];

// 专家观点
const expertOpinions = [
  {
    id: 12,
    expert: "李明华教授",
    title: "清华大学AI治理研究中心主任",
    opinion: "AI治理需要在技术创新与风险防控之间找到平衡点，既要避免过度监管抑制创新，也要防范AI技术的潜在风险。",
    topic: "监管平衡",
    publishDate: "2024-10-17"
  },
  {
    id: 13,
    expert: "Sarah Johnson",
    title: "斯坦福大学人工智能伦理学者",
    opinion: "全球AI治理需要建立共同的伦理标准和技术规范，单一国家的监管措施难以应对跨境AI应用的挑战。",
    topic: "国际合作",
    publishDate: "2024-10-16"
  },
  {
    id: 14,
    expert: "张伟博士",
    title: "腾讯AI Lab首席科学家",
    opinion: "企业在AI产品开发中应该主动承担社会责任，建立内部治理机制，不能等监管政策出台后再被动合规。",
    topic: "企业责任",
    publishDate: "2024-10-15"
  }
];

// 时间线数据
const timeline = [
  { date: "2024-10", event: "欧盟AI法案正式生效", type: "milestone" },
  { date: "2024-09", event: "中国发布AI治理白皮书", type: "policy" },
  { date: "2024-08", event: "美国更新AI安全指南", type: "guideline" },
  { date: "2024-07", event: "G7峰会通过AI治理原则", type: "international" },
  { date: "2024-06", event: "UNESCO发布AI伦理建议书", type: "standard" }
];

export default function AIGovernanceTopic() {
  const [activeTab, setActiveTab] = React.useState("overview");
  const [selectedCountry, setSelectedCountry] = React.useState("all");
  
  return (
    <>
      {/* 专业CSS样式 */}
      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeInUp {
          animation: fadeInUp 0.8s ease-out;
        }
        
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .animate-slideInRight {
          animation: slideInRight 0.6s ease-out;
        }
        
        .topic-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .topic-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12);
        }
        
        .difficulty-badge {
          position: relative;
          overflow: hidden;
        }
        
        .difficulty-badge::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          transition: left 0.5s;
        }
        
        .difficulty-badge:hover::before {
          left: 100%;
        }
      `}</style>

      <div className="min-h-screen bg-gray-50">
        {/* 专题Hero区域 */}
        <section className="relative h-[600px] overflow-hidden">
          <img 
            src={topicInfo.coverImage}
            alt={topicInfo.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          
          {/* 渐变覆盖 */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
          
          {/* 内容覆盖 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="max-w-4xl mx-auto px-6 text-center text-white">
              {/* 专题标识 */}
              <div className="mb-6">
                <span className="inline-flex items-center px-4 py-2 bg-blue-600 rounded-full text-sm font-semibold">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H15" />
                  </svg>
                  深度专题
                </span>
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-bold mb-6 animate-fadeInUp">
                {topicInfo.title}
              </h1>
              
              <p className="text-xl lg:text-2xl text-gray-200 mb-8 leading-relaxed animate-slideInRight">
                {topicInfo.subtitle}
              </p>
              
              {/* 专题元信息 */}
              <div className="flex flex-wrap justify-center items-center gap-6 text-sm">
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{topicInfo.publishDate} 发布</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>{topicInfo.articlesCount} 篇文章</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{topicInfo.readTime}</span>
                </div>
                <div className="flex items-center">
                  <span className={`px-3 py-1 rounded-full font-semibold difficulty-badge ${
                    topicInfo.difficulty === '专业级' ? 'bg-red-600' : 'bg-yellow-600'
                  }`}>
                    {topicInfo.difficulty}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* 返回按钮 */}
          <div className="absolute top-6 left-6">
            <Link 
              href="/portal/demo"
              className="flex items-center space-x-2 px-4 py-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-all backdrop-blur-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>返回Demo首页</span>
            </Link>
          </div>
        </section>

        {/* 导航标签 */}
        <section className="sticky top-0 bg-white shadow-sm z-40 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6">
            <nav className="flex space-x-8 overflow-x-auto py-4">
              {[
                { id: "overview", name: "专题概览", icon: "📋" },
                { id: "policies", name: "政策文档", icon: "📜" },
                { id: "analysis", name: "深度分析", icon: "🔍" },
                { id: "industry", name: "产业影响", icon: "🏭" },
                { id: "experts", name: "专家观点", icon: "👥" },
                { id: "timeline", name: "发展时间线", icon: "⏰" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-600 border-2 border-blue-200'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100'
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
              {/* 专题介绍 */}
              <div className="bg-white rounded-xl p-8 shadow-lg">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">专题简介</h2>
                <p className="text-lg text-gray-700 leading-relaxed mb-6">
                  {topicInfo.description}
                </p>
                
                {/* 标签云 */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">核心议题</h3>
                  <div className="flex flex-wrap gap-3">
                    {topicInfo.tags.map((tag, index) => (
                      <span 
                        key={index}
                        className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full font-medium hover:bg-blue-200 transition-colors cursor-pointer"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* 涉及频道 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">涉及频道</h3>
                  <div className="flex space-x-4">
                    {topicInfo.channels.map((channel, index) => (
                      <span 
                        key={index}
                        className="px-3 py-1 bg-red-100 text-red-600 rounded-lg font-medium"
                      >
                        {channel}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* 快速导航 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { title: "政策文档", count: policyDocuments.length, icon: "📜", color: "blue" },
                  { title: "分析文章", count: analysisArticles.length, icon: "🔍", color: "green" },
                  { title: "行业报告", count: industryReports.length, icon: "🏭", color: "purple" },
                  { title: "专家观点", count: expertOpinions.length, icon: "👥", color: "red" }
                ].map((item, index) => (
                  <div key={index} className={`bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer border-l-4 border-${item.color}-500`}>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-3xl">{item.icon}</span>
                      <span className={`text-3xl font-bold text-${item.color}-600`}>{item.count}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900">{item.title}</h3>
                    <p className="text-sm text-gray-600 mt-2">点击查看详细内容</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 政策文档 */}
          {activeTab === "policies" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-gray-900">政策文档</h2>
                <select 
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="all">所有国家/地区</option>
                  <option value="欧盟">欧盟</option>
                  <option value="中国">中国</option>
                  <option value="美国">美国</option>
                  <option value="新加坡">新加坡</option>
                </select>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {policyDocuments
                  .filter(doc => selectedCountry === "all" || doc.country === selectedCountry)
                  .map((doc) => (
                  <div key={doc.id} className={`topic-card bg-white rounded-xl p-6 shadow-lg ${doc.featured ? 'ring-2 ring-blue-500' : ''}`}>
                    {doc.featured && (
                      <div className="flex items-center mb-3">
                        <span className="bg-red-600 text-white px-3 py-1 text-xs font-bold rounded-full">
                          🔥 重点推荐
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-start justify-between mb-4">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        doc.country === '欧盟' ? 'bg-blue-100 text-blue-600' :
                        doc.country === '中国' ? 'bg-red-100 text-red-600' :
                        doc.country === '美国' ? 'bg-purple-100 text-purple-600' :
                        'bg-green-100 text-green-600'
                      }`}>
                        {doc.country}
                      </span>
                      <span className="text-sm text-gray-500">{doc.publishDate}</span>
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-3 hover:text-blue-600 cursor-pointer transition-colors">
                      {doc.title}
                    </h3>
                    
                    <p className="text-gray-600 mb-4 leading-relaxed">{doc.summary}</p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="flex items-center text-gray-500">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {doc.readTime}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          doc.difficulty === '专业' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'
                        }`}>
                          {doc.difficulty}
                        </span>
                      </div>
                      
                      <button className="text-blue-600 hover:text-blue-700 font-semibold">
                        阅读全文 →
                      </button>
                    </div>
                    
                    {/* 标签 */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {doc.tags.map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 深度分析 */}
          {activeTab === "analysis" && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-gray-900">深度分析</h2>
              
              <div className="grid grid-cols-1 gap-8">
                {analysisArticles.map((article) => (
                  <div key={article.id} className={`topic-card bg-white rounded-xl p-8 shadow-lg ${article.featured ? 'border-l-4 border-yellow-500' : ''}`}>
                    {article.featured && (
                      <div className="flex items-center mb-4">
                        <span className="bg-yellow-100 text-yellow-700 px-3 py-1 text-sm font-bold rounded-full">
                          ⭐ 精选分析
                        </span>
                      </div>
                    )}
                    
                    <div className="flex flex-col lg:flex-row lg:items-start lg:space-x-6">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-3">
                          <span className="bg-green-100 text-green-600 px-3 py-1 text-sm font-semibold rounded-full">
                            {article.category}
                          </span>
                          <span className="text-sm text-gray-500">{article.publishDate}</span>
                        </div>
                        
                        <h3 className="text-2xl font-bold text-gray-900 mb-4 hover:text-blue-600 cursor-pointer transition-colors">
                          {article.title}
                        </h3>
                        
                        <p className="text-gray-600 mb-6 leading-relaxed text-lg">{article.summary}</p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-6 text-sm">
                            <span className="flex items-center text-gray-500">
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              {article.author}
                            </span>
                            <span className="flex items-center text-gray-500">
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {article.views} 阅读
                            </span>
                            <span className="flex items-center text-gray-500">
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {article.readTime}
                            </span>
                          </div>
                          
                          <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                            深度阅读
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 产业影响 */}
          {activeTab === "industry" && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-gray-900">产业影响报告</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {industryReports.map((report) => (
                  <div key={report.id} className="topic-card bg-white rounded-xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                        report.industry === '金融' ? 'bg-blue-100 text-blue-600' :
                        report.industry === '医疗' ? 'bg-green-100 text-green-600' :
                        'bg-purple-100 text-purple-600'
                      }`}>
                        {report.industry}行业
                      </span>
                      <span className="text-sm text-gray-500">{report.publishDate}</span>
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-3 hover:text-blue-600 cursor-pointer transition-colors">
                      {report.title}
                    </h3>
                    
                    <p className="text-gray-600 mb-4 leading-relaxed">{report.summary}</p>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {report.pageCount} 页
                      </span>
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {report.downloadCount} 下载
                      </span>
                    </div>
                    
                    <div className="flex space-x-3">
                      <button className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
                        下载PDF
                      </button>
                      <button className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
                        预览
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 专家观点 */}
          {activeTab === "experts" && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-gray-900">专家观点</h2>
              
              <div className="grid grid-cols-1 gap-6">
                {expertOpinions.map((expert) => (
                  <div key={expert.id} className="topic-card bg-white rounded-xl p-8 shadow-lg border-l-4 border-indigo-500">
                    <div className="flex items-start space-x-6">
                      <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">{expert.expert}</h3>
                            <p className="text-gray-600">{expert.title}</p>
                          </div>
                          <span className="text-sm text-gray-500">{expert.publishDate}</span>
                        </div>
                        
                        <blockquote className="text-lg text-gray-700 leading-relaxed mb-4 italic">
                          "{expert.opinion}"
                        </blockquote>
                        
                        <div className="flex items-center">
                          <span className="bg-indigo-100 text-indigo-600 px-3 py-1 text-sm font-semibold rounded-full">
                            关于: {expert.topic}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 发展时间线 */}
          {activeTab === "timeline" && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-gray-900">AI治理发展时间线</h2>
              
              <div className="relative">
                {/* 时间线 */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300"></div>
                
                <div className="space-y-8">
                  {timeline.map((item, index) => (
                    <div key={index} className="relative pl-12">
                      <div className={`absolute left-2 w-4 h-4 rounded-full border-4 border-white shadow-lg ${
                        item.type === 'milestone' ? 'bg-red-500' :
                        item.type === 'policy' ? 'bg-blue-500' :
                        item.type === 'guideline' ? 'bg-green-500' :
                        item.type === 'international' ? 'bg-purple-500' :
                        'bg-yellow-500'
                      }`}></div>
                      
                      <div className="bg-white rounded-xl p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-lg font-bold text-gray-900">{item.date}</span>
                          <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                            item.type === 'milestone' ? 'bg-red-100 text-red-600' :
                            item.type === 'policy' ? 'bg-blue-100 text-blue-600' :
                            item.type === 'guideline' ? 'bg-green-100 text-green-600' :
                            item.type === 'international' ? 'bg-purple-100 text-purple-600' :
                            'bg-yellow-100 text-yellow-600'
                          }`}>
                            {item.type === 'milestone' ? '里程碑' :
                             item.type === 'policy' ? '政策' :
                             item.type === 'guideline' ? '指南' :
                             item.type === 'international' ? '国际' : '标准'}
                          </span>
                        </div>
                        <p className="text-gray-700">{item.event}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
