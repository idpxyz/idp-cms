"use client";

import { Suspense, ReactNode } from 'react';

interface SearchParamsWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * 通用的 SearchParams 包装组件
 * 用于包裹使用 useSearchParams() 的客户端组件
 * 解决 Next.js 15 预渲染时的 Suspense 边界要求
 */
export default function SearchParamsWrapper({ 
  children, 
  fallback 
}: SearchParamsWrapperProps) {
  const defaultFallback = (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">加载中...</p>
      </div>
    </div>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
}

