import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import PageContainer from "@/components/layout/PageContainer";
import Section from "@/components/layout/Section";

export const metadata: Metadata = {
  title: "新闻平台布局方案演示 - IDP-CMS", 
  description: "专业综合新闻平台布局设计方案演示，包含AI治理专题、BBC风格布局、Hero Banner、网格卡片、瀑布流等多种布局方案。",
  keywords: "新闻布局,AI治理专题,BBC风格,Hero Banner,网格布局,瀑布流,视频优先,响应式设计,专题页面",
};

interface LayoutOption {
  id: string;
  title: string;
  description: string;
  features: string[];
  suitableFor: string[];
  rating: number;
  link: string;
}

const layoutOptions: LayoutOption[] = [
  {
    id: "ai-governance",
    title: "🤖 AI与治理专题展示（最新上线）",
    description: "专业级专题页面系统，深度展示AI治理的全球动态、政策框架、专家观点与产业影响。",
    features: [
      "六大专业内容模块",
      "全球政策文档解读", 
      "深度分析与专家观点",
      "交互式时间线设计"
    ],
    suitableFor: [
      "专题报道系统",
      "深度内容平台",
      "学术研究机构",
      "政策解读网站"
    ],
    rating: 5,
    link: "/portal/demo/ai-governance"
  },
  {
    id: "hybrid-design",
    title: "📰 BBC风格专业新闻布局（强烈推荐）",
    description: "参考BBC等国际主流媒体设计，专业严谨的新闻展示，内容丰富完整，适合权威媒体。",
    features: [
      "经典红白黑配色方案",
      "清晰的信息层级结构",
      "完整的新闻内容展示",
      "专业的实时更新系统"
    ],
    suitableFor: [
      "主流新闻机构",
      "政府媒体平台",
      "权威资讯网站"
    ],
    rating: 5,
    link: "/portal/demo/hybrid-design"
  },
  {
    id: "hero-banner",
    title: "Hero Banner + 两栏结构",
    description: "经典门户网站布局，重大新闻突出展示，层级清晰，编辑可控性高。",
    features: [
      "头条轮播大图区",
      "主新闻流 + 右侧边栏",
      "频道分区显示",
      "响应式设计"
    ],
    suitableFor: [
      "综合门户型网站",
      "主流新闻机构",
      "需要权威性展示"
    ],
    rating: 5,
    link: "/portal/demo/hero-banner"
  },
  {
    id: "grid-layout",
    title: "网格卡片流式布局",
    description: "规整统一的卡片布局，适合自动化推荐和动态加载。",
    features: [
      "2-4列网格卡片",
      "标题+缩略图+摘要",
      "无限滚动支持",
      "个性化推荐兼容"
    ],
    suitableFor: [
      "资讯密集型网站",
      "科技资讯平台",
      "地方新闻集合站"
    ],
    rating: 3,
    link: "/portal/demo/grid-layout"
  },
  {
    id: "masonry-layout",
    title: "瀑布流布局",
    description: "视觉驱动的自由排布，高度自适应，图像呈现效果强。",
    features: [
      "自由高度排布",
      "图文混合显示",
      "Pinterest风格",
      "视觉吸引力强"
    ],
    suitableFor: [
      "娱乐时尚资讯",
      "图片驱动平台",
      "生活方式内容"
    ],
    rating: 2,
    link: "/portal/demo/masonry-layout"
  },
  {
    id: "visual-first",
    title: "数据新闻/视频优先",
    description: "以视频和数据可视化为核心的现代新闻布局，沉浸感强。",
    features: [
      "全屏视频头条",
      "数据图表展示",
      "交互式内容",
      "实时数据集成"
    ],
    suitableFor: [
      "数据可视化媒体",
      "现代创新媒体",
      "高价值用户群体"
    ],
    rating: 4,
    link: "/portal/demo/visual-first"
  }
];

const StarRating = ({ rating }: { rating: number }) => {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-5 h-5 ${
            star <= rating ? "text-yellow-400" : "text-gray-300"
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-2 text-sm text-gray-600">({rating}/5)</span>
    </div>
  );
};

export default function DemoIndexPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <PageContainer padding="lg">
        <Section space="lg">
          {/* 页面标题 */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              新闻平台布局方案演示
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              基于专业综合新闻平台需求设计的五种典型布局方案，包含全新的智能自适应混合布局，
              满足不同场景下的信息架构与用户体验需求。
            </p>
          </div>

          {/* 布局方案网格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {layoutOptions.map((option) => (
              <div
                key={option.id}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden"
              >
                <div className="p-8">
                  {/* 标题和评级 */}
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {option.title}
                    </h2>
                    <StarRating rating={option.rating} />
                  </div>

                  {/* 描述 */}
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    {option.description}
                  </p>

                  {/* 特性列表 */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">
                      核心特性
                    </h3>
                    <ul className="space-y-2">
                      {option.features.map((feature, index) => (
                        <li key={index} className="flex items-center text-gray-600">
                          <svg
                            className="w-5 h-5 text-green-500 mr-3 flex-shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 适用场景 */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">
                      适用场景
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {option.suitableFor.map((scenario, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                        >
                          {scenario}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 查看演示按钮 */}
                  <Link
                    href={option.link}
                    className="block w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-center py-3 px-6 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105"
                  >
                    查看演示页面
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* 技术说明 */}
          <div className="mt-16 bg-white rounded-xl shadow-lg p-8 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">技术实现建议</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">前端技术栈</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• React + Next.js (SSR支持)</li>
                  <li>• Tailwind CSS (样式框架)</li>
                  <li>• TypeScript (类型安全)</li>
                  <li>• PWA (多终端适配)</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">后端架构</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Django + Wagtail CMS</li>
                  <li>• GraphQL/REST API</li>
                  <li>• WebSocket (实时推送)</li>
                  <li>• CDN + 缓存优化</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 返回链接 */}
          <div className="text-center mt-12">
            <Link
              href="/portal"
              className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              返回门户首页
            </Link>
          </div>
        </Section>
      </PageContainer>
    </div>
  );
}
