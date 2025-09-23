"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/context/AuthContext';
import { useReadingHistory } from '@/lib/hooks/useReadingHistory';
import { useRouter } from 'next/navigation';
import { formatDateTime } from '@/lib/utils/date';

export default function HistoryContent() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    history,
    isLoading: historyLoading,
    totalItems,
    removeFromHistory,
    removeMultipleFromHistory,
    clearHistory,
    getHistoryByDate,
    getReadingStats,
  } = useReadingHistory();
  const router = useRouter();
  
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isRemoving, setIsRemoving] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('grouped');
  const [showStats, setShowStats] = useState(false);

  // 检查认证状态
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/portal');
    }
  }, [authLoading, isAuthenticated, router]);

  // 直接使用真实的history数据，不使用模拟数据

  // 处理单个删除
  const handleRemoveItem = async (articleId: string) => {
    setIsRemoving(true);
    removeFromHistory(articleId);
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(articleId);
      return newSet;
    });
    setIsRemoving(false);
  };

  // 处理批量删除
  const handleBatchRemove = async () => {
    if (selectedItems.size === 0) return;
    
    setIsRemoving(true);
    removeMultipleFromHistory(Array.from(selectedItems));
    setSelectedItems(new Set());
    setIsRemoving(false);
  };

  // 处理清空全部
  const handleClearAll = async () => {
    if (window.confirm('确定要清空所有阅读历史吗？此操作不可撤销。')) {
      setIsRemoving(true);
      clearHistory();
      setSelectedItems(new Set());
      setIsRemoving(false);
    }
  };

  // 处理全选
  const handleSelectAll = () => {
    if (selectedItems.size === history.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(history.map(item => item.id)));
    }
  };

  // 处理单个选择
  const handleSelectItem = (articleId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(articleId)) {
        newSet.delete(articleId);
      } else {
        newSet.add(articleId);
      }
      return newSet;
    });
  };

  // 格式化阅读时长
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}秒`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}分钟`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}小时${remainingMinutes}分钟`;
  };

  // 获取阅读进度颜色
  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (authLoading || historyLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">加载中...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">需要登录</h2>
          <p className="text-gray-600">请先登录以查看您的阅读历史</p>
        </div>
      </div>
    );
  }

  const stats = getReadingStats();
  const groupedHistory = getHistoryByDate();

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">阅读历史</h1>
            <p className="text-gray-600">您的个人阅读足迹 ({totalItems} 篇文章)</p>
          </div>
          
          {/* 视图切换 */}
          <div className="flex items-center space-x-3">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grouped')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === 'grouped' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                按日期
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                列表
              </button>
            </div>
            
            <button
              onClick={() => setShowStats(!showStats)}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              {showStats ? '隐藏统计' : '显示统计'}
            </button>
          </div>
        </div>

        {/* 阅读统计 */}
        {showStats && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{totalItems}</div>
              <div className="text-sm text-gray-600">总阅读量</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.totalReadTime}</div>
              <div className="text-sm text-gray-600">总时长(分钟)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.avgReadTime}</div>
              <div className="text-sm text-gray-600">平均时长(分钟)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.recentCount}</div>
              <div className="text-sm text-gray-600">最近7天</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900">{stats.favoriteChannel}</div>
              <div className="text-sm text-gray-600">偏好频道</div>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        {history.length > 0 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-3">
              <button
                onClick={handleSelectAll}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                {selectedItems.size === history.length ? '取消全选' : '全选'}
              </button>
              
              {selectedItems.size > 0 && (
                <button
                  onClick={handleBatchRemove}
                  disabled={isRemoving}
                  className="flex items-center space-x-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isRemoving && (
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <span>删除选中 ({selectedItems.size})</span>
                </button>
              )}
            </div>
            
            <button
              onClick={handleClearAll}
              disabled={isRemoving}
              className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              清空全部
            </button>
          </div>
        )}
      </div>

      {/* 历史记录列表 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {history.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 text-gray-300">
              <svg fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">还没有阅读历史</h3>
            <p className="text-gray-600 mb-4">开始阅读文章，这里将记录您的阅读足迹</p>
            <Link
              href="/portal"
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              去阅读文章
            </Link>
          </div>
        ) : viewMode === 'grouped' ? (
          // 按日期分组显示
          <div className="divide-y divide-gray-200">
            {Object.entries(groupedHistory).map(([date, items]) => (
              <div key={date} className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {new Date(date).toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long'
                  })}
                  <span className="ml-2 text-sm text-gray-500">({items.length} 篇)</span>
                </h3>
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-start space-x-4 p-4 hover:bg-gray-50 rounded-lg transition-colors">
                      {/* 选择框 */}
                      <div className="flex-shrink-0 pt-1">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id)}
                          onChange={() => handleSelectItem(item.id)}
                          className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                        />
                      </div>

                      {/* 缩略图 */}
                      <div className="flex-shrink-0">
                        <div className="w-24 h-16 bg-gray-200 rounded overflow-hidden">
                          <Image
                            src={item.image_url}
                            alt={item.title}
                            width={96}
                            height={64}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>

                      {/* 文章信息 */}
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/portal/article/${item.slug}`}
                          className="block mb-2"
                        >
                          <h4 className="text-base font-medium text-gray-900 hover:text-red-600 line-clamp-2 transition-colors">
                            {item.title}
                          </h4>
                        </Link>
                        
                        <p className="text-gray-600 text-sm line-clamp-2 mb-2">
                          {item.excerpt}
                        </p>
                        
                        <div className="flex items-center text-sm text-gray-500 space-x-4">
                          <span className="flex items-center">
                            <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                            {item.channel?.name || '未知频道'}
                          </span>
                          <span>{item.author || '未知作者'}</span>
                          <span>阅读时长: {formatDuration(item.readDuration)}</span>
                        </div>
                        
                        {/* 阅读进度 */}
                        <div className="flex items-center mt-2">
                          <span className="text-xs text-gray-500 mr-2">阅读进度:</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-24">
                            <div 
                              className={`h-2 rounded-full ${getProgressColor(item.readProgress)}`}
                              style={{ width: `${item.readProgress}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500 ml-2">{item.readProgress}%</span>
                        </div>
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex-shrink-0">
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={isRemoving}
                          className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                          title="删除记录"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // 列表模式显示
          <div className="divide-y divide-gray-200">
                  {history.map((item) => (
              <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start space-x-4">
                  {/* 选择框 */}
                  <div className="flex-shrink-0 pt-1">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={() => handleSelectItem(item.id)}
                      className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                  </div>

                  {/* 缩略图 */}
                  <div className="flex-shrink-0">
                    <div className="w-32 h-20 bg-gray-200 rounded-lg overflow-hidden">
                      <Image
                        src={item.image_url}
                        alt={item.title}
                        width={128}
                        height={80}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  {/* 文章信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <Link
                          href={`/portal/article/${item.slug}`}
                          className="block mb-2"
                        >
                          <h3 className="text-lg font-medium text-gray-900 hover:text-red-600 line-clamp-2 transition-colors">
                            {item.title}
                          </h3>
                        </Link>
                        
                        <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                          {item.excerpt}
                        </p>
                        
                        <div className="flex items-center text-sm text-gray-500 space-x-4">
                          <span className="flex items-center">
                            <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                            {item.channel?.name || '未知频道'}
                          </span>
                          <span>{item.author || '未知作者'}</span>
                          <span>阅读于 {formatDateTime(item.readTime)}</span>
                          <span>时长: {formatDuration(item.readDuration)}</span>
                        </div>
                        
                        {/* 阅读进度 */}
                        <div className="flex items-center mt-2">
                          <span className="text-xs text-gray-500 mr-2">阅读进度:</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-32">
                            <div 
                              className={`h-2 rounded-full ${getProgressColor(item.readProgress)}`}
                              style={{ width: `${item.readProgress}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500 ml-2">{item.readProgress}%</span>
                        </div>
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex-shrink-0 ml-4">
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={isRemoving}
                          className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                          title="删除记录"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
