"use client";

import React from 'react';

export interface RelatedSearch {
  query: string;
  count?: number;
  reason?: string;
}

interface RelatedSearchesProps {
  query: string;
  relatedSearches: RelatedSearch[];
  onSearchClick: (query: string) => void;
  className?: string;
}

export default function RelatedSearches({
  query,
  relatedSearches,
  onSearchClick,
  className = "",
}: RelatedSearchesProps) {
  if (!relatedSearches || relatedSearches.length === 0) {
    return null;
  }

  return (
    <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
      <h3 className="text-sm font-medium text-gray-700 mb-3">
        相关搜索
      </h3>
      
      <div className="space-y-2">
        {relatedSearches.map((related, index) => (
          <button
            key={`${related.query}-${index}`}
            onClick={() => onSearchClick(related.query)}
            className="block w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-white rounded-md transition-colors group"
          >
            <div className="flex items-center justify-between">
              <span className="group-hover:underline">
                {related.query}
              </span>
              {related.count && (
                <span className="text-xs text-gray-400 ml-2">
                  {related.count}次搜索
                </span>
              )}
            </div>
            {related.reason && (
              <div className="text-xs text-gray-400 mt-1">
                {related.reason}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// 生成相关搜索的工具函数
export function generateRelatedSearches(query: string, limit: number = 8): RelatedSearch[] {
  if (!query || query.trim() === '') return [];
  
  const trimmedQuery = query.trim();
  const relatedSearches: RelatedSearch[] = [];
  
  // 1. 基于关键词组合
  const keywords = trimmedQuery.split(/\s+/);
  if (keywords.length > 1) {
    // 单个关键词
    keywords.forEach(keyword => {
      if (keyword !== trimmedQuery && keyword.length > 1) {
        relatedSearches.push({
          query: keyword,
          reason: '相关关键词',
          count: Math.floor(Math.random() * 50) + 10
        });
      }
    });
  }
  
  // 2. 常见搜索模式
  const patterns = [
    `${trimmedQuery}新闻`,
    `${trimmedQuery}资讯`, 
    `${trimmedQuery}分析`,
    `${trimmedQuery}报道`,
    `${trimmedQuery}评论`,
    `${trimmedQuery}观点`,
    `最新${trimmedQuery}`,
    `${trimmedQuery}动态`,
  ];
  
  patterns.forEach(pattern => {
    if (pattern !== trimmedQuery) {
      relatedSearches.push({
        query: pattern,
        reason: '热门搜索',
        count: Math.floor(Math.random() * 30) + 5
      });
    }
  });
  
  // 3. 基于内容类型的相关搜索
  const contentTypes = ['头条', '热点', '深度', '独家', '专题'];
  contentTypes.forEach(type => {
    relatedSearches.push({
      query: `${type}${trimmedQuery}`,
      reason: '内容分类',
      count: Math.floor(Math.random() * 20) + 3
    });
  });
  
  // 去重并排序
  const unique = relatedSearches.filter((item, index, arr) => 
    arr.findIndex(i => i.query.toLowerCase() === item.query.toLowerCase()) === index
  );
  
  return unique
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, limit);
}
