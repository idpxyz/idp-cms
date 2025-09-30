"use client";

import { useState, useEffect, useCallback } from 'react';

export interface SearchHistoryItem {
  query: string;
  timestamp: number;
  count: number; // 搜索次数
}

export interface UseSearchHistoryOptions {
  maxItems?: number;
  storageKey?: string;
  enabled?: boolean;
}

export function useSearchHistory(options: UseSearchHistoryOptions = {}) {
  const {
    maxItems = 20,
    storageKey = 'search_history',
    enabled = true,
  } = options;

  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  // 从本地存储加载历史记录
  const loadHistory = useCallback(() => {
    if (!enabled || typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed: SearchHistoryItem[] = JSON.parse(stored);
        // 按时间戳降序排序
        const sorted = parsed.sort((a, b) => b.timestamp - a.timestamp);
        setHistory(sorted.slice(0, maxItems));
      }
    } catch (error) {
      console.warn('Failed to load search history:', error);
      setHistory([]);
    }
  }, [enabled, storageKey, maxItems]);

  // 保存历史记录到本地存储
  const saveHistory = useCallback((newHistory: SearchHistoryItem[]) => {
    if (!enabled || typeof window === 'undefined') return;

    try {
      localStorage.setItem(storageKey, JSON.stringify(newHistory));
    } catch (error) {
      console.warn('Failed to save search history:', error);
    }
  }, [enabled, storageKey]);

  // 添加搜索记录
  const addToHistory = useCallback((query: string) => {
    if (!enabled || !query.trim()) return;

    const trimmedQuery = query.trim();
    const timestamp = Date.now();

    setHistory(currentHistory => {
      // 检查是否已存在
      const existingIndex = currentHistory.findIndex(
        item => item.query.toLowerCase() === trimmedQuery.toLowerCase()
      );

      let newHistory: SearchHistoryItem[];

      if (existingIndex >= 0) {
        // 更新现有记录
        const existing = currentHistory[existingIndex];
        const updated: SearchHistoryItem = {
          ...existing,
          timestamp,
          count: existing.count + 1,
        };

        newHistory = [
          updated,
          ...currentHistory.slice(0, existingIndex),
          ...currentHistory.slice(existingIndex + 1),
        ];
      } else {
        // 添加新记录
        const newItem: SearchHistoryItem = {
          query: trimmedQuery,
          timestamp,
          count: 1,
        };

        newHistory = [newItem, ...currentHistory];
      }

      // 限制数量
      const limited = newHistory.slice(0, maxItems);
      saveHistory(limited);
      
      return limited;
    });
  }, [enabled, maxItems, saveHistory]);

  // 删除单个历史记录
  const removeFromHistory = useCallback((query: string) => {
    if (!enabled) return;

    setHistory(currentHistory => {
      const filtered = currentHistory.filter(
        item => item.query.toLowerCase() !== query.toLowerCase()
      );
      saveHistory(filtered);
      return filtered;
    });
  }, [enabled, saveHistory]);

  // 清空所有历史记录
  const clearHistory = useCallback(() => {
    if (!enabled) return;

    setHistory([]);
    saveHistory([]);
  }, [enabled, saveHistory]);

  // 获取搜索建议（基于历史记录）
  const getHistorySuggestions = useCallback((query: string, limit: number = 5) => {
    if (!enabled || !query.trim()) return [];

    const trimmedQuery = query.trim().toLowerCase();
    
    return history
      .filter(item => 
        item.query.toLowerCase().includes(trimmedQuery) &&
        item.query.toLowerCase() !== trimmedQuery
      )
      .sort((a, b) => {
        // 优先按匹配度排序，然后按使用频率和时间
        const aStartsWith = a.query.toLowerCase().startsWith(trimmedQuery);
        const bStartsWith = b.query.toLowerCase().startsWith(trimmedQuery);
        
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        
        // 都以查询开头或都不以查询开头，按count和timestamp排序
        if (a.count !== b.count) return b.count - a.count;
        return b.timestamp - a.timestamp;
      })
      .slice(0, limit)
      .map(item => ({
        text: item.query,
        type: 'history' as const,
        reason: `搜索${item.count}次`,
        score: item.count * 10 + (Date.now() - item.timestamp) / (1000 * 60 * 60), // 考虑频率和时间
      }));
  }, [enabled, history]);

  // 组件挂载时加载历史记录
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
    getHistorySuggestions,
    reload: loadHistory,
  };
}
