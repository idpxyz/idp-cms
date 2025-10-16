import { Metadata } from 'next';
import { Suspense } from 'react';
import SearchContent from './SearchContent';

// 强制动态渲染
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '搜索 - IDP Portal',
  description: '搜索新闻和文章',
};

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}

