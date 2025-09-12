import { Metadata } from "next";

export const metadata: Metadata = {
  title: "北京新闻资讯 - 了解北京最新动态",
  description:
    "了解北京最新动态，掌握首都发展脉搏，关注北京城市建设、经济发展、文化传承等全方位资讯。",
  keywords: "北京,新闻,资讯,首都,城市建设,经济发展",
};

export default function BeijingHomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部横幅 */}
      <div className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary)]/80 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">北京新闻资讯</h1>
            <p className="text-xl opacity-90">
              了解北京最新动态，掌握首都发展脉搏
            </p>
          </div>
        </div>
      </div>

      {/* 快速统计 */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl font-bold text-[var(--brand-primary)] mb-2">
              2,156
            </div>
            <div className="text-gray-600">今日新闻</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">1.2M</div>
            <div className="text-gray-600">活跃用户</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">89</div>
            <div className="text-gray-600">合作媒体</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">24/7</div>
            <div className="text-gray-600">实时更新</div>
          </div>
        </div>

        {/* 新闻频道 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-[var(--brand-primary)]/10 p-4">
              <h3 className="text-lg font-semibold text-[var(--brand-primary)]">
                时政要闻
              </h3>
            </div>
            <div className="p-4">
              <ul className="space-y-2">
                <li className="text-sm text-gray-600 hover:text-[var(--brand-primary)] cursor-pointer">
                  • 北京市政府召开重要会议，部署下半年重点工作
                </li>
                <li className="text-sm text-gray-600 hover:text-[var(--brand-primary)] cursor-pointer">
                  • 北京市委书记调研重点项目建设情况
                </li>
                <li className="text-sm text-gray-600 hover:text-[var(--brand-primary)] cursor-pointer">
                  • 北京市人大通过重要法规条例
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-blue-100 p-4">
              <h3 className="text-lg font-semibold text-blue-800">经济发展</h3>
            </div>
            <div className="p-4">
              <ul className="space-y-2">
                <li className="text-sm text-gray-600 hover:text-blue-600 cursor-pointer">
                  • 北京经济持续向好，GDP增长稳定
                </li>
                <li className="text-sm text-gray-600 hover:text-blue-600 cursor-pointer">
                  • 中关村科技园区新增高新技术企业
                </li>
                <li className="text-sm text-gray-600 hover:text-blue-600 cursor-pointer">
                  • 北京证券交易所交易活跃度提升
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-green-100 p-4">
              <h3 className="text-lg font-semibold text-green-800">城市建设</h3>
            </div>
            <div className="p-4">
              <ul className="space-y-2">
                <li className="text-sm text-gray-600 hover:text-green-600 cursor-pointer">
                  • 北京地铁新线路建设进展顺利
                </li>
                <li className="text-sm text-gray-600 hover:text-green-600 cursor-pointer">
                  • 城市副中心建设加快推进
                </li>
                <li className="text-sm text-gray-600 hover:text-green-600 cursor-pointer">
                  • 老旧小区改造工程全面启动
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* 特色新闻 */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">今日头条</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="bg-gray-200 h-48 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-gray-500">新闻图片</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                北京成功举办2024年科技创新大会
              </h3>
              <p className="text-gray-600 mb-4">
                本次大会汇聚了来自全球的科技专家和企业代表，展示了北京在科技创新方面的最新成果和未来发展方向...
              </p>
              <button className="bg-[var(--brand-primary)] text-white px-4 py-2 rounded hover:bg-[var(--brand-primary)]/80 transition-colors">
                阅读全文
              </button>
            </div>
            <div>
              <div className="bg-gray-200 h-48 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-gray-500">新闻图片</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                北京文化产业发展报告发布
              </h3>
              <p className="text-gray-600 mb-4">
                报告显示，北京文化产业继续保持强劲增长势头，数字文化产业成为新的增长点，传统文化产业转型升级成效显著...
              </p>
              <button className="bg-[var(--brand-primary)] text-white px-4 py-2 rounded hover:bg-[var(--brand-primary)]/80 transition-colors">
                阅读全文
              </button>
            </div>
          </div>
        </div>

        {/* 本地特色 */}
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg p-8 mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">北京特色</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-white rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">🏛️</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                历史文化
              </h3>
              <p className="text-white opacity-90 text-sm">
                千年古都，文化底蕴深厚，故宫、长城等世界文化遗产
              </p>
            </div>
            <div className="text-center">
              <div className="bg-white rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">🚀</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                科技创新
              </h3>
              <p className="text-white opacity-90 text-sm">
                中关村科技园区，全国科技创新中心，高新技术产业聚集
              </p>
            </div>
            <div className="text-center">
              <div className="bg-white rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">🎭</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                文化艺术
              </h3>
              <p className="text-white opacity-90 text-sm">
                京剧、相声等传统艺术，现代文化艺术中心
              </p>
            </div>
          </div>
        </div>

        {/* 订阅区域 */}
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            订阅北京新闻
          </h2>
          <p className="text-gray-600 mb-6">
            及时获取北京最新资讯，不错过任何重要信息
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <input
              type="email"
              placeholder="输入您的邮箱地址"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] flex-1 max-w-md"
            />
            <button className="bg-[var(--brand-primary)] text-white px-6 py-2 rounded-lg hover:bg-[var(--brand-primary)]/80 transition-colors">
              订阅
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
