import React from "react";
import TopStoriesGrid from "../components/TopStoriesGrid";
import { getTopStoriesDefaultHours, getChannelDefaultHours } from "@/lib/config/content-timing";

export default function TestHeadlinesPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-8">现代头条模块测试 (v3)</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 热点新闻 */}
        <div className="max-w-md">
          <h2 className="text-lg font-semibold mb-4 text-blue-600">热点新闻 (24小时)</h2>
          <TopStoriesGrid 
            autoFetch={true}
            fetchLimit={8}
            fetchOptions={{ 
              hours: getTopStoriesDefaultHours(), // 🎯 使用集中化配置
              diversity: 'high' 
            }}
            title="热点新闻"
            showViewMore={true}
            viewMoreLink="/portal/news"
          />
        </div>
        
        {/* 趋势新闻 */}
        <div className="max-w-md">
          <h2 className="text-lg font-semibold mb-4 text-green-600">趋势新闻 (168小时)</h2>
          <TopStoriesGrid 
            autoFetch={true}
            fetchLimit={8}
            fetchOptions={{ 
              hours: getChannelDefaultHours(), // 🎯 使用集中化配置 (168小时)
              diversity: 'med' 
            }}
            title="趋势新闻"
            showViewMore={true}
            viewMoreLink="/portal/news"
          />
        </div>
      </div>
      
      <div className="mt-8 text-sm text-gray-600">
        <p>现代缓存系统测试说明：</p>
        <ul className="list-disc pl-5 mt-2">
          <li>左侧显示24小时热点新闻，右侧显示168小时趋势新闻</li>
          <li>使用现代化v3缓存架构，智能分层缓存</li>
          <li>支持突发新闻实时检测和动态缓存时间</li>
          <li>观察浏览器控制台的现代缓存调试信息</li>
          <li>检查Network面板的X-Cache-Strategy响应头</li>
        </ul>
      </div>
    </div>
  );
}
