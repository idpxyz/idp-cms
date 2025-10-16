import React from "react";
import { notFound } from "next/navigation";
import dynamicImport from "next/dynamic";
import type { Metadata } from "next";
import ArticleStaticLayout from "./components/ArticleStaticLayout";
import SidebarRelatedArticles from "./components/SidebarRelatedArticles";

// 强制动态渲染，禁用静态生成
export const dynamic = 'force-dynamic';

// 🚀 临时重命名当前版本为备份
// 如需回滚，可以将此文件重命名回来

// 🚀 性能优化：懒加载客户端组件
// Next.js 15: 移除 ssr: false，因为组件本身已经是客户端组件
const ArticleInteractions = dynamicImport(() => import("./components/ArticleInteractions"), {
  loading: () => <div className="px-6 md:px-12 py-2 bg-white h-20 animate-pulse" />,
});

const ReadingTracker = dynamicImport(() => import("./components/ReadingTracker"));

const CommentSectionWrapper = dynamicImport(() => import("./components/CommentSectionWrapper"), {
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <div className="text-gray-500">加载评论中...</div>
    </div>
  ),
});

const ImageLoadHandler = dynamicImport(() => import("./components/ImageLoadHandler"));

const RecommendedArticles = dynamicImport(() => import("../../components/RecommendedArticles"), {
  loading: () => (
    <div className="animate-pulse px-6 md:px-12 py-6">
      <div className="h-8 bg-gray-200 rounded mb-4 w-48"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-gray-200 rounded"></div>
        ))}
      </div>
    </div>
  ),
});

// 🚀 性能优化：ISR 缓存
export const revalidate = 300; // 5分钟重新验证缓存

interface Article {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  image_url: string | null;
  cover: any;
  channel: {
    id: number;
    name: string;
    slug: string;
  };
  region: string;
  publish_at: string;
  updated_at: string;
  is_featured: boolean;
  source: string;
  author: string;
  tags: string[];
  canonical_url?: string;
  external_article_url?: string;
  seo?: {
    keywords: string;
    og_image_url: string | null;
    structured_data: any;
  };
}

// 🚀 优化：直接使用内部 API，添加超时控制
async function getArticle(slug: string, site?: string): Promise<Article | null> {
  try {
    const decodedSlug = decodeURIComponent(slug);
    // 🚀 关键修复：服务端使用内部地址，避免网络回环
    const baseUrl = typeof window === 'undefined' 
      ? "http://localhost:3000"  // 服务端：使用容器内部地址
      : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"); // 客户端：使用公共地址

    const url = new URL(`${baseUrl}/api/articles/${decodedSlug}`);
    if (site) {
      url.searchParams.set("site", site);
    }

    // 🚀 性能优化：添加5秒超时控制 (给慢速文章足够时间)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url.toString(), {
        next: { revalidate: 300 },
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to fetch article: ${response.status}`);
      }

      const data = await response.json();
      return data.data || data.article || data;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error(`Article fetch timeout (5s) for slug: ${slug}`);
        throw new Error('TIMEOUT');
      }
      throw fetchError;
    }
  } catch (error: any) {
    if (error.message?.includes("404")) {
      return null;
    }
    if (error.message === 'TIMEOUT') {
      console.error("Article fetch timeout:", slug);
      // 可以返回null或重新抛出错误让error.tsx处理
      throw error;
    }
    console.error("Error fetching article:", error);
    return null;
  }
}

// 🚀 智能相关文章推荐：基于标签相似度、热度和时间衰减
async function getRelatedArticles(
  channelSlug: string, 
  currentSlug: string,
  currentTags: string[] = []
): Promise<any[]> {
  try {
    // 🚀 关键修复：服务端使用内部地址，避免网络回环
    const baseUrl = typeof window === 'undefined' 
      ? "http://localhost:3000"  // 服务端：使用容器内部地址
      : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"); // 客户端：使用公共地址

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 🚀 优化：减少到2秒

    try {
      // 获取更多文章用于智能筛选
      const response = await fetch(
        `${baseUrl}/api/news?channel=${encodeURIComponent(channelSlug)}&limit=15`,
        {
          next: { revalidate: 300 },
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const items = (data?.data || data?.items || [])
        .filter((it: any) => it && it.slug && it.slug !== currentSlug);

      // 🎯 智能排序算法
      const scoredArticles = items.map((article: any) => {
        let score = 0;

        // 1. 标签相似度得分 (0-40分)
        if (currentTags.length > 0 && article.tags && article.tags.length > 0) {
          const commonTags = currentTags.filter(tag => article.tags.includes(tag));
          score += (commonTags.length / Math.max(currentTags.length, article.tags.length)) * 40;
        }

        // 2. 时间衰减得分 (0-30分) - 越新越好，但不过分偏向
        const publishDate = new Date(article.publish_at);
        const now = new Date();
        const daysOld = (now.getTime() - publishDate.getTime()) / (1000 * 60 * 60 * 24);
        const timeScore = Math.max(0, 30 - (daysOld * 2)); // 15天后时间得分为0
        score += timeScore;

        // 3. 热度得分 (0-30分) - 基于view_count
        if (article.view_count) {
          const viewScore = Math.min(30, Math.log10(article.view_count + 1) * 10);
          score += viewScore;
        }

        return {
          ...article,
          _score: score
        };
      });

      // 按得分排序，返回前4篇
      const topArticles = scoredArticles
        .sort((a: any, b: any) => b._score - a._score)
        .slice(0, 4)
        .map((it: any) => ({
          id: it.id,
          title: it.title,
          slug: it.slug,
          publish_at: it.publish_at,
          image_url: it.image_url || (it.cover && it.cover.url) || null,
          channel: it.channel || { slug: channelSlug, name: it.channel?.name },
          source: it.source || it.channel?.name || "",
          tags: it.tags || [],
        }));

      return topArticles;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (e: any) {
    if (e.name === "AbortError") {
      console.warn("Related articles fetch timeout (2s)");
    } else {
      console.warn("Failed to fetch related articles:", e);
    }
    return [];
  }
}

export default async function ArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ site?: string }>;
}) {
  const { slug } = await params;
  const sp = searchParams ? await searchParams : undefined;
  const site = sp?.site;

  // 🚀 性能优化：先获取文章，然后并行获取相关文章
  const article = await getArticle(slug, site);

  if (!article) {
    notFound();
  }

  // 🎯 快速渲染策略：先返回空数组，让页面立即渲染
  // 相关文章将在客户端或后台加载
  // 这样可以保证页面快速显示，即使相关文章API慢也不影响
  let relatedArticles: any[] = [];
  
  try {
    // 设置1秒超时，超时则使用空数组
    const timeoutPromise = new Promise<any[]>((resolve) => setTimeout(resolve, 1000, []));
    const articlesPromise = getRelatedArticles(
      article.channel.slug, 
      article.slug,
      article.tags || []
    );
    
    relatedArticles = await Promise.race([articlesPromise, timeoutPromise]);
  } catch (error) {
    console.error('Failed to fetch related articles:', error);
    // 继续使用空数组，不影响页面渲染
  }

  // 生成结构化数据（JSON-LD）
  const structuredData = article.seo?.structured_data || {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": article.title,
    "description": article.excerpt || article.title,
    "image": article.seo?.og_image_url || article.image_url || article.cover?.url,
    "datePublished": article.publish_at,
    "dateModified": article.updated_at,
    "author": {
      "@type": "Person",
      "name": article.author || "编辑部"
    },
    "publisher": {
      "@type": "Organization",
      "name": "IDP-CMS",
      "logo": {
        "@type": "ImageObject",
        "url": `${process.env.NEXT_PUBLIC_SITE_URL}/logo.png`
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": article.canonical_url || `${process.env.NEXT_PUBLIC_SITE_URL}/portal/article/${slug}`
    }
  };

  return (
    <>
      {/* 结构化数据 - SEO优化 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* 阅读追踪组件 - 客户端，最先加载 */}
      <ReadingTracker
        articleId={article.id}
        articleTitle={article.title}
        articleSlug={article.slug}
        channelSlug={article.channel.slug}
      />

      {/* 🚀 文章静态布局 - 服务端渲染，立即可见可读 */}
      <ArticleStaticLayout article={article} hasSidebar={true}>
        {/* 交互按钮插槽 - 客户端组件，延迟水合 */}
        <div slot="interactions">
          <ArticleInteractions
            articleId={article.id}
            articleTitle={article.title}
            articleSlug={article.slug}
            channelSlug={article.channel.slug}
          />
        </div>

        {/* 主内容区插槽 - 评论等客户端组件 */}
        <div slot="content">
          {/* 图片加载处理器 - 移除占位符动画 */}
          <ImageLoadHandler />
          
          {/* 评论区 - 客户端组件，懒加载 */}
          <div className="px-6 md:px-12 py-6 bg-white" data-comment-section>
            <CommentSectionWrapper articleId={article.id.toString()} />
          </div>
        </div>
        
        {/* 侧边栏插槽 - 混合渲染 */}
        <div slot="sidebar">
          {/* 同频道相关文章 - 服务端数据，立即可见 */}
          <SidebarRelatedArticles 
            articles={relatedArticles}
            currentChannelSlug={article.channel.slug}
          />
          
          {/* 跨频道推荐文章 - 客户端组件，延迟加载 */}
          <div className="mt-6">
            <RecommendedArticles
              articleSlug={article.slug}
              currentChannel={article.channel.slug}
              layout="sidebar"
            />
          </div>
        </div>
      </ArticleStaticLayout>
    </>
  );
}

// 🚀 性能优化：生成元数据
// Next.js 15会自动去重相同的fetch请求，所以这里的getArticle调用
// 会复用ArticlePage中的请求结果，不会导致重复请求
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  try {
    // Next.js 会自动去重这个请求（与 ArticlePage 中的请求合并）
    const article = await getArticle(slug);

    if (!article) {
      return {
        title: "文章不存在",
      };
    }

    // 获取 SEO 数据
    const seoKeywords = article.seo?.keywords || article.tags?.join(', ') || '';
    const ogImage = article.seo?.og_image_url || article.image_url || article.cover?.url;
    const canonicalUrl = article.canonical_url || `${process.env.NEXT_PUBLIC_SITE_URL}/portal/article/${slug}`;

    return {
      title: article.title,
      description: article.excerpt || article.title,
      keywords: seoKeywords,
      authors: article.author ? [{ name: article.author }] : undefined,
      alternates: {
        canonical: canonicalUrl,
      },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      },
      openGraph: {
        title: article.title,
        description: article.excerpt || article.title,
        url: canonicalUrl,
        siteName: 'IDP-CMS',
        images: ogImage ? [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: article.title,
          }
        ] : [],
        type: "article",
        publishedTime: article.publish_at,
        modifiedTime: article.updated_at,
        authors: [article.author || '编辑部'],
        section: article.channel?.name,
        tags: article.tags || [],
      },
      twitter: {
        card: "summary_large_image",
        title: article.title,
        description: article.excerpt || article.title,
        images: ogImage ? [ogImage] : [],
        creator: article.author ? `@${article.author}` : undefined,
      },
    };
  } catch (error) {
    return {
      title: "文章加载失败",
    };
  }
}

