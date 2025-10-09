import React from "react";
import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import type { Metadata } from "next";
import ArticleLayout from "./components/ArticleLayout";
import SidebarRelatedArticles from "./components/SidebarRelatedArticles";

// 🚀 性能优化：懒加载客户端组件
// Next.js 15: 移除 ssr: false，因为组件本身已经是客户端组件
const ArticleInteractions = dynamic(() => import("./components/ArticleInteractions"), {
  loading: () => <div className="px-6 md:px-12 py-6 border-t border-gray-200 bg-gray-50 h-20 animate-pulse" />,
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
    <div className="animate-pulse px-6 md:px-12 py-8">
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
}

// 🚀 优化：直接使用内部 API
async function getArticle(slug: string, site?: string): Promise<Article | null> {
  try {
    const decodedSlug = decodeURIComponent(slug);
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const url = new URL(`${baseUrl}/api/articles/${decodedSlug}`);
    if (site) {
      url.searchParams.set("site", site);
    }

    const response = await fetch(url.toString(), {
      next: { revalidate: 300 },
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch article: ${response.status}`);
    }

    const data = await response.json();
    return data.data || data.article || data;
  } catch (error: any) {
    if (error.message?.includes("404")) {
      return null;
    }
    console.error("Error fetching article:", error);
    return null;
  }
}

// 🚀 优化：获取相关文章，1秒超时
async function getRelatedArticles(channelSlug: string, currentSlug: string): Promise<any[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);

    try {
      const response = await fetch(
        `${baseUrl}/api/news?channel=${encodeURIComponent(channelSlug)}&limit=4`,
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
      const items = data?.data || data?.items || [];

      return items
        .filter((it: any) => it && it.slug && it.slug !== currentSlug)
        .slice(0, 3)
        .map((it: any) => ({
          id: it.id,
          title: it.title,
          slug: it.slug,
          publish_at: it.publish_at,
          image_url: it.image_url || (it.cover && it.cover.url) || null,
          channel: it.channel || { slug: channelSlug, name: it.channel?.name },
          source: it.source || it.channel?.name || "",
        }));
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (e: any) {
    if (e.name === "AbortError") {
      console.warn("Related articles fetch timeout (1s)");
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

  // 🚀 性能优化：并行获取文章和相关文章数据
  const articlePromise = getArticle(slug, site);
  const article = await articlePromise;

  if (!article) {
    notFound();
  }

  // 获取相关文章（不阻塞主渲染，但在服务端完成）
  const relatedArticles = await getRelatedArticles(article.channel.slug, article.slug);

  return (
    <>
      {/* 阅读追踪组件 - 客户端，最先加载 */}
      <ReadingTracker
        articleId={article.id}
        articleTitle={article.title}
        articleSlug={article.slug}
        channelSlug={article.channel.slug}
      />

      {/* 文章布局 - 服务端渲染 */}
      <ArticleLayout article={article} hasSidebar={true}>
        {/* 交互按钮插槽 - 在文章头部（标题和元信息之后，封面图之前） */}
        <div slot="interactions">
          <ArticleInteractions
            articleId={article.id}
            articleTitle={article.title}
            articleSlug={article.slug}
            channelSlug={article.channel.slug}
          />
        </div>

        {/* 主内容区插槽 - 在文章正文之后 */}
        <div slot="content">
          {/* 相关文章 - 服务端数据，客户端渲染 */}
          <div className="px-6 md:px-12">
            <RecommendedArticles
              articleSlug={article.slug}
              currentChannel={article.channel.slug}
              articles={relatedArticles}
            />
          </div>

          {/* 评论区 - 客户端，懒加载 */}
          <div className="px-6 md:px-12 py-8 border-t border-gray-200 bg-gray-50" data-comment-section>
            <CommentSectionWrapper articleId={article.id.toString()} />
          </div>
        </div>
        
        {/* 侧边栏插槽 */}
        <div slot="sidebar">
          {/* 相关文章 - 服务端数据传递 */}
          <SidebarRelatedArticles 
            articles={relatedArticles}
            currentChannelSlug={article.channel.slug}
          />
        </div>
      </ArticleLayout>
    </>
  );
}

// 🚀 性能优化：生成元数据（Next.js 自动去重）
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  try {
    const article = await getArticle(slug);

    if (!article) {
      return {
        title: "文章不存在",
      };
    }

    return {
      title: article.title,
      description: article.excerpt || article.title,
      openGraph: {
        title: article.title,
        description: article.excerpt || article.title,
        images: article.image_url ? [article.image_url] : [],
        type: "article",
        publishedTime: article.publish_at,
        authors: [article.author],
      },
      twitter: {
        card: "summary_large_image",
        title: article.title,
        description: article.excerpt || article.title,
        images: article.image_url ? [article.image_url] : [],
      },
    };
  } catch (error) {
    return {
      title: "文章加载失败",
    };
  }
}

