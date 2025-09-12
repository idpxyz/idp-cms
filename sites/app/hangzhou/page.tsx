import { Metadata } from "next";

export const metadata: Metadata = {
  title: "杭州新闻资讯 - 了解杭州最新动态",
  description:
    "了解杭州最新动态，掌握城市发展脉搏，关注杭州城市建设、经济发展、文化传承等全方位资讯。",
  keywords: "杭州,新闻,资讯,互联网,城市建设,经济发展",
};

export default function HangzhouHomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部横幅 */}
      <div className="bg-gradient-to-r from-green-600 to-green-800 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">杭州新闻资讯</h1>
            <p className="text-xl opacity-90">
              了解杭州最新动态，掌握城市发展脉搏
            </p>
          </div>
        </div>
      </div>

      {/* 快速统计 */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">2,856</div>
            <div className="text-gray-600">今日新闻</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">1.8M</div>
            <div className="text-gray-600">活跃用户</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">134</div>
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
            <div className="bg-green-100 p-4">
              <h3 className="text-lg font-semibold text-green-800">时政要闻</h3>
            </div>
            <div className="p-4">
              <ul className="space-y-2">
                <li className="text-sm text-gray-600 hover:text-green-600 cursor-pointer">
                  • 杭州市政府召开重要会议，部署下半年重点工作
                </li>
                <li className="text-sm text-gray-600 hover:text-green-600 cursor-pointer">
                  • 杭州市委书记调研重点项目建设情况
                </li>
                <li className="text-sm text-gray-600 hover:text-green-600 cursor-pointer">
                  • 杭州市人大通过重要法规条例
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-blue-100 p-4">
              <h3 className="text-lg font-semibold text-blue-800">
                互联网发展
              </h3>
            </div>
            <div className="p-4">
              <ul className="space-y-2">
                <li className="text-sm text-gray-600 hover:text-blue-600 cursor-pointer">
                  • 杭州互联网经济持续向好，数字经济增长稳定
                </li>
                <li className="text-sm text-gray-600 hover:text-blue-600 cursor-pointer">
                  • 阿里巴巴总部新增技术研发中心
                </li>
                <li className="text-sm text-gray-600 hover:text-blue-600 cursor-pointer">
                  • 杭州互联网企业融资活跃度提升
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
                  • 杭州地铁新线路建设进展顺利
                </li>
                <li className="text-sm text-gray-600 hover:text-purple-600 cursor-pointer">
                  • 钱江新城建设加快推进
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
                杭州成功举办2024年互联网创新大会
              </h3>
              <p className="text-gray-600 mb-4">
                本次大会汇聚了来自全球的互联网专家和企业代表，展示了杭州在互联网创新方面的最新成果和未来发展方向...
              </p>
              <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors">
                阅读全文
              </button>
            </div>
            <div>
              <div className="bg-gray-200 h-48 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-gray-500">新闻图片</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                杭州数字经济发展报告发布
              </h3>
              <p className="text-gray-600 mb-4">
                报告显示，杭州数字经济继续保持强劲增长势头，互联网产业成为新的增长点，传统产业数字化转型成效显著...
              </p>
              <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors">
                阅读全文
              </button>
            </div>
          </div>
        </div>

        {/* 本地特色 */}
        <div className="bg-gradient-to-r from-green-400 to-blue-500 rounded-lg p-8 mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">杭州特色</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-white rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">🌉</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                西湖文化
              </h3>
              <p className="text-white opacity-90 text-sm">
                人间天堂，西湖美景，历史文化底蕴深厚，诗画江南
              </p>
            </div>
            <div className="text-center">
              <div className="bg-white rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">💻</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                互联网之都
              </h3>
              <p className="text-white opacity-90 text-sm">
                阿里巴巴总部，互联网创新创业中心，数字经济高地
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
                越剧、丝绸文化，现代文化艺术中心，文创产业发达
              </p>
            </div>
          </div>
        </div>

        {/* 订阅区域 */}
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            订阅杭州新闻
          </h2>
          <p className="text-gray-600 mb-6">
            及时获取杭州最新资讯，不错过任何重要信息
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <input
              type="email"
              placeholder="输入您的邮箱地址"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 flex-1 max-w-md"
            />
            <button className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors">
              订阅
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
