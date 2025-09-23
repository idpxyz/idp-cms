'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  getChannelMegaMenuData, 
  MegaMenuCategory, 
  MegaMenuHotArticle,
  formatCount,
  formatTimeAgo
} from './MegaMenu.utils';

export interface MegaMenuProps {
  channelId: string;
  channelName: string;
  channelSlug: string;
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
  className?: string;
}

const MegaMenu: React.FC<MegaMenuProps> = ({
  channelId,
  channelName,
  channelSlug,
  isOpen,
  onClose,
  triggerRef,
  className = '',
}) => {
  const [categories, setCategories] = useState<MegaMenuCategory[]>([]);
  const [hotArticles, setHotArticles] = useState<MegaMenuHotArticle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const menuRef = useRef<HTMLDivElement>(null);

  // 获取 MegaMenu 数据
  useEffect(() => {
    if (!isOpen) return;

    async function fetchMegaMenuData() {
      setIsLoading(true);
      setError('');
      
      try {
        const data = await getChannelMegaMenuData(channelSlug);
        setCategories(data.categories);
        setHotArticles(data.hotArticles);
        console.log(`MegaMenu data loaded for ${channelSlug}:`, data);
      } catch (err) {
        console.error(`Error loading MegaMenu data for ${channelSlug}:`, err);
        setError('加载失败');
      } finally {
        setIsLoading(false);
      }
    }

    fetchMegaMenuData();
  }, [isOpen, channelSlug]);

  // 处理点击外部关闭
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      
      // 如果点击的是触发器或菜单内部，不关闭
      if (
        (triggerRef.current && triggerRef.current.contains(target)) ||
        (menuRef.current && menuRef.current.contains(target))
      ) {
        return;
      }
      
      onClose();
    }

    // 稍微延迟添加事件监听器，避免立即触发
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

  // 键盘操作支持
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="megamenu-responsive absolute top-full left-1/2 transform -translate-x-1/2 z-50 mt-2">
      <div
        ref={menuRef}
        className={`max-w-7xl mx-auto bg-white shadow-2xl border border-gray-200 rounded-lg ${className}`}
        role="menu"
        aria-label={`${channelName}频道菜单`}
      >
        {/* 加载状态 */}
        {isLoading && (
          <div className="px-4 py-8">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-600">加载中...</span>
            </div>
          </div>
        )}

        {/* 错误状态 */}
        {error && (
          <div className="px-4 py-8 text-center">
          <div className="text-gray-500 mb-2">{error}</div>
          <button
            onClick={() => {
              setError('');
              // 重新触发数据获取
              const fetchData = async () => {
                try {
                  const data = await getChannelMegaMenuData(channelSlug);
                  setCategories(data.categories);
                  setHotArticles(data.hotArticles);
                } catch (err) {
                  setError('加载失败');
                }
              };
              fetchData();
            }}
            className="text-red-600 hover:text-red-700 button-text"
          >
            重试
          </button>
          </div>
        )}

        {/* 内容区域 - 使用与 PageContainer 相同的宽度设置 */}
        {!isLoading && !error && (
          <div className="px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            
            {/* 左侧：分类 Chips */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <h3 className="news-title-small font-bold text-gray-900">
                  {channelName} 分类
                </h3>
                <Link
                  href={`/portal/channel/${channelSlug}/categories`}
                  className="news-meta-small text-red-600 hover:text-red-700 flex items-center space-x-1"
                  onClick={onClose}
                >
                  <span>全部分类</span>
                  <svg className="w-3 h-3 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              {/* 分类网格 - 响应式 */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-3">
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/portal/channel/${channelSlug}/category/${category.slug}`}
                    onClick={onClose}
                    className="group p-3 lg:p-4 bg-gray-50 hover:bg-red-50 rounded-lg transition-all duration-200 border border-transparent hover:border-red-200"
                    role="menuitem"
                  >
                    <div className="flex items-center justify-between mb-1 lg:mb-2">
                      <h4 className="news-meta font-medium text-gray-900 group-hover:text-red-600 transition-colors">
                        {category.name}
                      </h4>
                      {category.article_count !== undefined && (
                        <span className="news-meta-small text-gray-500 bg-white px-1.5 lg:px-2 py-0.5 lg:py-1 rounded-full">
                          {formatCount(category.article_count)}
                        </span>
                      )}
                    </div>
                    {category.description && (
                      <p className="news-meta-small text-gray-600 line-clamp-2 hidden lg:block">
                        {category.description}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </div>

            {/* 右侧：本频道最热 Top-5 */}
            <div className="lg:col-span-1">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <h3 className="news-title-small font-bold text-gray-900">
                  本频道最热
                </h3>
                <Link
                  href={`/portal/channel/${channelSlug}/hot`}
                  className="news-meta-small text-red-600 hover:text-red-700"
                  onClick={onClose}
                >
                  更多
                </Link>
              </div>

              {/* 热门文章列表 */}
              <div className="space-y-2 lg:space-y-3">
                {hotArticles.map((article, index) => (
                  <Link
                    key={article.id}
                    href={`/portal/article/${article.slug}`}
                    onClick={onClose}
                    className="group block p-2 lg:p-3 hover:bg-gray-50 rounded-lg transition-all duration-200"
                    role="menuitem"
                  >
                    <div className="flex space-x-2 lg:space-x-3">
                      {/* 排名 */}
                      <div className="flex-shrink-0 w-5 lg:w-6 h-5 lg:h-6 flex items-center justify-center">
                        <span 
                          className={`news-meta-small font-bold ${
                            index < 3 
                              ? 'text-red-600' 
                              : 'text-gray-500'
                          }`}
                        >
                          {index + 1}
                        </span>
                      </div>

                      {/* 缩略图 */}
                      <div className="flex-shrink-0 w-14 lg:w-16 h-10 lg:h-12 bg-gray-200 rounded overflow-hidden">
                        {article.image_url ? (
                          <Image
                            src={article.image_url}
                            alt={article.title}
                            width={64}
                            height={48}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            sizes="64px"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-r from-gray-300 to-gray-400 flex items-center justify-center">
                            <span className="text-gray-600 news-meta-small">暂无图</span>
                          </div>
                        )}
                      </div>

                      {/* 内容 */}
                      <div className="flex-1 min-w-0">
                        <h4 className="news-meta-small font-medium text-gray-900 line-clamp-2 group-hover:text-red-600 transition-colors mb-1">
                          {article.title}
                        </h4>
                        
                        <div className="flex items-center justify-between news-meta-small text-gray-500">
                          <span className="news-meta-small">{formatTimeAgo(article.publish_time)}</span>
                          <div className="flex items-center space-x-1 lg:space-x-2">
                            <span className="hidden lg:inline">{formatCount(article.view_count)}阅读</span>
                            {(article.is_breaking || article.is_live) && (
                              <div className="flex space-x-0.5 lg:space-x-1">
                                {article.is_breaking && (
                                  <span className="bg-red-500 text-white news-meta-small px-1 py-0.5 rounded">
                                    突发
                                  </span>
                                )}
                                {article.is_live && (
                                  <span className="bg-red-600 text-white news-meta-small px-1 py-0.5 rounded">
                                    直播
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* 底部快速链接 */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex space-x-6">
                <Link
                  href={`/portal/channel/${channelSlug}`}
                  className="news-meta text-gray-600 hover:text-red-600 transition-colors"
                  onClick={onClose}
                >
                  进入{channelName}频道
                </Link>
                <Link
                  href={`/portal/channel/${channelSlug}/latest`}
                  className="news-meta text-gray-600 hover:text-red-600 transition-colors"
                  onClick={onClose}
                >
                  最新文章
                </Link>
                <Link
                  href={`/portal/channel/${channelSlug}/featured`}
                  className="news-meta text-gray-600 hover:text-red-600 transition-colors"
                  onClick={onClose}
                >
                  精选内容
                </Link>
              </div>
              
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="关闭菜单"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
};

export default MegaMenu;
