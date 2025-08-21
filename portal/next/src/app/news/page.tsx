'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Filter, 
  Search, 
  Calendar, 
  Clock, 
  TrendingUp, 
  Star, 
  Bookmark, 
  Share2, 
  Eye,
  Tag,
  ArrowRight,
  Grid3X3,
  List,
  Loader2
} from 'lucide-react';
import { useAIPortalStore } from '@/store/aiPortalStore';
import Navigation from '@/components/Navigation';
import { AINews, AINewsCategory } from '@/types/ai';
import { aiNewsApi } from '@/lib/aiApiService';

export default function NewsPage() {
  const { setCurrentView } = useAIPortalStore();
  const [selectedCategory, setSelectedCategory] = useState<AINewsCategory | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'hot'>('latest');
  
  // 状态管理
  const [news, setNews] = useState<AINews[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [apiCategories, setApiCategories] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    size: 20,
    total: 0,
    has_next: false,
    has_prev: false
  });

  // 加载数据
  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadNews();
  }, [selectedCategory, searchQuery, sortBy, pagination.page]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 并行加载数据
      const [newsResponse, categoriesResponse] = await Promise.all([
        aiNewsApi.getNews({ size: pagination.size }),
        aiNewsApi.getCategories()
      ]);

      setNews(newsResponse.results);
      setCategories(categoriesResponse.categories);
      setApiCategories(newsResponse.categories || {});
      setPagination({
        page: newsResponse.page,
        size: pagination.size,
        total: newsResponse.count,
        has_next: newsResponse.has_next,
        has_prev: newsResponse.has_prev
      });
    } catch (error) {
      console.error('Failed to load data:', error);
      setError('数据加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const loadNews = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        page: pagination.page,
        size: pagination.size
      };

      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }

      if (searchQuery) {
        params.search = searchQuery;
      }

      if (sortBy === 'hot') {
        params.is_hot = 'true';
      }

      const response = await aiNewsApi.getNews(params);
      setNews(response.results);
      setApiCategories(response.categories || {});
      setPagination({
        page: response.page,
        size: params.size,
        total: response.count,
        has_next: response.has_next,
        has_prev: response.has_prev
      });
    } catch (error) {
      console.error('Failed to load news:', error);
      setError('资讯加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 处理分页
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // 处理搜索
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    loadNews();
  };

  // 处理分类切换
  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId as AINewsCategory | 'all');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // 处理排序
  const handleSortChange = (newSortBy: 'latest' | 'popular' | 'hot') => {
    setSortBy(newSortBy);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleNewsClick = (news: AINews) => {
    // Navigate to news detail page
    window.location.href = `/news/${news.id}`;
  };

  // 计算分类统计（使用API返回的统计数据）
  const getCategoryCount = (categoryId: string) => {
    if (categoryId === 'all') return pagination.total;
    return apiCategories[categoryId] || 0;
  };

  // 过滤和排序新闻
  const filteredNews = news
    .filter(news => {
      const matchesCategory = selectedCategory === 'all' || news.category === selectedCategory;
      const matchesSearch = searchQuery === '' || 
        news.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        news.introduction.toLowerCase().includes(searchQuery.toLowerCase()) ||
        news.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'latest':
          return new Date(b.last_published_at || '').getTime() - new Date(a.last_published_at || '').getTime();
        case 'popular':
          return b.read_count - a.read_count;
        case 'hot':
          return (b.is_hot ? 1 : 0) - (a.is_hot ? 1 : 0);
        default:
          return 0;
      }
    });

  if (loading && news.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">加载中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <Search className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">加载失败</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={loadData}
              className="btn-primary px-6 py-2"
            >
              重试
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Header */}
      <section className="pt-16 pb-8 bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">AI资讯</h1>
              <p className="text-gray-600">掌握最新AI技术动态和行业趋势</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Grid3X3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="搜索AI资讯、技术、公司..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full px-4 py-3 pl-12 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value as 'latest' | 'popular' | 'hot')}
                className="px-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="latest">最新发布</option>
                <option value="popular">最受欢迎</option>
                <option value="hot">热门资讯</option>
              </select>
              <button 
                onClick={handleSearch}
                className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                搜索
              </button>
            </div>
          </div>
        </div>
      </section>
      
      {/* Categories */}
      <section className="py-6 bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleCategoryClick('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === 'all'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              全部资讯
              <span className="ml-2 text-xs opacity-75">({getCategoryCount('all')})</span>
            </button>
            {categories.map((category: any) => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === category.id
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.name}
                <span className="ml-2 text-xs opacity-75">({getCategoryCount(category.id)})</span>
              </button>
            ))}
          </div>
        </div>
      </section>
      
      {/* News List */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          {filteredNews.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Search className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">未找到相关资讯</h3>
              <p className="text-gray-600">尝试调整搜索条件或选择其他分类</p>
            </div>
          ) : (
            <div className={`grid gap-6 ${
              viewMode === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : 'lg:grid-cols-1'
            }`}>
              {filteredNews.map((news, index) => (
                <motion.article
                  key={news.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all cursor-pointer ${
                    viewMode === 'list' ? 'flex' : ''
                  }`}
                  onClick={() => handleNewsClick(news)}
                >
                  {viewMode === 'list' ? (
                    // List view
                    <>
                      <div className="flex-1 p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            {news.is_top && (
                              <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium">
                                置顶
                              </span>
                            )}
                            {news.is_hot && (
                              <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">
                                热门
                              </span>
                            )}
                            <span className="text-sm text-gray-500">{news.source}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <Clock className="w-4 h-4" />
                            <span>{new Date(news.last_published_at || '').toLocaleDateString()}</span>
                          </div>
                        </div>
                        
                        <h3 className="text-xl font-bold text-gray-900 mb-3 hover:text-blue-600 transition-colors line-clamp-2">
                          {news.title}
                        </h3>
                        
                        <p className="text-gray-600 mb-4 leading-relaxed line-clamp-3">
                          {news.introduction}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap gap-2">
                            {news.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                {tag}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span className="flex items-center">
                              <Eye className="w-4 h-4 mr-1" />
                              {news.read_count.toLocaleString()}
                            </span>
                            <button className="text-blue-600 hover:text-blue-700 font-medium">
                              阅读全文 <ArrowRight className="w-4 h-4 inline ml-1" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    // Grid view
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          {news.is_top && (
                            <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium">
                              置顶
                            </span>
                          )}
                          {news.is_hot && (
                            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">
                              热门
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-gray-500">{news.source}</span>
                      </div>
                      
                      <h3 className="text-lg font-bold text-gray-900 mb-3 hover:text-blue-600 transition-colors line-clamp-2">
                        {news.title}
                      </h3>
                      
                      <p className="text-gray-600 mb-4 leading-relaxed line-clamp-3">
                        {news.introduction}
                      </p>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                        <span className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {new Date(news.last_published_at || '').toLocaleDateString()}
                        </span>
                        <span className="flex items-center">
                          <Eye className="w-4 h-4 mr-1" />
                          {news.read_count.toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-3">
                        {news.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                      
                      <button className="w-full text-center text-blue-600 hover:text-blue-700 font-medium py-2 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
                        阅读全文 <ArrowRight className="w-4 h-4 inline ml-1" />
                      </button>
                    </div>
                  )}
                </motion.article>
              ))}
            </div>
          )}
          
          {/* Pagination */}
          {pagination.has_next && (
            <div className="text-center mt-12">
              <div className="flex items-center justify-center space-x-2">
                {pagination.has_prev && (
                  <button 
                    onClick={() => handlePageChange(pagination.page - 1)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    上一页
                  </button>
                )}
                <span className="px-4 py-2 text-gray-600">
                  第 {pagination.page} 页，共 {Math.ceil(pagination.total / pagination.size)} 页
                </span>
                {pagination.has_next && (
                  <button 
                    onClick={() => handlePageChange(pagination.page + 1)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    下一页
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
