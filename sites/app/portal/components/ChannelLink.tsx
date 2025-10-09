'use client';

import React from 'react';
import { useChannels } from '../ChannelContext';
import { usePathname } from 'next/navigation';

interface ChannelLinkProps {
  channelSlug: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * 客户端频道链接组件
 * 
 * 🎯 使用 ChannelContext 的 switchChannel 进行频道切换
 * - 在频道页内：使用 switchChannel（纯客户端切换，性能最优）
 * - 在其他页面：使用标准链接导航到频道页
 */
export default function ChannelLink({ 
  channelSlug, 
  children, 
  className = '',
  onClick 
}: ChannelLinkProps) {
  const { switchChannel } = useChannels();
  const pathname = usePathname();
  
  // 判断是否在频道页内
  const isInPortalPage = pathname === '/portal' || pathname === '/portal/';

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // 如果在频道页内，使用 Context 切换（性能优化，无刷新）
    if (isInPortalPage) {
      e.preventDefault();
      e.stopPropagation();
      switchChannel(channelSlug);
      
      // 如果有额外的 onClick 回调，也执行它
      if (onClick) {
        onClick();
      }
    }
    // 否则使用标准链接导航（让浏览器处理）
    else {
      // 不阻止默认行为，让 <a> 标签的 href 处理导航
      if (onClick) {
        onClick();
      }
    }
  };

  const href = channelSlug === 'recommend' ? '/portal' : `/portal?channel=${channelSlug}`;

  return (
    <a
      href={href}
      onClick={handleClick}
      className={className}
      style={{ cursor: 'pointer' }}
      data-channel-slug={channelSlug}
    >
      {children}
    </a>
  );
}

