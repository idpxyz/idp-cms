"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { useReadingHistory } from '@/lib/hooks/useReadingHistory';

export default function DebugAuthPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { addToHistory } = useReadingHistory();
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [testResult, setTestResult] = useState<string>('');

  useEffect(() => {
    // 获取调试信息
    const getDebugInfo = () => {
      const token = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('auth_user');
      
      return {
        localStorage_token: token ? token.substring(0, 20) + '...' : 'null',
        localStorage_user: storedUser ? JSON.parse(storedUser) : null,
        context_isAuthenticated: isAuthenticated,
        context_isLoading: isLoading,
        context_user: user,
        timestamp: new Date().toISOString()
      };
    };

    setDebugInfo(getDebugInfo());
  }, [user, isAuthenticated, isLoading]);

  const testAddToHistory = async () => {
    setTestResult('测试中...');
    
    try {
      const success = await addToHistory({
        articleId: 'debug-test-' + Date.now(),
        articleTitle: '调试测试文章 - ' + new Date().toLocaleString(),
        articleSlug: 'debug-test-article',
        articleChannel: '调试频道',
        readDuration: 120,
        readProgress: 90
      });
      
      if (success) {
        setTestResult('✅ 成功！阅读历史记录已添加');
      } else {
        setTestResult('❌ 失败！可能是认证问题或API错误');
      }
    } catch (error) {
      setTestResult('❌ 错误：' + String(error));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">认证状态调试</h1>
        
        {/* 认证状态 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">🔐 当前认证状态</h2>
          <div className="space-y-2 text-sm font-mono">
            <div className={`p-2 rounded ${isAuthenticated ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              认证状态: {isAuthenticated ? '✅ 已登录' : '❌ 未登录'}
            </div>
            <div className={`p-2 rounded ${isLoading ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100'}`}>
              加载状态: {isLoading ? '🔄 加载中' : '✅ 完成'}
            </div>
          </div>
        </div>

        {/* 用户信息 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">👤 用户信息</h2>
          <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
{JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>

        {/* 测试功能 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">🧪 测试阅读历史记录</h2>
          <div className="space-y-4">
            <button
              onClick={testAddToHistory}
              disabled={!isAuthenticated}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              测试添加阅读记录
            </button>
            {testResult && (
              <div className={`p-4 rounded-lg ${
                testResult.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {testResult}
              </div>
            )}
          </div>
        </div>

        {/* 快速登录 */}
        {!isAuthenticated && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">需要登录</h3>
            <p className="text-yellow-700 mb-4">
              要测试阅读历史功能，您需要先登录。
            </p>
            <a
              href="/portal/test-login"
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              前往登录页面
            </a>
          </div>
        )}

        {/* 使用说明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">📝 使用说明</h3>
          <div className="text-blue-700 text-sm space-y-2">
            <p>1. 首先确认您已经登录（认证状态显示为"已登录"）</p>
            <p>2. 如果未登录，请点击上方的"前往登录页面"</p>
            <p>3. 登录成功后，点击"测试添加阅读记录"按钮</p>
            <p>4. 然后访问 <code className="bg-white px-1 rounded">/portal/history</code> 查看是否有新记录</p>
            <p>5. 如果要在真实文章页面测试，请确保在文章页面停留超过3秒</p>
          </div>
        </div>
      </div>
    </div>
  );
}
