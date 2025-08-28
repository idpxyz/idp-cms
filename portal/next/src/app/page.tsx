'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  Zap,
  Newspaper,
  Star,
  TrendingUp,
  Clock,
  ExternalLink,
  ArrowRight,
  Search,
  BookOpen,
  Users,
  Globe,
  Loader2,
  Target,
  Flame,
  Sparkles,
} from 'lucide-react';
import { useAIPortalStore } from '@/store/aiPortalStore';
import Navigation from '@/components/Navigation';
import { AITool, AINews, AICategory } from '@/types/ai';
import { aiToolsApi, aiNewsApi } from '@/lib/aiApiService';
import { fetchFeed } from '@/lib/feed';
import { FeedItem } from '@/types/feed';
import { getCurrentSite, getSiteDisplayName } from '@/lib/siteDetection';
import SEOLayout from '@/components/SEOLayout';
import PortalSummary from '@/components/PortalSummary';

export default function HomePage() {
  const { setCurrentView } = useAIPortalStore();
  const [tools, setTools] = useState<AITool[]>([]);
  const [news, setNews] = useState<AINews[]>([]);
  const [recommendations, setRecommendations] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentSite, setCurrentSite] = useState<string>('localhost');

  useEffect(() => {
    setCurrentSite(getCurrentSite());
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[HomePage] Starting to load data...');

      // 并行加载数据
      const [toolsResponse, newsResponse, feedResponse] =
        await Promise.allSettled([
          aiToolsApi.getTools({ is_hot: 'true', size: 4 }),
          aiNewsApi.getNews({ size: 6 }),
          fetchFeed(undefined, 'final_score'), // 获取智能推荐
        ]);

      // 处理工具数据
      if (toolsResponse.status === 'fulfilled') {
        setTools(toolsResponse.value.results || []);
        console.log(
          '[HomePage] Tools loaded successfully:',
          toolsResponse.value.results?.length || 0
        );
      } else {
        console.error('[HomePage] Failed to load tools:', toolsResponse.reason);
        setTools([]);
      }

      // 处理新闻数据
      if (newsResponse.status === 'fulfilled') {
        setNews(newsResponse.value.results || []);
        console.log(
          '[HomePage] News loaded successfully:',
          newsResponse.value.results?.length || 0
        );
      } else {
        console.error('[HomePage] Failed to load news:', newsResponse.reason);
        setNews([]);
      }

      // 处理推荐数据
      if (feedResponse.status === 'fulfilled') {
        setRecommendations(feedResponse.value.items?.slice(0, 5) || []);
        console.log(
          '[HomePage] Feed loaded successfully:',
          feedResponse.value.items?.length || 0
        );
      } else {
        console.error('[HomePage] Failed to load feed:', feedResponse.reason);
        setRecommendations([]);
      }

      // 检查是否有任何数据加载成功
      const hasAnyData =
        (toolsResponse.status === 'fulfilled' &&
          toolsResponse.value.results?.length > 0) ||
        (newsResponse.status === 'fulfilled' &&
          newsResponse.value.results?.length > 0) ||
        (feedResponse.status === 'fulfilled' &&
          feedResponse.value.items?.length > 0);

      if (!hasAnyData) {
        setError('暂无数据，请稍后重试');
      }
    } catch (error) {
      console.error('[HomePage] Unexpected error in loadData:', error);
      setError('数据加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    window.location.href = `/tools?category=${categoryId}`;
  };

  const handleToolClick = (tool: AITool) => {
    window.open(tool.tool_url, '_blank');
  };

  const handleNewsClick = (news: AINews) => {
    window.location.href = `/news/${news.id}`;
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;

    setSearchLoading(true);
    try {
      // 跳转到专门的搜索结果页面
      window.location.href = `/search?q=${encodeURIComponent(query)}`;
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(searchQuery);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(searchQuery);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <Brain className="w-12 h-12 mx-auto mb-2" />
            <p className="text-lg font-medium">{error}</p>
          </div>
          <button onClick={loadData} className="btn-primary">
            重试
          </button>
        </div>
      </div>
    );
  }

  const topNews = news.find((n) => n.is_top);

  return (
    <SEOLayout
      title={`${getSiteDisplayName(currentSite)} - AI工具导航 · 行业资讯聚合`}
      description={`${getSiteDisplayName(currentSite)} 提供最新的AI工具和行业资讯，帮助您探索AI的无限可能。`}
    >
      <Navigation />

      {/* Hero Section - 新闻门户风格 */}
      <section className="relative overflow-hidden pt-16 bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
              {getSiteDisplayName(currentSite)}
              <span className="block text-2xl md:text-3xl font-normal text-gray-600 mt-2">
                AI工具导航 · 行业资讯聚合
              </span>
              {currentSite !== 'localhost' && (
                <span className="block text-lg font-medium text-blue-600 mt-2">
                  当前站点：{currentSite}
                </span>
              )}
            </h1>
            <p className="text-lg md:text-xl mb-8 text-gray-600">
              聚合全球AI动态，发现优质AI工具，掌握前沿技术趋势
            </p>

            {/* Search Bar */}
            <form
              onSubmit={handleSearchSubmit}
              className="bg-white border border-gray-300 rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-center space-x-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="搜索AI工具、资讯、技术..."
                    className="w-full pl-10 pr-6 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={searchLoading}
                  />
                </div>
                <button
                  type="submit"
                  disabled={searchLoading || !searchQuery.trim()}
                  className="btn-primary px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {searchLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>搜索中...</span>
                    </>
                  ) : (
                    <span>搜索</span>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </section>

      {/* Breaking News - 突发新闻 */}
      {topNews && (
        <section className="py-6 bg-red-50 border-b border-red-200">
          <div className="container mx-auto px-4">
            <div className="flex items-center space-x-3">
              <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                突发
              </div>
              <span className="text-red-800 font-medium">{topNews.title}</span>
            </div>
          </div>
        </section>
      )}

      {/* AI智能推荐区域 */}
      <section className="py-8 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Target className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">AI智能推荐</h2>
              <Sparkles className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-gray-600 max-w-2xl mx-auto">
              基于OpenSearch和机器学习算法，为您精准推荐最相关的AI资讯和工具
            </p>
          </motion.div>

          {recommendations.length > 0 ? (
            <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
              {recommendations.map((item, index) => (
                <RecommendationCard key={item.id} item={item} index={index} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">AI正在为您智能分析，请稍候...</p>
            </div>
          )}

          <div className="text-center">
            <button
              onClick={() => (window.location.href = '/feed')}
              className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Target className="w-5 h-5" />
              <span>查看更多智能推荐</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Main Content Grid - 新闻门户布局 */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Left Sidebar - 分类导航 */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-24">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">
                  AI工具分类
                </h3>
                <CategoryList onCategoryClick={handleCategoryClick} />

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">
                    快速导航
                  </h3>
                  <QuickNavigation />
                </div>
              </div>
            </div>

            {/* Main Content - 新闻列表 */}
            <div className="lg:col-span-2">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  最新AI资讯
                </h2>
                <p className="text-gray-600">掌握最新AI技术动态和行业趋势</p>
              </div>

              {news.length > 0 ? (
                <div className="space-y-6">
                  {news.map((item, index) => (
                    <NewsCard
                      key={item.id}
                      news={item}
                      index={index}
                      onClick={() => handleNewsClick(item)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Newspaper className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">暂无AI资讯</p>
                  <p className="text-sm text-gray-400 mt-2">
                    请稍后回来查看最新内容
                  </p>
                </div>
              )}

              {/* Load More Button */}
              {news.length > 0 && (
                <div className="text-center mt-8">
                  <button
                    onClick={() => (window.location.href = '/news')}
                    className="btn-secondary px-8 py-3"
                  >
                    加载更多资讯
                  </button>
                </div>
              )}
            </div>

            {/* Right Sidebar - 热门工具和趋势 */}
            <div className="lg:col-span-1">
              <div className="space-y-6">
                {/* 热门AI工具 */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">
                    热门AI工具
                  </h3>
                  {tools.length > 0 ? (
                    <>
                      <div className="space-y-4">
                        {tools.slice(0, 3).map((tool) => (
                          <ToolCard
                            key={tool.id}
                            tool={tool}
                            onClick={() => handleToolClick(tool)}
                          />
                        ))}
                      </div>
                      <button
                        onClick={() => (window.location.href = '/tools')}
                        className="w-full mt-4 text-center text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        查看全部工具 →
                      </button>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <Zap className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">暂无热门工具</p>
                    </div>
                  )}
                </div>

                {/* 门户聚合摘要 */}
                <div className="mt-8">
                  <PortalSummary site={currentSite} />
                </div>

                {/* 热门话题 */}
                <HotTopics />

                {/* 订阅提示 */}
                <SubscriptionCTA />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <NewsletterSection />
    </SEOLayout>
  );
}

// 分类列表组件
const CategoryList = ({
  onCategoryClick,
}: {
  onCategoryClick: (id: string) => void;
}) => {
  const categories = [
    {
      id: 'text-generation',
      name: '文字生成',
      icon: '✍️',
      color: 'bg-blue-500',
    },
    {
      id: 'image-generation',
      name: '图像生成',
      icon: '🎨',
      color: 'bg-purple-500',
    },
    {
      id: 'video-generation',
      name: '视频生成',
      icon: '🎬',
      color: 'bg-red-500',
    },
    {
      id: 'code-generation',
      name: '编程助手',
      icon: '💻',
      color: 'bg-green-500',
    },
    {
      id: 'data-analysis',
      name: '数据分析',
      icon: '📊',
      color: 'bg-yellow-500',
    },
    { id: 'chatbot', name: '聊天机器人', icon: '🤖', color: 'bg-indigo-500' },
  ];

  return (
    <div className="space-y-3">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onCategoryClick(category.id)}
          className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors group"
        >
          <div className="flex items-center space-x-3">
            <div
              className={`w-8 h-8 ${category.color} rounded-lg flex items-center justify-center text-white text-sm`}
            >
              {category.icon}
            </div>
            <div>
              <div className="font-medium text-gray-900">{category.name}</div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

// 快速导航组件
const QuickNavigation = () => (
  <div className="space-y-2">
    <button
      onClick={() => (window.location.href = '/feed')}
      className="w-full text-left p-2 rounded hover:bg-gray-50 text-gray-700 hover:text-blue-600 transition-colors"
    >
      <Target className="w-4 h-4 inline mr-2" />
      智能推荐
    </button>
    <button
      onClick={() => (window.location.href = '/news')}
      className="w-full text-left p-2 rounded hover:bg-gray-50 text-gray-700 hover:text-blue-600 transition-colors"
    >
      <Newspaper className="w-4 h-4 inline mr-2" />
      最新资讯
    </button>
    <button
      onClick={() => (window.location.href = '/tools')}
      className="w-full text-left p-2 rounded hover:bg-gray-50 text-gray-700 hover:text-blue-600 transition-colors"
    >
      <TrendingUp className="w-4 h-4 inline mr-2" />
      热门工具
    </button>
    <button
      onClick={() => (window.location.href = '/tutorials')}
      className="w-full text-left p-2 rounded hover:bg-gray-50 text-gray-700 hover:text-blue-600 transition-colors"
    >
      <BookOpen className="w-4 h-4 inline mr-2" />
      技术教程
    </button>
  </div>
);

// 新闻卡片组件
const NewsCard = ({
  news,
  index,
  onClick,
}: {
  news: AINews;
  index: number;
  onClick: () => void;
}) => (
  <motion.article
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: index * 0.1 }}
    className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
    onClick={onClick}
  >
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
          <span className="text-sm text-gray-500">{news.source}</span>
        </div>
        <span className="text-sm text-gray-500">
          {news.last_published_at
            ? new Date(news.last_published_at).toLocaleDateString()
            : ''}
        </span>
      </div>

      <h3 className="text-xl font-bold text-gray-900 mb-3 hover:text-blue-600 transition-colors">
        {news.title}
      </h3>

      <p className="text-gray-600 mb-4 leading-relaxed">{news.introduction}</p>

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {news.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <span className="flex items-center">
            <Users className="w-4 h-4 mr-1" />
            {news.read_count.toLocaleString()}
          </span>
          <button className="text-blue-600 hover:text-blue-700 font-medium">
            阅读全文 →
          </button>
        </div>
      </div>
    </div>
  </motion.article>
);

// 工具卡片组件
const ToolCard = ({ tool, onClick }: { tool: AITool; onClick: () => void }) => (
  <div
    className="p-3 rounded-lg border border-gray-100 hover:border-blue-200 transition-colors cursor-pointer"
    onClick={onClick}
  >
    <div className="flex items-center space-x-3">
      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
        {tool.logo_url ? (
          <img
            src={tool.logo_url}
            alt={tool.title}
            className="w-8 h-8 rounded"
          />
        ) : (
          tool.title.charAt(0).toUpperCase()
        )}
      </div>
      <div className="flex-1">
        <div className="font-medium text-gray-900 text-sm">{tool.title}</div>
        <div className="text-xs text-gray-500 line-clamp-2">
          {tool.description}
        </div>
      </div>
    </div>
    <div className="flex items-center justify-between mt-2">
      <div className="flex items-center space-x-1">
        <Star className="w-3 h-3 text-yellow-500 fill-current" />
        <span className="text-xs text-gray-600">{tool.rating}</span>
      </div>
      <span
        className={`text-xs px-2 py-1 rounded-full ${
          tool.pricing === 'free'
            ? 'bg-green-100 text-green-800'
            : tool.pricing === 'freemium'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-orange-100 text-orange-800'
        }`}
      >
        {tool.pricing === 'free'
          ? '免费'
          : tool.pricing === 'freemium'
            ? '免费版'
            : tool.pricing === 'paid'
              ? '付费'
              : '企业版'}
      </span>
    </div>
  </div>
);

// 热门话题组件
const HotTopics = () => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <h3 className="text-lg font-semibold mb-4 text-gray-900">热门话题</h3>
    <div className="flex flex-wrap gap-2">
      {[
        'GPT-5',
        'AI芯片',
        '生成式AI',
        'AI安全',
        '多模态AI',
        'AI投资',
        '开源AI',
        'AI监管',
      ].map((tag) => (
        <span
          key={tag}
          className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full hover:bg-blue-100 hover:text-blue-700 cursor-pointer transition-colors"
        >
          {tag}
        </span>
      ))}
    </div>
  </div>
);

// 订阅提示组件
const SubscriptionCTA = () => (
  <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg p-6 text-white">
    <h3 className="text-lg font-semibold mb-2">订阅AI资讯</h3>
    <p className="text-blue-100 text-sm mb-4">
      第一时间获取最新AI动态和工具更新
    </p>
    <button className="w-full bg-white text-blue-600 py-2 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors">
      立即订阅
    </button>
  </div>
);

// 推荐卡片组件
const RecommendationCard = ({
  item,
  index,
}: {
  item: FeedItem;
  index: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: index * 0.1 }}
    className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-300 hover:-translate-y-1 cursor-pointer group"
    onClick={() => (window.location.href = `/news/${item.id}`)}
  >
    <div className="p-6">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Target className="w-3 h-3 mr-1" />
            AI推荐
          </span>
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            {item.channel}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <Flame className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-medium text-orange-600">
            {item.final_score?.toFixed(1)}
          </span>
        </div>
      </div>

      <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">
        {item.title}
      </h3>

      <p className="text-gray-600 text-sm mb-4 leading-relaxed line-clamp-3">
        {item.body?.slice(0, 120)}...
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 text-xs text-gray-500">
          <span className="flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            {item.publish_time
              ? new Date(item.publish_time).toLocaleDateString('zh-CN', {
                  month: 'short',
                  day: 'numeric',
                })
              : ''}
          </span>
          <span className="flex items-center">
            <TrendingUp className="w-3 h-3 mr-1" />
            热度 {item.pop_24h?.toFixed(1)}
          </span>
        </div>
        <div className="flex items-center text-blue-600 text-sm font-medium group-hover:text-blue-700">
          <span>查看详情</span>
          <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </div>
  </motion.div>
);
// 邮件订阅区域组件
const NewsletterSection = () => (
  <section className="py-16 bg-gray-100">
    <div className="container mx-auto px-4 text-center">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h2 className="text-3xl font-bold mb-4 text-gray-900">
          加入AI旅行社区
        </h2>
        <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
          与全球AI爱好者和专业人士一起，探索AI的无限可能，分享最新发现，共同成长
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
          <input
            type="email"
            placeholder="输入您的邮箱地址"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button className="btn-primary px-8 py-3 whitespace-nowrap">
            订阅资讯
          </button>
        </div>
      </motion.div>
    </div>
  </section>
);
