"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
}

export default function AuthModal({ isOpen, onClose, defaultMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login, register } = useAuth();

  // 重置表单当模态框打开/关闭时
  useEffect(() => {
    if (isOpen) {
      setMode(defaultMode);
      setFormData({
        email: '',
        password: '',
        username: '',
        confirmPassword: '',
      });
      setError('');
    }
  }, [isOpen, defaultMode]);

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // 清除错误信息
    if (error) setError('');
  };

  // 表单验证
  const validateForm = () => {
    if (!formData.email || !formData.password) {
      setError('请填写所有必填字段');
      return false;
    }

    if (!formData.email.includes('@')) {
      setError('请输入有效的邮箱地址');
      return false;
    }

    if (formData.password.length < 6) {
      setError('密码至少需要6个字符');
      return false;
    }

    if (mode === 'register') {
      if (!formData.username) {
        setError('请输入用户名');
        return false;
      }

      if (formData.username.length < 3) {
        setError('用户名至少需要3个字符');
        return false;
      }

      if (formData.password !== formData.confirmPassword) {
        setError('两次输入的密码不一致');
        return false;
      }
    }

    return true;
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setError('');

    try {
      let result;
      
      if (mode === 'login') {
        // API支持用户名或邮箱登录，这里传递邮箱字段作为username参数
        result = await login(formData.email, formData.password);
      } else {
        result = await register(formData.email, formData.password, formData.username);
      }

      if (result.success) {
        onClose();
      } else {
        setError(result.error || '操作失败，请稍后重试');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 切换模式
  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
    setFormData({
      email: '',
      password: '',
      username: '',
      confirmPassword: '',
    });
  };

  // ESC键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* 模态框内容 */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-auto">
          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* 头部 */}
          <div className="p-6 pb-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {mode === 'login' ? '登录' : '注册'}
            </h2>
            <p className="text-gray-600">
              {mode === 'login' 
                ? '欢迎回来！请登录您的账户' 
                : '创建您的账户，开始个性化新闻体验'
              }
            </p>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="px-6">
            {/* 错误信息 */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* 登录提示 */}
            {mode === 'login' && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-600">
                  <strong>提示：</strong> 支持用户名或邮箱登录
                </p>
              </div>
            )}

            {/* 邮箱 */}
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                邮箱地址
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="请输入邮箱地址"
                autoComplete={mode === 'login' ? 'email' : 'email'}
                required
              />
            </div>

            {/* 用户名（仅注册时显示） */}
            {mode === 'register' && (
              <div className="mb-4">
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  用户名
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="请输入用户名"
                  autoComplete="username"
                  required
                />
              </div>
            )}

            {/* 密码 */}
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                密码
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="请输入密码"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
              />
            </div>

            {/* 确认密码（仅注册时显示） */}
            {mode === 'register' && (
              <div className="mb-6">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  确认密码
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="请再次输入密码"
                  autoComplete="new-password"
                  required
                />
              </div>
            )}

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {mode === 'login' ? '登录中...' : '注册中...'}
                </div>
              ) : (
                mode === 'login' ? '登录' : '注册'
              )}
            </button>
          </form>

          {/* 底部切换 */}
          <div className="p-6 pt-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <p className="text-center text-sm text-gray-600">
              {mode === 'login' ? '还没有账户？' : '已有账户？'}
              <button
                type="button"
                onClick={toggleMode}
                className="ml-1 text-red-600 hover:text-red-700 font-medium"
              >
                {mode === 'login' ? '立即注册' : '立即登录'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
