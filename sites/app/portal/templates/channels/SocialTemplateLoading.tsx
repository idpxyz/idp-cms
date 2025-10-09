import React from 'react';
import PageContainer from "@/components/layout/PageContainer";
import Section from "@/components/layout/Section";

/**
 * 社会频道加载骨架屏
 * 提供良好的加载体验
 */
const SocialTemplateLoading: React.FC = () => {
  return (
    <PageContainer>
      {/* 频道标题栏骨架 */}
      <Section space="sm">
        <div className="border-b border-gray-200 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-6 w-16 bg-gray-100 rounded-full animate-pulse" />
            </div>
            <div className="flex items-center space-x-4">
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
          
          {/* 分类导航骨架 */}
          <div className="flex items-center space-x-6 mt-4">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </Section>

      {/* 头条新闻区域骨架 */}
      <Section space="md">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 主要头条骨架 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200">
              <div className="aspect-video bg-gray-200 animate-pulse" />
              <div className="p-6 space-y-3">
                <div className="h-6 bg-gray-200 rounded animate-pulse" />
                <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse" />
                <div className="h-4 bg-gray-100 rounded animate-pulse" />
                <div className="h-4 bg-gray-100 rounded w-5/6 animate-pulse" />
              </div>
            </div>
          </div>

          {/* 重要新闻列表骨架 */}
          <div className="space-y-4">
            <div className="h-6 bg-gray-200 rounded w-24 animate-pulse" />
            
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex space-x-4">
                  <div className="w-20 h-14 bg-gray-200 rounded animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse" />
                    <div className="h-3 bg-gray-100 rounded w-1/2 animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* 主要内容区域骨架 */}
      <Section space="md">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 左侧内容骨架 */}
          <div className="lg:col-span-3 space-y-6">
            {/* 深度报道骨架 */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="p-6 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            </div>

            {/* 最新动态骨架 */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="divide-y divide-gray-200">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-6">
                    <div className="flex space-x-4">
                      <div className="w-24 h-16 bg-gray-200 rounded animate-pulse flex-shrink-0" />
                      <div className="flex-1 space-y-3">
                        <div className="h-5 bg-gray-200 rounded animate-pulse" />
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        <div className="h-3 bg-gray-100 rounded w-1/2 animate-pulse" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 侧边栏骨架 */}
          <div className="space-y-6">
            {/* 热点排行骨架 */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-red-600 px-4 py-3">
                <div className="h-5 w-16 bg-red-500 rounded animate-pulse" />
              </div>
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded flex-1 animate-pulse" />
                  </div>
                ))}
              </div>
            </div>

            {/* 数据统计骨架 */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="p-4 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="text-center space-y-2">
                    <div className="h-8 w-16 bg-gray-200 rounded mx-auto animate-pulse" />
                    <div className="h-3 w-12 bg-gray-100 rounded mx-auto animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Section>
    </PageContainer>
  );
};

export default SocialTemplateLoading;

