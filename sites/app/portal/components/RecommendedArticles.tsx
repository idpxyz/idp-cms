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
  layout?: 'default' | 'sidebar'; // ✅ 新增：布局模式
}

export default function RecommendedArticles({ articleSlug, currentChannel, limit = 6, articles, layout = 'default' }: Props) {
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
        
        // 🚀 性能优化：添加3秒客户端超时（服务端已有2秒超时）
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        try {
          const response = await fetch(
            `/api/articles/${encodeURIComponent(articleSlug)}/recommendations?${params}`,
            { signal: controller.signal }
          );
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const data = await response.json();
            setRecommendations(data.recommendations || []);
          } else {
            console.warn('获取推荐文章失败:', response.status);
            setRecommendations([]);
          }
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          
          if (fetchError.name === 'AbortError') {
            console.warn('推荐文章加载超时 (3秒)');
          } else {
            console.error('加载推荐文章网络错误:', fetchError);
          }
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

  // 根据布局模式动态调整网格
  const gridClassName = layout === 'sidebar' 
    ? "grid grid-cols-1 gap-4" 
    : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4";
  
  const containerClassName = layout === 'sidebar'
    ? "bg-white rounded-lg shadow-sm p-4"
    : "mt-4 pt-4";

  return (
    <div className={containerClassName}>
      <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center">
        <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        您可能感兴趣
      </h3>
      
      {loading ? (
        <div className={gridClassName}>
          {[...Array(layout === 'sidebar' ? 5 : 6)].map((_, i) => (
            layout === 'sidebar' ? (
              // 侧边栏骨架屏
              <div key={i} className="flex gap-3 p-2 animate-pulse">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
            ) : (
              // 默认模式骨架屏
              <div key={i} className="bg-white rounded-lg shadow-sm overflow-hidden animate-pulse">
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
            )
          ))}
        </div>
      ) : recommendations.length > 0 ? (
        <div className={gridClassName}>
          {recommendations.slice(0, layout === 'sidebar' ? 5 : 6).map((article, index) => (
            layout === 'sidebar' ? (
              // 侧边栏模式：横向紧凑布局
              <Link
                key={`recommendation-${article.id}-${index}`}
                href={`/portal/article/${article.slug}`}
                className="group flex gap-3 hover:bg-gray-50 rounded-lg transition-colors p-2 -mx-2"
              >
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-red-600 transition-colors mb-1">
                    {article.title}
                  </h4>
                  <div className="text-xs text-gray-500">
                    {formatDateTime(article.publish_at)}
                  </div>
                </div>
              </Link>
            ) : (
              // 默认模式：原有的卡片布局
              <Link
                key={`recommendation-${article.id}-${index}`}
                href={`/portal/article/${article.slug}`}
                className="group bg-white rounded-lg shadow-sm hover:shadow-md transition-all overflow-hidden"
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
            )
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
