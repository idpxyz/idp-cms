'use client';

import React, { ReactNode, useState, useEffect } from 'react';
import { useChannels } from '../ChannelContext';
import SocialTemplateLoading from '../templates/channels/SocialTemplateLoading';
import RecommendTemplateLoading from '../templates/channels/RecommendTemplateLoading';

interface ChannelPageWrapperProps {
  channelSlug: string;
  children: ReactNode;
}

/**
 * 🎨 频道页面包装器 (客户端组件)
 * 
 * 功能：
 * - 监听频道切换
 * - 🚀 性能优化：骨架屏立即覆盖，旧组件在后台异步卸载
 * - 解决推荐频道卸载慢的问题（700ms 卸载时间不阻塞用户）
 */
export default function ChannelPageWrapper({ 
  channelSlug, 
  children 
}: ChannelPageWrapperProps) {
  const { isNavigating } = useChannels();
  const [showSkeleton, setShowSkeleton] = useState(isNavigating);
  
  // 🚀 性能优化：导航时立即显示骨架屏覆盖层
  // 旧组件（如推荐频道的 NewsContent）在骨架屏下方异步卸载，不阻塞UI
  useEffect(() => {
    if (isNavigating) {
      // 立即显示骨架屏
      setShowSkeleton(true);
    } else {
      // 导航完成后，延迟一帧再隐藏骨架屏
      // 让新内容有时间开始渲染
      requestAnimationFrame(() => {
        setShowSkeleton(false);
      });
    }
  }, [isNavigating]);
  
  // 🎯 根据频道类型选择对应的骨架屏组件
  const SkeletonComponent = channelSlug === 'recommend' 
    ? RecommendTemplateLoading 
    : SocialTemplateLoading;
  
  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {/* 骨架屏覆盖层 - 导航时立即显示，完全覆盖旧内容 */}
      {showSkeleton && (
        <div 
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0,
            zIndex: 100, 
            background: 'white',
          }}
        >
          <SkeletonComponent />
        </div>
      )}
      
      {/* 实际内容 - 在骨架屏下方，卸载过程对用户不可见 */}
      <div style={{ 
        opacity: showSkeleton ? 0 : 1,
        transition: 'opacity 0.15s ease-out',
        pointerEvents: showSkeleton ? 'none' : 'auto'  // 骨架屏显示时禁用交互
      }}>
        {children}
      </div>
    </div>
  );
}

