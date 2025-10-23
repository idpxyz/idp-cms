"use client";

import React from 'react';

export interface SearchFilters {
  channel?: string;
  region?: string;
  since?: string;
  orderBy?: 'relevance' | 'date' | 'popularity';
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

  // 排序选项配置
  const sortOptions = [
    { value: 'relevance', label: '综合', icon: '⭐' },
    { value: 'date', label: '最新', icon: '🕒' },
    { value: 'popularity', label: '热门', icon: '🔥' },
  ];

  // 时间筛选选项
  const timeOptions = [
    { value: '', label: '全部时间' },
    { value: '24h', label: '今天' },
    { value: '7d', label: '本周' },
    { value: '30d', label: '本月' },
  ];

  return (
    <div className={`bg-white border-b border-gray-200 ${className}`}>
      {/* 移动端：横向滚动筛选标签 */}
      <div className="md:hidden">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-2 px-4 py-3 min-w-max">
            {/* 排序选项 */}
            {sortOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleFilterChange('orderBy', option.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  (filters.orderBy || 'relevance') === option.value
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="mr-1">{option.icon}</span>
                {option.label}
              </button>
            ))}
            
            {/* 分隔线 */}
            <div className="w-px h-6 bg-gray-300 mx-1"></div>
            
            {/* 时间筛选 */}
            {timeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleFilterChange('since', option.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  (filters.since || '') === option.value
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
            
            {/* 清空筛选按钮 */}
            {hasActiveFilters && (
              <>
                <div className="w-px h-6 bg-gray-300 mx-1"></div>
                <button
                  onClick={clearAllFilters}
                  className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap bg-gray-100 text-gray-500 hover:bg-gray-200"
                >
                  重置
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 桌面端：传统布局 */}
      <div className="hidden md:block">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* 排序 */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">排序:</span>
                <div className="flex items-center gap-2">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleFilterChange('orderBy', option.value)}
                      className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                        (filters.orderBy || 'relevance') === option.value
                          ? 'bg-red-500 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 时间筛选 */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">时间:</span>
                <div className="flex items-center gap-2">
                  {timeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleFilterChange('since', option.value)}
                      className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                        (filters.since || '') === option.value
                          ? 'bg-red-500 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {option.label}
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
    </div>
  );
}
