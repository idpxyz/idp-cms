import { fetchTrendingFeed } from '@/lib/api/feed';
import { getNews } from '@/lib/api/news';
import { BreakingNewsItem } from './BreakingTicker';

// 频道信息缓存
let channelsCache: any[] | null = null;
let cacheExpiry = 0;

/**
 * 获取所有频道信息
 */
async function getChannels(): Promise<any[]> {
  const now = Date.now();
  
  // 如果缓存有效，直接返回
  if (channelsCache && now < cacheExpiry) {
    return channelsCache;
  }
  
  try {
    const response = await fetch('/api/channels', {
      next: { revalidate: 300 }, // 5分钟缓存
    });
    
    if (response.ok) {
      const data = await response.json();
      channelsCache = data.channels || [];
      cacheExpiry = now + 5 * 60 * 1000; // 5分钟后过期
      return channelsCache || [];
    }
  } catch (error) {
    console.warn('获取频道信息失败:', error);
  }
  
  return [];
}

/**
 * 根据slug获取频道的中文名称
 */
async function getChannelName(slug: string): Promise<string> {
  if (!slug) return '';
  
  const channels = await getChannels();
  const channel = channels.find(ch => ch.slug === slug || ch.id === slug);
  
  return channel?.name || slug;
}

/**
 * 获取快讯数据
 * 优先级：Headlines API (breaking news) -> 最新推荐 -> 模拟数据兜底
 */
export async function getBreakingNews(limit: number = 8): Promise<BreakingNewsItem[]> {
  try {
    console.log('🚨 Breaking News: 获取最新快讯数据...');
    
    // 首先尝试获取 breaking news (最近6小时内的紧急新闻)
    const headlinesUrl = `/api/headlines?size=${limit * 2}&hours=6&diversity=high&site=aivoya.com`;
    console.log(`🔍 Breaking News: Fetching URL: ${headlinesUrl}`);
    
    const response = await fetch(headlinesUrl, {
      next: { revalidate: 30 }, // 快讯数据30秒缓存
      headers: {
        'X-Session-ID': `breaking_${Date.now()}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`🚨 获取到 ${data.items?.length || 0} 条快讯候选`);
      
      if (data.items && data.items.length > 0) {
        // 优先筛选最新的、有紧急标记的新闻
        const filteredItems = data.items
          .filter((item: any) => {
            const publishTime = new Date(item.publish_time || item.publish_at);
            const hoursAgo = (Date.now() - publishTime.getTime()) / (1000 * 60 * 60);
            return hoursAgo <= 24; // 24小时内的新闻
          })
          .slice(0, limit);
        
        // 异步转换数据，包括获取频道中文名称
        const breakingItems = await Promise.all(
          filteredItems.map((item: any) => transformToBreakingItem(item))
        );
        
        console.log(`🚨 转换后快讯内容: ${breakingItems.length} 条`);
        if (breakingItems.length > 0) {
          return breakingItems;
        }
      }
    }
  } catch (error) {
    console.warn('🚫 Headlines API failed for breaking news:', error);
  }

  try {
    // 备选方案：使用首页频道的最新内容
    console.log('⚠️ Breaking News: Headlines API失败，回退到首页频道...');
    const newsResponse = await getNews('首页', 1, limit * 2);
    
    if (newsResponse.data && newsResponse.data.length > 0) {
      const filteredNews = newsResponse.data
        .filter((item: any) => {
          const publishTime = new Date(item.publish_at || item.first_published_at);
          const hoursAgo = (Date.now() - publishTime.getTime()) / (1000 * 60 * 60);
          return hoursAgo <= 24; // 24小时内
        })
        .slice(0, limit);
      
      // 异步获取频道名称
      const recentNews = await Promise.all(
        filteredNews.map(async (item: any) => {
          let channelInfo = undefined;
          
          if (item.channel) {
            const slug = item.channel.slug || item.channel.id?.toString() || '';
            let name = item.channel.name || '';
            
            // 如果名称是英文或为空，从数据库获取
            if (!name || !/[\u4e00-\u9fa5]/.test(name)) {
              name = await getChannelName(slug);
            }
            
            channelInfo = {
              id: slug,
              name: name,
              slug: slug
            };
          }
          
          return {
            id: item.id.toString(),
            title: item.title,
            slug: item.slug,
            publish_time: item.publish_at || item.first_published_at,
            channel: channelInfo,
            is_urgent: item.is_featured || item.is_breaking || false,
          };
        })
      );
      
      console.log(`✅ Breaking News: 首页频道获取到 ${recentNews.length} 条数据`);
      if (recentNews.length > 0) {
        return recentNews;
      }
    }
  } catch (error) {
    console.warn('🚫 News API also failed for breaking ticker:', error);
  }

  // 最后兜底：使用模拟数据
  console.log('🚫 Breaking News: 所有API均失败，使用模拟数据');
  return generateMockBreakingNews(limit);
}

/**
 * 转换 Headlines API 数据为 BreakingNewsItem 格式
 */
async function transformToBreakingItem(item: any): Promise<BreakingNewsItem> {
  let channelInfo = undefined;
  
  if (item.channel) {
    if (typeof item.channel === 'string') {
      // 如果频道是字符串，从数据库获取正确的名称
      const channelName = await getChannelName(item.channel);
      channelInfo = {
        id: item.channel,
        name: channelName,
        slug: item.channel
      };
    } else {
      // 如果频道是对象，优先使用现有的中文名称，否则从数据库获取
      const slug = item.channel.slug || item.channel.id?.toString() || '';
      let name = item.channel.name || '';
      
      // 如果名称是英文或为空，从数据库获取
      if (!name || !/[\u4e00-\u9fa5]/.test(name)) {
        name = await getChannelName(slug);
      }
      
      channelInfo = {
        id: slug,
        name: name,
        slug: slug
      };
    }
  }
  
  return {
    id: item.id || item.article_id || 'unknown',
    title: item.title || '未知标题',
    slug: item.slug || `article-${item.id}`,
    publish_time: item.publish_time || item.publish_at || new Date().toISOString(),
    channel: channelInfo,
    is_urgent: item.is_breaking || item.is_urgent || item.is_featured || false,
  };
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
