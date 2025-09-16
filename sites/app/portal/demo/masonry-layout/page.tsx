"use client";

import React from "react";
import Link from "next/link";

// 模拟瀑布流内容数据
const masonryContent = [
  {
    id: 1,
    type: "image",
    title: "春日时尚搭配指南",
    image: "https://via.placeholder.com/300x400/f472b6/ffffff?text=时尚搭配",
    category: "时尚",
    author: "时尚达人",
    likes: 1240,
    comments: 89,
    height: 400,
  },
  {
    id: 2,
    type: "video",
    title: "美食制作全过程",
    image: "https://via.placeholder.com/300x200/fbbf24/ffffff?text=美食制作",
    category: "美食",
    author: "美食博主",
    likes: 856,
    comments: 124,
    height: 200,
    duration: "3:45",
  },
  {
    id: 3,
    type: "image",
    title: "极简生活空间设计灵感",
    image: "https://via.placeholder.com/300x500/10b981/ffffff?text=空间设计",
    category: "设计",
    author: "设计师小李",
    likes: 2103,
    comments: 67,
    height: 500,
  },
  {
    id: 4,
    type: "text",
    title: "旅行中的美好瞬间分享",
    content: "在这次旅行中，我发现了许多意想不到的美景和有趣的故事。每一个地方都有它独特的魅力，每一次相遇都让人难忘...",
    category: "旅行",
    author: "旅行家",
    likes: 445,
    comments: 32,
    height: 180,
  },
  {
    id: 5,
    type: "image",
    title: "宠物的可爱日常",
    image: "https://via.placeholder.com/300x350/8b5cf6/ffffff?text=可爱宠物",
    category: "宠物",
    author: "宠物主人",
    likes: 1876,
    comments: 156,
    height: 350,
  },
  {
    id: 6,
    type: "video",
    title: "健身训练日记",
    image: "https://via.placeholder.com/300x250/ef4444/ffffff?text=健身训练",
    category: "健身",
    author: "健身教练",
    likes: 892,
    comments: 78,
    height: 250,
    duration: "2:30",
  },
  {
    id: 7,
    type: "image",
    title: "手工艺品制作过程",
    image: "https://via.placeholder.com/300x450/06b6d4/ffffff?text=手工制作",
    category: "手工",
    author: "手工达人",
    likes: 634,
    comments: 43,
    height: 450,
  },
  {
    id: 8,
    type: "text",
    title: "读书心得分享",
    content: "这本书给我带来了很多启发，作者的观点独到而深刻。特别是关于人生哲学的部分，让我重新思考了很多问题...",
    category: "读书",
    author: "读书爱好者",
    likes: 298,
    comments: 25,
    height: 160,
  },
  {
    id: 9,
    type: "image",
    title: "自然风光摄影作品",
    image: "https://via.placeholder.com/300x380/84cc16/ffffff?text=自然摄影",
    category: "摄影",
    author: "摄影师",
    likes: 1567,
    comments: 91,
    height: 380,
  },
  {
    id: 10,
    type: "video",
    title: "音乐创作分享",
    image: "https://via.placeholder.com/300x220/a855f7/ffffff?text=音乐创作",
    category: "音乐",
    author: "音乐人",
    likes: 723,
    comments: 68,
    height: 220,
    duration: "4:12",
  },
  {
    id: 11,
    type: "image",
    title: "城市街头艺术",
    image: "https://via.placeholder.com/300x420/f59e0b/ffffff?text=街头艺术",
    category: "艺术",
    author: "艺术爱好者",
    likes: 956,
    comments: 54,
    height: 420,
  },
  {
    id: 12,
    type: "text",
    title: "科技产品使用体验",
    content: "最近入手了这款新产品，使用了一段时间后，整体感受还是很不错的。特别是在性能和设计方面都有不少亮点...",
    category: "科技",
    author: "数码达人",
    likes: 412,
    comments: 37,
    height: 200,
  },
  {
    id: 13,
    type: "image",
    title: "家居装饰灵感",
    image: "https://via.placeholder.com/300x320/ec4899/ffffff?text=家居装饰",
    category: "家居",
    author: "家居达人",
    likes: 834,
    comments: 62,
    height: 320,
  },
  {
    id: 14,
    type: "video",
    title: "化妆教程分享",
    image: "https://via.placeholder.com/300x280/14b8a6/ffffff?text=化妆教程",
    category: "美妆",
    author: "美妆博主",
    likes: 1245,
    comments: 134,
    height: 280,
    duration: "5:20",
  },
  {
    id: 15,
    type: "image",
    title: "花园种植记录",
    image: "https://via.placeholder.com/300x360/65a30d/ffffff?text=花园种植",
    category: "园艺",
    author: "园艺爱好者",
    likes: 567,
    comments: 48,
    height: 360,
  },
];

const categories = [
  { id: "all", name: "全部", icon: "🌟" },
  { id: "fashion", name: "时尚", icon: "👗" },
  { id: "food", name: "美食", icon: "🍳" },
  { id: "design", name: "设计", icon: "🎨" },
  { id: "travel", name: "旅行", icon: "✈️" },
  { id: "pets", name: "宠物", icon: "🐱" },
  { id: "fitness", name: "健身", icon: "💪" },
  { id: "diy", name: "手工", icon: "🛠️" },
  { id: "reading", name: "读书", icon: "📚" },
  { id: "photography", name: "摄影", icon: "📸" },
];

export default function MasonryLayoutDemo() {
  const [selectedCategory, setSelectedCategory] = React.useState("all");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const filteredContent = masonryContent.filter(item => {
    const matchesCategory = selectedCategory === "all" || 
      item.category.toLowerCase().includes(selectedCategory);
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const loadMore = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50">
      {/* 顶部导航 */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                生活美学
              </div>
            </div>
            
            {/* 搜索栏 */}
            <div className="flex-1 max-w-lg mx-8">
              <div className="relative">
                <input
                  type="text"
                  placeholder="搜索灵感与创意..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white/90"
                />
                <svg className="w-5 h-5 text-gray-400 absolute right-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            
            {/* 右侧操作 */}
            <div className="flex items-center space-x-4">
              <button className="text-gray-600 hover:text-pink-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
              <button className="text-gray-600 hover:text-pink-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 分类筛选 */}
      <div className="bg-white/70 backdrop-blur-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-2 py-4 overflow-x-auto">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full font-medium transition-all whitespace-nowrap ${
                  selectedCategory === category.id
                    ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg"
                    : "bg-white/80 text-gray-600 hover:bg-white hover:shadow-md"
                }`}
              >
                <span>{category.icon}</span>
                <span>{category.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 瀑布流内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 瀑布流容器 */}
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
          {filteredContent.map((item) => (
            <div
              key={item.id}
              className="break-inside-avoid mb-6 bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer"
            >
              {/* 图片类型内容 */}
              {item.type === "image" && (
                <>
                  <div className="relative overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
                      style={{ height: `${item.height}px` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium text-gray-700">
                      {item.category}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                      {item.title}
                    </h3>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {item.author}
                      </span>
                      <div className="flex items-center space-x-3">
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                          </svg>
                          {formatNumber(item.likes)}
                        </span>
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          {item.comments}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* 视频类型内容 */}
              {item.type === "video" && (
                <>
                  <div className="relative overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
                      style={{ height: `${item.height}px` }}
                    />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <svg className="w-8 h-8 text-gray-700 ml-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                        </svg>
                      </div>
                    </div>
                    <div className="absolute top-3 left-3 bg-black/70 text-white px-2 py-1 rounded text-xs font-medium">
                      {item.duration}
                    </div>
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium text-gray-700">
                      {item.category}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                      {item.title}
                    </h3>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {item.author}
                      </span>
                      <div className="flex items-center space-x-3">
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                          </svg>
                          {formatNumber(item.likes)}
                        </span>
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          {item.comments}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* 文字类型内容 */}
              {item.type === "text" && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="bg-gradient-to-r from-pink-100 to-purple-100 text-purple-600 px-3 py-1 rounded-full text-xs font-medium">
                      {item.category}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-3 text-lg">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed mb-4 text-sm">
                    {item.content}
                  </p>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {item.author}
                    </span>
                    <div className="flex items-center space-x-3">
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                        </svg>
                        {formatNumber(item.likes)}
                      </span>
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        {item.comments}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 加载更多 */}
        <div className="text-center mt-12">
          <button
            onClick={loadMore}
            disabled={isLoading}
            className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 disabled:opacity-50 text-white px-8 py-3 rounded-full font-medium transition-all flex items-center mx-auto shadow-lg hover:shadow-xl"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                发现更多...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                发现更多内容
              </>
            )}
          </button>
        </div>
      </main>

      {/* 浮动操作按钮 */}
      <div className="fixed bottom-6 left-6">
        <button className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white p-4 rounded-full shadow-lg transition-all hover:scale-110">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* 返回演示首页 */}
      <div className="fixed bottom-6 right-6">
        <Link
          href="/portal/demo"
          className="bg-white hover:bg-gray-50 text-gray-700 p-3 rounded-full shadow-lg transition-colors border"
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
