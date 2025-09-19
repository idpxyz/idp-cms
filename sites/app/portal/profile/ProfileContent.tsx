"use client";

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/lib/context/AuthContext';
import { useRouter } from 'next/navigation';

interface ProfileFormData {
  username: string;
  nickname: string;
  bio: string;
  email: string;
}

export default function ProfileContent() {
  const { user, isAuthenticated, isLoading, updateProfile } = useAuth();
  const router = useRouter();
  
  const [formData, setFormData] = useState<ProfileFormData>({
    username: '',
    nickname: '',
    bio: '',
    email: '',
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 加载用户数据
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        nickname: user.nickname || '',
        bio: user.bio || '',
        email: user.email || '',
      });
    }
  }, [user]);

  // 检查认证状态
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/portal');
    }
  }, [isLoading, isAuthenticated, router]);

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // 清除消息
    if (message) setMessage(null);
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const result = await updateProfile({
        username: formData.username,
        nickname: formData.nickname,
        bio: formData.bio,
      });

      if (result.success) {
        setMessage({ type: 'success', text: '资料更新成功！' });
        setIsEditing(false);
      } else {
        setMessage({ type: 'error', text: result.error || '更新失败，请稍后重试' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '更新失败，请稍后重试' });
    } finally {
      setIsSaving(false);
    }
  };

  // 取消编辑
  const handleCancel = () => {
    if (user) {
      setFormData({
        username: user.username || '',
        nickname: user.nickname || '',
        bio: user.bio || '',
        email: user.email || '',
      });
    }
    setIsEditing(false);
    setMessage(null);
  };

  // 处理头像上传
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: '请选择图片文件' });
      return;
    }

    // 验证文件大小（5MB限制）
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: '图片大小不能超过 5MB' });
      return;
    }

    setIsUploadingAvatar(true);
    setMessage(null);

    try {
      // 创建预览URL
      const previewUrl = URL.createObjectURL(file);
      
      // 模拟上传（这里应该调用真实的上传API）
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 模拟成功上传后获得的URL
      const uploadedUrl = `https://picsum.photos/200/200?random=${Date.now()}`;
      
      const result = await updateProfile({
        avatar: uploadedUrl,
      });

      if (result.success) {
        setMessage({ type: 'success', text: '头像更新成功！' });
      } else {
        setMessage({ type: 'error', text: result.error || '头像更新失败' });
      }
      
      // 清理预览URL
      URL.revokeObjectURL(previewUrl);
    } catch (error) {
      setMessage({ type: 'error', text: '头像上传失败，请稍后重试' });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // 触发文件选择
  const triggerAvatarUpload = () => {
    fileInputRef.current?.click();
  };

  // 加载状态
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

  // 未认证状态
  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">需要登录</h2>
          <p className="text-gray-600">请先登录以访问个人资料页面</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">个人资料</h1>
        <p className="text-gray-600">管理您的个人信息和偏好设置</p>
      </div>

      {/* 消息提示 */}
      {message && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-700' 
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              {message.type === 'success' ? (
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              ) : (
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              )}
            </svg>
            {message.text}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：头像和基本信息 */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-center">
              {/* 头像 */}
              <div className="relative inline-block">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center mx-auto mb-4">
                  {user.avatar ? (
                    <Image
                      src={user.avatar}
                      alt={user.nickname || user.username}
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <svg className="w-16 h-16 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  )}
                </div>
                
                {/* 上传按钮 */}
                <button
                  onClick={triggerAvatarUpload}
                  disabled={isUploadingAvatar}
                  className="absolute bottom-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploadingAvatar ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
                
                {/* 隐藏的文件输入 */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>

              <h2 className="text-xl font-bold text-gray-900 mb-1">
                {user.nickname || user.username}
              </h2>
              <p className="text-gray-600 mb-4">{user.email}</p>
              
              {/* 统计信息 */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900">0</div>
                  <div className="text-sm text-gray-600">收藏</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">0</div>
                  <div className="text-sm text-gray-600">评论</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">0</div>
                  <div className="text-sm text-gray-600">点赞</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：表单 */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">基本信息</h3>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>编辑</span>
                </button>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSaving}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    )}
                    <span>{isSaving ? '保存中...' : '保存'}</span>
                  </button>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 用户名 */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  用户名
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="请输入用户名"
                />
              </div>

              {/* 昵称 */}
              <div>
                <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-2">
                  昵称
                </label>
                <input
                  type="text"
                  id="nickname"
                  name="nickname"
                  value={formData.nickname}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="请输入昵称"
                />
              </div>

              {/* 邮箱（只读） */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  邮箱
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
                />
                <p className="mt-1 text-sm text-gray-500">邮箱地址不可修改</p>
              </div>

              {/* 个人简介 */}
              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                  个人简介
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:bg-gray-50 disabled:text-gray-500 resize-none"
                  placeholder="请输入个人简介..."
                />
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
