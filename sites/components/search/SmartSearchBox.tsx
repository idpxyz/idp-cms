"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSearchSuggest } from '@/lib/hooks/useSearchSuggest';
import { useSearchHistory } from '@/lib/hooks/useSearchHistory';

interface SmartSearchBoxProps {
  placeholder?: string;
  className?: string;
  onSearch?: (query: string) => void;
  autoFocus?: boolean;
}

export default function SmartSearchBox({
  placeholder = "搜索新闻、话题、用户...",
  className = "",
  onSearch,
  autoFocus = false,
}: SmartSearchBoxProps) {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // 从URL参数初始化搜索查询词
  useEffect(() => {
    const urlQuery = searchParams?.get('q') || '';
    if (urlQuery !== query) {
      setQuery(urlQuery);
    }
  }, [searchParams]);
  
  const { suggestions, loading } = useSearchSuggest(query, {
    enabled: showSuggestions && query.length > 0,
    debounceMs: 150,
    minQueryLength: 1,
    maxSuggestions: 5,
  });

  const { history, addToHistory, getHistorySuggestions } = useSearchHistory({
    maxItems: 20,
    enabled: true,
  });

  // 合并建议：历史记录 + API建议
  const allSuggestions = React.useMemo(() => {
    if (!showSuggestions) return [];
    
    // 如果输入框为空，只显示搜索历史
    if (query.length === 0) {
      return history.slice(0, 5).map(item => ({
        text: item.query,
        type: 'history' as const,
        reason: `搜索${item.count}次`,
        score: item.count * 10
      }));
    }
    
    // 有输入时，显示相关历史 + API建议
    const historySuggestions = getHistorySuggestions(query, 3);
    const apiSuggestions = suggestions.slice(0, 5);
    
    // 合并并去重
    const combined = [...historySuggestions, ...apiSuggestions];
    const seen = new Set<string>();
    const unique = combined.filter(suggestion => {
      const key = suggestion.text.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    return unique.slice(0, 8);
  }, [showSuggestions, query, suggestions, getHistorySuggestions, history]);

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);
    setShowSuggestions(value.length > 0);
  };

  // 处理键盘导航
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || allSuggestions.length === 0) {
      if (e.key === 'Enter') {
        handleSearch(query);
      } else if (e.key === 'Escape') {
        if (query) {
          // 如果有查询内容，清空它
          handleClearSearch();
        } else {
          // 如果没有查询内容，失去焦点
          inputRef.current?.blur();
        }
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < allSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSuggestionClick(allSuggestions[selectedIndex].text);
        } else {
          handleSearch(query);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // 处理搜索提交
  const handleSearch = (searchQuery: string) => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;

    // 添加到搜索历史
    addToHistory(trimmedQuery);

    setShowSuggestions(false);
    setSelectedIndex(-1);
    
    if (onSearch) {
      onSearch(trimmedQuery);
    } else {
      // 默认跳转到搜索结果页
      window.location.href = `/portal/search?q=${encodeURIComponent(trimmedQuery)}`;
    }
  };

  // 处理建议点击
  const handleSuggestionClick = (suggestionText: string) => {
    setQuery(suggestionText);
    handleSearch(suggestionText);
  };

  // 处理清空搜索
  const handleClearSearch = () => {
    setQuery('');
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
    
    // 如果当前在搜索结果页面，清空后跳转到首页
    if (typeof window !== 'undefined' && window.location.pathname === '/portal/search') {
      window.location.href = '/portal';
    }
  };

  // 处理焦点
  const handleFocus = () => {
    // 聚焦时总是显示建议（包括空输入框时的历史记录）
    setShowSuggestions(true);
  };

  const handleBlur = () => {
    // 延迟隐藏，允许点击建议
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }, 200);
  };

  // 获取建议项的样式类名
  const getSuggestionClassName = (index: number) => {
    const baseClass = "px-4 py-2 cursor-pointer text-sm hover:bg-gray-50 flex items-center justify-between";
    return selectedIndex === index 
      ? `${baseClass} bg-red-50 text-red-600`
      : baseClass;
  };

  // 获取建议类型图标
  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'title_phrase':
        return (
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'channel':
        return (
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        );
      case 'trending':
        return (
          <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      case 'history':
        return (
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        );
    }
  };

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={(e) => { e.preventDefault(); handleSearch(query); }}>
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoFocus={autoFocus}
          className="w-full px-4 py-2 pl-10 pr-10 bg-gray-100 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
        />
        
        {/* 搜索图标 */}
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-4 w-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* 清空按钮 */}
        {query && !loading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <button
              type="button"
              onClick={handleClearSearch}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-200"
              aria-label="清空搜索"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* 加载指示器 */}
        {loading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-red-500"></div>
          </div>
        )}
      </form>

      {/* 搜索建议下拉框 */}
      {showSuggestions && (query.length > 0 || history.length > 0) && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
        >
          {allSuggestions.length > 0 ? (
            <>
              {/* 空输入框时显示历史记录标题 */}
              {query.length === 0 && (
                <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
                  最近搜索
                </div>
              )}
              {allSuggestions.map((suggestion, index) => (
                <div
                  key={`${suggestion.text}-${index}`}
                  className={getSuggestionClassName(index)}
                  onClick={() => handleSuggestionClick(suggestion.text)}
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {getSuggestionIcon(suggestion.type)}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {suggestion.text}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {suggestion.reason}
                      </div>
                    </div>
                  </div>
                  {suggestion.type === 'trending' && (
                    <span className="text-xs text-red-500 font-medium">热搜</span>
                  )}
                </div>
              ))}
              
              {/* 空输入框时显示清除历史选项 */}
              {query.length === 0 && history.length > 0 && (
                <div className="border-t border-gray-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // 这里可以添加清除历史的功能
                      setShowSuggestions(false);
                    }}
                    className="w-full px-4 py-2 text-xs text-gray-500 hover:bg-gray-50 text-left"
                  >
                    清除搜索历史
                  </button>
                </div>
              )}
            </>
          ) : (
            !loading && (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                {query.length === 0 ? '暂无搜索历史' : '暂无搜索建议'}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
