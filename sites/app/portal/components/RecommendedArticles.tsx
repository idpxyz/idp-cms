"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils/date";

interface RecommendationArticle {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  publish_at: string;
  channel_slug: string;
  is_featured: boolean;
  weight: number;
  recommendation_reason: string;
}

interface Props {
  articleSlug: string;
  currentChannel?: string;
  limit?: number;
  articles?: any[]; // ✅ 新增：可选的服务器端数据
}

export default function RecommendedArticles({ articleSlug, currentChannel, limit = 6, articles }: Props) {
  // ✅ 优化：如果有服务器端数据，直接用作初始值
  const [recommendations, setRecommendations] = useState<RecommendationArticle[]>(
    articles && articles.length > 0 ? (articles as RecommendationArticle[]) : []
  );
  const [loading, setLoading] = useState(!articles); // ✅ 如果有服务器端数据，初始不加载

  useEffect(() => {
    // ✅ 优化：如果已有服务器端数据，直接使用，不发起请求
    if (articles && articles.length > 0) {
      setRecommendations(articles as RecommendationArticle[]);
      setLoading(false);
      return;
    }

    if (!articleSlug) return;

    const load = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          limit: limit.toString(),
        });
        
        const response = await fetch(`/api/articles/${encodeURIComponent(articleSlug)}/recommendations?${params}`);
        
        if (response.ok) {
          const data = await response.json();
          setRecommendations(data.recommendations || []);
        } else {
          console.error('获取推荐文章失败:', response.status);
          setRecommendations([]);
        }
      } catch (e) {
        console.error('加载推荐文章失败:', e);
        setRecommendations([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [articleSlug, limit, articles]);

  return (
    <div className="mt-8 pt-6 border-t border-gray-200">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        您可能感兴趣
      </h3>
      
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 overflow-hidden animate-pulse">
              <div className="aspect-video bg-gray-200"></div>
              <div className="p-3">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="flex justify-between">
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                  <div className="h-3 bg-gray-200 rounded w-12"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : recommendations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendations.map((article, index) => (
            <Link
              key={`recommendation-${article.id}-${index}`}
              href={`/portal/article/${article.slug}`}
              className="group bg-white rounded-lg border border-gray-200 hover:border-red-300 hover:shadow-md transition-all overflow-hidden"
            >
              <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <span className="text-gray-400 text-sm">暂无图片</span>
              </div>
              <div className="p-3">
                <h4 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-red-600 transition-colors mb-2">
                  {article.title}
                </h4>
                {article.excerpt && (
                  <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                    {article.excerpt}
                  </p>
                )}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{currentChannel || "推荐"}</span>
                  <span>{formatDateTime(article.publish_at)}</span>
                </div>
                {article.recommendation_reason && (
                  <div className="mt-2">
                    <span className="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                      {article.recommendation_reason}
                    </span>
                  </div>
                )}
                {article.is_featured && (
                  <div className="mt-1">
                    <span className="inline-block bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">
                      编辑精选
                    </span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500 text-sm">暂无相关推荐内容</p>
          <p className="text-gray-400 text-xs mt-1">稍后再来看看吧</p>
        </div>
      )}
    </div>
  );
}
