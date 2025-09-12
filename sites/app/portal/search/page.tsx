import React from "react";
import { endpoints } from "@/lib/config/endpoints";
import { Suspense } from "react";
import Image from "next/image";
import { formatDateShort } from "@/lib/utils/date";

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
  }>;
}

interface SearchResult {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  image_url: string | null;
  source: string;
  publish_at: string;
  url: string;
}

interface SearchResponse {
  success: boolean;
  message: string;
  data: SearchResult[];
  total: number;
  page: number;
  limit: number;
  query: string;
}

// 获取搜索结果
async function getSearchResults(query: string): Promise<SearchResponse> {
  try {
    // 构建完整的URL - 在容器内部使用localhost:3000，外部使用localhost:3001
    const baseUrl = endpoints.getFrontendEndpoint();
    const response = await fetch(
      `${baseUrl}/api/search?q=${encodeURIComponent(query)}&limit=20`,
      {
        next: { revalidate: 300 }, // 5分钟缓存
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `搜索请求失败: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("搜索错误:", error);
    return {
      success: false,
      message: "搜索服务暂时不可用",
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      query,
    };
  }
}

// 搜索结果组件
async function SearchResults({ query }: { query: string }) {
  const searchResponse = await getSearchResults(query);
  const results = searchResponse.data;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">搜索结果</h1>
        <p className="text-gray-600">
          搜索关键词:{" "}
          <span className="font-medium text-red-500">"{query}"</span>
          {searchResponse.total > 0 && (
            <span className="ml-2 text-sm text-gray-500">
              (找到 {searchResponse.total} 条结果)
            </span>
          )}
        </p>
      </div>

      {!searchResponse.success && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800">{searchResponse.message}</p>
        </div>
      )}

      <div className="space-y-4">
        {results.map((result) => (
          <article
            key={result.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex space-x-4">
              {result.image_url && (
                <Image
                  src={result.image_url}
                  alt={result.title}
                  width={120}
                  height={80}
                  className="w-24 h-16 object-cover rounded flex-shrink-0"
                />
              )}
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900 mb-2 hover:text-red-500 transition-colors">
                  <a href={result.url}>{result.title}</a>
                </h2>
                {result.excerpt && (
                  <p className="text-gray-600 mb-3 line-clamp-2">
                    {result.excerpt}
                  </p>
                )}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{result.source}</span>
                  <span>{formatDateShort(result.publish_at)}</span>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {results.length === 0 && searchResponse.success && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            没有找到相关结果
          </h3>
          <p className="text-gray-600">请尝试使用其他关键词进行搜索</p>
        </div>
      )}
    </div>
  );
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const query = q || "";

  return (
    <Suspense fallback={<div>搜索中...</div>}>
      <SearchResults query={query} />
    </Suspense>
  );
}
