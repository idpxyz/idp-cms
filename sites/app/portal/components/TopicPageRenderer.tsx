'use client';

import React from 'react';
import { getTopicTemplate } from '../templates/topics';

interface TopicPageRendererProps {
  topicSlug: string;
  topics: any[];
  tags?: string;
}

/**
 * 🏛️ 智能专题页面渲染器
 * 优先使用数据库配置的模板，回退到标签和属性映射
 * 
 * 设计理念：
 * - 🎨 优先使用数据库中配置的专题模板信息
 * - 📁 每个专题类型都有独立的模板文件 (如 BreakingTopicTemplate.tsx)
 * - 🔄 支持在Wagtail后台动态切换模板
 * - 🛡️ 智能映射：基于专题标签、重要性、突发状态等自动选择模板
 * - 🚀 管理员友好：无需修改代码即可调整模板展示
 */
const TopicPageRenderer: React.FC<TopicPageRendererProps> = ({
  topicSlug,
  topics,
  tags
}) => {
  // 🔍 查找对应专题
  const topic = topics.find(t => t.slug === topicSlug);
  
  if (!topic) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            ❌ 专题不存在
          </h1>
          <p className="text-gray-600 mb-6">
            找不到专题 "{topicSlug}"，请检查链接地址。
          </p>
          <div className="space-y-3">
            <a 
              href="/portal" 
              className="inline-block px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors mr-3"
            >
              返回首页
            </a>
            <a 
              href="/portal/topics" 
              className="inline-block px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              浏览所有专题
            </a>
          </div>
        </div>
      </div>
    );
  }

  // 📋 专题状态检查
  if (!topic.is_active) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-gray-700 mb-4">
            🔒 专题未启用
          </h1>
          <p className="text-gray-600 mb-6">
            专题 "{topic.title}" 当前未启用，无法访问。
          </p>
          <div className="bg-gray-100 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">专题状态:</span>
              <span className={`font-medium ${
                topic.status === 'archived' ? 'text-orange-600' :
                topic.status === 'concluded' ? 'text-blue-600' : 'text-gray-600'
              }`}>
                {topic.status_display || topic.status || '未知'}
              </span>
            </div>
            {topic.end_date && (
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-600">结束时间:</span>
                <span className="text-gray-700">
                  {new Date(topic.end_date).toLocaleDateString('zh-CN')}
                </span>
              </div>
            )}
          </div>
          <a 
            href="/portal" 
            className="inline-block px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            返回首页
          </a>
        </div>
      </div>
    );
  }

  // 🎨 获取对应的模板组件 - 使用完整的专题对象
  const TemplateComponent = getTopicTemplate(topic);
  
  // 📄 渲染模板
  return (
    <TemplateComponent
      topic={topic}
      topics={topics}
      tags={tags}
    />
  );
};

export default TopicPageRenderer;
