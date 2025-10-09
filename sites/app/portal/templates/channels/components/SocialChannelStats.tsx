'use client';

import React from 'react';
import { getSocialChannelStats, formatNumber, type SocialChannelStats as StatsType } from '../SocialTemplate.utils';
import { useSocialData } from '../hooks/useSocialData';
import { ErrorInline } from './ErrorState';

interface SocialChannelStatsProps {
  channelSlug: string;
  channelName: string;
}

/**
 * 📊 社会频道统计信息组件
 */
const SocialChannelStats: React.FC<SocialChannelStatsProps> = ({ channelSlug, channelName }) => {
  const { data: stats, isLoading, error, retry } = useSocialData(
    getSocialChannelStats,
    channelSlug
  );

  // 加载状态
  if (isLoading) {
    return (
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="page-title text-gray-900">{channelName}</h1>
            <span className="template-badge bg-red-100 text-red-700 px-3 py-1 rounded-full">实时更新</span>
          </div>
          <div className="flex items-center space-x-4 animate-pulse">
            <div className="bg-gray-200 rounded h-4 w-24"></div>
            <div className="bg-gray-200 rounded h-4 w-24"></div>
          </div>
        </div>
        <div className="flex items-center space-x-6 mt-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6, 7].map(i => (
            <div key={i} className="bg-gray-200 rounded h-3 w-12"></div>
          ))}
        </div>
      </div>
    );
  }

  // 错误状态（行内显示）
  if (error) {
    return (
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <h1 className="page-title text-gray-900">{channelName}</h1>
            <span className="template-badge bg-red-100 text-red-700 px-3 py-1 rounded-full">实时更新</span>
          </div>
        </div>
        <ErrorInline message="统计信息加载失败" onRetry={retry} />
      </div>
    );
  }

  // 使用默认值如果没有数据
  const displayStats = stats || {
    articles_count: 0,
    followers_count: 0,
    deep_reports_count: 0,
  };

  return (
    <div className="border-b border-gray-200 pb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h1 className="page-title text-gray-900">{channelName}</h1>
          <span className="template-badge bg-red-100 text-red-700 px-3 py-1 rounded-full">实时更新</span>
        </div>
        <div className="flex items-center space-x-4 news-meta text-gray-500">
          <span>今日更新 {formatNumber(displayStats.articles_count)} 条</span>
          <span>|</span>
          <span>关注 {formatNumber(displayStats.followers_count)} 人</span>
        </div>
      </div>
      
      {/* 分类导航 */}
      <div className="flex items-center space-x-6 mt-4">
        <a href={`/portal?channel=${channelSlug}&category=头条`} className="news-meta font-medium text-red-600 border-b-2 border-red-600 pb-1">头条</a>
        <a href={`/portal?channel=${channelSlug}&category=民生`} className="news-meta text-gray-600 hover:text-gray-900 pb-1">民生</a>
        <a href={`/portal?channel=${channelSlug}&category=法治`} className="news-meta text-gray-600 hover:text-gray-900 pb-1">法治</a>
        <a href={`/portal?channel=${channelSlug}&category=教育`} className="news-meta text-gray-600 hover:text-gray-900 pb-1">教育</a>
        <a href={`/portal?channel=${channelSlug}&category=就业`} className="news-meta text-gray-600 hover:text-gray-900 pb-1">就业</a>
        <a href={`/portal?channel=${channelSlug}&category=医疗`} className="news-meta text-gray-600 hover:text-gray-900 pb-1">医疗</a>
        <a href={`/portal?channel=${channelSlug}&category=环保`} className="news-meta text-gray-600 hover:text-gray-900 pb-1">环保</a>
      </div>
    </div>
  );
};

export default SocialChannelStats;
