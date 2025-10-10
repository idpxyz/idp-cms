"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { endpoints } from '@/lib/config/endpoints';

// 互动数据类型
export interface ArticleInteraction {
  articleId: string;
  isLiked: boolean;
  isFavorited: boolean;
  likeCount: number;
  favoriteCount: number;
  commentCount: number;
  statsLoaded?: boolean; // 🚀 性能优化：标记统计数据是否已加载
}

// 用户互动状态类型
interface UserInteractionState {
  likedArticles: Set<string>;
  favoritedArticles: Set<string>;
  articleStats: Map<string, ArticleInteraction>;
}

// 互动上下文类型
interface InteractionContextType extends UserInteractionState {
  toggleLike: (articleId: string) => Promise<{ success: boolean; error?: string }>;
  toggleFavorite: (articleId: string, articleInfo?: { title: string; slug: string; channel: string }) => Promise<{ success: boolean; error?: string }>;
  getArticleInteraction: (articleId: string) => ArticleInteraction;
  refreshArticleStats: (articleId: string) => Promise<void>;
  updateCommentCount: (articleId: string, commentCount: number) => void;
  isLoading: boolean;
}

// 创建互动上下文
const InteractionContext = createContext<InteractionContextType | undefined>(undefined);

// 互动服务 API
class InteractionService {
  private static baseUrl = '/api/interactions';

  // 切换点赞
  static async toggleLike(articleId: string): Promise<{ 
    success: boolean; 
    isLiked: boolean; 
    likeCount: number; 
    error?: string 
  }> {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (!token) {
        return { success: false, isLiked: false, likeCount: 0, error: '请先登录' };
      }

      const response = await fetch(`/api/backend/web-users/articles/${articleId}/like/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      
      if (data.success && data.data) {
        return {
          success: true,
          isLiked: data.data.is_liked,
          likeCount: data.data.like_count,
        };
      } else {
        return { 
          success: false, 
          isLiked: false, 
          likeCount: 0, 
          error: data.message || '点赞操作失败' 
        };
      }
    } catch (error) {
      console.error('Toggle like error:', error);
      return { success: false, isLiked: false, likeCount: 0, error: '操作失败，请稍后重试' };
    }
  }

  // 切换收藏
  static async toggleFavorite(articleId: string, articleInfo?: { title: string; slug: string; channel: string }): Promise<{ 
    success: boolean; 
    isFavorited: boolean; 
    favoriteCount: number; 
    error?: string 
  }> {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (!token) {
        return { success: false, isFavorited: false, favoriteCount: 0, error: '请先登录' };
      }

      const response = await fetch(`/api/backend/web-users/articles/${articleId}/favorite/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          article_title: articleInfo?.title || `文章${articleId}`,
          article_slug: articleInfo?.slug || `article-${articleId}`,
          article_channel: articleInfo?.channel || '未分类',
        }),
      });

      const data = await response.json();
      
      if (data.success && data.data) {
        return {
          success: true,
          isFavorited: data.data.is_favorited,
          favoriteCount: data.data.favorite_count,
        };
      } else {
        return { 
          success: false, 
          isFavorited: false, 
          favoriteCount: 0, 
          error: data.message || '收藏操作失败' 
        };
      }
    } catch (error) {
      console.error('Toggle favorite error:', error);
      return { success: false, isFavorited: false, favoriteCount: 0, error: '操作失败，请稍后重试' };
    }
  }

  // 获取文章统计信息
  static async getArticleStats(articleId: string): Promise<{
    success: boolean;
    data?: ArticleInteraction;
    error?: string;
  }> {
    try {
      // 获取认证头
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // 获取真实的文章统计（点赞、收藏、评论）
      const [articleStatsResponse, commentStatsResponse] = await Promise.all([
        fetch(`/api/backend/web-users/articles/${articleId}/stats/`, { headers }),
        fetch(`/api/backend/articles/${articleId}/comments/stats/`)
      ]);

      let likeCount = 0;
      let favoriteCount = 0;
      let isLiked = false;
      let isFavorited = false;
      let commentCount = 0;

      // 处理文章统计响应
      if (articleStatsResponse.ok) {
        const articleStats = await articleStatsResponse.json();
        if (articleStats.success && articleStats.data) {
          likeCount = articleStats.data.like_count;
          favoriteCount = articleStats.data.favorite_count;
          isLiked = articleStats.data.user_liked;
          isFavorited = articleStats.data.user_favorited;
        }
      } else {
        console.warn('Failed to fetch article stats, using fallback');
        // 使用本地存储的备用数据
        const storedStats = this.getStoredStats(articleId);
        likeCount = storedStats.likeCount;
        favoriteCount = storedStats.favoriteCount;
        
        const stored = localStorage.getItem('user_interactions');
        const interactions = stored ? JSON.parse(stored) : { likes: [], favorites: [] };
        isLiked = interactions.likes.includes(articleId);
        isFavorited = interactions.favorites.includes(articleId);
      }

      // 处理评论统计响应
      if (commentStatsResponse.ok) {
        const commentStats = await commentStatsResponse.json();
        console.log('Comment stats response:', commentStats);
        if (commentStats.success && commentStats.data) {
          commentCount = commentStats.data.total_comments;
          console.log('Comment count loaded:', commentCount);
        } else {
          console.warn('Comment stats response invalid:', commentStats);
        }
      } else {
        console.warn('Failed to fetch comment stats, status:', commentStatsResponse.status);
      }
      
      return {
        success: true,
        data: {
          articleId,
          isLiked,
          isFavorited,
          likeCount,
          favoriteCount,
          commentCount,
        },
      };
    } catch (error) {
      console.error('Get article stats error:', error);
      return { success: false, error: '获取数据失败' };
    }
  }

  // 获取存储的统计信息
  private static getStoredStats(articleId: string) {
    const stored = localStorage.getItem('article_stats');
    const stats = stored ? JSON.parse(stored) : {};
    
    return stats[articleId] || {
      likeCount: Math.floor(Math.random() * 100) + 10, // 随机初始值
      favoriteCount: Math.floor(Math.random() * 50) + 5,
      commentCount: Math.floor(Math.random() * 30) + 2,
    };
  }

  // 更新存储的统计信息
  private static updateStoredStats(articleId: string, updates: Partial<{ likeCount: number; favoriteCount: number; commentCount: number }>) {
    const stored = localStorage.getItem('article_stats');
    const stats = stored ? JSON.parse(stored) : {};
    
    stats[articleId] = { ...this.getStoredStats(articleId), ...updates };
    localStorage.setItem('article_stats', JSON.stringify(stats));
  }
}

// 互动提供者组件
export function InteractionProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [interactionState, setInteractionState] = useState<UserInteractionState>({
    likedArticles: new Set(),
    favoritedArticles: new Set(),
    articleStats: new Map(),
  });
  const [isLoading, setIsLoading] = useState(false);

  // 加载用户互动数据
  useEffect(() => {
    if (isAuthenticated && user) {
      loadUserInteractions();
    } else {
      // 未登录时清空状态
      setInteractionState({
        likedArticles: new Set(),
        favoritedArticles: new Set(),
        articleStats: new Map(),
      });
    }
  }, [isAuthenticated, user]);

  // 加载用户互动数据
  const loadUserInteractions = () => {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem('user_interactions');
      if (stored) {
        const interactions = JSON.parse(stored);
        setInteractionState(prev => ({
          ...prev,
          likedArticles: new Set(interactions.likes || []),
          favoritedArticles: new Set(interactions.favorites || []),
        }));
      }
    } catch (error) {
      console.error('Failed to load user interactions:', error);
    }
  };

  // 切换点赞
  const toggleLike = React.useCallback(async (articleId: string) => {
    if (!isAuthenticated) {
      return { success: false, error: '请先登录' };
    }

    setIsLoading(true);
    const result = await InteractionService.toggleLike(articleId);
    
    if (result.success) {
      setInteractionState(prev => {
        const newLikedArticles = new Set(prev.likedArticles);
        const newArticleStats = new Map(prev.articleStats);
        
        if (result.isLiked) {
          newLikedArticles.add(articleId);
        } else {
          newLikedArticles.delete(articleId);
        }
        
        const currentStats = newArticleStats.get(articleId) || {
          articleId,
          isLiked: false,
          isFavorited: prev.favoritedArticles.has(articleId),
          likeCount: 0,
          favoriteCount: 0,
          commentCount: 0,
        };
        
        newArticleStats.set(articleId, {
          ...currentStats,
          isLiked: result.isLiked,
          likeCount: result.likeCount,
        });
        
        return {
          ...prev,
          likedArticles: newLikedArticles,
          articleStats: newArticleStats,
        };
      });
    }
    
    setIsLoading(false);
    return result;
  }, [isAuthenticated]); // 只依赖isAuthenticated

  // 切换收藏
  const toggleFavorite = React.useCallback(async (articleId: string, articleInfo?: { title: string; slug: string; channel: string }) => {
    if (!isAuthenticated) {
      return { success: false, error: '请先登录' };
    }

    setIsLoading(true);
    const result = await InteractionService.toggleFavorite(articleId, articleInfo);
    
    if (result.success) {
      setInteractionState(prev => {
        const newFavoritedArticles = new Set(prev.favoritedArticles);
        const newArticleStats = new Map(prev.articleStats);
        
        if (result.isFavorited) {
          newFavoritedArticles.add(articleId);
        } else {
          newFavoritedArticles.delete(articleId);
        }
        
        const currentStats = newArticleStats.get(articleId) || {
          articleId,
          isLiked: prev.likedArticles.has(articleId),
          isFavorited: false,
          likeCount: 0,
          favoriteCount: 0,
          commentCount: 0,
        };
        
        newArticleStats.set(articleId, {
          ...currentStats,
          isFavorited: result.isFavorited,
          favoriteCount: result.favoriteCount,
        });
        
        return {
          ...prev,
          favoritedArticles: newFavoritedArticles,
          articleStats: newArticleStats,
        };
      });
    }
    
    setIsLoading(false);
    return result;
  }, [isAuthenticated]); // 只依赖isAuthenticated

  // 获取文章互动信息
  const getArticleInteraction = React.useCallback((articleId: string): ArticleInteraction => {
    const cached = interactionState.articleStats.get(articleId);
    if (cached) return cached;

    // 返回默认值
    return {
      articleId,
      isLiked: interactionState.likedArticles.has(articleId),
      isFavorited: interactionState.favoritedArticles.has(articleId),
      likeCount: 0,
      favoriteCount: 0,
      commentCount: 0,
    };
  }, [interactionState]); // 依赖interactionState

  // 刷新文章统计
  const refreshArticleStats = React.useCallback(async (articleId: string) => {
    const result = await InteractionService.getArticleStats(articleId);
    if (result.success && result.data) {
      setInteractionState(prev => {
        const newArticleStats = new Map(prev.articleStats);
        // 🚀 性能优化：标记统计数据已加载
        newArticleStats.set(articleId, {
          ...result.data!,
          statsLoaded: true,
        });
        return {
          ...prev,
          articleStats: newArticleStats,
        };
      });
    }
  }, []); // 空依赖数组，因为函数内部只依赖setInteractionState（稳定的）

  // 更新评论数量
  const updateCommentCount = React.useCallback((articleId: string, commentCount: number) => {
    setInteractionState(prev => {
      const newArticleStats = new Map(prev.articleStats);
      const currentStats = newArticleStats.get(articleId) || {
        articleId,
        isLiked: prev.likedArticles.has(articleId),
        isFavorited: prev.favoritedArticles.has(articleId),
        likeCount: 0,
        favoriteCount: 0,
        commentCount: 0,
      };

      newArticleStats.set(articleId, {
        ...currentStats,
        commentCount: commentCount,
      });

      return {
        ...prev,
        articleStats: newArticleStats,
      };
    });
  }, []); // 空依赖数组，因为函数内部只依赖setInteractionState（稳定的）

  const contextValue: InteractionContextType = {
    ...interactionState,
    toggleLike,
    toggleFavorite,
    getArticleInteraction,
    refreshArticleStats,
    updateCommentCount,
    isLoading,
  };

  return (
    <InteractionContext.Provider value={contextValue}>
      {children}
    </InteractionContext.Provider>
  );
}

// 使用互动上下文的 Hook
export function useInteraction() {
  const context = useContext(InteractionContext);
  if (context === undefined) {
    throw new Error('useInteraction must be used within an InteractionProvider');
  }
  return context;
}
