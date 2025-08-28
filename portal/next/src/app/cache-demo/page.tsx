'use client';

import React, { useState, useEffect } from 'react';
import { CacheTag, useCache } from '@/components/CacheProvider';
import CacheMonitor from '@/components/CacheMonitor';
import { generateCacheTag, generateSurrogateKey } from '@/lib/cache';

export default function CacheDemoPage() {
  const { addCacheTag, getCacheTags, clearCacheTags } = useCache();
  const [site, setSite] = useState('portal');
  const [articleId, setArticleId] = useState('12345');
  const [channelId, setChannelId] = useState('tech');
  const [regionId, setRegionId] = useState('china');
  const [customTag, setCustomTag] = useState('');
  const [customValue, setCustomValue] = useState('');
  const [surrogateKey, setSurrogateKey] = useState('');

  // 生成 Surrogate-Key
  useEffect(() => {
    const tags = getCacheTags();
    if (tags.length > 0) {
      // 使用第一个标签作为基础，或者创建一个默认标签
      const baseTag = tags[0] || { site, type: 'page' };
      const key = generateSurrogateKey(baseTag);
      setSurrogateKey(key);
    } else {
      setSurrogateKey('');
    }
  }, [getCacheTags, site]);

  // 添加自定义标签
  const handleAddCustomTag = () => {
    if (customTag && customValue) {
      addCacheTag({ site, [customTag]: customValue });
      setCustomTag('');
      setCustomValue('');
    }
  };

  // 添加示例标签
  const addExampleTags = () => {
    addCacheTag({ site, type: 'page' });
    addCacheTag({ site, page: 'cache-demo' });
    addCacheTag({ site, type: 'site' });
  };

  // 模拟文章数据
  const sampleArticles = [
    {
      id: '12345',
      title: 'AI工具推荐：2024年最值得关注的10款AI应用',
      channel: 'AI工具',
      region: '全球',
      tags: ['ai', 'tools', '2024'],
    },
    {
      id: '12346',
      title: 'ChatGPT使用技巧：提升工作效率的10个方法',
      channel: '使用教程',
      region: '中国',
      tags: ['chatgpt', 'tutorial', 'productivity'],
    },
    {
      id: '12347',
      title: '机器学习入门指南：从零开始学习AI',
      channel: '学习指南',
      region: '美国',
      tags: ['ml', 'beginner', 'guide'],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            缓存标签系统演示
          </h1>
          <p className="text-xl text-gray-600">
            展示 Next.js 缓存标签系统的各种用法和功能
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：缓存监控 */}
          <div className="lg:col-span-1">
            <CacheMonitor />
          </div>

          {/* 中间：标签操作 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                标签操作
              </h2>

              {/* 基础配置 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
                    文章ID
                  </label>
                  <input
                    type="text"
                    value={articleId}
                    onChange={(e) => setArticleId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* 快速添加标签 */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  快速添加标签
                </h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => addCacheTag({ site, type: 'site' })}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 text-sm"
                  >
                    添加站点标签
                  </button>
                  <button
                    onClick={() => addCacheTag({ site, page: articleId })}
                    className="px-3 py-1 bg-green-100 text-green-800 rounded-md hover:bg-green-200 text-sm"
                  >
                    添加页面标签
                  </button>
                  <button
                    onClick={() => addCacheTag({ site, channel: channelId })}
                    className="px-3 py-1 bg-purple-100 text-purple-800 rounded-md hover:bg-purple-200 text-sm"
                  >
                    添加频道标签
                  </button>
                  <button
                    onClick={() => addCacheTag({ site, region: regionId })}
                    className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-md hover:bg-indigo-200 text-sm"
                  >
                    添加地区标签
                  </button>
                  <button
                    onClick={addExampleTags}
                    className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200 text-sm"
                  >
                    添加示例标签
                  </button>
                </div>
              </div>

              {/* 自定义标签 */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  自定义标签
                </h3>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    placeholder="标签名"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value)}
                    placeholder="标签值"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleAddCustomTag}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    添加
                  </button>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex space-x-4">
                <button
                  onClick={clearCacheTags}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  清除所有标签
                </button>
                <button
                  onClick={() => {
                    addCacheTag({ site, type: 'page' });
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  刷新演示
                </button>
              </div>
            </div>

            {/* 当前标签状态 */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                当前标签状态
              </h2>

              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Surrogate-Key
                </h3>
                <div className="bg-gray-100 p-3 rounded-md">
                  <code className="text-sm text-gray-800 break-all">
                    {surrogateKey || '无标签'}
                  </code>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  活跃标签 ({getCacheTags().length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {getCacheTags().map((tag, index) => (
                    <div
                      key={index}
                      className="bg-blue-50 border border-blue-200 rounded-md p-2"
                    >
                      <span className="text-sm font-medium text-blue-800">
                        {Object.entries(tag)
                          .map(([key, value]) => `${key}: ${value}`)
                          .join(', ')}
                      </span>
                    </div>
                  ))}
                  {getCacheTags().length === 0 && (
                    <div className="text-gray-500 italic">暂无缓存标签</div>
                  )}
                </div>
              </div>
            </div>

            {/* 文章演示 */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                文章缓存标签演示
              </h2>

              <div className="space-y-4">
                {sampleArticles.map((article) => (
                  <div
                    key={article.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {article.title}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                          <span>频道: {article.channel}</span>
                          <span>地区: {article.region}</span>
                          <span>ID: {article.id}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {article.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="ml-4">
                        <CacheTag
                          tag={{ site, page: article.id, type: 'article' }}
                        >
                          <button className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
                            查看缓存
                          </button>
                        </CacheTag>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 底部说明 */}
        <div className="mt-8 text-center text-gray-600">
          <p className="mb-2">
            这个演示页面展示了如何使用缓存标签系统来管理 Next.js 的缓存策略。
          </p>
          <p>
            访问{' '}
            <a
              href="/cache-management"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              缓存管理控制台
            </a>{' '}
            来测试缓存失效功能。
          </p>
        </div>
      </div>
    </div>
  );
}
