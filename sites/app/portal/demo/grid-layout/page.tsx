"use client";

import React from "react";
import Link from "next/link";

// Note: metadata is not supported in client components
// For SEO, consider using next/head or moving metadata to a parent server component

// 模拟新闻数据
const newsData = [
  {
    id: 1,
    title: "人工智能在医疗领域的突破性进展",
    summary: "最新研究显示，AI技术在疾病诊断和治疗方案制定方面取得重大突破，准确率提升至95%以上...",
    image: "https://via.placeholder.com/400x250/3b82f6/ffffff?text=AI医疗",
    category: "科技",
    author: "张博士",
    time: "2小时前",
    views: "12.3k",
    comments: 45,
    hot: true
  },
  {
    id: 2,
    title: "全球可再生能源投资达到历史新高",
    summary: "2024年第三季度，全球可再生能源投资总额突破1500亿美元，太阳能和风能领域表现尤为突出...",
    image: "https://via.placeholder.com/400x250/10b981/ffffff?text=可再生能源",
    category: "环境",
    author: "李记者",
    time: "3小时前",
    views: "8.7k",
    comments: 32,
    hot: false
  },
  {
    id: 3,
    title: "新兴市场经济复苏势头强劲",
    summary: "多个新兴市场国家经济指标显示，消费信心回升，制造业PMI连续三个月保持在扩张区间...",
    image: "https://via.placeholder.com/400x250/f59e0b/ffffff?text=经济复苏",
    category: "经济",
    author: "王分析师",
    time: "4小时前",
    views: "15.2k",
    comments: 67,
    hot: true
  },
  {
    id: 4,
    title: "教育数字化转型加速推进",
    summary: "各地学校积极拥抱数字化教学，在线教育平台用户量激增，教学效果显著提升...",
    image: "https://via.placeholder.com/400x250/8b5cf6/ffffff?text=数字教育",
    category: "教育",
    author: "陈老师",
    time: "5小时前",
    views: "6.9k",
    comments: 28,
    hot: false
  },
  {
    id: 5,
    title: "体育产业迎来新一轮发展机遇",
    summary: "随着全民健身意识增强，体育产业规模持续扩大，预计年增长率将达到15%...",
    image: "https://via.placeholder.com/400x250/ef4444/ffffff?text=体育产业",
    category: "体育",
    author: "刘教练",
    time: "6小时前",
    views: "9.4k",
    comments: 41,
    hot: false
  },
  {
    id: 6,
    title: "文化创意产业蓬勃发展",
    summary: "国内文创产业呈现多元化发展态势，传统文化与现代科技深度融合，产业价值不断提升...",
    image: "https://via.placeholder.com/400x250/ec4899/ffffff?text=文创产业",
    category: "文化",
    author: "赵策展人",
    time: "7小时前",
    views: "7.1k",
    comments: 35,
    hot: false
  },
  {
    id: 7,
    title: "5G网络建设全面提速",
    summary: "全国5G基站数量已超过300万个，网络覆盖率达到85%，为数字经济发展提供强劲支撑...",
    image: "https://via.placeholder.com/400x250/06b6d4/ffffff?text=5G网络",
    category: "科技",
    author: "孙工程师",
    time: "8小时前",
    views: "11.8k",
    comments: 53,
    hot: true
  },
  {
    id: 8,
    title: "绿色金融市场快速发展",
    summary: "绿色债券发行量创新高，ESG投资理念深入人心，可持续发展成为投资新趋势...",
    image: "https://via.placeholder.com/400x250/84cc16/ffffff?text=绿色金融",
    category: "金融",
    author: "马分析师",
    time: "9小时前",
    views: "5.6k",
    comments: 22,
    hot: false
  },
  {
    id: 9,
    title: "智慧城市建设取得阶段性成果",
    summary: "多个试点城市在交通管理、环境监测、公共服务等领域实现智能化升级...",
    image: "https://via.placeholder.com/400x250/a855f7/ffffff?text=智慧城市",
    category: "城市",
    author: "高规划师",
    time: "10小时前",
    views: "8.3k",
    comments: 38,
    hot: false
  },
  {
    id: 10,
    title: "新能源汽车渗透率持续攀升",
    summary: "本月新能源汽车市场份额首次突破30%，消费者对电动汽车接受度显著提高...",
    image: "https://via.placeholder.com/400x250/f97316/ffffff?text=新能源车",
    category: "汽车",
    author: "周编辑",
    time: "11小时前",
    views: "13.5k",
    comments: 72,
    hot: true
  },
  {
    id: 11,
    title: "生物医药行业创新活跃",
    summary: "国产创新药上市数量创历史新高，生物医药产业集群效应显著，研发投入持续增长...",
    image: "https://via.placeholder.com/400x250/14b8a6/ffffff?text=生物医药",
    category: "医药",
    author: "吴研究员",
    time: "12小时前",
    views: "6.8k",
    comments: 29,
    hot: false
  },
  {
    id: 12,
    title: "数字货币试点范围继续扩大",
    summary: "央行数字货币在更多城市开展试点应用，支付便民效果显著，安全性能持续优化...",
    image: "https://via.placeholder.com/400x250/6366f1/ffffff?text=数字货币",
    category: "金融",
    author: "邓专家",
    time: "13小时前",
    views: "10.2k",
    comments: 48,
    hot: false
  }
];

const categories = [
  { id: "all", name: "全部", color: "gray" },
  { id: "tech", name: "科技", color: "blue" },
  { id: "economy", name: "经济", color: "green" },
  { id: "education", name: "教育", color: "purple" },
  { id: "sports", name: "体育", color: "red" },
  { id: "culture", name: "文化", color: "pink" },
  { id: "finance", name: "金融", color: "yellow" },
  { id: "auto", name: "汽车", color: "orange" },
];

export default function GridLayoutDemo() {
  const [selectedCategory, setSelectedCategory] = React.useState("all");
  const [isLoading, setIsLoading] = React.useState(false);
  const [displayCount, setDisplayCount] = React.useState(9);

  const loadMore = () => {
    setIsLoading(true);
    // 模拟加载延迟
    setTimeout(() => {
      setDisplayCount(prev => Math.min(prev + 6, newsData.length));
      setIsLoading(false);
    }, 1000);
  };

  const filteredNews = selectedCategory === "all" 
    ? newsData.slice(0, displayCount)
    : newsData.filter(news => 
        news.category.toLowerCase().includes(selectedCategory.toLowerCase())
      ).slice(0, displayCount);

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      "科技": "bg-blue-100 text-blue-600",
      "经济": "bg-green-100 text-green-600",
      "教育": "bg-purple-100 text-purple-600",
      "体育": "bg-red-100 text-red-600",
      "文化": "bg-pink-100 text-pink-600",
      "金融": "bg-yellow-100 text-yellow-600",
      "汽车": "bg-orange-100 text-orange-600",
      "环境": "bg-emerald-100 text-emerald-600",
      "城市": "bg-indigo-100 text-indigo-600",
      "医药": "bg-teal-100 text-teal-600",
    };
    return colors[category] || "bg-gray-100 text-gray-600";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="text-2xl font-bold text-blue-600">资讯网格</div>
            </div>
            
            {/* 中央搜索 */}
            <div className="flex-1 max-w-2xl mx-8">
              <div className="relative">
                <input
                  type="text"
                  placeholder="搜索资讯内容..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <svg className="w-5 h-5 text-gray-400 absolute right-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            
            {/* 右侧操作 */}
            <div className="flex items-center space-x-4">
              <button className="text-gray-600 hover:text-blue-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM11 3H6l5 5V3z" />
                </svg>
              </button>
              <button className="text-gray-600 hover:text-blue-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 分类筛选栏 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-1 py-4 overflow-x-auto">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  selectedCategory === category.id
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 统计信息 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">
                {selectedCategory === "all" ? "全部资讯" : `${categories.find(c => c.id === selectedCategory)?.name}资讯`}
              </h1>
              <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm font-medium">
                {filteredNews.length} 篇文章
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">排序：</span>
              <select className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500">
                <option>最新发布</option>
                <option>最多阅读</option>
                <option>最多评论</option>
                <option>推荐度</option>
              </select>
            </div>
          </div>
        </div>

        {/* 网格卡片区域 */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          {filteredNews.map((news) => (
            <article key={news.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
              {/* 图片区域 */}
              <div className="relative">
                <img
                  src={news.image}
                  alt={news.title}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {news.hot && (
                  <span className="absolute top-3 left-3 bg-red-500 text-white px-2 py-1 rounded text-xs font-medium">
                    热点
                  </span>
                )}
                <span className={`absolute top-3 right-3 px-2 py-1 rounded text-xs font-medium ${getCategoryColor(news.category)}`}>
                  {news.category}
                </span>
              </div>
              
              {/* 内容区域 */}
              <div className="p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2 group-hover:text-blue-600 cursor-pointer">
                  {news.title}
                </h3>
                
                <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3">
                  {news.summary}
                </p>
                
                {/* 元信息 */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {news.author}
                    </span>
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {news.time}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      {news.views}
                    </span>
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      {news.comments}
                    </span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* 加载更多 */}
        {displayCount < newsData.length && (
          <div className="text-center">
            <button
              onClick={loadMore}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center mx-auto"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  加载中...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                  加载更多
                </>
              )}
            </button>
          </div>
        )}
      </main>

      {/* 专题广告区域 */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-white">
            <h2 className="text-3xl font-bold mb-4">特别专题</h2>
            <p className="text-xl mb-8 opacity-90">深度解析热点话题，专业视角解读时事</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white bg-opacity-20 rounded-lg p-6 backdrop-blur-sm">
                <h3 className="text-lg font-semibold mb-2">科技前沿</h3>
                <p className="text-sm opacity-90">探索最新科技趋势与发展</p>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-6 backdrop-blur-sm">
                <h3 className="text-lg font-semibold mb-2">经济观察</h3>
                <p className="text-sm opacity-90">深度分析经济形势变化</p>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-6 backdrop-blur-sm">
                <h3 className="text-lg font-semibold mb-2">社会热点</h3>
                <p className="text-sm opacity-90">关注社会发展重要议题</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 返回演示首页 */}
      <div className="fixed bottom-6 right-6">
        <Link
          href="/portal/demo"
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors"
          title="返回演示首页"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
