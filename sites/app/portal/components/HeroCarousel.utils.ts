import { HeroItem } from './HeroCarousel';
import { getNews } from '@/lib/api/news';

/**
 * 获取 Hero 轮播数据
 * 只使用专门标记为Hero的内容，没有数据时不显示Hero组件
 */
export async function getHeroItems(limit: number = 5): Promise<HeroItem[]> {
  try {
    // 🎬 获取专门标记为Hero的内容
    console.log('🎬 HeroCarousel: 尝试获取Hero专用内容...');
    const heroResponse = await getNews('hero', 1, limit);
    
    if (heroResponse.data && heroResponse.data.length > 0) {
      console.log(`🎬 获取到 ${heroResponse.data.length} 条Hero专用内容`);
      const heroItems = heroResponse.data
        .filter(item => item.cover?.url || item.image_url) // 确保有封面图
        .map(item => transformToHeroItem(item));
      
      console.log(`🎬 过滤后Hero内容: ${heroItems.length} 条`);
      return heroItems;
    }
  } catch (error) {
    console.warn('🚫 Failed to fetch hero-specific content:', error);
  }
  
  // 🚫 没有Hero数据时返回空数组，不显示Hero组件
  console.log('🚫 HeroCarousel: 没有Hero数据，不显示Hero组件');
  return [];
}

/**
 * 转换后端数据为Hero项目格式
 */
function transformToHeroItem(item: any): HeroItem {
  return {
    id: item.id.toString(),
    title: item.title,
    excerpt: item.excerpt || item.summary || '',
    image_url: item.cover?.url || item.image_url,
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
    media_type: item.has_video ? 'data' : 'image',
    tags: item.tags || [],
  };
}

// 不再需要mock数据生成器，当没有Hero数据时直接不显示组件
