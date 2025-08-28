'use client';

import React, { useState } from 'react';
import { CacheInvalidator, CacheEvent } from '@/lib/cacheInvalidation';
import { useCache } from '@/components/CacheProvider';

export default function CacheManagementPage() {
  const [site, setSite] = useState('portal');
  const [articleId, setArticleId] = useState('');
  const [channelId, setChannelId] = useState('');
  const [regionId, setRegionId] = useState('');
  const [customTags, setCustomTags] = useState('');
  const [customPaths, setCustomPaths] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('/api/revalidate');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [results, setResults] = useState<Array<{ action: string; result: any; timestamp: string }>>([]);
  const [loading, setLoading] = useState(false);
  
  const { getCacheTags, clearCacheTags } = useCache();

  // 创建缓存失效器
  const getInvalidator = () => {
    return new CacheInvalidator(site, {
      webhookUrl: webhookUrl || undefined,
      webhookSecret: webhookSecret || undefined
    });
  };

  // 执行缓存失效操作
  const executeInvalidation = async (action: string, operation: () => Promise<any>) => {
    setLoading(true);
    try {
      const result = await operation();
      const newResult = {
        action,
        result,
        timestamp: new Date().toLocaleString('zh-CN')
      };
      setResults(prev => [newResult, ...prev]);
    } catch (error) {
      const errorResult = {
        action,
        result: { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date().toLocaleString('zh-CN')
      };
      setResults(prev => [errorResult, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  // 失效文章缓存
  const invalidateArticle = async (event: CacheEvent = 'article_updated') => {
    const invalidator = getInvalidator();
    await executeInvalidation(
      `失效文章缓存 (${event})`,
      () => invalidator.invalidateArticle(articleId || undefined, event)
    );
  };

  // 失效频道缓存
  const invalidateChannel = async () => {
    if (!channelId) {
      alert('请输入频道ID');
      return;
    }
    const invalidator = getInvalidator();
    await executeInvalidation(
      '失效频道缓存',
      () => invalidator.invalidateChannel(channelId)
    );
  };

  // 失效地区缓存
  const invalidateRegion = async () => {
    if (!regionId) {
      alert('请输入地区ID');
      return;
    }
    const invalidator = getInvalidator();
    await executeInvalidation(
      '失效地区缓存',
      () => invalidator.invalidateRegion(regionId)
    );
  };

  // 失效站点缓存
  const invalidateSite = async () => {
    const invalidator = getInvalidator();
    await executeInvalidation(
      '失效站点缓存',
      () => invalidator.invalidateSite()
    );
  };

  // 批量失效缓存
  const invalidateBulk = async () => {
    const tags = customTags.split(',').map(tag => tag.trim()).filter(Boolean);
    const paths = customPaths.split(',').map(path => path.trim()).filter(Boolean);
    
    if (tags.length === 0 && paths.length === 0) {
      alert('请输入至少一个标签或路径');
      return;
    }
    
    const invalidator = getInvalidator();
    await executeInvalidation(
      '批量失效缓存',
      () => invalidator.invalidateBulk(tags, paths.length > 0 ? paths : undefined)
    );
  };

  // 测试 Webhook 健康状态
  const testWebhookHealth = async () => {
    try {
      const response = await fetch(webhookUrl || '/api/revalidate');
      const data = await response.json();
      const result = {
        action: '测试Webhook健康状态',
        result: { success: response.ok, data },
        timestamp: new Date().toLocaleString('zh-CN')
      };
      setResults(prev => [result, ...prev]);
    } catch (error) {
      const errorResult = {
        action: '测试Webhook健康状态',
        result: { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp: new Date().toLocaleString('zh-CN')
      };
      setResults(prev => [errorResult, ...prev]);
    }
  };

  // 清除结果
  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">缓存管理控制台</h1>
          
          {/* 配置区域 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">基础配置</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    站点类型
                  </label>
                  <select
                    value={site}
                    onChange={(e) => setSite(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="portal">门户站点 (portal)</option>
                    <option value="localsite">本地站点 (localsite)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Webhook URL
                  </label>
                  <input
                    type="text"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="/api/revalidate"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Webhook 密钥
                  </label>
                  <input
                    type="password"
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    placeholder="留空使用环境变量"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">当前缓存标签</h2>
              <div className="bg-gray-100 p-4 rounded-md">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">活跃标签:</span>
                  <button
                    onClick={clearCacheTags}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    清除
                  </button>
                </div>
                <div className="space-y-1">
                  {getCacheTags().map((tag, index) => (
                    <div key={index} className="text-xs text-gray-600 bg-white px-2 py-1 rounded">
                      {tag.name}: {tag.value}
                    </div>
                  ))}
                  {getCacheTags().length === 0 && (
                    <div className="text-xs text-gray-500 italic">暂无缓存标签</div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* 操作区域 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">文章缓存管理</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    文章ID (可选)
                  </label>
                  <input
                    type="text"
                    value={articleId}
                    onChange={(e) => setArticleId(e.target.value)}
                    placeholder="留空失效所有文章缓存"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => invalidateArticle('article_published')}
                    disabled={loading}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    发布事件
                  </button>
                  <button
                    onClick={() => invalidateArticle('article_updated')}
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    更新事件
                  </button>
                  <button
                    onClick={() => invalidateArticle('article_unpublished')}
                    disabled={loading}
                    className="flex-1 bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 disabled:opacity-50"
                  >
                    下架事件
                  </button>
                </div>
              </div>
            </div>
            
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">频道和地区缓存</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    频道ID
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={channelId}
                      onChange={(e) => setChannelId(e.target.value)}
                      placeholder="输入频道ID"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={invalidateChannel}
                      disabled={loading || !channelId}
                      className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
                    >
                      失效
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    地区ID
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={regionId}
                      onChange={(e) => setRegionId(e.target.value)}
                      placeholder="输入地区ID"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={invalidateRegion}
                      disabled={loading || !regionId}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                    >
                      失效
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* 批量操作 */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">批量操作</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  自定义标签 (逗号分隔)
                </label>
                <input
                  type="text"
                  value={customTags}
                  onChange={(e) => setCustomTags(e.target.value)}
                  placeholder="site:portal,type:article,channel:123"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  自定义路径 (逗号分隔)
                </label>
                <input
                  type="text"
                  value={customPaths}
                  onChange={(e) => setCustomPaths(e.target.value)}
                  placeholder="/news,/tools,/search"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex space-x-4 mt-4">
              <button
                onClick={invalidateBulk}
                disabled={loading}
                className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                批量失效
              </button>
              
              <button
                onClick={invalidateSite}
                disabled={loading}
                className="bg-orange-600 text-white px-6 py-2 rounded-md hover:bg-orange-700 disabled:opacity-50"
              >
                失效站点缓存
              </button>
              
              <button
                onClick={testWebhookHealth}
                disabled={loading}
                className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50"
              >
                测试Webhook
              </button>
            </div>
          </div>
          
          {/* 结果显示 */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">操作结果</h2>
              <button
                onClick={clearResults}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                清除结果
              </button>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-md border ${
                    result.result.success
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{result.action}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {result.result.message || JSON.stringify(result.result)}
                      </p>
                      {result.result.revalidated_count !== undefined && (
                        <p className="text-sm text-gray-500 mt-1">
                          失效项目数: {result.result.revalidated_count}
                        </p>
                      )}
                      {result.result.errors && result.result.errors.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-red-700">错误详情:</p>
                          <ul className="text-sm text-red-600 mt-1 space-y-1">
                            {result.result.errors.map((error: string, errorIndex: number) => (
                              <li key={errorIndex}>• {error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 ml-4">{result.timestamp}</span>
                  </div>
                </div>
              ))}
              
              {results.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  暂无操作结果，请执行缓存失效操作
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
