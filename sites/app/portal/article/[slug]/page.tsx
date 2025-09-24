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
    // 直接调用API处理器，避免自引用网络请求
    const mockRequest = new NextRequest(`https://example.com/api/articles/${decodedSlug}${site ? `?site=${encodeURIComponent(site)}` : ''}`);
    const response = await GET(mockRequest, { params: Promise.resolve({ slug: decodedSlug }) });

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

export default async function ArticlePage({ params, searchParams }: { params: Promise<{ slug: string }>, searchParams?: Promise<{ site?: string }> }) {
  const { slug } = await params;
  const sp = searchParams ? await searchParams : undefined;
  const site = sp?.site;
  
  // 只获取文章数据，频道数据通过 Context 提供
  const article = await getArticle(slug, site);

  if (!article) {
    notFound();
  }

  // 拉取相关文章（同频道，排除当前）
  let relatedArticles: any[] = [];
  try {
    // 使用相对路径避免外部访问问题
    const resp = await fetch(
      `/api/news?channel=${encodeURIComponent(article.channel.slug)}&limit=4`,  // 🎯 统一：使用channel参数
      { next: { revalidate: 300 } }
    );
    if (resp.ok) {
      const data = await resp.json();
      const arr = (data && (data.data || data.items)) || [];
      relatedArticles = arr
        .filter((it: any) => (it && it.slug) && it.slug !== article.slug)
        .slice(0, 3)
        .map((it: any) => ({
          id: it.id,
          title: it.title,
          slug: it.slug,
          publish_at: it.publish_at,
          image_url: it.image_url || (it.cover && it.cover.url) || null,
          channel: it.channel || { slug: article.channel.slug, name: article.channel.name },
          source: it.source || (it.channel && it.channel.name) || article.channel.name,
        }));
    }
  } catch (e) {
    // 忽略相关文章错误，保持页面可用
  }

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
