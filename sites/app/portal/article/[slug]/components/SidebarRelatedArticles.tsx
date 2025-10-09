'use client';

import React from "react";
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
  articles: RelatedArticle[];
  currentChannelSlug?: string;
}

/**
 * 侧栏相关文章 - 客户端组件
 * 显示在文章右侧的相关文章列表
 * 
 * 🔧 改为客户端组件：因为被ArticleLayout（客户端组件）使用
 */
export default function SidebarRelatedArticles({ 
  articles,
  currentChannelSlug 
}: SidebarRelatedArticlesProps) {
  if (!articles || articles.length === 0) {
    return null;
  }

  // 最多显示4篇
  const displayArticles = articles.slice(0, 4);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
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

