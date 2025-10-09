/**
 * 🔗 自适应链接行为 Hook
 * 
 * 根据设备类型自动调整链接打开方式：
 * - 桌面端：新标签页打开 (target="_blank")
 * - 移动端/平板：当前页打开 (无 target)
 * 
 * 用户体验优化：
 * - 桌面：利用多标签浏览优势
 * - 移动：使用返回键导航更自然
 */

import { useState, useEffect, useMemo } from 'react';

interface AdaptiveLinkProps {
  /** 链接的 target 属性 */
  target?: string;
  /** 链接的 rel 属性 */
  rel?: string;
}

interface UseAdaptiveLinkOptions {
  /** 是否强制在桌面端打开新标签页（默认 true） */
  openInNewTabOnDesktop?: boolean;
  /** 是否强制在移动端打开新标签页（默认 false） */
  openInNewTabOnMobile?: boolean;
  /** 断点宽度，小于此宽度视为移动设备（默认 1024px） */
  breakpoint?: number;
}

/**
 * 检测是否为移动设备
 */
function isMobileDevice(breakpoint: number = 1024): boolean {
  // SSR 环境检测
  if (typeof window === 'undefined') {
    return false;
  }

  // 1. 屏幕宽度检测
  const isMobileWidth = window.innerWidth < breakpoint;

  // 2. 触摸设备检测
  const isTouchDevice = 
    'ontouchstart' in window || 
    navigator.maxTouchPoints > 0;

  // 3. User Agent 检测（辅助）
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const isMobileUA = mobileRegex.test(navigator.userAgent);

  // 综合判断：宽度小且支持触摸，或 UA 显示为移动设备
  return (isMobileWidth && isTouchDevice) || isMobileUA;
}

/**
 * 自适应链接 Hook
 * 
 * @example
 * ```tsx
 * const linkProps = useAdaptiveLink();
 * 
 * <a href="/article/123" {...linkProps}>
 *   文章标题
 * </a>
 * ```
 */
export function useAdaptiveLink(options: UseAdaptiveLinkOptions = {}): AdaptiveLinkProps {
  const {
    openInNewTabOnDesktop = true,
    openInNewTabOnMobile = false,
    breakpoint = 1024,
  } = options;

  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    // 初始检测
    setIsMobile(isMobileDevice(breakpoint));

    // 监听窗口大小变化
    const handleResize = () => {
      setIsMobile(isMobileDevice(breakpoint));
    };

    window.addEventListener('resize', handleResize);
    
    // 清理
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [breakpoint]);

  // 计算链接属性
  const linkProps = useMemo<AdaptiveLinkProps>(() => {
    const shouldOpenInNewTab = isMobile 
      ? openInNewTabOnMobile 
      : openInNewTabOnDesktop;

    if (shouldOpenInNewTab) {
      return {
        target: '_blank',
        rel: 'noopener noreferrer',
      };
    }

    return {};
  }, [isMobile, openInNewTabOnDesktop, openInNewTabOnMobile]);

  return linkProps;
}

/**
 * 服务端安全的自适应链接 Hook
 * 
 * 在 SSR 环境下默认返回桌面端行为，避免水合不匹配
 * 
 * @example
 * ```tsx
 * const linkProps = useAdaptiveLinkSSR();
 * ```
 */
export function useAdaptiveLinkSSR(options: UseAdaptiveLinkOptions = {}): AdaptiveLinkProps {
  const {
    openInNewTabOnDesktop = true,
    openInNewTabOnMobile = false,
    breakpoint = 1024,
  } = options;

  const [isMounted, setIsMounted] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
    setIsMobile(isMobileDevice(breakpoint));

    const handleResize = () => {
      setIsMobile(isMobileDevice(breakpoint));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  // SSR 或未挂载时，默认使用桌面端行为
  const linkProps = useMemo<AdaptiveLinkProps>(() => {
    if (!isMounted) {
      return openInNewTabOnDesktop 
        ? { target: '_blank', rel: 'noopener noreferrer' }
        : {};
    }

    const shouldOpenInNewTab = isMobile 
      ? openInNewTabOnMobile 
      : openInNewTabOnDesktop;

    return shouldOpenInNewTab 
      ? { target: '_blank', rel: 'noopener noreferrer' }
      : {};
  }, [isMounted, isMobile, openInNewTabOnDesktop, openInNewTabOnMobile]);

  return linkProps;
}

/**
 * 获取当前设备类型
 */
export function useDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    const updateDeviceType = () => {
      const width = window.innerWidth;
      
      if (width < 768) {
        setDeviceType('mobile');
      } else if (width < 1024) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
    };

    updateDeviceType();
    window.addEventListener('resize', updateDeviceType);
    
    return () => window.removeEventListener('resize', updateDeviceType);
  }, []);

  return deviceType;
}

/**
 * 高级自适应链接 Hook - 支持平板单独配置
 */
export function useAdaptiveLinkAdvanced(options: {
  desktop?: boolean;
  tablet?: boolean;
  mobile?: boolean;
} = {}): AdaptiveLinkProps {
  const {
    desktop = true,
    tablet = false,
    mobile = false,
  } = options;

  const deviceType = useDeviceType();

  const linkProps = useMemo<AdaptiveLinkProps>(() => {
    let shouldOpenInNewTab = false;

    switch (deviceType) {
      case 'desktop':
        shouldOpenInNewTab = desktop;
        break;
      case 'tablet':
        shouldOpenInNewTab = tablet;
        break;
      case 'mobile':
        shouldOpenInNewTab = mobile;
        break;
    }

    return shouldOpenInNewTab 
      ? { target: '_blank', rel: 'noopener noreferrer' }
      : {};
  }, [deviceType, desktop, tablet, mobile]);

  return linkProps;
}

