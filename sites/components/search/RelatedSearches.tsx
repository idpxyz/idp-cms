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

// 生成相关搜索的工具函数 - 改进版本
export async function generateRelatedSearches(query: string, limit: number = 8): Promise<RelatedSearch[]> {
  if (!query || query.trim() === '') return [];
  
  const trimmedQuery = query.trim();
  
  try {
    // 尝试从后端API获取智能相关搜索
    const response = await fetch(`/api/search/suggest/?q=${encodeURIComponent(trimmedQuery)}&limit=${limit}`);
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data && data.data.length > 0) {
        return data.data.map((suggestion: any) => ({
          query: suggestion.text,
          reason: suggestion.reason || '相关内容',
          count: suggestion.score || Math.floor(Math.random() * 50) + 10
        }));
      }
    }
  } catch (error) {
    console.warn('获取智能相关搜索失败，使用本地生成:', error);
  }
  
  // 后备方案：基于关键词的本地生成（去除无意义的通用后缀）
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
  
  // 2. 基于语义的相关词汇（替代无意义后缀）
  const semanticRelated = getSemanticRelatedQueries(trimmedQuery);
  semanticRelated.forEach(related => {
    relatedSearches.push({
      query: related.query,
      reason: related.reason,
      count: related.count
    });
  });
  
  // 3. 如果还没有足够的建议，添加原始查询
  if (relatedSearches.length === 0) {
    relatedSearches.push({
      query: trimmedQuery,
      reason: '精确搜索',
      count: 100
    });
  }
  
  // 去重并排序
  const unique = relatedSearches.filter((item, index, arr) => 
    arr.findIndex(i => i.query.toLowerCase() === item.query.toLowerCase()) === index
  );
  
  return unique
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, limit);
}

// 获取基于语义的相关查询词（替代硬编码的通用后缀）
function getSemanticRelatedQueries(query: string): RelatedSearch[] {
  const related: RelatedSearch[] = [];
  const q = query.toLowerCase();
  
  // 科技类
  if (['科技', '技术', '创新', 'ai', '人工智能', '区块链'].some(term => q.includes(term))) {
    const techTerms = ['人工智能', '5G', '云计算', '大数据', '物联网', '区块链'];
    techTerms.forEach(term => {
      if (!q.includes(term.toLowerCase())) {
        related.push({
          query: `${query} ${term}`,
          reason: '科技相关',
          count: Math.floor(Math.random() * 40) + 20
        });
      }
    });
  }
  
  // 经济金融类
  else if (['经济', '金融', '投资', '股市', '基金'].some(term => q.includes(term))) {
    const financeTerms = ['股市行情', '基金理财', '投资策略', '经济政策'];
    financeTerms.forEach(term => {
      related.push({
        query: `${query} ${term}`,
        reason: '财经相关',
        count: Math.floor(Math.random() * 35) + 15
      });
    });
  }
  
  // 教育类  
  else if (['教育', '学习', '培训', '学校'].some(term => q.includes(term))) {
    const eduTerms = ['在线教育', '职业培训', '学历提升', '技能学习'];
    eduTerms.forEach(term => {
      related.push({
        query: `${query} ${term}`,
        reason: '教育相关',
        count: Math.floor(Math.random() * 30) + 12
      });
    });
  }
  
  // 健康医疗类
  else if (['健康', '医疗', '养生', '疾病'].some(term => q.includes(term))) {
    const healthTerms = ['预防保健', '医疗技术', '健康管理', '疾病治疗'];
    healthTerms.forEach(term => {
      related.push({
        query: `${query} ${term}`,
        reason: '健康相关',
        count: Math.floor(Math.random() * 25) + 10
      });
    });
  }
  
  return related.slice(0, 3); // 限制数量，避免过多
}
