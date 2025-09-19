"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/context/AuthContext';
import { useUserFavorites } from '@/lib/hooks/useUserFavorites';
import { useRouter } from 'next/navigation';
import { formatDateTime } from '@/lib/utils/date';

// 根据频道获取样式
const getChannelStyle = (channel: string) => {
  const styles: Record<string, { bg: string; text: string }> = {
    '科技': { bg: 'bg-blue-100', text: 'text-blue-600' },
    '财经': { bg: 'bg-green-100', text: 'text-green-600' },
    '政治': { bg: 'bg-red-100', text: 'text-red-600' },
    '体育': { bg: 'bg-orange-100', text: 'text-orange-600' },
    '娱乐': { bg: 'bg-pink-100', text: 'text-pink-600' },
    '健康': { bg: 'bg-teal-100', text: 'text-teal-600' },
    '教育': { bg: 'bg-purple-100', text: 'text-purple-600' },
    '汽车': { bg: 'bg-indigo-100', text: 'text-indigo-600' },
    '房产': { bg: 'bg-yellow-100', text: 'text-yellow-600' },
    '旅游': { bg: 'bg-cyan-100', text: 'text-cyan-600' },
  };
  return styles[channel] || { bg: 'bg-gray-100', text: 'text-gray-600' };
};

// 根据频道获取图标
const getChannelIcon = (channel: string) => {
  const icons: Record<string, JSX.Element> = {
    '科技': (
      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    ),
    '财经': (
      <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    ),
    '政治': (
      <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    ),
    '体育': (
      <path d="M13 10V3L4 14h7v7l9-11h-7z" fill="currentColor"/>
    ),
    '娱乐': (
      <path d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h3a1 1 0 011 1v4a1 1 0 01-1 1h-1v10a2 2 0 01-2 2H7a2 2 0 01-2-2V10H4a1 1 0 01-1-1V5a1 1 0 011-1h3z" fill="currentColor"/>
    ),
  };
  return icons[channel] || (
    <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  );
};

export default function FavoritesContent() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { 
    favorites, 
    isLoading: isLoadingFavorites, 
    error, 
    totalFavorites,
    removeFromFavorites,
    refreshFavorites 
  } = useUserFavorites();
  const router = useRouter();
  
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isRemoving, setIsRemoving] = useState(false);

  // 检查认证状态
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/portal');
    }
  }, [isLoading, isAuthenticated, router]);


  // 处理单个取消收藏
  const handleRemoveFavorite = async (articleId: string) => {
    setIsRemoving(true);
    const success = await removeFromFavorites(articleId);
    
    if (success) {
      setSelectedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(articleId);
        return newSet;
      });
    }
    
    setIsRemoving(false);
  };

  // 处理批量取消收藏
  const handleBatchRemove = async () => {
    if (selectedItems.size === 0) return;
    
    setIsRemoving(true);
    
    // 批量删除选中的收藏
    const deletePromises = Array.from(selectedItems).map(articleId => 
      removeFromFavorites(articleId)
    );
    
    await Promise.all(deletePromises);
    setSelectedItems(new Set());
    setIsRemoving(false);
  };

  // 处理全选
  const handleSelectAll = () => {
    if (selectedItems.size === favorites.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(favorites.map(article => article.articleId)));
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

  if (isLoading) {
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
          <p className="text-gray-600">请先登录以查看您的收藏</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">我的收藏</h1>
            <p className="text-gray-600">管理您收藏的文章 ({totalFavorites} 篇)</p>
          </div>
          
          {/* 操作按钮 */}
          {favorites.length > 0 && (
            <div className="flex items-center space-x-3">
              <button
                onClick={handleSelectAll}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                {selectedItems.size === favorites.length ? '取消全选' : '全选'}
              </button>
              
              {selectedItems.size > 0 && (
                <button
                  onClick={handleBatchRemove}
                  disabled={isRemoving}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isRemoving && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <span>删除选中 ({selectedItems.size})</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 收藏列表 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {isLoadingFavorites ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-600">加载收藏列表...</span>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 text-red-300">
              <svg fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">加载失败</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={refreshFavorites}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              重新加载
            </button>
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 text-gray-300">
              <svg fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">还没有收藏</h3>
            <p className="text-gray-600 mb-4">收藏您感兴趣的文章，方便日后阅读</p>
            <Link
              href="/portal"
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              去发现好文章
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {favorites.map((article) => (
              <div key={article.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start space-x-4">
                  {/* 选择框 */}
                  <div className="flex-shrink-0 pt-1">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(article.articleId)}
                      onChange={() => handleSelectItem(article.articleId)}
                      className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                  </div>

                  {/* 缩略图 */}
                  <div className="flex-shrink-0">
                    <div className="w-32 h-20 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                      {article.articleImageUrl ? (
                        <Image
                          src={article.articleImageUrl}
                          alt={article.articleTitle}
                          width={128}
                          height={80}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // 图片加载失败时隐藏图片，显示占位符
                            e.currentTarget.style.display = 'none';
                            if (e.currentTarget.nextElementSibling) {
                              (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      
                      {/* 无图片占位符 */}
                      <div 
                        className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 ${
                          article.articleImageUrl ? 'hidden' : 'flex'
                        }`}
                        style={{ display: article.articleImageUrl ? 'none' : 'flex' }}
                      >
                        {/* 根据频道显示不同的图标和颜色 */}
                        <div className={`p-2 rounded-full mb-2 ${getChannelStyle(article.articleChannel).bg}`}>
                          <svg className={`w-5 h-5 ${getChannelStyle(article.articleChannel).text}`} fill="currentColor" viewBox="0 0 24 24">
                            {getChannelIcon(article.articleChannel)}
                          </svg>
                        </div>
                        <span className="text-xs text-center px-1 leading-tight text-gray-500 font-medium">
                          {article.articleChannel}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 文章信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <Link
                          href={`/portal/article/${article.articleSlug}`}
                          className="block mb-2"
                        >
                          <h3 className="text-lg font-medium text-gray-900 hover:text-red-600 line-clamp-2 transition-colors">
                            {article.articleTitle}
                          </h3>
                        </Link>
                        
                        <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                          {article.articleExcerpt || '暂无摘要'}
                        </p>
                        
                        <div className="flex items-center text-sm text-gray-500 space-x-4">
                          <span className="flex items-center">
                            <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                            {article.articleChannel}
                          </span>
                          <span>{formatDateTime(article.articlePublishTime)}</span>
                        </div>
                        
                        <div className="mt-2 text-xs text-gray-400">
                          收藏于 {formatDateTime(article.createdAt)}
                        </div>
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex-shrink-0 ml-4">
                        <button
                          onClick={() => handleRemoveFavorite(article.articleId)}
                          disabled={isRemoving}
                          className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                          title="取消收藏"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
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
