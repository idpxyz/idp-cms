import React from "react";
import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import type { Metadata } from "next";
import ArticleLayout from "./components/ArticleLayout";
import SidebarRelatedArticles from "./components/SidebarRelatedArticles";

// 🚀 性能优化：懒加载客户端组件
// Next.js 15: 移除 ssr: false，因为组件本身已经是客户端组件
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

// 🚀 智能相关文章推荐：基于标签相似度、热度和时间衰减
async function getRelatedArticles(
  channelSlug: string, 
  currentSlug: string,
  currentTags: string[] = []
): Promise<any[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

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
      console.warn("Related articles fetch timeout (1.5s)");
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

  // 🎯 智能获取相关文章：基于标签、热度和时间
  const relatedArticles = await getRelatedArticles(
    article.channel.slug, 
    article.slug,
    article.tags || []
  );

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
          {/* 评论区 - 客户端，懒加载 */}
          <div className="px-6 md:px-12 py-6 bg-white" data-comment-section>
            <CommentSectionWrapper articleId={article.id.toString()} />
          </div>
        </div>
        
        {/* 侧边栏插槽 */}
        <div slot="sidebar">
          {/* 同频道相关文章 - 服务端数据传递 */}
          <SidebarRelatedArticles 
            articles={relatedArticles}
            currentChannelSlug={article.channel.slug}
          />
          
          {/* 跨频道推荐文章 - 客户端渲染，自动获取跨频道推荐 */}
          <div className="mt-6">
            <RecommendedArticles
              articleSlug={article.slug}
              currentChannel={article.channel.slug}
              layout="sidebar"
            />
          </div>
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

