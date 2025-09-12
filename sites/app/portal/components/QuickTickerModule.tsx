"use client";
import React, { useEffect, useState } from "react";
import { fetchLatestFeed, type FeedItem } from "@/lib/api/feed";

export default function QuickTickerModule({ onArticleClick, duration }: { onArticleClick?: (slug: string) => void; duration?: string }) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetchLatestFeed(20);
        setItems(res.items || []);
      } catch (e) {
        console.error('Failed to load quick ticker:', e);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const renderItems = items.slice(0, 12);
  const shouldScroll = renderItems.length > 1;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-3 py-2 md:py-2.5">
      <div className="flex items-center space-x-3">
        <span className="text-red-500 text-sm font-semibold leading-none">快讯</span>
        {loading ? (
          <div className="flex-1 h-4 bg-gray-200 rounded animate-pulse" />
        ) : items.length > 0 ? (
          shouldScroll ? (
            <div className="flex-1 ticker-marquee group" aria-label="快讯滚动" style={duration ? ({ ['--ticker-duration' as any]: duration }) : undefined}>
              <div className="ticker-track">
                <div className="inline-flex items-center space-x-6">
                  {renderItems.map((it, idx) => (
                    <a
                      key={`tick-${it.id}-${idx}`}
                      href={`/portal/article/${it.slug}`}
                      className="text-sm text-gray-800 hover:text-red-500 transition-colors"
                      onClick={() => onArticleClick?.(it.slug)}
                    >
                      {it.title}
                    </a>
                  ))}
                </div>
                <div className="inline-flex items-center space-x-6">
                  {renderItems.map((it, idx) => (
                    <a
                      key={`tick2-${it.id}-${idx}`}
                      href={`/portal/article/${it.slug}`}
                      className="text-sm text-gray-800 hover:text-red-500 transition-colors"
                      onClick={() => onArticleClick?.(it.slug)}
                    >
                      {it.title}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto scrollbar-hide">
              <div className="inline-flex items-center space-x-6 whitespace-nowrap">
                {renderItems.map((it, idx) => (
                  <a
                    key={`tick-${it.id}-${idx}`}
                    href={`/portal/article/${it.slug}`}
                    className="text-sm text-gray-800 hover:text-red-500 transition-colors"
                    onClick={() => onArticleClick?.(it.slug)}
                  >
                    {it.title}
                  </a>
                ))}
              </div>
            </div>
          )
        ) : (
          <span className="text-sm text-gray-500">暂无快讯</span>
        )}
      </div>
    </div>
  );
}


