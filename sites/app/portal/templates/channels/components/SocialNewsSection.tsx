'use client';

import React from 'react';
import { getSocialLatestNews, getSocialHotArticles, formatTimeAgo, type SocialArticle } from '../SocialTemplate.utils';
import { useSocialMultiData } from '../hooks/useSocialData';
import ErrorState, { EmptyState } from './ErrorState';
import { useAdaptiveLinkSSR } from '@/app/portal/hooks/useAdaptiveLink';
import ChannelLink from '@/portal/components/ChannelLink';

interface SocialNewsSectionProps {
  channelSlug: string;
}

/**
 * 📰 社会频道新闻区域组件
 * 包含最新新闻和热门文章
 */
const SocialNewsSection: React.FC<SocialNewsSectionProps> = ({ channelSlug }) => {
  const { data, isLoading, error, retry } = useSocialMultiData<[SocialArticle[], SocialArticle[]]>(
    channelSlug,
    [
      { fetcher: getSocialLatestNews, args: [3] },
      { fetcher: getSocialHotArticles, args: [5] },
    ]
  );

  const latestNews = data?.[0] || [];
  const hotArticles = data?.[1] || [];
  
  // 🎯 自适应链接：桌面端新标签页，移动端当前页
  const adaptiveLinkProps = useAdaptiveLinkSSR();

  // 加载状态
  if (isLoading) {
    return (
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse border-b border-gray-200 pb-4">
              <div className="bg-gray-200 rounded h-6 w-3/4 mb-2"></div>
              <div className="bg-gray-200 rounded h-4 w-full mb-1"></div>
              <div className="bg-gray-200 rounded h-4 w-5/6"></div>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded h-4 w-full mb-1"></div>
              <div className="bg-gray-200 rounded h-3 w-2/3"></div>
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
        message="新闻内容加载失败"
        onRetry={retry}
        showDetails={process.env.NODE_ENV === 'development'}
      />
    );
  }

  // 空状态
  if (latestNews.length === 0 && hotArticles.length === 0) {
    return <EmptyState message="暂无新闻内容" icon="📰" />;
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {/* 最新新闻 */}
      <div className="md:col-span-2">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">最新报道</h2>
          <ChannelLink channelSlug={channelSlug} className="text-red-600 hover:text-red-700 text-sm font-medium">
            查看更多新闻 →
          </ChannelLink>
        </div>

        {latestNews.length > 0 ? (
          <>
            <div className="space-y-6">
          {latestNews.map(article => (
            <article key={article.id} className="border-b border-gray-200 pb-6 last:border-0">
              <a href={`/portal/article/${article.slug}`} {...adaptiveLinkProps} className="group">
                    <div className="flex items-start gap-2 mb-2">
                      <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded">最新</span>
                      <span className="text-xs text-gray-500">{formatTimeAgo(article.publish_at)}</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-red-600 transition-colors">
                      {article.title}
                    </h3>
                    <p className="text-gray-600 mb-3 line-clamp-2">{article.excerpt}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        {article.view_count}
                      </span>
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                        {article.comment_count}
                      </span>
                    </div>
                  </a>
                </article>
              ))}
            </div>

            <div className="mt-6 text-center">
              <ChannelLink
                channelSlug={channelSlug}
                className="inline-block bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                加载更多新闻
              </ChannelLink>
            </div>
          </>
        ) : (
          <EmptyState message="暂无最新报道" icon="📭" />
        )}
      </div>

      {/* 热门文章排行 */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <span className="text-red-600 mr-2">🔥</span>
          热门文章
        </h3>
        {hotArticles.length > 0 ? (
          <div className="space-y-4">
            {hotArticles.map((article, index) => (
            <a
              key={article.id}
              href={`/portal/article/${article.slug}`}
              {...adaptiveLinkProps}
              className="flex gap-3 group"
            >
                <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  index === 0 ? 'bg-red-600 text-white' :
                  index === 1 ? 'bg-orange-500 text-white' :
                  index === 2 ? 'bg-yellow-500 text-white' :
                  'bg-gray-200 text-gray-600'
                }`}>
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 line-clamp-2 mb-1 group-hover:text-red-600 transition-colors">
                    {article.title}
                  </h4>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <span>{article.view_count} 阅读</span>
                    <span>•</span>
                    <span>{article.comment_count} 评论</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <EmptyState message="暂无热门文章" icon="📭" />
        )}
      </div>
    </div>
  );
};

export default SocialNewsSection;
