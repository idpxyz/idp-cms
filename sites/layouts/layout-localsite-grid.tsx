import React from 'react'
import { SiteSettings } from '@/lib/types'

interface LocalsiteGridLayoutProps {
  children: React.ReactNode
  siteSettings: SiteSettings
}

export default function LocalsiteGridLayout({ children, siteSettings }: LocalsiteGridLayoutProps) {
  const { brand_tokens, brand } = siteSettings
  const brand_name = brand?.name || siteSettings.brand_name || '默认站点'
  const brand_logo = brand?.logo_url || siteSettings.brand_logo || ''

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              {brand_logo && (
                <img 
                  src={brand_logo} 
                  alt={brand_name} 
                  className="h-8 w-auto mr-3"
                />
              )}
              <h1 className="text-xl font-bold text-gray-900">
                {brand_name}
              </h1>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex space-x-8">
              <a href="#" className="text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium">
                首页
              </a>
              <a href="#" className="text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium">
                新闻
              </a>
              <a href="#" className="text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium">
                频道
              </a>
              <a href="#" className="text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium">
                关于
              </a>
            </nav>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <button className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700">
                登录
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">侧边栏</h2>
              
              {/* 排行榜 */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">热门排行</h3>
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((rank) => (
                    <div key={rank} className="flex items-center space-x-3">
                      <span className="text-sm font-bold text-gray-400 w-6">#{rank}</span>
                      <a href="#" className="text-sm text-gray-600 hover:text-gray-900 truncate">
                        热门新闻标题 {rank}
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {/* 广告位 */}
              <div className="bg-gray-100 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500">广告位</p>
                <p className="text-xs text-gray-400 mt-1">300x250</p>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-lg font-semibold mb-4">{brand_name}</h3>
              <p className="text-gray-300 text-sm mb-4">
                提供最新、最全面的新闻资讯，让您第一时间了解世界动态。
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white">
                  <span className="sr-only">微信</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white">
                  <span className="sr-only">微博</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-sm font-semibold mb-4">快速链接</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-gray-300 hover:text-white">关于我们</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white">联系我们</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white">隐私政策</a></li>
                <li><a href="#" className="text-gray-300 hover:text-white">服务条款</a></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-sm font-semibold mb-4">联系我们</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>邮箱: info@example.com</li>
                <li>电话: 400-123-4567</li>
                <li>地址: 上海市浦东新区</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-700 mt-8 pt-8 text-center">
            <p className="text-sm text-gray-400">
              © 2024 {brand_name}. 保留所有权利.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
