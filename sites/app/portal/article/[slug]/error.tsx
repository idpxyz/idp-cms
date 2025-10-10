'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Article page error:', error);
  }, [error]);

  const isTimeout = error.message === 'TIMEOUT' || error.message.includes('timeout');
  const isNotFound = error.message.includes('404');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {/* 错误图标 */}
        <div className="flex justify-center mb-6">
          {isTimeout ? (
            <svg className="w-16 h-16 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : isNotFound ? (
            <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-16 h-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
        </div>

        {/* 错误标题 */}
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
          {isTimeout ? '加载超时' : isNotFound ? '文章不存在' : '加载失败'}
        </h1>

        {/* 错误描述 */}
        <p className="text-gray-600 text-center mb-6">
          {isTimeout ? (
            <>
              文章加载时间过长，可能是网络连接不稳定。
              <br />
              请稍后重试或检查您的网络连接。
            </>
          ) : isNotFound ? (
            <>
              抱歉，您访问的文章不存在或已被删除。
              <br />
              请返回首页查看其他内容。
            </>
          ) : (
            <>
              加载文章时遇到了问题。
              <br />
              我们正在努力解决，请稍后再试。
            </>
          )}
        </p>

        {/* 操作按钮 */}
        <div className="flex flex-col gap-3">
          {!isNotFound && (
            <button
              onClick={reset}
              className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              重新加载
            </button>
          )}
          
          <Link
            href="/portal"
            className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors text-center flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            返回首页
          </Link>
        </div>

        {/* 错误详情（仅开发环境） */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6 text-xs text-gray-500">
            <summary className="cursor-pointer hover:text-gray-700 font-medium">
              错误详情（开发模式）
            </summary>
            <pre className="mt-2 p-3 bg-gray-50 rounded overflow-auto text-xs">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

