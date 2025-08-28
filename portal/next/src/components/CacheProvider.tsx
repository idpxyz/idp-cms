'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { CacheTag, generateCacheTag, generateSurrogateKey } from '@/lib/cache';

// 缓存上下文接口
interface CacheContextType {
  addCacheTag: (tag: CacheTag) => void;
  getCacheTags: () => CacheTag[];
  clearCacheTags: () => void;
}

// 创建缓存上下文
const CacheContext = createContext<CacheContextType | undefined>(undefined);

// 缓存提供者组件
export function CacheProvider({ children }: { children: ReactNode }) {
  const cacheTags: CacheTag[] = [];

  const addCacheTag = (tag: CacheTag) => {
    cacheTags.push(tag);

    // 在开发环境下打印缓存标签
    if (process.env.NODE_ENV === 'development') {
      console.log('🏷️ Cache tag added:', generateCacheTag(tag));
      console.log('🔑 Surrogate key:', generateSurrogateKey(tag));
    }
  };

  const getCacheTags = () => [...cacheTags];

  const clearCacheTags = () => {
    cacheTags.length = 0;
  };

  return (
    <CacheContext.Provider
      value={{ addCacheTag, getCacheTags, clearCacheTags }}
    >
      {children}
    </CacheContext.Provider>
  );
}

// 使用缓存上下文的 Hook
export function useCache() {
  const context = useContext(CacheContext);
  if (context === undefined) {
    throw new Error('useCache must be used within a CacheProvider');
  }
  return context;
}

// 缓存标签组件 - 用于在 JSX 中标记缓存区域
export function CacheTag({
  tag,
  children,
}: {
  tag: CacheTag;
  children: ReactNode;
}) {
  const { addCacheTag } = useCache();

  // 在组件挂载时添加缓存标签
  React.useEffect(() => {
    addCacheTag(tag);
  }, [tag, addCacheTag]);

  return <>{children}</>;
}

// 服务端缓存标签组件
export function ServerCacheTag({
  tag,
  children,
}: {
  tag: CacheTag;
  children: ReactNode;
}) {
  // 这个组件在服务端渲染时会被特殊处理
  // 用于生成 Surrogate-Key 响应头
  return <>{children}</>;
}
