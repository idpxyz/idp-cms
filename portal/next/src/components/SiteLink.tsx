'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { smartSiteParam } from '@/lib/siteDetection';

interface SiteLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  [key: string]: any; // 支持其他Link组件的props
}

/**
 * 智能站点链接组件
 * 自动处理站点参数，无需手动调用withCurrentSiteParam
 */
export default function SiteLink({
  href,
  children,
  className,
  onClick,
  ...props
}: SiteLinkProps) {
  const processedHref = smartSiteParam(href);

  return (
    <Link
      href={processedHref}
      className={className}
      onClick={onClick}
      {...props}
    >
      {children}
    </Link>
  );
}

/**
 * 站点按钮组件 - 用于需要onClick事件的场景
 */
export function SiteButton({
  href,
  children,
  className,
  onClick,
  ...props
}: SiteLinkProps) {
  const processedHref = smartSiteParam(href);

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick();
    }
    // 可以在这里添加其他逻辑，比如跟踪点击事件
  };

  return (
    <button className={className} onClick={handleClick} {...props}>
      {children}
    </button>
  );
}
