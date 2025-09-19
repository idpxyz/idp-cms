"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { useRouter } from 'next/navigation';

interface UserSettings {
  // 个人偏好
  preferredChannels: string[];
  preferredCategories: string[];
  readingMode: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large';
  
  // 通知设置
  emailNotifications: boolean;
  pushNotifications: boolean;
  commentNotifications: boolean;
  likeNotifications: boolean;
  followNotifications: boolean;
  
  // 隐私设置
  profileVisibility: 'public' | 'private';
  showReadingHistory: boolean;
  showFavorites: boolean;
  
  // 内容偏好
  autoPlay: boolean;
  showNSFWContent: boolean;
  language: 'zh-CN' | 'en-US';
  timezone: string;
}

const defaultSettings: UserSettings = {
  preferredChannels: [],
  preferredCategories: [],
  readingMode: 'auto',
  fontSize: 'medium',
  emailNotifications: true,
  pushNotifications: false,
  commentNotifications: true,
  likeNotifications: true,
  followNotifications: true,
  profileVisibility: 'public',
  showReadingHistory: true,
  showFavorites: true,
  autoPlay: false,
  showNSFWContent: false,
  language: 'zh-CN',
  timezone: 'Asia/Shanghai',
};

export default function SettingsContent() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'preferences' | 'notifications' | 'privacy' | 'content'>('preferences');

  // 检查认证状态
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/portal');
    }
  }, [isLoading, isAuthenticated, router]);

  // 加载用户设置
  useEffect(() => {
    if (isAuthenticated && user) {
      loadUserSettings();
    }
  }, [isAuthenticated, user]);

  // 模拟加载用户设置
  const loadUserSettings = () => {
    try {
      const stored = localStorage.getItem(`user_settings_${user?.id}`);
      if (stored) {
        const parsedSettings = JSON.parse(stored);
        setSettings({ ...defaultSettings, ...parsedSettings });
      }
    } catch (error) {
      console.error('Failed to load user settings:', error);
    }
  };

  // 保存设置
  const saveSettings = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 保存到本地存储
      localStorage.setItem(`user_settings_${user?.id}`, JSON.stringify(settings));
      
      setMessage({ type: 'success', text: '设置已保存' });
    } catch (error) {
      setMessage({ type: 'error', text: '保存失败，请稍后重试' });
    } finally {
      setIsSaving(false);
    }
  };

  // 更新设置
  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
    // 清除消息
    if (message) setMessage(null);
  };

  // 重置设置
  const resetSettings = () => {
    if (window.confirm('确定要重置所有设置为默认值吗？')) {
      setSettings(defaultSettings);
      setMessage({ type: 'success', text: '设置已重置为默认值' });
    }
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
          <p className="text-gray-600">请先登录以访问设置页面</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'preferences', name: '个人偏好', icon: '🎯' },
    { id: 'notifications', name: '通知设置', icon: '🔔' },
    { id: 'privacy', name: '隐私设置', icon: '🔒' },
    { id: 'content', name: '内容设置', icon: '📱' },
  ] as const;

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">设置</h1>
        <p className="text-gray-600">管理您的账户设置和偏好</p>
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

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* 标签导航 */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* 设置内容 */}
        <div className="p-6">
          {/* 个人偏好 */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">阅读偏好</h3>
                
                {/* 阅读模式 */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    阅读模式
                  </label>
                  <div className="flex space-x-4">
                    {(['light', 'dark', 'auto'] as const).map((mode) => (
                      <label key={mode} className="flex items-center">
                        <input
                          type="radio"
                          value={mode}
                          checked={settings.readingMode === mode}
                          onChange={(e) => updateSetting('readingMode', e.target.value as any)}
                          className="mr-2 text-red-600 focus:ring-red-500"
                        />
                        <span className="text-sm text-gray-700">
                          {mode === 'light' ? '浅色' : mode === 'dark' ? '深色' : '自动'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 字体大小 */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    字体大小
                  </label>
                  <div className="flex space-x-4">
                    {(['small', 'medium', 'large'] as const).map((size) => (
                      <label key={size} className="flex items-center">
                        <input
                          type="radio"
                          value={size}
                          checked={settings.fontSize === size}
                          onChange={(e) => updateSetting('fontSize', e.target.value as any)}
                          className="mr-2 text-red-600 focus:ring-red-500"
                        />
                        <span className="text-sm text-gray-700">
                          {size === 'small' ? '小' : size === 'medium' ? '中' : '大'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 语言设置 */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    界面语言
                  </label>
                  <select
                    value={settings.language}
                    onChange={(e) => updateSetting('language', e.target.value as any)}
                    className="w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="zh-CN">简体中文</option>
                    <option value="en-US">English</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 通知设置 */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">通知偏好</h3>
                
                <div className="space-y-4">
                  {/* 邮件通知 */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">邮件通知</div>
                      <div className="text-sm text-gray-500">接收重要更新和新闻摘要邮件</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.emailNotifications}
                        onChange={(e) => updateSetting('emailNotifications', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                    </label>
                  </div>

                  {/* 推送通知 */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">推送通知</div>
                      <div className="text-sm text-gray-500">接收浏览器推送通知</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.pushNotifications}
                        onChange={(e) => updateSetting('pushNotifications', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                    </label>
                  </div>

                  {/* 评论通知 */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">评论通知</div>
                      <div className="text-sm text-gray-500">有人回复您的评论时通知</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.commentNotifications}
                        onChange={(e) => updateSetting('commentNotifications', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                    </label>
                  </div>

                  {/* 点赞通知 */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">点赞通知</div>
                      <div className="text-sm text-gray-500">有人点赞您的评论时通知</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.likeNotifications}
                        onChange={(e) => updateSetting('likeNotifications', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 隐私设置 */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">隐私控制</h3>
                
                <div className="space-y-4">
                  {/* 个人资料可见性 */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">个人资料可见性</div>
                      <div className="text-sm text-gray-500">其他用户是否可以查看您的个人资料</div>
                    </div>
                    <select
                      value={settings.profileVisibility}
                      onChange={(e) => updateSetting('profileVisibility', e.target.value as any)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="public">公开</option>
                      <option value="private">私密</option>
                    </select>
                  </div>

                  {/* 显示阅读历史 */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">显示阅读历史</div>
                      <div className="text-sm text-gray-500">其他用户是否可以看到您的阅读历史</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.showReadingHistory}
                        onChange={(e) => updateSetting('showReadingHistory', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                    </label>
                  </div>

                  {/* 显示收藏 */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">显示收藏列表</div>
                      <div className="text-sm text-gray-500">其他用户是否可以看到您的收藏</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.showFavorites}
                        onChange={(e) => updateSetting('showFavorites', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 内容设置 */}
          {activeTab === 'content' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">内容偏好</h3>
                
                <div className="space-y-4">
                  {/* 自动播放 */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">自动播放视频</div>
                      <div className="text-sm text-gray-500">自动播放视频内容（可能消耗更多流量）</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.autoPlay}
                        onChange={(e) => updateSetting('autoPlay', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                    </label>
                  </div>

                  {/* 敏感内容 */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">显示敏感内容</div>
                      <div className="text-sm text-gray-500">显示可能包含敏感信息的内容</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.showNSFWContent}
                        onChange={(e) => updateSetting('showNSFWContent', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                    </label>
                  </div>

                  {/* 时区设置 */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">时区</div>
                      <div className="text-sm text-gray-500">用于显示时间的时区设置</div>
                    </div>
                    <select
                      value={settings.timezone}
                      onChange={(e) => updateSetting('timezone', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="Asia/Shanghai">北京时间 (UTC+8)</option>
                      <option value="America/New_York">纽约时间 (UTC-5)</option>
                      <option value="Europe/London">伦敦时间 (UTC+0)</option>
                      <option value="Asia/Tokyo">东京时间 (UTC+9)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between">
          <button
            onClick={resetSettings}
            className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            重置为默认值
          </button>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={saveSettings}
              disabled={isSaving}
              className="flex items-center space-x-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              <span>{isSaving ? '保存中...' : '保存设置'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
