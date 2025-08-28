import { NextRequest, NextResponse } from 'next/server';

// 生成 robots.txt
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const site = searchParams.get('site') || 'portal';

  try {
    // 生成 robots.txt 内容
    const robotsTxt = generateRobotsTxt(site);

    // 返回文本响应，设置正确的编码
    return new NextResponse(robotsTxt, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800',
      },
    });
  } catch (error) {
    console.error('Error generating robots.txt:', error);
    return new NextResponse('Error generating robots.txt', { status: 500 });
  }
}

// 生成 robots.txt 内容
function generateRobotsTxt(site: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aivoya.com';
  const siteUrl =
    site === 'portal'
      ? baseUrl
      : `https://${site}.${baseUrl.replace('https://', '')}`;

  let robotsTxt = `# Robots.txt for ${site} site\n`;
  robotsTxt += `# Generated on ${new Date().toISOString()}\n`;
  robotsTxt += `# AI旅行 CMS 自动生成\n\n`;

  // 允许所有搜索引擎爬虫
  robotsTxt += 'User-agent: *\n';
  robotsTxt += 'Allow: /\n\n';

  // 禁止爬取管理页面和API
  robotsTxt += '# Disallow admin and API pages\n';
  robotsTxt += 'Disallow: /admin/\n';
  robotsTxt += 'Disallow: /api/\n';
  robotsTxt += 'Disallow: /_next/\n';
  robotsTxt += 'Disallow: /debug/\n';
  robotsTxt += 'Disallow: /test-*\n\n';

  // 站点特定的禁止规则
  if (site === 'portal') {
    robotsTxt += '# Portal site specific rules\n';
    robotsTxt += 'Disallow: /cache-demo\n';
    robotsTxt += 'Disallow: /seo-demo\n';
    robotsTxt += 'Disallow: /test-cache\n\n';
  } else {
    robotsTxt += '# Local site specific rules\n';
    robotsTxt += 'Disallow: /local-admin/\n';
    robotsTxt += 'Disallow: /internal/\n\n';
  }

  // 允许爬取重要页面
  robotsTxt += '# Allow important pages\n';
  robotsTxt += 'Allow: /news/\n';
  robotsTxt += 'Allow: /tools/\n';
  robotsTxt += 'Allow: /search\n';
  robotsTxt += 'Allow: /tutorials/\n';
  robotsTxt += 'Allow: /feed\n\n';

  // Sitemap 链接
  robotsTxt += `Sitemap: ${siteUrl}/sitemap.xml?site=${site}\n`;

  // 爬取延迟（可选）
  robotsTxt += 'Crawl-delay: 1\n';

  return robotsTxt;
}

// 设置路由配置
export const dynamic = 'force-dynamic';
export const revalidate = 3600; // 1小时重新验证
