"use client";

import React, { useState, useEffect, useRef } from "react";
import { useReadingHistory } from "@/lib/hooks/useReadingHistory";
import { trackPageView, trackDwell } from "@/lib/tracking/analytics";
import { useChannels } from "@/app/portal/ChannelContext";

interface ReadingTrackerProps {
  articleId: number;
  articleTitle: string;
  articleSlug: string;
  channelSlug: string;
}

/**
 * 阅读追踪组件 - 客户端组件
 * 负责阅读进度、停留时间追踪、历史记录等
 */
export default function ReadingTracker({
  articleId,
  articleTitle,
  articleSlug,
  channelSlug,
}: ReadingTrackerProps) {
  const { addToHistory } = useReadingHistory();
  const { switchChannel, channels } = useChannels();
  const [readingProgress, setReadingProgress] = useState(0);
  const [readingStartTime] = useState(Date.now());
  const [currentReadDuration, setCurrentReadDuration] = useState(0);

  // 使用 useRef 获取最新的值，避免闭包问题
  const latestProgressRef = useRef(0);
  const latestDurationRef = useRef(0);

  // 🎯 设置当前频道，确保频道导航高亮正确
  useEffect(() => {
    if (channelSlug && channelSlug !== 'unknown' && channels.length > 0) {
      const channel = channels.find(ch => ch.slug === channelSlug);
      if (channel) {
        switchChannel(channel.id);
      }
    }
  }, [channelSlug, channels, switchChannel]);

  // 页面访问追踪
  useEffect(() => {
    trackPageView(articleId.toString(), channelSlug);

    return () => {
      if (latestDurationRef.current > 0) {
        trackDwell(
          articleId.toString(),
          latestDurationRef.current * 1000, // 转换为毫秒
          channelSlug
        );
      }
    };
  }, [articleId, channelSlug]);

  // 阅读进度追踪
  useEffect(() => {
    const calculateReadingProgress = () => {
      const contentElement = document.querySelector("[data-article-content]") as HTMLElement;
      if (!contentElement) return 0;

      const contentRect = contentElement.getBoundingClientRect();
      const contentHeight = contentElement.scrollHeight;
      const viewportHeight = window.innerHeight;
      const scrollTop = window.pageYOffset;

      const contentTop = contentElement.offsetTop;
      const scrolledFromTop = Math.max(0, scrollTop - contentTop + viewportHeight);
      const readableHeight = contentHeight;
      const progress = Math.min(100, Math.max(0, (scrolledFromTop / readableHeight) * 100));

      return Math.round(progress);
    };

    const handleScroll = () => {
      const progress = calculateReadingProgress();
      setReadingProgress(progress);
      latestProgressRef.current = progress;

      const currentTime = Date.now();
      const duration = Math.round((currentTime - readingStartTime) / 1000);
      setCurrentReadDuration(duration);
      latestDurationRef.current = duration;
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // 初始计算

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [readingStartTime]);

  // 阅读历史记录
  useEffect(() => {
    // 5秒后首次记录阅读历史
    const initialTimer = setTimeout(async () => {
      try {
        const historyData = {
          articleId: articleId.toString(),
          articleTitle,
          articleSlug,
          articleChannel: channelSlug,
          readProgress: latestProgressRef.current,
          readDuration: latestDurationRef.current,
        };
        await addToHistory(historyData);
      } catch (error) {
        console.error("Failed to add initial reading history:", error);
      }
    }, 5000);

    // 每30秒更新一次阅读历史
    const updateTimer = setInterval(async () => {
      if (latestDurationRef.current >= 5) {
        try {
          const historyData = {
            articleId: articleId.toString(),
            articleTitle,
            articleSlug,
            articleChannel: channelSlug,
            readProgress: latestProgressRef.current,
            readDuration: latestDurationRef.current,
          };
          await addToHistory(historyData);
        } catch (error) {
          console.error("Failed to update reading history:", error);
        }
      }
    }, 30000);

    // 页面卸载前最后一次记录
    const handleBeforeUnload = async () => {
      if (latestDurationRef.current >= 5) {
        const finalData = {
          articleId: articleId.toString(),
          articleTitle,
          articleSlug,
          articleChannel: channelSlug,
          readProgress: latestProgressRef.current,
          readDuration: latestDurationRef.current,
        };

        // 使用 sendBeacon 确保数据发送
        if (navigator.sendBeacon) {
          const blob = new Blob([JSON.stringify(finalData)], {
            type: "application/json",
          });
          navigator.sendBeacon("/api/reading-history", blob);
        } else {
          await addToHistory(finalData);
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(updateTimer);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [articleId, articleTitle, articleSlug, channelSlug, addToHistory]);

  return (
    <>
      {/* 阅读进度条 */}
      {readingProgress > 0 && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-200">
          <div
            className="h-full bg-red-500 transition-all duration-300"
            style={{ width: `${readingProgress}%` }}
          />
        </div>
      )}

      {/* 阅读统计（仅用于调试，可移除） */}
      {process.env.NODE_ENV === "development" && (
        <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white text-xs px-3 py-2 rounded shadow-lg z-40">
          <div>进度: {readingProgress}%</div>
          <div>时长: {Math.floor(currentReadDuration / 60)}分{currentReadDuration % 60}秒</div>
        </div>
      )}
    </>
  );
}

