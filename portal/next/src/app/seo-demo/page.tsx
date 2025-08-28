import { CacheTag } from '@/components/CacheProvider';
import { CACHE_TAGS } from '@/lib/cache';
import SEOLayout from '@/components/SEOLayout';
import PortalSummary from '@/components/PortalSummary';

export default function SEODemoPage() {
  return (
    <SEOLayout
      title="SEO功能演示 - AI旅行"
      description="展示AI旅行网站的完整SEO功能，包括缓存标签、canonical链接、sitemap等"
      keywords="SEO, 搜索引擎优化, 缓存标签, canonical链接, sitemap, robots.txt, RSS feed"
      site="portal"
    >
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <CacheTag tag={CACHE_TAGS.SITE('portal')}>
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                🚀 SEO 功能演示
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                展示AI旅行网站的完整SEO功能，包括缓存标签系统、canonical链接、
                sitemap.xml、robots.txt、RSS feed等
              </p>
            </div>
          </CacheTag>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* 门户聚合摘要 */}
            <CacheTag tag={CACHE_TAGS.AGGREGATE('portal')}>
              <PortalSummary site="portal" />
            </CacheTag>

            {/* SEO功能列表 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                ✨ SEO 功能特性
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-green-600 text-sm">✓</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">缓存标签系统</h3>
                    <p className="text-sm text-gray-600">
                      支持多维度缓存控制：site、page、channel、region等
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-green-600 text-sm">✓</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Canonical 链接</h3>
                    <p className="text-sm text-gray-600">
                      自动生成规范的URL，避免重复内容问题
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-green-600 text-sm">✓</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">动态 Sitemap</h3>
                    <p className="text-sm text-gray-600">
                      支持多站点独立的sitemap.xml生成
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-green-600 text-sm">✓</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Robots.txt</h3>
                    <p className="text-sm text-gray-600">
                      动态生成站点特定的爬虫规则
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-green-600 text-sm">✓</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">RSS Feed</h3>
                    <p className="text-sm text-gray-600">
                      支持多站点的RSS订阅源
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 测试链接 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              🔗 测试链接
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">XML 文件</h3>
                <div className="space-y-2">
                  <a 
                    href="/sitemap.xml?site=portal" 
                    target="_blank"
                    className="block text-blue-600 hover:text-blue-700 text-sm"
                  >
                    📄 Sitemap.xml (门户站点)
                  </a>
                  <a 
                    href="/robots.txt?site=portal" 
                    target="_blank"
                    className="block text-blue-600 hover:text-blue-700 text-sm"
                  >
                    🤖 Robots.txt (门户站点)
                  </a>
                  <a 
                    href="/feed.xml?site=portal" 
                    target="_blank"
                    className="block text-blue-600 hover:text-blue-700 text-sm"
                  >
                    📡 RSS Feed (门户站点)
                  </a>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">本地站点</h3>
                <div className="space-y-2">
                  <a 
                    href="/sitemap.xml?site=tech" 
                    target="_blank"
                    className="block text-blue-600 hover:text-blue-700 text-sm"
                  >
                    📄 Sitemap.xml (科技频道)
                  </a>
                  <a 
                    href="/robots.txt?site=tech" 
                    target="_blank"
                    className="block text-blue-600 hover:text-blue-700 text-sm"
                  >
                    🤖 Robots.txt (科技频道)
                  </a>
                  <a 
                    href="/feed.xml?site=tech" 
                    target="_blank"
                    className="block text-blue-600 hover:text-blue-700 text-sm"
                  >
                    📡 RSS Feed (科技频道)
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* 缓存标签演示 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              🏷️ 缓存标签演示
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CacheTag tag={CACHE_TAGS.CHANNEL('portal', 'tech')}>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-2">科技频道</h3>
                  <p className="text-sm text-blue-700">
                    使用 channel:tech 缓存标签
                  </p>
                </div>
              </CacheTag>

              <CacheTag tag={CACHE_TAGS.REGION('portal', 'china')}>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-green-900 mb-2">中国地区</h3>
                  <p className="text-sm text-green-700">
                    使用 region:china 缓存标签
                  </p>
                </div>
              </CacheTag>

              <CacheTag tag={CACHE_TAGS.CHANNEL_REGION('portal', 'tech', 'china')}>
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h3 className="font-semibold text-purple-900 mb-2">科技+中国</h3>
                  <p className="text-sm text-purple-700">
                    使用组合缓存标签
                  </p>
                </div>
              </CacheTag>
            </div>
          </div>
        </div>
      </div>
    </SEOLayout>
  );
}
