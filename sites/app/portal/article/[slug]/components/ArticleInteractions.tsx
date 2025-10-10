"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { useInteraction } from "@/lib/context/InteractionContext";

interface ArticleInteractionsProps {
  articleId: number;
  articleTitle: string;
  articleSlug: string;
  channelSlug: string;
}

/**
 * 文章交互组件 - 客户端组件
 * 负责点赞、收藏、分享等交互功能
 */
export default function ArticleInteractions({
  articleId,
  articleTitle,
  articleSlug,
  channelSlug,
}: ArticleInteractionsProps) {
  const { isAuthenticated } = useAuth();
  const { toggleLike, toggleFavorite, getArticleInteraction, refreshArticleStats } = useInteraction();
  
  const [isInteracting, setIsInteracting] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [qrCodeModalOpen, setQrCodeModalOpen] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // 获取文章互动状态
  const articleInteraction = getArticleInteraction(articleId.toString());

  // 🚀 性能优化：初始化文章统计数据（仅在数据不存在时请求）
  useEffect(() => {
    // 检查是否已有统计数据，避免重复请求
    // 使用可选链操作符避免类型错误
    if (!(articleInteraction as any).statsLoaded) {
      refreshArticleStats(articleId.toString());
    }
  }, [articleId, refreshArticleStats]);

  // Toast 提示
  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  };

  // 点赞处理
  const handleLike = async () => {
    if (!isAuthenticated) {
      showToast("请先登录", "error");
      return;
    }
    if (isInteracting) return;
    
    setIsInteracting(true);
    const result = await toggleLike(articleId.toString());
    setIsInteracting(false);
    
    if (result.success) {
      showToast(articleInteraction.isLiked ? "已取消点赞" : "点赞成功！");
    } else {
      showToast(result.error || "操作失败", "error");
    }
  };

  // 收藏处理
  const handleFavorite = async () => {
    if (!isAuthenticated) {
      showToast("请先登录", "error");
      return;
    }
    if (isInteracting) return;
    
    setIsInteracting(true);
    const result = await toggleFavorite(articleId.toString(), {
      title: articleTitle,
      slug: articleSlug,
      channel: channelSlug,
    });
    setIsInteracting(false);
    
    if (result.success) {
      showToast(articleInteraction.isFavorited ? "已取消收藏" : "收藏成功！");
    } else {
      showToast(result.error || "操作失败", "error");
    }
  };

  // 分享处理
  const getShareUrl = () => {
    if (typeof window === "undefined") return "";
    const currentUrl = window.location.href;
    if (currentUrl.includes("localhost") || currentUrl.includes("127.0.0.1")) {
      const path = window.location.pathname + window.location.search;
      return `https://idp.example.com${path}`;
    }
    return currentUrl;
  };

  const handleShare = async () => {
    const shareUrl = getShareUrl();
    const canUseNativeShare =
      "share" in navigator &&
      /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (canUseNativeShare) {
      try {
        await navigator.share({
          title: articleTitle,
          url: shareUrl,
        });
        showToast("分享成功！");
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setShareModalOpen(true);
        }
      }
    } else {
      setShareModalOpen(true);
    }
  };

  const handleCopyLink = async () => {
    const shareUrl = getShareUrl();
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast("链接已复制到剪贴板");
      setShareModalOpen(false);
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      showToast("链接已复制到剪贴板");
      setShareModalOpen(false);
    }
  };

  const handleSocialShare = (platform: string) => {
    const shareUrl = getShareUrl();
    const url = encodeURIComponent(shareUrl);
    const title = encodeURIComponent(articleTitle);

    const shareUrls: { [key: string]: string } = {
      weibo: `https://service.weibo.com/share/share.php?url=${url}&title=${title}`,
      qq: `https://connect.qq.com/widget/shareqq/index.html?url=${url}&title=${title}`,
      qzone: `https://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?url=${url}&title=${title}`,
      douban: `https://www.douban.com/share/service?href=${url}&name=${title}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      twitter: `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    };

    const targetUrl = shareUrls[platform];
    if (targetUrl) {
      window.open(targetUrl, "_blank", "width=600,height=400");
      setShareModalOpen(false);
    }
  };

  const handleWechatShare = async () => {
    const isWechat = /micromessenger/i.test(navigator.userAgent);
    if (isWechat) {
      showToast("请点击右上角分享到朋友圈或发送给朋友");
      setShareModalOpen(false);
    } else {
      const shareUrl = getShareUrl();
      try {
        // @ts-ignore - qrcode 类型定义问题
        const QRCode = (await import("qrcode")).default;
        const qrDataUrl = await QRCode.toDataURL(shareUrl, {
          width: 300,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        });
        setQrCodeDataUrl(qrDataUrl);
        setQrCodeModalOpen(true);
        setShareModalOpen(false);
      } catch (error) {
        showToast("生成二维码失败", "error");
      }
    }
  };

  // 评论点击
  const handleCommentClick = () => {
    const commentSection = document.querySelector("[data-comment-section]");
    if (commentSection) {
      const offsetTop = commentSection.getBoundingClientRect().top + window.pageYOffset - 80;
      window.scrollTo({
        top: offsetTop,
        behavior: "smooth",
      });
    }
  };

  return (
    <>
      {/* 交互按钮栏 */}
      <div className="px-6 md:px-12 py-2 bg-white">
        <div className="flex items-center justify-between">
          {/* 左侧：点赞、收藏、评论 */}
          <div className="flex items-center space-x-4">
            {/* 点赞 */}
            <button
              onClick={handleLike}
              disabled={isInteracting}
              className={`
                flex items-center space-x-2 px-4 py-2 rounded-full transition-all min-w-[100px]
                ${
                  articleInteraction.isLiked
                    ? "bg-red-50 text-red-600 hover:bg-red-100"
                    : "bg-white text-gray-600 hover:bg-gray-100 hover:text-red-600"
                }
                ${isInteracting ? "opacity-50 cursor-not-allowed" : ""}
                shadow-sm
              `}
            >
              <svg
                className={`w-5 h-5 ${articleInteraction.isLiked ? "fill-current" : ""}`}
                fill={articleInteraction.isLiked ? "currentColor" : "none"}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              <span className="text-sm font-medium">
                {isInteracting ? '...' : articleInteraction.likeCount > 0 ? `点赞 ${articleInteraction.likeCount}` : '点赞'}
              </span>
            </button>

            {/* 收藏 */}
            <button
              onClick={handleFavorite}
              disabled={isInteracting}
              className={`
                flex items-center space-x-2 px-4 py-2 rounded-full transition-all min-w-[100px]
                ${
                  articleInteraction.isFavorited
                    ? "bg-yellow-50 text-yellow-600 hover:bg-yellow-100"
                    : "bg-white text-gray-600 hover:bg-gray-100 hover:text-yellow-600"
                }
                ${isInteracting ? "opacity-50 cursor-not-allowed" : ""}
                shadow-sm
              `}
            >
              <svg
                className={`w-5 h-5 ${articleInteraction.isFavorited ? "fill-current" : ""}`}
                fill={articleInteraction.isFavorited ? "currentColor" : "none"}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
              <span className="text-sm font-medium">
                {isInteracting ? '...' : articleInteraction.favoriteCount > 0 ? `收藏 ${articleInteraction.favoriteCount}` : '收藏'}
              </span>
            </button>

            {/* 评论 */}
            <button
              onClick={handleCommentClick}
              className="flex items-center space-x-2 px-4 py-2 rounded-full bg-white text-gray-600 hover:bg-gray-100 hover:text-blue-600 transition-all shadow-sm min-w-[100px]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <span className="text-sm font-medium">
                {articleInteraction.commentCount > 0 ? `评论 ${articleInteraction.commentCount}` : '评论'}
              </span>
            </button>
          </div>

          {/* 右侧：分享 */}
          <button
            onClick={handleShare}
            className="flex items-center space-x-2 px-4 py-2 rounded-full bg-white text-gray-600 hover:bg-gray-100 hover:text-green-600 transition-all shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
            <span className="text-sm font-medium">分享</span>
          </button>
        </div>
      </div>

      {/* Toast 提示 */}
      {toastVisible && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-down">
          <div
            className={`
            px-6 py-3 rounded-lg shadow-lg
            ${toastType === "success" ? "bg-green-500" : "bg-red-500"}
            text-white font-medium
          `}
          >
            {toastMessage}
          </div>
        </div>
      )}

      {/* 分享模态框 */}
      {shareModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={() => setShareModalOpen(false)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">分享文章</h3>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <button
                onClick={() => handleWechatShare()}
                className="flex flex-col items-center p-3 rounded hover:bg-gray-100"
              >
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mb-2">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8.5 12a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm7 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
                  </svg>
                </div>
                <span className="text-xs text-gray-600">微信</span>
              </button>

              <button
                onClick={() => handleSocialShare("weibo")}
                className="flex flex-col items-center p-3 rounded hover:bg-gray-100"
              >
                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mb-2">
                  <span className="text-white font-bold">微</span>
                </div>
                <span className="text-xs text-gray-600">微博</span>
              </button>

              <button
                onClick={() => handleSocialShare("qq")}
                className="flex flex-col items-center p-3 rounded hover:bg-gray-100"
              >
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mb-2">
                  <span className="text-white font-bold">QQ</span>
                </div>
                <span className="text-xs text-gray-600">QQ</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="flex flex-col items-center p-3 rounded hover:bg-gray-100"
              >
                <div className="w-12 h-12 bg-gray-500 rounded-full flex items-center justify-center mb-2">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                </div>
                <span className="text-xs text-gray-600">复制</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 二维码模态框 */}
      {qrCodeModalOpen && qrCodeDataUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={() => setQrCodeModalOpen(false)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">微信扫码分享</h3>
            <img src={qrCodeDataUrl} alt="QR Code" className="mx-auto mb-4" />
            <p className="text-sm text-gray-600">使用微信扫一扫分享给朋友</p>
          </div>
        </div>
      )}
    </>
  );
}

