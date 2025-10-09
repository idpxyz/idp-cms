'use client';

import React from 'react';
import Link from 'next/link';
import ChannelLink from '../../../components/ChannelLink';

interface ArticleBreadcrumbProps {
  channelSlug: string;
  channelName: string;
}

/**
 * 文章面包屑导航 - 客户端组件
 * 确保频道链接的交互性正常工作
 */
export default function ArticleBreadcrumb({ 
  channelSlug, 
  channelName 
}: ArticleBreadcrumbProps) {
  return (
    <div className="flex items-center text-sm">
      <Link href="/portal" className="text-gray-500 hover:text-gray-700">
        首页
      </Link>
      <span className="mx-2 text-gray-400">/</span>
      <ChannelLink
        channelSlug={channelSlug}
        className="text-gray-500 hover:text-gray-700"
      >
        {channelName || "新闻"}
      </ChannelLink>
      <span className="mx-2 text-gray-400">/</span>
      <span className="text-gray-700">正文</span>
    </div>
  );
}

