import React from "react";
import { notFound } from "next/navigation";
import { NextRequest } from "next/server";
import ArticleContent from "./ArticleContent";
import PageContainer from "@/components/layout/PageContainer";
import Section from "@/components/layout/Section";

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

// 频道数据现在通过 ChannelContext 提供，不需要重复获取

// 获取文章详情
async function getArticle(slug: string, site?: string): Promise<Article | null> {
  try {
    const decodedSlug = decodeURIComponent(slug);
    const { GET } = await import("@/app/api/articles/[slug]/route");
    const url = site
      ? `http://localhost:3001/api/articles/${decodedSlug}?site=${encodeURIComponent(site)}`
      : `http://localhost:3001/api/articles/${decodedSlug}`;
    const response = await GET(new NextRequest(url), { params: Promise.resolve({ slug: decodedSlug }) });

    if (!response.ok) {
      if (response.status === 404) return null;
      if (response.status === 429) {
        console.warn("Article API rate limited, showing 404");
        return null;
      }
      throw new Error(`Failed to fetch article: ${response.status}`);
    }

    const data = await response.json();
    return data.data || data.article || data;
  } catch (error) {
    console.error("Error fetching article:", error);
    return null;
  }
}

// 获取相关文章
async function getRelatedArticles(channelSlug: string, currentSlug: string): Promise<any[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const resp = await fetch(
      `${baseUrl}/api/news?channel=${encodeURIComponent(channelSlug)}&limit=4`,
      { 
        next: { revalidate: 300 },
        // 添加超时控制
        signal: AbortSignal.timeout(3000) // 3秒超时
      }
    );
    if (resp.ok) {
      const data = await resp.json();
      const arr = (data && (data.data || data.items)) || [];
      return arr
        .filter((it: any) => (it && it.slug) && it.slug !== currentSlug)
        .slice(0, 3)
        .map((it: any) => ({
          id: it.id,
          title: it.title,
          slug: it.slug,
          publish_at: it.publish_at,
          image_url: it.image_url || (it.cover && it.cover.url) || null,
          channel: it.channel || { slug: channelSlug, name: it.channel?.name },
          source: it.source || it.channel?.name || '',
        }));
    }
  } catch (e) {
    console.warn("Failed to fetch related articles:", e);
  }
  return [];
}

export default async function ArticlePage({ params, searchParams }: { params: Promise<{ slug: string }>, searchParams?: Promise<{ site?: string }> }) {
  const { slug } = await params;
  const sp = searchParams ? await searchParams : undefined;
  const site = sp?.site;
  
  // 🚀 并行获取文章和相关文章（假设channel信息）
  const article = await getArticle(slug, site);

  if (!article) {
    notFound();
  }

  // 🚀 并行获取相关文章
  const relatedArticles = await getRelatedArticles(article.channel.slug, article.slug)

  return (
    <div className="min-h-screen">
      {/* 文章内容 - 使用和首页相同的布局容器 */}
      <PageContainer padding="md">
        <Section space="sm">
          <ArticleContent article={article} relatedArticles={relatedArticles} />
        </Section>
      </PageContainer>
    </div>
  );
}
