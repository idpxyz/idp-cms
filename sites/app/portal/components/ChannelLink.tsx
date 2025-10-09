'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useChannels } from '../ChannelContext';

interface ChannelLinkProps {
  channelSlug: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * 客户端频道链接组件
 * 
 * 智能切换策略：
 * 1. 如果已在 /portal 页面：使用 ChannelContext 快速切换（纯客户端，无刷新）
 * 2. 如果在其他页面（如文章详情页）：使用 router.push 进行真实路由跳转
 */
export default function ChannelLink({ 
  channelSlug, 
  children, 
  className = '',
  onClick 
}: ChannelLinkProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { switchChannel } = useChannels();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    
    // 检查当前是否在 /portal 页面
    const isOnPortalPage = pathname === '/portal';
    
    if (isOnPortalPage) {
      // ✅ 已在频道页：使用快速客户端切换
      switchChannel(channelSlug);
    } else {
      // ✅ 在其他页面（如文章详情页）：需要真实路由跳转
      const targetUrl = channelSlug === 'recommend' 
        ? '/portal' 
        : `/portal?channel=${channelSlug}`;
      router.push(targetUrl);
    }
    
    // 如果有额外的 onClick 回调，也执行它
    if (onClick) {
      onClick();
    }
  };

  return (
    <a
      href={channelSlug === 'recommend' ? '/portal' : `/portal?channel=${channelSlug}`}
      onClick={handleClick}
      className={className}
    >
      {children}
    </a>
  );
}

