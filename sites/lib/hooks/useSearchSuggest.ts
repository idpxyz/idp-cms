"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

export interface SearchSuggestion {
  text: string;
  type: 'title_phrase' | 'keyword_combination' | 'channel' | 'trending';
  reason: string;
  score: number;
}

export interface SearchSuggestResponse {
  success: boolean;
  data: SearchSuggestion[];
  query: string;
  error?: string;
}

export interface UseSearchSuggestOptions {
  enabled?: boolean;
  debounceMs?: number;
  minQueryLength?: number;
  maxSuggestions?: number;
}

export function useSearchSuggest(
  query: string,
  options: UseSearchSuggestOptions = {}
) {
  const {
    enabled = true,
    debounceMs = 200,
    minQueryLength = 1,
    maxSuggestions = 8,
  } = options;

  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (!enabled || !searchQuery || searchQuery.length < minQueryLength) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/search/suggest?q=${encodeURIComponent(searchQuery)}&limit=${maxSuggestions}`,
        {
          signal: abortControllerRef.current.signal,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: SearchSuggestResponse = await response.json();

      if (data.success) {
        setSuggestions(data.data || []);
        setError(null);
      } else {
        setSuggestions([]);
        setError(data.error || '获取搜索建议失败');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Search suggest error:', err);
        setSuggestions([]);
        setError('搜索建议服务暂时不可用');
      }
    } finally {
      setLoading(false);
    }
  }, [enabled, minQueryLength, maxSuggestions]);

  // 防抖处理
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      fetchSuggestions(query.trim());
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query, fetchSuggestions, debounceMs]);

  // 清理函数
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    suggestions,
    loading,
    error,
    refetch: () => fetchSuggestions(query.trim()),
  };
}
