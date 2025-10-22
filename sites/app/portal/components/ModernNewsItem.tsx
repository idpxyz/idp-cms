'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatDateTime } from '@/lib/utils/date';
import { getSideNewsPlaceholderImage } from '@/lib/utils/placeholderImages';

interface ModernNewsItemProps {
  news: any;
  onArticleClick: (articleId: string) => void;
  index: number;
  showInteractions?: boolean;
}

/**
 * 🔥 现代化新闻条目组件
 * 参考主流新闻应用的设计风格
 * 🚀 使用 React.memo 优化性能
 * 
 * 🔧 客户端组件：使用 useState 和接受事件处理器 props
 */
const ModernNewsItem: React.FC<ModernNewsItemProps> = React.memo(({ 
  news, 
  onArticleClick, 
  index,
  showInteractions = true 
}) => {
  const [imageError, setImageError] = useState(false);
  const articleUrl = news.slug ? `/portal/article/${news.slug}` : 
                    (news.id ? `/portal/article/${news.id}` : (news.url || "/portal"));
  
  // 使用本地placeholder图片系统，避免外部服务依赖
  const placeholderImageUrl = getSideNewsPlaceholderImage({
    id: news.id,
    title: news.title,
    channel: news.channel,
    tags: news.tags
  });

  return (
    <article className="group bg-white hover:bg-gray-50 transition-colors duration-200 border-b border-gray-100 last:border-b-0">
      <div className="flex items-start space-x-4 p-4">
        {/* 左侧内容区域 */}
        <div className="flex-1 min-w-0">
          {/* 新闻来源 */}
          <div className="flex items-center space-x-2 mb-2">
            {news.channel?.name && (
              <span className="inline-flex items-center news-meta">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-1.5"></span>
                {news.channel.name}
              </span>
            )}
            <span className="news-meta-small text-gray-400">·</span>
            <time className="news-meta">
              {formatDateTime(news.publish_time || news.publish_at)}
            </time>
          </div>

          {/* 标题 */}
          <h3 className="news-title-medium line-clamp-2 mb-2 group-hover:text-red-600 transition-colors">
            <Link
              href={articleUrl}
              onClick={() => onArticleClick(news.slug || news.id)}
              className="block"
            >
              {news.title}
            </Link>
          </h3>

          {/* 摘要 - 仅在较大屏幕显示 */}
          {news.excerpt && (
            <p className="hidden sm:block news-excerpt line-clamp-2 mb-3">
              {news.excerpt}
            </p>
          )}

          {/* 底部互动区域 */}
          {showInteractions && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 news-meta-small">
                {/* 点赞数 */}
                <button className="flex items-center space-x-1 hover:text-red-500 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span>{news.like_count || Math.floor(Math.random() * 500) + 10}</span>
                </button>

                {/* 评论数 */}
                <button className="flex items-center space-x-1 hover:text-blue-500 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span>{news.comment_count || Math.floor(Math.random() * 100) + 2}</span>
                </button>

                {/* 阅读时间 */}
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{news.reading_time || Math.floor(Math.random() * 5) + 2} min read</span>
                </div>
              </div>

              {/* 标签 */}
              <div className="flex items-center space-x-2">
                {news.is_featured && (
                  <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">
                    精选
                  </span>
                )}
                {news.final_score && news.final_score > 70 && (
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                    热门
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 右侧图片 */}
        <div className="flex-shrink-0">
          <div className="relative w-32 h-20 sm:w-36 sm:h-24 bg-gray-100 rounded-lg overflow-hidden">
            <Image
              src={(news.image_url && !imageError) ? news.image_url : placeholderImageUrl}
              alt={news.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 128px, 144px"
              priority={false} // 不是 LCP 元素，避免不必要的预加载
              fetchPriority="auto"
              loading="lazy"
              onError={() => {
                if (news.image_url && !imageError) {
                  setImageError(true);
                }
              }}
              onLoad={() => {
                // Image loaded successfully
              }}
            />
            
            {/* 默认封面标识（仅在开发环境显示） */}
            {(!news.image_url || imageError) && process.env.NODE_ENV === 'development' && (
              <div className="absolute top-1 right-1 bg-blue-500 text-white text-xs px-1 py-0.5 rounded opacity-75">
                默认
              </div>
            )}
            {/* 阅读时间标签 */}
            {news.reading_time && (
              <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                {news.reading_time}min
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}, (prevProps, nextProps) => {
  // 只在 news.id/slug 改变时重新渲染，提升性能
  return prevProps.news.id === nextProps.news.id && 
         prevProps.news.slug === nextProps.news.slug &&
         prevProps.showInteractions === nextProps.showInteractions;
});

export default ModernNewsItem;
