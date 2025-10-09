'use client';

import React from 'react';

interface ErrorStateProps {
  error?: Error | null;
  message?: string;
  onRetry?: () => void;
  showDetails?: boolean;
}

/**
 * 🚫 错误状态组件
 * 用于显示数据加载失败时的友好提示
 */
const ErrorState: React.FC<ErrorStateProps> = ({ 
  error, 
  message = '加载失败',
  onRetry,
  showDetails = false
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {/* 错误图标 */}
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <svg 
          className="w-8 h-8 text-red-600" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>
      </div>

      {/* 错误消息 */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {message}
      </h3>
      
      <p className="text-sm text-gray-500 mb-6 text-center max-w-md">
        抱歉，我们在加载内容时遇到了问题。请稍后重试。
      </p>

      {/* 错误详情（开发环境） */}
      {showDetails && error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg max-w-md">
          <p className="text-xs text-red-700 font-mono">
            {error.message}
          </p>
        </div>
      )}

      {/* 重试按钮 */}
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          <svg 
            className="w-4 h-4 mr-2" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
            />
          </svg>
          重试
        </button>
      )}
    </div>
  );
};

export default ErrorState;

/**
 * 🔹 小型错误提示组件
 * 用于行内错误提示
 */
export const ErrorInline: React.FC<ErrorStateProps> = ({ 
  message = '加载失败',
  onRetry 
}) => {
  return (
    <div className="flex items-center justify-center py-4 px-3 bg-red-50 border border-red-200 rounded-lg">
      <svg 
        className="w-5 h-5 text-red-600 mr-2" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
        />
      </svg>
      <span className="text-sm text-red-700 mr-3">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm text-red-600 hover:text-red-800 font-medium underline"
        >
          重试
        </button>
      )}
    </div>
  );
};

/**
 * 📭 空状态组件
 * 用于显示没有数据时的友好提示
 */
export const EmptyState: React.FC<{ 
  message?: string;
  icon?: string;
}> = ({ 
  message = '暂无内容',
  icon = '📭'
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="text-6xl mb-4">{icon}</div>
      <p className="text-gray-500 text-center">{message}</p>
    </div>
  );
};

