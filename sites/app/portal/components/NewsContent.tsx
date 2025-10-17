"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { getNews } from "@/lib/api/news";
// Removed api-url dependency - using relative paths instead
import { 
  fetchFeed, 
  fetchPersonalizedFeed, 
  fetchColdStartFeed,
  
  fetchTrendingFeed,
  fetchLatestFeed,
  fetchFeedByStrategy,
  shouldUseSmartFeed,
  getAnonymousStrategy
} from "@/lib/api/feed";
import type { FeedItem, FeedResponse } from "@/lib/api/feed";
import { endpoints } from "@/lib/config/endpoints";
import { getDefaultSite, getMainSite } from "@/lib/config/sites";
import { ContentTimingManager } from "@/lib/config/content-timing";
import Image from "next/image";
import ModuleRenderer from "../../../components/modules/ModuleRenderer";
import {
  trackImpression,
  trackClick,
  trackDwell,
} from "@/lib/tracking/analytics";
import { useMultipleIntersectionObserver } from "@/lib/hooks/useIntersectionObserver";
import { formatDateTime } from "@/lib/utils/date";
import { useChannels } from "../ChannelContext";
import { useAdaptiveLinkSSR } from "@/app/portal/hooks/useAdaptiveLink";
import ModernNewsItem from "./ModernNewsItem";

// 自定义样式
const customStyles = `
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }

  /* 快讯滚动样式 */
  .ticker-marquee {
    overflow: hidden;
  }
  .ticker-track {
    display: inline-flex;
    white-space: nowrap;
    will-change: transform;
    /* 放慢滚动速度，并允许通过 CSS 变量调整（断点覆盖） */
    animation: ticker-scroll var(--ticker-duration, 160s) linear infinite;
  }
  .group:hover .ticker-track {
    animation-play-state: paused;
  }
  @keyframes ticker-scroll {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @media (prefers-reduced-motion: reduce) {
    .ticker-track { animation: none; }
  }

  /* 基于断点的滚动时长设置：移动更快，桌面更慢 */
  .ticker-marquee { --ticker-duration: 120s; }
  @media (max-width: 639px) { /* < sm */
    .ticker-marquee { --ticker-duration: 80s; }
  }
  @media (min-width: 1024px) { /* >= lg */
    .ticker-marquee { --ticker-duration: 160s; }
  }
`;

import type { Channel } from '@/lib/api';

interface NewsContentProps {
  channels: Channel[];
  initialChannelId: string;
  // 分类模式相关props
  categoryMode?: boolean;
  categorySlug?: string;
  categoryName?: string;
  initialArticles?: FeedItem[];
  pagination?: {
    page: number;
    size: number;
    total: number;
    has_next: boolean;
    has_prev: boolean;
  };
  // 标签筛选（用于频道页/分类页）
  tags?: string;
}

// 新闻条目组件 - 使用 React.memo 优化性能
const NewsItem = React.memo(({ 
  news, 
  onArticleClick, 
  index = 0 
}: { 
  news: FeedItem; 
  onArticleClick: (slug: string) => void;
  index?: number;
}) => (
                  <article
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
                    data-article-id={news.slug}
                  >
                    <div className="flex space-x-4">
                      {news.image_url ? (
                        <Image
                          src={news.image_url}
                          alt={news.title}
                          width={120}
                          height={80}
                          className="w-20 h-16 object-cover rounded flex-shrink-0"
                        />
                      ) : (
                        <div className="w-20 h-16 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center">
                          <svg
                            className="w-6 h-6 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="news-title-small mb-2 line-clamp-2">
                          <a
                            href={news.slug ? `/portal/article/${news.slug}` : (news.id ? `/portal/article/${news.id}` : (news.url || "/portal"))}
                            className="hover:text-red-500 transition-colors"
                            onClick={() => onArticleClick(news.slug || news.id)}
                          >
                            {news.title}
                          </a>
                        </h3>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span className="truncate">
                            {news.source || news.author || news.channel?.name}
                          </span>
                          <span className="flex-shrink-0 ml-2">
                            {formatDateTime(news.publish_time || news.publish_at)}
                          </span>
                          <div className="flex items-center space-x-3 flex-shrink-0 ml-2">
                            {news.final_score && (
                              <span className="text-yellow-500 text-xs">
                                ⭐ {(news.final_score * 100).toFixed(0)}
                              </span>
                            )}
                            <span>📤 分享</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
), (prevProps, nextProps) => {
  // 只在 news.id 改变时重新渲染，提升性能
  return prevProps.news.id === nextProps.news.id && 
         prevProps.news.slug === nextProps.news.slug;
});

// 今日头条组件
const TodayHeadlines = ({ 
  headlines, 
  loading, 
  onArticleClick 
}: {
  headlines: FeedItem[];
  loading: boolean;
  onArticleClick: (slug: string) => void;
}) => {
  const adaptiveLinkProps = useAdaptiveLinkSSR();
  return (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <h3 className="section-title mb-4 flex items-center">
      <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
      今日头条
    </h3>
    {loading ? (
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
        <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
      </div>
    ) : headlines.length > 0 ? (
      <div className="space-y-4">
        {headlines.slice(0, 2).map((headline, index) => (
          <div key={`headline-${headline.id}-${index}`} className="border-b border-gray-100 last:border-b-0 pb-3 last:pb-0">
            {headline.image_url && index === 0 && (
              <div className="relative mb-3">
                <Image
                  src={headline.image_url}
                  alt={headline.title}
                  width={300}
                  height={150}
                  className="w-full h-24 object-cover rounded"
                />
                <div className="absolute top-2 left-2">
                  <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-medium">
                    头条
                  </span>
                </div>
              </div>
            )}
            <h4 className="news-title-small line-clamp-2 mb-2">
              <a
                href={`/portal/article/${headline.slug}`}
                {...adaptiveLinkProps}
                className="hover:text-red-500 transition-colors"
                onClick={() => onArticleClick(headline.slug)}
              >
                {headline.title}
              </a>
            </h4>
            <div className="news-meta flex justify-between">
              <span>{headline.source || headline.author}</span>
              <span>{formatDateTime(headline.publish_time || headline.publish_at)}</span>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-gray-500 text-sm">暂无头条新闻</p>
    )}
  </div>
  );
};

// 热门话题模块已移除

// 编辑推荐组件 - 使用传统新闻API获取不同的内容
const EditorsChoice = ({ 
  loading, 
  onArticleClick 
}: {
  loading: boolean;
  onArticleClick: (slug: string) => void;
}) => {
  const adaptiveLinkProps = useAdaptiveLinkSSR();
  const [editorArticles, setEditorArticles] = useState<FeedItem[]>([]);
  const [editorLoading, setEditorLoading] = useState(true);

  // 获取编辑推荐内容（使用传统API，避免与智能推荐重复）
  useEffect(() => {
    const loadEditorChoice = async () => {
      try {
        setEditorLoading(true);
        // 使用传统新闻API获取特定频道的文章
        const response = await getNews("recommend", 1, 6);
        // 转换NewsItem到FeedItem格式
        const feedItems: FeedItem[] = response.data.map((item: any) => ({
          id: item.id,
          slug: item.slug,
          title: item.title,
          excerpt: item.excerpt,
          author: item.author,
          source: item.source,
          image_url: item.image_url || item.cover?.url,
          publish_time: item.publish_at,
          publish_at: item.publish_at,
          channel: item.channel,
          is_featured: item.is_featured,
          final_score: 0
        }));
        setEditorArticles(feedItems);
      } catch (error) {
        console.error('Failed to load editor choice:', error);
        setEditorArticles([]);
      } finally {
        setEditorLoading(false);
      }
    };

    loadEditorChoice();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
        <span className="text-yellow-500 mr-2">⭐</span>
        编辑推荐
      </h3>
      {loading || editorLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      ) : editorArticles.length > 0 ? (
        <div className="space-y-3">
          {editorArticles.slice(0, 4).map((article, index) => (
            <div key={`editor-${article.id}-${index}`} className="border-b border-gray-100 last:border-b-0 pb-2 last:pb-0">
              <h4 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                <a
                  href={`/portal/article/${article.slug}`}
                  {...adaptiveLinkProps}
                  className="hover:text-red-500 transition-colors"
                  onClick={() => onArticleClick(article.slug)}
                >
                  {article.title}
                </a>
              </h4>
              <div className="text-xs text-gray-500 flex justify-between">
                <span>{article.source || article.author}</span>
                <span className="text-yellow-500">⭐ 编辑精选</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-sm">暂无编辑推荐内容</p>
      )}
    </div>
  );
};

// 顶部快讯条模块
const QuickTicker = ({ onArticleClick }: { onArticleClick: (slug: string) => void; }) => {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetchLatestFeed(20);
        setItems(res.items || []);
      } catch (e) {
        console.error('Failed to load quick ticker:', e);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const renderItems = items.slice(0, 12);
  const shouldScroll = renderItems.length > 1;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-3 py-2 md:py-2.5">
      <div className="flex items-center space-x-3">
        <span className="text-red-500 text-sm font-semibold leading-none">快讯</span>
        {loading ? (
          <div className="flex-1 h-4 bg-gray-200 rounded animate-pulse" />
        ) : items.length > 0 ? (
          shouldScroll ? (
            <div className="flex-1 ticker-marquee group" aria-label="快讯滚动">
              <div className="ticker-track">
                <div className="inline-flex items-center space-x-6">
                  {renderItems.map((it, idx) => (
                    <a
                      key={`tick-${it.id}-${idx}`}
                      href={it.slug ? `/portal/article/${it.slug}` : (it.id ? `/portal/article/${it.id}` : (it.url || "/portal"))}
                      className="text-sm text-gray-800 hover:text-red-500 transition-colors"
                      onClick={() => onArticleClick(it.slug || it.id)}
                    >
                      {it.title}
                    </a>
                  ))}
                </div>
                <div className="inline-flex items-center space-x-6">
                  {renderItems.map((it, idx) => (
                    <a
                      key={`tick2-${it.id}-${idx}`}
                      href={it.slug ? `/portal/article/${it.slug}` : (it.id ? `/portal/article/${it.id}` : (it.url || "/portal"))}
                      className="text-sm text-gray-800 hover:text-red-500 transition-colors"
                      onClick={() => onArticleClick(it.slug || it.id)}
                    >
                      {it.title}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-x-auto scrollbar-hide">
              <div className="inline-flex items-center space-x-6 whitespace-nowrap">
                {renderItems.map((it, idx) => (
                  <a
                    key={`tick-${it.id}-${idx}`}
                    href={it.slug ? `/portal/article/${it.slug}` : (it.id ? `/portal/article/${it.id}` : (it.url || "/portal"))}
                    className="text-sm text-gray-800 hover:text-red-500 transition-colors"
                    onClick={() => onArticleClick(it.slug || it.id)}
                  >
                    {it.title}
                  </a>
                ))}
              </div>
            </div>
          )
        ) : (
          <span className="text-sm text-gray-500">暂无快讯</span>
        )}
      </div>
    </div>
  );
};

// 最热阅读模块由模块系统渲染，页面内置实现已移除

// 地区切换模块
const RegionSwitcher = () => {
  const regions = [
    { slug: 'beijing', name: '北京' },
    { slug: 'shanghai', name: '上海' },
    { slug: 'shenzhen', name: '深圳' },
    { slug: 'hangzhou', name: '杭州' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">切换地区</h3>
      <div className="grid grid-cols-2 gap-3">
        {regions.map((r) => (
          <a
            key={r.slug}
            href={`/${r.slug}`}
            className="text-sm px-3 py-2 rounded border border-gray-200 hover:border-red-300 hover:text-red-500 transition-colors text-center"
          >
            {r.name}
          </a>
        ))}
      </div>
    </div>
  );
};

// 骨架屏组件
const NewsSkeleton = () => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
    <div className="flex space-x-4">
      <div className="w-20 h-16 bg-gray-200 rounded animate-pulse"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
        <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
      </div>
    </div>
  </div>
);

export default function NewsContent({
  channels,
  initialChannelId,
  categoryMode = false,
  categorySlug,
  categoryName,
  initialArticles,
  pagination,
  tags,
}: NewsContentProps) {
  // 🎯 新架构：使用统一的频道管理
  const { currentChannelSlug } = useChannels();
  
  // 🎯 自适应链接：桌面端新标签页，移动端当前页
  const adaptiveLinkProps = useAdaptiveLinkSSR();
  
  // 状态管理
  const [loading, setLoading] = useState(!categoryMode || !initialArticles); // 分类模式下如果有初始数据则不需要loading
  const [loadingMore, setLoadingMore] = useState(false);
  const [newsList, setNewsList] = useState<FeedItem[]>(initialArticles || []);
  // 已展示文章ID集合，用于跨模块去重（头条/最新 → 推荐）
  const seenIdsRef = useRef<Set<string>>(new Set());
  const [headlineNews, setHeadlineNews] = useState<FeedItem[]>([]);
  const seenClustersRef = useRef<Set<string>>(new Set());
  const [feedData, setFeedData] = useState<FeedResponse | null>(pagination ? {
    items: initialArticles || [],
    next_cursor: pagination.has_next ? 'page_2' : '',
    debug: {
      hours: ContentTimingManager.getNewsConfig().categoryHours, // 🎯 使用集中化配置
      template: 'category',
      sort_by: 'publish_time',
      site: '',
      host: '',
      user_type: 'anonymous',
      strategy_type: 'fallback',
      channels: [categorySlug || ''],
      confidence_score: 0
    }
  } : null);
  // 模块配置（来自 /api/frontend/modules 的映射）
  const [topModules, setTopModules] = useState<{ key: string; props?: any }[]>([]);
  const [sidebarModules, setSidebarModules] = useState<{ key: string; props?: any }[]>([]);
  
  // 无限滚动状态
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const cursorRef = useRef<string | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastLoadTimeRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null); // 🚀 用于取消请求

  // 同步cursor状态到ref
  useEffect(() => {
    cursorRef.current = cursor;
  }, [cursor]);
  
  // 智能推荐状态
  const [recommendationStrategy, setRecommendationStrategy] = useState<string>("cold_start");
  const [userType, setUserType] = useState<string>("anonymous");
  const [confidenceScore, setConfidenceScore] = useState<number>(0);

  // 🎯 新架构：简化的频道变化监听
  useEffect(() => {
    // 🚀 性能优化：取消之前频道的API请求，防止阻塞切换
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // 🚀 性能优化：瞬时滚动，避免smooth动画阻塞（500-1000ms）
    window.scrollTo({ top: 0 });
    
    // 🚀 性能优化：延迟到下一帧清空列表，不阻塞路由切换
    requestAnimationFrame(() => {
      setNewsList([]);
    });
    
    // 组件卸载时清理
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [currentChannelSlug]);

  // 🎯 模块配置优化 - 今日头条已移至首页顶部，无需特殊处理
  // useEffect 已移除：不再需要special handling for today-headlines

  // 保留 clusters 监听逻辑
  useEffect(() => {
    const onClustersSeen = (ev: any) => {
      try {
        const detail = ev?.detail || {};
        const list: string[] = (detail.clusterSlugs || []).map((x: any) => String(x));
        let changed = false;
        list.forEach((s) => { if (!seenClustersRef.current.has(s)) { seenClustersRef.current.add(s); changed = true; } });
        if (changed) {
          // 更新侧栏 most-read 模块的 props 以传递去重簇
          setSidebarModules(prev => prev.map(m => m.key === 'most-read' ? { ...m, props: { ...(m.props || {}), excludeClusterIds: Array.from(seenClustersRef.current), region: undefined, lang: (navigator.language || 'zh-CN').toLowerCase() } } : m));
        }
      } catch {}
    };
    window.addEventListener('clustersSeen', onClustersSeen as any);
    return () => {
      window.removeEventListener('clustersSeen', onClustersSeen as any);
    };
  }, []);

  // 处理文章点击
  const handleArticleClick = useCallback((slug: string) => {
    trackClick(slug, currentChannelSlug);
  }, [currentChannelSlug]);

  // 处理话题点击
  const handleTopicClick = useCallback((slug: string) => {
    trackClick(slug, 'topic');
  }, []);

  // 获取策略显示名称
  const getStrategyDisplayName = (strategy: string): string => {
    const strategyNames: Record<string, string> = {
      "cold_start": "冷启动推荐",
      "hybrid": "混合推荐",
      "personalized": "个性化推荐",
      "fallback": "基础推荐"
    };
    return strategyNames[strategy] || strategy;
  };

  // 获取策略描述
  const getStrategyDescription = (strategy: string, confidence: number): string => {
    if (strategy === "cold_start") {
      return "为新用户提供热门内容和多样化推荐";
    } else if (strategy === "hybrid") {
      return `结合用户偏好和热门内容 (置信度: ${(confidence * 100).toFixed(0)}%)`;
    } else if (strategy === "personalized") {
      return `基于您的阅读习惯个性化推荐 (置信度: ${(confidence * 100).toFixed(0)}%)`;
    }
    return "提供基础新闻内容";
  };

  // 加载智能推荐数据
  const loadSmartFeed = useCallback(async (isLoadMore: boolean = false) => {
    try {
      // 🚀 性能优化：创建新的 AbortController，支持取消请求
      if (!isLoadMore) {
        // 取消之前的请求（如果有）
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        // 创建新的 controller
        abortControllerRef.current = new AbortController();
      }
      
      if (isLoadMore) {
        setLoadingMore(true);
        // 设置超时机制，防止永久卡住
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
        }
        loadingTimeoutRef.current = setTimeout(() => {
          console.warn('⚠️ 加载超时，重置状态');
          setLoadingMore(false);
        }, 30000); // 30秒超时
      } else {
        setLoading(true);
        // 重置状态
        setCursor(null);
        setHasMore(true);
      }
      
      let feedResponse: FeedResponse;
      
      // 🎯 分类模式处理
      if (categoryMode && categorySlug) {
        
        // 解析分页信息
        let currentPage = 1;
        if (isLoadMore && cursorRef.current) {
          try {
            const cursorData = JSON.parse(Buffer.from(cursorRef.current, 'base64').toString());
            currentPage = cursorData.page || 1;
          } catch (e) {
            console.warn('Failed to parse cursor for category API:', e);
            currentPage = 1;
          }
        }
        
        // 使用分类API获取文章 - 这里需要导入articleService
        const { articleService } = await import('@/lib/api');
        const response = await articleService.getArticlesByCategory(categorySlug, {
          page: currentPage,
          size: 20,
          include: 'categories,topic'
        });
        
        // 适配为FeedResponse格式
        const adaptedItems: FeedItem[] = response.items.map((item: any) => ({
          id: item.id.toString(),
          slug: item.slug,
          title: item.title,
          excerpt: item.excerpt || '暂无摘要',
          author: item.author || '编辑部',
          source: item.source || categoryName || '本站',
          image_url: item.cover?.url,
          publish_time: item.publish_at,
          publish_at: item.publish_at,
          updated_at: item.updated_at,
          is_featured: item.is_featured || false,
          channel: item.channel || { id: categorySlug, name: categoryName, slug: categorySlug },
          region: item.region ? { slug: item.region, name: item.region } : { slug: '', name: '' },
          content: item.content || '',
          weight: item.weight || 0,
          has_video: false,
          language: 'zh-CN',
          tags: item.tags || [],
          final_score: 0,
        }));
        
        // 生成下一页cursor
        const nextCursor = response.pagination.has_next 
          ? Buffer.from(JSON.stringify({ page: currentPage + 1 })).toString('base64')
          : '';
          
        feedResponse = {
          items: adaptedItems,
          next_cursor: nextCursor,
          debug: {
            hours: ContentTimingManager.getNewsConfig().categoryHours, // 🎯 使用集中化配置
            template: 'category',
            sort_by: 'publish_time',
            site: response.meta.site || '',
            host: '',
            user_type: 'anonymous',
            strategy_type: 'fallback',
            channels: [categorySlug || ''],
            confidence_score: 0
          }
        };
        
      } else {
        // 🎯 原有的频道模式处理
        // 若存在标签筛选，则直接使用文章列表API（channel + tags），绕过推荐逻辑
        if (tags && currentChannelSlug) {
          // 解析分页
          let currentPage = 1;
          if (isLoadMore && cursorRef.current) {
            try {
              const cursorData = JSON.parse(Buffer.from(cursorRef.current, 'base64').toString());
              currentPage = cursorData.page || 1;
            } catch (e) {
              console.warn('Failed to parse cursor for channel+tags API:', e);
              currentPage = 1;
            }
          }
          const { articleService } = await import('@/lib/api');
          const response = await articleService.getArticles({
            site: getMainSite().hostname,
            include: 'categories,topic',
            channel: currentChannelSlug,
            tags,
            page: currentPage,
            size: 20,
          });

          const adaptedItems: FeedItem[] = response.items.map((item: any) => ({
            id: String(item.id),
            slug: item.slug,
            title: item.title,
            excerpt: item.excerpt || '暂无摘要',
            author: item.author || '编辑部',
            source: item.source || currentChannelSlug || '本站',
            image_url: item.cover?.url,
            publish_time: item.publish_at,
            publish_at: item.publish_at,
            updated_at: item.updated_at,
            is_featured: item.is_featured || false,
            channel: item.channel || { id: currentChannelSlug, name: currentChannelSlug, slug: currentChannelSlug },
            region: item.region ? { slug: item.region, name: item.region } : { slug: '', name: '' },
            content: item.content || '',
            weight: item.weight || 0,
            has_video: false,
            language: 'zh-CN',
            tags: item.tags || [],
            final_score: 0,
          }));

          const nextCursor = response.pagination.has_next 
            ? Buffer.from(JSON.stringify({ page: currentPage + 1 })).toString('base64')
            : '';

          feedResponse = {
            items: adaptedItems,
            next_cursor: nextCursor,
            debug: {
              hours: ContentTimingManager.getNewsConfig().categoryHours, // 🎯 使用集中化配置 (channel_tags场景)
              template: 'channel_tags',
              sort_by: 'publish_time',
              site: response.meta.site || '',
              host: '',
              user_type: 'anonymous',
              strategy_type: 'fallback',
              channels: [currentChannelSlug],
              confidence_score: 0,
            }
          };
        } else {
        // 判断是否使用智能推荐（当没有标签时）
        const useSmartFeed = shouldUseSmartFeed(currentChannelSlug, confidenceScore);
        
        if (useSmartFeed) {
        // 使用智能推荐系统
        if (currentChannelSlug === "recommend") {
          // 根据置信度选择推荐策略
          const strategy = await getAnonymousStrategy(confidenceScore);
          // 首次请求带seen，后续用后端next_cursor
          const firstCursor = !isLoadMore && seenIdsRef.current.size > 0
            ? Buffer.from(JSON.stringify({ seen: Array.from(seenIdsRef.current) })).toString('base64')
            : undefined;
          feedResponse = await fetchFeedByStrategy(
            strategy.strategy,
            20,
            confidenceScore,
            isLoadMore ? (cursorRef.current || undefined) : firstCursor
          );
        } else {
          // 特定频道的智能推荐
          feedResponse = await fetchFeed({
            size: 20,
            channels: [currentChannelSlug],
            sort: "final_score",
            hours: ContentTimingManager.getChannelDefaultHours(), // 🎯 使用集中化配置
            cursor: isLoadMore ? (cursorRef.current || undefined) : undefined
          }, Array.from(seenIdsRef.current));
        }
      } else {
        // 使用传统新闻API：按当前频道（slug）获取新闻并适配为FeedResponse
        
        // 🔄 从cursor解析页码，如果没有cursor则从第1页开始
        let currentPage = 1;
        if (isLoadMore && cursorRef.current) {
          try {
            const cursorData = JSON.parse(Buffer.from(cursorRef.current, 'base64').toString());
            currentPage = cursorData.page || 1;
          } catch (e) {
            console.warn('Failed to parse cursor for traditional API:', e);
            currentPage = 1;
          }
        }
        
        const res = await getNews(currentChannelSlug, currentPage, 20);
        
        const adaptedItems: FeedItem[] = (res.data || []).map((item: any) => ({
          id: item.id,
          slug: item.slug,
          title: item.title,
          excerpt: item.excerpt || item.introduction || '暂无摘要',
          author: item.author || '编辑部',
          source: item.source || item.channel?.name || currentChannelSlug || '本站',  // 🔥 修复来源显示
          image_url: item.image_url || item.cover?.url,
          publish_time: item.publish_at,
          publish_at: item.publish_at,
          channel: item.channel || { slug: currentChannelSlug, name: currentChannelSlug },  // 🔥 修复频道信息
          is_featured: item.is_featured,
          final_score: 0,
        }));

        // 🔄 生成下一页的cursor（如果有下一页的话）
        const nextCursor = res.total && currentPage * 20 < res.total 
          ? Buffer.from(JSON.stringify({ page: currentPage + 1 })).toString('base64')
          : '';
        

        feedResponse = {
          items: adaptedItems,
          next_cursor: nextCursor,  // 🔥 修复：使用实际的分页cursor而不是空字符串
          debug: {
            hours: ContentTimingManager.getNewsConfig().categoryHours, // 🎯 使用集中化配置
            template: 'traditional_channel',
            sort_by: 'publish_time',
            site: getMainSite().hostname,
            host: endpoints.getCmsEndpoint(),
            user_type: 'anonymous',
            strategy_type: 'fallback',
            channels: [currentChannelSlug],
            confidence_score: 0.0,
            traditional_pagination: {
              current_page: currentPage,
              total_items: res.total,
              has_next: !!nextCursor
            }
          },
        } as FeedResponse;
        }
      }
      }

      // 预取本批次条目
      const newItems = feedResponse.items || [];

      // 将当前模块（例如头条、最新）中已展示的ID加入seen集合（首屏）
      try {
        // 从页面其他模块（若有）收集已展示ID，这里以当前newItems为例收集首屏；
        // 也可在渲染头条/最新后，分别push到 seenIdsRef.current
        if (!isLoadMore) {
          newItems.forEach((it) => {
            if (it && (it.id || it.slug)) {
              seenIdsRef.current.add(String(it.id || it.slug));
            }
          });
        }
      } catch {}

      // 更新新闻列表 - 前端去重以防止key冲突
      if (isLoadMore) {
        setNewsList(prev => {
          // 获取已存在的文章ID集合
          const existingIds = new Set(prev.map(item => item.id));
          // 过滤掉重复的文章
          const uniqueNewItems = newItems.filter(item => !existingIds.has(item.id));
          return [...prev, ...uniqueNewItems];
        });
      } else {
        setNewsList(newItems);
      }
      
      setFeedData(feedResponse);
      
      // 更新分页状态（将seen编码到cursor传给后端）
      setCursor(feedResponse.next_cursor || null);
      
      // hasMore判断：考虑去重后的实际情况
      // 如果去重后没有新文章，即使有next_cursor也应该停止
      const actualNewItemsCount = isLoadMore ? 
        newItems.filter(item => !newsList.some(existing => existing.id === item.id)).length : 
        newItems.length;
      
      // 只要后端给了next_cursor，就继续拉下一页；不要用“本批次去重后新增数”为继续条件
      const newHasMore = !!(feedResponse.next_cursor && feedResponse.next_cursor.trim() !== "");
      
      // 详细调试信息
      
      // 强制检查：如果返回0篇文章但有next_cursor，可能是状态不一致
      // 若返回0条但有next_cursor，允许继续请求下一页（让后端决策）
      
      setHasMore(newHasMore);
        
      

      // 加载更多处理
      
      // 更新推荐系统状态
      if (feedResponse.debug) {
        setRecommendationStrategy(feedResponse.debug.strategy_type || "fallback");
        setUserType(feedResponse.debug.user_type || "anonymous");
        setConfidenceScore(feedResponse.debug.confidence_score || 0);
      }

    } catch (error) {
      // 🚀 性能优化：忽略主动取消的请求（频道切换时）
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request cancelled (channel switch)');
        return; // 直接返回，不更新状态
      }
      
      console.error('Failed to load smart feed:', error);
      if (!isLoadMore) {
        setNewsList([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      // 清除超时定时器
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    }
  }, [currentChannelSlug, confidenceScore, categoryMode, categorySlug, categoryName, tags]); 

  // 加载更多文章
  const loadMoreArticles = useCallback(async () => {
    const now = Date.now();
    
    // 防止过于频繁的请求（至少间隔1秒）
    if (now - lastLoadTimeRef.current < 1000) {
      return;
    }
    
    
    if (loadingMore || !hasMore) {
      return;
    }
    
    // 额外检查：如果没有cursor，说明已经加载完了
    if (!cursorRef.current) {
      setHasMore(false);
      return;
    }
    
    
    lastLoadTimeRef.current = now;
    
    try {
      await loadSmartFeed(true);
    } catch (error) {
      console.error('❌ 加载更多失败:', error);
      setLoadingMore(false); // 确保重置loading状态
    }
  }, [loadingMore, hasMore, loadSmartFeed, cursor, newsList.length]);

  // 页面不再直接拉取最热，改由模块 MostRead 负责；仅通过模块 props 注入 excludeClusterIds

  // 加载今日头条新闻
  const loadHeadlineNews = useCallback(async () => {
    try {
      // 获取今日的新闻，按发布时间排序，取前4条
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      
      // 使用传统新闻API获取今日新闻
      const response = await getNews("recommend", 1, 4); // 获取前4条新闻
      
      // 过滤今日的新闻
      const todayNews = response.data.filter((item: any) => {
        const publishDate = new Date(item.publish_at);
        return publishDate >= startOfDay && publishDate < endOfDay;
      });
      
      // 如果今日没有新闻，回退到最新的新闻
      const sourceItems = todayNews.length > 0 ? todayNews : response.data.slice(0, 4);

      // 转换为FeedItem格式
      const headlineItems: FeedItem[] = sourceItems.map((item: any) => ({
        id: item.id,
        slug: item.slug,
        title: item.title,
        excerpt: item.excerpt,
        author: item.author,
        source: item.source,
        image_url: item.image_url || item.cover?.url,
        publish_time: item.publish_at,
        publish_at: item.publish_at,
        channel: item.channel,
        is_featured: item.is_featured,
        final_score: 0
      }));
      
      setHeadlineNews(headlineItems);
    } catch (error) {
      console.error('Failed to load headline news:', error);
      setHeadlineNews([]);
    }
  }, []);

  // 初始化数据加载
  useEffect(() => {
    loadSmartFeed();
    loadHeadlineNews();
  }, [loadSmartFeed, loadHeadlineNews]);

  // 页面加载完成后的状态检查
  useEffect(() => {
    if (!loading && newsList.length > 0) {
    }
  }, [loading, newsList.length, hasMore, loadingMore]);

  // 滚动监听 - 无限滚动
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout | null = null;
    
    const handleScroll = () => {
      // 清除之前的定时器
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      
      // 添加防抖，100ms后执行
      scrollTimeout = setTimeout(() => {
        const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = Math.max(
          document.documentElement.offsetHeight,
          document.documentElement.scrollHeight,
          document.body.offsetHeight,
          document.body.scrollHeight
        );
        const distanceFromBottom = documentHeight - (scrollTop + windowHeight);
        
        // 更严格的触发条件：只有在有更多数据且没有正在加载时才触发
        const shouldTriggerLoad = distanceFromBottom <= 1500 && hasMore && !loadingMore && !loading;
        
        if (shouldTriggerLoad) {
          // 直接调用loadMoreArticles，避免依赖问题
          loadMoreArticles();
        } else if (distanceFromBottom <= 1500) {
          // 记录为什么没有触发加载
          
          // 强制检查：如果hasMore为true但没有cursor，说明状态不一致
          if (hasMore && !cursorRef.current) {
            setHasMore(false);
          }
        }
      }, 100);
    };

    // 添加多个滚动监听器以确保兼容性
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });
    
    // 页面加载完成后立即检查一次
    setTimeout(() => {
      if (!loading && !loadingMore) {
        handleScroll();
      }
    }, 1000);
    
    return () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll);
    };
  }, [hasMore, loadingMore, loading, newsList.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // 🎯 新架构：频道切换时重置滚动状态
  useEffect(() => {
    setCursor(null);
    setHasMore(true);
    // 🔥 清理已看过的文章ID，确保新频道内容不受影响
    seenIdsRef.current.clear();
    loadSmartFeed();
  }, [currentChannelSlug, tags, loadSmartFeed]);

  // 加载模块配置（映射到本地模块键）
  useEffect(() => {
    const mapToLocalKey = (key: string): string | null => {
      const m: Record<string, string | null> = {
        hero: null, // 头条新闻已在首页顶部，禁用hero模块避免编辑推荐重复
        rank: "most-read",
        ranking: "most-read", // 站点设置中的ranking映射
        "local-news": null, // 不需要地区切换
        "local-events": null, // 本地事件模块禁用
        "top-news": "editors-choice", // 避免重复头条，改为编辑推荐
        "editors-choice": "editors-choice",
        "top-split-headlines": "top-split-headlines",
        ads: null, // 广告模块禁用
      };
      return m[key] || null;
    };

    const fetchModules = async () => {
      try {
        const [homeRes, sideRes] = await Promise.all([
          fetch('/api/frontend/modules?region=home&type=portal', { next: { revalidate: 600 } }),
          fetch('/api/frontend/modules?region=sidebar&type=portal', { next: { revalidate: 600 } }),
        ]);

        const homeJson = homeRes.ok ? await homeRes.json() : { modules: [] };
        const sideJson = sideRes.ok ? await sideRes.json() : { modules: [] };

        const homeList: { key: string; variant?: string; custom?: any }[] = (homeJson.modules || []).map((m: any) => ({ key: m.key, variant: m.default, custom: m.custom }));
        const sideList: { key: string; variant?: string; custom?: any }[] = (sideJson.modules || []).map((m: any) => ({ key: m.key, variant: m.default, custom: m.custom }));

        const mappedTop = homeList
          .map(m => ({ local: mapToLocalKey(m.key), src: m }))
          .filter(m => !!m.local)
          .map(m => ({ key: m.local as string, props: mapProps(m.local as string, m.src) }));

        let mappedSidebar = sideList
          .map(m => ({ local: mapToLocalKey(m.key), src: m }))
          .filter(m => !!m.local)
          .map(m => ({ key: m.local as string, props: mapProps(m.local as string, m.src) }));

        // 避免模块重复：检查顶部已有的模块，侧栏不再重复显示
        const topKeys = new Set(mappedTop.map(i => i.key));
        mappedSidebar = mappedSidebar.filter(i => !topKeys.has(i.key));

        // 保证侧栏关键模块存在：若缺失则追加；避免重复
        const sidebarKeys = new Set(mappedSidebar.map(i => i.key));
        if (!sidebarKeys.has("most-read")) {
          mappedSidebar.unshift({ key: "most-read", props: {} });
        }
        // 移除region-switcher - 不需要地区切换功能

        // 兜底：若接口完全无模块，则使用默认顺序（头条新闻已在首页顶部显示）
        // 过滤掉重复的头条相关模块，顶部不再显示编辑推荐（避免与侧边栏重复）
        const filteredTop = mappedTop.filter(m => 
          !['today-headlines', 'top-split-headlines'].includes(m.key)
        );
        setTopModules(filteredTop.length ? filteredTop : []);
        setSidebarModules(mappedSidebar.length ? mappedSidebar : [
          { key: "most-read" },
        ]);
      } catch (e) {
        console.warn('Load frontend modules failed, using fallback.', e);
        // 顶部不设置默认模块，避免与侧边栏重复
        setTopModules([]);
        setSidebarModules([{ key: "most-read" }]);
      }
    };

    // 辅助：将后端模块参数映射到本地模块 props
    function mapProps(localKey: string, src: any) {
      // 允许通过 ?duration / ?limit 等下发，也可走 src.custom 字段
      const props: any = {};
      if (localKey === "most-read") {
        if (src?.custom?.limit) props.limit = Number(src.custom.limit);
      }
      // today-headlines 相关props处理已移除 - 模块已迁移至首页顶部
      if (localKey === "editors-choice") {
        if (src?.custom?.limit) props.limit = Math.max(1, Math.min(Number(src.custom.limit), 6));
      }
      if (localKey === "top-split-headlines") {
        if (src?.custom?.count) props.count = Math.max(1, Math.min(Number(src.custom.count), 4));
        if (src?.custom?.autoPlayMs) props.autoPlayMs = Math.max(1000, Number(src.custom.autoPlayMs));
      }
      return props;
    }

    fetchModules();
  }, []);

  return (
    <>
      <style>{customStyles}</style>
      <section className="pb-6">
        {/* 顶部区域模块 - 来自配置或回退 */}
        <div className="my-2">
          <ModuleRenderer modules={topModules} />
        </div>
        {/* 智能推荐系统状态指示器 */}
        {feedData && (
          <ModuleRenderer modules={[{ key: "strategy-bar", props: {
            strategy: getStrategyDisplayName(recommendationStrategy),
            userType,
            confidence: confidenceScore,
            description: getStrategyDescription(recommendationStrategy, confidenceScore)
          }}]} />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 主要内容区域 - 智能推荐新闻流 */}
          <div className="lg:col-span-2 space-y-4 order-1">
            {/* 新闻流标题 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🧠</span>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">智能推荐</h2>
                    <p className="text-sm text-gray-600">
                      基于{getStrategyDisplayName(recommendationStrategy)}为您精选内容
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-blue-600">
                    {newsList.length} 篇文章
                  </div>
                  <div className="text-xs text-gray-500">
                    置信度: {(confidenceScore * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>

            {/* 智能推荐新闻流 */}
            {loading ? (
              <div className="space-y-4">
                {[...Array(6)].map((_, i) => (
                  <NewsSkeleton key={i} />
                ))}
              </div>
            ) : newsList.length > 0 ? (
              <div className="space-y-4">
                {/* 前两条重要文章作为头条新闻 */}
                {newsList.slice(0, 2).map((news, index) => (
                  <div key={`headline-news-${news.id}-${index}`} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    {news.image_url && (
                      <div className="relative h-48 w-full">
                        <Image
                          src={news.image_url}
                          alt={news.title}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute top-4 left-4">
                          <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-medium">
                            头条
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="p-6">
                      <h3 className="news-title-large mb-3 line-clamp-2">
                        <a
                          href={news.slug ? `/portal/article/${news.slug}` : (news.id ? `/portal/article/${news.id}` : (news.url || "/portal"))}
                          {...adaptiveLinkProps}
                          className="hover:text-red-500 transition-colors"
                          onClick={() => handleArticleClick(news.slug || news.id)}
                        >
                          {news.title}
                        </a>
                      </h3>
                      <p className="news-excerpt mb-4 line-clamp-2">
                        {news.excerpt || '暂无摘要'}
                      </p>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center space-x-4">
                          <span>{news.source || news.author || '未知来源'}</span>
                          <span>{formatDateTime(news.publish_time || news.publish_at)}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {news.is_featured && (
                            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">
                              精选
                            </span>
                          )}
                          {news.final_score && news.final_score > 50 && (
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                              高分
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* 其余文章使用现代化列表样式 */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  {newsList.slice(2).map((news, index) => (
                    <ModernNewsItem 
                      key={`modern-news-${news.id}-${index}`}
                      news={news}
                      onArticleClick={handleArticleClick}
                      index={index + 2}
                      showInteractions={true}
                    />
                  ))}
                </div>
              </div>
            ) : (
              // 空状态显示
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                          d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">暂无新闻内容</h3>
                <p className="text-gray-500 mb-6">当前没有可用的新闻内容，请稍后再试或切换其他频道。</p>
                <div className="space-y-2 text-sm text-gray-400">
                  <p>📊 推荐策略: {recommendationStrategy}</p>
                  <p>👤 用户类型: {userType}</p>
                  <p>🎯 置信度: {(confidenceScore * 100).toFixed(0)}%</p>
                </div>
              </div>
            )}

            {/* 加载更多状态 */}
            {loadingMore && (
              <div className="flex justify-center items-center py-8">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="text-gray-600">加载更多内容...</span>
                </div>
                {/* 调试信息 */}
                <div className="ml-4 text-xs text-gray-400">
                  Debug: loadingMore={loadingMore.toString()}, hasMore={hasMore.toString()}
                </div>
              </div>
            )}

            {/* 没有更多内容 */}
            {!hasMore && newsList.length > 0 && !loading && (
              <div className="text-center py-8 text-gray-500">
                <p>已加载全部内容</p>
              </div>
            )}

            {/* 手动加载更多按钮 */}
            {hasMore && !loading && !loadingMore && newsList.length > 0 && (
              <div className="text-center mt-8">
                <button
                  onClick={loadMoreArticles}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  加载更多
                </button>
              </div>
            )}


          </div>

          {/* 侧边栏 */}
          <div className="space-y-6 order-2">
            {/* 侧边栏模块 - 来自配置或回退 */}
            <ModuleRenderer modules={sidebarModules} />

            {/* 其他侧栏模块按需继续追加 */}

            {/* 热门话题模块已移除，保持侧栏布局一致 */}

            {/* 编辑推荐 */}
            <EditorsChoice 
              loading={loading}
              onArticleClick={handleArticleClick}
            />
          </div>
        </div>
      </section>
    </>
  );
}
