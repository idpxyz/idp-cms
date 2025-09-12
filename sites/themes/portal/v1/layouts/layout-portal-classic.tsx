/**
 * Portal 经典布局
 *
 * 门户站点的经典布局，包含头部导航、主要内容区域和页脚
 */

import React from "react";

interface LayoutPortalClassicProps {
  children: React.ReactNode;
}

export default function LayoutPortalClassic({
  children,
}: LayoutPortalClassicProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* 顶部导航栏 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-blue-600 rounded"></div>
                <span className="ml-2 text-xl font-bold text-gray-900">
                  AI旅行
                </span>
              </div>
            </div>

            {/* 主导航 */}
            <nav className="hidden md:flex space-x-8">
              <a
                href="/"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium"
              >
                首页
              </a>
              <a
                href="/news"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium"
              >
                新闻
              </a>
              <a
                href="/travel"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium"
              >
                旅行规划
              </a>
              <a
                href="/guides"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium"
              >
                旅行指南
              </a>
            </nav>

            {/* 用户操作 */}
            <div className="flex items-center space-x-4">
              <button className="text-gray-700 hover:text-blue-600 text-sm font-medium">
                登录
              </button>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
                注册
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <main className="flex-1">{children}</main>

      {/* 页脚 */}
      <footer className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* 公司信息 */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-4">
                <div className="h-8 w-8 bg-blue-600 rounded"></div>
                <span className="ml-2 text-xl font-bold text-gray-900">
                  AI旅行
                </span>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                AI旅行是一个基于AI技术的智能旅行规划平台，为用户提供个性化、智能化的旅行体验。
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-gray-600">
                  <span className="sr-only">微信</span>
                  <div className="h-5 w-5 bg-gray-400 rounded"></div>
                </a>
                <a href="#" className="text-gray-400 hover:text-gray-600">
                  <span className="sr-only">微博</span>
                  <div className="h-5 w-5 bg-gray-400 rounded"></div>
                </a>
              </div>
            </div>

            {/* 快速链接 */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">
                快速链接
              </h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="/about"
                    className="text-gray-600 hover:text-gray-900 text-sm"
                  >
                    关于我们
                  </a>
                </li>
                <li>
                  <a
                    href="/contact"
                    className="text-gray-600 hover:text-gray-900 text-sm"
                  >
                    联系我们
                  </a>
                </li>
                <li>
                  <a
                    href="/help"
                    className="text-gray-600 hover:text-gray-900 text-sm"
                  >
                    帮助中心
                  </a>
                </li>
                <li>
                  <a
                    href="/careers"
                    className="text-gray-600 hover:text-gray-900 text-sm"
                  >
                    加入我们
                  </a>
                </li>
              </ul>
            </div>

            {/* 法律信息 */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-4">
                法律信息
              </h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="/privacy"
                    className="text-gray-600 hover:text-gray-900 text-sm"
                  >
                    隐私政策
                  </a>
                </li>
                <li>
                  <a
                    href="/terms"
                    className="text-gray-600 hover:text-gray-900 text-sm"
                  >
                    使用条款
                  </a>
                </li>
                <li>
                  <a
                    href="/cookie"
                    className="text-gray-600 hover:text-gray-900 text-sm"
                  >
                    Cookie政策
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-center text-gray-400 text-sm">
              © 2024 AI旅行. 保留所有权利.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
