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
  const baseUrl = env.get('NEXT_PUBLIC_SITE_URL');
  const apiUrl = env.getCmsOrigin(); // 自动选择内部/外部地址
  const site = env.get('SITE_HOSTNAME');

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
  let page = 1;
  const size = 100; // 每页100条
  let hasMore = true;

  console.log(`[Sitemap] Starting to fetch articles for site: ${site}`);

  while (hasMore) {
    try {
      // 构建 API URL，添加 site 参数
      const fetchUrl = `${apiUrl}/api/articles?site=${encodeURIComponent(site)}&page=${page}&size=${size}&order=-publish_at`;
      console.log(`[Sitemap] Fetching: ${fetchUrl}`);
      
      const response = await fetch(fetchUrl, {
        next: { revalidate: 3600 }, // 缓存1小时
        headers: {
          'Content-Type': 'application/json',
        },
        // 添加超时控制
        signal: AbortSignal.timeout(10000), // 10秒超时
      });

      if (!response.ok) {
        console.error(`[Sitemap] Failed to fetch articles page ${page}`);
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
      
      console.log(`[Sitemap] Page ${page}: fetched ${items.length} articles`);

      if (items.length === 0) {
        hasMore = false;
      } else {
        allArticles.push(...items);
        
        // 检查是否还有更多页面
        if (data.pagination) {
          hasMore = data.pagination.has_next;
        } else {
          // 如果没有分页信息，检查返回的项目数
          hasMore = items.length === size;
        }
        
        page++;
      }

      // 安全限制：最多获取10页（1000篇文章）
      if (page > 10) {
        console.warn('Sitemap: Reached maximum page limit (10 pages)');
        break;
      }
    } catch (error) {
      console.error(`Error fetching articles page ${page}:`, error);
      break;
    }
  }

  return allArticles;
}

/**
 * sitemap 重新验证时间（秒）
 * 设置为1小时，确保 sitemap 保持更新
 */
export const revalidate = 3600;

