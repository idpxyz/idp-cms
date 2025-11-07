import { endpoints } from '@/lib/config/endpoints'
import { env } from '@/lib/config/env'

/**
 * 最新文章sitemap - 最近5000篇文章
 * 每小时更新一次
 */
export async function GET() {
  let baseUrl = env.get('NEXT_PUBLIC_SITE_URL');
  const apiUrl = env.getCmsOrigin();

  // 修复默认占位符
  if (baseUrl === 'https://yourdomain.com' || baseUrl.includes('yourdomain')) {
    baseUrl = 'http://www.hubeitoday.com.cn';
  }

  console.log('[Sitemap Recent] Generating recent articles sitemap');

  try {
    // 获取最新5000篇文章
    const articles = await fetchRecentArticles(apiUrl, 5000);
    
    console.log(`[Sitemap Recent] Fetched ${articles.length} recent articles`);

    // 生成sitemap条目
    const articleEntries = articles.map((article: any) => ({
      url: `${baseUrl}/portal/article/${article.slug}`,
      lastModified: article.updated_at || article.publish_at,
      changeFrequency: 'daily' as const,
      priority: article.is_featured ? 0.9 : 0.7,
    }));

    // 添加首页
    const staticPages = [
      {
        url: `${baseUrl}/portal`,
        lastModified: new Date(),
        changeFrequency: 'hourly' as const,
        priority: 1.0,
      },
    ];

    const allEntries = [...staticPages, ...articleEntries];
    const xml = generateSitemapXML(allEntries);

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[Sitemap Recent] Error:', error);
    
    // 返回基础sitemap
    const fallback = [
      {
        url: `${baseUrl}/portal`,
        lastModified: new Date(),
        changeFrequency: 'hourly' as const,
        priority: 1.0,
      },
    ];
    
    return new Response(generateSitemapXML(fallback), {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=300',
      },
    });
  }
}

/**
 * 获取最新文章
 */
async function fetchRecentArticles(apiUrl: string, limit: number): Promise<any[]> {
  const allArticles: any[] = [];
  let offset = 0;
  const batchSize = 100;

  while (allArticles.length < limit) {
    try {
      const fetchUrl = `${apiUrl}/api/articles/?offset=${offset}&limit=${batchSize}`;
      console.log(`[Sitemap Recent] Fetching: offset=${offset}`);
      
      const response = await fetch(fetchUrl, {
        cache: 'no-store', // 禁用缓存，确保获取最新数据
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        console.error(`[Sitemap Recent] API error: ${response.status}`);
        break;
      }

      const data = await response.json();
      const items = (data.items || []).filter((item: any) => item.slug);
      
      if (items.length === 0) break;
      
      allArticles.push(...items);
      
      if (items.length < batchSize) break;
      
      offset += batchSize;
    } catch (error) {
      console.error(`[Sitemap Recent] Fetch error:`, error);
      break;
    }
  }

  return allArticles.slice(0, limit);
}

/**
 * 生成sitemap XML
 */
function generateSitemapXML(entries: any[]) {
  const urls = entries
    .map((entry) => {
      const lastmod = entry.lastModified instanceof Date
        ? entry.lastModified.toISOString()
        : entry.lastModified;
      
      return `
  <url>
    <loc>${entry.url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${entry.changeFrequency}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`;
}

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

