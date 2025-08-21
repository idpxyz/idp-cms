'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Brain, Zap, Newspaper, User, Search, TrendingUp, BookOpen, Globe, Target } from 'lucide-react';

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  
  const navigationItems = [
    { id: 'home', label: '首页', icon: <Newspaper className="w-5 h-5" />, path: '/' },
    { id: 'search', label: '搜索', icon: <Search className="w-5 h-5" />, path: '/search' },
    { id: 'feed', label: '智能推荐', icon: <Target className="w-5 h-5" />, path: '/feed' },
    { id: 'news', label: 'AI资讯', icon: <TrendingUp className="w-5 h-5" />, path: '/news' },
    { id: 'tools', label: 'AI工具', icon: <Zap className="w-5 h-5" />, path: '/tools' },
    { id: 'tutorials', label: '技术教程', icon: <BookOpen className="w-5 h-5" />, path: '/tutorials' },
    { id: 'profile', label: '个人中心', icon: <User className="w-5 h-5" />, path: '/profile' },
  ];
  
  const handleNavigation = (path: string) => {
    router.push(path);
    setIsMenuOpen(false);
  };
  
  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };
  
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => handleNavigation('/')}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-gray-900">AI旅行</span>
              <span className="text-xs text-gray-500 -mt-1">aivoya.com</span>
            </div>
          </motion.div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                  isActive(item.path)
                    ? 'text-blue-600 bg-blue-50 border border-blue-200'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                }`}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>
          
          {/* User Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <button className="p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-all">
              <Search className="w-5 h-5" />
            </button>
            <button className="btn-primary">登录</button>
          </div>
          
          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-all"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-gray-200"
          >
            <div className="px-4 py-4 space-y-2">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.path)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                    isActive(item.path)
                      ? 'text-blue-600 bg-blue-50 border border-blue-200'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
              
              <div className="pt-4 border-t border-gray-200">
                <button className="w-full btn-primary">登录</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
