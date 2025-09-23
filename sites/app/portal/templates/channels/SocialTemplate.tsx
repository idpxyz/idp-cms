import React from 'react';
import PageContainer from "@/components/layout/PageContainer";
import Section from "@/components/layout/Section";
import NewsContent from "../../components/NewsContent";
import ChannelStrip from "../../components/ChannelStrip";

interface ChannelTemplateProps {
  channel: any;
  channels: any[];
  tags?: string;
}

/**
 * 📰 社会频道专业新闻模板
 * 专业新闻布局 · 头条聚焦 · 深度报道
 */
const SocialTemplate: React.FC<ChannelTemplateProps> = ({ 
  channel, 
  channels, 
  tags 
}) => {
  return (
    <PageContainer>
      {/* 🎯 频道标题栏 */}
      <Section space="sm">
        <div className="border-b border-gray-200 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h1 className="page-title text-gray-900">{channel.name}</h1>
              <span className="template-badge bg-red-100 text-red-700 px-3 py-1 rounded-full">实时更新</span>
            </div>
            <div className="flex items-center space-x-4 news-meta text-gray-500">
              <span>今日更新 1,247 条</span>
              <span>|</span>
              <span>关注 56 万人</span>
            </div>
          </div>
          
          {/* 分类导航 */}
          <div className="flex items-center space-x-6 mt-4">
            <a href="/portal?channel=society&category=头条" className="news-meta font-medium text-red-600 border-b-2 border-red-600 pb-1">头条</a>
            <a href="/portal?channel=society&category=民生" className="news-meta text-gray-600 hover:text-gray-900 pb-1">民生</a>
            <a href="/portal?channel=society&category=法治" className="news-meta text-gray-600 hover:text-gray-900 pb-1">法治</a>
            <a href="/portal?channel=society&category=教育" className="news-meta text-gray-600 hover:text-gray-900 pb-1">教育</a>
            <a href="/portal?channel=society&category=就业" className="news-meta text-gray-600 hover:text-gray-900 pb-1">就业</a>
            <a href="/portal?channel=society&category=医疗" className="news-meta text-gray-600 hover:text-gray-900 pb-1">医疗</a>
            <a href="/portal?channel=society&category=环保" className="news-meta text-gray-600 hover:text-gray-900 pb-1">环保</a>
          </div>
        </div>
      </Section>

      {/* 📺 头条新闻区域 (Hero Section) */}
      <Section space="md">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 主要头条 */}
          <div className="lg:col-span-2">
            <div className="relative bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200">
              <div className="aspect-video bg-gray-100 relative">
                <img 
                  src="https://picsum.photos/800/450?random=1" 
                  alt="头条新闻"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4">
                  <span className="bg-red-600 text-white px-3 py-1 rounded-full news-meta-small font-medium">头条</span>
                </div>
              </div>
              <div className="p-6">
                <h2 className="news-title-large text-gray-900 mb-3 leading-tight">
                  老旧小区改造进入攻坚阶段：多地创新模式破解资金难题
                </h2>
                <p className="news-excerpt text-gray-600 mb-4">
                  记者调研发现，各地在推进老旧小区改造过程中，通过政府引导、市场运作、居民参与等多种方式，有效解决了资金筹措、施工协调、后续管理等关键问题...
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 news-meta text-gray-500">
                    <span>社会民生</span>
                    <span>2小时前</span>
                    <span>阅读 2.8万</span>
                  </div>
                  <button className="text-red-600 hover:text-red-700 news-meta font-medium">阅读全文 →</button>
                </div>
              </div>
            </div>
          </div>

          {/* 重要新闻列表 */}
          <div className="space-y-4">
            <h3 className="section-title text-gray-900 border-b border-gray-200 pb-2">重要新闻</h3>
            
            <div className="space-y-4">
              <article className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex space-x-4">
                  <img 
                    src="https://picsum.photos/120/80?random=2" 
                    alt="新闻图片"
                    className="w-20 h-14 object-cover rounded flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="news-title-small text-gray-900 mb-2 line-clamp-2">
                      校园食品安全监管再升级 多部门联合执法
                    </h4>
                    <div className="flex items-center space-x-2 news-meta-small text-gray-500">
                      <span>教育</span>
                      <span>•</span>
                      <span>4小时前</span>
                    </div>
                  </div>
                </div>
              </article>

              <article className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex space-x-4">
                  <img 
                    src="https://picsum.photos/120/80?random=3" 
                    alt="新闻图片"
                    className="w-20 h-14 object-cover rounded flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="news-title-small text-gray-900 mb-2 line-clamp-2">
                      新就业形态劳动者权益保障政策出台
                    </h4>
                    <div className="flex items-center space-x-2 news-meta-small text-gray-500">
                      <span>就业</span>
                      <span>•</span>
                      <span>6小时前</span>
                    </div>
                  </div>
                </div>
              </article>

              <article className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex space-x-4">
                  <img 
                    src="https://picsum.photos/120/80?random=4" 
                    alt="新闻图片"
                    className="w-20 h-14 object-cover rounded flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="news-title-small text-gray-900 mb-2 line-clamp-2">
                      医保新政惠及千万患者 报销比例再提升
                    </h4>
                    <div className="flex items-center space-x-2 news-meta-small text-gray-500">
                      <span>医疗</span>
                      <span>•</span>
                      <span>8小时前</span>
                    </div>
                  </div>
                </div>
              </article>

              <article className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex space-x-4">
                  <img 
                    src="https://picsum.photos/120/80?random=5" 
                    alt="新闻图片"
                    className="w-20 h-14 object-cover rounded flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="news-title-small text-gray-900 mb-2 line-clamp-2">
                      环保督察组进驻多省 严查污染治理
                    </h4>
                    <div className="flex items-center space-x-2 news-meta-small text-gray-500">
                      <span>环保</span>
                      <span>•</span>
                      <span>10小时前</span>
                    </div>
                  </div>
                </div>
              </article>
            </div>

            <a href="/portal?channel=society" className="block text-center py-3 text-red-600 hover:text-red-700 news-meta font-medium border-t border-gray-200">
              查看更多新闻 →
            </a>
          </div>
        </div>
      </Section>

      {/* 📊 主要内容区域 */}
      <Section space="md">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 主要新闻列表 */}
          <div className="lg:col-span-3 space-y-6">
            {/* 深度报道 */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h2 className="section-title text-gray-900">深度报道</h2>
              </div>
              <div className="p-6">
                <ChannelStrip
                  channelId={channel.id}
                  channelName={channel.name}
                  channelSlug={channel.slug}
                  showCategories={false}
                  showViewMore={false}
                  articleLimit={6}
                  className="mb-0"
                />
              </div>
            </div>

            {/* 最新动态 */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="section-title text-gray-900">最新动态</h2>
                <span className="news-meta-small text-gray-500">每5分钟更新</span>
              </div>
              <div className="divide-y divide-gray-200">
                <article className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex space-x-4">
                    <img 
                      src="https://picsum.photos/100/70?random=6" 
                      alt="新闻图片"
                      className="w-24 h-16 object-cover rounded flex-shrink-0"
                    />
                    <div className="flex-1">
                      <h3 className="news-title-medium text-gray-900 mb-2 leading-tight">
                        全国多地启动冬季供暖保障工作 确保民众温暖过冬
                      </h3>
                      <p className="news-excerpt text-gray-600 mb-3">
                        随着气温逐渐降低，全国多个城市已提前启动冬季供暖保障工作，通过加强设备检修、储备充足燃料等措施...
                      </p>
                      <div className="flex items-center space-x-4 news-meta-small text-gray-500">
                        <span>民生</span>
                        <span>•</span>
                        <span>刚刚</span>
                        <span>•</span>
                        <span>阅读 1.2万</span>
                      </div>
                    </div>
                  </div>
                </article>

                <article className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex space-x-4">
                    <img 
                      src="https://picsum.photos/100/70?random=7" 
                      alt="新闻图片"
                      className="w-24 h-16 object-cover rounded flex-shrink-0"
                    />
                    <div className="flex-1">
                      <h3 className="news-title-medium text-gray-900 mb-2 leading-tight">
                        高校毕业生就业创业扶持政策再升级 多项补贴标准提高
                      </h3>
                      <p className="news-excerpt text-gray-600 mb-3">
                        教育部联合人社部发布新一轮高校毕业生就业创业扶持政策，在原有基础上进一步提高补贴标准...
                      </p>
                      <div className="flex items-center space-x-4 news-meta-small text-gray-500">
                        <span>就业</span>
                        <span>•</span>
                        <span>15分钟前</span>
                        <span>•</span>
                        <span>阅读 8.5千</span>
                      </div>
                    </div>
                  </div>
                </article>

                <article className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex space-x-4">
                    <img 
                      src="https://picsum.photos/100/70?random=8" 
                      alt="新闻图片"
                      className="w-24 h-16 object-cover rounded flex-shrink-0"
                    />
                    <div className="flex-1">
                      <h3 className="news-title-medium text-gray-900 mb-2 leading-tight">
                        基本医保参保率稳定在95%以上 覆盖面持续扩大
                      </h3>
                      <p className="news-excerpt text-gray-600 mb-3">
                        国家医保局最新数据显示，全国基本医疗保险参保率已稳定在95%以上，覆盖人数超过13.6亿人...
                      </p>
                      <div className="flex items-center space-x-4 news-meta-small text-gray-500">
                        <span>医疗</span>
                        <span>•</span>
                        <span>30分钟前</span>
                        <span>•</span>
                        <span>阅读 6.8千</span>
                      </div>
                    </div>
                  </div>
                </article>
              </div>
              <div className="p-4 bg-gray-50 text-center">
                <a href="/portal?channel=society" className="text-red-600 hover:text-red-700 news-meta font-medium">
                  加载更多新闻 →
                </a>
              </div>
            </div>
          </div>

          {/* 侧边栏 */}
          <div className="space-y-6">
            {/* 热点排行 */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-red-600 px-4 py-3">
                <h3 className="template-card-title text-white">热点排行</h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center space-x-3">
                  <span className="w-6 h-6 bg-red-500 text-white rounded text-xs font-bold flex items-center justify-center">1</span>
                  <a href="#" className="news-meta-small text-gray-900 hover:text-red-600 line-clamp-2 flex-1">
                    老旧小区改造进入攻坚阶段
                  </a>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="w-6 h-6 bg-orange-500 text-white rounded text-xs font-bold flex items-center justify-center">2</span>
                  <a href="#" className="news-meta-small text-gray-900 hover:text-red-600 line-clamp-2 flex-1">
                    校园食品安全监管再升级
                  </a>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="w-6 h-6 bg-yellow-500 text-white rounded text-xs font-bold flex items-center justify-center">3</span>
                  <a href="#" className="news-meta-small text-gray-900 hover:text-red-600 line-clamp-2 flex-1">
                    网约车司机权益保障政策
                  </a>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="w-6 h-6 bg-gray-400 text-white rounded text-xs font-bold flex items-center justify-center">4</span>
                  <a href="#" className="news-meta-small text-gray-900 hover:text-red-600 line-clamp-2 flex-1">
                    养老服务体系建设提速
                  </a>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="w-6 h-6 bg-gray-400 text-white rounded text-xs font-bold flex items-center justify-center">5</span>
                  <a href="#" className="news-meta-small text-gray-900 hover:text-red-600 line-clamp-2 flex-1">
                    环境污染治理成效显著
                  </a>
                </div>
              </div>
            </div>

            {/* 数据统计 */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h3 className="template-card-title text-gray-900">今日数据</h3>
              </div>
              <div className="p-4 space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">1,247</div>
                  <div className="news-meta-small text-gray-500">新闻发布</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">56万</div>
                  <div className="news-meta-small text-gray-500">读者关注</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">328</div>
                  <div className="news-meta-small text-gray-500">深度报道</div>
                </div>
              </div>
            </div>

            {/* 专题推荐 */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h3 className="template-card-title text-gray-900">专题推荐</h3>
              </div>
              <div className="p-4 space-y-4">
                <div className="bg-gradient-to-r from-red-50 to-orange-50 p-3 rounded">
                  <h4 className="news-meta font-medium text-gray-900 mb-1">民生保障专题</h4>
                  <p className="text-xs text-gray-600 line-clamp-2">聚焦住房、就业、医疗等民生热点</p>
                </div>
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded">
                  <h4 className="news-meta font-medium text-gray-900 mb-1">教育改革专题</h4>
                  <p className="text-xs text-gray-600 line-clamp-2">关注教育政策变化和校园动态</p>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-teal-50 p-3 rounded">
                  <h4 className="news-meta font-medium text-gray-900 mb-1">法治建设专题</h4>
                  <p className="text-xs text-gray-600 line-clamp-2">追踪重大案件和法律法规</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>


      {/* 智能推荐 */}
      <Section space="md">
        <NewsContent
          channels={channels}
          initialChannelId={channel.id}
          tags={tags}
        />
      </Section>
    </PageContainer>
  );
};

export default SocialTemplate;
