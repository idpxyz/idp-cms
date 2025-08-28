import { NextRequest, NextResponse } from 'next/server';
import { generateCanonicalUrl } from '@/lib/seo';

// 生成 sitemap.xml
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const site = searchParams.get('site') || 'portal';

  try {
    // 获取站点信息
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aivoya.com';
    const siteUrl =
      site === 'portal'
        ? baseUrl
        : `https://${site}.${baseUrl.replace('https://', '')}`;

    // 生成 sitemap 内容
    const sitemap = await generateSitemap(site, siteUrl);

    // 返回 XML 响应，设置正确的编码
    return new NextResponse(sitemap, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800',
      },
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return new NextResponse('Error generating sitemap', { status: 500 });
  }
}

// 生成 sitemap XML 内容
async function generateSitemap(site: string, siteUrl: string): Promise<string> {
  const now = new Date().toISOString();

  try {
    // 获取实际的页面数据
    const apiBaseUrl = process.env.DJANGO_API_URL || 'http://authoring:8000';

    // 基础页面
    const basePages = [
      { path: '/', priority: '1.0', changefreq: 'daily' },
      { path: '/news', priority: '0.9', changefreq: 'hourly' },
      { path: '/tools', priority: '0.9', changefreq: 'daily' },
      { path: '/search', priority: '0.8', changefreq: 'weekly' },
      { path: '/tutorials', priority: '0.8', changefreq: 'weekly' },
      { path: '/seo-demo', priority: '0.6', changefreq: 'monthly' },
      { path: '/cache-demo', priority: '0.6', changefreq: 'monthly' },
    ];

    // 根据站点类型添加特定页面
    if (site === 'portal') {
      basePages.push(
        { path: '/feed', priority: '0.9', changefreq: 'hourly' },
        { path: '/api-test', priority: '0.7', changefreq: 'weekly' },
        { path: '/test-cache', priority: '0.5', changefreq: 'monthly' }
      );
    } else {
      // 本地站点特定页面
      basePages.push(
        { path: '/local-news', priority: '0.9', changefreq: 'hourly' },
        { path: '/local-tools', priority: '0.8', changefreq: 'daily' }
      );
    }

    // 获取动态文章页面
    let dynamicPages: Array<{
      path: string;
      priority: string;
      changefreq: string;
      lastmod?: string;
    }> = [];

    try {
      const articlesResponse = await fetch(
        `${apiBaseUrl}/api/articles?site=${site}&fields=slug,updated_at&size=100&order=-updated_at`
      );
      if (articlesResponse.ok) {
        const articlesData = await articlesResponse.json();
        const articles = articlesData.results || [];

        dynamicPages = articles.map((article: any) => ({
          path: `/news/${article.slug}`,
          priority: '0.8',
          changefreq: 'weekly',
          lastmod: article.updated_at || article.publish_at,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch articles for sitemap:', error);
    }

    // 获取动态工具页面
    try {
      const toolsResponse = await fetch(
        `${apiBaseUrl}/api/tools?site=${site}&fields=slug,updated_at&size=50&order=-updated_at`
      );
      if (toolsResponse.ok) {
        const toolsData = await toolsResponse.json();
        const tools = toolsData.results || [];

        const toolPages = tools.map((tool: any) => ({
          path: `/tools/${tool.slug}`,
          priority: '0.7',
          changefreq: 'monthly',
          lastmod: tool.updated_at,
        }));

        dynamicPages = [...dynamicPages, ...toolPages];
      }
    } catch (error) {
      console.error('Failed to fetch tools for sitemap:', error);
    }

    // 合并所有页面
    const allPages = [...basePages, ...dynamicPages];

    // 生成 XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    allPages.forEach((page) => {
      xml += '  <url>\n';
      xml += `    <loc>${siteUrl}${page.path}</loc>\n`;
      xml += `    <lastmod>${(page as any).lastmod || now}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += '  </url>\n';
    });

    xml += '</urlset>';

    return xml;
  } catch (error) {
    console.error('Error generating dynamic sitemap:', error);

    // 降级到基础sitemap
    const fallbackPages = [
      { path: '/', priority: '1.0', changefreq: 'daily' },
      { path: '/news', priority: '0.9', changefreq: 'hourly' },
      { path: '/tools', priority: '0.9', changefreq: 'daily' },
    ];

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    fallbackPages.forEach((page) => {
      xml += '  <url>\n';
      xml += `    <loc>${siteUrl}${page.path}</loc>\n`;
      xml += `    <lastmod>${now}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += '  </url>\n';
    });

    xml += '</urlset>';

    return xml;
  }
}

// 设置路由配置
export const dynamic = 'force-dynamic';
export const revalidate = 3600; // 1小时重新验证
