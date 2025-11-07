import { MetadataRoute } from 'next';
import { env } from '@/lib/config/env';

export const dynamic = 'force-dynamic';
export const revalidate = 86400; // 每天更新一次

type Params = {
  page: string;
};

/**
 * 归档文章sitemap - 按页分片
 * page=1: 文章 5000-55000 (50,000篇)
 * page=2: 文章 55000-105000 (50,000篇)  
 * page=3: 文章 105000+ (剩余)
 */
export default async function sitemap({ params }: { params: Params }): Promise<MetadataRoute.Sitemap> {
  const { page } = params;
  const pageNum = parseInt(page);
  
  const baseUrl = env.get('NEXT_PUBLIC_SITE_URL').replace(/\/$/, '');
  const apiUrl = env.getCmsOrigin();
  const site = env.get('SITE_HOSTNAME');
  
  console.log(`[Sitemap Archive-${page}] Generating archive sitemap`);

  try {
    // 计算offset和limit
    const recentCount = 5000; // recent sitemap已包含前5000篇
    const pageSize = 50000; // 每页50000篇
    const startOffset = recentCount + (pageNum - 1) * pageSize;
    
    // 获取归档文章
    const articles = await fetchArchiveArticles(apiUrl, site, startOffset, pageSize);
    
    console.log(`[Sitemap Archive-${page}] Fetched ${articles.length} articles`);

    const articleEntries: MetadataRoute.Sitemap = articles.map((article: any) => ({
      url: `${baseUrl}/portal/article/${article.slug}`,
      lastModified: article.updated_at || article.publish_at,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    }));

    return articleEntries;
  } catch (error) {
    console.error(`[Sitemap Archive-${page}] Error:`, error);
    return [];
  }
}

/**
 * 获取归档文章
 */
async function fetchArchiveArticles(
  apiUrl: string,
  site: string,
  startOffset: number,
  maxCount: number
): Promise<any[]> {
  const allArticles: any[] = [];
  let offset = startOffset;
  const batchSize = 100;

  while (allArticles.length < maxCount) {
    try {
      const fetchUrl = `${apiUrl}/api/articles/?offset=${offset}&limit=${batchSize}`;
      console.log(`[Sitemap Archive] Fetching: offset=${offset}`);
      
      const response = await fetch(fetchUrl, {
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        console.error(`[Sitemap Archive] API error: ${response.status}`);
        break;
      }

      const data = await response.json();
      const items = (data.items || []).filter((item: any) => item.slug);
      
      if (items.length === 0) break;
      
      allArticles.push(...items);
      
      // 如果返回数量少于请求数量，说明没有更多了
      if (items.length < batchSize) break;
      
      offset += batchSize;
    } catch (error) {
      console.error(`[Sitemap Archive] Fetch error:`, error);
      break;
    }
  }

  return allArticles.slice(0, maxCount);
}

/**
 * 生成静态参数 - 3页归档sitemap
 */
export async function generateStaticParams(): Promise<Params[]> {
  // page=1: 5000-55000 (50k)
  // page=2: 55000-105000 (50k)  
  // page=3: 105000-128069 (23k)
  return [
    { page: '1' },
    { page: '2' },
    { page: '3' },
  ];
}

