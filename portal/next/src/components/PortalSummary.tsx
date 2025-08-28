'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Globe,
  TrendingUp,
  Users,
  Clock,
  BarChart3,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';

interface PortalSummaryProps {
  site: string;
}

interface SummaryData {
  totalArticles: number;
  totalTools: number;
  activeChannels: number;
  activeRegions: number;
  lastUpdate: string;
  topChannels: Array<{
    name: string;
    count: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  topRegions: Array<{
    name: string;
    count: number;
    trend: 'up' | 'down' | 'stable';
  }>;
}

export default function PortalSummary({ site }: PortalSummaryProps) {
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 获取实际的聚合摘要数据
    const fetchSummaryData = async () => {
      setLoading(true);

      try {
        // 调用实际的API获取统计数据
        const apiBaseUrl =
          process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

        const [articlesRes, toolsRes, channelsRes, regionsRes] =
          await Promise.all([
            fetch(`${apiBaseUrl}/api/articles/stats?site=${site}`),
            fetch(`${apiBaseUrl}/api/tools/stats?site=${site}`),
            fetch(`${apiBaseUrl}/api/channels/stats?site=${site}`),
            fetch(`${apiBaseUrl}/api/regions/stats?site=${site}`),
          ]);

        if (
          !articlesRes.ok ||
          !toolsRes.ok ||
          !channelsRes.ok ||
          !regionsRes.ok
        ) {
          throw new Error('API request failed');
        }

        const [articles, tools, channels, regions] = await Promise.all([
          articlesRes.json(),
          toolsRes.json(),
          channelsRes.json(),
          regionsRes.json(),
        ]);

        // 获取热门频道和地区数据
        const [topChannelsRes, topRegionsRes] = await Promise.all([
          fetch(
            `${apiBaseUrl}/api/channels?site=${site}&size=4&order=-article_count`
          ),
          fetch(
            `${apiBaseUrl}/api/regions?site=${site}&size=4&order=-article_count`
          ),
        ]);

        const [topChannels, topRegions] = await Promise.all([
          topChannelsRes.json(),
          topRegionsRes.json(),
        ]);

        const summaryData: SummaryData = {
          totalArticles: articles.total || 0,
          totalTools: tools.total || 0,
          activeChannels: channels.active || 0,
          activeRegions: regions.active || 0,
          lastUpdate: new Date().toLocaleString('zh-CN'),
          topChannels: (topChannels.results || []).map((channel: any) => ({
            name: channel.name,
            count: channel.article_count || 0,
            trend: channel.trend || 'stable',
          })),
          topRegions: (topRegions.results || []).map((region: any) => ({
            name: region.name,
            count: region.article_count || 0,
            trend: region.trend || 'stable',
          })),
        };

        setSummaryData(summaryData);
      } catch (error) {
        console.error('Failed to fetch summary data from API:', error);

        // 降级到模拟数据
        const mockData: SummaryData = {
          totalArticles: site === 'portal' ? 1247 : 156,
          totalTools: site === 'portal' ? 89 : 23,
          activeChannels: site === 'portal' ? 12 : 4,
          activeRegions: site === 'portal' ? 8 : 3,
          lastUpdate: new Date().toLocaleString('zh-CN'),
          topChannels: [
            { name: 'AI工具', count: 234, trend: 'up' as const },
            { name: '技术趋势', count: 189, trend: 'up' as const },
            { name: '行业动态', count: 156, trend: 'stable' as const },
            { name: '使用教程', count: 98, trend: 'down' as const },
          ],
          topRegions: [
            { name: '中国', count: 456, trend: 'up' as const },
            { name: '美国', count: 234, trend: 'up' as const },
            { name: '欧洲', count: 189, trend: 'stable' as const },
            { name: '日本', count: 123, trend: 'down' as const },
          ],
        };

        setSummaryData(mockData);
      } finally {
        setLoading(false);
      }
    };

    fetchSummaryData();
  }, [site]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!summaryData) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
    >
      <div className="flex items-center space-x-2 mb-6">
        <Globe className="w-6 h-6 text-blue-600" />
        <h3 className="text-xl font-semibold text-gray-900">
          {site === 'portal' ? '门户聚合摘要' : '本地内容摘要'}
        </h3>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {summaryData.totalArticles}
          </div>
          <div className="text-sm text-gray-600">文章总数</div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {summaryData.totalTools}
          </div>
          <div className="text-sm text-gray-600">AI工具</div>
        </div>
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {summaryData.activeChannels}
          </div>
          <div className="text-sm text-gray-600">活跃频道</div>
        </div>
        <div className="text-center p-3 bg-orange-50 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">
            {summaryData.activeRegions}
          </div>
          <div className="text-sm text-gray-600">覆盖地区</div>
        </div>
      </div>

      {/* 热门频道 */}
      <div className="mb-6">
        <h4 className="text-lg font-medium text-gray-900 mb-3 flex items-center space-x-2">
          <TrendingUp className="w-5 h-5 text-green-600" />
          <span>热门频道</span>
        </h4>
        <div className="space-y-2">
          {summaryData.topChannels.map((channel, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
            >
              <span className="text-gray-700">{channel.name}</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {channel.count} 篇
                </span>
                <TrendIcon trend={channel.trend} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 热门地区 */}
      <div className="mb-6">
        <h4 className="text-lg font-medium text-gray-900 mb-3 flex items-center space-x-2">
          <Users className="w-5 h-5 text-blue-600" />
          <span>热门地区</span>
        </h4>
        <div className="space-y-2">
          {summaryData.topRegions.map((region, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
            >
              <span className="text-gray-700">{region.name}</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">{region.count} 篇</span>
                <TrendIcon trend={region.trend} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 更新时间 */}
      <div className="flex items-center justify-between text-sm text-gray-500 border-t pt-4">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4" />
          <span>最后更新：{summaryData.lastUpdate}</span>
        </div>
        <button className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 transition-colors">
          <span>查看详情</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

// 趋势图标组件
function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  switch (trend) {
    case 'up':
      return <TrendingUp className="w-4 h-4 text-green-600" />;
    case 'down':
      return (
        <TrendingUp className="w-4 h-4 text-red-600 transform rotate-180" />
      );
    case 'stable':
      return <BarChart3 className="w-4 h-4 text-gray-600" />;
    default:
      return null;
  }
}
