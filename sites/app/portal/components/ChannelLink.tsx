'use client';

import React from 'react';
import { useChannels } from '../ChannelContext';

interface ChannelLinkProps {
  channelSlug: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * 客户端频道链接组件
 * 使用 ChannelContext 进行快速频道切换，而不是传统的页面跳转
 */
export default function ChannelLink({ 
  channelSlug, 
  children, 
  className = '',
  onClick 
}: ChannelLinkProps) {
  const { switchChannel } = useChannels();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    
    // 调用 switchChannel 进行客户端频道切换
    switchChannel(channelSlug);
    
    // 如果有额外的 onClick 回调，也执行它
    if (onClick) {
      onClick();
    }
  };

  return (
    <a
      href={`/portal?channel=${channelSlug}`}
      onClick={handleClick}
      className={className}
    >
      {children}
    </a>
  );
}

