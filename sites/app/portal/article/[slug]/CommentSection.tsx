"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/lib/context/AuthContext';
import { formatDateTime } from '@/lib/utils/date';
// 移除useUserComments导入，文章评论系统独立运行
import { articleCommentsApi, convertApiCommentToLocal, ArticleComment } from '@/lib/api/articleCommentsApi';

interface Comment {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
    nickname: string;
    avatar?: string;
  };
  createTime: string;
  likeCount: number;
  isLiked: boolean;
  replies: Comment[];
  parentId?: string;
}

interface CommentSectionProps {
  articleId: string;
  commentCount: number;
  onCommentCountChange: (count: number) => void;
  // 文章信息，用于记录评论
  articleInfo?: {
    title: string;
    slug: string;
    channel: string;
  };
}

export default function CommentSection({ articleId, commentCount, onCommentCountChange, articleInfo }: CommentSectionProps) {
  const { user, isAuthenticated } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  
  // 文章评论系统独立运行，不需要用户评论管理

  // 加载评论
  useEffect(() => {
    loadComments();
  }, [articleId]);

  // 加载评论数据
  const loadComments = async () => {
    if (!articleId) return;
    
    setIsLoading(true);
    
    try {
      const response = await articleCommentsApi.getComments(articleId, {
        page: 1,
        limit: 50, // 一次加载更多评论
      });
      
      if (response.success && response.data) {
        // 转换API数据为组件所需格式
        const convertedComments = response.data.map(convertApiCommentToLocal);
        setComments(convertedComments);
        
        // 计算总评论数（包括回复）
        const totalCount = convertedComments.reduce((count, comment) => {
          return count + 1 + comment.replies.length;
        }, 0);
        
        onCommentCountChange(totalCount);
      } else {
        console.error('Failed to load comments:', response.message);
        // 加载失败时显示空评论列表
        setComments([]);
        onCommentCountChange(0);
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
      // 网络错误时显示空评论列表
      setComments([]);
      onCommentCountChange(0);
    } finally {
      setIsLoading(false);
    }
  };

  // 提交新评论
  const handleSubmitComment = async () => {
    if (!isAuthenticated || !user || !newComment.trim() || !articleInfo) return;

    setIsSubmitting(true);
    
    try {
      const response = await articleCommentsApi.addComment(articleId, {
        content: newComment.trim(),
        article_title: articleInfo.title,
        article_slug: articleInfo.slug,
        article_channel: articleInfo.channel,
      });
      
      if (response.success && response.data) {
        // 转换API数据为组件格式
        const newCommentData = convertApiCommentToLocal(response.data);
        
        // 添加到评论列表顶部
        setComments(prev => [newCommentData, ...prev]);
        
        // 评论已保存到数据库，用户可在"我的评论"页面查看
        
        setNewComment('');
        onCommentCountChange(commentCount + 1);
      } else {
        alert(response.message || '发表评论失败，请稍后重试');
      }
    } catch (error) {
      console.error('Failed to submit comment:', error);
      alert('发表评论失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 提交回复
  const handleSubmitReply = async (parentId: string) => {
    if (!isAuthenticated || !user || !replyContent.trim() || !articleInfo) return;

    setIsSubmitting(true);
    
    try {
      const response = await articleCommentsApi.addComment(articleId, {
        content: replyContent.trim(),
        article_title: articleInfo.title,
        article_slug: articleInfo.slug,
        article_channel: articleInfo.channel,
        parent_id: parentId,
      });
      
      if (response.success && response.data) {
        // 转换API数据为组件格式
        const newReplyData = convertApiCommentToLocal(response.data);
        
        // 找到父评论并添加回复
        setComments(prev => prev.map(comment => {
          if (comment.id === parentId) {
            return {
              ...comment,
              replies: [...comment.replies, newReplyData]
            };
          }
          return comment;
        }));
        
        // 找到父评论信息用于记录
        const parentComment = comments.find(c => c.id === parentId);
        
        // 回复已保存到数据库，用户可在"我的评论"页面查看
        
        setReplyContent('');
        setReplyingTo(null);
        onCommentCountChange(commentCount + 1);
      } else {
        alert(response.message || '发表回复失败，请稍后重试');
      }
    } catch (error) {
      console.error('Failed to submit reply:', error);
      alert('发表回复失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 点赞评论
  const handleLikeComment = async (commentId: string, isReply = false, parentId?: string) => {
    if (!isAuthenticated) {
      alert('请先登录');
      return;
    }

    try {
      const response = await articleCommentsApi.toggleLike(commentId);
      
      if (response.success) {
        // 获取响应数据
        const action = response.data?.action;
        const like_count = response.data?.like_count;
        
        if (action && like_count !== undefined) {
          const isLiked = action === 'liked';
          
          setComments(prev => prev.map(comment => {
            if (isReply && comment.id === parentId) {
              return {
                ...comment,
                replies: comment.replies.map(reply => {
                  if (reply.id === commentId) {
                    return {
                      ...reply,
                      isLiked: isLiked,
                      likeCount: like_count,
                    };
                  }
                  return reply;
                })
              };
            } else if (comment.id === commentId) {
              return {
                ...comment,
                isLiked: isLiked,
                likeCount: like_count,
              };
            }
            return comment;
          }));
        }
      } else {
        console.error('Failed to toggle like:', response.message || '点赞操作失败');
      }
    } catch (error) {
      console.error('Failed to like comment:', error);
    }
  };

  // 渲染单个评论
  const renderComment = (comment: Comment, isReply = false, parentCommentId?: string) => (
    <div key={comment.id} className={`${isReply ? 'ml-12 mt-4' : 'mb-6'}`}>
      <div className="flex space-x-3">
        {/* 头像 */}
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
            {comment.author.avatar ? (
              <Image
                src={comment.author.avatar}
                alt={comment.author.nickname}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* 评论内容 */}
        <div className="flex-1">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">{comment.author.nickname}</h4>
              <span className="text-sm text-gray-500">{formatDateTime(comment.createTime)}</span>
            </div>
            <p className="text-gray-700">{comment.content}</p>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center space-x-4 mt-2 text-sm">
            <button
              onClick={() => handleLikeComment(comment.id, isReply, parentCommentId)}
              className={`flex items-center space-x-1 transition-colors ${
                comment.isLiked ? 'text-red-600' : 'text-gray-500 hover:text-red-600'
              }`}
            >
              <svg className={`w-4 h-4 ${comment.isLiked ? 'fill-current' : ''}`} fill={comment.isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span>{comment.likeCount > 0 ? comment.likeCount : '点赞'}</span>
            </button>

            {!isReply && (
              <button
                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                className="text-gray-500 hover:text-blue-600 transition-colors"
              >
                回复
              </button>
            )}
          </div>

          {/* 回复框 */}
          {!isReply && replyingTo === comment.id && (
            <div className="mt-3">
              <div className="flex space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200">
                    {user?.avatar ? (
                      <Image
                        src={user.avatar}
                        alt={user.nickname || user.username}
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="写下你的回复..."
                    className="w-full p-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    rows={2}
                  />
                  <div className="flex items-center justify-end space-x-2 mt-2">
                    <button
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyContent('');
                      }}
                      className="px-3 py-1 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={() => handleSubmitReply(comment.id)}
                      disabled={!replyContent.trim() || isSubmitting}
                      className="px-4 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSubmitting ? '发送中...' : '回复'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 回复列表 */}
          {!isReply && comment.replies.length > 0 && (
            <div className="mt-4">
              {comment.replies.map(reply => renderComment(reply, true, comment.id))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* 评论头部 */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900">
          评论 ({commentCount})
        </h3>
      </div>

      {/* 发表评论 */}
      {isAuthenticated ? (
        <div className="mb-8">
          <div className="flex space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                {user?.avatar ? (
                  <Image
                    src={user.avatar}
                    alt={user.nickname || user.username}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="写下你的评论..."
                className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                rows={3}
              />
              <div className="flex items-center justify-end mt-3">
                <button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || isSubmitting}
                  className="flex items-center space-x-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <span>{isSubmitting ? '发表中...' : '发表评论'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-8 p-4 bg-gray-50 rounded-lg text-center">
          <p className="text-gray-600">
            <span>请先</span>
            <button className="text-red-600 hover:text-red-700 mx-1">登录</button>
            <span>后发表评论</span>
          </p>
        </div>
      )}

      {/* 评论列表 */}
      <div>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-600">加载评论中...</span>
            </div>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 text-gray-300">
              <svg fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 6h-2l-2-2H7L5 6H3a1 1 0 000 2h1v11a3 3 0 003 3h10a3 3 0 003-3V8h1a1 1 0 000-2zM7 8h2v8H7V8zm4 0h2v8h-2V8zm4 0h2v8h-2V8z"/>
              </svg>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">暂无评论</h4>
            <p className="text-gray-600">成为第一个评论的人吧！</p>
          </div>
        ) : (
          <div>
            {comments.map(comment => renderComment(comment))}
          </div>
        )}
      </div>
    </div>
  );
}
