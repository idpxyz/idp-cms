import React from "react";
import Link from "next/link";
import InfiniteNewsList from "../components/InfiniteNewsList";

// 强制动态渲染，因为此页面使用客户端组件
export const dynamic = 'force-dynamic';

export default function AllNewsPage() {
  return (
    <div className="bg-gray-50 min-h-screen">
      {/* 顶部导航 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                href="/portal"
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <span className="mr-2">←</span>
                返回门户
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">全部新闻</h1>
            </div>
            
            {/* 筛选选项 */}
            <div className="flex items-center space-x-4">
              <select className="border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="final_score">综合排序</option>
                <option value="publish_time">最新发布</option>
                <option value="popularity">热门度</option>
                <option value="ctr">点击率</option>
              </select>
              
              <select className="border border-gray-300 rounded-md px-3 py-2 text-sm">
                <option value="168">近一周</option>
                <option value="24">近一天</option>
                <option value="72">近三天</option>
                <option value="720">近一月</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <InfiniteNewsList 
            initialSize={20}
            className=""
          />
        </div>
      </div>
    </div>
  );
}
