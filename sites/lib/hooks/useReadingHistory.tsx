"use client";

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/context/AuthContext';

// 格式化阅读时长显示
function formatReadingDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}秒`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}分${remainingSeconds}秒` : `${minutes}分钟`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const remainingMinutes = Math.floor((seconds % 3600) / 60);
    return remainingMinutes > 0 ? `${hours}小时${remainingMinutes}分钟` : `${hours}小时`;
  }
}
import { readingHistoryApi, ReadingHistoryData } from '@/lib/api/webUsersApi';

// 统一的阅读历史接口
export interface ReadingHistoryItem {
  id: string;
  articleId: string;
  articleTitle: string;
  articleSlug: string;
  articleChannel: string;
  readTime: string;
  readDuration: number; // 秒
  readProgress: number; // 百分比
  
  // 兼容性属性 - 用于显示
  title: string;
  slug: string;
  excerpt: string;
  image_url: string;
  author: string;
  channel: {
    name: string;
    slug: string;
  } | null;
}

// 将API数据转换为前端格式
const convertApiToHistoryItem = (apiData: ReadingHistoryData): ReadingHistoryItem => ({
  id: apiData.id,
  articleId: apiData.article_id,
  articleTitle: apiData.article_title,
  articleSlug: apiData.article_slug,
  articleChannel: apiData.article_channel,
  readTime: apiData.read_time,
  readDuration: apiData.read_duration,
  readProgress: apiData.read_progress,
  
  // 兼容性映射
  title: apiData.article_title,
  slug: apiData.article_slug,
  excerpt: `已阅读 ${Math.round(apiData.read_progress)}% - ${formatReadingDuration(apiData.read_duration)}`,
  image_url: 'https://picsum.photos/400/240?random=' + apiData.id, // 默认图片
  author: '作者',
  channel: apiData.article_channel ? {
    name: apiData.article_channel,
    slug: apiData.article_channel.toLowerCase().replace(/\s+/g, '-')
  } : null,
});

// 阅读统计信息
interface ReadingStats {
  totalArticles: number;
  totalReadTime: number; // 总阅读时间（分钟）
  averageReadTime: number; // 平均阅读时间（分钟）
  avgReadTime: number; // 兼容性别名
  todayReads: number;
  thisWeekReads: number;
  thisMonthReads: number;
  recentCount: number; // 兼容性属性
  mostReadChannel: string;
  favoriteChannel: string; // 兼容性别名
  longestSession: number; // 最长阅读时间（分钟）
}

// Hook接口
interface UseReadingHistoryReturn {
  history: ReadingHistoryItem[];
  isLoading: boolean;
  error: string | null;
  totalItems: number;
  hasMore: boolean;
  loadHistory: () => Promise<void>;
  loadMoreHistory: () => Promise<void>;
  addToHistory: (articleData: {
    articleId: string;
    articleTitle: string;
    articleSlug: string;
    articleChannel: string;
    readDuration?: number;
    readProgress?: number;
  }) => Promise<boolean>;
  deleteFromHistory: (historyId: string) => Promise<boolean>;
  removeFromHistory: (historyId: string) => Promise<boolean>;
  removeMultipleFromHistory: (historyIds: string[]) => Promise<boolean>;
  clearHistory: () => Promise<boolean>;
  getHistoryByDate: () => { [date: string]: ReadingHistoryItem[] };
  getReadingStats: () => ReadingStats;
  refreshHistory: () => Promise<void>;
}

export function useReadingHistory(): UseReadingHistoryReturn {
  const { user, isAuthenticated } = useAuth();
  const [history, setHistory] = useState<ReadingHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const PAGE_SIZE = 20;

  // 加载阅读历史
  const loadHistory = async () => {
    if (!isAuthenticated) {
      setHistory([]);
      setError('请先登录');
      return;
    }

    setIsLoading(true);
    setError(null);
    setCurrentPage(1);

    try {
      const response = await readingHistoryApi.getHistory({
        page: 1,
        limit: PAGE_SIZE,
      });

      if (response.success && response.data) {
        const convertedHistory = response.data.map(convertApiToHistoryItem);
        setHistory(convertedHistory);
        setTotalItems(response.pagination?.total || 0);
        setHasMore(response.pagination?.has_next || false);
      } else {
        setError(response.message || '加载阅读历史失败');
        setHistory([]);
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 加载更多历史记录
  const loadMoreHistory = async () => {
    if (!isAuthenticated || !hasMore || isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextPage = currentPage + 1;
      const response = await readingHistoryApi.getHistory({
        page: nextPage,
        limit: PAGE_SIZE,
      });

      if (response.success && response.data) {
        const convertedHistory = response.data.map(convertApiToHistoryItem);
        setHistory(prev => [...prev, ...convertedHistory]);
        setCurrentPage(nextPage);
        setHasMore(response.pagination?.has_next || false);
      } else {
        setError(response.message || '加载更多历史记录失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 添加到阅读历史
  const addToHistory = async (articleData: {
    articleId: string;
    articleTitle: string;
    articleSlug: string;
    articleChannel: string;
    readDuration?: number;
    readProgress?: number;
  }): Promise<boolean> => {
    if (!isAuthenticated) {
      return false;
    }

    try {
      const apiData = {
        article_id: articleData.articleId,
        article_title: articleData.articleTitle,
        article_slug: articleData.articleSlug,
        article_channel: articleData.articleChannel,
        read_duration: articleData.readDuration || 0,
        read_progress: articleData.readProgress || 0,
      };

      const response = await readingHistoryApi.addHistory(apiData);

      if (response.success && response.data) {
        const newHistoryItem = convertApiToHistoryItem(response.data);
        
        // 添加新记录到顶部（方案B：每次都创建新记录）
        setHistory(prev => [newHistoryItem, ...prev.slice(0, PAGE_SIZE - 1)]);
        
        return true;
      } else {
        return false;
      }
    } catch (err) {
      return false;
    }
  };

  // 从阅读历史中删除
  const deleteFromHistory = async (historyId: string): Promise<boolean> => {
    if (!isAuthenticated) {
      setError('请先登录');
      return false;
    }

    try {
      const response = await readingHistoryApi.deleteHistory(historyId);

      if (response.success) {
        setHistory(prev => prev.filter(item => item.id !== historyId));
        setTotalItems(prev => prev - 1);
        return true;
      } else {
        setError(response.message || '删除失败');
        return false;
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      return false;
    }
  };

  // 清空阅读历史 - 优化批量删除
  const clearHistory = async (): Promise<boolean> => {
    if (!isAuthenticated) {
      setError('请先登录');
      return false;
    }

    // 如果没有历史记录，直接返回成功
    if (history.length === 0) {
      return true;
    }

    try {
      // 乐观更新UI - 立即清空界面
      const backupHistory = [...history];
      const backupTotal = totalItems;
      
      setHistory([]);
      setTotalItems(0);
      setHasMore(false);
      
      // 批量删除所有历史记录 - 限制并发数避免压垮服务器
      const BATCH_SIZE = 5;
      let allSuccessful = true;
      
      for (let i = 0; i < backupHistory.length; i += BATCH_SIZE) {
        const batch = backupHistory.slice(i, i + BATCH_SIZE);
        const deletePromises = batch.map(item => readingHistoryApi.deleteHistory(item.id));
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
        setError('部分记录删除失败，正在重新加载...');
        await loadHistory();
        return false;
      }
    } catch (err) {
      setError('网络错误，正在重新加载...');
      await loadHistory();
      return false;
    }
  };

  // removeFromHistory 的别名，保持向后兼容
  const removeFromHistory = deleteFromHistory;

  // 批量删除历史记录
  const removeMultipleFromHistory = async (historyIds: string[]): Promise<boolean> => {
    if (!isAuthenticated) {
      setError('请先登录');
      return false;
    }

    try {
      const deletePromises = historyIds.map(id => readingHistoryApi.deleteHistory(id));
      const results = await Promise.allSettled(deletePromises);
      
      const successCount = results.filter(result => 
        result.status === 'fulfilled' && result.value.success
      ).length;

      if (successCount === historyIds.length) {
        // 全部删除成功
        setHistory(prev => prev.filter(item => !historyIds.includes(item.id)));
        setTotalItems(prev => prev - successCount);
        return true;
      } else {
        // 部分删除失败
        setError(`${successCount}/${historyIds.length} 条记录删除成功`);
        // 重新加载以获取最新状态
        await loadHistory();
        return false;
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      return false;
    }
  };

  // 按日期分组历史记录 - 使用useMemo缓存结果
  const getHistoryByDate = useMemo((): { [date: string]: ReadingHistoryItem[] } => {
    const grouped: { [date: string]: ReadingHistoryItem[] } = {};
    
    history.forEach(item => {
      const date = new Date(item.readTime).toDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(item);
    });

    // 按日期排序，最新的在前
    const sortedDates = Object.keys(grouped).sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );

    const sortedGrouped: { [date: string]: ReadingHistoryItem[] } = {};
    sortedDates.forEach(date => {
      sortedGrouped[date] = grouped[date].sort((a, b) => 
        new Date(b.readTime).getTime() - new Date(a.readTime).getTime()
      );
    });

    return sortedGrouped;
  }, [history]);

  // 获取阅读统计信息 - 使用useMemo缓存结果  
  const getReadingStats = useMemo((): ReadingStats => {
    if (history.length === 0) {
      return {
        totalArticles: 0,
        totalReadTime: 0,
        averageReadTime: 0,
        avgReadTime: 0, // 兼容性别名
        todayReads: 0,
        thisWeekReads: 0,
        thisMonthReads: 0,
        recentCount: 0, // 兼容性属性
        mostReadChannel: '暂无',
        favoriteChannel: '暂无', // 兼容性别名
        longestSession: 0,
      };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    // 今天的阅读记录
    const todayReads = history.filter(item => 
      new Date(item.readTime) >= today
    );
    
    // 本周的阅读记录
    const thisWeekReads = history.filter(item => 
      new Date(item.readTime) >= oneWeekAgo
    );
    
    // 本月的阅读记录
    const thisMonthReads = history.filter(item => 
      new Date(item.readTime) >= oneMonthAgo
    );

    // 总阅读时间（分钟）
    const totalReadTime = Math.round(
      history.reduce((total, item) => total + item.readDuration, 0) / 60
    );

    // 平均阅读时间（分钟）
    const averageReadTime = Math.round(totalReadTime / history.length);

    // 最长阅读时间（分钟）
    const longestSession = Math.round(Math.max(...history.map(item => item.readDuration)) / 60);

    // 最常阅读的频道
    const channelCounts: { [channel: string]: number } = {};
    history.forEach(item => {
      channelCounts[item.articleChannel] = (channelCounts[item.articleChannel] || 0) + 1;
    });
    
    const mostReadChannel = Object.keys(channelCounts).reduce((a, b) => 
      channelCounts[a] > channelCounts[b] ? a : b, ''
    ) || '暂无';

    return {
      totalArticles: history.length,
      totalReadTime,
      averageReadTime,
      avgReadTime: averageReadTime, // 兼容性别名
      todayReads: todayReads.length,
      thisWeekReads: thisWeekReads.length,
      thisMonthReads: thisMonthReads.length,
      recentCount: thisWeekReads.length, // 兼容性属性 - 使用本周数据
      mostReadChannel,
      favoriteChannel: mostReadChannel, // 兼容性别名
      longestSession,
    };
  }, [history]);

  // 刷新阅读历史
  const refreshHistory = async () => {
    await loadHistory();
  };

  // 组件挂载时自动加载历史记录 - 防抖优化
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (isAuthenticated) {
      // 防抖：避免频繁的认证状态变化导致多次API调用
      timeoutId = setTimeout(() => {
        loadHistory();
      }, 100);
    } else {
      setHistory([]);
      setTotalItems(0);
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
    history,
    isLoading,
    error,
    totalItems,
    hasMore,
    loadHistory,
    loadMoreHistory,
    addToHistory,
    deleteFromHistory,
    removeFromHistory,
    removeMultipleFromHistory,
    clearHistory,
    getHistoryByDate: () => getHistoryByDate,
    getReadingStats: () => getReadingStats,
    refreshHistory,
  };
}