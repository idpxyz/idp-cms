"use client";

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
// import { getChannelMegaMenuCategories, getChannelMegaMenuHotArticles, MegaMenuCategory, MegaMenuHotArticle } from './MegaMenu.utils';
import type { Channel } from '@/lib/api';

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
  const menuRef = useRef<HTMLDivElement>(null);

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
          <h2 className="section-title">频道导航</h2>
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
            <h3 className="news-meta font-medium text-gray-500 uppercase tracking-wide mb-3">
              频道
            </h3>
            
            <div className="space-y-1">
              {channels.map((channel) => (
                <Link
                  key={channel.id}
                  href={`/portal?channel=${channel.slug}`}
                  onClick={onClose}
                  className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all block ${
                    currentChannelSlug === channel.slug
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="font-medium">{channel.name}</span>
                  {currentChannelSlug === channel.slug && (
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  )}
                </Link>
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
