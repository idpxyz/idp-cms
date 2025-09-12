import { Metadata } from "next";

export const metadata: Metadata = {
  title: "上海新闻资讯 - 了解上海最新动态",
  description: "了解上海最新动态，掌握城市发展脉搏，关注上海城市建设、经济发展、文化传承等全方位资讯。",
  keywords: "上海,新闻,资讯,魔都,城市建设,经济发展",
};

export default function ShanghaiHomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部横幅 */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">上海新闻资讯</h1>
            <p className="text-xl opacity-90">了解上海最新动态，掌握城市发展脉搏</p>
          </div>
        </div>
      </div>

      {/* 快速统计 */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">3,245</div>
            <div className="text-gray-600">今日新闻</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">2.1M</div>
            <div className="text-gray-600">活跃用户</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">156</div>
            <div className="text-gray-600">合作媒体</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2">24/7</div>
            <div className="text-gray-600">实时更新</div>
          </div>
        </div>

        {/* 新闻频道 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-blue-100 p-4">
              <h3 className="text-lg font-semibold text-blue-800">时政要闻</h3>
            </div>
            <div className="p-4">
              <ul className="space-y-2">
                <li className="text-sm text-gray-600 hover:text-blue-600 cursor-pointer">
                  • 上海市政府召开重要会议，部署下半年重点工作
                </li>
                <li className="text-sm text-gray-600 hover:text-blue-600 cursor-pointer">
                  • 上海市委书记调研重点项目建设情况
                </li>
                <li className="text-sm text-gray-600 hover:text-blue-600 cursor-pointer">
                  • 上海市人大通过重要法规条例
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-green-100 p-4">
              <h3 className="text-lg font-semibold text-green-800">经济发展</h3>
            </div>
            <div className="p-4">
              <ul className="space-y-2">
                <li className="text-sm text-gray-600 hover:text-green-600 cursor-pointer">
                  • 上海经济持续向好，GDP增长稳定
                </li>
                <li className="text-sm text-gray-600 hover:text-green-600 cursor-pointer">
                  • 浦东新区新增高新技术企业
                </li>
                <li className="text-sm text-gray-600 hover:text-green-600 cursor-pointer">
                  • 上海证券交易所交易活跃度提升
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-purple-100 p-4">
              <h3 className="text-lg font-semibold text-purple-800">城市建设</h3>
            </div>
            <div className="p-4">
              <ul className="space-y-2">
                <li className="text-sm text-gray-600 hover:text-purple-600 cursor-pointer">
                  • 上海地铁新线路建设进展顺利
                </li>
                <li className="text-sm text-gray-600 hover:text-purple-600 cursor-pointer">
                  • 临港新片区建设加快推进
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
                上海成功举办2024年国际金融论坛
              </h3>
              <p className="text-gray-600 mb-4">
                本次论坛汇聚了来自全球的金融专家和企业代表，展示了上海在金融创新方面的最新成果和未来发展方向...
              </p>
              <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
                阅读全文
              </button>
            </div>
            <div>
              <div className="bg-gray-200 h-48 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-gray-500">新闻图片</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                上海文化产业发展报告发布
              </h3>
              <p className="text-gray-600 mb-4">
                报告显示，上海文化产业继续保持强劲增长势头，数字文化产业成为新的增长点，传统文化产业转型升级成效显著...
              </p>
              <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
                阅读全文
              </button>
            </div>
          </div>
        </div>

        {/* 本地特色 */}
        <div className="bg-gradient-to-r from-green-400 to-blue-500 rounded-lg p-8 mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">上海特色</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-white rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">🏙️</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">现代都市</h3>
              <p className="text-white opacity-90 text-sm">
                国际化大都市，现代化建筑群，外滩、陆家嘴等标志性景观
              </p>
            </div>
            <div className="text-center">
              <div className="bg-white rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">金融中心</h3>
              <p className="text-white opacity-90 text-sm">
                国际金融中心，上海证券交易所，全球金融科技创新中心
              </p>
            </div>
            <div className="text-center">
              <div className="bg-white rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">🎨</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">文化艺术</h3>
              <p className="text-white opacity-90 text-sm">
                海派文化，现代艺术中心，国际文化交流平台
              </p>
            </div>
          </div>
        </div>

        {/* 订阅区域 */}
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">订阅上海新闻</h2>
          <p className="text-gray-600 mb-6">及时获取上海最新资讯，不错过任何重要信息</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <input
              type="email"
              placeholder="输入您的邮箱地址"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 max-w-md"
            />
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              订阅
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
