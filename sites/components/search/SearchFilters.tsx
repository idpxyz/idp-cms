"use client";

import React, { useState } from 'react';

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

  return (
    <div className={`bg-white border-b border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 py-3">
        {/* 简化的筛选条件 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
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
