'use client';

import { useState, useEffect } from 'react';

export default function TestReadCountPage() {
  const [readCount, setReadCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const testReadCountUpdate = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      console.log('🧪 开始测试阅读数量更新...');
      
      // 1. 获取当前阅读数量
      const newsResponse = await fetch('/api/ai-news/1570');
      const newsData = await newsResponse.json();
      const currentCount = newsData.read_count;
      
      console.log('📊 当前阅读数:', currentCount);
      setReadCount(currentCount);
      
      // 2. 调用更新API
      console.log('📡 调用更新API...');
      const updateResponse = await fetch('/api/ai-news/1570/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Site-ID': 'localhost'
        }
      });
      
      console.log('📡 更新API响应状态:', updateResponse.status, updateResponse.statusText);
      console.log('📡 更新API响应头:', Object.fromEntries(updateResponse.headers.entries()));
      
      if (updateResponse.ok) {
        const result = await updateResponse.json();
        
        // 3. 再次获取阅读数量
        const updatedNewsResponse = await fetch('/api/ai-news/1570');
        const updatedNewsData = await updatedNewsResponse.json();
        const newCount = updatedNewsData.read_count;
        
        setReadCount(newCount);
        
        setMessage(`✅ 测试成功！阅读数从 ${currentCount} 增加到 ${newCount}`);
      } else {
        setMessage(`❌ 更新API调用失败，状态码: ${updateResponse.status}`);
      }
    } catch (error) {
      setMessage(`❌ 测试失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">🧪 阅读数量更新测试</h1>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">当前状态</h2>
          <div className="space-y-2">
            <p><strong>阅读数量:</strong> {readCount !== null ? readCount.toLocaleString() : '未加载'}</p>
            <p><strong>加载状态:</strong> {loading ? '🔄 加载中...' : '✅ 就绪'}</p>
            <p><strong>消息:</strong> {message || '无'}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">测试操作</h2>
          <button
            onClick={testReadCountUpdate}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed mr-4"
          >
            {loading ? '🔄 测试中...' : '🧪 开始测试'}
          </button>
          
          <button
            onClick={() => {
              console.log('🧪 在控制台中测试...');
              console.log('复制以下代码到浏览器控制台：');
              console.log(`
// 测试阅读数量更新
(async () => {
  try {
    console.log('🧪 开始控制台测试...');
    
    // 1. 获取当前阅读数量
    const newsResponse = await fetch('/api/ai-news/1570');
    const newsData = await newsResponse.json();
    console.log('📊 当前阅读数:', newsData.read_count);
    
          // 2. 调用更新API
      // 获取CSRF token
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];
      
      console.log('🔑 CSRF Token:', csrfToken);
      
      const updateResponse = await fetch('/api/ai-news/1570/read', {
        method: 'POST',
        headers: {
          'X-Site-ID': 'localhost',
          'X-CSRFToken': csrfToken || '',
          'Content-Type': 'application/json'
        }
      });
    
    console.log('📡 更新API响应状态:', updateResponse.status);
    
    if (updateResponse.ok) {
      const result = await updateResponse.json();
      console.log('✅ 更新成功:', result);
      
      // 3. 再次获取阅读数量
      const updatedNewsResponse = await fetch('/api/ai-news/1570');
      const updatedNewsData = await updatedNewsResponse.json();
      console.log('📊 更新后阅读数:', updatedNewsData.read_count);
    } else {
      console.error('❌ 更新API调用失败');
    }
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
})();
              `);
            }}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            📝 控制台测试
          </button>
          
          <button
            onClick={async () => {
              console.log('🧪 简单fetch测试...');
              try {
                // 简单测试fetch是否工作
                const response = await fetch('/api/ai-news/1570');
                console.log('✅ GET请求成功:', response.status);
                
                const data = await response.json();
                console.log('📊 数据:', data.read_count);
              } catch (error) {
                console.error('❌ GET请求失败:', error);
              }
            }}
            className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 ml-4"
          >
            🔍 简单测试
          </button>
          
          <div className="mt-4 text-sm text-gray-600">
            <p>这个测试会：</p>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>获取新闻ID 1570 的当前阅读数量</li>
              <li>调用更新API增加阅读数量</li>
              <li>再次获取阅读数量验证更新</li>
              <li>显示测试结果</li>
            </ol>
          </div>
        </div>
        
        <div className="mt-6 text-sm text-gray-500">
          <p>💡 提示：打开浏览器开发者工具查看控制台日志</p>
        </div>
      </div>
    </div>
  );
}
