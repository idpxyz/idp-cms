import React from "react";
import Link from "next/link";
import { formatDateTimeFull } from "@/lib/utils/date";
import { optimizeArticleContent } from "@/lib/utils/optimizeArticleImages";

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
  external_article_url?: string;
}

interface ArticleStaticLayoutProps {
  article: Article;
  children?: React.ReactNode;
  hasSidebar?: boolean;
}

/**
 * 文章静态布局 - 服务端组件
 * 负责渲染静态内容：标题、正文、元信息等
 * 
 * 🚀 性能优化：
 * - 服务端渲染，立即可见可读
 * - 不需要等待JavaScript水合
 * - 用户可以立即滚动阅读文章
 */
export default function ArticleStaticLayout({ 
  article, 
  children, 
  hasSidebar = false 
}: ArticleStaticLayoutProps) {
  // 🚀 图片优化：将JPG/PNG转换为WebP，添加懒加载
  const optimizedContent = optimizeArticleContent(article.content);
  
  // 从children中提取不同slot的内容
  let interactionsContent: React.ReactNode = null;
  let mainContent: React.ReactNode = null;
  let sidebarContent: React.ReactNode = null;
  let breadcrumbContent: React.ReactNode = null;
  
  if (children) {
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child)) {
        const slot = child.props.slot;
        if (slot === 'breadcrumb') {
          breadcrumbContent = child.props.children;
        } else if (slot === 'interactions') {
          interactionsContent = child.props.children;
        } else if (slot === 'sidebar') {
          sidebarContent = child.props.children;
        } else if (slot === 'content') {
          mainContent = child.props.children;
        } else if (!slot) {
          mainContent = child;
        }
      }
    });
  }
  
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4">
        {/* 面包屑导航 */}
        <nav className="py-2">
          <div className={`grid grid-cols-1 gap-6 ${hasSidebar ? 'lg:grid-cols-3' : ''}`}>
            <div className={hasSidebar ? 'lg:col-span-2' : ''}>
              {breadcrumbContent || (
                // 默认面包屑（服务端渲染）
                <div className="flex items-center text-sm">
                  <Link href="/portal" className="text-gray-500 hover:text-gray-700">
                    首页
                  </Link>
                  <span className="mx-2 text-gray-400">/</span>
                  <Link 
                    href={`/portal?channel=${article.channel.slug}`}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {article.channel.name || "新闻"}
                  </Link>
                  <span className="mx-2 text-gray-400">/</span>
                  <span className="text-gray-700">正文</span>
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* 主内容和右侧栏容器 */}
        <div className="py-2">
          <div className={`grid grid-cols-1 gap-6 ${hasSidebar ? 'lg:grid-cols-3' : ''}`}>
            {/* 主内容列 */}
            <div className={hasSidebar ? 'lg:col-span-2' : ''}>
              <article className="bg-white rounded-lg shadow-sm overflow-hidden">
                {/* 文章头部 */}
                <header className="px-6 md:px-12 pt-6 md:pt-8">
                  {/* 标题 - 立即可见 */}
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 leading-tight">
                    {article.title}
                  </h1>

                  {/* 元信息 - 立即可见 */}
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
                        
                        {/* 外部原文链接 */}
                        {article.external_article_url && (
                          <a 
                            href={article.external_article_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 text-blue-600 hover:text-blue-800 hover:underline flex items-center transition-colors"
                            title="查看原文"
                          >
                            <span className="text-xs">查看原文</span>
                            <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                              <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                            </svg>
                          </a>
                        )}
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

                {/* 交互按钮区域 - 客户端组件插槽 */}
                {interactionsContent}

                {/* 文章正文 - 立即可见可读 - 🚀 图片已优化为WebP */}
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
                    dangerouslySetInnerHTML={{ __html: optimizedContent }}
                  />
                </div>

                {/* 标签 - 立即可见 */}
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

                {/* 客户端组件插槽（评论等） */}
                {mainContent}
              </article>
            </div>

            {/* 右侧栏 - 服务端渲染或客户端组件 */}
            {hasSidebar && sidebarContent && (
              <aside className="lg:col-span-1">
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

