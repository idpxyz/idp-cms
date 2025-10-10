import React, { Suspense } from "react";
import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import type { Metadata } from "next";
import ArticleStaticLayout from "./components/ArticleStaticLayout";
import SidebarRelatedArticles from "./components/SidebarRelatedArticles";

// 🚀 性能优化：懒加载客户端组件
const ArticleInteractions = dynamic(() => import("./components/ArticleInteractions"), {
  loading: () => <div className="px-6 md:px-12 py-2 bg-white h-20 animate-pulse" />,
});

const ReadingTracker = dynamic(() => import("./components/ReadingTracker"));

const CommentSectionWrapper = dynamic(() => import("./components/CommentSectionWrapper"), {
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <div className="text-gray-500">加载评论中...</div>
    </div>
  ),
});

const RecommendedArticles = dynamic(() => import("../../components/RecommendedArticles"), {
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

// 🚀 优化：快速失败策略，减少超时时间
async function getArticle(slug: string, site?: string): Promise<Article | null> {
  try {
    const decodedSlug = decodeURIComponent(slug);
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const url = new URL(`${baseUrl}/api/articles/${decodedSlug}`);
    if (site) {
      url.searchParams.set("site", site);
    }

    // 🚀 关键优化：设置AbortController，1.5秒超时快速失败
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

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
    } catch (error: any) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('Article fetch timeout (1.5s)');
      throw new Error('TIMEOUT');
    }
    if (error.message?.includes("404")) {
      return null;
    }
    console.error("Error fetching article:", error);
    throw error;
  }
}

// 🚀 智能相关文章推荐：基于标签相似度、热度和时间衰减
async function getRelatedArticles(
  channelSlug: string, 
  currentSlug: string,
  currentTags: string[] = []
): Promise<any[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2秒超时

    try {
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

      // 智能排序算法
      const scoredArticles = items.map((article: any) => {
        let score = 0;

        // 1. 标签相似度得分 (0-40分)
        if (currentTags.length > 0 && article.tags && article.tags.length > 0) {
          const commonTags = currentTags.filter(tag => article.tags.includes(tag));
          score += (commonTags.length / Math.max(currentTags.length, article.tags.length)) * 40;
        }

        // 2. 时间衰减得分 (0-30分)
        const publishDate = new Date(article.publish_at);
        const now = new Date();
        const daysOld = (now.getTime() - publishDate.getTime()) / (1000 * 60 * 60 * 24);
        const timeScore = Math.max(0, 30 - (daysOld * 2));
        score += timeScore;

        // 3. 热度得分 (0-30分)
        if (article.view_count) {
          const viewScore = Math.min(30, Math.log10(article.view_count + 1) * 10);
          score += viewScore;
        }

        return {
          ...article,
          _score: score
        };
      });

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

// 🚀 新增：文章内容组件 - 可以被Suspense包裹
async function ArticleContent({ 
  slug, 
  site 
}: { 
  slug: string; 
  site?: string; 
}) {
  const article = await getArticle(slug, site);

  if (!article) {
    notFound();
  }

  // 快速获取相关文章（不阻塞主内容渲染）
  const relatedArticles = await getRelatedArticles(
    article.channel.slug, 
    article.slug,
    article.tags || []
  ).catch(() => []);

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

      {/* 阅读追踪组件 */}
      <ReadingTracker
        articleId={article.id}
        articleTitle={article.title}
        articleSlug={article.slug}
        channelSlug={article.channel.slug}
      />

      {/* 🚀 文章静态布局 - 服务端渲染，立即可见可读 */}
      <ArticleStaticLayout article={article} hasSidebar={true}>
        {/* 交互按钮插槽 */}
        <div slot="interactions">
          <ArticleInteractions
            articleId={article.id}
            articleTitle={article.title}
            articleSlug={article.slug}
            channelSlug={article.channel.slug}
          />
        </div>

        {/* 主内容区插槽 */}
        <div slot="content">
          {/* 评论区 */}
          <div className="px-6 md:px-12 py-6 bg-white" data-comment-section>
            <CommentSectionWrapper articleId={article.id.toString()} />
          </div>
        </div>
        
        {/* 侧边栏插槽 */}
        <div slot="sidebar">
          {/* 同频道相关文章 */}
          <SidebarRelatedArticles 
            articles={relatedArticles}
            currentChannelSlug={article.channel.slug}
          />
          
          {/* 跨频道推荐文章 */}
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

// 🚀 加载骨架屏组件
function ArticleLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <nav className="py-2">
          <div className="h-4 w-48 bg-gray-200 animate-pulse rounded"></div>
        </nav>

        <div className="py-2">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <article className="bg-white rounded-lg shadow-sm overflow-hidden">
                <header className="px-6 md:px-12 pt-6 md:pt-8">
                  <div className="space-y-3 mb-6">
                    <div className="h-8 bg-gray-200 animate-pulse rounded w-full"></div>
                    <div className="h-8 bg-gray-200 animate-pulse rounded w-3/4"></div>
                  </div>
                  <div className="flex gap-4 pb-3">
                    <div className="h-4 w-24 bg-gray-200 animate-pulse rounded"></div>
                    <div className="h-4 w-32 bg-gray-200 animate-pulse rounded"></div>
                  </div>
                </header>
                <div className="relative w-full h-64 md:h-96 my-4 bg-gray-200 animate-pulse"></div>
                <div className="px-6 md:px-12 py-6 space-y-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-4 bg-gray-200 animate-pulse rounded w-full"></div>
                  ))}
                </div>
              </article>
            </div>
            <aside className="lg:col-span-1 hidden lg:block">
              <div className="sticky top-40 space-y-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="h-5 bg-gray-200 animate-pulse rounded w-32 mb-3"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 animate-pulse rounded w-full"></div>
                    <div className="h-4 bg-gray-200 animate-pulse rounded w-5/6"></div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

// 🚀 主页面组件 - 使用Suspense实现流式渲染
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

  return (
    <Suspense fallback={<ArticleLoadingSkeleton />}>
      <ArticleContent slug={slug} site={site} />
    </Suspense>
  );
}

// 🚀 性能优化：生成元数据
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  try {
    // 🚀 快速获取元数据（1.5秒超时）
    const article = await getArticle(slug);

    if (!article) {
      return {
        title: "文章不存在",
      };
    }

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
    // 🚀 即使元数据获取失败也不阻塞页面
    console.error('Metadata fetch error:', error);
    return {
      title: "正在加载文章...",
    };
  }
}

