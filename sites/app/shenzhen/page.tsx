import { Metadata } from "next";

export const metadata: Metadata = {
  title: "深圳新闻资讯 - 了解深圳最新动态",
  description:
    "了解深圳最新动态，掌握城市发展脉搏，关注深圳城市建设、经济发展、文化传承等全方位资讯。",
  keywords: "深圳,新闻,资讯,创新,城市建设,经济发展",
};

export default function ShenzhenHomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部横幅 */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-800 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">深圳新闻资讯</h1>
            <p className="text-xl opacity-90">
              了解深圳最新动态，掌握城市发展脉搏
            </p>
          </div>
        </div>
      </div>

      {/* 快速统计 */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2">3,456</div>
            <div className="text-gray-600">今日新闻</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">2.5M</div>
            <div className="text-gray-600">活跃用户</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">178</div>
            <div className="text-gray-600">合作媒体</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">24/7</div>
            <div className="text-gray-600">实时更新</div>
          </div>
        </div>

        {/* 新闻频道 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-orange-100 p-4">
              <h3 className="text-lg font-semibold text-orange-800">
                时政要闻
              </h3>
            </div>
            <div className="p-4">
              <ul className="space-y-2">
                <li className="text-sm text-gray-600 hover:text-orange-600 cursor-pointer">
                  • 深圳市政府召开重要会议，部署下半年重点工作
                </li>
                <li className="text-sm text-gray-600 hover:text-orange-600 cursor-pointer">
                  • 深圳市委书记调研重点项目建设情况
                </li>
                <li className="text-sm text-gray-600 hover:text-orange-600 cursor-pointer">
                  • 深圳市人大通过重要法规条例
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-blue-100 p-4">
              <h3 className="text-lg font-semibold text-blue-800">科技创新</h3>
            </div>
            <div className="p-4">
              <ul className="space-y-2">
                <li className="text-sm text-gray-600 hover:text-blue-600 cursor-pointer">
                  • 深圳科技创新持续向好，高新技术产业增长稳定
                </li>
                <li className="text-sm text-gray-600 hover:text-blue-600 cursor-pointer">
                  • 深圳湾科技园区新增高新技术企业
                </li>
                <li className="text-sm text-gray-600 hover:text-blue-600 cursor-pointer">
                  • 深圳证券交易所交易活跃度提升
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-purple-100 p-4">
              <h3 className="text-lg font-semibold text-purple-800">
                城市建设
              </h3>
            </div>
            <div className="p-4">
              <ul className="space-y-2">
                <li className="text-sm text-gray-600 hover:text-purple-600 cursor-pointer">
                  • 深圳地铁新线路建设进展顺利
                </li>
                <li className="text-sm text-gray-600 hover:text-purple-600 cursor-pointer">
                  • 前海自贸区建设加快推进
                </li>
                <li className="text-sm text-gray-600 hover:text-purple-600 cursor-pointer">
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
                深圳成功举办2024年科技创新大会
              </h3>
              <p className="text-gray-600 mb-4">
                本次大会汇聚了来自全球的科技专家和企业代表，展示了深圳在科技创新方面的最新成果和未来发展方向...
              </p>
              <button className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 transition-colors">
                阅读全文
              </button>
            </div>
            <div>
              <div className="bg-gray-200 h-48 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-gray-500">新闻图片</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                深圳文化产业发展报告发布
              </h3>
              <p className="text-gray-600 mb-4">
                报告显示，深圳文化产业继续保持强劲增长势头，数字文化产业成为新的增长点，传统文化产业转型升级成效显著...
              </p>
              <button className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 transition-colors">
                阅读全文
              </button>
            </div>
          </div>
        </div>

        {/* 本地特色 */}
        <div className="bg-gradient-to-r from-orange-400 to-red-500 rounded-lg p-8 mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">深圳特色</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-white rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">🏙️</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                现代都市
              </h3>
              <p className="text-white opacity-90 text-sm">
                国际化大都市，现代化建筑群，深圳湾、福田中心区等标志性景观
              </p>
            </div>
            <div className="text-center">
              <div className="bg-white rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">🚀</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                创新之城
              </h3>
              <p className="text-white opacity-90 text-sm">
                科技创新中心，高新技术产业聚集，创新创业生态完善
              </p>
            </div>
            <div className="text-center">
              <div className="bg-white rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">🌊</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                海滨城市
              </h3>
              <p className="text-white opacity-90 text-sm">
                滨海城市，港口经济发达，海洋文化特色鲜明
              </p>
            </div>
          </div>
        </div>

        {/* 订阅区域 */}
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            订阅深圳新闻
          </h2>
          <p className="text-gray-600 mb-6">
            及时获取深圳最新资讯，不错过任何重要信息
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <input
              type="email"
              placeholder="输入您的邮箱地址"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 flex-1 max-w-md"
            />
            <button className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors">
              订阅
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
