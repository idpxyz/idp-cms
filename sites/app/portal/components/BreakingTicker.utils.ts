import { fetchTrendingFeed } from '@/lib/api/feed';
import { getNews } from '@/lib/api/news';
import { BreakingNewsItem } from './BreakingTicker';

/**
 * 获取快讯数据
 * 优先级：模拟数据 -> 智能推荐 -> 传统新闻API
 */
export async function getBreakingNews(limit: number = 8): Promise<BreakingNewsItem[]> {
  // 直接使用模拟数据，确保立即显示效果
  console.log('Using mock breaking news data for immediate display');
  return generateMockBreakingNews(limit);

  // 以下代码注释掉，需要时可以恢复
  /*
  try {
    // 首先尝试获取最新的突发新闻
    const trendingResponse = await fetchTrendingFeed(limit * 2);
    
    if (trendingResponse.items && trendingResponse.items.length > 0) {
      return trendingResponse.items
        .filter(item => 
          new Date(item.publish_time || item.publish_at).getTime() > Date.now() - 24 * 60 * 60 * 1000
        )
        .slice(0, limit)
        .map(item => ({
          id: item.id,
          title: item.title,
          slug: item.slug,
          publish_time: item.publish_time || item.publish_at,
          channel: item.channel ? {
            id: item.channel.slug || 'unknown',
            name: item.channel.name,
            slug: item.channel.slug || 'unknown'
          } : undefined,
          is_urgent: item.is_featured || false,
        }));
    }
  } catch (error) {
    console.warn('Failed to fetch trending feed for breaking ticker:', error);
  }

  try {
    // 备选方案：使用传统新闻API
    const newsResponse = await getNews('recommend', 1, limit * 2);
    
    if (newsResponse.data && newsResponse.data.length > 0) {
      return newsResponse.data
        .filter(item => 
          new Date(item.publish_at).getTime() > Date.now() - 24 * 60 * 60 * 1000
        )
        .slice(0, limit)
        .map(item => ({
          id: item.id,
          title: item.title,
          slug: item.slug,
          publish_time: item.publish_at,
          channel: item.channel ? {
            id: item.channel.slug || 'unknown',
            name: item.channel.name,
            slug: item.channel.slug || 'unknown'
          } : undefined,
          is_urgent: item.is_featured || false,
        }));
    }
  } catch (error) {
    console.warn('Failed to fetch news for breaking ticker:', error);
  }

  return generateMockBreakingNews(limit);
  */
}

/**
 * 生成模拟快讯数据（开发和测试用）
 */
export function generateMockBreakingNews(count: number = 8): BreakingNewsItem[] {
  const mockItems: BreakingNewsItem[] = [
    {
      id: 'breaking-1',
      title: '中央银行宣布降准0.5个百分点，释放流动性约1万亿元',
      slug: 'pboc-rrr-cut-announcement',
      publish_time: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10分钟前
      channel: { id: 'finance', name: '财经', slug: 'finance' },
      is_urgent: true,
    },
    {
      id: 'breaking-2',
      title: '科技部发布人工智能发展新规划，投入资金超500亿元',
      slug: 'ai-development-plan-500b',
      publish_time: new Date(Date.now() - 25 * 60 * 1000).toISOString(), // 25分钟前
      channel: { id: 'tech', name: '科技', slug: 'tech' },
      is_urgent: false,
    },
    {
      id: 'breaking-3',
      title: '国际油价突破每桶90美元，创年内新高',
      slug: 'oil-price-breaks-90-usd',
      publish_time: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45分钟前
      channel: { id: 'international', name: '国际', slug: 'international' },
      is_urgent: true,
    },
    {
      id: 'breaking-4',
      title: '教育部：2024年高考报名人数达1291万人，再创历史新高',
      slug: 'gaokao-2024-record-applications',
      publish_time: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1小时前
      channel: { id: 'education', name: '教育', slug: 'education' },
      is_urgent: false,
    },
    {
      id: 'breaking-5',
      title: '北京冬奥会场馆将向公众开放，推出系列体验活动',
      slug: 'beijing-olympics-venues-public-access',
      publish_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2小时前
      channel: { id: 'sports', name: '体育', slug: 'sports' },
      is_urgent: false,
    },
    {
      id: 'breaking-6',
      title: '全国首个碳中和示范区在深圳正式启动建设',
      slug: 'shenzhen-carbon-neutral-demo-zone',
      publish_time: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3小时前
      channel: { id: 'environment', name: '环境', slug: 'environment' },
      is_urgent: false,
    },
    {
      id: 'breaking-7',
      title: '国产大飞机C919获得新订单100架，总订单数突破1000架',
      slug: 'c919-new-orders-milestone',
      publish_time: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4小时前
      channel: { id: 'aviation', name: '航空', slug: 'aviation' },
      is_urgent: true,
    },
    {
      id: 'breaking-8',
      title: '文化和旅游部：春节假期全国接待游客4.15亿人次',
      slug: 'spring-festival-tourism-statistics',
      publish_time: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5小时前
      channel: { id: 'culture', name: '文化', slug: 'culture' },
      is_urgent: false,
    },
  ];

  return mockItems.slice(0, count);
}
