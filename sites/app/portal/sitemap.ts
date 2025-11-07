import { MetadataRoute } from 'next'
import { env } from '@/lib/config/env'
import { endpoints } from '@/lib/config/endpoints'
import { getMainSite } from '@/lib/config/sites'

/**
 * 动态生成 sitemap.xml
 * 
 * 这个 sitemap 会自动包含所有文章页面，并定期更新
 * Next.js 会自动在 /portal/sitemap.xml 提供这个 sitemap
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 🎯 使用统一配置系统
  let baseUrl = env.get('NEXT_PUBLIC_SITE_URL');
  const apiUrl = env.getCmsOrigin(); // 自动选择内部/外部地址
  const site = env.get('SITE_HOSTNAME');

  // 🔧 修复：如果是默认占位符，使用实际域名
  if (baseUrl === 'https://yourdomain.com' || baseUrl.includes('yourdomain')) {
    baseUrl = 'http://www.hubeitoday.com.cn';
  }

  console.log(`[Sitemap] Generating sitemap for site: ${site}`);
  console.log(`[Sitemap] API URL: ${apiUrl}`);
  console.log(`[Sitemap] Base URL: ${baseUrl}`);

  try {
    // 获取所有文章列表（分页获取，确保获取所有文章）
    const articles = await fetchAllArticles(apiUrl, site);
    
    console.log(`[Sitemap] Successfully fetched ${articles.length} articles`);

    // 生成文章页面的 sitemap 条目
    const articleEntries: MetadataRoute.Sitemap = articles.map((article: any) => ({
      url: `${baseUrl}/portal/article/${article.slug}`,
      lastModified: article.updated_at || article.publish_at,
      changeFrequency: 'daily' as const,
      priority: article.is_featured ? 0.9 : 0.7,
    }));

    // 添加静态页面
    const staticPages: MetadataRoute.Sitemap = [
      {
        url: `${baseUrl}/portal`,
        lastModified: new Date(),
        changeFrequency: 'hourly',
        priority: 1.0,
      },
    ];

    return [...staticPages, ...articleEntries];
  } catch (error) {
    console.error('Failed to generate sitemap:', error);
    
    // 返回基本 sitemap，即使 API 失败
    return [
      {
        url: `${baseUrl}/portal`,
        lastModified: new Date(),
        changeFrequency: 'hourly',
        priority: 1.0,
      },
    ];
  }
}

/**
 * 获取所有文章（分页处理）
 */
async function fetchAllArticles(apiUrl: string, site: string): Promise<any[]> {
  const allArticles: any[] = [];
  let offset = 0;
  const limit = 100; // 每次获取100条
  let hasMore = true;

  console.log(`[Sitemap] Starting to fetch articles for site: ${site}`);

  while (hasMore && allArticles.length < 1000) { // 限制最多1000篇文章进入sitemap
    try {
      // 使用正确的API格式：/api/articles/?offset=X&limit=Y
      const fetchUrl = `${apiUrl}/api/articles/?offset=${offset}&limit=${limit}`;
      console.log(`[Sitemap] Fetching: ${fetchUrl}`);
      
      const response = await fetch(fetchUrl, {
        next: { revalidate: 3600 }, // 缓存1小时
        headers: {
          'Content-Type': 'application/json',
        },
        // 添加超时控制
        signal: AbortSignal.timeout(15000), // 15秒超时
      });

      if (!response.ok) {
        console.error(`[Sitemap] Failed to fetch articles offset ${offset}`);
        console.error(`[Sitemap] Status: ${response.status} ${response.statusText}`);
        
        try {
          const errorText = await response.text();
          console.error(`[Sitemap] Error response: ${errorText.substring(0, 200)}`);
        } catch (e) {
          console.error(`[Sitemap] Unable to read error response`);
        }
        break;
      }

      const data = await response.json();
      const items = data.items || data.results || data.data || [];
      
      console.log(`[Sitemap] Offset ${offset}: fetched ${items.length} articles, total so far: ${allArticles.length + items.length}`);

      if (items.length === 0) {
        hasMore = false;
      } else {
        // 只添加有slug的文章
        const validItems = items.filter((item: any) => item.slug);
        allArticles.push(...validItems);
        
        // 检查是否还有更多
        if (data.pagination) {
          hasMore = data.pagination.has_next;
        } else {
          // 如果返回的数量少于limit，说明没有更多了
          hasMore = items.length === limit;
        }
        
        offset += limit;
      }

      // 安全限制：最多1000篇文章（SEO最佳实践）
      if (allArticles.length >= 1000) {
        console.warn('[Sitemap] Reached 1000 articles limit (SEO best practice)');
        break;
      }
    } catch (error) {
      console.error(`Error fetching articles offset ${offset}:`, error);
      break;
    }
  }

  console.log(`[Sitemap] Total articles fetched: ${allArticles.length}`);
  return allArticles;
}

/**
 * 🔧 强制动态生成sitemap，不要在构建时预渲染
 * 这样可以确保每次请求时都从数据库获取最新文章列表
 */
export const dynamic = 'force-dynamic';

/**
 * sitemap 重新验证时间（秒）
 * 设置为1小时，确保 sitemap 保持更新
 */
export const revalidate = 3600;

