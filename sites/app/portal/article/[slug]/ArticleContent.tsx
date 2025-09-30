"use client";

import React, { useEffect, useState, useRef } from "react";
// @ts-ignore
import QRCode from 'qrcode';
import "../../../../styles/article.css";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trackPageView, trackDwell } from "@/lib/tracking/analytics";
import { useIntersectionObserver } from "@/lib/hooks/useIntersectionObserver";
import { formatDateTimeFull, formatDateTime } from "@/lib/utils/date";
import { useChannels } from "../../ChannelContext";
import TableOfContents from "./TableOfContents";
import { useInteraction } from "@/lib/context/InteractionContext";
import { useAuth } from "@/lib/context/AuthContext";
import CommentSection from "./CommentSection";
import { useReadingHistory } from "@/lib/hooks/useReadingHistory";
import RecommendedArticles from "../../components/RecommendedArticles";

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
  const [readingStartTime, setReadingStartTime] = useState<number | null>(null);
  const [currentReadDuration, setCurrentReadDuration] = useState(0);
  
  
  // 使用useRef获取最新的值，避免闭包问题
  const latestProgressRef = useRef(0);
  const latestDurationRef = useRef(0);
  
  // 获取文章互动状态
  const articleInteraction = getArticleInteraction(article.id.toString());
  const [isInteracting, setIsInteracting] = useState(false);
  
  // 初始化文章统计数据
  useEffect(() => {
    refreshArticleStats(article.id.toString());
  }, [article.id, refreshArticleStats]);

  // 阅读进度和时长追踪
  useEffect(() => {
    if (!isAuthenticated || !article) return;

    // 开始计时
    const startTime = Date.now();
    setReadingStartTime(startTime);

    // 计算文章内容的阅读进度
    const calculateReadingProgress = () => {
      const contentElement = document.querySelector('[data-article-content]') as HTMLElement;
      if (!contentElement) return 0;

      const contentRect = contentElement.getBoundingClientRect();
      const contentHeight = contentElement.scrollHeight;
      const viewportHeight = window.innerHeight;
      const scrollTop = window.pageYOffset;
      
      // 计算内容区域在视口中的位置
      const contentTop = contentElement.offsetTop;
      const contentBottom = contentTop + contentHeight;
      
      // 计算用户已经阅读的内容百分比
      const scrolledFromTop = Math.max(0, scrollTop - contentTop + viewportHeight);
      const readableHeight = contentHeight;
      const progress = Math.min(100, Math.max(0, (scrolledFromTop / readableHeight) * 100));
      
      return Math.round(progress);
    };

    // 滚动监听器
    const handleScroll = () => {
      const progress = calculateReadingProgress();
      setReadingProgress(progress);
      latestProgressRef.current = progress;
      
      // 更新当前阅读时长
      const currentTime = Date.now();
      const duration = Math.round((currentTime - startTime) / 1000); // 秒
      setCurrentReadDuration(duration);
      latestDurationRef.current = duration;
    };

    // 初始计算
    handleScroll();
    
    // 添加滚动监听
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // 定期更新阅读时长
    const durationTimer = setInterval(() => {
      const currentTime = Date.now();
      const duration = Math.round((currentTime - startTime) / 1000);
      setCurrentReadDuration(duration);
      latestDurationRef.current = duration;
    }, 1000);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearInterval(durationTimer);
    };
  }, [isAuthenticated, article]);

  // 记录阅读历史 - 只在用户认证和文章加载时触发一次
  useEffect(() => {
    if (!isAuthenticated || !article) return;


    let initialRecorded = false;

    // 初始记录（3秒后）
    const initialTimer = setTimeout(async () => {
      try {
        const historyData = {
          articleId: article.id.toString(),
          articleTitle: article.title,
          articleSlug: article.slug,
          articleChannel: article.channel?.name || '未知',
          readDuration: latestDurationRef.current, // 使用真实的阅读时长
          readProgress: Math.max(latestProgressRef.current, 5), // 至少5%的基础进度
        };
        
        const success = await addToHistory(historyData);
        
        if (success) {
          initialRecorded = true;
        }
      } catch (error) {
        // 静默处理错误
      }
    }, 3000);

    // 定期更新阅读进度（每30秒）
    const updateTimer = setInterval(async () => {
      if (initialRecorded && latestDurationRef.current > 5) {
        
        try {
          await addToHistory({
            articleId: article.id.toString(),
            articleTitle: article.title,
            articleSlug: article.slug,
            articleChannel: article.channel?.name || '未知',
            readDuration: latestDurationRef.current,
            readProgress: latestProgressRef.current,
          });
        } catch (error) {
          // 静默处理错误
        }
      }
    }, 30000); // 每30秒更新一次

    // 页面卸载时最终更新
    const handleBeforeUnload = async () => {
      if (initialRecorded && latestDurationRef.current > 5) {
        const finalData = {
          articleId: article.id.toString(),
          articleTitle: article.title,
          articleSlug: article.slug,
          articleChannel: article.channel?.name || '未知',
          readDuration: latestDurationRef.current,
          readProgress: latestProgressRef.current,
        };
        
        try {
          await addToHistory(finalData);
        } catch (error) {
          // 静默处理错误
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(updateTimer);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isAuthenticated, article]); // ❗ 关键修复：移除会变化的依赖项

  // 处理点赞
  const handleLike = async () => {
    if (!isAuthenticated) {
      showToast('请先登录', 'error');
      return;
    }

    setIsInteracting(true);
    const result = await toggleLike(article.id.toString());
    
    if (!result.success && result.error) {
      showToast(result.error, 'error');
    }
    
    setIsInteracting(false);
  };

  // 处理收藏
  const handleFavorite = async () => {
    if (!isAuthenticated) {
      showToast('请先登录', 'error');
      return;
    }

    setIsInteracting(true);
    const result = await toggleFavorite(article.id.toString(), {
      title: article.title,
      slug: article.slug,
      channel: article.channel?.name || '未分类',
    });
    
    if (!result.success && result.error) {
      showToast(result.error, 'error');
    }
    
    setIsInteracting(false);
  };

  // 分享弹窗状态
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [qrCodeModalOpen, setQrCodeModalOpen] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  
  // Toast 通知状态
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // 显示 Toast 通知
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    
    // 3秒后自动隐藏
    setTimeout(() => {
      setToastVisible(false);
    }, 3000);
  };

  // 处理分享
  const handleShare = async () => {
    const shareUrl = getShareUrl();
    
    // 检查是否支持原生分享且在HTTPS环境下
    const canUseNativeShare = 'share' in navigator && 
      window.location.protocol === 'https:' && 
      typeof navigator.share === 'function';

    if (canUseNativeShare) {
      try {
        await navigator.share({
          title: article.title,
          text: article.excerpt || '',
          url: shareUrl,
        });
      } catch (error) {
        console.log('用户取消分享或分享失败:', error);
        // 如果原生分享失败，打开自定义分享弹窗
        setShareModalOpen(true);
      }
    } else {
      // 打开自定义分享弹窗
      setShareModalOpen(true);
    }
  };

  // 复制链接
  const handleCopyLink = async () => {
    const shareUrl = getShareUrl();
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast('链接已复制到剪贴板！', 'success');
      setShareModalOpen(false);
    } catch (error) {
      // 降级处理：手动选择文本
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        showToast('链接已复制到剪贴板！', 'success');
        setShareModalOpen(false);
      } catch (e) {
        showToast('复制失败，请手动复制链接', 'error');
      }
      document.body.removeChild(textArea);
    }
  };

  // 社交媒体分享
  const handleSocialShare = (platform: string) => {
    const shareUrl = getShareUrl();
    const url = encodeURIComponent(shareUrl);
    const title = encodeURIComponent(article.title);
    const text = encodeURIComponent(article.excerpt || article.title);
    
    let targetUrl = '';
    
    switch (platform) {
      case 'weibo':
        targetUrl = `https://service.weibo.com/share/share.php?url=${url}&title=${text}`;
        break;
      case 'qq':
        targetUrl = `https://connect.qq.com/widget/shareqq/index.html?url=${url}&title=${title}&summary=${text}`;
        break;
      case 'qzone':
        targetUrl = `https://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?url=${url}&title=${title}&summary=${text}`;
        break;
      case 'douban':
        targetUrl = `https://www.douban.com/share/service?href=${url}&name=${title}&text=${text}`;
        break;
      case 'wechat':
        // 微信分享：显示二维码或提示
        handleWechatShare();
        return;
      default:
        return;
    }
    
    window.open(targetUrl, '_blank', 'width=600,height=400');
    setShareModalOpen(false);
  };

  // 生成真实的二维码 - 使用本地qrcode库
  const generateRealQRCode = async (text: string): Promise<string> => {
    try {
      const qrDataUrl = await QRCode.toDataURL(text, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      return qrDataUrl;
    } catch (error) {
      console.error('生成二维码失败:', error);
      return '';
    }
  };

  // 获取分享URL - 确保使用正确的域名
  const getShareUrl = () => {
    // 在生产环境使用实际域名，开发环境可以使用localhost
    const currentUrl = window.location.href;
    
    // 如果是localhost，替换为生产域名
    if (currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1')) {
      const path = window.location.pathname + window.location.search;
      // 这里需要替换为您的实际生产域名
      return `https://aivoya.com${path}`;
    }
    
    return currentUrl;
  };

  // 微信分享处理 - 显示二维码
  const handleWechatShare = () => {
    // 检查是否在微信浏览器中
    const isWechat = /micromessenger/i.test(navigator.userAgent);
    
    if (isWechat) {
      // 在微信中，提示用户使用右上角分享
      showToast('请点击右上角的"..."按钮，然后选择分享给朋友或分享到朋友圈', 'success');
    } else {
      // 不在微信中，生成并显示二维码
      const shareUrl = getShareUrl();
      generateRealQRCode(shareUrl).then(qrDataUrl => {
        setQrCodeDataUrl(qrDataUrl);
        setQrCodeModalOpen(true);
      });
    }
    setShareModalOpen(false);
  };

  // 处理评论按钮点击 - 滚动到评论区
  const handleCommentClick = () => {
    const commentSection = document.querySelector('[data-comment-section]');
    if (commentSection) {
      // 平滑滚动到评论区，留一些顶部空间
      const offsetTop = commentSection.getBoundingClientRect().top + window.pageYOffset - 80;
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      });
    }
  };

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
      // ⚡ 性能优化：使用直接路由跳转，避免复杂的switchChannel逻辑
      const url = channelSlug === 'recommend' ? '/portal' : `/portal?channel=${channelSlug}`;
      router.push(url);
    }
  };

  return (
    <div className="bg-gray-50">
      {/* Toast 通知 */}
      {toastVisible && (
        <div className={`fixed top-4 right-4 z-50 max-w-sm w-full bg-white border-l-4 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out ${
          toastType === 'success' ? 'border-green-400' : 'border-red-400'
        }`}>
          <div className="flex items-center p-4">
            <div className={`flex-shrink-0 w-6 h-6 mr-3 ${toastType === 'success' ? 'text-green-400' : 'text-red-400'}`}>
              {toastType === 'success' ? (
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <p className={`text-sm font-medium ${toastType === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                {toastMessage}
              </p>
            </div>
            <button
              onClick={() => setToastVisible(false)}
              className={`ml-3 flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 阅读进度条 */}
      <div className="reading-progress">
        <div 
          className="reading-progress-bar" 
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      {/* 分享弹窗 */}
      {shareModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShareModalOpen(false)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">分享文章</h3>
              <button 
                onClick={() => setShareModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              {/* 复制链接 */}
              <button 
                onClick={handleCopyLink}
                className="w-full flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-gray-900">复制链接</div>
                  <div className="text-sm text-gray-500">复制文章链接到剪贴板</div>
                </div>
              </button>

              {/* 社交媒体分享 */}
              <div className="grid grid-cols-3 gap-2">
                {/* 微信分享 */}
                <button 
                  onClick={() => handleSocialShare('wechat')}
                  className="flex flex-col items-center p-3 rounded-lg border border-gray-200 hover:bg-green-50 hover:border-green-300 transition-colors"
                >
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mb-1">
                    <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 6.093-1.615-.54-3.547-4.077-6.061-8.836-6.061zM5.785 5.991c.642 0 1.162.529 1.162 1.18 0 .659-.52 1.188-1.162 1.188-.642 0-1.162-.53-1.162-1.188 0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18 0 .659-.52 1.188-1.162 1.188-.642 0-1.162-.53-1.162-1.188 0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.248 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.82c-.001-.437.013-.878.098-1.308.12-.552.31-1.098.609-1.617z"/>
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-gray-900">微信</span>
                </button>

                {/* 微博分享 */}
                <button 
                  onClick={() => handleSocialShare('weibo')}
                  className="flex flex-col items-center p-3 rounded-lg border border-gray-200 hover:bg-red-50 hover:border-red-300 transition-colors"
                >
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mb-1">
                    <span className="text-red-600 font-bold text-lg">微</span>
                  </div>
                  <span className="text-xs font-medium text-gray-900">微博</span>
                </button>

                {/* QQ分享 */}
                <button 
                  onClick={() => handleSocialShare('qq')}
                  className="flex flex-col items-center p-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-1">
                    <span className="text-blue-600 font-bold text-sm">QQ</span>
                  </div>
                  <span className="text-xs font-medium text-gray-900">QQ</span>
                </button>

                {/* QQ空间分享 */}
                <button 
                  onClick={() => handleSocialShare('qzone')}
                  className="flex flex-col items-center p-3 rounded-lg border border-gray-200 hover:bg-yellow-50 hover:border-yellow-300 transition-colors"
                >
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center mb-1">
                    <span className="text-yellow-600 font-bold text-xs">空间</span>
                  </div>
                  <span className="text-xs font-medium text-gray-900">QQ空间</span>
                </button>

                {/* 豆瓣分享 */}
                <button 
                  onClick={() => handleSocialShare('douban')}
                  className="flex flex-col items-center p-3 rounded-lg border border-gray-200 hover:bg-green-50 hover:border-green-300 transition-colors"
                >
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mb-1">
                    <span className="text-green-600 font-bold text-lg">豆</span>
                  </div>
                  <span className="text-xs font-medium text-gray-900">豆瓣</span>
                </button>

                {/* 钉钉分享 - 工作场景 */}
                <button 
                  onClick={() => {
                    handleCopyLink();
                    showToast('链接已复制！您可以在钉钉中发送给同事或群聊', 'success');
                  }}
                  className="flex flex-col items-center p-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-1">
                    <span className="text-blue-600 font-bold text-lg">钉</span>
                  </div>
                  <span className="text-xs font-medium text-gray-900">钉钉</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 微信二维码弹窗 */}
      {qrCodeModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setQrCodeModalOpen(false)}>
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">微信分享</h3>
              <button 
                onClick={() => setQrCodeModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="text-center">
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="微信分享二维码"
                    width={200}
                    height={200}
                    className="mx-auto border border-gray-200 rounded-lg"
                  />
                ) : (
                  <div className="w-48 h-48 mx-auto bg-gray-200 rounded-lg flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-2">使用微信扫一扫</p>
              <p className="text-xs text-gray-500 mb-4">扫描二维码在微信中打开文章</p>
              
              <button 
                onClick={async () => {
                  const shareUrl = getShareUrl();
                  try {
                    await navigator.clipboard.writeText(shareUrl);
                    showToast('链接已复制到剪贴板！可发送到微信', 'success');
                  } catch (error) {
                    showToast('复制失败，请手动复制链接', 'error');
                  }
                  setQrCodeModalOpen(false);
                }}
                className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                复制链接到微信
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 全屏封面图片 */}
      {(article.image_url || article.cover?.url) && (
        <div className="w-full">
          <div className="relative aspect-[21/9] w-full overflow-hidden">
            <Image
              src={article.image_url || article.cover?.url}
              alt={article.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
              priority
            />
            {/* 图片上的渐变遮罩 */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
            
            {/* 图片上的标题信息 */}
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <div className="max-w-7xl mx-auto">
                <div className="mb-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-600 text-white">
                    {article.channel?.name || "未知频道"}
                  </span>
                </div>
                <h1 className="text-2xl md:text-4xl font-bold mb-2 drop-shadow-lg">
                  {article.title}
                </h1>
                <div className="flex items-center text-sm opacity-90">
                  <span>{article.author}</span>
                  <span className="mx-2">•</span>
                  <span>{formatDateTimeFull(article.publish_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 面包屑导航 - 与文章内容宽度完全一致 */}
      <nav className="py-2">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
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
            </div>
          </div>
        </div>
      </nav>

      <div className="py-2">
        <div className="max-w-7xl mx-auto px-4">
          {/* 主内容和右侧栏容器 - 智能布局 */}
          <div className={`grid grid-cols-1 gap-6 ${
            (relatedArticles && relatedArticles.length > 0) 
              ? 'lg:grid-cols-3' 
              : 'lg:grid-cols-1'
          }`}>
            {/* 主内容列 */}
            <div className={
              (relatedArticles && relatedArticles.length > 0) 
                ? 'lg:col-span-2' 
                : 'lg:col-span-1'
            }>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* 文章头部 */}
            <div className="p-6">
              {/* 频道标签 - 只在无封面图片时显示 */}
              {!(article.image_url || article.cover?.url) && (
                <div className="mb-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {article.channel?.name || "未知频道"}
                  </span>
                </div>
              )}

              {/* 文章标题 - 只在无封面图片时显示 */}
              {!(article.image_url || article.cover?.url) && (
                <h1 className="text-2xl font-bold text-gray-900 mb-3 leading-tight">
                  {article.title}
                </h1>
              )}

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
                <button 
                  onClick={handleCommentClick}
                  className="flex items-center space-x-2 px-4 py-2 rounded-full bg-gray-100 hover:bg-yellow-50 hover:text-yellow-600 transition-colors"
                >
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
                className="article-content max-w-none prose prose-lg max-w-full"
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
              <RecommendedArticles 
                articleSlug={article.slug} 
                currentChannel={article.channel?.name}
                limit={6}
              />

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
              <div className="lg:col-span-2 mt-8" data-comment-section>
                <CommentSection 
                  articleId={article.id.toString()} 
                  commentCount={articleInteraction.commentCount}
                  onCommentCountChange={(count) => {
                    // 更新文章互动状态中的评论数
                    updateCommentCount(article.id.toString(), count);
                  }}
                />
              </div>
              </div>
              
              {/* 右侧栏 - 仅在有相关文章时显示 */}
              {(relatedArticles && relatedArticles.length > 0) && (
                <aside className="lg:col-span-1">
                  {/* 右侧栏粘性容器 - 统一对齐 */}
                  <div className="sticky top-24 space-y-6">
                    {/* 文章目录 */}
                    <TableOfContents content={article.content} />
                    
                    {/* 相关文章 */}
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
                  </div>
                </aside>
              )}
            </div>
          </div>
        </div>
      </div>
  );
}