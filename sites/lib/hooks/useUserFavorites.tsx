"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { userFavoritesApi, UserFavoriteData } from '@/lib/api/webUsersApi';

// 统一的用户收藏接口
export interface UserFavoriteItem {
  id: string;
  articleId: string;
  articleTitle: string;
  articleSlug: string;
  articleChannel: string;
  articleExcerpt: string;
  articleImageUrl: string;
  articlePublishTime: string;
  createdAt: string;
}

// 将API数据转换为前端格式
const convertApiToFavoriteItem = (apiData: UserFavoriteData): UserFavoriteItem => ({
  id: apiData.id,
  articleId: apiData.article_id,
  articleTitle: apiData.article_title,
  articleSlug: apiData.article_slug,
  articleChannel: apiData.article_channel,
  articleExcerpt: apiData.article_excerpt,
  articleImageUrl: apiData.article_image_url,
  articlePublishTime: apiData.article_publish_time,
  createdAt: apiData.created_at,
});

// Hook接口
interface UseUserFavoritesReturn {
  favorites: UserFavoriteItem[];
  isLoading: boolean;
  error: string | null;
  totalFavorites: number;
  hasMore: boolean;
  loadFavorites: () => Promise<void>;
  loadMoreFavorites: () => Promise<void>;
  addToFavorites: (articleData: {
    articleId: string;
    articleTitle: string;
    articleSlug: string;
    articleChannel: string;
    articleExcerpt?: string;
    articleImageUrl?: string;
    articlePublishTime?: string;
  }) => Promise<boolean>;
  removeFromFavorites: (articleId: string) => Promise<boolean>;
  isFavorited: (articleId: string) => boolean;
  clearFavorites: () => Promise<boolean>;
  refreshFavorites: () => Promise<void>;
}

export function useUserFavorites(): UseUserFavoritesReturn {
  const { user, isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState<UserFavoriteItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalFavorites, setTotalFavorites] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const PAGE_SIZE = 20;

  // 加载收藏列表
  const loadFavorites = async () => {
    if (!isAuthenticated) {
      setFavorites([]);
      setError('请先登录');
      return;
    }

    setIsLoading(true);
    setError(null);
    setCurrentPage(1);

    try {
      const response = await userFavoritesApi.getFavorites({
        page: 1,
        limit: PAGE_SIZE,
      });

      if (response.success && response.data) {
        const convertedFavorites = response.data.map(convertApiToFavoriteItem);
        setFavorites(convertedFavorites);
        setTotalFavorites(response.pagination?.total || 0);
        setHasMore(response.pagination?.has_next || false);
      } else {
        setError(response.message || '加载收藏列表失败');
        setFavorites([]);
      }
    } catch (err) {
      console.error('Load favorites error:', err);
      setError('网络错误，请稍后重试');
      setFavorites([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 加载更多收藏
  const loadMoreFavorites = async () => {
    if (!isAuthenticated || !hasMore || isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextPage = currentPage + 1;
      const response = await userFavoritesApi.getFavorites({
        page: nextPage,
        limit: PAGE_SIZE,
      });

      if (response.success && response.data) {
        const convertedFavorites = response.data.map(convertApiToFavoriteItem);
        setFavorites(prev => [...prev, ...convertedFavorites]);
        setCurrentPage(nextPage);
        setHasMore(response.pagination?.has_next || false);
      } else {
        setError(response.message || '加载更多收藏失败');
      }
    } catch (err) {
      console.error('Load more favorites error:', err);
      setError('网络错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 添加到收藏 - 乐观更新优化
  const addToFavorites = async (articleData: {
    articleId: string;
    articleTitle: string;
    articleSlug: string;
    articleChannel: string;
    articleExcerpt?: string;
    articleImageUrl?: string;
    articlePublishTime?: string;
  }): Promise<boolean> => {
    if (!isAuthenticated) {
      setError('请先登录');
      return false;
    }

    // 检查是否已收藏
    if (isFavorited(articleData.articleId)) {
      setError('已经收藏过这篇文章');
      return false;
    }

    // 乐观更新：立即添加到UI
    const optimisticFavorite: UserFavoriteItem = {
      id: `temp_${Date.now()}`,
      articleId: articleData.articleId,
      articleTitle: articleData.articleTitle,
      articleSlug: articleData.articleSlug,
      articleChannel: articleData.articleChannel,
      articleExcerpt: articleData.articleExcerpt || '',
      articleImageUrl: articleData.articleImageUrl || '',
      articlePublishTime: articleData.articlePublishTime || new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    setFavorites(prev => [optimisticFavorite, ...prev]);
    setTotalFavorites(prev => prev + 1);

    try {
      const response = await userFavoritesApi.addFavorite({
        article_id: articleData.articleId,
        article_title: articleData.articleTitle,
        article_slug: articleData.articleSlug,
        article_channel: articleData.articleChannel,
        article_excerpt: articleData.articleExcerpt,
        article_image_url: articleData.articleImageUrl,
        article_publish_time: articleData.articlePublishTime,
      });

      if (response.success && response.data) {
        // 替换临时项为真实数据
        const newFavorite = convertApiToFavoriteItem(response.data);
        setFavorites(prev => [newFavorite, ...prev.slice(1)]);
        return true;
      } else {
        // 回滚乐观更新
        setFavorites(prev => prev.filter(item => item.id !== optimisticFavorite.id));
        setTotalFavorites(prev => prev - 1);
        setError(response.message || '收藏失败');
        return false;
      }
    } catch (err) {
      console.error('Add to favorites error:', err);
      // 回滚乐观更新
      setFavorites(prev => prev.filter(item => item.id !== optimisticFavorite.id));
      setTotalFavorites(prev => prev - 1);
      setError('网络错误，请稍后重试');
      return false;
    }
  };

  // 从收藏中移除
  const removeFromFavorites = async (articleId: string): Promise<boolean> => {
    if (!isAuthenticated) {
      setError('请先登录');
      return false;
    }

    try {
      const response = await userFavoritesApi.removeFavorite(articleId);

      if (response.success) {
        setFavorites(prev => prev.filter(item => item.articleId !== articleId));
        setTotalFavorites(prev => prev - 1);
        return true;
      } else {
        setError(response.message || '取消收藏失败');
        return false;
      }
    } catch (err) {
      console.error('Remove from favorites error:', err);
      setError('网络错误，请稍后重试');
      return false;
    }
  };

  // 检查是否已收藏
  const isFavorited = (articleId: string): boolean => {
    return favorites.some(item => item.articleId === articleId);
  };

  // 清空收藏 - 优化批量删除
  const clearFavorites = async (): Promise<boolean> => {
    if (!isAuthenticated) {
      setError('请先登录');
      return false;
    }

    // 如果没有收藏项，直接返回成功
    if (favorites.length === 0) {
      return true;
    }

    try {
      // 乐观更新UI - 立即清空界面
      const backupFavorites = [...favorites];
      const backupTotal = totalFavorites;
      
      setFavorites([]);
      setTotalFavorites(0);
      setHasMore(false);
      
      // 批量删除所有收藏 - 限制并发数避免压垮服务器
      const BATCH_SIZE = 5;
      let allSuccessful = true;
      
      for (let i = 0; i < backupFavorites.length; i += BATCH_SIZE) {
        const batch = backupFavorites.slice(i, i + BATCH_SIZE);
        const deletePromises = batch.map(item => userFavoritesApi.removeFavorite(item.articleId));
        const results = await Promise.allSettled(deletePromises);
        
        const batchSuccessful = results.every(result => 
          result.status === 'fulfilled' && result.value.success
        );
        
        if (!batchSuccessful) {
          allSuccessful = false;
          break;
        }
      }

      if (allSuccessful) {
        return true;
      } else {
        // 回滚UI状态并重新加载
        setError('部分收藏删除失败，正在重新加载...');
        await loadFavorites();
        return false;
      }
    } catch (err) {
      console.error('Clear favorites error:', err);
      setError('网络错误，正在重新加载...');
      await loadFavorites();
      return false;
    }
  };

  // 刷新收藏列表
  const refreshFavorites = async () => {
    await loadFavorites();
  };

  // 组件挂载时自动加载收藏 - 防抖优化
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (isAuthenticated) {
      // 防抖：避免频繁的认证状态变化导致多次API调用
      timeoutId = setTimeout(() => {
        loadFavorites();
      }, 100);
    } else {
      setFavorites([]);
      setTotalFavorites(0);
      setHasMore(false);
      setError(null);
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isAuthenticated]);

  return {
    favorites,
    isLoading,
    error,
    totalFavorites,
    hasMore,
    loadFavorites,
    loadMoreFavorites,
    addToFavorites,
    removeFromFavorites,
    isFavorited,
    clearFavorites,
    refreshFavorites,
  };
}
