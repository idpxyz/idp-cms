"use client";

import React, { useState, useEffect, useRef } from 'react';
import { endpoints } from '@/lib/config/endpoints';
import { getMainSite } from '@/lib/config/sites';

export interface SearchFilters {
  channel?: string;
  region?: string;
  since?: string;
  orderBy?: 'relevance' | 'date' | 'popularity';
  category?: string; // 新增：分类单选（slug）
}

interface SearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  className?: string;
}

export default function SearchFilters({
  filters,
  onFiltersChange,
  className = "",
}: SearchFiltersProps) {

  // 加载分类选项（热门，按文章数排序，最多50个）
  type CategoryOption = { slug: string; name: string; count?: number };
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [loadingCats, setLoadingCats] = useState<boolean>(false);
  const didFetchRef = useRef(false);
  useEffect(() => {
    if (didFetchRef.current) return; // React StrictMode 下防止重复请求
    didFetchRef.current = true;

    let mounted = true;
    const load = async () => {
      try {
        setLoadingCats(true);
        // 构建前端API路由URL
        const baseUrl = `${window.location.origin}/api/categories`;
        const url = endpoints.buildUrl(
          baseUrl,
          {
            site: getMainSite().hostname,
            format: 'flat',
            limit: '50',
          }
        );
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          next: { revalidate: 300 }
        });
        if (!res.ok) {
          console.warn('Categories fetch non-OK:', res.status);
          if (mounted) setCategoryOptions([]);
          return;
        }
        const data = await res.json();
        const results = Array.isArray(data?.results) ? data.results : [];
        // 使用简化的响应格式，暂时不包含articles_count
        const mapped: CategoryOption[] = results.map((c: any) => ({ 
          slug: c.slug, 
          name: c.name, 
          count: c.articles_count || 0 // 设置默认值，因为简化版本暂时没有count
        }));
        if (mounted) setCategoryOptions(mapped);
      } catch (e) {
        console.error('Failed to load categories:', e);
        if (mounted) setCategoryOptions([]);
      } finally {
        if (mounted) setLoadingCats(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    const newFilters = { ...filters };
    if (value === '' || value === 'all') {
      delete newFilters[key];
    } else {
      (newFilters as any)[key] = value;
    }
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <div className={`bg-white border-b border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 py-3">
        {/* 简化的筛选条件 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            {/* 分类（单选） */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">分类:</span>
              <select
                value={filters.category || 'all'}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">全部</option>
                {loadingCats ? (
                  <option disabled>加载中...</option>
                ) : (
                  categoryOptions.map(opt => (
                    <option key={opt.slug} value={opt.slug}>
                      {opt.name}{typeof opt.count === 'number' ? ` (${opt.count})` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>
            {/* 排序 */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">排序:</span>
              <select
                value={filters.orderBy || 'relevance'}
                onChange={(e) => handleFilterChange('orderBy', e.target.value)}
                className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="relevance">相关度</option>
                <option value="date">时间</option>
                <option value="popularity">热度</option>
              </select>
            </div>

            {/* 时间筛选 */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">时间:</span>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleFilterChange('since', '')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    !filters.since
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  全部
                </button>
                {['24h', '7d', '30d'].map((period) => (
                  <button
                    key={period}
                    onClick={() => handleFilterChange('since', period)}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      filters.since === period
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {period === '24h' ? '今天' : period === '7d' ? '本周' : '本月'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 清空筛选 */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              清空筛选
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
