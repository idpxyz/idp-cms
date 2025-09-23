"use client";

import React, { useState, useEffect } from "react";
import { buildFrontendApiUrl } from '@/lib/utils/api-url';

interface RealTimeEvent {
  ts: string;
  event: string;
  article_id: string;
  channel: string;
  user_id: string;
  dwell_ms: number;
}

export default function MonitorPage() {
  const [events, setEvents] = useState<RealTimeEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [stats, setStats] = useState({
    totalEvents: 0,
    uniqueUsers: 0,
    eventsPerMinute: 0,
  });
  const [systemStats, setSystemStats] = useState<any>({
    status: "unknown",
    cache_performance: null,
    aggregation_apis: null,
    recommendations: []
  });

  useEffect(() => {
    let currentEventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    // 保留原有的统计数据获取（用于初始化）
    const fetchStats = async () => {
      try {
        const response = await fetch(buildFrontendApiUrl("/api/analytics"));
        if (response.ok) {
          const data = await response.json();
          setStats({
            totalEvents: data.data?.totalEvents || 0,
            uniqueUsers: data.data?.uniqueUsers || 0,
            eventsPerMinute: Math.round((data.data?.totalEvents || 0) / 60), // 简单估算
          });
          // 只在SSE连接失败时使用这些事件
          if (!isConnected) {
            setEvents((data.data?.recentEvents || []).slice(0, 10));
          }
        }
      } catch (error) {
        console.error("📊 统计数据获取失败:", error);
      }
    };

    // SSE实时事件流连接
    const connectSSE = () => {
      // 清理旧连接
      if (currentEventSource) {
        currentEventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }

      // 使用真实的分析事件流（带降级机制）
      const eventSource = new EventSource('/api/analytics/stream');
      currentEventSource = eventSource;
      
      eventSource.onopen = () => {
        setIsConnected(true);
      };
      
      eventSource.onmessage = (event) => {
        try {
          if (!event.data || event.data.trim() === '') {
            console.warn("⚠️ SSE消息无数据或为空");
            return;
          }
          
          const eventData = JSON.parse(event.data);
          
          // 添加新事件到列表顶部，保持最多10条
          setEvents(prev => [eventData, ...prev.slice(0, 9)]);
          
          // 更新事件计数（简单递增）
          setStats(prev => ({
            ...prev,
            totalEvents: prev.totalEvents + 1,
            eventsPerMinute: prev.eventsPerMinute + 1, // 简化处理
          }));
        } catch (error) {
          console.error("❌ SSE事件解析失败:", error, "原始数据:", event.data);
        }
      };
      
      eventSource.addEventListener('connected', (event) => {
        try {
          const data = JSON.parse(event.data || '{}');
          setIsConnected(true);
        } catch (error) {
          console.error("❌ 连接确认事件解析失败:", error, "原始数据:", event.data);
          setIsConnected(true); // 即使解析失败，也认为连接成功
        }
      });
      
      eventSource.addEventListener('analytics_event', (event) => {
        try {
          if (!event.data) {
            console.warn("⚠️ 分析事件无数据");
            return;
          }
          
          const eventData = JSON.parse(event.data);
          
          // 添加新事件到列表顶部
          setEvents(prev => [eventData, ...prev.slice(0, 9)]);
          
          // 更新统计
          setStats(prev => ({
            ...prev,
            totalEvents: prev.totalEvents + 1,
          }));
        } catch (error) {
          console.error("❌ 分析事件解析失败:", error, "原始数据:", event.data);
        }
      });
      
      eventSource.addEventListener('error', (event: any) => {
        try {
          if (event.data) {
            const data = JSON.parse(event.data);
            console.error("🚨 SSE服务器错误:", data);
          } else {
          }
        } catch (error) {
        }
      });
      
      eventSource.addEventListener('heartbeat', (event) => {
        try {
          if (event.data) {
            const data = JSON.parse(event.data);
          }
          // 心跳事件确认连接正常
          setIsConnected(true);
        } catch (error) {
          setIsConnected(true);
        }
      });
      
      eventSource.addEventListener('info', (event) => {
        try {
          if (event.data) {
            const data = JSON.parse(event.data);
          }
        } catch (error) {
        }
      });
      
      eventSource.onerror = (error) => {
        console.warn("🔗 SSE连接中断 (这是正常的网络行为):", error);
        setIsConnected(false);
        
        // 检查连接状态
        if (eventSource.readyState === EventSource.CLOSED) {
          reconnectTimeout = setTimeout(() => {
            connectSSE();
          }, 3000);
        } else if (eventSource.readyState === EventSource.CONNECTING) {
        } else {
          reconnectTimeout = setTimeout(() => {
            connectSSE();
          }, 5000);
        }
      };
      
      return eventSource;
    };

    const fetchEvents = fetchStats; // 保持原有函数名兼容性

    const fetchSystemStats = async () => {
      try {
        const response = await fetch(buildFrontendApiUrl("/api/monitoring/dashboard"));
        
        if (response.ok) {
          const data = await response.json();
          setSystemStats(data);
        } else {
          console.error("❌ 监控API错误:", response.status, response.statusText);
          const errorData = await response.json();
          console.error("错误详情:", errorData);
          setSystemStats({
            status: "error",
            cache_performance: { overall_hit_rate: "0%" },
            aggregation_apis: { 
              headlines_healthy: false, 
              hot_healthy: false,
              headlines_response_time: "0s",
              hot_response_time: "0s"
            },
            recommendations: [{
              type: "error",
              message: `API错误: ${response.status}`
            }]
          });
        }
      } catch (error) {
        console.error("🚨 系统监控获取失败:", error);
        setSystemStats({
          status: "error",
          cache_performance: { overall_hit_rate: "0%" },
          aggregation_apis: { 
            headlines_healthy: false, 
            hot_healthy: false,
            headlines_response_time: "0s",
            hot_response_time: "0s"
          },
          recommendations: [{
            type: "error",
            message: "监控系统连接失败"
          }]
        });
      }
    };

    // 初始加载统计数据
    fetchStats();
    fetchSystemStats();

    // 建立SSE连接
    connectSSE();

    // 每30秒刷新一次统计数据和系统状态（SSE负责实时事件）
    const interval = setInterval(() => {
      fetchStats();
      fetchSystemStats();
    }, 30000);

    return () => {
      clearInterval(interval);
      if (currentEventSource) {
        currentEventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  const getEventIcon = (event: string) => {
    switch (event) {
      case "impression":
        return "👁️";
      case "click":
        return "🖱️";
      case "dwell":
        return "⏱️";
      case "view":
        return "👀";
      case "search":
        return "🔍";
      default:
        return "📊";
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "recommend":
        return "🎯";
      case "hot":
        return "🔥";
      case "tech":
        return "💻";
      case "finance":
        return "💰";
      case "sports":
        return "⚽";
      case "entertainment":
        return "🎬";
      case "travel":
        return "✈️";
      case "food":
        return "🍜";
      case "follow":
        return "👥";
      default:
        return "📰";
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">🔴 实时监控面板</h1>
              <p className="text-gray-400 mt-2">ClickHouse用户行为实时监控</p>
            </div>
            <div className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`}
              ></div>
              <span className="text-sm">
                {isConnected ? "SSE实时流" : "SSE连接断开"}
              </span>
            </div>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center">
              <div className="p-3 bg-blue-600 rounded-lg">
                <span className="text-2xl">📈</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">总事件数</p>
                <p className="text-2xl font-bold">
                  {(stats.totalEvents || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center">
              <div className="p-3 bg-green-600 rounded-lg">
                <span className="text-2xl">👥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">独立用户</p>
                <p className="text-2xl font-bold">
                  {(stats.uniqueUsers || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center">
              <div className="p-3 bg-purple-600 rounded-lg">
                <span className="text-2xl">⚡</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">事件/分钟</p>
                <p className="text-2xl font-bold">
                  {stats.eventsPerMinute || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 系统监控 */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            ⚙️ 系统监控
            <div className="flex items-center ml-4 space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                systemStats.status === 'healthy' ? 'bg-green-500' : 
                systemStats.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
              <span className="text-sm text-gray-400 capitalize">{systemStats.status}</span>
            </div>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {/* 缓存性能 */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center">
                <div className="p-3 bg-purple-600 rounded-lg">
                  <span className="text-2xl">💾</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-400">缓存命中率</p>
                  <p className="text-2xl font-bold">
                    {systemStats.cache_performance?.overall_hit_rate || '0%'}
                  </p>
                </div>
              </div>
            </div>

            {/* 头条API */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center">
                <div className="p-3 bg-red-600 rounded-lg">
                  <span className="text-2xl">📰</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-400">头条API</p>
                  <p className="text-2xl font-bold">
                    {systemStats.aggregation_apis?.headlines_healthy ? '✅' : '❌'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {systemStats.aggregation_apis?.headlines_response_time || '0s'}
                  </p>
                </div>
              </div>
            </div>

            {/* 热门API */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center">
                <div className="p-3 bg-orange-600 rounded-lg">
                  <span className="text-2xl">🔥</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-400">热门API</p>
                  <p className="text-2xl font-bold">
                    {systemStats.aggregation_apis?.hot_healthy ? '✅' : '❌'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {systemStats.aggregation_apis?.hot_response_time || '0s'}
                  </p>
                </div>
              </div>
            </div>

            {/* 平均响应时间 */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center">
                <div className="p-3 bg-green-600 rounded-lg">
                  <span className="text-2xl">⚡</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-400">平均响应</p>
                  <p className="text-2xl font-bold">
                    {systemStats.cache_performance?.avg_response_time || '0s'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 系统建议 */}
          {systemStats.recommendations && systemStats.recommendations.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h3 className="text-lg font-bold mb-4">💡 系统建议</h3>
              <div className="space-y-3">
                {systemStats.recommendations.map((rec: any, index: number) => (
                  <div key={index} className={`flex items-start space-x-3 p-3 rounded-lg ${
                    rec.type === 'error' ? 'bg-red-900/50 border border-red-500/50' :
                    rec.type === 'warning' ? 'bg-yellow-900/50 border border-yellow-500/50' :
                    rec.type === 'success' ? 'bg-green-900/50 border border-green-500/50' :
                    'bg-blue-900/50 border border-blue-500/50'
                  }`}>
                    <span className="text-lg">
                      {rec.type === 'error' ? '🚨' :
                       rec.type === 'warning' ? '⚠️' :
                       rec.type === 'success' ? '✅' : 'ℹ️'}
                    </span>
                    <p className="text-sm">{rec.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 实时事件流 */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-lg font-bold">实时事件流</h2>
            <p className="text-sm text-gray-400">最近10个用户行为事件</p>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {events.length === 0 ? (
              <div className="p-6 text-center text-gray-400">
                <div className="text-4xl mb-2">📊</div>
                <p>暂无事件数据</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {events.map((event, index) => (
                  <div
                    key={index}
                    className="p-4 hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <span className="text-2xl">
                          {getEventIcon(event.event)}
                        </span>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">
                              {event.article_id}
                            </span>
                            <span className="text-sm text-gray-400">
                              {getChannelIcon(event.channel)} {event.channel}
                            </span>
                          </div>
                          <div className="text-sm text-gray-400">
                            用户: {event.user_id.substring(0, 12)}...
                            {event.dwell_ms > 0 && (
                              <span className="ml-2 text-blue-400">
                                ⏱️ {Math.round(event.dwell_ms / 1000)}s
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-400">
                          {new Date(event.ts).toLocaleTimeString("zh-CN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(event.ts).toLocaleDateString("zh-CN")}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="mt-8 text-center">
          <a
            href="/portal/analytics"
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors mr-4"
          >
            📊 详细分析
          </a>
          <a
            href="/portal"
            className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            ← 返回门户
          </a>
        </div>

        {/* 底部信息 */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>数据每5秒自动刷新 • 基于ClickHouse实时分析</p>
        </div>
      </div>
    </div>
  );
}
