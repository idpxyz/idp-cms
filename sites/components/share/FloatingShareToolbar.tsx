"use client";

import React, { useState, useRef, useEffect } from "react";

interface FloatingShareToolbarProps {
  shareLink: string;
  shareTitle: string;
  sharePic?: string;
  shareDesc?: string;
}

export default function FloatingShareToolbar({
  shareLink,
  shareTitle,
  sharePic = "",
  shareDesc = "",
}: FloatingShareToolbarProps) {
  const [wechatOpen, setWeChatOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const wechatRef = useRef<HTMLDivElement>(null);

  const handleShareWeibo = () => {
    const picParam = sharePic ? "&pic=" + encodeURIComponent(sharePic) : "";
    const url = `https://service.weibo.com/share/share.php?url=${encodeURIComponent(shareLink)}&title=${encodeURIComponent(shareTitle)}${picParam}`;
    window.open(url, "_blank", "height=550,width=750,top=100,left=100");
  };

  const handleShareQQ = () => {
    const picsParam = sharePic ? "&pics=" + encodeURIComponent(sharePic) : "";
    const url = `https://connect.qq.com/widget/shareqq/index.html?url=${encodeURIComponent(shareLink)}&title=${encodeURIComponent(shareTitle)}&desc=${encodeURIComponent(shareDesc)}&summary=${encodeURIComponent(shareDesc)}${picsParam}`;
    window.open(url, "_blank", "height=550,width=750,top=100,left=100");
  };

  const toggleWeChat = () => setWeChatOpen((v) => !v);

  const handleNativeShare = async () => {
    try {
      // @ts-ignore
      if (navigator && navigator.share) {
        // @ts-ignore
        await navigator.share({ title: shareTitle, text: shareDesc, url: shareLink });
      } else {
        handleShareWeibo();
      }
    } catch (e) {
      // 用户取消等情况无需处理
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    // 可以添加提示
  };

  // 监听滚动状态
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      setIsScrolled(scrollTop > 100); // 滚动超过100px时显示背景框
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 点击外部关闭微信二维码
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wechatRef.current && !wechatRef.current.contains(e.target as Node)) {
        setWeChatOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div className="flex flex-col items-center space-y-3">
          {/* 微信分享 */}
          <div className="relative" ref={wechatRef}>
            <button 
              onClick={toggleWeChat} 
              className="flex items-center justify-center w-10 h-10 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-full transition-all duration-200 group"
              title="微信分享"
            >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.298c-.115.379.21.747.619.644l1.171-.292a.63.63 0 0 1 .622.163c.729.6 1.668.922 2.691.922.22 0 .438-.012.649-.034-.269-.588-.419-1.234-.419-1.916 0-3.491 3.139-6.324 7.008-6.324.3 0 .593.018.879.052C15.216 4.15 12.054 2.188 8.691 2.188z"/>
              <path d="M6.785 11.077c.417 0 .755-.338.755-.755s-.338-.755-.755-.755-.755.338-.755.755.338.755.755.755zm3.812 0c.417 0 .755-.338.755-.755s-.338-.755-.755-.755-.755.338-.755.755.338.755.755.755z"/>
              <path d="M16.5 9.5c-3.038 0-5.5 2.014-5.5 4.5s2.462 4.5 5.5 4.5c.44 0 .875-.061 1.277-.169l2.599.65c.319.08.63-.196.492-.492l-.650-1.463c1.044-.85 1.782-2.098 1.782-3.526 0-2.486-2.462-4.5-5.5-4.5zm-2.125 3.094c-.276 0-.5-.224-.5-.5s.224-.5.5-.5.5.224.5.5-.224.5-.5.5zm4.25 0c-.276 0-.5-.224-.5-.5s.224-.5.5-.5.5.224.5.5-.224.5-.5.5z"/>
            </svg>
          </button>
          {wechatOpen && (
            <>
              {/* 背景遮罩 */}
              <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={toggleWeChat}></div>
              {/* 微信分享弹窗 */}
              <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 p-6 bg-white rounded-lg shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">微信分享</h3>
                  <button 
                    onClick={toggleWeChat}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="text-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareLink)}`}
                    alt="微信扫码分享"
                    className="w-48 h-48 mx-auto mb-4 border border-gray-100 rounded"
                  />
                  <div className="text-sm text-gray-600 font-medium mb-1">
                    微信扫码分享
                  </div>
                  <div className="text-xs text-gray-400">
                    使用微信"扫一扫"功能扫描二维码
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 微博分享 */}
        <button 
          onClick={handleShareWeibo} 
          className="flex items-center justify-center w-10 h-10 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full transition-all duration-200"
          title="微博分享"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9.294 14.135c-.102.44-.31.83-.622 1.17-.312.34-.7.51-1.164.51-.464 0-.852-.17-1.164-.51-.312-.34-.52-.73-.622-1.17-.102-.44-.051-.83.153-1.17.204-.34.51-.51.918-.51.408 0 .714.17.918.51.204.34.255.73.153 1.17zm4.706-1.17c-.204-.34-.51-.51-.918-.51-.408 0-.714.17-.918.51-.204.34-.255.73-.153 1.17.102.44.31.83.622 1.17.312.34.7.51 1.164.51.464 0 .852-.17 1.164-.51.312-.34.52-.73.622-1.17.102-.44.051-.83-.153-1.17zM12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z"/>
          </svg>
        </button>

        {/* QQ分享 */}
        <button 
          onClick={handleShareQQ} 
          className="flex items-center justify-center w-10 h-10 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-all duration-200"
          title="QQ分享"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.04c-5.5 0-10 3.58-10 8.0 0 1.54.46 2.98 1.26 4.26-.1.57-.27 1.28-.27 1.28s.32-.13.82-.37c1.02.39 2.16.6 3.35.6 5.5 0 10-3.58 10-8.0s-4.5-8.0-10-8.0zm-3.5 10.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm7 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
          </svg>
        </button>

        {/* 复制链接 */}
        <button 
          onClick={handleCopyLink}
          className="flex items-center justify-center w-10 h-10 text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-full transition-all duration-200"
          title="复制链接"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>

        {/* 更多分享 */}
        <button 
          onClick={handleNativeShare} 
          className="flex items-center justify-center w-10 h-10 text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-full transition-all duration-200"
          title="更多分享"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
          </svg>
        </button>
    </div>
  );
}
