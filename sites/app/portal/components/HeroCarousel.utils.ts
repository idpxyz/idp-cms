import { HeroItem } from './HeroCarousel';
import { getNews } from '@/lib/api/news';
import { fetchTrendingFeed } from '@/lib/api/feed';

/**
 * 获取 Hero 轮播数据
 * 优先使用专门的Hero标记，回退到推荐内容
 */
export async function getHeroItems(limit: number = 5): Promise<HeroItem[]> {
  try {
    // 🎬 首先尝试获取专门标记为Hero的内容
    console.log('🎬 HeroCarousel: 尝试获取Hero专用内容...');
    const heroResponse = await getNews('hero', 1, limit);
    
    if (heroResponse.data && heroResponse.data.length > 0) {
      console.log(`🎬 获取到 ${heroResponse.data.length} 条Hero专用内容`);
      const heroItems = heroResponse.data
        .filter(item => item.cover?.url || item.image_url) // 确保有封面图
        .map(item => transformToHeroItem(item));
      
      console.log(`🎬 过滤后Hero内容: ${heroItems.length} 条`);
      if (heroItems.length > 0) {
        return heroItems;
      }
    }
  } catch (error) {
    console.warn('🚫 Failed to fetch hero-specific content:', error);
  }
  
  try {
    // 📈 如果Hero专用内容不足，使用featured作为补充
    console.log('📈 HeroCarousel: 回退到featured内容...');
    const featuredResponse = await getNews('recommend', 1, limit);
    
    if (featuredResponse.data && featuredResponse.data.length > 0) {
      const featuredItems = featuredResponse.data
        .filter(item => (item.is_featured && (item.cover?.url || item.image_url))) // featured + 有图
        .slice(0, limit)
        .map(item => transformToHeroItem(item));
      
      if (featuredItems.length > 0) {
        console.log(`📈 获取到 ${featuredItems.length} 条featured补充内容`);
        return featuredItems;
      }
    }
  } catch (error) {
    console.warn('🚫 Failed to fetch featured content for hero:', error);
  }
  
  // 🎭 最后回退到模拟数据
  console.log('🎭 HeroCarousel: 回退到模拟数据');
  return generateMockHeroItems().slice(0, limit);
}

/**
 * 转换后端数据为Hero项目格式
 */
function transformToHeroItem(item: any): HeroItem {
  // 为Hero文章提供默认占位图
  const defaultHeroImage = `https://picsum.photos/1200/600?random=${item.id}`;
  
  return {
    id: item.id.toString(),
    title: item.title,
    excerpt: item.excerpt || item.summary || '',
    image_url: item.cover?.url || item.image_url || defaultHeroImage,
    publish_time: item.publish_at || item.first_published_at || item.created_at,
    author: item.author_name || item.author || '',
    source: item.source_site?.name || item.external_site?.name || '本站',
    channel: item.channel ? {
      id: item.channel.slug || item.channel.id.toString(),
      name: item.channel.name,
      slug: item.channel.slug || item.channel.id.toString()
    } : undefined,
    topic: item.topic ? {
      id: item.topic.slug || item.topic.id.toString(),
      name: item.topic.title || item.topic.name,
      slug: item.topic.slug || item.topic.id.toString()
    } : undefined,
    slug: item.slug || `article-${item.id}`,
    is_breaking: item.is_featured || false,
    is_live: item.is_live || false,
    is_event_mode: item.is_event_mode || false,
    media_type: item.has_video ? 'video' : 'image',
    tags: item.tags || [],
  };

  // 以下 API 调用暂时注释，需要时可以重新启用
  /*
  try {
    // 首先尝试使用智能推荐获取热门内容
    const trendingResponse = await fetchTrendingFeed(limit);
    
    if (trendingResponse.items && trendingResponse.items.length > 0) {
      return trendingResponse.items.map(item => ({
        id: item.id,
        title: item.title,
        excerpt: item.excerpt,
        image_url: item.image_url,
        publish_time: item.publish_time || item.publish_at,
        author: item.author,
        source: item.source,
        channel: item.channel ? {
          id: item.channel.slug || 'unknown',
          name: item.channel.name,
          slug: item.channel.slug || 'unknown'
        } : undefined,
        slug: item.slug,
        is_breaking: item.is_featured || false,
        is_live: false, // 需要根据实际数据结构调整
        is_event_mode: false, // 新增字段
        media_type: (item.image_url ? 'image' : 'data') as 'image' | 'video' | 'data', // 新增字段
        tags: item.tags || [],
      }));
    }
  } catch (error) {
    console.warn('Failed to fetch trending feed for hero carousel:', error);
  }

  try {
    // 回退到传统新闻 API
    const newsResponse = await getNews('recommend', 1, limit);
    
    if (newsResponse.data && newsResponse.data.length > 0) {
      return newsResponse.data
        .filter(item => item.image_url || item.cover?.url) // 只选择有图片的新闻
        .map(item => ({
          id: item.id,
          title: item.title,
          excerpt: item.excerpt || item.introduction,
          image_url: item.image_url || item.cover?.url,
          publish_time: item.publish_at,
          author: item.author,
          source: item.source,
          channel: item.channel ? {
            id: item.channel.slug || 'unknown',
            name: item.channel.name,
            slug: item.channel.slug || 'unknown'
          } : undefined,
          slug: item.slug,
          is_breaking: item.is_featured || false,
          is_live: false,
          is_event_mode: false, // 新增字段
          media_type: (item.image_url || item.cover?.url ? 'image' : 'data') as 'image' | 'video' | 'data', // 新增字段
          tags: item.tags || [],
        }));
    }
  } catch (error) {
    console.warn('Failed to fetch news for hero carousel:', error);
  }

  // 如果都失败了，返回模拟数据
  return generateMockHeroItems().slice(0, limit);
  */
}

/**
 * 模拟数据生成器（开发和测试用）
 * 使用本地占位符图片，避免网络问题
 */
export function generateMockHeroItems(): HeroItem[] {
  return [
    {
      id: '1',
      title: '重大突发：全球科技峰会在北京召开，探讨人工智能未来发展方向',
      excerpt: '来自全球50多个国家的科技领袖齐聚北京，共同探讨人工智能、量子计算等前沿技术的发展趋势和应用前景。',
      image_url: 'https://picsum.photos/1200/600?random=1',
      publish_time: new Date().toISOString(),
      author: '科技日报',
      source: '新华社',
      channel: { id: 'tech', name: '科技', slug: 'tech' },
      slug: 'global-tech-summit-beijing-2024',
      is_breaking: false,
      is_live: false,
      is_event_mode: false,
      media_type: 'image' as const,
      tags: ['科技', '人工智能', '峰会'],
    },
    {
      id: '2',
      title: '经济新动向：央行宣布新一轮货币政策调整，支持实体经济发展',
      excerpt: '中国人民银行今日宣布调整货币政策工具，通过定向降准等措施，进一步支持小微企业和实体经济发展。',
      image_url: 'https://picsum.photos/1200/600?random=2',
      publish_time: new Date(Date.now() - 3600000).toISOString(), // 1小时前
      author: '财经记者',
      source: '财经日报',
      channel: { id: 'finance', name: '财经', slug: 'finance' },
      slug: 'pboc-monetary-policy-adjustment-2024',
      is_breaking: false,
      is_live: false,
      is_event_mode: false,
      media_type: 'image' as const,
      tags: ['经济', '货币政策', '央行'],
    },
    {
      id: '3',
      title: '地球美景：探索我们美丽的蓝色星球，感受自然的壮丽与神奇',
      excerpt: '从太空俯瞰地球，感受这颗蓝色星球的壮丽景色。海洋、陆地、云层交相辉映，展现出大自然的无穷魅力和生命的奇迹。',
      image_url: 'https://picsum.photos/1200/600?random=3',
      publish_time: new Date(Date.now() - 7200000).toISOString(), // 2小时前
      author: '科学记者',
      source: '自然地理',
      channel: { id: 'science', name: '科学', slug: 'science' },
      slug: 'earth-beauty-from-space',
      is_breaking: false,
      is_live: false,
      is_event_mode: false, // 关闭事件模式以使用紧凑布局
      media_type: 'image' as const,
      tags: ['科学', '地球', '自然'],
    },
    {
      id: '4',
      title: '文化传承：传统工艺与现代设计的完美融合，非遗文化焕发新活力',
      excerpt: '在数字化时代，传统非物质文化遗产通过与现代设计理念的结合，展现出了全新的魅力和生命力。',
      image_url: 'https://picsum.photos/1200/600?random=4',
      publish_time: new Date(Date.now() - 10800000).toISOString(), // 3小时前
      author: '文化记者',
      source: '文化日报',
      channel: { id: 'culture', name: '文化', slug: 'culture' },
      slug: 'traditional-crafts-modern-design-integration',
      is_breaking: false,
      is_live: false,
      is_event_mode: false,
      media_type: 'image' as const,
      tags: ['文化', '非遗', '传统工艺'],
    },
    {
      id: '5',
      title: '国际关注：全球气候变化大会达成重要共识，各国承诺减排目标',
      excerpt: '在最新的气候变化大会上，各国代表就减排目标和绿色发展路径达成重要共识，为全球应对气候变化注入新动力。',
      image_url: 'https://picsum.photos/1200/600?random=5',
      publish_time: new Date(Date.now() - 14400000).toISOString(), // 4小时前
      author: '环境记者',
      source: '环球时报',
      channel: { id: 'international', name: '国际', slug: 'international' },
      slug: 'global-climate-summit-consensus-2024',
      is_breaking: false,
      is_live: false,
      is_event_mode: false,
      media_type: 'image' as const, // 改为普通图片类型
      tags: ['国际', '气候变化', '环保'],
    },
  ];
}
