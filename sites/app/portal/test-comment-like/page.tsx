"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { articleCommentsApi, convertApiCommentToLocal } from '@/lib/api/articleCommentsApi';

export default function TestCommentLikePage() {
  const { user, isAuthenticated } = useAuth();
  const [comments, setComments] = useState<any[]>([]);
  const [testResults, setTestResults] = useState<string[]>([]);

  const addLog = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    addLog(`认证状态: ${isAuthenticated ? '已登录' : '未登录'}`);
    if (user) {
      addLog(`用户信息: ${user.username} (${user.email})`);
    }
    loadComments();
  }, [isAuthenticated, user]);

  const loadComments = async () => {
    try {
      addLog('开始加载评论（带token）...');
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      addLog(`Token存在: ${!!token}`);

      const response = await articleCommentsApi.getComments('4163', { page: 1, limit: 50 });
      
      if (response.success && response.data) {
        // 转换API数据为组件格式
        const convertedComments = response.data.map(convertApiCommentToLocal);
        setComments(convertedComments);
        addLog(`成功加载 ${convertedComments.length} 条评论`);
        
      } else {
        addLog(`加载评论失败: ${response.message || '未知错误'}`);
      }
    } catch (error) {
      addLog(`加载评论异常: ${error}`);
    }
  };

  const testLike = async (commentId: string) => {
    if (!isAuthenticated) {
      addLog('❌ 未登录，无法点赞');
      return;
    }

    try {
      // 获取当前状态并传递期望状态
      const currentComment = comments.find(c => c.id.toString() === commentId);
      const currentIsLiked = !!currentComment?.isLiked;
      const desiredLike = !currentIsLiked;
      
      const response = await articleCommentsApi.toggleLike(commentId, { like: desiredLike });
      
      if (response.success) {
        const action = response.data?.action;
        const like_count = response.data?.like_count;
        const is_liked = response.data?.is_liked;
        
        // 更新本地状态 - 使用转换后的字段名
        setComments(prev => prev.map(comment => {
          if (comment.id.toString() === commentId) {
            return {
              ...comment,
              isLiked: is_liked,
              likeCount: like_count,
            };
          }
          return comment;
        }));
      } else {
        addLog(`❌ 点赞失败: ${response.message || '未知错误'}`);
      }
    } catch (error) {
      addLog(`💥 点赞异常: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold mb-6">评论点赞功能测试</h1>
        
        {/* 用户状态 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">用户状态</h2>
          <div className="space-y-2">
            <p><span className="font-medium">登录状态:</span> {isAuthenticated ? '✅ 已登录' : '❌ 未登录'}</p>
            {user && (
              <>
                <p><span className="font-medium">用户名:</span> {user.username}</p>
                <p><span className="font-medium">邮箱:</span> {user.email}</p>
                <p><span className="font-medium">昵称:</span> {user.nickname}</p>
              </>
            )}
          </div>
        </div>

        {/* 评论列表 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">评论列表</h2>
          {comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map(comment => (
                <div key={comment.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">评论ID: {comment.id}</span>
                    <span className="text-sm text-gray-500">
                      点赞数: {comment.likeCount || 0} | 
                      状态: {comment.isLiked ? '已点赞' : '未点赞'}
                    </span>
                  </div>
                  <p className="text-gray-700 mb-3">{comment.content}</p>
                  <button
                    onClick={() => testLike(comment.id.toString())}
                    disabled={!isAuthenticated}
                    className={`px-4 py-2 rounded text-sm ${
                      comment.isLiked 
                        ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {comment.isLiked ? '取消点赞' : '点赞'}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">暂无评论数据</p>
          )}
        </div>

        {/* 测试日志 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">测试日志</h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
            {testResults.map((result, index) => (
              <div key={index}>{result}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
