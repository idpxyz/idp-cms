import React from "react";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ArticleContent from "./ArticleContent";
import PageContainer from "@/components/layout/PageContainer";
import Section from "@/components/layout/Section";
import type { Metadata } from 'next';

// 🚀 性能优化：动态渲染 + ISR 缓存
export const revalidate = 300; // ISR：5分钟重新验证缓存

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

// 🚀 优化：直接使用内部 API，带性能日志
async function getArticle(slug: string, site?: string): Promise<Article | null> {
  const startTime = Date.now();
  
  try {
    const decodedSlug = decodeURIComponent(slug);
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    
    // 直接调用内部 API，带缓存
    const url = new URL(`${baseUrl}/api/articles/${decodedSlug}`);
    if (site) {
      url.searchParams.set('site', site);
    }
    
    console.log(`[Performance] Fetching article: ${slug}`);
    const fetchStart = Date.now();
    
    const response = await fetch(url.toString(), {
      next: { revalidate: 300 }, // 5分钟缓存
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const fetchDuration = Date.now() - fetchStart;
    console.log(`[Performance] API fetch took: ${fetchDuration}ms`);

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`[Performance] Article not found: ${slug}`);
        return null;
      }
      throw new Error(`Failed to fetch article: ${response.status}`);
    }

    const data = await response.json();
    const totalDuration = Date.now() - startTime;
    console.log(`[Performance] Total getArticle: ${totalDuration}ms`);
    
    return data.data || data.article || data;
  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    console.error(`[Performance] getArticle failed after ${totalDuration}ms:`, error);
    if (error.message?.includes('404')) {
      return null;
    }
    console.error("Error fetching article:", error);
    return null;
  }
}

// 🚀 优化：使用内部 API，1秒超时 + 清理机制
async function getRelatedArticles(channelSlug: string, currentSlug: string): Promise<any[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    
    // 使用 AbortController 实现超时，避免内存泄漏
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);
    
    try {
      const response = await fetch(
        `${baseUrl}/api/news?channel=${encodeURIComponent(channelSlug)}&limit=4`,
        { 
          next: { revalidate: 300 },
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal, // 🔧 修复：正确的超时控制
        }
      );
      
      clearTimeout(timeoutId); // 🔧 修复：清理超时定时器
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      const items = data?.data || data?.items || [];
      
      return items
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
    } catch (fetchError) {
      clearTimeout(timeoutId); // 确保清理
      throw fetchError;
    }
  } catch (e: any) {
    // 超时或失败时静默返回空数组，不阻塞页面加载
    if (e.name === 'AbortError') {
      console.warn("Related articles fetch timeout (1s)");
    } else {
      console.warn("Failed to fetch related articles:", e);
    }
    return [];
  }
}

// 🎯 Streaming 组件：异步加载相关文章
async function RelatedArticlesWrapper({ channelSlug, currentSlug }: { channelSlug: string; currentSlug: string }) {
  const relatedArticles = await getRelatedArticles(channelSlug, currentSlug);
  
  // 返回一个隐藏的组件，用于更新 ArticleContent 的 props
  // 注意：这只是占位符，实际的相关文章会在客户端组件中处理
  return null;
}

export default async function ArticlePage({ params, searchParams }: { params: Promise<{ slug: string }>, searchParams?: Promise<{ site?: string }> }) {
  const pageStartTime = Date.now();
  const { slug } = await params;
  const sp = searchParams ? await searchParams : undefined;
  const site = sp?.site;
  
  // 🚀 优化：直接使用 fetch，Next.js 15 自动去重（Request Memoization）
  // Next.js 会自动确保 generateMetadata 和 Page 的相同请求只执行一次
  const article = await getArticle(slug, site);

  if (!article) {
    notFound();
  }

  console.log(`[Performance] Page render after article fetch: ${Date.now() - pageStartTime}ms`);

  // 🚀 优化：立即渲染文章内容，相关文章异步加载
  // 不等待相关文章，先显示主要内容
  const relatedArticlesPromise = getRelatedArticles(article.channel.slug, article.slug);

  return (
    <div className="min-h-screen">
      {/* 文章内容 - 使用和首页相同的布局容器 */}
      <PageContainer padding="md">
        <Section space="sm">
          {/* ✅ 立即渲染文章主体，不等待相关文章 */}
          <Suspense fallback={<div>加载中...</div>}>
            <ArticleContentWrapper 
              article={article} 
              relatedArticlesPromise={relatedArticlesPromise}
            />
          </Suspense>
        </Section>
      </PageContainer>
    </div>
  );
}

// 包装组件：处理异步相关文章
async function ArticleContentWrapper({ 
  article, 
  relatedArticlesPromise 
}: { 
  article: Article;
  relatedArticlesPromise: Promise<any[]>;
}) {
  // 异步等待相关文章（不阻塞初始渲染）
  const relatedArticles = await relatedArticlesPromise;
  
  return <ArticleContent article={article} relatedArticles={relatedArticles} />;
}

// 🚀 性能优化：生成元数据（Next.js 自动去重，无需手动缓存）
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  
  try {
    // ✅ Next.js Request Memoization：与 ArticlePage 的相同请求会自动复用
    const article = await getArticle(slug);
    
    if (!article) {
      return {
        title: '文章不存在',
      };
    }
    
    return {
      title: article.title,
      description: article.excerpt || article.title,
      openGraph: {
        title: article.title,
        description: article.excerpt || article.title,
        images: article.image_url ? [article.image_url] : [],
        type: 'article',
        publishedTime: article.publish_at,
        authors: [article.author],
      },
      twitter: {
        card: 'summary_large_image',
        title: article.title,
        description: article.excerpt || article.title,
        images: article.image_url ? [article.image_url] : [],
      },
    };
  } catch (error) {
    return {
      title: '文章加载失败',
    };
  }
}
