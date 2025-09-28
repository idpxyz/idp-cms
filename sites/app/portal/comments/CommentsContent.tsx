"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/context/AuthContext';
import { useUserComments } from '@/lib/hooks/useUserComments';
import { useRouter } from 'next/navigation';
import { formatDateTime, formatTimeAgo } from '@/lib/utils/date';

export default function CommentsContent() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    comments,
    isLoading: commentsLoading,
    deleteUserComment,
    deleteMultipleComments,
    toggleCommentLike,
    getCommentsByStatus,
    getCommentStats,
  } = useUserComments();
  const router = useRouter();
  
  const [selectedComments, setSelectedComments] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'pending' | 'rejected'>('all');
  const [showStats, setShowStats] = useState(false);

  // 检查认证状态
  React.useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/portal');
    }
  }, [authLoading, isAuthenticated, router]);

  // 处理删除单个评论
  const handleDeleteComment = async (commentId: string) => {
    if (window.confirm('确定要删除这条评论吗？此操作不可撤销。')) {
      setIsDeleting(true);
      deleteUserComment(commentId);
      setSelectedComments(prev => {
        const newSet = new Set(prev);
        newSet.delete(commentId);
        return newSet;
      });
      setIsDeleting(false);
    }
  };

  // 处理批量删除
  const handleBatchDelete = async () => {
    if (selectedComments.size === 0) return;
    
    if (window.confirm(`确定要删除选中的 ${selectedComments.size} 条评论吗？此操作不可撤销。`)) {
      setIsDeleting(true);
      deleteMultipleComments(Array.from(selectedComments));
      setSelectedComments(new Set());
      setIsDeleting(false);
    }
  };

  // 处理全选
  const handleSelectAll = () => {
    const filteredComments = getFilteredComments();
    if (selectedComments.size === filteredComments.length) {
      setSelectedComments(new Set());
    } else {
      setSelectedComments(new Set(filteredComments.map(comment => comment.id)));
    }
  };

  // 处理单个选择
  const handleSelectComment = (commentId: string) => {
    setSelectedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  // 获取过滤后的评论
  const getFilteredComments = () => {
    if (filterStatus === 'all') return comments;
    const groupedComments = getCommentsByStatus();
    return groupedComments[filterStatus] || [];
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'published': return '已发布';
      case 'pending': return '审核中';
      case 'rejected': return '已拒绝';
      default: return '未知';
    }
  };

  if (authLoading || commentsLoading) {
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
          <p className="text-gray-600">请先登录以查看您的评论</p>
        </div>
      </div>
    );
  }

  const filteredComments = getFilteredComments();
  const stats = getCommentStats();
  const statusCounts = getCommentsByStatus();

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">我的评论</h1>
            <p className="text-gray-600">管理您发布的所有评论 ({stats.total} 条)</p>
          </div>
          
          <button
            onClick={() => setShowStats(!showStats)}
            className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            {showStats ? '隐藏统计' : '显示统计'}
          </button>
        </div>

        {/* 评论统计 */}
        {showStats && (
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 p-4 bg-gray-50 rounded-lg mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">总评论</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.published}</div>
              <div className="text-sm text-gray-600">已发布</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-gray-600">审核中</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
              <div className="text-sm text-gray-600">已拒绝</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.thisMonth}</div>
              <div className="text-sm text-gray-600">本月评论</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.thisWeek}</div>
              <div className="text-sm text-gray-600">本周评论</div>
            </div>
          </div>
        )}

        {/* 过滤器和操作 */}
        <div className="flex items-center justify-between">
          {/* 状态过滤器 */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">筛选:</span>
            <div className="flex space-x-1">
              {[
                { key: 'all', label: '全部', count: stats.total },
                { key: 'published', label: '已发布', count: statusCounts.published.length },
                { key: 'pending', label: '审核中', count: statusCounts.pending.length },
                { key: 'rejected', label: '已拒绝', count: statusCounts.rejected.length },
              ].map(filter => (
                <button
                  key={filter.key}
                  onClick={() => setFilterStatus(filter.key as any)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    filterStatus === filter.key
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filter.label} ({filter.count})
                </button>
              ))}
            </div>
          </div>

          {/* 操作按钮 */}
          {filteredComments.length > 0 && (
            <div className="flex items-center space-x-3">
              <button
                onClick={handleSelectAll}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                {selectedComments.size === filteredComments.length ? '取消全选' : '全选'}
              </button>
              
              {selectedComments.size > 0 && (
                <button
                  onClick={handleBatchDelete}
                  disabled={isDeleting}
                  className="flex items-center space-x-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isDeleting && (
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <span>删除选中 ({selectedComments.size})</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 评论列表 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {filteredComments.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 text-gray-300">
              <svg fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l3 3 3-3h6c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filterStatus === 'all' ? '还没有评论' : `没有${getStatusText(filterStatus)}的评论`}
            </h3>
            <p className="text-gray-600 mb-4">参与文章讨论，发表您的看法</p>
            <Link
              href="/portal"
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              去发表评论
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredComments.map((comment) => (
              <div key={comment.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start space-x-4">
                  {/* 选择框 */}
                  <div className="flex-shrink-0 pt-1">
                    <input
                      type="checkbox"
                      checked={selectedComments.has(comment.id)}
                      onChange={() => handleSelectComment(comment.id)}
                      className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                  </div>

                  {/* 评论内容 */}
                  <div className="flex-1 min-w-0">
                    {/* 文章信息 */}
                    <div className="flex items-center justify-between mb-3">
                      <Link
                        href={`/portal/article/${comment.articleSlug}`}
                        className="flex items-center space-x-2 text-sm text-gray-600 hover:text-red-600 transition-colors"
                      >
                        <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
                        <span className="font-medium">{comment.articleChannel}</span>
                        <span>•</span>
                        <span className="line-clamp-1">{comment.articleTitle}</span>
                      </Link>
                      
                      {/* 状态标签 */}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(comment.status)}`}>
                        {getStatusText(comment.status)}
                      </span>
                    </div>

                    {/* 评论内容 */}
                    <div className="mb-3">
                      {/* 回复的评论（如果是回复） */}
                      {comment.parentId && comment.parentContent && (
                        <div className="mb-2 p-3 bg-gray-50 rounded-lg border-l-4 border-gray-300">
                          <div className="text-xs text-gray-500 mb-1">回复 @{comment.parentAuthor}:</div>
                          <div className="text-sm text-gray-600 line-clamp-2">{comment.parentContent}</div>
                        </div>
                      )}
                      
                      {/* 我的评论内容 */}
                      <div className="text-gray-900">
                        {comment.content}
                      </div>
                    </div>

                    {/* 评论元信息 */}
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center space-x-4">
                        <span>{formatTimeAgo(comment.createdAt)}</span>
                        {comment.updatedAt && (
                          <span className="text-xs">(已编辑)</span>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        {/* 点赞按钮 */}
                        <button
                          onClick={() => toggleCommentLike(comment.id)}
                          className={`flex items-center space-x-1 transition-colors ${
                            comment.isLiked
                              ? 'text-red-600 hover:text-red-700'
                              : 'text-gray-400 hover:text-gray-600'
                          }`}
                        >
                          <svg className="w-4 h-4" fill={comment.isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          <span>{comment.likes}</span>
                        </button>

                        {/* 回复数 */}
                        {comment.replies > 0 && (
                          <span className="flex items-center space-x-1 text-gray-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span>{comment.replies}</span>
                          </span>
                        )}

                        {/* 删除按钮 */}
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          disabled={isDeleting}
                          className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                          title="删除评论"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* 提示信息 */}
      {comments.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <div className="text-sm text-blue-700">
                <p className="font-medium">评论说明</p>
                <ul className="mt-2 space-y-1 text-xs">
                  <li>• 评论发布后需要审核，通过后会显示为"已发布"状态</li>
                  <li>• 您可以随时删除自己的评论，但无法撤销删除操作</li>
                  <li>• 违反社区规范的评论可能被拒绝或删除</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
