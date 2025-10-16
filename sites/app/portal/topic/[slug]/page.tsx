import React from "react";
import { Metadata } from "next";
import TopicPageRenderer from "../../components/TopicPageRenderer";
import { getMainSite } from "@/lib/config/sites";

// 强制动态渲染，禁用静态生成
export const dynamicParams = 'force-dynamic';

// 获取单个专题的数据
async function fetchTopic(slug: string, site?: string) {
  try {
    // 优先使用数据库专题API
    const siteParam = site || getMainSite().hostname;
    const dbRes = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || ""}/api/topics/db/${encodeURIComponent(slug)}?site=${siteParam}`, 
      { 
        cache: 'no-store',
        next: { tags: [`topic-${slug}`] }
      }
    );
    
    if (dbRes.ok) {
      const dbData = await dbRes.json();
      if (dbData.topic) {
        return dbData.topic;
      }
    }

    // 回退到趋势专题API
    const trendRes = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || ""}/api/topics/${encodeURIComponent(slug)}`, 
      { 
        cache: 'no-store',
        next: { tags: [`topic-${slug}`] }
      }
    );
    
    if (trendRes.ok) {
      const trendData = await trendRes.json();
      if (trendData?.title) {
        return trendData;
      }
    }

    return null;
  } catch (error) {
    console.error(`Error fetching topic ${slug}:`, error);
    return null;
  }
}

// 获取所有专题的数据（用于相关专题推荐）
async function fetchAllTopics(site?: string) {
  try {
    // 获取数据库专题
    const siteParam = site || getMainSite().hostname;
    const dbRes = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || ""}/api/topics/db?limit=20&site=${siteParam}`, 
      { 
        cache: 'no-store',
        next: { tags: ['topics-list'] }
      }
    );
    
    if (dbRes.ok) {
      const dbData = await dbRes.json();
      if (dbData.results) {
        return dbData.results;
      }
    }

    // 回退到趋势专题
    const trendRes = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || ""}/api/topics/trending?limit=10`, 
      { 
        cache: 'no-store',
        next: { tags: ['topics-list'] }
      }
    );
    
    if (trendRes.ok) {
      const trendData = await trendRes.json();
      if (trendData.success && trendData.data) {
        return trendData.data;
      }
    }

    return [];
  } catch (error) {
    console.error('Error fetching topics:', error);
    return [];
  }
}

// 生成页面元数据
export async function generateMetadata({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ site?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const sp = searchParams ? await searchParams : undefined;
  const site = sp?.site;
  const topic = await fetchTopic(slug, site);
  
  if (!topic) {
    return {
      title: '专题不存在 - 党报头条',
      description: '您访问的专题页面不存在',
    };
  }

  const title = `${topic.title} - 专题报道 - 党报头条`;
  const description = topic.summary || `关于"${topic.title}"的专题报道和最新资讯`;
  const keywords = [
    topic.title,
    '专题报道',
    '党报头条',
    ...(topic.tags || []).map((tag: any) => typeof tag === 'string' ? tag : tag.name).filter(Boolean)
  ].join(', ');

  return {
    title,
    description,
    keywords,
    openGraph: {
      title,
      description,
      type: 'article',
      images: topic.cover_image?.url ? [{
        url: topic.cover_image.url,
        width: 1200,
        height: 630,
        alt: topic.title,
      }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: topic.cover_image?.url ? [topic.cover_image.url] : [],
    },
    alternates: {
      canonical: `/portal/topic/${slug}`,
    },
  };
}

export default async function TopicPage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ site?: string; tags?: string }>;
}) {
  // 获取参数
  const { slug } = await params;
  const sp = searchParams ? await searchParams : undefined;
  const site = sp?.site;
  const tags = sp?.tags || "";
  
  // 并行获取数据以提升性能
  const [topic, allTopics] = await Promise.all([
    fetchTopic(slug, site),
    fetchAllTopics(site)
  ]);

  // 如果专题不存在，TopicPageRenderer会处理404情况
  const topics = topic ? [topic, ...allTopics.filter((t: any) => t.slug !== topic.slug)] : allTopics;

  return (
    <TopicPageRenderer
      topicSlug={slug}
      topics={topics}
      tags={tags}
    />
  );
}
