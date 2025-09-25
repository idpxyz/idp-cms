"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';

export default function CheckLoginStatusPage() {
  const { user, isAuthenticated, login, logout } = useAuth();
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [storageInfo, setStorageInfo] = useState<any>(null);

  useEffect(() => {
    // 检查localStorage中的token
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      const userStr = localStorage.getItem('user');
      
      setStorageInfo({
        hasToken: !!token,
        tokenPreview: token ? token.substring(0, 50) + '...' : 'None',
        storedUser: userStr ? JSON.parse(userStr) : null
      });

      // 如果有token，解析它
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setTokenInfo(payload);
        } catch (error) {
          console.error('Token解析失败:', error);
        }
      }
    }
  }, []);

  const handleLogout = async () => {
    await logout();
    window.location.reload();
  };

  const handleTestLogin = async () => {
    // 使用tops账户登录测试
    try {
      const result = await login('tops@idp.com', 'your_password'); // 用户需要输入正确密码
      if (result.success) {
        window.location.reload();
      }
    } catch (error) {
      alert('登录失败，请检查密码');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold mb-6">登录状态检查 🔍</h1>
        
        {/* 问题说明 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-yellow-800 mb-3">🤔 为什么点赞后刷新页面状态会丢失？</h2>
          <div className="text-yellow-700 space-y-2">
            <p><strong>原因</strong>: 您可能使用了不同的用户账户</p>
            <p><strong>现象</strong>: 用户A点赞 → 但浏览器中登录的是用户B → 刷新后看不到用户A的点赞状态</p>
            <p><strong>解决</strong>: 确保在同一个浏览器会话中使用同一个用户账户</p>
          </div>
        </div>

        {/* 当前认证状态 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">🔐 当前认证状态</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-gray-700 mb-2">React Auth Context</h3>
              <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
                <p><span className="font-medium">状态:</span> {isAuthenticated ? '✅ 已登录' : '❌ 未登录'}</p>
                {user && (
                  <>
                    <p><span className="font-medium">用户名:</span> {user.username}</p>
                    <p><span className="font-medium">邮箱:</span> {user.email}</p>
                    <p><span className="font-medium">昵称:</span> {user.nickname}</p>
                    <p><span className="font-medium">用户ID:</span> {user.id}</p>
                  </>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-700 mb-2">LocalStorage 数据</h3>
              <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
                <p><span className="font-medium">有Token:</span> {storageInfo?.hasToken ? '✅ 是' : '❌ 否'}</p>
                {storageInfo?.storedUser && (
                  <>
                    <p><span className="font-medium">存储用户名:</span> {storageInfo.storedUser.username}</p>
                    <p><span className="font-medium">存储邮箱:</span> {storageInfo.storedUser.email}</p>
                  </>
                )}
                <p><span className="font-medium">Token预览:</span> <span className="font-mono text-xs break-all">{storageInfo?.tokenPreview}</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Token详情 */}
        {tokenInfo && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">🎫 Token详细信息</h2>
            <div className="bg-gray-50 p-4 rounded">
              <pre className="text-sm">{JSON.stringify(tokenInfo, null, 2)}</pre>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">🛠️ 解决操作</h2>
          <div className="space-y-3">
            {isAuthenticated ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  如果您看到的用户信息不是您期望的账户，请先退出登录，然后使用正确的账户重新登录。
                </p>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                >
                  退出当前登录
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  您当前未登录。请登录您的账户以正常使用点赞功能。
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => window.location.href = '/portal/test-login'}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    前往登录页面
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 测试步骤 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">✅ 正确的测试步骤</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>确认上方显示的用户信息是您想要的账户</li>
            <li>如果不是，点击"退出当前登录"并重新登录正确的账户</li>
            <li>登录正确账户后，前往文章页面</li>
            <li>点击评论的点赞按钮</li>
            <li>刷新页面，检查点赞状态是否保持</li>
          </ol>
          
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
            <p className="text-green-700 text-sm">
              <strong>💡 提示</strong>: 如果按照以上步骤操作后点赞状态仍然有问题，可能是浏览器缓存问题。
              建议清除浏览器缓存或使用无痕模式重新测试。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

