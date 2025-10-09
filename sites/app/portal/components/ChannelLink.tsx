'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface ChannelLinkProps {
  channelSlug: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * 客户端频道链接组件
 * 
 * 使用 Next.js router.push 进行页面跳转
 * 简单可靠，适用于所有场景（文章页、频道页等）
 */
export default function ChannelLink({ 
  channelSlug, 
  children, 
  className = '',
  onClick 
}: ChannelLinkProps) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    
    // 构造目标URL
    const targetUrl = channelSlug === 'recommend' 
      ? '/portal' 
      : `/portal?channel=${channelSlug}`;
    
    console.log('ChannelLink clicked:', { channelSlug, targetUrl });
    
    // 使用 router.push 进行跳转
    router.push(targetUrl);
    
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

