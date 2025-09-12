"use client";
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import type { FeedItem } from "@/lib/api/feed"; // Keep type definition

export default function MostReadModule({ onArticleClick, limit = 8, excludeClusterIds = [] as string[], region, lang, diversity = 'med' as 'low'|'med'|'high' }: { onArticleClick?: (slug: string) => void; limit?: number; excludeClusterIds?: string[]; region?: string; lang?: string; diversity?: 'low'|'med'|'high' }) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  
  // Use ref to access current cursor value without causing re-renders
  const cursorRef = useRef<string | undefined>(undefined);
  cursorRef.current = cursor;

  // Stabilize excludeClusterIds to prevent infinite re-renders
  const stableExcludeClusterIds = useMemo(() => excludeClusterIds, [excludeClusterIds.join(',')]);

  // ✅ This useCallback is now DRAMATICALLY simplified
  const load = useCallback(async (loadMore: boolean = false) => {
    try {
      if (loadMore) setLoadingMore(true); else setLoading(true);

      // 🔥 A SINGLE call to our new aggregated API
      const params = new URLSearchParams();
      params.set('size', '20');
      
      // Use ref to get current cursor value without dependency
      if (loadMore && cursorRef.current) {
        params.set('cursor', cursorRef.current);
      }
      
      stableExcludeClusterIds.forEach(id => params.append('exclude_cluster_ids', id));
      if (region) {
        params.set('region', region);
      }
      if (lang) {
        params.set('lang', lang);
      }
      if (diversity) {
        params.set('diversity', diversity);
      }
      
      const response = await fetch(`/api/agg/hot?${params.toString()}`);
      const res = await response.json();

      const arr = res.items || [];
      setItems(prev => loadMore ? [...prev, ...arr] : (arr.length > 0 ? arr : prev));
      setCursor(res.next_cursor || undefined);

    } catch (e) {
      console.error('Failed to load most read:', e);
      if (!loadMore) setItems([]);
    } finally {
      if (loadMore) setLoadingMore(false); else setLoading(false);
    }
  }, [stableExcludeClusterIds, region, lang, diversity]);

  useEffect(() => { load(false); }, [load]);

  const showLoading = loading;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">最热阅读</h3>
      {showLoading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      ) : items.length > 0 ? (
        <>
          <ol className="space-y-2">
            {items.slice(0, Math.max(1, Math.min(limit, 20))).map((article, index) => (
              <li key={`mostread-${article.id}-${index}`} className="">
                <a
                  href={article.slug ? `/portal/article/${article.slug}` : (article.id ? `/portal/article/${article.id}` : (article.url || "/portal"))}
                  className="text-sm text-gray-800 hover:text-red-500 transition-colors line-clamp-2"
                  onClick={() => onArticleClick?.(article.slug || article.id)}
                >
                  {article.title}
                </a>
              </li>
            ))}
          </ol>
          {cursor && (
            <div className="text-center mt-4">
              <button
                onClick={() => load(true)}
                disabled={loadingMore}
                className="text-sm px-3 py-1.5 rounded border border-gray-300 hover:border-red-300 hover:text-red-500 disabled:opacity-50"
              >
                {loadingMore ? '加载中…' : '加载更多'}
              </button>
            </div>
          )}
        </>
      ) : (
        <p className="text-gray-500 text-sm">暂无热门内容</p>
      )}
    </div>
  );
}


