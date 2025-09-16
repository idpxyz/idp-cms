/**
 * 专题展示组件
 * 支持展示推荐专题、专题列表、专题详情等多种模式
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { topicService, Topic, TopicDetail, TrendingTopic } from '@/lib/api';

interface TopicShowcaseProps {
  /** 显示模式 */
  mode?: 'featured' | 'list' | 'grid' | 'carousel' | 'trending';
  /** 当前站点 */
  site?: string;
  /** 显示数量限制 */
  limit?: number;
  /** 是否显示推荐专题优先 */
  featuredOnly?: boolean;
  /** 自定义样式类名 */
  className?: string;
  /** 标题 */
  title?: string;
  /** 专题点击回调 */
  onTopicClick?: (topic: Topic | TrendingTopic) => void;
}

/**
 * 专题卡片组件
 */
const TopicCard: React.FC<{
  topic: Topic;
  size?: 'small' | 'medium' | 'large';
  showSummary?: boolean;
  showStats?: boolean;
  onTopicClick?: (topic: Topic) => void;
}> = ({ topic, size = 'medium', showSummary = true, showStats = true, onTopicClick }) => {
  const handleClick = (e: React.MouseEvent) => {
    if (onTopicClick) {
      e.preventDefault();
      onTopicClick(topic);
    }
  };

  const getStatusBadge = () => {
    if (!topic.is_active) return '未启用';
    
    const now = new Date();
    if (topic.start_date && new Date(topic.start_date) > now) return '即将开始';
    if (topic.end_date && new Date(topic.end_date) < now) return '已结束';
    if (topic.is_featured) return '推荐';
    
    return null;
  };

  const statusBadge = getStatusBadge();

  const cardSizeClasses = {
    small: 'p-4',
    medium: 'p-6',
    large: 'p-8'
  };

  return (
    <Link
      href={`/topic/${topic.slug}`}
      onClick={handleClick}
      className={`block ${cardSizeClasses[size]} bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200 hover:border-gray-300`}
    >
      <div className="flex flex-col h-full">
        {/* 封面图片 */}
        {topic.cover_image_url && (
          <div className="relative mb-4 overflow-hidden rounded-md">
            <Image
              src={topic.cover_image_url}
              alt={topic.title}
              width={size === 'small' ? 300 : size === 'medium' ? 400 : 500}
              height={size === 'small' ? 150 : size === 'medium' ? 200 : 250}
              className="w-full h-auto object-cover"
              priority={topic.is_featured}
            />
            {statusBadge && (
              <div className="absolute top-2 right-2">
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                  topic.is_featured 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : topic.is_active 
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                }`}>
                  {statusBadge}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 专题信息 */}
        <div className="flex-1">
          <h3 className={`font-semibold text-gray-900 mb-2 ${
            size === 'small' ? 'text-sm' : size === 'medium' ? 'text-base' : 'text-lg'
          }`}>
            {topic.title}
          </h3>

          {showSummary && topic.summary && (
            <p className={`text-gray-600 mb-3 line-clamp-3 ${
              size === 'small' ? 'text-xs' : 'text-sm'
            }`}>
              {topic.summary}
            </p>
          )}

          {showStats && (
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{topic.articles_count} 篇文章</span>
              {topic.created_at && (
                <span>
                  {new Date(topic.created_at).toLocaleDateString('zh-CN')}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

/**
 * 热门话题卡片组件
 */
const TrendingTopicCard: React.FC<{
  topic: TrendingTopic;
  onTopicClick?: (topic: TrendingTopic) => void;
}> = ({ topic, onTopicClick }) => {
  const handleClick = (e: React.MouseEvent) => {
    if (onTopicClick) {
      e.preventDefault();
      onTopicClick(topic);
    }
  };

  const getTrendIcon = () => {
    switch (topic.trend) {
      case 'up':
        return <span className="text-green-500">↗</span>;
      case 'down':
        return <span className="text-red-500">↘</span>;
      default:
        return <span className="text-gray-400">→</span>;
    }
  };

  const getHeatColor = () => {
    if (topic.heat >= 80) return 'bg-red-100 text-red-800';
    if (topic.heat >= 60) return 'bg-orange-100 text-orange-800';
    if (topic.heat >= 40) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <Link
      href={`/trending/${topic.slug}`}
      onClick={handleClick}
      className="block p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 hover:border-gray-300"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 text-sm mb-1 line-clamp-2">
            {topic.title}
          </h4>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{topic.articles_count} 篇文章</span>
            <span>热度 {topic.heat}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-3">
          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getHeatColor()}`}>
            {topic.heat}
          </span>
          {getTrendIcon()}
        </div>
      </div>
    </Link>
  );
};

/**
 * 专题列表视图
 */
const TopicListView: React.FC<{
  topics: Topic[];
  onTopicClick?: (topic: Topic) => void;
}> = ({ topics, onTopicClick }) => {
  return (
    <div className="space-y-4">
      {topics.map((topic) => (
        <div key={topic.id} className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
          <TopicCard
            topic={topic}
            size="small"
            showSummary={true}
            showStats={true}
            onTopicClick={onTopicClick}
          />
        </div>
      ))}
    </div>
  );
};

/**
 * 专题网格视图
 */
const TopicGridView: React.FC<{
  topics: Topic[];
  onTopicClick?: (topic: Topic) => void;
}> = ({ topics, onTopicClick }) => {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {topics.map((topic) => (
        <TopicCard
          key={topic.id}
          topic={topic}
          size="medium"
          showSummary={true}
          showStats={true}
          onTopicClick={onTopicClick}
        />
      ))}
    </div>
  );
};

/**
 * 热门话题视图
 */
const TrendingTopicsView: React.FC<{
  topics: TrendingTopic[];
  onTopicClick?: (topic: TrendingTopic) => void;
}> = ({ topics, onTopicClick }) => {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {topics.map((topic, index) => (
        <div key={topic.slug} className="relative">
          {index < 3 && (
            <div className="absolute -top-2 -left-2 z-10">
              <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-500 rounded-full">
                {index + 1}
              </span>
            </div>
          )}
          <TrendingTopicCard topic={topic} onTopicClick={onTopicClick} />
        </div>
      ))}
    </div>
  );
};

/**
 * 专题展示主组件
 */
const TopicShowcase: React.FC<TopicShowcaseProps> = ({
  mode = 'grid',
  site,
  limit = 6,
  featuredOnly = false,
  className = '',
  title,
  onTopicClick,
}) => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        setLoading(true);
        setError(null);

        if (mode === 'trending') {
          // 获取热门话题
          const trendingData = await topicService.getTrendingTopics({
            site,
            size: limit,
          });
          setTrendingTopics(trendingData.items);
        } else {
          // 获取数据库专题
          const data = await topicService.getTopics({
            site,
            featured_only: featuredOnly,
            limit,
          });
          setTopics(data);
        }
      } catch (err) {
        console.error('Failed to load topics:', err);
        setError('加载专题失败');
      } finally {
        setLoading(false);
      }
    };

    fetchTopics();
  }, [site, mode, limit, featuredOnly]);

  if (loading) {
    return (
      <div className={`topic-showcase-loading ${className}`}>
        {title && <h2 className="text-xl font-semibold mb-4">{title}</h2>}
        <div className="animate-pulse">
          {mode === 'list' ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`topic-showcase-error ${className}`}>
        {title && <h2 className="text-xl font-semibold mb-4">{title}</h2>}
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`topic-showcase ${className}`}>
      {title && <h2 className="text-xl font-semibold mb-6">{title}</h2>}

      {mode === 'trending' ? (
        <TrendingTopicsView topics={trendingTopics} onTopicClick={onTopicClick} />
      ) : mode === 'list' ? (
        <TopicListView topics={topics} onTopicClick={onTopicClick} />
      ) : mode === 'featured' && topics.length > 0 ? (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
          <TopicCard
            topic={topics[0]}
            size="large"
            showSummary={true}
            showStats={true}
            onTopicClick={onTopicClick}
          />
        </div>
      ) : (
        <TopicGridView topics={topics} onTopicClick={onTopicClick} />
      )}

      {/* 查看更多链接 */}
      {((mode === 'trending' && trendingTopics.length >= limit) || 
        (mode !== 'trending' && topics.length >= limit)) && (
        <div className="mt-6 text-center">
          <Link
            href={mode === 'trending' ? '/trending' : '/topics'}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
          >
            查看更多专题
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
};

export default TopicShowcase;
