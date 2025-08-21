"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { fetchFeed } from "@/lib/feed";
import { track } from "@/lib/track";
import { FeedItem } from "@/types/feed";

export default function FeedPage(){
  const [items, setItems] = useState<FeedItem[]>([]);
  const [cursor, setCursor] = useState<string|undefined>();
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const sentinel = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const {items: newItems, next_cursor} = await fetchFeed(cursor);
      if (newItems.length === 0) {
        setHasMore(false);
      } else {
        setItems(prev => [...prev, ...newItems]);
        setCursor(next_cursor);
      }
    } catch (error) {
      console.error('Failed to load feed:', error);
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, hasMore]);

  useEffect(() => {
    // 初始加载
    load();
  }, []); // 只在组件挂载时执行一次

  useEffect(() => {
    if (!sentinel.current || !hasMore) return;
    
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loading && hasMore) {
          load();
        }
      },
      { rootMargin: "800px" }
    );
    
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, [load, hasMore]); // 依赖 load 函数和 hasMore 状态

  return (
    <main>
      <h1>信息流</h1>
      {items.map(it => (
        <article key={it.id} style={{padding:"12px 0", borderBottom:"1px solid #eee"}} onClick={()=>track("click",[it.id])}>
          <h3 style={{margin:"6px 0"}}>{it.title}</h3>
          <p style={{color:"#555"}}>{(it.body||"").slice(0,120)}...</p>
          <small>{it.channel} · {it.publish_time ? new Date(it.publish_time).toLocaleString() : ""}</small>
        </article>
      ))}
      <div ref={sentinel} style={{height: 1}} />
      {loading && hasMore && <p>加载中...</p>}
      {!hasMore && items.length > 0 && <p>没有更多内容了</p>}
      {!loading && items.length === 0 && <p>暂无内容</p>}
    </main>
  );
}
