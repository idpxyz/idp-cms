"use client";
import React, { useEffect, useState } from "react";
import { endpoints } from '@/lib/config/endpoints';

export default function HotTopicsModule() {
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/backend/topics?size=8', { cache: 'no-store' });
        const data = res.ok ? await res.json() : { items: [] };
        const items = (data && (data.items || data)) || [];
        setTopics(items || []);
      } catch (e) {
        console.error("load hot topics failed", e);
        setTopics([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="section-title mb-4">热门话题</h3>
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      ) : topics.length > 0 ? (
        <div className="space-y-3">
          {topics.map((topic: any, index: number) => (
            <div key={`topic-${topic.slug || topic.id || index}`} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="news-meta font-medium text-red-500">{index + 1}</span>
                {topic.slug ? (
                  <a href={`/portal/topic/${topic.slug}`} className="news-meta text-gray-700 hover:text-red-500 transition-colors">
                    {topic.title}
                  </a>
                ) : (
                  <span className="news-meta text-gray-700">{topic.title}</span>
                )}
              </div>
              <span className="news-meta-small text-gray-400">🔥 {Math.round(topic.heat ?? Math.max(20, Math.min(90, (topic.article_count || 0) * 10)))}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 news-meta">暂无热门话题</p>
      )}
    </div>
  );
}


