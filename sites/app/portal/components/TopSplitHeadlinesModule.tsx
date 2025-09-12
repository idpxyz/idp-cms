"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import TodayHeadlinesModule from "./TodayHeadlinesModule";

interface Props {
  count?: number; // 今日头条右侧条数，默认2
  autoPlayMs?: number; // 轮播自动切换间隔
}

export default function TopSplitHeadlinesModule({ count = 2, autoPlayMs = 5000 }: Props) {
  // 占位的10条图片新闻（仅用于演示，不请求接口）
  const items = useMemo(() => (
    Array.from({ length: 10 }).map((_, i) => ({
      id: `placeholder-${i}`,
      title: `图片新闻占位标题 ${i + 1}`,
      subtitle: `副标题或简述 ${i + 1}`,
    }))
  ), []);

  const [active, setActive] = useState(0);
  const leftRef = useRef<HTMLDivElement>(null);
  const [leftHeight, setLeftHeight] = useState<number>(0);

  useEffect(() => {
    const t = setInterval(() => {
      setActive((prev) => (prev + 1) % items.length);
    }, Math.max(2000, autoPlayMs));
    return () => clearInterval(t);
  }, [items.length, autoPlayMs]);

  // 使用 ResizeObserver 严格等高：以左侧容器高度为准，右侧自适应条数
  useEffect(() => {
    if (!leftRef.current) return;
    const el = leftRef.current;
    const RZ = (window as any).ResizeObserver;
    if (RZ) {
      const ro = new RZ((entries: any[]) => {
        for (const entry of entries) {
          const h = entry.contentRect?.height || el.offsetHeight || 0;
          setLeftHeight(h);
        }
      });
      ro.observe(el);
      return () => ro.disconnect();
    }
    const apply = () => setLeftHeight(el.offsetHeight || 0);
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, []);

  const goPrev = () => setActive((prev) => (prev - 1 + items.length) % items.length);
  const goNext = () => setActive((prev) => (prev + 1) % items.length);

  return (
    <div className="">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 左侧：图片新闻轮播（占位） */}
        <div className="lg:col-span-2">
          <div ref={leftRef} className="relative w-full h-64 md:h-72 lg:h-80 overflow-hidden rounded-lg">
            {/* slide */}
            {items.map((item, idx) => (
              <div
                key={item.id}
                className="absolute inset-0 transition-opacity duration-500"
                style={{ opacity: idx === active ? 1 : 0 }}
              >
                <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-end">
                  <div className="w-full bg-black/50 text-white p-4">
                    <div className="text-sm text-gray-200">图片新闻</div>
                    <h3 className="text-lg font-semibold line-clamp-1 md:line-clamp-2">{item.title}</h3>
                    <p className="text-xs text-gray-200/80 line-clamp-1">{item.subtitle}</p>
                  </div>
                </div>
              </div>
            ))}
            {/* controls */}
            <button
              aria-label="上一张"
              onClick={goPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center"
            >
              ‹
            </button>
            <button
              aria-label="下一张"
              onClick={goNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center"
            >
              ›
            </button>
            {/* dots */}
            <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center space-x-2">
              {items.map((_, idx) => (
                <span
                  key={idx}
                  onClick={() => setActive(idx)}
                  className={`w-2 h-2 rounded-full cursor-pointer ${idx === active ? 'bg-white' : 'bg-white/50'}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* 右侧：今日头条列表 */}
        <div className="lg:col-span-1">
          <TodayHeadlinesModule count={count} countSm={3} countMd={4} countLg={8} fitHeight={leftHeight} />
        </div>
      </div>
    </div>
  );
}


