import React from 'react';
import HeroCarousel from '../../components/HeroCarousel';

// 模拟不同类型的新闻数据
const mockCompactItems = [
  {
    id: '1',
    title: '日常新闻：市政府发布新政策通知',
    excerpt: '关于优化城市交通管理的最新政策解读',
    image_url: 'https://picsum.photos/1200/600?random=1',
    publish_time: new Date().toISOString(),
    author: '市政记者',
    source: '本地新闻',
    channel: { id: 'local', name: '本地', slug: 'local' },
    slug: 'local-policy-update',
    is_breaking: false,
    is_live: false,
    media_type: 'image' as const,
    tags: ['政策', '交通'],
  }
];

const mockStandardItems = [
  {
    id: '2',
    title: '重要新闻：全国科技创新大会在北京召开',
    excerpt: '来自全国各地的科技专家和企业代表齐聚一堂，共同探讨科技创新发展的未来方向和战略布局。',
    image_url: 'https://picsum.photos/1200/600?random=2',
    publish_time: new Date(Date.now() - 3600000).toISOString(),
    author: '科技记者',
    source: '新华社',
    channel: { id: 'tech', name: '科技', slug: 'tech' },
    slug: 'tech-innovation-conference',
    is_breaking: true,
    is_live: false,
    media_type: 'image' as const,
    tags: ['科技', '创新', '会议'],
  },
  {
    id: '3',
    title: '经济动态：央行发布最新货币政策报告',
    excerpt: '报告显示当前经济运行总体平稳，货币政策将继续保持稳健中性的基调。',
    image_url: 'https://picsum.photos/1200/600?random=3',
    publish_time: new Date(Date.now() - 7200000).toISOString(),
    author: '财经记者',
    source: '财经日报',
    channel: { id: 'finance', name: '财经', slug: 'finance' },
    slug: 'monetary-policy-report',
    is_breaking: false,
    is_live: false,
    media_type: 'image' as const,
    tags: ['经济', '货币政策'],
  }
];

const mockTakeoverItems = [
  {
    id: '4',
    title: '突发直播：重大新闻发布会正在进行',
    excerpt: '政府就最新重大政策调整举行新闻发布会，多位部门负责人现场回答记者提问。',
    image_url: 'https://picsum.photos/1200/600?random=4',
    video_url: 'https://example.com/live-stream',
    publish_time: new Date().toISOString(),
    author: '新闻部',
    source: '官方直播',
    channel: { id: 'politics', name: '政治', slug: 'politics' },
    slug: 'live-press-conference',
    is_breaking: true,
    is_live: true,
    is_event_mode: true,
    media_type: 'video' as const,
    tags: ['直播', '发布会', '政策'],
  },
  {
    id: '5',
    title: '数据头条：2024年经济运行数据实时监控',
    excerpt: '实时展示全国各地经济指标变化情况，包括GDP、就业率、通胀水平等关键数据。',
    image_url: 'https://picsum.photos/1200/600?random=5',
    publish_time: new Date(Date.now() - 1800000).toISOString(),
    author: '数据分析师',
    source: '统计局',
    channel: { id: 'economy', name: '经济', slug: 'economy' },
    slug: 'economic-data-dashboard',
    is_breaking: false,
    is_live: false,
    is_event_mode: true,
    media_type: 'data' as const,
    tags: ['数据', '经济', '监控'],
  }
];

export default function HeroCarouselDemo() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Hero Carousel 演示
        </h1>
        
        {/* 新功能亮点 */}
        <div className="mb-12 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">✨ 新增：无缝循环轮播</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-white p-4 rounded-lg border-l-4 border-green-500">
              <h3 className="font-semibold text-green-800 mb-2">🔄 无缝循环</h3>
              <p className="text-green-700 text-sm">使用slide cloning技术，消除视觉跳跃</p>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-blue-500">
              <h3 className="font-semibold text-blue-800 mb-2">⚡ 性能优化</h3>
              <p className="text-blue-700 text-sm">智能边界重置，最小DOM操作</p>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-purple-500">
              <h3 className="font-semibold text-purple-800 mb-2">🎯 UX友好</h3>
              <p className="text-purple-700 text-sm">自然的循环体验，视觉连贯性</p>
            </div>
            <div className="bg-white p-4 rounded-lg border-l-4 border-orange-500">
              <h3 className="font-semibold text-orange-800 mb-2">📐 场景化设计</h3>
              <p className="text-orange-700 text-sm">根据内容重要性和类型自动调整</p>
            </div>
          </div>
        </div>

        {/* 演示不同模式 */}
        <div className="space-y-12">
          {/* Compact 模式 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Compact 模式 (32-40vh)
            </h2>
            <p className="text-gray-600 mb-6">
              适用于日常频道头条，节省空间，确保下方内容可见
            </p>
            <HeroCarousel
              items={mockCompactItems}
              heightMode="compact"
              hasRightRail={true}
              autoPlay={false}
              className="rounded-lg overflow-hidden shadow-lg"
            />
          </section>

          {/* Standard 模式 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Standard 模式 (48-60vh) - 默认推荐
            </h2>
            <p className="text-gray-600 mb-6">
              平衡展示效果和空间利用，适合大多数重要新闻
            </p>
            <HeroCarousel
              items={mockStandardItems}
              heightMode="standard"
              hasRightRail={true}
              autoPlay={true}
              autoPlayInterval={4000}
              className="rounded-lg overflow-hidden shadow-lg"
            />
          </section>

          {/* Takeover 模式 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Takeover 模式 (85-95svh) - 事件模式
            </h2>
            <p className="text-gray-600 mb-6">
              用于直播、数据大屏、特大突发等需要抢夺注意力的内容
            </p>
            <HeroCarousel
              items={mockTakeoverItems}
              heightMode="takeover"
              hasRightRail={false} // 事件模式下不显示侧栏
              autoPlay={true}
              autoPlayInterval={6000}
              className="rounded-lg overflow-hidden shadow-lg"
            />
          </section>

          {/* 自适应模式演示 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              智能自适应模式
            </h2>
            <p className="text-gray-600 mb-6">
              根据内容类型自动选择最合适的高度模式
            </p>
            <HeroCarousel
              items={[...mockStandardItems, ...mockTakeoverItems]}
              // 不指定 heightMode，让组件自动判断
              hasRightRail={true}
              autoPlay={true}
              autoPlayInterval={5000}
              className="rounded-lg overflow-hidden shadow-lg"
            />
          </section>
        </div>

        {/* 技术特性说明 */}
        <div className="mt-12 bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">技术特性对比</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4">特性</th>
                  <th className="text-left py-3 px-4">原版 HeroCarousel</th>
                  <th className="text-left py-3 px-4">增强版 HeroCarousel</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium">高度控制</td>
                  <td className="py-3 px-4 text-red-600">固定公式 clamp(45vh, 8vw + 40vh, 75vh)</td>
                  <td className="py-3 px-4 text-green-600">三种模式 + 智能自适应</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium">布局灵活性</td>
                  <td className="py-3 px-4 text-red-600">固定全宽</td>
                  <td className="py-3 px-4 text-green-600">支持右侧栏 + 栅格系统</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium">内容适配</td>
                  <td className="py-3 px-4 text-yellow-600">基础图片/视频支持</td>
                  <td className="py-3 px-4 text-green-600">图片/视频/数据头条 + 16:9 约束</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium">事件模式</td>
                  <td className="py-3 px-4 text-red-600">不支持</td>
                  <td className="py-3 px-4 text-green-600">自动检测 + Takeover 模式</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium">移动端优化</td>
                  <td className="py-3 px-4 text-yellow-600">使用 vh 单位</td>
                  <td className="py-3 px-4 text-green-600">使用 svh 单位，适配地址栏</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium">图片优化</td>
                  <td className="py-3 px-4 text-yellow-600">固定 sizes</td>
                  <td className="py-3 px-4 text-green-600">根据布局动态调整 sizes</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium">性能考虑</td>
                  <td className="py-3 px-4 text-yellow-600">基础优化</td>
                  <td className="py-3 px-4 text-green-600">LCP 优化 + 首屏内容可见性保护</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 使用建议 */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">使用建议</h3>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div className="bg-white rounded p-4">
              <div className="font-medium text-blue-800 mb-2">Compact 模式</div>
              <div className="text-gray-600">日常新闻、频道页、有右侧栏时</div>
            </div>
            <div className="bg-white rounded p-4">
              <div className="font-medium text-blue-800 mb-2">Standard 模式</div>
              <div className="text-gray-600">重要新闻、首页头条、平衡展示</div>
            </div>
            <div className="bg-white rounded p-4">
              <div className="font-medium text-blue-800 mb-2">Takeover 模式</div>
              <div className="text-gray-600">直播、突发事件、数据大屏</div>
            </div>
          </div>
        </div>

        {/* 返回链接 */}
        <div className="mt-8 text-center">
          <a 
            href="/portal" 
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors mr-4"
          >
            ← 返回门户首页
          </a>
          <a 
            href="/portal/demo/hero-carousel" 
            className="inline-flex items-center px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
          >
            查看原版演示
          </a>
        </div>
      </div>
    </div>
  );
}

export const metadata = {
  title: '增强版 Hero Carousel 演示 - Portal',
  description: '展示基于专业设计理念的增强版 Hero 轮播组件',
};
