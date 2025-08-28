'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useCache } from './CacheProvider';

interface CacheMetrics {
  totalTags: number;
  tagTypes: Record<string, number>;
  lastUpdate: string;
  performance: {
    avgResponseTime: number;
    cacheHitRate: number;
    memoryUsage: number;
  };
}

interface CacheEvent {
  type: 'hit' | 'miss' | 'invalidation';
  tag: string;
  timestamp: string;
  duration?: number;
}

export default function CacheMonitor() {
  const { getCacheTags } = useCache();
  const [metrics, setMetrics] = useState<CacheMetrics>({
    totalTags: 0,
    tagTypes: {},
    lastUpdate: new Date().toLocaleString('zh-CN'),
    performance: {
      avgResponseTime: 0,
      cacheHitRate: 0,
      memoryUsage: 0
    }
  });
  
  const [events, setEvents] = useState<CacheEvent[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // 更新缓存指标
  const updateMetrics = useCallback(() => {
    const tags = getCacheTags();
    const tagTypes: Record<string, number> = {};
    
    tags.forEach(tag => {
      const type = tag.name.split(':')[0];
      tagTypes[type] = (tagTypes[type] || 0) + 1;
    });

    // 模拟性能指标（实际项目中应该从真实的监控系统获取）
    const performance = {
      avgResponseTime: Math.random() * 100 + 50, // 50-150ms
      cacheHitRate: Math.random() * 20 + 80, // 80-100%
      memoryUsage: Math.random() * 30 + 70 // 70-100%
    };

    setMetrics({
      totalTags: tags.length,
      tagTypes,
      lastUpdate: new Date().toLocaleString('zh-CN'),
      performance
    });
  }, [getCacheTags]);

  // 添加缓存事件
  const addEvent = useCallback((event: CacheEvent) => {
    setEvents(prev => [event, ...prev.slice(0, 49)]); // 保留最近50个事件
  }, []);

  // 模拟缓存事件（实际项目中应该从真实的缓存系统获取）
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // 随机生成缓存事件
      const eventTypes: Array<'hit' | 'miss' | 'invalidation'> = ['hit', 'miss', 'invalidation'];
      const randomType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const randomTag = `tag:${Math.floor(Math.random() * 100)}`;
      
      addEvent({
        type: randomType,
        tag: randomTag,
        timestamp: new Date().toLocaleString('zh-CN'),
        duration: randomType === 'hit' ? Math.random() * 50 + 10 : undefined
      });
    }, 2000); // 每2秒生成一个事件

    return () => clearInterval(interval);
  }, [autoRefresh, addEvent]);

  // 定期更新指标
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(updateMetrics, 5000); // 每5秒更新一次
    return () => clearInterval(interval);
  }, [autoRefresh, updateMetrics]);

  // 手动刷新
  const handleRefresh = () => {
    updateMetrics();
    addEvent({
      type: 'invalidation',
      tag: 'manual_refresh',
      timestamp: new Date().toLocaleString('zh-CN')
    });
  };

  // 清除事件
  const clearEvents = () => {
    setEvents([]);
  };

  // 获取性能状态颜色
  const getPerformanceColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return 'text-green-600';
    if (value >= thresholds.warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      {/* 头部 */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <h3 className="text-sm font-medium text-gray-900">缓存监控</h3>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`text-xs px-2 py-1 rounded ${
                autoRefresh 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {autoRefresh ? '自动' : '手动'}
            </button>
            
            <button
              onClick={handleRefresh}
              className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200"
            >
              刷新
            </button>
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-gray-600 hover:text-gray-800"
            >
              {isExpanded ? '收起' : '展开'}
            </button>
          </div>
        </div>
      </div>

      {/* 指标概览 */}
      <div className="px-4 py-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{metrics.totalTags}</div>
            <div className="text-xs text-gray-500">缓存标签</div>
          </div>
          
          <div className="text-center">
            <div className={`text-2xl font-bold ${getPerformanceColor(metrics.performance.cacheHitRate, { good: 90, warning: 80 })}`}>
              {metrics.performance.cacheHitRate.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">命中率</div>
          </div>
          
          <div className="text-center">
            <div className={`text-2xl font-bold ${getPerformanceColor(metrics.performance.avgResponseTime, { good: 100, warning: 200 })}`}>
              {metrics.performance.avgResponseTime.toFixed(0)}ms
            </div>
            <div className="text-xs text-gray-500">响应时间</div>
          </div>
          
          <div className="text-center">
            <div className={`text-2xl font-bold ${getPerformanceColor(metrics.performance.memoryUsage, { good: 80, warning: 90 })}`}>
              {metrics.performance.memoryUsage.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">内存使用</div>
          </div>
        </div>
        
        <div className="text-xs text-gray-500 text-center mt-2">
          最后更新: {metrics.lastUpdate}
        </div>
      </div>

      {/* 展开的详细信息 */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          {/* 标签类型分布 */}
          <div className="px-4 py-3">
            <h4 className="text-sm font-medium text-gray-700 mb-2">标签类型分布</h4>
            <div className="space-y-2">
              {Object.entries(metrics.tagTypes).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">{type}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(count / metrics.totalTags) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
              {Object.keys(metrics.tagTypes).length === 0 && (
                <div className="text-xs text-gray-500 italic">暂无标签数据</div>
              )}
            </div>
          </div>

          {/* 实时事件 */}
          <div className="px-4 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700">实时事件</h4>
              <button
                onClick={clearEvents}
                className="text-xs text-red-600 hover:text-red-800"
              >
                清除
              </button>
            </div>
            
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {events.map((event, index) => (
                <div key={index} className="flex items-center space-x-2 text-xs">
                  <div className={`w-2 h-2 rounded-full ${
                    event.type === 'hit' ? 'bg-green-500' :
                    event.type === 'miss' ? 'bg-red-500' : 'bg-yellow-500'
                  }`}></div>
                  
                  <span className={`font-mono ${
                    event.type === 'hit' ? 'text-green-600' :
                    event.type === 'miss' ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    {event.type.toUpperCase()}
                  </span>
                  
                  <span className="text-gray-600">{event.tag}</span>
                  
                  {event.duration && (
                    <span className="text-gray-500">({event.duration.toFixed(0)}ms)</span>
                  )}
                  
                  <span className="text-gray-400 ml-auto">{event.timestamp}</span>
                </div>
              ))}
              
              {events.length === 0 && (
                <div className="text-xs text-gray-500 italic">暂无事件</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
