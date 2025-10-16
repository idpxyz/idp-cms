"use client";

import React, { useState, useEffect } from "react";
import { formatDateTime } from "@/lib/utils/date";
// Removed api-url dependency - using relative paths instead

// 强制动态渲染，禁用静态生成
export const dynamic = 'force-dynamic';

interface AnalyticsData {
  totalEvents: number;
  uniqueUsers: number;
  uniqueSessions: number;
  eventsByType: Record<string, number>;
  eventsByChannel: Record<string, number>;
  recentEvents: Array<{
    ts: string;
    event: string;
    article_id: string;
    channel: string;
    user_id: string;
    dwell_ms: number;
  }>;
  topArticles: Array<{
    article_id: string;
    impressions: number;
    clicks: number;
    ctr: number;
  }>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/analytics");
      if (!response.ok) {
        throw new Error("Failed to fetch analytics data");
      }
      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">加载分析数据中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            数据加载失败
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchAnalyticsData}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 text-6xl mb-4">📊</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">暂无数据</h2>
          <p className="text-gray-600">请先访问门户页面生成一些用户行为数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">📊 用户行为分析</h1>
          <p className="text-gray-600 mt-2">基于ClickHouse的实时数据分析</p>
        </div>

        {/* 概览卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-2xl">📈</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">总事件数</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.totalEvents}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-2xl">👥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">独立用户</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.uniqueUsers}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <span className="text-2xl">🔄</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">会话数</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.uniqueSessions}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <span className="text-2xl">📰</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">热门文章</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.topArticles?.length || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 事件类型分布 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              事件类型分布
            </h3>
            <div className="space-y-3">
              {Object.entries(data.eventsByType || {}).map(([event, count]) => (
                <div key={event} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {event === "impression"
                        ? "👁️ 曝光"
                        : event === "click"
                          ? "🖱️ 点击"
                          : event === "dwell"
                            ? "⏱️ 停留"
                            : event === "view"
                              ? "👀 浏览"
                              : event === "search"
                                ? "🔍 搜索"
                                : event}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 频道分布 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">频道分布</h3>
            <div className="space-y-3">
              {Object.entries(data.eventsByChannel || {}).map(
                ([channel, count]) => (
                  <div
                    key={channel}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm font-medium text-gray-700">
                      {channel === "recommend"
                        ? "🎯 推荐"
                        : channel === "hot"
                          ? "🔥 热点"
                          : channel === "tech"
                            ? "💻 科技"
                            : channel === "finance"
                              ? "💰 财经"
                              : channel === "sports"
                                ? "⚽ 体育"
                                : channel === "entertainment"
                                  ? "🎬 娱乐"
                                  : channel === "travel"
                                    ? "✈️ 旅游"
                                    : channel === "food"
                                      ? "🍜 美食"
                                      : channel === "follow"
                                        ? "👥 关注"
                                        : channel}
                    </span>
                    <span className="text-sm font-bold text-gray-900">
                      {count}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* 热门文章 */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">热门文章排行</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    文章ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    曝光量
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    点击量
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    点击率
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(data.topArticles || []).map((article, index) => (
                  <tr key={article.article_id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{index + 1} {article.article_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {article.impressions}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {article.clicks}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          article.ctr > 0.1
                            ? "bg-green-100 text-green-800"
                            : article.ctr > 0.05
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {(article.ctr * 100).toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 最近事件 */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">最近事件</h3>
          <div className="space-y-3">
            {(data.recentEvents || []).map((event, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-gray-700">
                    {event.event === "impression"
                      ? "👁️"
                      : event.event === "click"
                        ? "🖱️"
                        : event.event === "dwell"
                          ? "⏱️"
                          : event.event === "view"
                            ? "👀"
                            : event.event === "search"
                              ? "🔍"
                              : "📊"}
                  </span>
                  <span className="text-sm text-gray-600">
                    {event.article_id}
                  </span>
                  <span className="text-xs text-gray-500">{event.channel}</span>
                  {event.dwell_ms > 0 && (
                    <span className="text-xs text-blue-600">
                      {Math.round(event.dwell_ms / 1000)}s
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {formatDateTime(event.ts)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="mt-8 text-center">
          <button
            onClick={fetchAnalyticsData}
            className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors mr-4"
          >
            🔄 刷新数据
          </button>
          <a
            href="/portal"
            className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            ← 返回门户
          </a>
        </div>
      </div>
    </div>
  );
}
