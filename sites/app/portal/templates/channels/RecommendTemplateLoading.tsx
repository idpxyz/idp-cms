import React from 'react';
import PageContainer from "@/components/layout/PageContainer";
import Section from "@/components/layout/Section";

/**
 * 推荐频道加载骨架屏
 * 布局完全匹配 RecommendTemplate（Hero + TopStories + ChannelStrips）
 */
const RecommendTemplateLoading: React.FC = () => {
  return (
    <>
      {/* Hero 骨架屏 - 使用与 HeroCarousel 完全相同的高度类 */}
      <PageContainer padding="none">
        <div className="relative w-full h-[50vh] md:h-[55vh] lg:h-[60vh] min-h-[300px] max-h-[600px] bg-gray-200 animate-pulse overflow-hidden">
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-500 rounded-full animate-spin mb-3"></div>
            <p className="text-sm">加载推荐内容...</p>
          </div>
        </div>
      </PageContainer>

      <PageContainer padding="adaptive">
        {/* Top Stories 骨架屏 */}
        <Section space="md">
          <div className="mb-6">
            <div className="h-8 w-32 bg-gray-200 animate-pulse rounded"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200">
                <div className="aspect-video bg-gray-200 animate-pulse"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 animate-pulse rounded"></div>
                  <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4"></div>
                  <div className="flex items-center space-x-4 mt-3">
                    <div className="h-3 w-20 bg-gray-100 animate-pulse rounded"></div>
                    <div className="h-3 w-16 bg-gray-100 animate-pulse rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* 频道条带骨架屏（3个） */}
        {[1, 2, 3].map((stripIndex) => (
          <Section key={stripIndex} space="lg">
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div className="h-8 w-24 bg-gray-200 animate-pulse rounded"></div>
                <div className="h-6 w-20 bg-gray-100 animate-pulse rounded"></div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200">
                  <div className="aspect-video bg-gray-200 animate-pulse"></div>
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-gray-200 animate-pulse rounded"></div>
                    <div className="h-4 bg-gray-200 animate-pulse rounded w-2/3"></div>
                    <div className="h-3 bg-gray-100 animate-pulse rounded w-1/2 mt-3"></div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        ))}

        {/* 智能推荐骨架屏 */}
        <Section space="md">
          <div className="mb-6">
            <div className="h-8 w-32 bg-gray-200 animate-pulse rounded"></div>
          </div>
          <div className="space-y-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200">
                <div className="p-6">
                  <div className="flex space-x-6">
                    <div className="w-48 h-32 bg-gray-200 animate-pulse rounded flex-shrink-0"></div>
                    <div className="flex-1 space-y-3">
                      <div className="h-6 bg-gray-200 animate-pulse rounded"></div>
                      <div className="h-6 bg-gray-200 animate-pulse rounded w-4/5"></div>
                      <div className="h-4 bg-gray-100 animate-pulse rounded"></div>
                      <div className="h-4 bg-gray-100 animate-pulse rounded w-3/4"></div>
                      <div className="flex items-center space-x-4 mt-4">
                        <div className="h-3 w-16 bg-gray-100 animate-pulse rounded"></div>
                        <div className="h-3 w-20 bg-gray-100 animate-pulse rounded"></div>
                        <div className="h-3 w-16 bg-gray-100 animate-pulse rounded"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </PageContainer>
    </>
  );
};

export default RecommendTemplateLoading;

