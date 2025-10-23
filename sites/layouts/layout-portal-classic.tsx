/**
 * Portal经典布局组件
 * 门户站点的标准布局
 */

"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { SiteSettings } from "@/lib/types";
import SmartSearchBox from "@/components/search/SmartSearchBox";
import BreakingTicker from "@/app/portal/components/BreakingTicker";
import { getBreakingNews } from "@/app/portal/components/BreakingTicker.utils";
import UserMenu from "@/components/auth/UserMenu";
import AuthModal from "@/components/auth/AuthModal";
import "@/styles/tokens.css";

interface PortalClassicLayoutProps {
  children: React.ReactNode;
  siteSettings: SiteSettings;
  initialBreakingNews?: any[]; // 预获取的快讯数据
}

export default function PortalClassicLayout({
  children,
  siteSettings,
  initialBreakingNews = [],
}: PortalClassicLayoutProps) {
  // 移动端搜索状态
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  
  // 快讯数据状态 - 使用预获取的数据作为初始值
  const [breakingNews, setBreakingNews] = useState<any[]>(initialBreakingNews);
  
  // 认证模态框状态
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  // 如果没有预获取数据，则在客户端获取
  useEffect(() => {
    // 只有在没有预获取数据时才进行客户端请求
    if (initialBreakingNews.length === 0) {
      const fetchBreakingNews = async () => {
        try {
          const news = await getBreakingNews(8);
          setBreakingNews(news);
        } catch (error) {
          console.error('Failed to fetch breaking news:', error);
          setBreakingNews([]);
        }
      };
      fetchBreakingNews();
    }
  }, [initialBreakingNews.length]);

  // 点击外部关闭搜索框
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    }

    if (isSearchOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSearchOpen]);

  // 搜索处理函数
  const handleSearch = (query: string) => {
    if (query.trim()) {
      // 跳转到搜索结果页面
      window.location.href = `/portal/search?q=${encodeURIComponent(query)}`;
    }
  };

  // 打开认证模态框
  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  // 关闭认证模态框
  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  // 安全地解构属性，提供默认值
  const { brand, brand_tokens, brand_name } = siteSettings || {};

  // 提供默认值
  const brandName = brand?.name || brand_name || "IDP-CMS Portal";
  const brandDescription =
    brand?.description ||
    "专业的新闻聚合平台，为您提供最新、最全面的资讯服务，采用先进技术确保平台稳定性和性能。";
  const brandTokens = brand_tokens || {
    primary: "#3B82F6",
    secondary: "#6B7280",
    radius: "0.5rem",
    shadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
    font: "'Inter', system-ui, sans-serif",
  };

  // Breaking Ticker 固定占据 40px（即使没数据也是透明占位符）
  // Header 高度: 移动端 56px (3.5rem), 桌面端 64px (4rem)  
  // ChannelNavigation sticky top: 移动端 96px (top-24), 桌面端 104px (top-[6.5rem])

  return (
    <div
      className="min-h-screen bg-white"
      style={
        {
          "--brand-primary": brandTokens.primary,
          "--brand-secondary": brandTokens.secondary,
          "--brand-radius": brandTokens.radius,
          "--brand-shadow": brandTokens.shadow,
        } as React.CSSProperties
      }
    >
      {/* Breaking Ticker + Header 组合 - sticky定位避免间隙 */}
      <div className="sticky top-0 z-50">
        {/* Breaking Ticker 快讯滚动条 */}
        <BreakingTicker 
          items={breakingNews}
          autoPlay={true}
          scrollSpeed={60}
          pauseOnHover={true}
          showTimestamp={true}
          className=""
        />
        
        {/* 今日头条风格的顶部导航栏 */}
        <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex justify-between items-center h-14 sm:h-16">
            {/* Logo和品牌 */}
            <Link
              href="/portal"
              className="flex items-center hover:opacity-80 transition-opacity"
            >
              {/* 今日湖北Logo */}
              <img 
                src="/images/hubei-today-logo.png" 
                alt="今日湖北" 
                className="h-10 sm:h-12 w-auto"
              />
              
              {/* Slogan - 桌面端显示 */}
              <div className="hidden lg:flex items-center ml-4 pl-4 border-l border-gray-300">
                <span className="text-sm text-gray-600 font-medium whitespace-nowrap">
                  服务地方经济，推动湖北发展
                </span>
              </div>
              
              {/* Slogan 简化版 - 平板端显示 */}
              <div className="hidden md:flex lg:hidden items-center ml-3 pl-3 border-l border-gray-300">
                <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                  服务地方经济
                </span>
              </div>
            </Link>

            {/* 搜索框 - 响应式设计 */}
            <div className="flex-1 max-w-2xl mx-2 sm:mx-4 lg:mx-8">
              {/* 桌面端：智能搜索框 */}
              <div className="hidden md:block relative">
                <SmartSearchBox
                  placeholder="搜索新闻、话题、用户..."
                  className="w-full"
                />
              </div>

              {/* 移动端：搜索图标按钮 */}
              <div className="md:hidden flex justify-end">
                <button
                  onClick={() => setIsSearchOpen(!isSearchOpen)}
                  className="p-2 text-gray-600 hover:text-red-500 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="搜索"
                >
                  <svg
                    className="h-5 w-5"
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
                </button>
              </div>
            </div>

            {/* 右侧操作区 - 简化版 */}
            <div className="flex items-center">
              {/* 用户菜单 - 最右侧 */}
              <UserMenu onOpenAuth={() => openAuthModal('login')} />
            </div>
          </div>
        </div>
        </header>
      </div>

      {/* 移动端展开的搜索框 - 固定在sticky header组合下方 */}
      {isSearchOpen && (
        <div
          ref={searchRef}
          className="md:hidden sticky left-0 right-0 bg-white border-b border-gray-200 px-3 py-3 z-40 shadow-sm top-24 sm:top-[6.5rem]"
        >
          <div className="relative max-w-full">
            <SmartSearchBox
              placeholder="搜索新闻、话题、用户..."
              className="w-full"
              autoFocus
              onSearch={(query) => {
                handleSearch(query);
                setIsSearchOpen(false);
              }}
            />
            <button
              type="button"
              onClick={() => setIsSearchOpen(false)}
              className="absolute top-2 right-3 text-gray-400 hover:text-gray-600 z-10"
              aria-label="关闭搜索"
            >
              <svg
                className="h-5 w-5"
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
        </div>
      )}

      {/* 主要内容区 */}
      <main className="flex-1 bg-gray-50">{children}</main>

      {/* 今日头条风格的页脚 */}
      <footer className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* 品牌信息 */}
            <div className="col-span-1 md:col-span-2">
              <Link
                href="/portal"
                className="flex items-center mb-4 hover:opacity-80 transition-opacity"
              >
                <img 
                  src="/images/hubei-today-logo.png" 
                  alt="今日湖北" 
                  className="h-10 w-auto mr-3"
                />
                <h3 className="text-lg font-bold text-gray-900">今日湖北</h3>
              </Link>
              <p className="text-gray-600 text-sm leading-relaxed max-w-md">
                今日湖北致力于传播湖北声音，讲好湖北故事，连接人与信息，促进创作与交流。
              </p>
            </div>

            {/* 产品服务 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">
                产品服务
              </h4>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#"
                    className="text-gray-600 hover:text-red-500 text-sm transition-colors"
                  >
                    今日湖北
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-600 hover:text-red-500 text-sm transition-colors"
                  >
                    西瓜视频
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-600 hover:text-red-500 text-sm transition-colors"
                  >
                    抖音
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-600 hover:text-red-500 text-sm transition-colors"
                  >
                    懂车帝
                  </a>
                </li>
              </ul>
            </div>

            {/* 关于我们 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">
                关于我们
              </h4>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#"
                    className="text-gray-600 hover:text-red-500 text-sm transition-colors"
                  >
                    关于头条
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-600 hover:text-red-500 text-sm transition-colors"
                  >
                    加入我们
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-600 hover:text-red-500 text-sm transition-colors"
                  >
                    媒体合作
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-gray-600 hover:text-red-500 text-sm transition-colors"
                  >
                    联系我们
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* 版权信息 */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-500 text-xs">
                © 2024 今日湖北. 保留所有权利.
              </p>
              <div className="flex space-x-6 mt-2 md:mt-0">
                <a
                  href="#"
                  className="text-gray-500 hover:text-red-500 text-xs transition-colors"
                >
                  隐私政策
                </a>
                <a
                  href="#"
                  className="text-gray-500 hover:text-red-500 text-xs transition-colors"
                >
                  服务条款
                </a>
                <a
                  href="#"
                  className="text-gray-500 hover:text-red-500 text-xs transition-colors"
                >
                  用户协议
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
      
      {/* 认证模态框 */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        defaultMode={authModalMode}
      />
    </div>
  );
}
