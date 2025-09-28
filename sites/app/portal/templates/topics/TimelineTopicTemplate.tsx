import React from 'react';
import PageContainer from "@/components/layout/PageContainer";
import Section from "@/components/layout/Section";
import TopicStrip from "../../components/TopicStrip";
import { formatDateShort } from "@/lib/utils/date";

interface TopicTemplateProps {
  topic: any;
  topics?: any[];
  tags?: string;
}

/**
 * ⏰ 时间线型专题模板
 * 适用于纪念活动、历史回顾等强调时间发展轨迹的专题
 */
const TimelineTopicTemplate: React.FC<TopicTemplateProps> = ({ 
  topic, 
  topics = [], 
  tags 
}) => {
  return (
    <PageContainer>
      {/* ⏰ 时间线专题横幅 */}
      <Section space="lg">
        <div className="relative bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 rounded-2xl p-8 border border-slate-200 overflow-hidden">
          {/* 装饰性时间轴背景 */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 via-indigo-300 to-purple-200 opacity-30"></div>
          <div className="absolute left-6 top-8 w-4 h-4 bg-blue-400 rounded-full opacity-40"></div>
          <div className="absolute left-6 bottom-8 w-4 h-4 bg-purple-400 rounded-full opacity-40"></div>
          
          <div className="relative z-10 pl-16">
            {/* 专题类型标识 */}
            <div className="flex items-center space-x-3 mb-6">
              <div className="flex items-center space-x-2 bg-gradient-to-r from-slate-600 to-slate-700 px-4 py-2 rounded-full shadow-md">
                <span className="text-blue-300 text-lg">⏰</span>
                <span className="text-white text-sm font-medium">
                  {topic.status === 'memorial' ? '纪念回顾专题' : '时间线专题'}
                </span>
              </div>
              
              {topic.importance_level === 'national' && (
                <div className="flex items-center space-x-2 bg-gradient-to-r from-red-600 to-red-700 px-3 py-1 rounded-full">
                  <span className="text-yellow-300 text-sm">🏛️</span>
                  <span className="text-white text-xs font-bold">国家级</span>
                </div>
              )}
            </div>

            {/* 主标题 */}
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 leading-tight">
                {topic.title}
              </h1>
              
              {/* 时间范围 */}
              <div className="flex items-center space-x-4 text-slate-600 mb-4">
                {topic.start_date && (
                  <div className="flex items-center space-x-2">
                    <span className="text-blue-500">📅</span>
                    <span className="font-medium">
                      开始时间: {formatDateShort(topic.start_date)}
                    </span>
                  </div>
                )}
                
                {topic.end_date && (
                  <>
                    <span className="text-slate-400">-</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-purple-500">📅</span>
                      <span className="font-medium">
                        结束时间: {formatDateShort(topic.end_date)}
                      </span>
                    </div>
                  </>
                )}
                
                {!topic.end_date && topic.status === 'ongoing' && (
                  <>
                    <span className="text-slate-400">-</span>
                    <span className="text-blue-600 font-medium">持续进行中</span>
                  </>
                )}
              </div>
              
              {/* 专题描述 */}
              {topic.summary && (
                <div className="bg-white/70 backdrop-blur-sm p-6 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-slate-800 text-lg leading-relaxed">
                    {topic.summary}
                  </p>
                </div>
              )}
            </div>

            {/* 专题统计 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-slate-200 text-center group hover:bg-white/80 transition-all">
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">📖</div>
                <div className="text-xl font-bold text-slate-700">{topic.articles_count || 0}</div>
                <div className="text-sm text-slate-600">篇记录</div>
              </div>
              
              <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-slate-200 text-center group hover:bg-white/80 transition-all">
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">
                  {topic.status === 'memorial' ? '🕯️' : '⏳'}
                </div>
                <div className="text-xl font-bold text-slate-700">
                  {topic.status_display || topic.status}
                </div>
                <div className="text-sm text-slate-600">当前状态</div>
              </div>
              
              <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-slate-200 text-center group hover:bg-white/80 transition-all">
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">⭐</div>
                <div className="text-xl font-bold text-slate-700">{topic.priority_weight || 100}</div>
                <div className="text-sm text-slate-600">权重等级</div>
              </div>
              
              <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-slate-200 text-center group hover:bg-white/80 transition-all">
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">
                  {topic.importance_level === 'national' ? '🏛️' : '📍'}
                </div>
                <div className="text-xl font-bold text-slate-700">
                  {topic.importance_display || topic.importance_level}
                </div>
                <div className="text-sm text-slate-600">重要程度</div>
              </div>
            </div>

            {/* 专题标签 */}
            {topic.tags && topic.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-6">
                {topic.tags.map((tag: any, index: number) => (
                  <span 
                    key={index}
                    className="inline-block px-3 py-1 bg-gradient-to-r from-slate-500 to-slate-600 text-white text-sm font-medium rounded-full shadow-sm"
                  >
                    #{typeof tag === 'string' ? tag : tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* 📊 主要内容区域 */}
      <Section space="md">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 主要内容 */}
          <div className="lg:col-span-3 space-y-8">
            {/* 时间线核心内容 */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-600 to-slate-700 px-8 py-6 text-white">
                <h2 className="text-2xl font-bold flex items-center space-x-3">
                  <span>⏰</span>
                  <span>事件时间线</span>
                </h2>
              </div>
              <div className="p-8">
                {/* 时间线可视化区域 */}
                <div className="relative">
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-300 via-indigo-400 to-purple-300"></div>
                  
                  {/* 时间节点示例 */}
                  <div className="space-y-8">
                    {/* 起始节点 */}
                    <div className="flex items-start space-x-6">
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg border-4 border-white">
                        <span className="text-white font-bold text-sm">始</span>
                      </div>
                      <div className="flex-1 bg-blue-50 rounded-xl p-6 border border-blue-200">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-bold text-blue-900 text-lg">事件开始</h3>
                          <span className="text-blue-600 text-sm font-medium">
                            {topic.start_date ? formatDateShort(topic.start_date) : '待记录'}
                          </span>
                        </div>
                        <p className="text-blue-800">
                          {topic.title}相关事件正式开始，引起广泛关注。
                        </p>
                      </div>
                    </div>
                    
                    {/* 发展节点 */}
                    <div className="flex items-start space-x-6">
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg border-4 border-white">
                        <span className="text-white font-bold text-sm">展</span>
                      </div>
                      <div className="flex-1 bg-indigo-50 rounded-xl p-6 border border-indigo-200">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-bold text-indigo-900 text-lg">持续发展</h3>
                          <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-medium">
                            进行中
                          </span>
                        </div>
                        <p className="text-indigo-800">
                          事件持续发展，各方积极参与，产生重要影响。
                        </p>
                        <div className="mt-4 text-indigo-700 text-sm">
                          📊 已发布 <span className="font-bold">{topic.articles_count || 0}</span> 篇相关报道
                        </div>
                      </div>
                    </div>
                    
                    {/* 结果节点（如果已结束）*/}
                    {topic.status === 'concluded' || topic.status === 'memorial' && (
                      <div className="flex items-start space-x-6">
                        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg border-4 border-white">
                          <span className="text-white font-bold text-sm">
                            {topic.status === 'memorial' ? '念' : '结'}
                          </span>
                        </div>
                        <div className="flex-1 bg-purple-50 rounded-xl p-6 border border-purple-200">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-purple-900 text-lg">
                              {topic.status === 'memorial' ? '永恒纪念' : '圆满结束'}
                            </h3>
                            <span className="text-purple-600 text-sm font-medium">
                              {topic.end_date ? formatDateShort(topic.end_date) : ''}
                            </span>
                          </div>
                          <p className="text-purple-800">
                            {topic.status === 'memorial' 
                              ? '此事件具有重要历史意义，值得永远铭记。'
                              : '事件圆满落下帷幕，留下深刻历史印记。'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 相关报道 */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-8 py-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center space-x-3">
                    <span>📰</span>
                    <span>时间线报道</span>
                  </h2>
                  <span className="text-slate-600 text-sm">按时间顺序排列</span>
                </div>
              </div>
              <div className="p-8">
                <TopicStrip
                  topicSlug={topic.slug}
                  topicTitle={topic.title}
                  topicStatus={topic.status || 'ongoing'}
                  importanceLevel={topic.importance_level || 'major'}
                  isBreaking={topic.is_breaking || false}
                  showTags={true}
                  articleLimit={15}
                  className="mb-0"
                />
              </div>
            </div>

            {/* 历史价值阐释 */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-8 py-6 border-b border-amber-200">
                <h2 className="text-2xl font-bold text-amber-900 flex items-center space-x-3">
                  <span>📜</span>
                  <span>历史价值阐释</span>
                </h2>
              </div>
              <div className="p-8">
                <div className="prose max-w-none">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xl">📚</span>
                        </div>
                        <h3 className="text-lg font-bold text-blue-900">史料价值</h3>
                      </div>
                      <p className="text-blue-800 leading-relaxed">
                        "{topic.title}"为后世研究相关历史事件提供了宝贵的第一手资料，
                        具有重要的史学研究价值。
                      </p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-100">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xl">🕯️</span>
                        </div>
                        <h3 className="text-lg font-bold text-purple-900">纪念意义</h3>
                      </div>
                      <p className="text-purple-800 leading-relaxed">
                        通过系统记录和深度回顾，缅怀历史，传承精神，
                        激励后人继续前行。
                      </p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 border border-green-100">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xl">🌱</span>
                        </div>
                        <h3 className="text-lg font-bold text-green-900">教育启发</h3>
                      </div>
                      <p className="text-green-800 leading-relaxed">
                        以史为鉴，从历史事件中汲取智慧，
                        为现在和未来的发展提供借鉴与指导。
                      </p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-6 border border-orange-100">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xl">🔗</span>
                        </div>
                        <h3 className="text-lg font-bold text-orange-900">传承价值</h3>
                      </div>
                      <p className="text-orange-800 leading-relaxed">
                        连接过去与现在，承上启下，
                        确保重要历史文化的延续和传承。
                      </p>
                    </div>
                  </div>
                  
                  {/* 时间线总结 */}
                  <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-6 border border-slate-200">
                    <div className="text-center">
                      <div className="text-4xl mb-3">⏰</div>
                      <h3 className="text-xl font-bold text-slate-900 mb-4">时间见证历史</h3>
                      <p className="text-slate-700 leading-relaxed mb-4">
                        每一个重要的历史时刻都值得被记录和铭记。通过时间线的形式，
                        我们能够更清晰地看到事件的发展脉络，理解其深层意义。
                      </p>
                      
                      {topic.tags && topic.tags.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-2 mt-4">
                          {topic.tags.map((tag: any, index: number) => (
                            <span 
                              key={index}
                              className="px-3 py-1 bg-slate-200 text-slate-700 rounded-full text-sm font-medium"
                            >
                              #{typeof tag === 'string' ? tag : tag.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 侧边栏 */}
          <div className="space-y-6">
            {/* 时间线信息 */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-600 to-slate-700 px-4 py-4 text-white">
                <h3 className="font-bold flex items-center space-x-2">
                  <span>⏰</span>
                  <span>时间线信息</span>
                </h3>
              </div>
              <div className="p-6 space-y-4">
                {topic.start_date && (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-blue-500 text-lg">📅</span>
                      <span className="text-blue-900 font-medium text-sm">开始时间</span>
                    </div>
                    <div className="font-bold text-blue-800">
                      {formatDateShort(topic.start_date)}
                    </div>
                  </div>
                )}
                
                {topic.end_date && (
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-purple-500 text-lg">🏁</span>
                      <span className="text-purple-900 font-medium text-sm">结束时间</span>
                    </div>
                    <div className="font-bold text-purple-800">
                      {formatDateShort(topic.end_date)}
                    </div>
                  </div>
                )}
                
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-slate-500 text-lg">📊</span>
                    <span className="text-slate-900 font-medium text-sm">持续时长</span>
                  </div>
                  <div className="font-bold text-slate-800">
                    {topic.start_date && topic.end_date
                      ? `${Math.ceil((new Date(topic.end_date).getTime() - new Date(topic.start_date).getTime()) / (1000 * 60 * 60 * 24))} 天`
                      : topic.start_date 
                      ? `${Math.ceil((new Date().getTime() - new Date(topic.start_date).getTime()) / (1000 * 60 * 60 * 24))} 天至今`
                      : '待记录'}
                  </div>
                </div>
                
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-green-500 text-lg">📖</span>
                    <span className="text-green-900 font-medium text-sm">记录数量</span>
                  </div>
                  <div className="font-bold text-green-800">
                    {topic.articles_count || 0} 篇历史记录
                  </div>
                </div>
              </div>
            </div>

            {/* 关键节点 */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-4 text-white">
                <h3 className="font-bold flex items-center space-x-2">
                  <span>🎯</span>
                  <span>关键节点</span>
                </h3>
              </div>
              <div className="p-6 space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">始</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-blue-900">事件起始</div>
                    <div className="text-xs text-blue-600">历史开端</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                  <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">展</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-indigo-900">发展进程</div>
                    <div className="text-xs text-indigo-600">持续推进</div>
                  </div>
                </div>
                
                {topic.status === 'concluded' || topic.status === 'memorial' ? (
                  <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {topic.status === 'memorial' ? '念' : '结'}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-purple-900">
                        {topic.status === 'memorial' ? '永恒纪念' : '完美收官'}
                      </div>
                      <div className="text-xs text-purple-600">
                        {topic.status === 'memorial' ? '历史铭记' : '圆满结束'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center animate-pulse">
                      <span className="text-white text-xs font-bold">续</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-amber-900">持续进行</div>
                      <div className="text-xs text-amber-600">正在记录</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 相关纪念专题 */}
            {topics.some(t => (t.status === 'memorial' || t.tags?.includes('纪念')) && t.slug !== topic.slug) && (
              <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-50 to-indigo-50 px-4 py-4 border-b border-slate-200">
                  <h3 className="font-bold text-slate-900 flex items-center space-x-2">
                    <span>🕯️</span>
                    <span>相关纪念专题</span>
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  {topics
                    .filter(t => (t.status === 'memorial' || t.tags?.some((tag: any) => 
                      (typeof tag === 'string' ? tag : tag.name).includes('纪念'))) && t.slug !== topic.slug)
                    .slice(0, 4)
                    .map((memorialTopic: any) => (
                    <div key={memorialTopic.slug} className="group">
                      <div className="border-l-4 border-slate-400 pl-4 py-2 hover:border-indigo-500 transition-colors">
                        <a 
                          href={`/portal/topic/${memorialTopic.slug}`}
                          className="text-sm font-medium text-slate-900 hover:text-indigo-700 line-clamp-2 block group-hover:text-indigo-700"
                        >
                          {memorialTopic.title}
                        </a>
                        <div className="flex items-center space-x-2 mt-2">
                          <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded font-medium">
                            🕯️ 纪念
                          </span>
                          <span className="text-xs text-gray-500">
                            {memorialTopic.articles_count || 0} 篇记录
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 历史档案 */}
            <div className="bg-white rounded-xl shadow-lg border border-amber-200 overflow-hidden">
              <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-4 text-white">
                <h3 className="font-bold flex items-center space-x-2">
                  <span>📜</span>
                  <span>历史档案</span>
                </h3>
              </div>
              <div className="p-6">
                <div className="text-center py-4">
                  <div className="text-amber-600 mb-3 text-3xl">📚</div>
                  <p className="text-sm text-amber-800 mb-4 font-medium">
                    珍贵的历史记录，见证时代变迁
                  </p>
                  <div className="bg-gradient-to-r from-amber-100 to-orange-100 rounded-lg p-3 border border-amber-200">
                    <div className="text-amber-800 text-xs">
                      记录历史，传承文明，启迪未来
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>
    </PageContainer>
  );
};

export default TimelineTopicTemplate;
