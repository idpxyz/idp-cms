"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { categoryService, Category } from '@/lib/api';

// 全局缓存，防止多次加载
let globalCategoriesCache: Category[] | null = null;
let globalCategoriesCacheTime: number = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10分钟缓存
const STORAGE_KEY = 'idp-cms-categories-cache';
const STORAGE_TIME_KEY = 'idp-cms-categories-cache-time';

// 从浏览器存储加载缓存
const loadCategoriesFromStorage = (): { categories: Category[] | null; cacheTime: number } => {
  try {
    if (typeof window === 'undefined') return { categories: null, cacheTime: 0 };
    
    const storedCategories = sessionStorage.getItem(STORAGE_KEY);
    const storedTime = sessionStorage.getItem(STORAGE_TIME_KEY);
    
    if (storedCategories && storedTime) {
      const categories = JSON.parse(storedCategories);
      const cacheTime = parseInt(storedTime);
      
      // 检查缓存是否仍然有效
      if (Date.now() - cacheTime < CACHE_DURATION) {
        return { categories, cacheTime };
      }
    }
  } catch (error) {
    console.warn('Failed to load categories from storage:', error);
  }
  
  return { categories: null, cacheTime: 0 };
};

// 保存分类到浏览器存储
const saveCategoriesToStorage = (categories: Category[], cacheTime: number) => {
  try {
    if (typeof window === 'undefined') return;
    
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
    sessionStorage.setItem(STORAGE_TIME_KEY, cacheTime.toString());
  } catch (error) {
    console.warn('Failed to save categories to storage:', error);
  }
};

interface CategoryContextType {
  categories: Category[];
  categoriesTree: Category[];
  loading: boolean;
  error: string | null;
  refreshCategories: () => Promise<void>;
  // 分类管理接口
  currentCategorySlug: string;
  switchCategory: (categorySlug: string) => void;
  getCurrentCategory: () => Category | undefined;
  getCategoryBySlug: (slug: string) => Category | undefined;
  getCategoriesByChannel: (channelSlug: string) => Category[];
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

interface CategoryProviderProps {
  children: ReactNode;
  initialCategories?: Category[];
}

export function CategoryProvider({ children, initialCategories = [] }: CategoryProviderProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [categoriesTree, setCategoriesTree] = useState<Category[]>([]);
  const [loading, setLoading] = useState(!initialCategories.length);
  const [error, setError] = useState<string | null>(null);
  
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  // 获取当前分类slug
  const currentCategorySlug = useMemo(() => {
    // 从URL路径中提取分类slug
    const categoryMatch = pathname.match(/\/category\/([^\/]+)/);
    if (categoryMatch) return categoryMatch[1];
    
    // 从查询参数中获取
    return searchParams.get('category') || '';
  }, [pathname, searchParams]);

  // 获取分类数据
  const fetchCategories = useCallback(async (useCache: boolean = true) => {
    try {
      setLoading(true);
      setError(null);

      // 尝试从缓存加载
      if (useCache && !globalCategoriesCache) {
        const { categories: cachedCategories, cacheTime } = loadCategoriesFromStorage();
        if (cachedCategories) {
          globalCategoriesCache = cachedCategories;
          globalCategoriesCacheTime = cacheTime;
        }
      }

      // 使用缓存数据
      if (useCache && globalCategoriesCache) {
        setCategories(globalCategoriesCache);
        
        // 同时获取树状结构
        try {
          const tree = await categoryService.getCategoriesTree();
          setCategoriesTree(tree);
        } catch (treeError) {
          console.warn('Failed to fetch categories tree:', treeError);
          setCategoriesTree([]);
        }
        
        setLoading(false);
        return;
      }

      console.log('Fetching categories from API...');
      
      // 并行获取平铺和树状数据
      const [flatCategories, treeCategories] = await Promise.allSettled([
        categoryService.getCategories(),
        categoryService.getCategoriesTree()
      ]);

      if (flatCategories.status === 'fulfilled') {
        const categoriesData = flatCategories.value;
        
        setCategories(categoriesData);
        
        // 更新全局缓存
        const now = Date.now();
        globalCategoriesCache = categoriesData;
        globalCategoriesCacheTime = now;
        
        // 保存到存储
        saveCategoriesToStorage(categoriesData, now);
        
        console.log('Successfully loaded', categoriesData.length, 'categories');
      } else {
        throw flatCategories.reason;
      }

      if (treeCategories.status === 'fulfilled') {
        setCategoriesTree(treeCategories.value);
      } else {
        console.warn('Failed to fetch categories tree:', treeCategories.reason);
        setCategoriesTree([]);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load categories';
      console.error('Error fetching categories:', err);
      setError(errorMessage);
      
      // 降级处理：使用空数组
      setCategories([]);
      setCategoriesTree([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 刷新分类数据
  const refreshCategories = useCallback(async () => {
    // 清除缓存
    globalCategoriesCache = null;
    globalCategoriesCacheTime = 0;
    
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(STORAGE_TIME_KEY);
      } catch (error) {
        console.warn('Failed to clear categories cache:', error);
      }
    }
    
    await fetchCategories(false);
  }, [fetchCategories]);

  // 切换分类
  const switchCategory = useCallback((categorySlug: string) => {
    if (!categorySlug || categorySlug === currentCategorySlug) return;
    
    // 构建新的URL
    const newUrl = categorySlug === 'all' ? '/portal' : `/portal/category/${categorySlug}`;
    
    // 使用路由导航
    router.push(newUrl);
  }, [currentCategorySlug, router]);

  // 获取当前分类
  const getCurrentCategory = useCallback(() => {
    if (!currentCategorySlug) return undefined;
    return categories.find(cat => cat.slug === currentCategorySlug);
  }, [currentCategorySlug, categories]);

  // 根据slug获取分类
  const getCategoryBySlug = useCallback((slug: string) => {
    return categories.find(cat => cat.slug === slug);
  }, [categories]);

  // 根据频道获取分类
  const getCategoriesByChannel = useCallback((channelSlug: string) => {
    return categories.filter(cat => 
      cat.channel_names && cat.channel_names.includes(channelSlug)
    );
  }, [categories]);

  // 初始化时获取分类数据
  useEffect(() => {
    if (initialCategories.length === 0) {
      fetchCategories();
    }
  }, [fetchCategories, initialCategories.length]);

  const contextValue: CategoryContextType = useMemo(() => ({
    categories,
    categoriesTree,
    loading,
    error,
    refreshCategories,
    currentCategorySlug,
    switchCategory,
    getCurrentCategory,
    getCategoryBySlug,
    getCategoriesByChannel,
  }), [
    categories,
    categoriesTree,
    loading,
    error,
    refreshCategories,
    currentCategorySlug,
    switchCategory,
    getCurrentCategory,
    getCategoryBySlug,
    getCategoriesByChannel,
  ]);

  return (
    <CategoryContext.Provider value={contextValue}>
      {children}
    </CategoryContext.Provider>
  );
}

export function useCategories() {
  const context = useContext(CategoryContext);
  if (context === undefined) {
    throw new Error('useCategories must be used within a CategoryProvider');
  }
  return context;
}

// 导出类型供其他组件使用
export type { Category };
