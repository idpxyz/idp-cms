import React from "react";
import Image from "next/image";
import Link from "next/link";
import { formatDateTimeFull } from "@/lib/utils/date";
import ChannelLink from "../../../components/ChannelLink";

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

interface ArticleLayoutProps {
  article: Article;
  children?: React.ReactNode;
  hasSidebar?: boolean; // 是否有侧边栏
}

/**
 * 文章布局 - 服务端组件
 * 负责渲染静态内容：标题、正文、元信息等
 */
export default function ArticleLayout({ article, children, hasSidebar = false }: ArticleLayoutProps) {
  // 获取封面图片
  const coverImage = article.image_url || (article.cover && article.cover.url);
  
  // 从children中提取交互按钮、主内容和侧边栏
  let interactionsContent: React.ReactNode = null;
  let mainContent: React.ReactNode = null;
  let sidebarContent: React.ReactNode = null;
  
  if (children) {
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child)) {
        if (child.props.slot === 'interactions') {
          interactionsContent = child.props.children;
        } else if (child.props.slot === 'sidebar') {
          sidebarContent = child.props.children;
        } else if (child.props.slot === 'content') {
          mainContent = child.props.children;
        } else if (!child.props.slot) {
          // 没有 slot 的保持向后兼容
          mainContent = child;
        }
      }
    });
  }
  
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4">
        {/* 面包屑导航 - 与文章内容宽度完全一致 */}
        <nav className="py-2">
          <div className={`grid grid-cols-1 gap-6 ${hasSidebar ? 'lg:grid-cols-3' : ''}`}>
            <div className={hasSidebar ? 'lg:col-span-2' : ''}>
              <div className="flex items-center text-sm">
                <Link href="/portal" className="text-gray-500 hover:text-gray-700">
                  首页
                </Link>
                <span className="mx-2 text-gray-400">/</span>
                <ChannelLink
                  channelSlug={article.channel?.slug}
                  className="text-gray-500 hover:text-gray-700"
                >
                  {article.channel?.name || "新闻"}
                </ChannelLink>
                <span className="mx-2 text-gray-400">/</span>
                <span className="text-gray-700">正文</span>
              </div>
            </div>
          </div>
        </nav>

        {/* 主内容和右侧栏容器 - 两栏布局 */}
        <div className="py-2">
          <div className={`grid grid-cols-1 gap-6 ${hasSidebar ? 'lg:grid-cols-3' : ''}`}>
            {/* 主内容列 */}
            <div className={hasSidebar ? 'lg:col-span-2' : ''}>
            {/* 文章主体 */}
            <article className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* 文章头部 */}
          <header className="px-6 md:px-12 pt-6 md:pt-8">
            {/* 标题 */}
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 leading-tight">
              {article.title}
            </h1>

            {/* 元信息 */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 pb-3">
              {/* 作者 */}
              {article.author && (
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{article.author}</span>
                </div>
              )}

              {/* 来源 */}
              {article.source && (
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                  </svg>
                  <span>{article.source}</span>
                </div>
              )}

              {/* 发布时间 */}
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  />
                </svg>
                <time dateTime={article.publish_at}>
                  {formatDateTimeFull(article.publish_at)}
                </time>
              </div>
            </div>
          </header>

          {/* 交互按钮区域 - 由 page.tsx 传入 */}
          {interactionsContent}

          {/* 封面图片 */}
          {coverImage && (
            <div className="relative w-full h-64 md:h-96 my-4">
              <Image
                src={coverImage}
                alt={article.title}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
              />
            </div>
          )}

          {/* 文章正文 */}
          <div className="px-6 md:px-12 py-6">
            <div
              className="prose prose-lg max-w-none
                prose-headings:text-gray-900 prose-headings:font-bold
                prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-4
                prose-a:text-red-600 prose-a:no-underline hover:prose-a:underline
                prose-strong:text-gray-900 prose-strong:font-semibold
                prose-ul:list-disc prose-ul:pl-6 prose-ul:mb-4
                prose-ol:list-decimal prose-ol:pl-6 prose-ol:mb-4
                prose-li:text-gray-700 prose-li:mb-2
                prose-img:rounded-lg prose-img:shadow-md prose-img:my-6
                prose-blockquote:border-l-4 prose-blockquote:border-red-500 
                prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-600"
              data-article-content
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          </div>

          {/* 标签 */}
          {article.tags && article.tags.length > 0 && (
            <div className="px-6 md:px-12 py-4">
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

              {/* 客户端组件插槽 */}
              {mainContent}
            </article>
          </div>

            {/* 右侧栏 - 仅在有sidebar时显示 */}
            {hasSidebar && sidebarContent && (
              <aside className="lg:col-span-1">
                {/* 右侧栏粘性容器 */}
                <div className="sticky top-40 space-y-6">
                  {sidebarContent}
                </div>
              </aside>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

