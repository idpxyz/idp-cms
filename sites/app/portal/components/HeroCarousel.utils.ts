import { HeroItem } from './HeroCarousel';
import { endpoints } from '@/lib/config/endpoints';

/**
 * 获取 Hero 轮播数据
 * 使用专用的Hero API端点，基于is_hero字段简单筛选
 * 🎯 Hero内容无时间限制：只要标记为is_hero=True就会显示
 */
export async function getHeroItems(limit: number = 5): Promise<HeroItem[]> {
  try {
    // 🎬 使用专用的Hero API端点
    const params = new URLSearchParams({
      size: limit.toString(),
      // 🎯 Hero无时间限制 - 移除hours参数
      // hours: '168', // 已移除，Hero内容不受时间限制
      site: 'aivoya.com'
    });
    
    // 🎯 使用专用的Hero API端点
    const apiUrl = endpoints.getCmsEndpoint(`/api/hero/?${params.toString()}`);
    
    const response = await fetch(apiUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      next: { revalidate: 300 }, // 5分钟缓存
      signal: AbortSignal.timeout(5000), // 5秒超时，Hero数据简单，应该更快
    });
    
    if (!response.ok) {
      console.warn(`Hero API failed: ${response.status}, falling back to empty`);
      return []; // Hero失败时直接返回空，不影响页面
    }
    
    const data = await response.json();
    
    if (data.items && data.items.length > 0) {
      const heroItems = data.items
        .filter((item: any) => item.image_url) // 确保有封面图
        .map((item: any) => transformToHeroItem(item));
      
      return heroItems;
    }
    
    return [];
  } catch (error) {
    console.error('🚫 Failed to fetch hero content from dedicated API:', error);
    return []; // 🚫 没有Hero数据时返回空数组，不显示Hero组件
  }
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
    media_type: item.has_video ? 'data' : 'image',
    tags: item.tags || [],
  };
}

// 不再需要mock数据生成器，当没有Hero数据时直接不显示组件
