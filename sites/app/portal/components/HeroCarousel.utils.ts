import { HeroItem } from './HeroCarousel';
import { buildBackendApiUrl } from '@/lib/utils/api-url';

/**
 * 获取 Hero 轮播数据
 * 使用OpenSearch统一数据源，基于is_hero字段筛选
 */
export async function getHeroItems(limit: number = 5): Promise<HeroItem[]> {
  try {
    // 🎬 使用OpenSearch获取专门标记为Hero的内容
    console.log('🎬 HeroCarousel: 使用OpenSearch获取Hero内容...');
    
    const params = new URLSearchParams({
      size: limit.toString(),
      hours: '168', // 7天内的Hero内容
      mode: 'hero', // 🎯 使用Hero模式
      site: 'aivoya.com'
    });
    
    const apiUrl = buildBackendApiUrl(`/api/headlines/?${params.toString()}`);
    console.log(`🔍 HeroCarousel: Fetching URL: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      next: { revalidate: 300 } // 5分钟缓存
    });
    
    if (!response.ok) {
      throw new Error(`Hero API failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.items && data.items.length > 0) {
      console.log(`🎬 获取到 ${data.items.length} 条Hero内容`);
      const heroItems = data.items
        .filter((item: any) => item.image_url) // 确保有封面图
        .map((item: any) => transformToHeroItem(item));
      
      console.log(`🎬 过滤后Hero内容: ${heroItems.length} 条`);
      return heroItems;
    }
  } catch (error) {
    console.error('🚫 Failed to fetch hero content from OpenSearch:', error);
  }
  
  // 🚫 没有Hero数据时返回空数组，不显示Hero组件
  console.log('🚫 HeroCarousel: 没有Hero数据，不显示Hero组件');
  return [];
}

/**
 * 转换OpenSearch数据为Hero项目格式
 */
function transformToHeroItem(item: any): HeroItem {
  // OpenSearch数据结构适配
  const channelData = item.channel;
  const topicData = item.topic;
  
  return {
    id: item.article_id || item.id?.toString() || '',
    title: item.title || '',
    excerpt: item.excerpt || item.summary || '',
    image_url: item.image_url || '',
    publish_time: item.publish_time || '',
    author: item.author || '',
    source: item.source || '本站',
    channel: channelData ? {
      id: channelData.slug || channelData.id?.toString() || '',
      name: channelData.name || '',
      slug: channelData.slug || channelData.id?.toString() || ''
    } : undefined,
    topic: topicData ? {
      id: topicData.slug || topicData.id?.toString() || '',
      name: topicData.title || topicData.name || '',
      slug: topicData.slug || topicData.id?.toString() || ''
    } : undefined,
    slug: item.slug || `article-${item.article_id || item.id}`,
    is_breaking: item.is_breaking || item.is_featured || false,
    is_live: item.is_live || false,
    is_event_mode: item.is_event_mode || false,
    media_type: item.has_video ? 'video' : 'image',
    tags: item.tags || [],
  };
}

// 不再需要mock数据生成器，当没有Hero数据时直接不显示组件
