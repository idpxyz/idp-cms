'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Clock,
  Eye,
  Tag,
  ExternalLink,
  Share2,
  Bookmark,
  Heart,
  MessageCircle,
  Twitter,
  Facebook,
  Linkedin,
  Link as LinkIcon,
  TrendingUp,
  Star,
} from 'lucide-react';
import Navigation from '@/components/Navigation';
import { AINews } from '@/types/ai';
import { aiNewsApi } from '@/lib/aiApiService';
import { track } from '@/lib/track';
import { useSiteRouter } from '@/hooks/useSiteRouter';

export default function NewsDetailPage() {
  const params = useParams();
  const router = useSiteRouter();
  const [news, setNews] = useState<AINews | null>(null);
  const [relatedNews, setRelatedNews] = useState<AINews[]>([]);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 阅读跟踪相关状态
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [hasTrackedView, setHasTrackedView] = useState(false);

  useEffect(() => {
    const loadNewsDetail = async () => {
      try {
        const newsId = parseInt(params.id as string);
        if (isNaN(newsId)) {
          setError('无效的新闻ID');
          return;
        }

        // 如果点击的是同一篇新闻，不需要重新加载
        if (news && news.id === newsId) {
          return;
        }

        // 如果点击的是不同新闻，显示局部loading
        if (news) {
          setLoading(true);
        } else {
          setLoading(true);
        }

        setError(null);

        const response = await aiNewsApi.getNewsDetail(newsId);

        // 记录页面加载 (impression)
        track('impression', [newsId.toString()]);

        // 更新阅读数量
        let updatedReadCount = response.read_count;
        try {
          // 获取CSRF token
          const csrfToken = document.cookie
            .split('; ')
            .find((row) => row.startsWith('csrftoken='))
            ?.split('=')[1];

          const readResponse = await fetch(`/api/ai-news/${newsId}/read`, {
            method: 'POST',
            headers: {
              'X-Site-ID': 'localhost',
              'X-CSRFToken': csrfToken || '',
              'Content-Type': 'application/json',
            },
          });

          if (readResponse.ok) {
            const result = await readResponse.json();
            // 更新前端状态中的阅读数量
            if (result.success) {
              updatedReadCount = result.new_read_count;
            }
          }
        } catch (error) {
          console.warn('Failed to update read count:', error);
        }

        // 创建新的对象，确保React能检测到状态变化
        const updatedResponse = {
          ...response,
          read_count: updatedReadCount,
        };

        setNews(updatedResponse);
        setRelatedNews(updatedResponse.related_news || []);

        // 重置计时器
        setStartTime(Date.now());
        setHasTrackedView(false);
      } catch (error) {
        console.error('Failed to load news detail:', error);
        setError('新闻内容加载失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      loadNewsDetail();
    }
  }, [params.id]);

  // 阅读时间跟踪
  useEffect(() => {
    if (!news || hasTrackedView) return;

    // 5秒后记录为有效阅读 (view)
    const viewTimer = setTimeout(() => {
      const dwellTime = Date.now() - startTime;
      track('view', [news.id.toString()], dwellTime);
      setHasTrackedView(true);
    }, 5000);

    // 页面卸载时记录停留时间
    const handleBeforeUnload = () => {
      if (!hasTrackedView) {
        const dwellTime = Date.now() - startTime;
        track('view', [news.id.toString()], dwellTime);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearTimeout(viewTimer);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [news, startTime, hasTrackedView]);

  if (loading && !news) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="pt-16 text-center py-12">
          <div className="text-gray-400 mb-4">
            <Clock className="w-16 h-16 mx-auto animate-spin" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">加载中...</h3>
          <p className="text-gray-600">正在获取新闻详情...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="pt-16 text-center py-12">
          <div className="text-red-400 mb-4">
            <Clock className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">加载失败</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  if (!news) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="pt-16 text-center py-12">
          <div className="text-gray-400 mb-4">
            <Clock className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">新闻不存在</h3>
          <p className="text-gray-600 mb-4">找不到指定的新闻内容</p>
          <button
            onClick={() => router.push('/news')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            返回资讯列表
          </button>
        </div>
      </div>
    );
  }

  const handleBack = () => {
    router.original.back();
  };

  const handleShare = () => {
    // 跟踪分享操作
    if (news) {
      track('share', [news.id.toString()], undefined, 'native');
    }

    if (navigator.share) {
      navigator.share({
        title: news.title,
        text: news.introduction,
        url: window.location.href,
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('链接已复制到剪贴板');
    }
  };

  const handleBookmark = () => {
    const newBookmarkState = !isBookmarked;
    setIsBookmarked(newBookmarkState);

    // 跟踪书签操作
    if (news) {
      track(newBookmarkState ? 'bookmark' : 'unbookmark', [news.id.toString()]);
    }
  };

  const handleLike = () => {
    const newLikeState = !isLiked;
    setIsLiked(newLikeState);

    // 跟踪点赞操作
    if (news) {
      track(newLikeState ? 'like' : 'unlike', [news.id.toString()]);
    }
  };

  // 智能内容格式检测和渲染
  const detectContentFormat = (
    content: string
  ): 'html' | 'markdown' | 'plaintext' => {
    if (
      content.includes('<p>') ||
      content.includes('<div>') ||
      content.includes('<h')
    ) {
      return 'html';
    }
    if (
      content.includes('##') ||
      content.includes('###') ||
      content.match(/- .+/g)
    ) {
      return 'markdown';
    }
    return 'plaintext';
  };

  const formatMarkdownContent = (content: string) => {
    return content.split('\n').map((line, index) => {
      if (line.startsWith('## ')) {
        return (
          <h2
            key={index}
            className="text-2xl font-bold text-gray-900 mt-8 mb-4"
          >
            {line.substring(3)}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        return (
          <h3
            key={index}
            className="text-xl font-semibold text-gray-900 mt-6 mb-3"
          >
            {line.substring(4)}
          </h3>
        );
      } else if (line.startsWith('- ')) {
        return (
          <li key={index} className="ml-6 text-gray-700 mb-2">
            {line.substring(2)}
          </li>
        );
      } else if (line.startsWith('| ')) {
        return (
          <tr key={index} className="border-b border-gray-200">
            {line
              .split('|')
              .slice(1, -1)
              .map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-2 text-gray-700">
                  {cell.trim()}
                </td>
              ))}
          </tr>
        );
      } else if (line.trim() === '') {
        return <br key={index} />;
      } else {
        return (
          <p key={index} className="text-gray-700 leading-relaxed mb-4">
            {line}
          </p>
        );
      }
    });
  };

  const formatPlaintextContent = (content: string) => {
    return content.split('\n').map((line, index) => {
      if (line.trim() === '') {
        return <br key={index} />;
      }
      return (
        <p key={index} className="text-gray-700 leading-relaxed mb-4">
          {line}
        </p>
      );
    });
  };

  const renderContent = (content: string) => {
    const format = detectContentFormat(content);

    switch (format) {
      case 'html':
        return (
          <div
            dangerouslySetInnerHTML={{ __html: content }}
            className="text-gray-700 leading-relaxed [&>p]:mb-4 [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:mt-8 [&>h1]:mb-4 [&>h2]:text-xl [&>h2]:font-semibold [&>h2]:mt-6 [&>h2]:mb-3 [&>ul]:ml-6 [&>li]:mb-2"
          />
        );
      case 'markdown':
        return <div>{formatMarkdownContent(content)}</div>;
      case 'plaintext':
        return <div>{formatPlaintextContent(content)}</div>;
      default:
        return <p className="text-gray-700">{content}</p>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      {/* Back Button */}
      <section className="pt-16 pb-4 bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <button
            onClick={handleBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>返回资讯列表</span>
          </button>
        </div>
      </section>

      {/* News Content */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-3">
              <article className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden relative">
                {/* Loading Overlay - 只在有内容且正在加载时显示 */}
                {loading && news && (
                  <div className="absolute inset-0 bg-white bg-opacity-90 z-10 flex items-center justify-center rounded-lg">
                    <div className="text-center">
                      <Clock className="w-8 h-8 mx-auto animate-spin text-blue-600 mb-2" />
                      <p className="text-sm text-gray-600">正在加载新内容...</p>
                    </div>
                  </div>
                )}

                {/* Header */}
                <div className="p-8 border-b border-gray-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      {news.is_top && (
                        <span className="bg-yellow-100 text-yellow-800 text-xs px-3 py-1 rounded-full font-medium">
                          置顶
                        </span>
                      )}
                      {news.is_hot && (
                        <span className="bg-red-100 text-red-800 text-xs px-3 py-1 rounded-full font-medium">
                          热门
                        </span>
                      )}
                      <span className="text-sm text-gray-500">
                        {news.source}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleBookmark}
                        className={`p-2 rounded-lg transition-colors ${
                          isBookmarked
                            ? 'text-blue-600 bg-blue-50'
                            : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                        }`}
                      >
                        <Bookmark className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handleLike}
                        className={`p-2 rounded-lg transition-colors ${
                          isLiked
                            ? 'text-red-600 bg-red-50'
                            : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                        }`}
                      >
                        <Heart className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handleShare}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <h1 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">
                    {news.title}
                  </h1>

                  <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                    {news.introduction}
                  </p>

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-2" />
                        {news.last_published_at
                          ? new Date(news.last_published_at).toLocaleString()
                          : '未知时间'}
                      </span>
                      <span className="flex items-center">
                        <Eye className="w-4 h-4 mr-2" />
                        {news.read_count.toLocaleString()} 次阅读
                      </span>
                    </div>
                    <a
                      href={news.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      查看原文
                    </a>
                  </div>
                </div>

                {/* Content */}
                <div className="p-8">
                  <div className="prose prose-lg max-w-none">
                    {news.body && renderContent(news.body)}
                  </div>
                </div>

                {/* Tags */}
                <div className="px-8 pb-8">
                  <div className="flex items-center space-x-2 mb-4">
                    <Tag className="w-5 h-5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">
                      标签：
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {news.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-blue-100 hover:text-blue-700 transition-colors cursor-pointer"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Social Share */}
                <div className="px-8 pb-8 border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      分享到：
                    </span>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() =>
                          track(
                            'share',
                            [news.id.toString()],
                            undefined,
                            'twitter'
                          )
                        }
                        className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        <Twitter className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          track(
                            'share',
                            [news.id.toString()],
                            undefined,
                            'facebook'
                          )
                        }
                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Facebook className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          track(
                            'share',
                            [news.id.toString()],
                            undefined,
                            'linkedin'
                          )
                        }
                        className="p-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors"
                      >
                        <Linkedin className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleShare}
                        className="p-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        <LinkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="space-y-6">
                {/* Related News */}
                {relatedNews.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold mb-4 text-gray-900">
                      相关资讯
                    </h3>
                    <div className="space-y-4">
                      {relatedNews.map((related) => (
                        <div
                          key={related.id}
                          className="p-3 rounded-lg border border-gray-100 hover:border-blue-200 transition-colors cursor-pointer"
                          onClick={() => {
                            track('click', [related.id.toString()]);
                            // 使用 replace 而不是 push，避免在历史记录中创建新条目，同时保持站点参数
                            router.replace(`/news/${related.id}`);
                          }}
                        >
                          <h4 className="font-medium text-gray-900 text-sm mb-2 line-clamp-2 hover:text-blue-600 transition-colors">
                            {related.title}
                          </h4>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>{related.source}</span>
                            <span>
                              {related.last_published_at
                                ? new Date(
                                    related.last_published_at
                                  ).toLocaleDateString()
                                : '未知时间'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Popular Tags */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">
                    热门标签
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'AI技术',
                      '机器学习',
                      '深度学习',
                      '自然语言处理',
                      '计算机视觉',
                      'AI应用',
                      'AI工具',
                      'AI研究',
                    ].map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-blue-100 hover:text-blue-700 transition-colors cursor-pointer"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Subscribe */}
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg p-6 text-white">
                  <h3 className="text-lg font-semibold mb-2">订阅AI资讯</h3>
                  <p className="text-blue-100 text-sm mb-4">
                    第一时间获取最新AI动态和工具更新
                  </p>
                  <button className="w-full bg-white text-blue-600 py-2 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                    立即订阅
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
