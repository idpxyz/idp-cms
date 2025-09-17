import { fetchTrendingFeed } from '@/lib/api/feed';
import { getNews } from '@/lib/api/news';
import { TopStoryItem } from './TopStoriesGrid';

/**
 * 获取头条新闻数据
 * 优先级：模拟数据 -> 智能推荐 -> 传统新闻API
 */
export async function getTopStories(limit: number = 6): Promise<TopStoryItem[]> {
  // 直接使用模拟数据，确保立即显示效果
  console.log('Using mock top stories data for immediate display');
  return generateMockTopStories(limit);

  // 以下代码注释掉，需要时可以恢复
  /*
  try {
    // 首先尝试获取热门推荐内容
    const trendingResponse = await fetchTrendingFeed(limit * 2);
    
    if (trendingResponse.items && trendingResponse.items.length > 0) {
      return trendingResponse.items
        .filter(item => item.image_url)
        .slice(0, limit)
        .map(item => ({
          id: item.id,
          title: item.title,
          excerpt: item.excerpt,
          slug: item.slug,
          image_url: item.image_url,
          publish_time: item.publish_time || item.publish_at,
          author: item.author,
          channel: item.channel ? {
            id: item.channel.slug || 'unknown',
            name: item.channel.name,
            slug: item.channel.slug || 'unknown'
          } : undefined,
          tags: item.tags || [],
          is_featured: item.is_featured || false,
          is_editor_pick: false,
          view_count: Math.floor(Math.random() * 10000) + 1000,
          comment_count: Math.floor(Math.random() * 100) + 10,
          reading_time: Math.floor(Math.random() * 10) + 3,
        }));
    }
  } catch (error) {
    console.warn('Failed to fetch trending feed for top stories:', error);
  }

  try {
    // 备选方案：使用传统新闻API
    const newsResponse = await getNews('recommend', 1, limit * 2);
    
    if (newsResponse.data && newsResponse.data.length > 0) {
      return newsResponse.data
        .filter(item => item.image_url || item.cover?.url)
        .slice(0, limit)
        .map(item => ({
          id: item.id,
          title: item.title,
          excerpt: item.excerpt || item.introduction,
          slug: item.slug,
          image_url: item.image_url || item.cover?.url,
          publish_time: item.publish_at,
          author: item.author,
          channel: item.channel ? {
            id: item.channel.slug || 'unknown',
            name: item.channel.name,
            slug: item.channel.slug || 'unknown'
          } : undefined,
          tags: item.tags || [],
          is_featured: item.is_featured || false,
          is_editor_pick: false,
          view_count: Math.floor(Math.random() * 10000) + 1000,
          comment_count: Math.floor(Math.random() * 100) + 10,
          reading_time: Math.floor(Math.random() * 10) + 3,
        }));
    }
  } catch (error) {
    console.warn('Failed to fetch news for top stories:', error);
  }

  return generateMockTopStories(limit);
  */
}

/**
 * 生成模拟头条数据（开发和测试用）
 */
export function generateMockTopStories(count: number = 6): TopStoryItem[] {
  const mockItems: TopStoryItem[] = [
    {
      id: 'top-1',
      title: '全球经济复苏加速，中国GDP增长超预期达到8.5%',
      excerpt: '国家统计局今日发布最新数据显示，中国经济在第三季度表现强劲，GDP同比增长8.5%，超出市场预期的7.8%。专家认为，这得益于消费复苏和出口贸易的强劲增长。',
      slug: 'china-gdp-growth-exceeds-expectations',
      image_url: 'https://picsum.photos/800/450?random=1',
      publish_time: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      author: '经济日报记者',
      channel: { id: 'finance', name: '财经', slug: 'finance' },
      tags: ['经济', 'GDP', '增长'],
      is_featured: true,
      is_editor_pick: true,
      view_count: 15420,
      comment_count: 89,
      reading_time: 5,
    },
    {
      id: 'top-2',
      title: '科技创新突破：量子计算机实现新的里程碑式进展',
      excerpt: '中科院量子信息与量子科技创新研究院宣布，其研发的量子计算机在特定算法上的计算能力较传统超级计算机提升了100万倍。',
      slug: 'quantum-computing-breakthrough-milestone',
      image_url: 'https://picsum.photos/800/450?random=2',
      publish_time: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      author: '科技日报',
      channel: { id: 'tech', name: '科技', slug: 'tech' },
      tags: ['科技', '量子计算', '创新'],
      is_featured: true,
      is_editor_pick: false,
      view_count: 12350,
      comment_count: 67,
      reading_time: 4,
    },
    {
      id: 'top-3',
      title: '教育改革新政策：义务教育阶段将全面实施素质教育评价体系',
      excerpt: '教育部发布新的教育评价改革方案，将在全国义务教育阶段全面推行多元化素质教育评价体系，改变唯分数论的传统模式。',
      slug: 'education-reform-quality-assessment-system',
      image_url: 'https://picsum.photos/800/450?random=3',
      publish_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      author: '教育周刊',
      channel: { id: 'education', name: '教育', slug: 'education' },
      tags: ['教育', '改革', '评价体系'],
      is_featured: false,
      is_editor_pick: true,
      view_count: 9876,
      comment_count: 134,
      reading_time: 6,
    },
    {
      id: 'top-4',
      title: '环保新举措：全国碳交易市场启动，助力碳中和目标实现',
      excerpt: '全国碳排放权交易市场正式启动交易，首日成交量达到410万吨，成交额超过2亿元，标志着中国碳市场建设迈出重要一步。',
      slug: 'national-carbon-trading-market-launch',
      image_url: 'https://picsum.photos/800/450?random=4',
      publish_time: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      author: '环境报',
      channel: { id: 'environment', name: '环境', slug: 'environment' },
      tags: ['环保', '碳交易', '碳中和'],
      is_featured: false,
      is_editor_pick: false,
      view_count: 7654,
      comment_count: 45,
      reading_time: 4,
    },
    {
      id: 'top-5',
      title: '体育盛事：2024年奥运会中国代表团名单公布，创历史新高',
      excerpt: '中国奥委会正式公布2024年巴黎奥运会中国体育代表团名单，共有777名运动员参加33个大项的比赛，参赛人数创历史新高。',
      slug: 'china-olympics-team-2024-record-size',
      image_url: 'https://picsum.photos/800/450?random=5',
      publish_time: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      author: '体育周报',
      channel: { id: 'sports', name: '体育', slug: 'sports' },
      tags: ['体育', '奥运会', '代表团'],
      is_featured: false,
      is_editor_pick: false,
      view_count: 11234,
      comment_count: 78,
      reading_time: 3,
    },
    {
      id: 'top-6',
      title: '文化传承：非遗保护工作取得重大进展，数字化保护全面启动',
      excerpt: '文化和旅游部宣布启动非物质文化遗产数字化保护工程，计划用5年时间建成覆盖全国的非遗数字化保护体系。',
      slug: 'intangible-heritage-digital-protection-project',
      image_url: 'https://picsum.photos/800/450?random=6',
      publish_time: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      author: '文化日报',
      channel: { id: 'culture', name: '文化', slug: 'culture' },
      tags: ['文化', '非遗', '数字化'],
      is_featured: false,
      is_editor_pick: false,
      view_count: 5432,
      comment_count: 32,
      reading_time: 4,
    },
    {
      id: 'top-7',
      title: '医疗健康：新冠疫苗接种率达95%，群体免疫屏障基本建立',
      excerpt: '国家卫健委发布数据显示，全国新冠疫苗接种率已达95%，有效建立了群体免疫屏障，为经济社会全面恢复提供了坚实保障。',
      slug: 'covid-vaccine-coverage-95-percent',
      image_url: 'https://picsum.photos/800/450?random=7',
      publish_time: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      author: '健康报',
      channel: { id: 'health', name: '健康', slug: 'health' },
      tags: ['医疗', '疫苗', '健康'],
      is_featured: false,
      is_editor_pick: false,
      view_count: 8765,
      comment_count: 56,
      reading_time: 3,
    },
    {
      id: 'top-8',
      title: '交通发展：高铁网络再扩容，新增3条高速铁路线正式通车',
      excerpt: '今日，京雄商高铁、西十高铁、成达万高铁三条新线同时开通运营，中国高铁运营里程突破4.5万公里，覆盖全国主要城市群。',
      slug: 'high-speed-rail-network-expansion',
      image_url: 'https://picsum.photos/800/450?random=8',
      publish_time: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
      author: '交通日报',
      channel: { id: 'transport', name: '交通', slug: 'transport' },
      tags: ['交通', '高铁', '基建'],
      is_featured: false,
      is_editor_pick: false,
      view_count: 6543,
      comment_count: 28,
      reading_time: 4,
    },
    {
      id: 'top-9',
      title: '农业现代化：智慧农业试点成效显著，粮食产量提升15%',
      excerpt: '农业农村部公布智慧农业试点成果，通过物联网、大数据、人工智能等技术应用，试点地区粮食产量平均提升15%，农药使用量减少30%。',
      slug: 'smart-agriculture-pilot-success',
      image_url: 'https://picsum.photos/800/450?random=9',
      publish_time: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      author: '农民日报',
      channel: { id: 'agriculture', name: '农业', slug: 'agriculture' },
      tags: ['农业', '智慧农业', '现代化'],
      is_featured: false,
      is_editor_pick: false,
      view_count: 4321,
      comment_count: 19,
      reading_time: 5,
    },
  ];

  return mockItems.slice(0, count);
}
