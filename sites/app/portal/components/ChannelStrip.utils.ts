/**
 * 频道条带组件的工具函数
 * 用于获取特定频道的文章数据和分类信息
 */

import { endpoints } from "@/lib/config/endpoints";
import { getMainSite } from "@/lib/config/sites";

export interface ChannelStripItem {
  id: string;
  title: string;
  excerpt: string;
  image_url: string;
  publish_time: string;
  author: string;
  source: string;
  channel: {
    id: string;
    name: string;
    slug: string;
  };
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  slug: string;
  is_breaking: boolean;
  is_live: boolean;
  view_count?: number;
  comment_count?: number;
  tags: string[];
}

export interface ChannelStripCategory {
  id: string;
  name: string;
  slug: string;
  count?: number;
}

/**
 * 获取频道的分类列表
 */
export async function getChannelCategories(channelSlug: string): Promise<ChannelStripCategory[]> {
  try {
    // 尝试使用真实的分类API
    const apiUrl = `/api/categories?channel=${channelSlug}`;
    console.log(`🔗 Fetching real categories for channel ${channelSlug}`);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'default',
    });

    if (!response.ok) {
      throw new Error(`Categories API responded with status: ${response.status}`);
    }

    const data = await response.json();
    const categories = data.data || data.results || [];
    
    console.log(`✅ Successfully fetched ${categories.length} real categories for channel ${channelSlug}`);
    
    // 转换API数据格式为ChannelStripCategory
    const channelCategories: ChannelStripCategory[] = categories.map((category: any) => ({
      id: category.id?.toString() || category.slug,
      name: category.name || category.title,
      slug: category.slug,
      count: category.article_count || category.count || 0,
    }));

    return channelCategories;

  } catch (error) {
    console.warn(`❌ Failed to fetch real categories for channel ${channelSlug}:`, error);
    console.log(`🔄 Falling back to mock categories for channel ${channelSlug}`);
    
    // 降级到Mock数据
    return generateMockCategories(channelSlug);
  }

  // 注释掉的原始TODO代码 - 保留以备参考
  /*
  try {
    const categoriesUrl = endpoints.buildUrl(
      endpoints.getCmsEndpoint('/api/portal/categories/'),
      { 
        site: getMainSite().hostname,
        channel: channelSlug,
        limit: '20'
      }
    );

    const fetchConfig = endpoints.createFetchConfig({
      timeout: 10000,
      next: { revalidate: 300 }, // 缓存5分钟
    });

    const response = await fetch(categoriesUrl, fetchConfig);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`Successfully fetched categories for channel ${channelSlug}:`, data.results?.length || 0);
      
      return (data.results || []).map((cat: any) => ({
        id: cat.id,
        name: cat.name || cat.title,
        slug: cat.slug,
        count: cat.article_count || 0,
      }));
    } else {
      console.warn(`Failed to fetch categories for channel ${channelSlug}, status:`, response.status);
    }
  } catch (error) {
    console.error(`Error fetching categories for channel ${channelSlug}:`, error);
  }

  // 返回模拟分类数据
  return generateMockCategories(channelSlug);
  */
}

/**
 * 获取频道的文章列表
 */
export async function getChannelArticles(
  channelSlug: string, 
  categorySlug?: string, 
  limit: number = 8
): Promise<ChannelStripItem[]> {
  try {
    // 使用现有的 /api/news/ API
    const params = new URLSearchParams({
      channel: channelSlug,
      limit: limit.toString(),
    });

    const apiUrl = `/api/news?${params.toString()}`;
    console.log(`🔗 Fetching real data for channel ${channelSlug}${categorySlug ? `, category ${categorySlug}` : ''}, limit: ${limit}`);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // 客户端缓存控制
      cache: 'default',
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();
    const articles = data.data || [];
    
    console.log(`✅ Successfully fetched ${articles.length} real articles for channel ${channelSlug}`);
    
    // 转换API数据格式为ChannelStripItem
    const channelStripItems: ChannelStripItem[] = articles.map((article: any) => ({
      id: article.id?.toString() || '',
      title: article.title || '',
      excerpt: article.excerpt || '',
      image_url: article.image_url || '',
      publish_time: article.publish_at || article.updated_at || new Date().toISOString(),
      author: article.author || '未知作者',
      source: article.source || article.channel?.name || '来源',
      channel: {
        id: article.channel?.slug || channelSlug,
        name: article.channel?.name || channelSlug,
        slug: article.channel?.slug || channelSlug,
      },
      category: categorySlug ? {
        id: categorySlug,
        name: categorySlug,
        slug: categorySlug,
      } : undefined,
      slug: article.slug || '',
      is_breaking: article.is_breaking || false,
      is_live: article.is_live || false,
      view_count: article.view_count || 0,
      comment_count: article.comment_count || 0,
      tags: article.tags || [],
    }));

    return channelStripItems;

  } catch (error) {
    console.warn(`❌ Failed to fetch real data for channel ${channelSlug}:`, error);
    console.log(`🔄 Falling back to mock data for channel ${channelSlug}`);
    
    // 降级到Mock数据
    return generateMockChannelArticles(channelSlug, limit);
  }

  // 注释掉的原始TODO代码 - 保留以备参考
  /*
  try {
    const articlesUrl = endpoints.buildUrl(
      endpoints.getCmsEndpoint('/api/portal/articles/'),
      { 
        site: getMainSite().hostname,
        channel: channelSlug,
        category: categorySlug || '',
        limit: limit.toString(),
        ordering: '-publish_time',
        include: 'channel,category,tags'
      }
    );

    const fetchConfig = endpoints.createFetchConfig({
      timeout: 15000,
      next: { revalidate: 180 }, // 缓存3分钟
    });

    const response = await fetch(articlesUrl, fetchConfig);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`Successfully fetched articles for channel ${channelSlug}${categorySlug ? `, category ${categorySlug}` : ''}:`, data.results?.length || 0);
      
      return (data.results || []).map((article: any) => ({
        id: article.id,
        title: article.title,
        excerpt: article.excerpt || article.summary || '',
        image_url: article.hero_image_url || article.featured_image_url || '',
        publish_time: article.publish_time,
        author: article.author_name || article.author || '未知作者',
        source: article.source || article.channel?.name || '',
        channel: {
          id: article.channel?.id || channelSlug,
          name: article.channel?.name || channelSlug,
          slug: article.channel?.slug || channelSlug,
        },
        category: article.category ? {
          id: article.category.id,
          name: article.category.name,
          slug: article.category.slug,
        } : undefined,
        slug: article.slug,
        is_breaking: article.is_breaking || false,
        is_live: article.is_live || false,
        view_count: article.view_count || 0,
        comment_count: article.comment_count || 0,
        tags: article.tags || [],
      }));
    } else {
      console.warn(`Failed to fetch articles for channel ${channelSlug}, status:`, response.status);
    }
  } catch (error) {
    console.error(`Error fetching articles for channel ${channelSlug}:`, error);
  }

  // 返回模拟文章数据
  return generateMockChannelArticles(channelSlug, limit);
  */
}

/**
 * 生成模拟分类数据
 */
function generateMockCategories(channelSlug: string): ChannelStripCategory[] {
  const categoryMap: Record<string, ChannelStripCategory[]> = {
    tech: [
      { id: 'ai', name: '人工智能', slug: 'ai', count: 156 },
      { id: 'mobile', name: '移动科技', slug: 'mobile', count: 89 },
      { id: 'internet', name: '互联网', slug: 'internet', count: 234 },
      { id: 'startup', name: '创业', slug: 'startup', count: 67 },
      { id: 'hardware', name: '硬件', slug: 'hardware', count: 45 },
    ],
    finance: [
      { id: 'market', name: '市场', slug: 'market', count: 198 },
      { id: 'crypto', name: '数字货币', slug: 'crypto', count: 123 },
      { id: 'banking', name: '银行', slug: 'banking', count: 87 },
      { id: 'investment', name: '投资', slug: 'investment', count: 145 },
      { id: 'policy', name: '政策', slug: 'policy', count: 76 },
    ],
    politics: [
      { id: 'domestic', name: '国内政治', slug: 'domestic', count: 234 },
      { id: 'international', name: '国际关系', slug: 'international', count: 178 },
      { id: 'policy', name: '政策解读', slug: 'policy', count: 156 },
      { id: 'election', name: '选举', slug: 'election', count: 89 },
      { id: 'diplomacy', name: '外交', slug: 'diplomacy', count: 67 },
    ],
    sports: [
      { id: 'football', name: '足球', slug: 'football', count: 345 },
      { id: 'basketball', name: '篮球', slug: 'basketball', count: 234 },
      { id: 'olympics', name: '奥运', slug: 'olympics', count: 123 },
      { id: 'tennis', name: '网球', slug: 'tennis', count: 89 },
      { id: 'esports', name: '电竞', slug: 'esports', count: 156 },
    ],
  };

  return categoryMap[channelSlug] || [
    { id: 'general', name: '综合', slug: 'general', count: 100 },
    { id: 'hot', name: '热点', slug: 'hot', count: 80 },
    { id: 'trending', name: '趋势', slug: 'trending', count: 60 },
  ];
}

/**
 * 生成模拟文章数据
 */
function generateMockChannelArticles(channelSlug: string, limit: number): ChannelStripItem[] {
  const channelData: Record<string, { name: string; topics: string[] }> = {
    tech: {
      name: '科技',
      topics: [
        'AI 技术突破带来新的商业机遇，多家科技公司宣布重大投资计划',
        '5G 网络覆盖范围持续扩大，智能设备互联进入新阶段',
        '量子计算研究取得重要进展，有望在未来十年实现商业化应用',
        '新能源汽车销量创历史新高，传统汽车厂商加速电动化转型',
        '云计算服务需求激增，数据中心建设迎来新一轮高峰期',
        '区块链技术在金融领域应用不断深化，数字货币监管政策逐步完善',
      ]
    },
    finance: {
      name: '财经',
      topics: [
        '全球股市波动加剧，投资者关注央行货币政策走向',
        '房地产市场调控政策持续收紧，多城市出台限购措施',
        '人民币汇率保持相对稳定，跨境贸易结算比例持续上升',
        '新兴产业获得政策支持，绿色金融发展迎来重要机遇',
        '银行业数字化转型提速，金融科技创新应用不断涌现',
        '保险行业监管加强，市场竞争格局面临重新洗牌',
      ]
    },
    politics: {
      name: '时政',
      topics: [
        '重要会议召开，确定下阶段经济社会发展重点方向',
        '新一轮改革开放措施公布，多个领域将扩大对外开放',
        '政府工作报告发布，明确今年各项目标任务和政策措施',
        '反腐败斗争持续深入，制度建设取得新的重要进展',
        '民生保障政策不断完善，社会保障体系建设加快推进',
        '生态环境保护力度加大，绿色发展理念深入人心',
      ]
    },
    sports: {
      name: '体育',
      topics: [
        '世界杯预选赛激战正酣，多支队伍争夺最后的出线名额',
        'NBA 季后赛精彩纷呈，超级球星表现令人瞩目',
        '奥运会筹备工作有序推进，各项比赛场馆建设接近完工',
        '网球大满贯赛事开战，新老选手同场竞技展现精彩对决',
        '电竞产业快速发展，职业联赛规模和影响力不断扩大',
        '马拉松赛事遍地开花，全民健身热潮持续升温',
      ]
    },
  };

  const channelInfo = channelData[channelSlug] || { name: '综合', topics: ['综合新闻内容'] };
  const items: ChannelStripItem[] = [];

  for (let i = 0; i < limit; i++) {
    const topicIndex = i % channelInfo.topics.length;
    const imageId = (channelSlug.charCodeAt(0) + i) % 1000;
    
    items.push({
      id: `${channelSlug}-${i + 1}`,
      title: channelInfo.topics[topicIndex],
      excerpt: `${channelInfo.topics[topicIndex].substring(0, 50)}...`,
      image_url: `https://picsum.photos/400/300?random=${imageId}`,
      publish_time: new Date(Date.now() - (i + 1) * 3600000).toISOString(), // i+1 小时前
      author: ['张记者', '李编辑', '王特派', '刘撰稿'][i % 4],
      source: channelInfo.name,
      channel: {
        id: channelSlug,
        name: channelInfo.name,
        slug: channelSlug,
      },
      slug: `${channelSlug}-article-${i + 1}`,
      is_breaking: i === 0, // 第一条设为突发新闻
      is_live: i === 1, // 第二条设为直播
      view_count: Math.floor(Math.random() * 10000) + 1000,
      comment_count: Math.floor(Math.random() * 500) + 10,
      tags: [`${channelInfo.name}`, '热点', '重要'].slice(0, 2),
    });
  }

  return items;
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

/**
 * 格式化数字显示（万、千等）
 */
export function formatNumber(num: number): string {
  if (num >= 10000) {
    return `${(num / 10000).toFixed(1)}万`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}千`;
  } else {
    return num.toString();
  }
}
