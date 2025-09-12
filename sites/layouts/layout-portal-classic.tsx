/**
 * Portal经典布局组件
 * 门户站点的标准布局
 */

"use client";

import React, { useState, useEffect, useRef } from "react";
import { SiteSettings } from "@/lib/types";
import "@/styles/tokens.css";

interface PortalClassicLayoutProps {
  children: React.ReactNode;
  siteSettings: SiteSettings;
}

export default function PortalClassicLayout({
  children,
  siteSettings,
}: PortalClassicLayoutProps) {
  // 移动端搜索状态
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);

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

  // 处理搜索提交
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(searchQuery);
    setIsSearchOpen(false);
  };

  // 处理搜索输入变化
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // 处理键盘快捷键
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsSearchOpen(false);
      setSearchQuery("");
    }
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

  return (
    <div
      className="min-h-screen bg-white"
      style={
        {
          "--brand-primary": brandTokens.primary,
          "--brand-secondary": brandTokens.secondary,
          "--brand-radius": brandTokens.radius,
          "--brand-shadow": brandTokens.shadow,
          "--header-height": "64px",
          "--sticky-offset": "64px",
        } as React.CSSProperties
      }
    >
      {/* 今日头条风格的顶部导航栏 */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Logo和品牌 */}
            <a
              href="/portal"
              className="flex items-center space-x-4 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">党</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">党报头条</h1>
              </div>
            </a>

            {/* 搜索框 - 响应式设计 */}
            <div className="flex-1 max-w-2xl mx-4 lg:mx-8">
              {/* 桌面端：完整搜索框 */}
              <div className="hidden md:block relative">
                <form onSubmit={handleSearchSubmit}>
                  <input
                    type="text"
                    placeholder="搜索新闻、话题、用户..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onKeyDown={handleKeyDown}
                    className="w-full px-4 py-2 pl-10 bg-gray-100 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
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
                </form>
              </div>

              {/* 移动端：搜索图标按钮 */}
              <div className="md:hidden">
                <button
                  onClick={() => setIsSearchOpen(!isSearchOpen)}
                  className="p-2 text-gray-600 hover:text-red-500 hover:bg-gray-100 rounded-full transition-colors"
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

            {/* 右侧操作区 */}
            <div className="flex items-center space-x-2 lg:space-x-4">
              {/* 关注和推荐按钮 - 桌面端显示 */}
              <div className="hidden lg:flex items-center space-x-2">
                <button className="bg-red-500 bg-opacity-10 text-red-500 px-3 py-1.5 rounded-full text-sm font-medium hover:bg-opacity-20 transition-all">
                  关注
                </button>
                <button className="bg-red-500 bg-opacity-10 text-red-500 px-3 py-1.5 rounded-full text-sm font-medium hover:bg-opacity-20 transition-all">
                  推荐
                </button>
              </div>

              {/* 移动端：关注推荐按钮 */}
              <div className="lg:hidden flex items-center space-x-1">
                <button className="bg-red-500 bg-opacity-10 text-red-500 px-2 py-1 rounded-full text-xs font-medium hover:bg-opacity-20 transition-all">
                  关注
                </button>
                <button className="bg-red-500 bg-opacity-10 text-red-500 px-2 py-1 rounded-full text-xs font-medium hover:bg-opacity-20 transition-all">
                  推荐
                </button>
              </div>

              {/* 分析工具链接 - 桌面端显示 */}
              <div className="hidden md:flex items-center space-x-2">
                <a
                  href="/portal/analytics"
                  className="text-gray-600 hover:text-red-500 p-2 rounded-full hover:bg-gray-100 transition-colors"
                  title="数据分析"
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
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </a>
                <a
                  href="/portal/monitor"
                  className="text-gray-600 hover:text-red-500 p-2 rounded-full hover:bg-gray-100 transition-colors"
                  title="实时监控"
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
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                </a>
              </div>

              {/* 分享和评论按钮 - 桌面端显示 */}
              <div className="hidden md:flex items-center space-x-2">
                <button className="text-gray-600 hover:text-red-500 p-2 rounded-full hover:bg-gray-100 transition-colors">
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
                      d="M15 17h5l-5 5v-5zM4 19h6v-6H4v6z"
                    />
                  </svg>
                </button>
                <button className="text-gray-600 hover:text-red-500 p-2 rounded-full hover:bg-gray-100 transition-colors">
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
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </button>
              </div>

              {/* 登录按钮 */}
              <button className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 lg:px-4 lg:py-2 rounded-full text-xs lg:text-sm font-medium transition-colors">
                登录
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 移动端展开的搜索框 */}
      {isSearchOpen && (
        <div
          ref={searchRef}
          className="md:hidden bg-white border-b border-gray-200 px-4 py-3"
        >
          <form onSubmit={handleSearchSubmit}>
            <div className="relative">
              <input
                type="text"
                placeholder="搜索新闻、话题、用户..."
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
                className="w-full px-4 py-3 pl-10 bg-gray-100 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                autoFocus
              />
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
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
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
          </form>
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
              <a
                href="/portal"
                className="flex items-center mb-4 hover:opacity-80 transition-opacity"
              >
                <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center mr-3">
                  <span className="text-white font-bold text-sm">党</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900">党报头条</h3>
              </a>
              <p className="text-gray-600 text-sm leading-relaxed max-w-md">
                你关心的，才是头条。党报头条致力于连接人与信息，促进创作与交流。
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
                    党报头条
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
                © 2024 党报头条. 保留所有权利.
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
    </div>
  );
}
