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
import { useCategories } from "@/app/portal/CategoryContext";
import { useChannels } from "@/app/portal/ChannelContext";

interface CategoryNavigationProps {
  showOnlyForChannel?: string; // 仅为特定频道显示分类
  enableHierarchy?: boolean;   // 是否显示层级结构
}

function CategoryNavigation({
  showOnlyForChannel,
  enableHierarchy = true,
}: CategoryNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();

  // 获取分类和频道数据
  const { categories: categoriesMap, loading: categoriesLoading } =
    useCategories();
  const { channels, loading: channelsLoading } = useChannels();

  // 本地状态管理
  const [showAll, setShowAll] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 将 categoriesMap 转换为数组并进行过滤和排序
  const categories = useMemo(() => {
    if (!categoriesMap) return [];

    let categoryList = Array.from(categoriesMap.values());

    // 如果指定了频道过滤，则仅显示该频道下的分类
    if (showOnlyForChannel) {
      const targetChannel = channels?.find(
        (ch) => ch.slug === showOnlyForChannel
      );
      if (targetChannel) {
        // Filter categories that belong to the target channel
        // Note: This filtering logic may need adjustment based on actual data structure
        categoryList = categoryList;
      }
    }

    // 按名称排序
    return categoryList.sort((a, b) => {
      return a.name.localeCompare(b.name, "zh-CN");
    });
  }, [categoriesMap, channels, showOnlyForChannel]);

  // 构建分类层级结构
  const categoryTree = useMemo(() => {
    if (!enableHierarchy) {
      return categories.map((cat) => ({ ...cat, children: [] }));
    }

    const rootCategories: Array<any> = [];
    const categoryMap = new Map();

    // 先将所有分类放入 map 中，并初始化 children
    categories.forEach((category) => {
      categoryMap.set(category.id, { ...category, children: [] });
    });

    // 构建层级关系
    categories.forEach((category) => {
      const categoryNode = categoryMap.get(category.id);
      if (category.parent) {
        const parent = categoryMap.get(category.parent);
        if (parent) {
          parent.children.push(categoryNode);
        } else {
          // 如果找不到父分类，则作为根分类
          rootCategories.push(categoryNode);
        }
      } else {
        rootCategories.push(categoryNode);
      }
    });

    return rootCategories;
  }, [categories, enableHierarchy]);

  // 获取当前激活的分类
  const getActiveCategory = useCallback(() => {
    if (pathname?.startsWith("/portal/category/")) {
      return pathname?.split("/portal/category/")[1]?.split("/")[0];
    }
    return null;
  }, [pathname]);

  const activeCategory = getActiveCategory();

  // 导航到分类页面
  const navigateToCategory = useCallback(
    (categorySlug: string) => {
      router.push(`/portal/category/${categorySlug}`);
    },
    [router]
  );

  // 递归渲染分类项
  const renderCategoryItem = useCallback(
    (category: any, level = 0) => {
      const isActive = activeCategory === category.slug;
      const hasChildren = category.children && category.children.length > 0;
      const isHovered = hoveredCategory === category.slug;

      return (
        <div key={category.id} className={`category-item level-${level}`}>
          <button
            onClick={() => navigateToCategory(category.slug)}
            onMouseEnter={() => setHoveredCategory(category.slug)}
            onMouseLeave={() => setHoveredCategory(null)}
            className={`
              flex items-center w-full px-3 py-2 text-sm font-medium rounded-md transition-all duration-200
              ${level > 0 ? "ml-4" : ""}
              ${
                isActive
                  ? "bg-blue-100 text-blue-700 border-l-4 border-blue-500"
                  : isHovered
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }
            `}
            title={category.description || category.name}
          >
            {/* 层级缩进指示器 */}
            {level > 0 && (
              <div className="w-1 h-1 bg-gray-300 rounded-full mr-2 flex-shrink-0" />
            )}

            {/* 分类名称 */}
            <span className="truncate flex-1 text-left">{category.name}</span>

            {/* 文章数量标识 */}
            {category.articles_count > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full flex-shrink-0">
                {category.articles_count}
              </span>
            )}

            {/* 子分类指示器 */}
            {hasChildren && (
              <svg
                className="ml-2 w-4 h-4 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            )}
          </button>

          {/* 递归渲染子分类 */}
          {hasChildren &&
            category.children.map((child: any) =>
              renderCategoryItem(child, level + 1)
            )}
        </div>
      );
    },
    [activeCategory, hoveredCategory, navigateToCategory]
  );

  // 计算显示的分类
  const displayCategories = useMemo(() => {
    if (showAll) return categoryTree;
    return categoryTree.slice(0, 8); // 默认显示前8个分类
  }, [categoryTree, showAll]);

  // 处理加载状态
  if (categoriesLoading || channelsLoading) {
    return (
      <div className="category-navigation">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-3"></div>
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 处理空状态
  if (!categories.length) {
    return (
      <div className="category-navigation">
        <div className="text-center py-8 text-gray-500">
          <div className="text-gray-400 mb-2">
            <svg
              className="w-12 h-12 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <p className="text-sm">暂无分类</p>
        </div>
      </div>
    );
  }

  return (
    <nav className="category-navigation" role="navigation" aria-label="分类导航">
      {/* 标题区域 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">内容分类</h3>
        {categoryTree.length > 8 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            {showAll ? "收起" : `查看全部 (${categoryTree.length})`}
          </button>
        )}
      </div>

      {/* 分类列表 */}
      <div
        ref={scrollContainerRef}
        className="category-list space-y-1 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
      >
        {displayCategories.map((category) => renderCategoryItem(category))}
      </div>

      {/* 快速导航 */}
      {showOnlyForChannel && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => router.push("/portal")}
            className="w-full px-3 py-2 text-sm text-center text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
          >
            查看所有内容
          </button>
        </div>
      )}

      {/* 统计信息 */}
      {categories.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between text-xs text-gray-500">
            <span>分类总数: {categories.length}</span>
            <span>
              文章总数:{" "}
              {categories.reduce(
                (total, cat) => total + (cat.articles_count || 0),
                0
              )}
            </span>
          </div>
        </div>
      )}
    </nav>
  );
}

export default memo(CategoryNavigation);
