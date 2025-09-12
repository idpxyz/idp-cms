"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";

interface Props {
  count?: number; // base 1-4
  countSm?: number;
  countMd?: number;
  countLg?: number; // 默认在PC端显示更多
  fitHeight?: number; // 可选：根据外部高度自适应条数
  region?: string;
  lang?: string;
  channel?: string;
}

export default function TodayHeadlinesModule({ count = 8, countSm, countMd, countLg = 10, fitHeight, region, lang, channel }: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [effectiveCount, setEffectiveCount] = useState<number>(count);
  const [refreshKey, setRefreshKey] = useState(0); // 用于触发换一换
  // ❗️ No longer need the channels from context
  // const { channels } = useChannels();

  // This client-side effect for responsive counts remains unchanged
  useEffect(() => {
    const decide = () => {
      if (typeof window === 'undefined') return count;
      // 先用断点做上限，再用高度微调
      const w = window.innerWidth;
      let base = count;
      if (w >= 1024) base = countLg ?? count;
      else if (w >= 768) base = countMd ?? countSm ?? count;
      else if (w >= 640) base = countSm ?? count;
      // 如果有目标高度，估算单条高度（约 24px），动态取 floor
      if (fitHeight && fitHeight > 0) {
        const per = 24; // 更紧凑的经验高度
        const byHeight = Math.max(1, Math.floor(fitHeight / per));
        return Math.min(byHeight, base);
      }
      return base;
    };
    const apply = () => setEffectiveCount(Math.max(1, Math.min(decide(), 12)));
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, [count, countSm, countMd, countLg, fitHeight]);

  // ✅ This useEffect is now DRAMATICALLY simplified
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        let apiUrl: string;
        console.log(`🔄 开始加载头条数据...`);
        
        if (channel) {
            // 特定频道的头条
            apiUrl = `/api/headlines/?channel=${channel}&size=${effectiveCount}&hours=24&diversity=high&offset=${refreshKey * effectiveCount}`;
        } else {
            // 站点整体头条，智能换一换策略
            // 先获取大量数据，然后在前端实现循环切片
            const batchSize = Math.max(effectiveCount * 5, 50); // 获取5倍数据量
            apiUrl = `/api/agg/headlines/?size=${batchSize}&diversity=high`;
        }

        console.log(`📡 API URL: ${apiUrl}`);
        console.log(`🔑 RefreshKey: ${refreshKey}, EffectiveCount: ${effectiveCount}`);
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API error ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log(`✅ API响应:`, data);
        
        let itemsData = data.headlines || data.items || [];
        
        // 对于聚合头条，实现前端循环切片
        if (!channel && itemsData.length > 0) {
          const totalItems = itemsData.length;
          const startIndex = (refreshKey * effectiveCount) % totalItems;
          let endIndex = startIndex + effectiveCount;
          
          if (endIndex <= totalItems) {
            // 正常切片
            itemsData = itemsData.slice(startIndex, endIndex);
          } else {
            // 循环切片：从开头补充
            const firstPart = itemsData.slice(startIndex);
            const secondPart = itemsData.slice(0, endIndex - totalItems);
            itemsData = [...firstPart, ...secondPart];
          }
          
          console.log(`🔄 循环切片: 总数${totalItems}, 起始${startIndex}, 显示${itemsData.length}条`);
        }
        
        setItems(itemsData);
        console.log(`📰 设置${itemsData.length}条头条新闻`);
        
      } catch (e) {
        console.error("load today headlines failed", e);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [effectiveCount, channel, region, lang, refreshKey]); // 添加refreshKey支持换一换

  return (
    <div className="p-0">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center">
          <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
          今日头条
        </h3>
        <button 
          onClick={() => {
            console.log(`🔄 换一换点击，当前refreshKey: ${refreshKey} -> ${refreshKey + 1}`);
            setRefreshKey(prev => prev + 1);
          }}
          disabled={loading}
          className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-red-500 hover:bg-gray-50 rounded transition-colors disabled:opacity-50"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          换一换 {refreshKey > 0 && `(${refreshKey})`}
        </button>
      </div>
      {loading ? (
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
        </div>
      ) : items.length > 0 ? (
        <div className="space-y-1">
          {items.map((headline: any, index: number) => (
            <div key={`headline-${headline.id}-${index}`} className="py-0.5 first:pt-0 last:pb-0">
              {headline.image_url && index === 0 && (
                <div className="relative mb-1">
                  {/* 使用img标签避免Next.js配置问题 */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={headline.image_url} alt={headline.title} className="w-full h-24 object-cover rounded" />
                  <div className="absolute top-2 left-2">
                    <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-medium">头条</span>
                  </div>
                </div>
              )}
              <div className="flex items-start space-x-2">
                <span className="w-5 text-right text-xs font-semibold text-red-500 leading-6">{index + 1}</span>
                <h4 className="font-medium text-gray-900 mb-1 flex-1">
                  <a href={headline.slug ? `/portal/article/${headline.slug}` : (headline.id ? `/portal/article/${headline.id}` : (headline.url || '/portal'))} className="hover:text-red-500 transition-colors">
                    <span className="block line-clamp-1 sm:line-clamp-2 lg:line-clamp-1">{headline.title}</span>
                  </a>
                </h4>
                {headline.trend && (
                  <span className={`text-xs ml-1 ${headline.trend==='up' ? 'text-red-500' : headline.trend==='down' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {headline.trend==='up' ? '↑' : headline.trend==='down' ? '↓' : '→'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-sm">暂无头条新闻</p>
      )}
    </div>
  );
}


