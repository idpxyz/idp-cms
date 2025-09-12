"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trackPageView, trackDwell } from "@/lib/tracking/analytics";
import { useIntersectionObserver } from "@/lib/hooks/useIntersectionObserver";
import { formatDateTimeFull, formatDateTime } from "@/lib/utils/date";
import { useChannels } from "../../ChannelContext";

interface Article {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  image_url: string | null;
  cover: any;
  channel: {
    id: number;
    name: string;
    slug: string;
  };
  region: string;
  publish_at: string;
  updated_at: string;
  is_featured: boolean;
  source: string;
  author: string;
  tags: string[];
}

interface ArticleContentProps {
  article: Article;
  relatedArticles: Article[];
}

export default function ArticleContent({
  article,
  relatedArticles,
}: ArticleContentProps) {
  const router = useRouter();
  const { switchChannel } = useChannels();
  // 页面浏览追踪
  useEffect(() => {
    if (article) {
      trackPageView(article.slug, article.channel?.slug);
    }
  }, [article.slug, article.channel?.slug]); // 🎯 修复：使用具体的值而不是整个对象

  // 文章内容阅读时间追踪
  const { observe } = useIntersectionObserver({
    threshold: 0.3,
    trackDwellTime: true,
    onLeave: (element, dwellTime) => {
      if (dwellTime > 5000) {
        // 阅读超过5秒才记录
        trackDwell(article.slug, dwellTime, article.channel?.slug);
      }
    },
  });

  // 观察文章内容区域
  useEffect(() => {
    const contentElement = document.querySelector("[data-article-content]");
    if (contentElement) {
      observe(contentElement);
    }
  }, [observe]);

  const handleRelatedArticleClick = (relatedSlug: string, event: React.MouseEvent) => {
    event.preventDefault();
    trackPageView(relatedSlug, article.channel?.slug);
    // 🎯 简化相关文章导航，不需要保持频道参数
    router.push(`/portal/article/${relatedSlug}`);
  };

  const handleChannelBreadcrumbClick = (event: React.MouseEvent) => {
    event.preventDefault();
    const channelSlug = article.channel?.slug;
    if (channelSlug) {
      console.log('🍞 Breadcrumb channel clicked:', channelSlug);
      // 🎯 使用新架构的统一切换函数
      switchChannel(channelSlug);
    }
  };

  return (
    <div className="bg-gray-50">
      {/* 面包屑导航 - 简洁版 */}
      <nav className="py-2">
        <div className="flex items-center text-sm">
          <Link href="/portal" className="text-gray-500 hover:text-gray-700">
            首页
          </Link>
          <span className="mx-2 text-gray-400">/</span>
          <button
            onClick={handleChannelBreadcrumbClick}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            {article.channel?.name || "未知频道"}
          </button>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-900 truncate">{article.title}</span>
        </div>
      </nav>

      <div className="py-2">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 主内容列 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden lg:col-span-2">
            {/* 文章头部 */}
            <div className="p-6">
              {/* 频道标签 */}
              <div className="mb-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  {article.channel?.name || "未知频道"}
                </span>
              </div>

              {/* 文章标题 */}
              <h1 className="text-2xl font-bold text-gray-900 mb-3 leading-tight">
                {article.title}
              </h1>

              {/* 文章元信息 */}
              <div className="flex items-center justify-between text-sm text-gray-600 mb-4 pb-4 border-b border-gray-200">
                <div className="flex items-center space-x-4">
                  <span>作者：{article.author || "未知"}</span>
                  <span>来源：{article.source || "本站"}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span>发布时间：{formatDateTimeFull(article.publish_at)}</span>
                  {article.updated_at !== article.publish_at && (
                    <span>
                      更新时间：{formatDateTimeFull(article.updated_at)}
                    </span>
                  )}
                </div>
              </div>

              {/* 文章摘要 */}
              {article.excerpt && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {article.excerpt}
                  </p>
                </div>
              )}
            </div>

            {/* 文章封面图 */}
            {article.image_url && (
              <div className="px-6 mb-4">
                <Image
                  src={article.image_url}
                  alt={article.title}
                  width={800}
                  height={400}
                  className="w-full h-auto rounded-lg object-cover"
                  priority
                />
              </div>
            )}

            {/* 文章内容 */}
            <div className="px-6 pb-6">
              <div
                className="prose prose-lg max-w-none"
                data-article-content
                dangerouslySetInnerHTML={{ __html: article.content }}
              />

              {/* 文章标签 */}
              {article.tags && article.tags.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-sm text-gray-600 mr-1">标签：</span>
                    {article.tags.map((tag, index) => (
                      <Link
                        key={index}
                        href={`/portal/tags/${encodeURIComponent(tag)}`}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        #{tag}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* 分享按钮 */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600">分享到：</span>
                    <button className="text-blue-600 hover:text-blue-800 text-sm">
                      微信
                    </button>
                    <button className="text-blue-600 hover:text-blue-800 text-sm">
                      微博
                    </button>
                    <button className="text-blue-600 hover:text-blue-800 text-sm">
                      QQ
                    </button>
                  </div>
                  <button className="text-gray-600 hover:text-gray-800 text-sm">
                    📤 分享
                  </button>
                </div>
              </div>

              {/* 返回按钮 */}
              <div className="mt-6 text-center">
                <Link
                  href={`/portal?channel=${article.channel?.slug}`}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  ← 返回首页
                </Link>
              </div>
            </div>
          </div>

          {/* 右侧相关文章 */}
          {relatedArticles && relatedArticles.length > 0 && (
            <aside className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="text-base font-bold text-gray-900 mb-3">相关文章</h3>
                <div className="grid gap-3">
                  {relatedArticles.slice(0, 4).map((related) => (
                    <div
                      key={related.id}
                      className="flex space-x-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                      data-article-id={related.slug}
                    >
                      {related.image_url && (
                        <Image
                          src={related.image_url}
                          alt={related.title}
                          width={80}
                          height={60}
                          className="w-16 h-12 object-cover rounded flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                          <Link
                            href={`/portal/article/${related.slug}?channel=${article.channel?.slug}`}
                            className="hover:text-red-500 transition-colors"
                            onClick={(e) => handleRelatedArticleClick(related.slug, e)}
                          >
                            {related.title}
                          </Link>
                        </h4>
                        <p className="text-xs text-gray-500 truncate">
                          {related.source || related.channel?.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatDateTime(related.publish_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
