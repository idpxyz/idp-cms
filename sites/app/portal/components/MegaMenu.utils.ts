/**
 * MegaMenu 组件的工具函数
 * 用于获取频道的分类信息和热门内容
 */

import { endpoints } from "@/lib/config/endpoints";
import { getMainSite } from "@/lib/config/sites";

export interface MegaMenuCategory {
  id: string;
  name: string;
  slug: string;
  article_count?: number;
  description?: string;
}

export interface MegaMenuHotArticle {
  id: string;
  title: string;
  image_url: string;
  publish_time: string;
  view_count: number;
  comment_count: number;
  slug: string;
  is_breaking: boolean;
  is_live: boolean;
}

export interface MegaMenuData {
  categories: MegaMenuCategory[];
  hotArticles: MegaMenuHotArticle[];
}

/**
 * 获取频道的分类信息（显示前6个分类）
 */
export async function getChannelMegaMenuCategories(channelSlug: string): Promise<MegaMenuCategory[]> {
  // 暂时使用 mock 数据
  console.log(`Using mock categories for MegaMenu: ${channelSlug}`);
  return generateMockMegaMenuCategories(channelSlug);

  // TODO: 将来启用真实API调用
  /*
  try {
    const categoriesUrl = endpoints.buildUrl(
      endpoints.getCmsEndpoint('/api/portal/categories/'),
      { 
        site: getMainSite().hostname,
        channel: channelSlug,
        limit: '6',
        ordering: '-article_count'
      }
    );

    const fetchConfig = endpoints.createFetchConfig({
      timeout: 8000,
      next: { revalidate: 600 }, // 缓存10分钟
    });

    const response = await fetch(categoriesUrl, fetchConfig);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`Successfully fetched MegaMenu categories for ${channelSlug}:`, data.results?.length || 0);
      
      return (data.results || []).map((cat: any) => ({
        id: cat.id,
        name: cat.name || cat.title,
        slug: cat.slug,
        article_count: cat.article_count || 0,
        description: cat.description || '',
      }));
    }
  } catch (error) {
    console.error(`Error fetching MegaMenu categories for ${channelSlug}:`, error);
  }

  return generateMockMegaMenuCategories(channelSlug);
  */
}

/**
 * 获取频道的热门文章（显示前5篇）
 */
export async function getChannelMegaMenuHotArticles(channelSlug: string): Promise<MegaMenuHotArticle[]> {
  // 暂时使用 mock 数据
  console.log(`Using mock hot articles for MegaMenu: ${channelSlug}`);
  return generateMockMegaMenuHotArticles(channelSlug);

  // TODO: 将来启用真实API调用
  /*
  try {
    const articlesUrl = endpoints.buildUrl(
      endpoints.getCmsEndpoint('/api/portal/articles/'),
      { 
        site: getMainSite().hostname,
        channel: channelSlug,
        limit: '5',
        ordering: '-view_count,-publish_time',
        include: 'channel',
        timeframe: '7d' // 7天内热门
      }
    );

    const fetchConfig = endpoints.createFetchConfig({
      timeout: 8000,
      next: { revalidate: 300 }, // 缓存5分钟
    });

    const response = await fetch(articlesUrl, fetchConfig);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`Successfully fetched MegaMenu hot articles for ${channelSlug}:`, data.results?.length || 0);
      
      return (data.results || []).map((article: any) => ({
        id: article.id,
        title: article.title,
        image_url: article.hero_image_url || article.featured_image_url || '',
        publish_time: article.publish_time,
        view_count: article.view_count || 0,
        comment_count: article.comment_count || 0,
        slug: article.slug,
        is_breaking: article.is_breaking || false,
        is_live: article.is_live || false,
      }));
    }
  } catch (error) {
    console.error(`Error fetching MegaMenu hot articles for ${channelSlug}:`, error);
  }

  return generateMockMegaMenuHotArticles(channelSlug);
  */
}

/**
 * 获取频道的完整 MegaMenu 数据
 */
export async function getChannelMegaMenuData(channelSlug: string): Promise<MegaMenuData> {
  const [categories, hotArticles] = await Promise.all([
    getChannelMegaMenuCategories(channelSlug),
    getChannelMegaMenuHotArticles(channelSlug)
  ]);

  return {
    categories,
    hotArticles
  };
}

/**
 * 生成模拟分类数据
 */
function generateMockMegaMenuCategories(channelSlug: string): MegaMenuCategory[] {
  const categoryMap: Record<string, MegaMenuCategory[]> = {
    tech: [
      { id: 'ai', name: '人工智能', slug: 'ai', article_count: 256, description: '最新AI技术动态' },
      { id: 'mobile', name: '移动科技', slug: 'mobile', article_count: 189, description: '手机和移动设备' },
      { id: 'internet', name: '互联网', slug: 'internet', article_count: 334, description: '互联网行业新闻' },
      { id: 'startup', name: '创业', slug: 'startup', article_count: 167, description: '创业公司动态' },
      { id: 'hardware', name: '硬件', slug: 'hardware', article_count: 145, description: '硬件设备评测' },
      { id: 'blockchain', name: '区块链', slug: 'blockchain', article_count: 123, description: '区块链技术' },
    ],
    finance: [
      { id: 'market', name: '股市', slug: 'market', article_count: 298, description: '股票市场动态' },
      { id: 'crypto', name: '数字货币', slug: 'crypto', article_count: 223, description: '加密货币行情' },
      { id: 'banking', name: '银行', slug: 'banking', article_count: 187, description: '银行业新闻' },
      { id: 'investment', name: '投资', slug: 'investment', article_count: 245, description: '投资理财指南' },
      { id: 'economics', name: '宏观经济', slug: 'economics', article_count: 176, description: '经济政策解读' },
      { id: 'insurance', name: '保险', slug: 'insurance', article_count: 134, description: '保险行业资讯' },
    ],
    politics: [
      { id: 'domestic', name: '国内政治', slug: 'domestic', article_count: 334, description: '国内政治新闻' },
      { id: 'international', name: '国际关系', slug: 'international', article_count: 278, description: '国际政治动态' },
      { id: 'policy', name: '政策解读', slug: 'policy', article_count: 256, description: '政府政策分析' },
      { id: 'election', name: '选举', slug: 'election', article_count: 189, description: '选举相关新闻' },
      { id: 'diplomacy', name: '外交', slug: 'diplomacy', article_count: 167, description: '外交政策' },
      { id: 'law', name: '法律法规', slug: 'law', article_count: 145, description: '法律政策' },
    ],
    sports: [
      { id: 'football', name: '足球', slug: 'football', article_count: 445, description: '足球赛事新闻' },
      { id: 'basketball', name: '篮球', slug: 'basketball', article_count: 334, description: 'NBA和CBA资讯' },
      { id: 'olympics', name: '奥运', slug: 'olympics', article_count: 223, description: '奥运会相关' },
      { id: 'tennis', name: '网球', slug: 'tennis', article_count: 189, description: '网球赛事' },
      { id: 'esports', name: '电竞', slug: 'esports', article_count: 256, description: '电子竞技' },
      { id: 'fitness', name: '健身', slug: 'fitness', article_count: 167, description: '运动健身' },
    ],
    society: [
      { id: 'education', name: '教育', slug: 'education', article_count: 356, description: '教育政策和新闻' },
      { id: 'health', name: '健康', slug: 'health', article_count: 298, description: '健康医疗资讯' },
      { id: 'housing', name: '住房', slug: 'housing', article_count: 234, description: '房地产政策' },
      { id: 'employment', name: '就业', slug: 'employment', article_count: 189, description: '就业和职场' },
      { id: 'welfare', name: '社会保障', slug: 'welfare', article_count: 167, description: '社会保障制度' },
      { id: 'transport', name: '交通', slug: 'transport', article_count: 145, description: '交通出行' },
    ],
    international: [
      { id: 'us', name: '美国', slug: 'us', article_count: 298, description: '美国新闻' },
      { id: 'europe', name: '欧洲', slug: 'europe', article_count: 234, description: '欧洲动态' },
      { id: 'asia', name: '亚洲', slug: 'asia', article_count: 256, description: '亚洲新闻' },
      { id: 'global-economy', name: '全球经济', slug: 'global-economy', article_count: 189, description: '全球经济形势' },
      { id: 'climate', name: '气候环保', slug: 'climate', article_count: 167, description: '气候变化' },
      { id: 'conflicts', name: '国际冲突', slug: 'conflicts', article_count: 145, description: '国际冲突报道' },
    ],
  };

  return categoryMap[channelSlug] || [
    { id: 'general', name: '综合', slug: 'general', article_count: 200, description: '综合新闻' },
    { id: 'hot', name: '热点', slug: 'hot', article_count: 180, description: '热点话题' },
    { id: 'trending', name: '趋势', slug: 'trending', article_count: 160, description: '趋势动态' },
    { id: 'analysis', name: '深度', slug: 'analysis', article_count: 140, description: '深度分析' },
    { id: 'opinion', name: '观点', slug: 'opinion', article_count: 120, description: '观点评论' },
    { id: 'feature', name: '专题', slug: 'feature', article_count: 100, description: '专题报道' },
  ];
}

/**
 * 生成模拟热门文章数据
 */
function generateMockMegaMenuHotArticles(channelSlug: string): MegaMenuHotArticle[] {
  const articleMap: Record<string, { titles: string[]; prefix: string }> = {
    tech: {
      prefix: 'tech',
      titles: [
        'AI大模型技术突破，GPT-5即将发布引发行业关注',
        '苹果新品发布会亮点解析，iPhone 16系列全面升级',
        '量子计算领域重大进展，实用化应用指日可待',
        '新能源汽车销量创新高，特斯拉面临激烈竞争',
        '5G网络建设加速推进，6G技术标准制定启动'
      ]
    },
    finance: {
      prefix: 'finance',
      titles: [
        '央行宣布降准降息，释放流动性支持实体经济',
        'A股市场震荡上行，科技股领涨创业板指数',
        '人民币汇率保持稳定，外汇储备连续增长',
        '房地产政策持续优化，多城市放宽购房限制',
        '数字人民币试点扩围，覆盖更多应用场景'
      ]
    },
    politics: {
      prefix: 'politics',
      titles: [
        '重要会议召开在即，确定经济发展新方向',
        '新一轮改革开放措施发布，激发市场活力',
        '反腐败斗争持续深入，制度笼子越扎越紧',
        '民生保障政策加码，社会保障体系更完善',
        '生态文明建设成效显著，绿色发展理念深入人心'
      ]
    },
    sports: {
      prefix: 'sports',
      titles: [
        '世界杯预选赛激战正酣，中国队表现值得期待',
        'NBA新赛季开启，超级球星转会引发关注',
        '东京奥运会筹备进展顺利，各项设施已就绪',
        '中超联赛精彩纷呈，本土球员表现抢眼',
        '冬奥会倒计时，冰雪运动普及度大幅提升'
      ]
    },
    society: {
      prefix: 'society',
      titles: [
        '教育改革深入推进，素质教育理念广泛普及',
        '医疗保障体系完善，大病保险覆盖面扩大',
        '就业形势总体稳定，新就业形态蓬勃发展',
        '住房保障政策优化，保障性住房供给增加',
        '养老服务体系健全，老年人生活质量提升'
      ]
    },
    international: {
      prefix: 'international',
      titles: [
        '中美关系迎来新机遇，高层对话释放积极信号',
        '欧盟经济复苏势头良好，通胀压力有所缓解',
        '联合国气候大会成果丰硕，全球减排行动加速',
        '地缘政治局势趋于稳定，多边合作机制发挥作用',
        '全球供应链逐步修复，国际贸易活动回暖'
      ]
    },
  };

  const channelData = articleMap[channelSlug] || {
    prefix: 'general',
    titles: [
      '重要新闻即将发布，敬请关注最新动态',
      '社会热点事件持续发酵，各方观点引发讨论',
      '经济发展稳中向好，各项指标表现亮眼',
      '科技创新成果丰硕，助力高质量发展',
      '民生保障持续改善，人民幸福感不断提升'
    ]
  };

  return channelData.titles.map((title, index) => ({
    id: `${channelData.prefix}-hot-${index + 1}`,
    title,
    image_url: `https://picsum.photos/200/120?random=${channelSlug.charCodeAt(0) + index}`,
    publish_time: new Date(Date.now() - (index + 1) * 3600000).toISOString(),
    view_count: Math.floor(Math.random() * 50000) + 10000,
    comment_count: Math.floor(Math.random() * 500) + 50,
    slug: `${channelData.prefix}-hot-article-${index + 1}`,
    is_breaking: index === 0, // 第一条设为突发
    is_live: index === 1, // 第二条设为直播
  }));
}

/**
 * 格式化数字显示
 */
export function formatCount(count: number): string {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}万`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  } else {
    return count.toString();
  }
}

/**
 * 格式化时间显示
 */
export function formatTimeAgo(publishTime: string): string {
  const now = new Date();
  const publishDate = new Date(publishTime);
  const diffMs = now.getTime() - publishDate.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return '刚刚';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}分钟前`;
  } else if (diffHours < 24) {
    return `${diffHours}小时前`;
  } else if (diffDays < 7) {
    return `${diffDays}天前`;
  } else {
    return publishDate.toLocaleDateString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
    });
  }
}
