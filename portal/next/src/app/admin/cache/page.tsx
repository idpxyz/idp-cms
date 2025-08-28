"use client";

import { useState, useEffect } from 'react';

interface CacheStats {
  cache_alias: string;
  backend: string;
  timestamp: string;
  redis_version?: string;
  used_memory_human?: string;
  connected_clients?: number;
  total_commands_processed?: number;
  error?: string;
}

interface CacheResponse {
  success: boolean;
  data?: Record<string, CacheStats>;
  message?: string;
  error?: string;
  detail?: string;
}

export default function CacheManagementPage() {
  const [stats, setStats] = useState<Record<string, CacheStats> | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pattern, setPattern] = useState('');
  const [cacheAlias, setCacheAlias] = useState('api');
  const [healthStatus, setHealthStatus] = useState<'healthy' | 'unhealthy' | 'loading'>('loading');

  // 获取缓存统计
  const fetchCacheStats = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/cache/stats');
      const data: CacheResponse = await response.json();
      
      if (data.success && data.data) {
        setStats(data.data);
      } else {
        setMessage({ type: 'error', text: data.error || '获取缓存统计失败' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '获取缓存统计失败' });
    } finally {
      setLoading(false);
    }
  };

  // 清空所有缓存
  const clearAllCaches = async () => {
    if (!confirm('确定要清空所有缓存吗？这将影响系统性能。')) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/cache/clear', { method: 'POST' });
      const data: CacheResponse = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: data.message || '缓存已清空' });
        fetchCacheStats(); // 刷新统计
      } else {
        setMessage({ type: 'error', text: data.error || '清空缓存失败' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '清空缓存失败' });
    } finally {
      setLoading(false);
    }
  };

  // 按模式失效缓存
  const invalidatePattern = async () => {
    if (!pattern.trim()) {
      setMessage({ type: 'error', text: '请输入缓存模式' });
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('/api/cache/invalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pattern: pattern.trim(), cache_alias: cacheAlias })
      });
      const data: CacheResponse = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: data.message || '缓存模式已失效' });
        setPattern('');
        fetchCacheStats(); // 刷新统计
      } else {
        setMessage({ type: 'error', text: data.error || '失效缓存失败' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '失效缓存失败' });
    } finally {
      setLoading(false);
    }
  };

  // 失效新闻缓存
  const invalidateNewsCache = async (newsId?: number) => {
    setLoading(true);
    try {
      const response = await fetch('/api/cache/invalidate-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ news_id: newsId })
      });
      const data: CacheResponse = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: data.message || '新闻缓存已失效' });
        fetchCacheStats(); // 刷新统计
      } else {
        setMessage({ type: 'error', text: data.error || '失效新闻缓存失败' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '失效新闻缓存失败' });
    } finally {
      setLoading(false);
    }
  };

  // 失效工具缓存
  const invalidateToolsCache = async (toolId?: number) => {
    setLoading(true);
    try {
      const response = await fetch('/api/cache/invalidate-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_id: toolId })
      });
      const data: CacheResponse = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: data.message || '工具缓存已失效' });
        fetchCacheStats(); // 刷新统计
      } else {
        setMessage({ type: 'error', text: data.error || '失效工具缓存失败' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '失效工具缓存失败' });
    } finally {
      setLoading(false);
    }
  };

  // 检查缓存健康状态
  const checkCacheHealth = async () => {
    try {
      const response = await fetch('/api/cache/health');
      const data: CacheResponse = await response.json();
      
      if (data.success) {
        setHealthStatus('healthy');
      } else {
        setHealthStatus('unhealthy');
      }
    } catch (error) {
      setHealthStatus('unhealthy');
    }
  };

  // 初始化
  useEffect(() => {
    fetchCacheStats();
    checkCacheHealth();
  }, []);

  // 自动刷新
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCacheStats();
      checkCacheHealth();
    }, 30000); // 30秒刷新一次

    return () => clearInterval(interval);
  }, []);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  const getHealthIcon = () => {
    switch (healthStatus) {
      case 'healthy':
        return '🟢';
      case 'unhealthy':
        return '🔴';
      default:
        return '🟡';
    }
  };

  const getHealthText = () => {
    switch (healthStatus) {
      case 'healthy':
        return '健康';
      case 'unhealthy':
        return '异常';
      default:
        return '检查中...';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">缓存管理</h1>
          <p className="text-gray-600">监控和管理系统缓存状态</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            onClick={fetchCacheStats}
            disabled={loading}
          >
            {loading ? '🔄' : '🔄'} 刷新
          </button>
        </div>
      </div>

      {/* 消息提示 */}
      {message && (
        <div className={`p-4 rounded-md ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* 缓存健康状态 */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h2 className="text-xl font-semibold flex items-center space-x-2">
          <span>{getHealthIcon()}</span>
          <span>缓存健康状态</span>
          <span className={`px-2 py-1 text-xs rounded-full ${
            healthStatus === 'healthy' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {getHealthText()}
          </span>
        </h2>
      </div>

      {/* 缓存统计 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(stats).map(([cacheName, cacheStats]) => (
            <div key={cacheName} className="bg-white p-6 rounded-lg shadow border">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <span>🗄️</span>
                <span>{cacheName.toUpperCase()} 缓存</span>
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                后端: {cacheStats.backend} | 更新时间: {formatTimestamp(cacheStats.timestamp)}
              </p>
              
              {cacheStats.error ? (
                <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded">
                  {cacheStats.error}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {cacheStats.redis_version && (
                    <div>
                      <label className="font-medium">Redis版本</label>
                      <p className="font-mono text-gray-700">{cacheStats.redis_version}</p>
                    </div>
                  )}
                  {cacheStats.used_memory_human && (
                    <div>
                      <label className="font-medium">内存使用</label>
                      <p className="font-mono text-gray-700">{cacheStats.used_memory_human}</p>
                    </div>
                  )}
                  {cacheStats.connected_clients && (
                    <div>
                      <label className="font-medium">连接数</label>
                      <p className="font-mono text-gray-700">{cacheStats.connected_clients}</p>
                    </div>
                  )}
                  {cacheStats.total_commands_processed && (
                    <div>
                      <label className="font-medium">总命令数</label>
                      <p className="font-mono text-gray-700">{cacheStats.total_commands_processed.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <hr className="border-gray-200" />

      {/* 缓存操作 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 清空缓存 */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold flex items-center space-x-2">
            <span>🗑️</span>
            <span>清空缓存</span>
          </h3>
          <p className="text-gray-600 text-sm mb-4">清空所有缓存，谨慎操作</p>
          <button
            className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            onClick={clearAllCaches}
            disabled={loading}
          >
            {loading ? '清空中...' : '清空所有缓存'}
          </button>
        </div>

        {/* 按模式失效缓存 */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold flex items-center space-x-2">
            <span>⚡</span>
            <span>按模式失效缓存</span>
          </h3>
          <p className="text-gray-600 text-sm mb-4">使用通配符模式失效特定缓存</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">缓存模式</label>
              <input
                type="text"
                placeholder="例如: *news* 或 *tools*"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">缓存别名</label>
              <select
                value={cacheAlias}
                onChange={(e) => setCacheAlias(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="api">API缓存</option>
                <option value="default">默认缓存</option>
              </select>
            </div>
            <button
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              onClick={invalidatePattern}
              disabled={loading || !pattern.trim()}
            >
              {loading ? '失效中...' : '失效缓存'}
            </button>
          </div>
        </div>
      </div>

      {/* 快速操作 */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-semibold mb-4">快速操作</h3>
        <p className="text-gray-600 text-sm mb-4">常用的缓存失效操作</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            onClick={() => invalidateNewsCache()}
            disabled={loading}
          >
            失效所有新闻缓存
          </button>
          <button
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            onClick={() => invalidateToolsCache()}
            disabled={loading}
          >
            失效所有工具缓存
          </button>
          <button
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            onClick={() => invalidateNewsCache(1)}
            disabled={loading}
          >
            失效新闻#1缓存
          </button>
          <button
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            onClick={() => invalidateToolsCache(1)}
            disabled={loading}
          >
            失效工具#1缓存
          </button>
        </div>
      </div>
    </div>
  );
}
