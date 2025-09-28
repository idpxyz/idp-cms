import React from 'react';
import PageContainer from "@/components/layout/PageContainer";
import Section from "@/components/layout/Section";
import NewsContent from "../../components/NewsContent";
import TopicStrip from "../../components/TopicStrip";
import { formatDateTime, formatTimeForSSR } from "@/lib/utils/date";

interface TopicTemplateProps {
  topic: any;
  topics?: any[];
  tags?: string;
}

/**
 * 🚨 突发重大事件专题模板
 * 红色警示主题，动态效果，突出紧急性和实时性
 */
const BreakingTopicTemplate: React.FC<TopicTemplateProps> = ({ 
  topic, 
  topics = [], 
  tags 
}) => {
  return (
    <PageContainer>
      {/* 🚨 突发事件警示头部 */}
      <Section space="sm">
        <div className="bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-200 rounded-lg p-6 mb-4">
          <div className="flex items-center space-x-3 mb-4">
            {/* 动态警示图标 */}
            <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
              <span className="text-white text-xl">⚡</span>
            </div>
            
            {/* 突发事件标识 */}
            <div className="flex items-center space-x-2">
              <span className="bg-red-500 text-white px-4 py-2 rounded-full text-sm font-bold animate-pulse">
                🚨 突发重大事件
              </span>
              <span className="bg-red-600 text-white px-3 py-1 rounded text-xs font-bold">
                实时更新
              </span>
            </div>
            
            {/* 重要程度标识 */}
            <div className="flex items-center space-x-2">
              {topic.importance_level === 'national' && (
                <span className="bg-red-800 text-white px-3 py-1 rounded text-sm font-bold">
                  🏛️ 国家级
                </span>
              )}
              {topic.priority_weight > 1000 && (
                <span className="bg-red-700 text-white px-2 py-1 rounded text-xs">
                  最高优先级
                </span>
              )}
            </div>
          </div>
          
          {/* 突发事件标题 */}
          <h1 className="text-3xl font-bold text-red-900 mb-3 leading-tight">
            {topic.title}
          </h1>
          
          {/* 时间信息 */}
          <div className="flex items-center space-x-4 text-red-700 font-medium mb-4">
            {topic.start_date && (
              <div className="flex items-center space-x-1">
                <span>⏰ 发生时间:</span>
                <span>{formatDateTime(topic.start_date)}</span>
              </div>
            )}
            <div className="flex items-center space-x-1">
              <span>📊 已发布:</span>
              <span className="font-bold">{topic.articles_count || 0} 篇报道</span>
            </div>
          </div>
          
          {/* 摘要 */}
          {topic.summary && (
            <div className="bg-white/70 backdrop-blur-sm p-4 rounded-lg border border-red-200">
              <p className="text-red-900 font-medium text-lg leading-relaxed">
                {topic.summary}
              </p>
            </div>
          )}
        </div>
      </Section>

      {/* 🔴 快速信息卡片 */}
      <Section space="sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* 最新进展 */}
          <div className="bg-red-600 text-white rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-xl">📢</span>
              <span className="font-bold">最新进展</span>
            </div>
            <p className="text-red-100 text-sm">
              关注官方发布的最新信息
            </p>
          </div>
          
          {/* 救援行动 */}
          <div className="bg-orange-600 text-white rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-xl">🆘</span>
              <span className="font-bold">救援行动</span>
            </div>
            <p className="text-orange-100 text-sm">
              各方救援力量紧急出动
            </p>
          </div>
          
          {/* 权威发布 */}
          <div className="bg-blue-600 text-white rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-xl">📋</span>
              <span className="font-bold">权威发布</span>
            </div>
            <p className="text-blue-100 text-sm">
              官方部门权威信息发布
            </p>
          </div>
        </div>
      </Section>

      {/* 📊 主要内容区域 */}
      <Section space="md">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 主要内容 */}
          <div className="lg:col-span-3 space-y-6">
            {/* 突发事件报道 */}
            <div className="bg-white border-2 border-red-200 rounded-lg overflow-hidden shadow-lg">
              <div className="bg-red-600 px-6 py-4 text-white">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold flex items-center space-x-2">
                    <span>🚨</span>
                    <span>突发事件报道</span>
                  </h2>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                    <span className="text-red-100 text-sm">实时更新</span>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <TopicStrip
                  topicSlug={topic.slug}
                  topicTitle={topic.title}
                  topicStatus={topic.status || 'ongoing'}
                  importanceLevel={topic.importance_level || 'major'}
                  isBreaking={true}
                  showTags={true}
                  articleLimit={15}
                  className="mb-0"
                />
              </div>
            </div>

            {/* 救援进展时间线 */}
            <div className="bg-white border border-red-200 rounded-lg overflow-hidden">
              <div className="bg-gradient-to-r from-red-50 to-orange-50 px-6 py-4 border-b border-red-200">
                <h2 className="text-xl font-bold text-red-900 flex items-center space-x-2">
                  <span>⏰</span>
                  <span>事件进展时间线</span>
                </h2>
              </div>
              <div className="p-6">
                {/* 时间线占位内容 */}
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-red-200"></div>
                  
                  {/* 时间点示例 */}
                  <div className="flex items-start space-x-4 mb-6">
                    <div className="flex-shrink-0 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">1</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-bold text-red-900">事件发生</span>
                        <span className="text-sm text-gray-500">
                          {topic.start_date ? formatTimeForSSR(topic.start_date) : '待更新'}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm">
                        {topic.title}相关事件发生，各方开始关注
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4 mb-6">
                    <div className="flex-shrink-0 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">2</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-bold text-orange-900">紧急响应</span>
                        <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs">进行中</span>
                      </div>
                      <p className="text-gray-700 text-sm">
                        相关部门启动应急预案，救援力量火速赶往现场
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 侧边栏 */}
          <div className="space-y-6">
            {/* 紧急联系信息 */}
            <div className="bg-red-50 border-2 border-red-200 rounded-lg overflow-hidden">
              <div className="bg-red-600 px-4 py-3 text-white">
                <h3 className="font-bold flex items-center space-x-1">
                  <span>📞</span>
                  <span>紧急信息</span>
                </h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600 animate-pulse">
                    {topic.priority_weight || 1000}
                  </div>
                  <div className="text-sm text-red-700">优先级等级</div>
                </div>
                
                <div className="bg-white rounded p-3 border border-red-200">
                  <div className="text-xs text-gray-600 mb-1">事件状态</div>
                  <div className={`font-bold ${
                    topic.status === 'ongoing' ? 'text-red-600' : 'text-orange-600'
                  }`}>
                    {topic.status_display || '正在进行'}
                  </div>
                </div>
                
                <div className="bg-white rounded p-3 border border-red-200">
                  <div className="text-xs text-gray-600 mb-1">影响范围</div>
                  <div className="font-bold text-red-600">
                    {topic.importance_display || '重大级'}
                  </div>
                </div>
                
                {topic.tags && topic.tags.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs text-gray-600">相关标签</div>
                    <div className="flex flex-wrap gap-1">
                      {topic.tags.slice(0, 5).map((tag: any, index: number) => (
                        <span 
                          key={index}
                          className="inline-block px-2 py-1 bg-red-100 text-red-700 text-xs rounded font-medium"
                        >
                          #{typeof tag === 'string' ? tag : tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 官方发布 */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-blue-600 px-4 py-3 text-white">
                <h3 className="font-bold flex items-center space-x-1">
                  <span>🏛️</span>
                  <span>官方发布</span>
                </h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="text-center py-4">
                  <div className="text-blue-600 mb-2">📋</div>
                  <p className="text-sm text-gray-600">
                    请关注官方权威发布的最新信息
                  </p>
                </div>
              </div>
            </div>

            {/* 相关突发事件 */}
            {topics.some(t => t.is_breaking && t.slug !== topic.slug) && (
              <div className="bg-white border border-red-200 rounded-lg overflow-hidden">
                <div className="bg-red-50 px-4 py-3 border-b border-red-200">
                  <h3 className="font-bold text-red-900 flex items-center space-x-1">
                    <span>🚨</span>
                    <span>相关突发事件</span>
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  {topics
                    .filter(t => t.is_breaking && t.slug !== topic.slug)
                    .slice(0, 3)
                    .map((breakingTopic: any) => (
                    <div key={breakingTopic.slug} className="border-l-4 border-red-400 pl-3 py-2">
                      <a 
                        href={`/portal/topic/${breakingTopic.slug}`}
                        className="text-sm font-medium text-red-900 hover:text-red-700 line-clamp-2 block"
                      >
                        {breakingTopic.title}
                      </a>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-bold">
                          突发
                        </span>
                        <span className="text-xs text-gray-500">
                          {breakingTopic.articles_count || 0} 篇
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Section>
    </PageContainer>
  );
};

export default BreakingTopicTemplate;
