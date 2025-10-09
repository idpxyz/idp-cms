"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatDateTime } from "@/lib/utils/date";

interface RelatedArticle {
  id: number;
  title: string;
  slug: string;
  image_url?: string | null;
  source?: string;
  publish_at: string;
  channel?: {
    name: string;
    slug: string;
  };
}

interface SidebarRelatedArticlesProps {
  currentChannelSlug: string;
  currentArticleSlug: string;
}

/**
 * 侧栏相关文章 - 客户端组件（异步加载）
 * 显示在文章右侧的相关文章列表
 */
export default function SidebarRelatedArticles({ 
  currentChannelSlug,
  currentArticleSlug 
}: SidebarRelatedArticlesProps) {
  const [articles, setArticles] = useState<RelatedArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRelatedArticles() {
      try {
        const response = await fetch(
          `/api/news?channel=${encodeURIComponent(currentChannelSlug)}&limit=4`,
          { 
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(2000), // 2秒超时
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const items = data?.data || data?.items || [];

        const related = items
          .filter((it: any) => it && it.slug && it.slug !== currentArticleSlug)
          .slice(0, 4)
          .map((it: any) => ({
            id: it.id,
            title: it.title,
            slug: it.slug,
            publish_at: it.publish_at,
            image_url: it.image_url || (it.cover && it.cover.url) || null,
            channel: it.channel || { slug: currentChannelSlug, name: it.channel?.name },
            source: it.source || it.channel?.name || "",
          }));

        setArticles(related);
      } catch (error) {
        console.warn("Failed to fetch related articles:", error);
        setArticles([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRelatedArticles();
  }, [currentChannelSlug, currentArticleSlug]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-24"></div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex space-x-2">
              <div className="w-16 h-12 bg-gray-200 rounded"></div>
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!articles || articles.length === 0) {
    return null;
  }

  // 最多显示4篇
  const displayArticles = articles.slice(0, 4);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center">
        <svg 
          className="w-4 h-4 mr-2 text-blue-500" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" 
          />
        </svg>
        相关文章
      </h3>
      <div className="space-y-3">
        {displayArticles.map((related) => (
          <Link
            key={related.id}
            href={`/portal/article/${related.slug}`}
            className="flex space-x-2 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
          >
            {related.image_url && (
              <div className="relative w-16 h-12 flex-shrink-0">
                <Image
                  src={related.image_url}
                  alt={related.title}
                  fill
                  className="object-cover rounded"
                  sizes="64px"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1 group-hover:text-red-600 transition-colors">
                {related.title}
              </h4>
              <p className="text-xs text-gray-500 truncate">
                {related.source || related.channel?.name || "本站"}
              </p>
              <p className="text-xs text-gray-400">
                {formatDateTime(related.publish_at)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

