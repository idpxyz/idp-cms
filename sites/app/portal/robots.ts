import { MetadataRoute } from 'next'

/**
 * 动态生成 robots.txt
 * 
 * 这个文件告诉搜索引擎爬虫哪些页面可以访问
 * Next.js 会自动在 /portal/robots.txt 提供这个文件
 */
export default function robots(): MetadataRoute.Robots {
  // 使用简单的环境变量读取，避免动态导入问题
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://192.168.8.195:3001';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/', '/_next/'],
    },
    sitemap: `${baseUrl}/portal/sitemap.xml`,
  };
}

