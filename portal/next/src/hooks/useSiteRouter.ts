'use client';

import { useRouter } from 'next/navigation';
import { smartSiteParam } from '@/lib/siteDetection';

/**
 * 增强的路由hook，自动处理站点参数
 * 替代手动调用withCurrentSiteParam
 */
export function useSiteRouter() {
  const router = useRouter();

  return {
    ...router,

    /**
     * 智能push - 自动添加站点参数
     */
    push: (url: string) => {
      const processedUrl = smartSiteParam(url);
      router.push(processedUrl);
    },

    /**
     * 智能replace - 自动添加站点参数
     */
    replace: (url: string) => {
      const processedUrl = smartSiteParam(url);
      router.replace(processedUrl);
    },

    /**
     * 智能prefetch - 自动添加站点参数
     */
    prefetch: (url: string) => {
      const processedUrl = smartSiteParam(url);
      router.prefetch(processedUrl);
    },

    /**
     * 获取处理后的URL（不进行导航）
     */
    getProcessedUrl: (url: string) => smartSiteParam(url),

    /**
     * 原始路由方法（当不需要站点参数时使用）
     */
    original: router,
  };
}
