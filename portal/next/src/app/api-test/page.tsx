"use client";

import { useState } from 'react';

export default function ApiTestPage() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testApi = async (endpoint: string) => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      console.log(`[API Test] Testing endpoint: ${endpoint}`);
      const response = await fetch(endpoint);
      console.log(`[API Test] Response status:`, response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      setResults(data);
      console.log(`[API Test] Success:`, data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error(`[API Test] Error:`, err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">API 测试页面</h1>
      <p className="text-gray-600">测试各个API端点是否正常工作</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => testApi('/api/ai-news?size=2')}
          disabled={loading}
          className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          测试 AI 新闻 API
        </button>
        
        <button
          onClick={() => testApi('/api/ai-tools?size=2')}
          disabled={loading}
          className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          测试 AI 工具 API
        </button>
        
        <button
          onClick={() => testApi('/api/feed?site=localhost&size=2')}
          disabled={loading}
          className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          测试 Feed API
        </button>
        
        <button
          onClick={() => testApi('/api/ai-news/hot')}
          disabled={loading}
          className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          测试热门新闻 API
        </button>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">测试中...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
          <h3 className="font-semibold">错误信息:</h3>
          <p>{error}</p>
        </div>
      )}

      {results && (
        <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
          <h3 className="font-semibold text-green-800 mb-2">成功结果:</h3>
          <pre className="bg-white p-4 rounded border overflow-auto text-sm">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">调试信息:</h3>
        <p className="text-sm text-gray-600">
          请打开浏览器控制台查看详细的API调用日志。
        </p>
      </div>
    </div>
  );
}
