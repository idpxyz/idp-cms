'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import { useChannels } from '../ChannelContext';
import SocialTemplateLoading from '../templates/channels/SocialTemplateLoading';

interface ChannelPageWrapperProps {
  channelSlug: string;
  children: ReactNode;
}

/**
 * 🎨 频道页面包装器 (客户端组件)
 * 
 * 功能：
 * - 监听频道切换
 * - 切换时立即显示骨架屏（隐藏旧内容）
 * - 提供流畅的过渡效果
 */
export default function ChannelPageWrapper({ 
  channelSlug, 
  children 
}: ChannelPageWrapperProps) {
  const { isNavigating } = useChannels();
  const [displayedSlug, setDisplayedSlug] = useState(channelSlug);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // 🎯 监听频道变化
  useEffect(() => {
    if (channelSlug !== displayedSlug) {
      // 立即显示过渡状态（骨架屏）
      setIsTransitioning(true);
      
      // 短暂延迟后切换到新频道内容
      // 这确保骨架屏至少显示 100ms，提供视觉连续性
      const timer = setTimeout(() => {
        setDisplayedSlug(channelSlug);
        setIsTransitioning(false);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [channelSlug, displayedSlug]);

  // 🎯 如果正在过渡或导航，显示骨架屏
  if (isTransitioning || isNavigating) {
    return <SocialTemplateLoading />;
  }

  // 🎯 只有当频道匹配时才显示内容
  // 这防止了旧内容闪现
  if (displayedSlug !== channelSlug) {
    return <SocialTemplateLoading />;
  }

  // 📄 显示实际内容
  return <>{children}</>;
}

