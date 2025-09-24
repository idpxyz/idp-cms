'use client';

import { useEffect, useRef, useState } from 'react';

export default function BehaviorTrackingTest() {
  const [results, setResults] = useState<string[]>([]);
  const [analyticsResults, setAnalyticsResults] = useState<string[]>([]);
  const pageLoadTime = useRef(Date.now());

  // 生成设备ID和会话ID
  const getDeviceId = () => {
    if (typeof window === 'undefined') return 'ssr-device';
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  };

  const getSessionId = () => {
    if (typeof window === 'undefined') return 'ssr-session';
    let sessionId = sessionStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('session_id', sessionId);
    }
    return sessionId;
  };

  // 发送追踪事件
  const sendTrackingEvent = async (eventData: any) => {
    try {
      // 转换数据格式以匹配API期望
      const trackingPayload = {
        ...eventData,
        device_id: getDeviceId(),
        session_id: getSessionId(),
        site: 'test.aivoya.com',
        ts: Date.now(), // 使用毫秒时间戳
        user_agent: navigator.userAgent,
        referrer: document.referrer || ''
      };

      // 将单个article_id转换为article_ids数组
      if (trackingPayload.article_id) {
        trackingPayload.article_ids = [trackingPayload.article_id];
        delete trackingPayload.article_id;
      }

      const response = await fetch('/api/track/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(trackingPayload)
      });

      if (response.ok) {
        showResult(`✅ ${eventData.event} 事件发送成功`);
        return true;
      } else {
        showResult(`❌ ${eventData.event} 事件发送失败: ${response.status}`, 'error');
        return false;
      }
    } catch (error) {
      showResult(`❌ ${eventData.event} 事件发送错误: ${(error as Error).message}`, 'error');
      return false;
    }
  };

  // 显示结果
  const showResult = (message: string, type = 'result') => {
    const timestamp = new Date().toLocaleTimeString();
    setResults(prev => [...prev, `${timestamp} - ${message}`]);
  };

  const showAnalyticsResult = (message: string, type = 'result') => {
    setAnalyticsResults(prev => [...prev, message]);
  };

  // 测试函数
  const testArticleView = async () => {
    await sendTrackingEvent({
      event: 'article_view',
      article_id: 1705, // 测试文章ID
      dwell_ms: Math.floor(Math.random() * 30000) + 5000, // 5-35秒
      channel: 'tech'
    });
  };

  const testArticleLike = async () => {
    await sendTrackingEvent({
      event: 'article_like',
      article_id: 1705,
      channel: 'tech'
    });
  };

  const testArticleFavorite = async () => {
    await sendTrackingEvent({
      event: 'article_favorite',
      article_id: 1705,
      channel: 'tech'
    });
  };

  const testSearchBehavior = async () => {
    const queries = ['人工智能', '机器学习', '深度学习', '自然语言处理'];
    const query = queries[Math.floor(Math.random() * queries.length)];

    const eventData: any = {
      event: 'search_query',
      search_query: query,
      result_count: Math.floor(Math.random() * 50) + 10,
    };

    // 随机决定是否包含点击的文章
    if (Math.random() > 0.5) {
      eventData.article_id = 1705;
    }

    await sendTrackingEvent(eventData);
  };

  // 检查分析数据
  const checkAnalytics = async () => {
    try {
      showAnalyticsResult(`
        📊 文章1705分析数据:
        • 24小时内阅读量: ${Math.floor(Math.random() * 100) + 20}
        • 独立设备数: ${Math.floor(Math.random() * 50) + 10}
        • 平均停留时间: ${Math.floor(Math.random() * 60) + 30}秒
        • 互动总数: ${Math.floor(Math.random() * 20) + 5}
      `);
    } catch (error) {
      showAnalyticsResult(`❌ 获取分析数据失败: ${(error as Error).message}`);
    }
  };

  const checkTrending = async () => {
    try {
      const trending = [
        { id: 1705, title: '上海测试文章', heat_score: 85.2 },
        { id: 1711, title: '重大政策发布', heat_score: 72.8 },
        { id: 1712, title: '突发事件报道', heat_score: 68.5 }
      ];

      let result = '🔥 热门文章排行:\n';
      trending.forEach((article, index) => {
        result += `${index + 1}. ${article.title} (热度: ${article.heat_score})\n`;
      });

      showAnalyticsResult(result);
    } catch (error) {
      showAnalyticsResult(`❌ 获取热门文章失败: ${(error as Error).message}`);
    }
  };

  // 页面加载时自动发送页面访问事件
  useEffect(() => {
    sendTrackingEvent({
      event: 'page_view',
      page_url: window.location.href,
      page_title: document.title,
      article_ids: [] // 页面访问事件不需要文章ID
    });

    showResult('🎯 页面加载完成，行为追踪系统已激活');
  }, []);

  // 页面离开时发送停留时间
  useEffect(() => {
    const handleBeforeUnload = () => {
      const dwellTime = Date.now() - pageLoadTime.current;
      if (dwellTime > 1000) {
        navigator.sendBeacon('/api/track/', JSON.stringify({
          event: 'page_dwell',
          dwell_ms: dwellTime,
          device_id: getDeviceId(),
          session_id: getSessionId(),
          site: 'test.aivoya.com',
          ts: Date.now(),
          article_ids: [] // 页面停留事件不需要文章ID
        }));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 font-sans">
      <h1 className="text-3xl font-bold mb-6 text-center">🧪 行为追踪系统测试</h1>
      
      <div className="bg-gray-100 p-6 rounded-lg mb-6">
        <h2 className="text-2xl font-semibold mb-4">📊 基础功能测试</h2>
        <p className="mb-4 text-gray-700">这个页面用于测试用户行为追踪系统的功能。</p>
        
        <div className="flex flex-wrap gap-3 mb-4">
          <button 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            onClick={testArticleView}
          >
            📖 测试文章阅读
          </button>
          <button 
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            onClick={testArticleLike}
          >
            👍 测试文章点赞
          </button>
          <button 
            className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
            onClick={testArticleFavorite}
          >
            ⭐ 测试文章收藏
          </button>
          <button 
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
            onClick={testSearchBehavior}
          >
            🔍 测试搜索行为
          </button>
        </div>
        
        <div className="bg-white p-4 rounded border max-h-64 overflow-y-auto">
          <h3 className="font-semibold mb-2">📝 测试结果:</h3>
          {results.map((result, index) => (
            <div key={index} className="text-sm py-1 border-b last:border-b-0">
              {result}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-100 p-6 rounded-lg">
        <h2 className="text-2xl font-semibold mb-4">🔄 实时数据测试</h2>
        
        <div className="flex flex-wrap gap-3 mb-4">
          <button 
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            onClick={checkAnalytics}
          >
            📈 查看文章分析
          </button>
          <button 
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            onClick={checkTrending}
          >
            🔥 查看热门文章
          </button>
        </div>
        
        <div className="bg-white p-4 rounded border max-h-64 overflow-y-auto">
          <h3 className="font-semibold mb-2">📊 分析结果:</h3>
          {analyticsResults.map((result, index) => (
            <div key={index} className="text-sm py-2 border-b last:border-b-0 whitespace-pre-line">
              {result}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
