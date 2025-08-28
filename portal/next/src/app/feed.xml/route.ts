import { NextRequest, NextResponse } from 'next/server';

// 文章数据类型定义
interface ArticleData {
  title?: string;
  description?: string;
  excerpt?: string;
  slug: string;
  author_name?: string;
  channel?: { name: string };
  region?: { name: string };
  updated_at?: string;
  publish_at?: string;
}

// RSS文章类型定义
interface RSSArticle {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  author: string;
  category: string;
}

// 生成 RSS feed.xml
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const site = searchParams.get('site') || 'portal';

  try {
    // 生成 RSS feed 内容
    const rssFeed = await generateRSSFeed(site);

    // 返回 XML 响应，设置正确的编码
    return new NextResponse(rssFeed, {
      status: 200,
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=900',
      },
    });
  } catch (error) {
    console.error('Error generating RSS feed:', error);
    return new NextResponse('Error generating RSS feed', { status: 500 });
  }
}

// 生成 RSS feed XML 内容
async function generateRSSFeed(site: string): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aivoya.com';
  const siteUrl =
    site === 'portal'
      ? baseUrl
      : `https://${site}.${baseUrl.replace('https://', '')}`;

  // 获取文章数据（这里应该调用实际的API）
  const articles = await getSampleArticles(site);

  // 生成 RSS XML，确保正确的编码声明
  let rss = '<?xml version="1.0" encoding="UTF-8"?>\n';
  rss +=
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">\n';
  rss += '  <channel>\n';

  // 频道信息
  rss += `    <title>${escapeXmlContent(getSiteTitle(site))}</title>\n`;
  rss += `    <description>${escapeXmlContent(getSiteDescription(site))}</description>\n`;
  rss += `    <link>${siteUrl}</link>\n`;
  rss += `    <atom:link href="${siteUrl}/feed.xml?site=${site}" rel="self" type="application/rss+xml" />\n`;
  rss += `    <language>zh-CN</language>\n`;
  rss += `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n`;
  rss += `    <generator>AI旅行 CMS</generator>\n`;
  rss += `    <ttl>60</ttl>\n\n`;

  // 文章条目
  articles.forEach((article) => {
    rss += '    <item>\n';
    rss += `      <title>${escapeXmlContent(article.title)}</title>\n`;
    rss += `      <description>${escapeXmlContent(article.description)}</description>\n`;
    rss += `      <link>${article.url}</link>\n`;
    rss += `      <guid isPermaLink="true">${article.url}</guid>\n`;
    rss += `      <pubDate>${new Date(article.publishedAt).toUTCString()}</pubDate>\n`;
    rss += `      <author>${escapeXmlContent(article.author)}</author>\n`;
    if (article.category) {
      rss += `      <category>${escapeXmlContent(article.category)}</category>\n`;
    }
    // 添加内容模块
    rss += `      <content:encoded><![CDATA[${article.description}]]></content:encoded>\n`;
    rss += '    </item>\n';
  });

  rss += '  </channel>\n';
  rss += '</rss>';

  return rss;
}

// XML内容转义函数
function escapeXmlContent(text: string): string {
  if (!text) return '';

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// 获取实际文章数据
async function getSampleArticles(site: string): Promise<RSSArticle[]> {
  try {
    // 调用实际的Django API
    const apiBaseUrl = process.env.DJANGO_API_URL || 'http://authoring:8000';
    const response = await fetch(
      `${apiBaseUrl}/api/articles?site=${site}&size=20&fields=title,description,slug,author_name,channel,region,updated_at&order=-updated_at`
    );

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    const articles: ArticleData[] = data.results || [];

    // 转换为RSS格式
    return articles.map(
      (article: ArticleData): RSSArticle => ({
        title: article.title || '无标题',
        description: article.description || article.excerpt || '暂无描述',
        url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://aivoya.com'}/news/${article.slug}`,
        publishedAt:
          article.updated_at || article.publish_at || new Date().toISOString(),
        author: article.author_name || 'AI旅行团队',
        category: article.channel?.name || article.region?.name || '未分类',
      })
    );
  } catch (error) {
    console.error('Failed to fetch articles from API:', error);

    // 降级到模拟数据
    return [
      {
        title: 'AI工具推荐：2024年最值得关注的10款AI应用',
        description:
          '本文介绍了2024年最值得关注的AI工具，包括文本生成、图像处理、代码编写等各个领域的优秀应用。',
        url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://aivoya.com'}/news/ai-tools-2024`,
        publishedAt: new Date().toISOString(),
        author: 'AI旅行团队',
        category: 'AI工具',
      },
      {
        title: 'ChatGPT使用技巧：提升工作效率的10个方法',
        description:
          '分享使用ChatGPT提升工作效率的实用技巧，包括提示词优化、工作流程设计等。',
        url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://aivoya.com'}/news/chatgpt-tips`,
        publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        author: 'AI旅行团队',
        category: '使用技巧',
      },
    ];
  }
}

// 获取站点标题
function getSiteTitle(site: string): string {
  if (site === 'portal') {
    return 'AI旅行 - AI工具导航与行业资讯门户';
  }
  return `${getSiteDisplayName(site)} - AI旅行`;
}

// 获取站点描述
function getSiteDescription(site: string): string {
  if (site === 'portal') {
    return '发现最新AI工具，掌握前沿技术动态，开启你的AI探索之旅。';
  }
  return `${getSiteDisplayName(site)}的AI工具和资讯内容。`;
}

// 获取站点显示名称
function getSiteDisplayName(site: string): string {
  const siteNames: Record<string, string> = {
    tech: '科技频道',
    ai: 'AI频道',
    news: '新闻频道',
    tools: '工具频道',
    default: '本地站点',
  };

  return siteNames[site] || siteNames.default;
}

// 设置路由配置
export const dynamic = 'force-dynamic';
export const revalidate = 1800; // 30分钟重新验证
