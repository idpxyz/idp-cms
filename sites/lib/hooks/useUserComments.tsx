"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { userCommentsApi, UserCommentData } from '@/lib/api/webUsersApi';

// 统一的用户评论接口
export interface UserComment {
  id: string;
  content: string;
  articleId: string;
  articleTitle: string;
  articleSlug: string;
  articleChannel: string;
  parentId?: string;
  parentContent?: string;
  parentAuthor?: string;
  createdAt: string;
  updatedAt?: string;
  likes: number;
  isLiked: boolean;
  replies: number;
  status: 'published' | 'pending' | 'rejected';
}

// 将API数据转换为前端格式
const convertApiToUserComment = (apiData: UserCommentData): UserComment => ({
  id: apiData.id,
  content: apiData.content,
  articleId: apiData.article_id,
  articleTitle: apiData.article_title,
  articleSlug: apiData.article_slug,
  articleChannel: apiData.article_channel,
  parentId: apiData.parent,
  parentContent: apiData.parent_content,
  parentAuthor: apiData.parent_author,
  createdAt: apiData.created_at,
  updatedAt: apiData.updated_at,
  likes: apiData.likes,
  isLiked: false, // 需要通过单独的API检查
  replies: 0, // 需要通过单独的API获取
  status: apiData.status,
});

// 评论统计信息
interface CommentStats {
  total: number;
  published: number;
  pending: number;
  rejected: number;
  thisMonth: number;
  thisWeek: number;
}

// Hook接口
interface UseUserCommentsReturn {
  comments: UserComment[];
  isLoading: boolean;
  error: string | null;
  totalComments: number;
  hasMore: boolean;
  loadComments: (status?: 'all' | 'published' | 'pending' | 'rejected') => Promise<void>;
  loadMoreComments: () => Promise<void>;
  addUserComment: (commentData: {
    content: string;
    articleId: string;
    articleTitle: string;
    articleSlug: string;
    articleChannel: string;
    parentId?: string;
    parentContent?: string;
    parentAuthor?: string;
  }) => Promise<boolean>;
  deleteUserComment: (commentId: string) => Promise<boolean>;
  deleteMultipleComments: (commentIds: string[]) => Promise<boolean>;
  toggleCommentLike: (commentId: string) => Promise<boolean>;
  getCommentsByStatus: () => { [key: string]: UserComment[] };
  getCommentStats: () => CommentStats;
  refreshComments: () => Promise<void>;
}

export function useUserComments(): UseUserCommentsReturn {
  const { user, isAuthenticated } = useAuth();
  const [comments, setComments] = useState<UserComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalComments, setTotalComments] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<'all' | 'published' | 'pending' | 'rejected'>('all');

  const PAGE_SIZE = 20;

  // 加载评论
  const loadComments = async (status: 'all' | 'published' | 'pending' | 'rejected' = 'all') => {
    if (!isAuthenticated) {
      setComments([]);
      setError('请先登录');
      return;
    }

    setIsLoading(true);
    setError(null);
    setCurrentStatus(status);
    setCurrentPage(1);

    try {
      const response = await userCommentsApi.getComments({
        status,
        page: 1,
        limit: PAGE_SIZE,
      });

      if (response.success && response.data) {
        const convertedComments = response.data.map(convertApiToUserComment);
        setComments(convertedComments);
        setTotalComments(response.pagination?.total || 0);
        setHasMore(response.pagination?.has_next || false);
      } else {
        setError(response.message || '加载评论失败');
        setComments([]);
      }
    } catch (err) {
      console.error('Load comments error:', err);
      setError('网络错误，请稍后重试');
      setComments([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 加载更多评论
  const loadMoreComments = async () => {
    if (!isAuthenticated || !hasMore || isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextPage = currentPage + 1;
      const response = await userCommentsApi.getComments({
        status: currentStatus,
        page: nextPage,
        limit: PAGE_SIZE,
      });

      if (response.success && response.data) {
        const convertedComments = response.data.map(convertApiToUserComment);
        setComments(prev => [...prev, ...convertedComments]);
        setCurrentPage(nextPage);
        setHasMore(response.pagination?.has_next || false);
      } else {
        setError(response.message || '加载更多评论失败');
      }
    } catch (err) {
      console.error('Load more comments error:', err);
      setError('网络错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 添加用户评论
  const addUserComment = async (commentData: {
    content: string;
    articleId: string;
    articleTitle: string;
    articleSlug: string;
    articleChannel: string;
    parentId?: string;
    parentContent?: string;
    parentAuthor?: string;
  }): Promise<boolean> => {
    if (!isAuthenticated) {
      setError('请先登录');
      return false;
    }

    try {
      const response = await userCommentsApi.addComment({
        content: commentData.content,
        article_id: commentData.articleId,
        article_title: commentData.articleTitle,
        article_slug: commentData.articleSlug,
        article_channel: commentData.articleChannel,
        parent: commentData.parentId,
        parent_content: commentData.parentContent,
        parent_author: commentData.parentAuthor,
      });

      if (response.success && response.data) {
        const newComment = convertApiToUserComment(response.data);
        
        // 如果当前状态包含新评论的状态，添加到列表顶部
        if (currentStatus === 'all' || currentStatus === newComment.status) {
          setComments(prev => [newComment, ...prev]);
          setTotalComments(prev => prev + 1);
        }
        
        return true;
      } else {
        setError(response.message || '发表评论失败');
        return false;
      }
    } catch (err) {
      console.error('Add comment error:', err);
      setError('网络错误，请稍后重试');
      return false;
    }
  };

  // 删除用户评论
  const deleteUserComment = async (commentId: string): Promise<boolean> => {
    if (!isAuthenticated) {
      setError('请先登录');
      return false;
    }

    try {
      const response = await userCommentsApi.deleteComment(commentId);

      if (response.success) {
        setComments(prev => prev.filter(comment => comment.id !== commentId));
        setTotalComments(prev => prev - 1);
        return true;
      } else {
        setError(response.message || '删除评论失败');
        return false;
      }
    } catch (err) {
      console.error('Delete comment error:', err);
      setError('网络错误，请稍后重试');
      return false;
    }
  };

  // 批量删除评论
  const deleteMultipleComments = async (commentIds: string[]): Promise<boolean> => {
    if (!isAuthenticated) {
      setError('请先登录');
      return false;
    }

    try {
      const deletePromises = commentIds.map(id => userCommentsApi.deleteComment(id));
      const results = await Promise.allSettled(deletePromises);
      
      const successCount = results.filter(result => 
        result.status === 'fulfilled' && result.value.success
      ).length;

      if (successCount === commentIds.length) {
        // 全部删除成功
        setComments(prev => prev.filter(comment => !commentIds.includes(comment.id)));
        setTotalComments(prev => prev - successCount);
        return true;
      } else {
        // 部分删除失败
        setError(`${successCount}/${commentIds.length} 条评论删除成功`);
        // 重新加载以获取最新状态
        await loadComments(currentStatus);
        return false;
      }
    } catch (err) {
      console.error('Batch delete comments error:', err);
      setError('网络错误，请稍后重试');
      return false;
    }
  };

  // 切换评论点赞状态 (模拟实现，实际需要后端支持)
  const toggleCommentLike = async (commentId: string): Promise<boolean> => {
    if (!isAuthenticated) {
      setError('请先登录');
      return false;
    }

    try {
      // 这里应该调用真实的点赞API
      // 暂时进行乐观更新
      setComments(prev => prev.map(comment => 
        comment.id === commentId 
          ? { 
              ...comment, 
              isLiked: !comment.isLiked,
              likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1
            }
          : comment
      ));
      return true;
    } catch (err) {
      console.error('Toggle comment like error:', err);
      setError('操作失败，请稍后重试');
      return false;
    }
  };

  // 按状态分组评论
  const getCommentsByStatus = () => {
    return {
      all: comments,
      published: comments.filter(comment => comment.status === 'published'),
      pending: comments.filter(comment => comment.status === 'pending'),
      rejected: comments.filter(comment => comment.status === 'rejected'),
    };
  };

  // 获取评论统计信息
  const getCommentStats = (): CommentStats => {
    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const thisMonthComments = comments.filter(comment => 
      new Date(comment.createdAt) >= oneMonthAgo
    );
    
    const thisWeekComments = comments.filter(comment => 
      new Date(comment.createdAt) >= oneWeekAgo
    );

    return {
      total: comments.length,
      published: comments.filter(comment => comment.status === 'published').length,
      pending: comments.filter(comment => comment.status === 'pending').length,
      rejected: comments.filter(comment => comment.status === 'rejected').length,
      thisMonth: thisMonthComments.length,
      thisWeek: thisWeekComments.length,
    };
  };

  // 刷新评论列表
  const refreshComments = async () => {
    await loadComments(currentStatus);
  };

  // 组件挂载时自动加载评论
  useEffect(() => {
    if (isAuthenticated) {
      loadComments();
    } else {
      setComments([]);
      setTotalComments(0);
      setHasMore(false);
      setError(null);
    }
  }, [isAuthenticated]);

  return {
    comments,
    isLoading,
    error,
    totalComments,
    hasMore,
    loadComments,
    loadMoreComments,
    addUserComment,
    deleteUserComment,
    deleteMultipleComments,
    toggleCommentLike,
    getCommentsByStatus,
    getCommentStats,
    refreshComments,
  };
}