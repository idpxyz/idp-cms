"use client";

import React, { useEffect, useState } from "react";
import "../../../../styles/article.css";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trackPageView, trackDwell } from "@/lib/tracking/analytics";
import { useIntersectionObserver } from "@/lib/hooks/useIntersectionObserver";
import { formatDateTimeFull, formatDateTime } from "@/lib/utils/date";
import { useChannels } from "../../ChannelContext";
import FloatingShareToolbar from "@/components/share/FloatingShareToolbar";
import TableOfContents from "./TableOfContents";
import { useInteraction } from "@/lib/context/InteractionContext";
import { useAuth } from "@/lib/context/AuthContext";
import CommentSection from "./CommentSection";
import { useReadingHistory } from "@/lib/hooks/useReadingHistory";

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

interface ArticleContentProps {
  article: Article;
  relatedArticles: Article[];
  prevArticle?: Article | null;
  nextArticle?: Article | null;
}

export default function ArticleContent({
  article,
  relatedArticles,
  prevArticle,
  nextArticle,
}: ArticleContentProps) {
  const router = useRouter();
  const { switchChannel } = useChannels();
  const { isAuthenticated } = useAuth();
  const { toggleLike, toggleFavorite, getArticleInteraction, refreshArticleStats, updateCommentCount } = useInteraction();
  const { addToHistory } = useReadingHistory();
  const [readingProgress, setReadingProgress] = useState(0);
  
  // 获取文章互动状态
  const articleInteraction = getArticleInteraction(article.id.toString());
  const [isInteracting, setIsInteracting] = useState(false);
  
  // 初始化文章统计数据
  useEffect(() => {
    refreshArticleStats(article.id.toString());
  }, [article.id, refreshArticleStats]);

  // 记录阅读历史（用户打开文章时）
  useEffect(() => {
    if (isAuthenticated && article) {
      // 延迟3秒记录，确保用户真正开始阅读
      const timer = setTimeout(() => {
        addToHistory({
          articleId: article.id.toString(),
          articleTitle: article.title,
          articleSlug: article.slug,
          articleChannel: article.channel?.name || '未知',
          readDuration: 0,
          readProgress: 0,
        });
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, article, addToHistory]);

  // 处理点赞
  const handleLike = async () => {
    if (!isAuthenticated) {
      alert('请先登录');
      return;
    }

    setIsInteracting(true);
    const result = await toggleLike(article.id.toString());
    
    if (!result.success && result.error) {
      alert(result.error);
    }
    
    setIsInteracting(false);
  };

  // 处理收藏
  const handleFavorite = async () => {
    if (!isAuthenticated) {
      alert('请先登录');
      return;
    }

    setIsInteracting(true);
    const result = await toggleFavorite(article.id.toString(), {
      title: article.title,
      slug: article.slug,
      channel: article.channel?.name || '未分类',
    });
    
    if (!result.success && result.error) {
      alert(result.error);
    }
    
    setIsInteracting(false);
  };

  // 处理分享
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: article.title,
          text: article.excerpt || '',
          url: window.location.href,
        });
      } catch (error) {
        // 用户取消分享
      }
    } else {
      // 复制链接到剪贴板
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('链接已复制到剪贴板');
      } catch (error) {
        alert('分享功能不可用');
      }
    }
  };

  const shareLink = typeof window !== "undefined" ? window.location.href : "";
  const shareTitle = article.title;
  const sharePic = article.image_url || "";
  const shareDesc = article.excerpt || "";

  // 页面浏览追踪
  useEffect(() => {
    if (article) {
      trackPageView(article.slug, article.channel?.slug);
    }
  }, [article.slug, article.channel?.slug]); // 🎯 修复：使用具体的值而不是整个对象

  // 文章内容阅读时间追踪
  const { observe } = useIntersectionObserver({
    threshold: 0.3,
    trackDwellTime: true,
    onLeave: (element, dwellTime) => {
      if (dwellTime > 5000) {
        // 阅读超过5秒才记录
        trackDwell(article.slug, dwellTime, article.channel?.slug);
      }
    },
  });

  // 观察文章内容区域
  useEffect(() => {
    const contentElement = document.querySelector("[data-article-content]");
    if (contentElement) {
      observe(contentElement);
    }
  }, [observe]);

  // 阅读进度监听
  useEffect(() => {
    const updateReadingProgress = () => {
      const contentElement = document.querySelector("[data-article-content]");
      if (!contentElement) return;

      const { top, height } = contentElement.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // 计算阅读进度（0-100%）
      const progress = Math.max(0, Math.min(100, 
        ((windowHeight - top) / (height + windowHeight)) * 100
      ));
      
      setReadingProgress(progress);
    };

    window.addEventListener("scroll", updateReadingProgress, { passive: true });
    window.addEventListener("resize", updateReadingProgress, { passive: true });
    
    // 初始计算
    updateReadingProgress();

    return () => {
      window.removeEventListener("scroll", updateReadingProgress);
      window.removeEventListener("resize", updateReadingProgress);
    };
  }, []);


  const handleRelatedArticleClick = (relatedSlug: string, event: React.MouseEvent) => {
    event.preventDefault();
    trackPageView(relatedSlug, article.channel?.slug);
    // 🎯 简化相关文章导航，不需要保持频道参数
    router.push(`/portal/article/${relatedSlug}`);
  };

  const handleChannelBreadcrumbClick = (event: React.MouseEvent) => {
    event.preventDefault();
    const channelSlug = article.channel?.slug;
    if (channelSlug) {
      console.log('🍞 Breadcrumb channel clicked:', channelSlug);
      // 🎯 使用新架构的统一切换函数
      switchChannel(channelSlug);
    }
  };

  return (
    <div className="bg-gray-50">
      {/* 阅读进度条 */}
      <div className="reading-progress">
        <div 
          className="reading-progress-bar" 
          style={{ width: `${readingProgress}%` }}
        />
      </div>
      {/* 面包屑导航 - 简洁版 */}
      <nav className="py-2">
        <div className="flex items-center text-sm">
          <Link href="/portal" className="text-gray-500 hover:text-gray-700">
            首页
          </Link>
          <span className="mx-2 text-gray-400">/</span>
          <button
            onClick={handleChannelBreadcrumbClick}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            {article.channel?.name || "未知频道"}
          </button>
          <span className="mx-2 text-gray-400">/</span>
          <span className="text-gray-900 truncate">{article.title}</span>
        </div>
      </nav>

      <div className="py-2">
        <div className="relative max-w-7xl mx-auto">
          <div className="flex gap-4">
            {/* 左侧分享栏 - 只在超大屏幕显示 */}
            <aside className="hidden xl:block">
              <div className="sticky top-32 h-0">
                <FloatingShareToolbar
                  shareLink={shareLink}
                  shareTitle={shareTitle}
                  sharePic={sharePic}
                  shareDesc={shareDesc}
                />
              </div>
            </aside>
            
            {/* 主内容和右侧栏容器 */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* 主内容列 */}
              <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* 文章头部 */}
            <div className="p-6">
              {/* 频道标签 */}
              <div className="mb-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  {article.channel?.name || "未知频道"}
                </span>
              </div>

              {/* 文章标题 */}
              <h1 className="text-2xl font-bold text-gray-900 mb-3 leading-tight">
                {article.title}
              </h1>

              {/* 文章元信息 */}
              <div className="flex items-center justify-between text-sm text-gray-600 mb-4 pb-4 border-b border-gray-200">
                <div className="flex items-center space-x-4">
                  <span>作者：{article.author || "未知"}</span>
                  <span>来源：{article.source || "本站"}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span>发布时间：{formatDateTimeFull(article.publish_at)}</span>
                  {article.updated_at !== article.publish_at && (
                    <span>
                      更新时间：{formatDateTimeFull(article.updated_at)}
                    </span>
                  )}
                </div>
              </div>

              {/* 互动按钮 */}
              <div className="flex items-center justify-center space-x-4 mb-6 pb-4 border-b border-gray-200">
                {/* 点赞按钮 */}
                <button 
                  onClick={handleLike}
                  disabled={isInteracting}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    articleInteraction.isLiked 
                      ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                      : 'bg-gray-100 hover:bg-red-50 hover:text-red-600'
                  }`}
                >
                  <svg className={`w-4 h-4 ${articleInteraction.isLiked ? 'fill-current' : ''}`} fill={articleInteraction.isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span className="text-sm">
                    {isInteracting ? '...' : `点赞 ${articleInteraction.likeCount || 0}`}
                  </span>
                </button>

                {/* 收藏按钮 */}
                <button 
                  onClick={handleFavorite}
                  disabled={isInteracting}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    articleInteraction.isFavorited 
                      ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
                      : 'bg-gray-100 hover:bg-blue-50 hover:text-blue-600'
                  }`}
                >
                  <svg className={`w-4 h-4 ${articleInteraction.isFavorited ? 'fill-current' : ''}`} fill={articleInteraction.isFavorited ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  <span className="text-sm">
                    {isInteracting ? '...' : `收藏 ${articleInteraction.favoriteCount || 0}`}
                  </span>
                </button>

                {/* 分享按钮 */}
                <button 
                  onClick={handleShare}
                  className="flex items-center space-x-2 px-4 py-2 rounded-full bg-gray-100 hover:bg-green-50 hover:text-green-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                  <span className="text-sm">分享</span>
                </button>

                {/* 评论按钮 */}
                <button className="flex items-center space-x-2 px-4 py-2 rounded-full bg-gray-100 hover:bg-yellow-50 hover:text-yellow-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  <span className="text-sm">评论 {articleInteraction.commentCount || 0}</span>
                </button>
              </div>

              {/* 文章摘要 */}
              {article.excerpt && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {article.excerpt}
                  </p>
                </div>
              )}
            </div>

            {/* 文章封面图 */}
            {article.image_url && (
              <div className="px-6 mb-4">
                <Image
                  src={article.image_url}
                  alt={article.title}
                  width={800}
                  height={400}
                  className="w-full h-auto rounded-lg object-cover"
                  priority
                />
              </div>
            )}

            {/* 文章内容 - 优化阅读体验 */}
            <div className="px-6 pb-6">
              <div
                className="article-content max-w-none"
                data-article-content
                dangerouslySetInnerHTML={{ __html: article.content }}
              />

              {/* 文章标签 */}
              {article.tags && article.tags.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-sm text-gray-600 mr-1">标签：</span>
                    {article.tags.map((tag, index) => (
                      <Link
                        key={index}
                        href={`/portal/tags/${encodeURIComponent(tag)}`}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        #{tag}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* 上下篇导航 */}
              {(prevArticle || nextArticle) && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 上一篇 */}
                    {prevArticle ? (
                      <Link
                        href={`/portal/article/${prevArticle.slug}`}
                        className="group p-4 rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-all"
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            <svg className="w-5 h-5 text-gray-400 group-hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-500 mb-1">上一篇</p>
                            <h4 className="text-sm font-medium text-gray-900 group-hover:text-red-700 line-clamp-2">
                              {prevArticle.title}
                            </h4>
                          </div>
                        </div>
                      </Link>
                    ) : (
                      <div className="p-4 rounded-lg border border-gray-100 bg-gray-50">
                        <div className="flex items-center justify-center h-16 text-gray-400">
                          <span className="text-sm">已经是第一篇了</span>
                        </div>
                      </div>
                    )}

                    {/* 下一篇 */}
                    {nextArticle ? (
                      <Link
                        href={`/portal/article/${nextArticle.slug}`}
                        className="group p-4 rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-all"
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-500 mb-1 text-right">下一篇</p>
                            <h4 className="text-sm font-medium text-gray-900 group-hover:text-red-700 line-clamp-2 text-right">
                              {nextArticle.title}
                            </h4>
                          </div>
                          <div className="flex-shrink-0 mt-1">
                            <svg className="w-5 h-5 text-gray-400 group-hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </Link>
                    ) : (
                      <div className="p-4 rounded-lg border border-gray-100 bg-gray-50">
                        <div className="flex items-center justify-center h-16 text-gray-400">
                          <span className="text-sm">已经是最后一篇了</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 您可能感兴趣 - 推荐文章区域 */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  您可能感兴趣
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* 模拟推荐文章 */}
                  {[1, 2, 3, 4, 5, 6].map((item) => (
                    <Link
                      key={item}
                      href="#"
                      className="group bg-white rounded-lg border border-gray-200 hover:border-red-300 hover:shadow-md transition-all overflow-hidden"
                    >
                      <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <span className="text-gray-400 text-sm">图片 {item}</span>
                      </div>
                      <div className="p-3">
                        <h4 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-red-600 transition-colors mb-2">
                          {item === 1 && "区块链技术在金融领域的创新应用"}
                          {item === 2 && "新能源汽车产业发展趋势分析"}
                          {item === 3 && "元宇宙概念下的虚拟现实技术突破"}
                          {item === 4 && "量子计算技术的最新进展与挑战"}
                          {item === 5 && "物联网设备安全防护技术研究"}
                          {item === 6 && "云计算服务在企业数字化转型中的作用"}
                        </h4>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{article.channel?.name || "科技"}</span>
                          <span>{(item * 3 + 2)}小时前</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* 返回按钮 */}
              <div className="mt-8 text-center">
                <Link
                  href={`/portal?channel=${article.channel?.slug}`}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  ← 返回首页
                </Link>
              </div>
            </div>
              </div>
              
              {/* 评论系统 */}
              <div className="lg:col-span-2 mt-8">
                <CommentSection 
                  articleId={article.id.toString()} 
                  commentCount={articleInteraction.commentCount}
                  onCommentCountChange={(count) => {
                    // 更新文章互动状态中的评论数
                    updateCommentCount(article.id.toString(), count);
                  }}
                  articleInfo={{
                    title: article.title,
                    slug: article.slug,
                    channel: article.channel?.name || '未分类',
                  }}
                />
              </div>
              </div>
              
              {/* 右侧栏 */}
              <aside className="lg:col-span-1">
                {/* 右侧栏粘性容器 - 统一对齐 */}
                <div className="sticky top-24 space-y-6">
                  {/* 文章目录 */}
                  <TableOfContents content={article.content} />
                  
                  {/* 本频道热门 */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                      本频道热门
                    </h3>
                    <div className="space-y-3">
                      {/* 模拟热门文章数据 */}
                      {[1, 2, 3].map((item) => (
                        <div key={item} className="flex space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                            <span className="text-red-600 font-bold text-sm">{item}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                              <Link href="#" className="hover:text-red-500 transition-colors">
                                {item === 1 && "科技创新推动数字经济高质量发展"}
                                {item === 2 && "人工智能技术在教育领域的应用前景"}
                                {item === 3 && "5G网络建设助力智慧城市发展"}
                              </Link>
                            </h4>
                            <div className="flex items-center text-xs text-gray-500">
                              <span>{12 - item}小时前</span>
                              <span className="mx-1">•</span>
                              <span>{(5 - item) * 1000 + 2000}阅读</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 相关文章 */}
                  {relatedArticles && relatedArticles.length > 0 && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                      <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                        </svg>
                        相关文章
                      </h3>
                      <div className="grid gap-3">
                        {relatedArticles.slice(0, 4).map((related) => (
                          <div
                            key={related.id}
                            className="flex space-x-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                            data-article-id={related.slug}
                          >
                            {related.image_url && (
                              <Image
                                src={related.image_url}
                                alt={related.title}
                                width={80}
                                height={60}
                                className="w-16 h-12 object-cover rounded flex-shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                                <Link
                                  href={`/portal/article/${related.slug}?channel=${article.channel?.slug}`}
                                  className="hover:text-red-500 transition-colors"
                                  onClick={(e) => handleRelatedArticleClick(related.slug, e)}
                                >
                                  {related.title}
                                </Link>
                              </h4>
                              <p className="text-xs text-gray-500 truncate">
                                {related.source || related.channel?.name}
                              </p>
                              <p className="text-xs text-gray-400">
                                {formatDateTime(related.publish_at)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}