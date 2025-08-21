'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Grid, List, Star, ExternalLink, Loader2 } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { AITool } from '@/types/ai';
import { aiToolsApi } from '@/lib/aiApiService';

export default function ToolsPage() {
  const [tools, setTools] = useState<AITool[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPricing, setSelectedPricing] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('rating');
  const [pagination, setPagination] = useState({
    page: 1,
    size: 20,
    total: 0,
    has_next: false,
    has_prev: false
  });
  
  useEffect(() => {
    loadCategories();
  }, []);
  
  useEffect(() => {
    loadTools();
  }, [selectedCategory, selectedPricing, searchQuery, sortBy, pagination.page]);
  
  const loadTools = async () => {
    try {
      setLoading(true);
      const response = await aiToolsApi.getTools({
        category: selectedCategory || undefined,
        pricing: selectedPricing || undefined,
        search: searchQuery || undefined,
        page: pagination.page,
        size: pagination.size
      });
      setTools(response.results || []);
      setPagination({
        page: response.page,
        size: pagination.size,
        total: response.count,
        has_next: response.has_next,
        has_prev: response.has_prev
      });
    } catch (error) {
      console.error('Failed to load tools:', error);
      setTools([]);
    } finally {
      setLoading(false);
    }
  };
  
  const loadCategories = async () => {
    try {
      const response = await aiToolsApi.getCategories();
      setCategories(response.categories || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
      setCategories([]);
    }
  };
  
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
  };
  
  const handleToolClick = (tool: AITool) => {
    window.open(tool.tool_url, '_blank');
  };
  
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Header */}
      <section className="pt-16 bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">AI工具导航</h1>
            <p className="text-lg text-gray-600">发现和探索最新的AI工具，提升您的工作效率</p>
          </div>
          
          {/* Search and Filters */}
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="搜索AI工具..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <button
                onClick={handleSearch}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white px-4 py-1 rounded-md text-sm hover:bg-blue-700"
              >
                搜索
              </button>
            </div>
            
            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-4">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">所有分类</option>
                {categories.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              
              <select
                value={selectedPricing}
                onChange={(e) => setSelectedPricing(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">所有价格</option>
                <option value="free">免费</option>
                <option value="freemium">免费版</option>
                <option value="paid">付费</option>
                <option value="enterprise">企业版</option>
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="rating">按评分</option>
                <option value="usage_count">按使用量</option>
                <option value="last_published_at">按更新时间</option>
              </select>
              
              <div className="flex items-center space-x-2 ml-auto">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Tools Grid */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mr-2" />
              <span className="text-gray-600">加载中...</span>
            </div>
          ) : (
            <>
              <div className={viewMode === 'grid' 
                ? "grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
                : "space-y-4"
              }>
                {tools.map((tool, index) => (
                  <ToolCard 
                    key={tool.id} 
                    tool={tool} 
                    index={index}
                    viewMode={viewMode}
                    onClick={() => handleToolClick(tool)}
                  />
                ))}
              </div>
              
              {tools.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-500 mb-4">
                    <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">没有找到符合条件的AI工具</p>
                    <p className="text-sm">尝试调整搜索条件或浏览其他分类</p>
                  </div>
                </div>
              )}
              
              {/* Pagination */}
              {pagination.total > 0 && (
                <div className="flex items-center justify-center space-x-2 mt-8">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!pagination.has_prev}
                    className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    上一页
                  </button>
                  
                  <span className="px-3 py-2 text-gray-600">
                    第 {pagination.page} 页，共 {Math.ceil(pagination.total / pagination.size)} 页
                  </span>
                  
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!pagination.has_next}
                    className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    下一页
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

// ToolCard组件
const ToolCard = ({ tool, index, viewMode, onClick }: {
  tool: AITool;
  index: number;
  viewMode: 'grid' | 'list';
  onClick: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: index * 0.05 }}
    className={`bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-pointer ${
      viewMode === 'list' ? 'flex items-center p-4' : 'p-6'
    }`}
    onClick={onClick}
  >
    {viewMode === 'grid' ? (
      <>
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
            {tool.logo_url ? (
              <img src={tool.logo_url} alt={tool.title} className="w-8 h-8 rounded" />
            ) : (
              tool.title.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-lg">{tool.title}</h3>
            <div className="flex items-center space-x-2">
              {tool.is_hot && (
                <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">热门</span>
              )}
              {tool.is_new && (
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">新</span>
              )}
            </div>
          </div>
        </div>
        
        <p className="text-gray-600 mb-4 text-sm leading-relaxed">{tool.description}</p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <Star className="w-4 h-4 text-yellow-500 fill-current" />
            <span className="text-sm text-gray-600">{tool.rating}</span>
            <span className="text-xs text-gray-500">({tool.usage_count.toLocaleString()})</span>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${
            tool.pricing === 'free' ? 'bg-green-100 text-green-800' :
            tool.pricing === 'freemium' ? 'bg-blue-100 text-blue-800' :
            'bg-orange-100 text-orange-800'
          }`}>
            {tool.pricing === 'free' ? '免费' : 
             tool.pricing === 'freemium' ? '免费版' : 
             tool.pricing === 'paid' ? '付费' : '企业版'}
          </span>
        </div>
        
        <div className="flex flex-wrap gap-1 mt-3">
          {tool.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      </>
    ) : (
      // List view layout
      <>
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0 mr-4">
          {tool.logo_url ? (
            <img src={tool.logo_url} alt={tool.title} className="w-8 h-8 rounded" />
          ) : (
            tool.title.charAt(0).toUpperCase()
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-gray-900">{tool.title}</h3>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                <span className="text-sm text-gray-600">{tool.rating}</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                tool.pricing === 'free' ? 'bg-green-100 text-green-800' :
                tool.pricing === 'freemium' ? 'bg-blue-100 text-blue-800' :
                'bg-orange-100 text-orange-800'
              }`}>
                {tool.pricing === 'free' ? '免费' : 
                 tool.pricing === 'freemium' ? '免费版' : 
                 tool.pricing === 'paid' ? '付费' : '企业版'}
              </span>
            </div>
          </div>
          
          <p className="text-gray-600 text-sm mb-2">{tool.description}</p>
          
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-1">
              {tool.tags.slice(0, 3).map(tag => (
                <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
            
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1">
              <span>访问</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      </>
    )}
  </motion.div>
);