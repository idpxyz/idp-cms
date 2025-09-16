"use client";

import React from "react";
import Link from "next/link";

// Note: metadata is not supported in client components

// 模拟数据
const heroNews = [
  {
    id: 1,
    title: "重大科技突破：量子计算机实现新里程碑",
    summary: "科学家宣布在量子计算领域取得重大突破，新技术有望revolutionize计算机行业...",
    image: "https://via.placeholder.com/800x400/4f46e5/ffffff?text=科技突破",
    category: "科技",
    time: "2小时前"
  },
  {
    id: 2,
    title: "全球气候峰会达成历史性协议",
    summary: "各国领导人在气候峰会上就减排目标达成共识，为应对全球变暖制定新行动计划...",
    image: "https://via.placeholder.com/800x400/059669/ffffff?text=气候峰会",
    category: "国际",
    time: "4小时前"
  },
  {
    id: 3,
    title: "经济复苏势头强劲，就业率创新高",
    summary: "最新数据显示，国内经济持续复苏，失业率降至历史低位，多个行业迎来增长机遇...",
    image: "https://via.placeholder.com/800x400/dc2626/ffffff?text=经济增长",
    category: "经济",
    time: "6小时前"
  },
  {
    id: 4,
    title: "教育改革新政策正式实施",
    summary: "教育部发布新的教育改革政策，重点关注数字化教学和素质教育发展...",
    image: "https://via.placeholder.com/800x400/7c3aed/ffffff?text=教育改革",
    category: "教育",
    time: "8小时前"
  }
];

const mainNews = [
  { id: 1, title: "国内制造业PMI指数连续三个月上升", category: "经济", time: "1小时前", hot: true },
  { id: 2, title: "新型疫苗研发取得重要进展", category: "健康", time: "2小时前", hot: false },
  { id: 3, title: "5G基站建设超额完成年度目标", category: "科技", time: "3小时前", hot: true },
  { id: 4, title: "文化旅游业复苏态势良好", category: "文化", time: "4小时前", hot: false },
  { id: 5, title: "新能源汽车销量创历史新高", category: "汽车", time: "5小时前", hot: true },
  { id: 6, title: "高校毕业生就业率持续提升", category: "教育", time: "6小时前", hot: false },
];

const hotNews = [
  { id: 1, title: "突发：重要会议将于明日召开", rank: 1 },
  { id: 2, title: "股市今日收盘创年内新高", rank: 2 },
  { id: 3, title: "体育赛事精彩瞬间回顾", rank: 3 },
  { id: 4, title: "科技巨头发布最新产品", rank: 4 },
  { id: 5, title: "文艺演出获得观众好评", rank: 5 },
];

const liveNews = [
  { id: 1, title: "实时：重要会议进行中", status: "直播中", viewers: "12.3万" },
  { id: 2, title: "快讯：市场行情分析", status: "即将开始", viewers: "8.7万" },
  { id: 3, title: "专题：经济形势解读", status: "重播", viewers: "5.2万" },
];

export default function HeroBannerDemo() {
  const [currentSlide, setCurrentSlide] = React.useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroNews.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="text-2xl font-bold text-blue-600">新闻门户</div>
            </div>
            
            {/* 频道导航 */}
            <nav className="hidden md:flex space-x-8">
              <a href="#" className="text-red-600 font-medium">推荐</a>
              <a href="#" className="text-gray-700 hover:text-blue-600">国内</a>
              <a href="#" className="text-gray-700 hover:text-blue-600">国际</a>
              <a href="#" className="text-gray-700 hover:text-blue-600">科技</a>
              <a href="#" className="text-gray-700 hover:text-blue-600">经济</a>
              <a href="#" className="text-gray-700 hover:text-blue-600">文化</a>
              <a href="#" className="text-gray-700 hover:text-blue-600">体育</a>
            </nav>
            
            {/* 搜索和登录 */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="搜索新闻..."
                  className="w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <svg className="w-5 h-5 text-gray-400 absolute right-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                登录
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero 轮播大图区 */}
      <section className="relative bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="relative h-96 overflow-hidden">
            {heroNews.map((news, index) => (
              <div
                key={news.id}
                className={`absolute inset-0 transition-opacity duration-1000 ${
                  index === currentSlide ? "opacity-100" : "opacity-0"
                }`}
              >
                <img
                  src={news.image}
                  alt={news.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-40"></div>
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <div className="max-w-4xl">
                    <span className="inline-block bg-red-600 text-white px-3 py-1 rounded text-sm font-medium mb-3">
                      {news.category}
                    </span>
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
                      {news.title}
                    </h1>
                    <p className="text-gray-200 text-lg mb-4 line-clamp-2">
                      {news.summary}
                    </p>
                    <div className="flex items-center text-gray-300 text-sm">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {news.time}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* 轮播指示器 */}
          <div className="absolute bottom-4 right-8 flex space-x-2">
            {heroNews.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentSlide ? "bg-white" : "bg-white bg-opacity-50"
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 主要内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 主新闻流 (左侧，占2/3) */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b">
                <h2 className="text-2xl font-bold text-gray-900">最新资讯</h2>
              </div>
              
              <div className="divide-y">
                {mainNews.map((news) => (
                  <article key={news.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="inline-block bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs font-medium">
                            {news.category}
                          </span>
                          {news.hot && (
                            <span className="inline-block bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-medium">
                              热点
                            </span>
                          )}
                          <span className="text-gray-500 text-sm">{news.time}</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 cursor-pointer">
                          {news.title}
                        </h3>
                      </div>
                      <div className="ml-4 w-24 h-16 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                        <img
                          src={`https://via.placeholder.com/96x64/6b7280/ffffff?text=${news.category}`}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              
              <div className="p-6 text-center">
                <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                  加载更多
                </button>
              </div>
            </div>
          </div>

          {/* 右侧边栏 (占1/3) */}
          <div className="space-y-6">
            {/* 热点榜 */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-4 border-b">
                <h3 className="text-lg font-bold text-gray-900">热点排行</h3>
              </div>
              <div className="p-4 space-y-3">
                {hotNews.map((news) => (
                  <div key={news.id} className="flex items-start space-x-3">
                    <span className={`inline-block w-6 h-6 rounded text-center text-sm font-bold text-white ${
                      news.rank <= 3 ? "bg-red-500" : "bg-gray-400"
                    }`}>
                      {news.rank}
                    </span>
                    <p className="text-gray-800 text-sm hover:text-blue-600 cursor-pointer line-clamp-2">
                      {news.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* 直播快讯 */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-4 border-b">
                <h3 className="text-lg font-bold text-gray-900">直播快讯</h3>
              </div>
              <div className="p-4 space-y-4">
                {liveNews.map((live) => (
                  <div key={live.id} className="border-l-4 border-red-500 pl-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        live.status === "直播中" ? "bg-red-100 text-red-600" : 
                        live.status === "即将开始" ? "bg-yellow-100 text-yellow-600" : 
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {live.status}
                      </span>
                      <span className="text-xs text-gray-500">{live.viewers}观看</span>
                    </div>
                    <p className="text-sm text-gray-800 hover:text-blue-600 cursor-pointer">
                      {live.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* 广告位 */}
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg p-6 text-white text-center">
              <h4 className="text-lg font-bold mb-2">广告位</h4>
              <p className="text-sm opacity-90 mb-4">这里可以放置广告或推广内容</p>
              <button className="bg-white text-purple-600 px-4 py-2 rounded font-medium hover:bg-gray-100">
                了解更多
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 视频与专题区域 */}
      <section className="bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">视频新闻</h3>
              <p className="text-gray-600">精彩视频内容，深度报道分析</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">数据新闻</h3>
              <p className="text-gray-600">数据可视化，图表分析解读</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">专题报道</h3>
              <p className="text-gray-600">深度专题，全面解析热点</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h4 className="text-lg font-semibold mb-4">关于我们</h4>
              <ul className="space-y-2 text-gray-300">
                <li><a href="#" className="hover:text-white">公司简介</a></li>
                <li><a href="#" className="hover:text-white">联系方式</a></li>
                <li><a href="#" className="hover:text-white">招聘信息</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">服务支持</h4>
              <ul className="space-y-2 text-gray-300">
                <li><a href="#" className="hover:text-white">帮助中心</a></li>
                <li><a href="#" className="hover:text-white">意见反馈</a></li>
                <li><a href="#" className="hover:text-white">投诉建议</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">法律声明</h4>
              <ul className="space-y-2 text-gray-300">
                <li><a href="#" className="hover:text-white">版权声明</a></li>
                <li><a href="#" className="hover:text-white">隐私政策</a></li>
                <li><a href="#" className="hover:text-white">用户协议</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">移动应用</h4>
              <div className="space-y-3">
                <div className="bg-gray-800 rounded-lg p-3 text-center">
                  <p className="text-sm text-gray-300">扫码下载APP</p>
                </div>
                <div className="flex space-x-2">
                  <img src="https://via.placeholder.com/80x24/374151/ffffff?text=App+Store" alt="App Store" className="rounded" />
                  <img src="https://via.placeholder.com/80x24/374151/ffffff?text=Google+Play" alt="Google Play" className="rounded" />
                </div>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 新闻门户. 保留所有权利.</p>
          </div>
        </div>
      </footer>

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
