/**
 * 地方站网格布局
 *
 * 地方站点的网格布局，适合展示本地新闻和信息
 */

import React from "react";

interface LayoutLocalsiteGridProps {
  children: React.ReactNode;
}

export default function LayoutLocalsiteGrid({
  children,
}: LayoutLocalsiteGridProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div className="flex-shrink-0">
              <div className="flex items-center">
                <div className="h-6 w-6 bg-green-600 rounded"></div>
                <span className="ml-2 text-lg font-semibold text-gray-900">
                  本地新闻
                </span>
              </div>
            </div>

            {/* 主导航 */}
            <nav className="hidden md:flex space-x-6">
              <a
                href="/"
                className="text-gray-600 hover:text-green-600 px-2 py-1 text-sm font-medium"
              >
                首页
              </a>
              <a
                href="/news"
                className="text-gray-600 hover:text-green-600 px-2 py-1 text-sm font-medium"
              >
                新闻
              </a>
              <a
                href="/local"
                className="text-gray-600 hover:text-green-600 px-2 py-1 text-sm font-medium"
              >
                本地资讯
              </a>
              <a
                href="/life"
                className="text-gray-600 hover:text-green-600 px-2 py-1 text-sm font-medium"
              >
                生活服务
              </a>
            </nav>

            {/* 搜索 */}
            <div className="flex items-center">
              <div className="relative">
                <input
                  type="text"
                  placeholder="搜索本地新闻..."
                  className="w-64 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <div className="h-4 w-4 bg-gray-400 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 面包屑导航 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <nav className="flex text-sm text-gray-500">
            <a href="/" className="hover:text-green-600">
              首页
            </a>
            <span className="mx-2">/</span>
            <span className="text-gray-900">当前页面</span>
          </nav>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 主内容区域 */}
          <main className="lg:col-span-3">{children}</main>

          {/* 侧边栏 */}
          <aside className="lg:col-span-1 space-y-6">
            {/* 热门新闻 */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                热门新闻
              </h3>
              <div className="space-y-3">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="flex space-x-3">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 bg-gray-200 rounded"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 line-clamp-2">
                        热门新闻标题 {item}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">2小时前</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 本地服务 */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                本地服务
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {["天气", "交通", "医院", "教育"].map((service) => (
                  <a
                    key={service}
                    href="#"
                    className="flex flex-col items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="h-8 w-8 bg-green-500 rounded mb-2"></div>
                    <span className="text-sm font-medium text-gray-700">
                      {service}
                    </span>
                  </a>
                ))}
              </div>
            </div>

            {/* 联系我们 */}
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-900 mb-2">
                联系我们
              </h3>
              <p className="text-sm text-green-700 mb-3">
                有新闻线索或建议？联系我们的编辑团队。
              </p>
              <button className="w-full bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700">
                提交线索
              </button>
            </div>
          </aside>
        </div>
      </div>

      {/* 页脚 */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center mb-3">
                <div className="h-6 w-6 bg-green-600 rounded"></div>
                <span className="ml-2 text-lg font-semibold text-gray-900">
                  本地新闻
                </span>
              </div>
              <p className="text-gray-600 text-sm">
                提供最新的本地新闻和生活资讯
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                快速链接
              </h4>
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
                    href="/advertise"
                    className="text-gray-600 hover:text-gray-900 text-sm"
                  >
                    广告合作
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                关注我们
              </h4>
              <div className="flex space-x-3">
                <div className="h-6 w-6 bg-gray-400 rounded"></div>
                <div className="h-6 w-6 bg-gray-400 rounded"></div>
                <div className="h-6 w-6 bg-gray-400 rounded"></div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-gray-400 text-sm">
              © 2024 本地新闻网. 保留所有权利.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
