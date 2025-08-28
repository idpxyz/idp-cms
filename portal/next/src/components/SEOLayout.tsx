// 增强的布局组件来支持动态 SEO
'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { generateSiteSEO, generateCanonicalUrl } from '@/lib/seo';
import { useCache } from './CacheProvider';
import { CACHE_TAGS } from '@/lib/cache';

interface SEOLayoutProps {
  children: React.ReactNode;
  site?: string;
  title?: string;
  description?: string;
  keywords?: string;
  noIndex?: boolean;
  noFollow?: boolean;
  ogImage?: string;
  ogType?: 'website' | 'article';
}

export default function SEOLayout({
  children,
  site = 'portal',
  title,
  description,
  keywords,
  noIndex = false,
  noFollow = false,
  ogImage,
  ogType = 'website',
}: SEOLayoutProps) {
  const pathname = usePathname();
  const { addCacheTag } = useCache();

  useEffect(() => {
    // 添加站点级别的缓存标签
    addCacheTag(CACHE_TAGS.SITE(site));

    // 添加页面级别的缓存标签
    addCacheTag(CACHE_TAGS.PAGE(site, pathname));
  }, [site, pathname, addCacheTag]);

  useEffect(() => {
    // 动态更新页面标题
    if (title) {
      document.title = title;
    }

    // 动态更新 meta 标签
    const updateMetaTags = () => {
      const seoConfig = generateSiteSEO(site, pathname);

      // 更新 description
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.setAttribute('name', 'description');
        document.head.appendChild(metaDescription);
      }
      metaDescription.setAttribute(
        'content',
        description || seoConfig.description
      );

      // 更新 keywords
      let metaKeywords = document.querySelector('meta[name="keywords"]');
      if (!metaKeywords) {
        metaKeywords = document.createElement('meta');
        metaKeywords.setAttribute('name', 'keywords');
        document.head.appendChild(metaKeywords);
      }
      metaKeywords.setAttribute('content', keywords || seoConfig.keywords);

      // 更新 robots
      let metaRobots = document.querySelector('meta[name="robots"]');
      if (!metaRobots) {
        metaRobots = document.createElement('meta');
        metaRobots.setAttribute('name', 'robots');
        document.head.appendChild(metaRobots);
      }
      metaRobots.setAttribute(
        'content',
        `${noIndex ? 'noindex' : 'index'},${noFollow ? 'nofollow' : 'follow'}`
      );

      // 更新 Open Graph 标签
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        ogTitle.setAttribute('content', title || seoConfig.title);
      }

      const ogDescription = document.querySelector(
        'meta[property="og:description"]'
      );
      if (ogDescription) {
        ogDescription.setAttribute(
          'content',
          description || seoConfig.description
        );
      }

      const ogTypeMeta = document.querySelector('meta[property="og:type"]');
      if (ogTypeMeta) {
        ogTypeMeta.setAttribute('content', ogType);
      }

      if (ogImage) {
        const ogImageMeta = document.querySelector('meta[property="og:image"]');
        if (ogImageMeta) {
          ogImageMeta.setAttribute('content', ogImage);
        }
      }

      // 更新 canonical 链接
      let canonicalLink = document.querySelector('link[rel="canonical"]');
      if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.setAttribute('href', generateCanonicalUrl(pathname, site));
    };

    updateMetaTags();
  }, [
    site,
    pathname,
    title,
    description,
    keywords,
    noIndex,
    noFollow,
    ogImage,
    ogType,
  ]);

  return <>{children}</>;
}

// 服务端 SEO 组件
export function ServerSEOLayout({
  children,
  site = 'portal',
  title,
  description,
  keywords,
  noIndex = false,
  noFollow = false,
  ogImage,
  ogType = 'website',
}: SEOLayoutProps) {
  const pathname = usePathname();

  // 这个组件在服务端渲染时会被特殊处理
  // 用于生成完整的 meta 标签和 canonical 链接

  return <>{children}</>;
}
