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
 * 📄 默认专题模板
 * 适用于一般专题，简洁清晰的布局设计
 */
const DefaultTopicTemplate: React.FC<TopicTemplateProps> = ({ 
  topic, 
  topics = [], 
  tags 
}) => {
  return (
    <PageContainer>
      {/* 🎯 专题标题栏 */}
      <Section space="sm">
        <div className="border-b border-gray-200 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h1 className="page-title text-gray-900">{topic.title}</h1>
              <div className="flex items-center space-x-2">
                {topic.importance_level && (
                  <span className={`template-badge px-3 py-1 rounded-full text-sm font-medium ${
                    topic.importance_level === 'national' 
                      ? 'bg-red-100 text-red-700' 
                      : topic.importance_level === 'major'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {topic.importance_display || topic.importance_level}
                  </span>
                )}
                
                {topic.status && (
                  <span className={`template-badge px-3 py-1 rounded-full text-sm font-medium ${
                    topic.status === 'ongoing'
                      ? 'bg-green-100 text-green-700'
                      : topic.status === 'upcoming'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {topic.status_display || topic.status}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-4 news-meta text-gray-500">
              {topic.articles_count !== undefined && (
                <span>{topic.articles_count} 篇文章</span>
              )}
              {topic.start_date && (
                <>
                  <span>|</span>
                  <span>{formatDateShort(topic.start_date)}</span>
                </>
              )}
            </div>
          </div>
          
          {/* 专题摘要 */}
          {topic.summary && (
            <p className="text-gray-600 template-subtitle mt-3 max-w-4xl">
              {topic.summary}
            </p>
          )}
          
          {/* 专题标签 */}
          {topic.tags && topic.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {topic.tags.map((tag: any, index: number) => (
                <span 
                  key={index}
                  className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                >
                  #{typeof tag === 'string' ? tag : tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* 📊 专题内容区域 */}
      <Section space="md">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 主要内容 */}
          <div className="lg:col-span-3 space-y-6">
            {/* 专题文章 */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h2 className="section-title text-gray-900">专题报道</h2>
              </div>
              <div className="p-6">
                <TopicStrip
                  topicSlug={topic.slug}
                  topicTitle={topic.title}
                  topicStatus={topic.status || 'ongoing'}
                  importanceLevel={topic.importance_level || 'major'}
                  isBreaking={topic.is_breaking || false}
                  showTags={true}
                  articleLimit={12}
                  className="mb-0"
                />
              </div>
            </div>

            {/* 专题扩展信息 */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h2 className="section-title text-gray-900">专题背景</h2>
              </div>
              <div className="p-6">
                <div className="prose max-w-none">
                  <p className="text-gray-700 leading-relaxed">
                    此专题汇集了关于"{topic.title}"的全面报道和深度分析。
                    我们将持续关注相关动态，为您提供最新、最准确的信息。
                  </p>
                  
                  {topic.tags && topic.tags.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">相关主题</h3>
                      <div className="flex flex-wrap gap-2">
                        {topic.tags.map((tag: any, index: number) => (
                          <span 
                            key={index}
                            className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                          >
                            {typeof tag === 'string' ? tag : tag.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {topic.start_date && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span>📅</span>
                        <span>专题开始时间: {formatDateShort(topic.start_date)}</span>
                      </div>
                      {topic.end_date && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                          <span>🏁</span>
                          <span>专题结束时间: {formatDateShort(topic.end_date)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 侧边栏 */}
          <div className="space-y-6">
            {/* 专题信息 */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h3 className="template-card-title text-gray-900">专题信息</h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">创建时间:</span>
                  <span className="text-gray-900">
                    {topic.created_at ? formatDateShort(topic.created_at) : '-'}
                  </span>
                </div>
                {topic.start_date && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">开始时间:</span>
                    <span className="text-gray-900">
                      {formatDateShort(topic.start_date)}
                    </span>
                  </div>
                )}
                {topic.end_date && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">结束时间:</span>
                    <span className="text-gray-900">
                      {formatDateShort(topic.end_date)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">重要程度:</span>
                  <span className={`text-sm font-medium ${
                    topic.importance_level === 'national' ? 'text-red-600' :
                    topic.importance_level === 'major' ? 'text-orange-600' : 'text-blue-600'
                  }`}>
                    {topic.importance_display || topic.importance_level || '一般'}
                  </span>
                </div>
              </div>
            </div>

            {/* 相关专题推荐 */}
            {topics.length > 1 && (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h3 className="template-card-title text-gray-900">相关专题</h3>
                </div>
                <div className="p-4 space-y-3">
                  {topics
                    .filter(t => t.slug !== topic.slug)
                    .slice(0, 5)
                    .map((relatedTopic: any) => (
                    <div key={relatedTopic.slug} className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-2 h-2 bg-gray-400 rounded-full mt-2"></div>
                      <div className="flex-1 min-w-0">
                        <a 
                          href={`/portal/topic/${relatedTopic.slug}`}
                          className="news-meta-small text-gray-900 hover:text-red-600 line-clamp-2 block"
                        >
                          {relatedTopic.title}
                        </a>
                        <div className="flex items-center space-x-2 mt-1">
                          {relatedTopic.is_breaking && (
                            <span className="text-xs bg-red-100 text-red-600 px-1 rounded">突发</span>
                          )}
                          <span className="text-xs text-gray-500">
                            {relatedTopic.articles_count || 0} 篇
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 专题数据统计 */}
            {topic.articles_count !== undefined && (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h3 className="template-card-title text-gray-900">数据统计</h3>
                </div>
                <div className="p-4 space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{topic.articles_count}</div>
                    <div className="news-meta-small text-gray-500">相关报道</div>
                  </div>
                  {topic.priority_weight && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{topic.priority_weight}</div>
                      <div className="news-meta-small text-gray-500">权重等级</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </Section>
    </PageContainer>
  );
};

export default DefaultTopicTemplate;
