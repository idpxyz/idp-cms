"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  memo,
  useMemo,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { useCategories } from "./CategoryContext";
import { useChannels } from "./ChannelContext";

interface CategoryNavigationProps {
  showOnlyForChannel?: string; // 仅为特定频道显示分类
  enableHierarchy?: boolean;   // 是否显示层级结构
}

function CategoryNavigation({
  showOnlyForChannel,
  enableHierarchy = false,
}: CategoryNavigationProps) {
  const { 
    categories, 
    categoriesTree, 
    loading, 
    error, 
    currentCategorySlug, 
    switchCategory,
    getCurrentCategory,
    getCategoriesByChannel
  } = useCategories();
  
  const { currentChannelSlug } = useChannels();
  const router = useRouter();
  const pathname = usePathname();
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [visibleCount, setVisibleCount] = useState(6);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 客户端水合处理
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 根据当前频道过滤分类
  const displayCategories = useMemo(() => {
    if (showOnlyForChannel) {
      return getCategoriesByChannel(showOnlyForChannel);
    }
    
    // 如果当前在分类页面，显示所有分类
    if (pathname.includes('/category/')) {
      return categories;
    }
    
    // 根据当前频道过滤分类
    if (currentChannelSlug && currentChannelSlug !== 'recommend') {
      const channelCategories = getCategoriesByChannel(currentChannelSlug);
      return channelCategories.length > 0 ? channelCategories : categories.slice(0, 10); // 如果没有匹配，显示前10个
    }
    
    // 默认显示所有活跃分类
    return categories.filter(cat => cat.is_active).slice(0, 15);
  }, [categories, currentChannelSlug, pathname, getCategoriesByChannel, showOnlyForChannel]);

  // 响应式计算显示的分类数量
  const { visibleCategories, moreCategories } = useMemo(() => {
    if (!isClient || displayCategories.length === 0) {
      return { visibleCategories: [], moreCategories: [] };
    }
    
    const count = Math.min(visibleCount, displayCategories.length);
    
    // 如果当前选中的分类在"更多"区域，将其移到显示区域
    let finalCategories = [...displayCategories];
    if (currentCategorySlug) {
      const currentCategoryIndex = finalCategories.findIndex(cat => cat.slug === currentCategorySlug);
      
      if (currentCategoryIndex >= count) {
        const currentCategory = finalCategories[currentCategoryIndex];
        const visibleCats = finalCategories.slice(0, count);
        const moreCats = finalCategories.slice(count);
        
        // 移除当前分类从更多列表
        const updatedMoreCats = moreCats.filter(cat => cat.slug !== currentCategorySlug);
        
        // 将显示区域最后一个分类移到更多列表开头
        const lastVisibleCat = visibleCats[visibleCats.length - 1];
        const updatedVisibleCats = [...visibleCats.slice(0, -1), currentCategory];
        
        finalCategories = [...updatedVisibleCats, lastVisibleCat, ...updatedMoreCats];
      }
    }
    
    return {
      visibleCategories: finalCategories.slice(0, count),
      moreCategories: finalCategories.slice(count),
    };
  }, [displayCategories, visibleCount, isClient, currentCategorySlug]);

  // 响应式计算显示数量
  useEffect(() => {
    if (!isClient || !containerRef.current) return;

    const calculateVisibleCount = () => {
      if (!containerRef.current) return;
      
      const containerWidth = containerRef.current.offsetWidth;
      const moreButtonWidth = 80; // "更多"按钮预留宽度
      const itemWidth = 100; // 每个分类按钮的平均宽度
      const availableWidth = containerWidth - moreButtonWidth;
      
      let count = Math.floor(availableWidth / itemWidth);
      count = Math.max(3, Math.min(count, displayCategories.length)); // 至少显示3个，最多显示所有
      
      setVisibleCount(count);
    };

    const resizeObserver = new ResizeObserver(calculateVisibleCount);
    resizeObserver.observe(containerRef.current);
    
    setTimeout(calculateVisibleCount, 0);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [isClient, displayCategories.length]);

  // 点击外部关闭下拉框
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // 分类点击处理
  const handleCategoryClick = useCallback((categorySlug: string) => {
    if (currentCategorySlug === categorySlug) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setIsDropdownOpen(false);
      return;
    }

    setIsDropdownOpen(false);
    switchCategory(categorySlug);
  }, [currentCategorySlug, switchCategory]);

  // 显示全部分类
  const handleShowAllCategories = useCallback(() => {
    router.push('/portal/category');
  }, [router]);

  // 如果没有分类数据或正在加载，不显示
  if (!isClient || loading || displayCategories.length === 0) {
    return null;
  }

  // 如果出错，不显示
  if (error) {
    return null;
  }

  return (
    <section className="bg-gray-50 border-b border-gray-200 sticky z-20" style={{ top: "calc(var(--sticky-offset) + 60px)" }}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between py-2">
          {/* 左侧：分类列表 */}
          <div ref={containerRef} className="flex-1 flex items-center space-x-2 overflow-hidden">
            {/* 全部按钮 */}
            <button
              onClick={() => handleCategoryClick('')}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                !currentCategorySlug
                  ? "bg-blue-500 text-white"
                  : "text-gray-600 hover:text-blue-500 hover:bg-blue-50"
              }`}
            >
              全部
            </button>

            {/* 显示的分类 */}
            {visibleCategories.map((category) => (
              <button
                key={category.slug}
                onClick={() => handleCategoryClick(category.slug)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  currentCategorySlug === category.slug
                    ? "bg-blue-500 text-white"
                    : "text-gray-600 hover:text-blue-500 hover:bg-blue-50"
                }`}
                title={category.description || undefined}
              >
                {category.name}
                {category.articles_count > 0 && (
                  <span className="ml-1 text-xs opacity-75">
                    ({category.articles_count})
                  </span>
                )}
              </button>
            ))}

            {/* 更多按钮 */}
            {moreCategories.length > 0 && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium text-gray-600 hover:text-blue-500 hover:bg-blue-50 border border-gray-300 hover:border-blue-300 transition-all duration-200 flex items-center space-x-1"
                >
                  <span>更多</span>
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isDropdownOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* 下拉菜单 */}
                {isDropdownOpen && (
                  <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-w-[calc(100vw-2rem)] sm:w-80 overflow-hidden">
                    <div className="p-3">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                        {moreCategories.map((category) => (
                          <button
                            key={category.slug}
                            onClick={() => handleCategoryClick(category.slug)}
                            className={`px-3 py-2 text-sm rounded-md transition-colors text-center whitespace-nowrap ${
                              currentCategorySlug === category.slug
                                ? "bg-blue-50 text-blue-500"
                                : "text-gray-700 hover:bg-blue-50 hover:text-blue-500"
                            }`}
                            title={category.description || undefined}
                          >
                            {category.name}
                            {category.articles_count > 0 && (
                              <div className="text-xs text-gray-500 mt-0.5">
                                {category.articles_count}篇
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                      
                      {/* 查看全部分类 */}
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <button
                          onClick={handleShowAllCategories}
                          className="w-full px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          查看全部分类 →
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 右侧：当前分类信息 */}
          {currentCategorySlug && getCurrentCategory() && (
            <div className="flex-shrink-0 ml-4 text-sm text-gray-500">
              <span className="hidden md:inline">
                当前分类：{getCurrentCategory()?.name}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default memo(CategoryNavigation);
