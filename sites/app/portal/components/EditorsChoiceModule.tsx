"use client";
import React, { useEffect, useState } from "react";
import { getNews } from "@/lib/api/news";

interface Props {
  limit?: number; // 1-6
}

export default function EditorsChoiceModule({ limit = 4 }: Props) {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await getNews("recommend", 1, 6);
        const list = (res.data || []).slice(0, Math.max(1, Math.min(limit, 6)));
        setArticles(list);
      } catch (e) {
        console.error("load editors choice failed", e);
        setArticles([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [limit]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="section-title mb-4 flex items-center">
        <span className="text-yellow-500 mr-2">⭐</span>
        编辑推荐
      </h3>
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      ) : articles.length > 0 ? (
        <div className="space-y-3">
          {articles.map((article, index) => (
            <div key={`editor-${article.id}-${index}`} className="border-b border-gray-100 last:border-b-0 pb-2 last:pb-0">
              <h4 className="news-meta font-medium text-gray-900 line-clamp-2 mb-1">
                <a href={`/portal/article/${article.slug}`} className="hover:text-red-500 transition-colors">
                  {article.title}
                </a>
              </h4>
              <div className="news-meta-small text-gray-500 flex justify-between">
                <span>{article.channel?.name || article.author || '本站'}</span>
                <span className="text-yellow-500">⭐ 编辑精选</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 news-meta">暂无编辑推荐内容</p>
      )}
    </div>
  );
}


