'use client';

import React from 'react';
import Image from 'next/image';
import { getSocialHeadlines, formatTimeAgo, type SocialArticle } from '../SocialTemplate.utils';
import { useSocialData } from '../hooks/useSocialData';
import ErrorState, { EmptyState } from './ErrorState';
import { useAdaptiveLinkSSR } from '@/app/portal/hooks/useAdaptiveLink';

interface SocialHeadlinesProps {
  channelSlug: string;
  limit?: number;
}

/**
 * 🎯 社会频道头条新闻组件
 * 独立的客户端组件，自行管理数据获取
 */
const SocialHeadlines: React.FC<SocialHeadlinesProps> = ({ channelSlug, limit = 5 }) => {
  const { data: headlines, isLoading, error, retry } = useSocialData(
    getSocialHeadlines,
    channelSlug,
    limit
  );
  
  // 🎯 自适应链接：桌面端新标签页，移动端当前页
  const adaptiveLinkProps = useAdaptiveLinkSSR();

  // 加载状态
  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 gap-6">
        {/* 主头条骨架 */}
        <div className="md:col-span-1 animate-pulse">
          <div className="bg-gray-200 rounded-xl h-80"></div>
        </div>
        {/* 次要头条骨架 */}
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="bg-gray-200 rounded-lg w-32 h-20"></div>
              <div className="flex-1 space-y-2">
                <div className="bg-gray-200 rounded h-4 w-3/4"></div>
                <div className="bg-gray-200 rounded h-3 w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <ErrorState 
        error={error}
        message="头条新闻加载失败"
        onRetry={retry}
        showDetails={process.env.NODE_ENV === 'development'}
      />
    );
  }

  // 空状态
  if (!headlines || headlines.length === 0) {
    return <EmptyState message="暂无头条新闻" icon="📰" />;
  }

  const mainHeadline = headlines[0];
  const sideHeadlines = headlines.slice(1, 5);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* 主头条 */}
      <div className="md:col-span-1 group cursor-pointer">
        <a href={`/portal/article/${mainHeadline.slug}`} {...adaptiveLinkProps} className="block">
          <div className="relative h-80 rounded-xl overflow-hidden mb-4">
            <Image
              src={mainHeadline.image_url || 'https://picsum.photos/800/450'}
              alt={mainHeadline.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute top-4 left-4">
              <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium">头条</span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <h2 className="text-2xl font-bold mb-2 line-clamp-2 group-hover:text-red-300 transition-colors">
                {mainHeadline.title}
              </h2>
              <p className="text-gray-200 text-sm line-clamp-2 mb-3">{mainHeadline.excerpt}</p>
              <div className="flex items-center space-x-4 text-xs text-gray-300">
                <span>{formatTimeAgo(mainHeadline.publish_at)}</span>
                <span>•</span>
                <span>{mainHeadline.view_count} 阅读</span>
                <span>•</span>
                <span>{mainHeadline.comment_count} 评论</span>
              </div>
            </div>
          </div>
        </a>
      </div>

      {/* 次要头条列表 */}
      <div className="space-y-4">
        {sideHeadlines.map((article: SocialArticle) => (
          <a
            key={article.id}
            href={`/portal/article/${article.slug}`}
            {...adaptiveLinkProps}
            className="flex gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors group cursor-pointer"
          >
            <div className="relative w-32 h-20 flex-shrink-0 rounded-lg overflow-hidden">
              <Image
                src={article.image_url || 'https://picsum.photos/320/200'}
                alt={article.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 line-clamp-2 mb-1 group-hover:text-red-600 transition-colors">
                {article.title}
              </h3>
              <div className="flex items-center space-x-3 text-xs text-gray-500">
                <span>{formatTimeAgo(article.publish_at)}</span>
                <span>•</span>
                <span>{article.view_count} 阅读</span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default SocialHeadlines;
