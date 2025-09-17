"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getChannelMegaMenuCategories, getChannelMegaMenuHotArticles, MegaMenuCategory, MegaMenuHotArticle } from './MegaMenu.utils';

interface Channel {
  id: string;
  name: string;
  slug: string;
}

interface MobileChannelMenuProps {
  channels: Channel[];
  currentChannelSlug?: string;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

const MobileChannelMenu: React.FC<MobileChannelMenuProps> = ({
  channels,
  currentChannelSlug,
  isOpen,
  onClose,
  className = '',
}) => {
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [categories, setCategories] = useState<MegaMenuCategory[]>([]);
  const [hotArticles, setHotArticles] = useState<MegaMenuHotArticle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 处理频道选择
  const handleChannelSelect = async (channel: Channel) => {
    if (activeChannel?.id === channel.id) {
      // 如果点击的是当前激活的频道，则关闭详情
      setActiveChannel(null);
      setCategories([]);
      setHotArticles([]);
      return;
    }

    setActiveChannel(channel);
    setIsLoading(true);
    
    try {
      const [fetchedCategories, fetchedHotArticles] = await Promise.all([
        getChannelMegaMenuCategories(channel.slug),
        getChannelMegaMenuHotArticles(channel.slug)
      ]);
      setCategories(fetchedCategories);
      setHotArticles(fetchedHotArticles);
    } catch (error) {
      console.error('Failed to fetch channel details:', error);
      setCategories([]);
      setHotArticles([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 关闭菜单时重置状态
  useEffect(() => {
    if (!isOpen) {
      setActiveChannel(null);
      setCategories([]);
      setHotArticles([]);
    }
  }, [isOpen]);

  // ESC 键关闭 + 控制 header 显示
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // 防止背景滚动
      
      // 隐藏所有 header 元素
      const headers = document.querySelectorAll('header');
      headers.forEach(header => {
        (header as HTMLElement).style.display = 'none';
      });
    } else {
      document.body.style.overflow = '';
      
      // 恢复所有 header 元素
      const headers = document.querySelectorAll('header');
      headers.forEach(header => {
        (header as HTMLElement).style.display = '';
      });
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      
      // 清理时恢复 header
      const headers = document.querySelectorAll('header');
      headers.forEach(header => {
        (header as HTMLElement).style.display = '';
      });
    };
  }, [isOpen, onClose]);

  // 阻止菜单内容区域的点击事件冒泡
  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  if (!isOpen) return null;

  return (
    <div 
      className={`mobile-menu-overlay ${className}`}
    >
      {/* 背景遮罩 - 点击关闭 */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-pointer" 
        onClick={onClose}
        aria-label="关闭菜单"
      />
      
      {/* 侧边菜单 */}
      <div 
        ref={menuRef}
        className="absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl transform transition-transform duration-300 ease-out overflow-hidden z-[100000]"
        style={{ zIndex: 100000 }}
        onClick={handleMenuClick}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-900">频道导航</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            aria-label="关闭菜单"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto">
          {/* 频道列表 */}
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
              频道
            </h3>
            
            <div className="space-y-1">
              {channels.map((channel) => (
                <div key={channel.id}>
                  {/* 频道按钮 */}
                  <button
                    onClick={() => handleChannelSelect(channel)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all ${
                      currentChannelSlug === channel.slug
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : activeChannel?.id === channel.id
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-medium">{channel.name}</span>
                    <div className="flex items-center space-x-2">
                      {currentChannelSlug === channel.slug && (
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      )}
                      <svg 
                        className={`w-4 h-4 transition-transform ${
                          activeChannel?.id === channel.id ? 'rotate-180' : ''
                        }`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* 频道详情展开区域 */}
                  {activeChannel?.id === channel.id && (
                    <div className="mt-2 ml-4 pl-4 border-l-2 border-gray-200">
                      {isLoading ? (
                        <div className="py-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-sm text-gray-600">加载中...</span>
                          </div>
                        </div>
                      ) : (
                        <div className="py-2 space-y-4">
                          {/* 分类列表 */}
                          {categories.length > 0 && (
                            <div>
                              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                                分类
                              </h4>
                              <div className="space-y-1">
                                {categories.slice(0, 6).map((category) => (
                                  <Link
                                    key={category.id}
                                    href={`/portal/channel/${channel.slug}/category/${category.slug}`}
                                    onClick={onClose}
                                    className="block p-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span>{category.name}</span>
                                      {category.article_count && (
                                        <span className="text-xs text-gray-400">
                                          {category.article_count > 1000 
                                            ? `${Math.floor(category.article_count / 1000)}k` 
                                            : category.article_count}
                                        </span>
                                      )}
                                    </div>
                                  </Link>
                                ))}
                              </div>
                              
                              {categories.length > 6 && (
                                <Link
                                  href={`/portal/channel/${channel.slug}/categories`}
                                  onClick={onClose}
                                  className="block mt-2 p-2 text-sm text-red-600 hover:bg-red-50 rounded text-center"
                                >
                                  查看全部分类 →
                                </Link>
                              )}
                            </div>
                          )}

                          {/* 热门文章 */}
                          {hotArticles.length > 0 && (
                            <div>
                              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                                热门文章
                              </h4>
                              <div className="space-y-2">
                                {hotArticles.slice(0, 3).map((article, index) => (
                                  <Link
                                    key={article.id}
                                    href={`/portal/article/${article.slug}`}
                                    onClick={onClose}
                                    className="block p-2 hover:bg-gray-50 rounded transition-colors"
                                  >
                                    <div className="flex items-start space-x-2">
                                      <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                                        index < 3 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                                      }`}>
                                        {index + 1}
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-900 line-clamp-2 leading-tight">
                                          {article.title}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                          {article.view_count && `${article.view_count > 1000 
                                            ? `${Math.floor(article.view_count / 1000)}k` 
                                            : article.view_count} 阅读`}
                                        </p>
                                      </div>
                                    </div>
                                  </Link>
                                ))}
                              </div>
                              
                              <Link
                                href={`/portal/channel/${channel.slug}/hot`}
                                onClick={onClose}
                                className="block mt-2 p-2 text-sm text-red-600 hover:bg-red-50 rounded text-center"
                              >
                                查看更多热门 →
                              </Link>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 底部快捷链接 */}
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="space-y-2">
              <Link
                href="/portal/search"
                onClick={onClose}
                className="flex items-center space-x-3 p-3 text-gray-700 hover:bg-white hover:text-red-600 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="font-medium">搜索</span>
              </Link>
              
              <Link
                href="/portal/trending"
                onClick={onClose}
                className="flex items-center space-x-3 p-3 text-gray-700 hover:bg-white hover:text-red-600 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span className="font-medium">热门趋势</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileChannelMenu;
