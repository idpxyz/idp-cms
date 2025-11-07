import { endpoints } from '@/lib/config/endpoints'
import { env } from '@/lib/config/env'

/**
 * Sitemap索引文件 - 指向所有子sitemap
 * 这是搜索引擎的入口点
 */
export async function GET() {
  const baseUrl = env.get('NEXT_PUBLIC_SITE_URL').includes('yourdomain')
    ? 'http://www.hubeitoday.com.cn'
    : env.get('NEXT_PUBLIC_SITE_URL');
  
  const apiUrl = env.getCmsOrigin();
  
  console.log('[Sitemap Index] Generating sitemap index');

  try {
    // 获取文章总数和日期范围
    const response = await fetch(`${apiUrl}/api/articles/?offset=0&limit=1`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const total = data.pagination?.total || 0;
    
    console.log(`[Sitemap Index] Total articles: ${total}`);

    // 生成sitemap列表
    const sitemaps = [];

    // 1. 最新文章sitemap (最近5000篇)
    sitemaps.push({
      loc: `${baseUrl}/portal/sitemap-recent.xml`,
      lastmod: new Date().toISOString(),
    });

    // 2. 归档sitemap - 按offset分页
    // archive-1: 文章 5000-55000 (50,000篇)
    // archive-2: 文章 55000-105000 (50,000篇)
    // archive-3: 文章 105000+ (剩余23,069篇)
    for (let page = 1; page <= 3; page++) {
      sitemaps.push({
        loc: `${baseUrl}/portal/sitemap-archive-${page}.xml`,
        lastmod: new Date().toISOString(),
      });
    }

    // 生成XML
    const xml = generateSitemapIndex(sitemaps);

    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600', // 1小时缓存
      },
    });
  } catch (error) {
    console.error('[Sitemap Index] Error:', error);
    
    // 失败时返回基础索引
    const fallbackSitemaps = [
      {
        loc: `${baseUrl}/portal/sitemap-recent.xml`,
        lastmod: new Date().toISOString(),
      },
    ];
    
    const xml = generateSitemapIndex(fallbackSitemaps);
    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=300',
      },
    });
  }
}

/**
 * 生成sitemap索引XML
 */
function generateSitemapIndex(sitemaps: Array<{ loc: string; lastmod: string }>) {
  const entries = sitemaps
    .map(
      (sitemap) => `
  <sitemap>
    <loc>${sitemap.loc}</loc>
    <lastmod>${sitemap.lastmod}</lastmod>
  </sitemap>`
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}
</sitemapindex>`;
}

// 动态生成
export const dynamic = 'force-dynamic';
export const revalidate = 3600; // 1小时

