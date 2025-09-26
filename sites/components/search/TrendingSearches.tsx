"use client";

import React, { useState, useEffect } from 'react';

interface TrendingSearch {
  text: string;
  rank: number;
  change: 'hot' | 'up' | 'down' | 'stable' | 'new';
  score: number;
  count: number;
}

interface TrendingSearchesProps {
  onSearchClick: (query: string) => void;
  className?: string;
  timeWindow?: '5m' | '1h' | '24h' | '72h';
  limit?: number;
  onTimeWindowChange?: (window: '5m' | '1h' | '24h' | '72h') => void;
}

export default function TrendingSearches({
  onSearchClick,
  className = "",
  timeWindow = '24h',
  limit = 10,
  onTimeWindowChange,
}: TrendingSearchesProps) {
  const [trending, setTrending] = useState<TrendingSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actualWindow, setActualWindow] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    fetchTrendingSearches();
  }, [timeWindow, limit]);

  const fetchTrendingSearches = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/search/trending?window=${timeWindow}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch trending searches');
      }

      const data = await response.json();
      
      if (data.success) {
        setTrending(data.data || []);
        setActualWindow(data.actual_window);
        setIsFallback(data.is_fallback || false);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err) {
      console.warn('Failed to fetch trending searches:', err);
      setError('加载失败');
      // 使用默认数据 - 去除无意义后缀
      setTrending([
        { text: '人工智能', rank: 1, change: 'hot', score: 1000, count: 100 },
        { text: '新能源汽车', rank: 2, change: 'up', score: 800, count: 80 },
        { text: '房价走势', rank: 3, change: 'up', score: 600, count: 60 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // 获取时间窗口显示文本
  const getWindowDisplayText = (window: string) => {
    const windowMap: Record<string, string> = {
      '5m': '5分钟',
      '1h': '1小时', 
      '24h': '24小时',
      '72h': '72小时',
      'default': '默认'
    };
    return windowMap[window] || window;
  };

  const getChangeIcon = (change: TrendingSearch['change']) => {
    switch (change) {
      case 'hot':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
            🔥 热
          </span>
        );
      case 'up':
        return (
          <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'down':
        return (
          <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'new':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
            新
          </span>
        );
      case 'stable':
      default:
        return (
          <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">热搜榜</h3>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="animate-pulse flex items-center space-x-3">
              <div className="w-6 h-6 bg-gray-200 rounded"></div>
              <div className="flex-1 h-4 bg-gray-200 rounded"></div>
              <div className="w-8 h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">热搜榜</h3>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <select
              value={timeWindow}
              onChange={(e) => {
                const newWindow = e.target.value as '5m' | '1h' | '24h' | '72h';
                onTimeWindowChange?.(newWindow);
              }}
              className="text-xs border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="5m">5分钟</option>
              <option value="1h">1小时</option>
              <option value="24h">24小时</option>
              <option value="72h">72小时</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* 降级提示 */}
      {isFallback && actualWindow && actualWindow !== 'default' && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-amber-700">
              {getWindowDisplayText(timeWindow)}数据不足，显示{getWindowDisplayText(actualWindow)}数据
            </span>
          </div>
        </div>
      )}
      
      <div className="p-4">
        {error && (
          <div className="text-center text-gray-500 py-4">
            <p>{error}</p>
            <button
              onClick={fetchTrendingSearches}
              className="mt-2 text-blue-600 hover:text-blue-800 text-sm underline"
            >
              重试
            </button>
          </div>
        )}
        
        {!error && trending.length === 0 && (
          <div className="text-center text-gray-500 py-4">
            暂无热搜数据
          </div>
        )}
        
        {!error && trending.length > 0 && (
          <div className="space-y-1">
            {trending.map((item, index) => (
              <button
                key={`${item.text}-${index}`}
                onClick={() => onSearchClick(item.text)}
                className="w-full flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50 text-left group transition-colors"
              >
                <span className={`flex-shrink-0 w-6 h-6 flex items-center justify-center text-sm font-medium rounded ${
                  item.rank <= 3 
                    ? 'bg-red-500 text-white' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {item.rank}
                </span>
                
                <span className="flex-1 text-gray-900 group-hover:text-blue-600 truncate">
                  {item.text}
                </span>
                
                <div className="flex-shrink-0 flex items-center space-x-1">
                  {getChangeIcon(item.change)}
                  <span className="text-xs text-gray-400">
                    {item.count}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
