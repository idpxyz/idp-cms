/**
 * 频道导航工具函数
 * 
 * 按照项目规范：组件 + utils 模式
 * 参考：HeroCarousel.utils.ts, ChannelStrip.utils.ts
 */

import type { Channel } from '@/lib/api';

/**
 * 响应式断点配置
 * 基于主流新闻网站（CNN, BBC, 人民网等）的UX标准
 */
export const RESPONSIVE_BREAKPOINTS = {
  mobile: {
    minWidth: 0,
    maxWidth: 767,
    visibleCount: 0, // 全部使用汉堡菜单
  },
  tablet: {
    minWidth: 768,
    maxWidth: 1023,
    visibleCount: 4,
  },
  desktop: {
    minWidth: 1024,
    maxWidth: 1279,
    visibleCount: 6,
  },
  xl: {
    minWidth: 1280,
    maxWidth: Infinity,
    visibleCount: 8,
  },
} as const;

/**
 * 按优先级排序频道
 * 
 * 排序规则：
 * 1. 优先使用 priority 字段（越小越靠前）
 * 2. 如果没有 priority，使用 order 字段
 * 3. 如果都没有，保持原顺序
 */
export function sortChannelsByPriority(channels: Channel[]): Channel[] {
  return [...channels].sort((a, b) => {
    const aPriority = a.priority ?? a.order ?? 999;
    const bPriority = b.priority ?? b.order ?? 999;
    return aPriority - bPriority;
  });
}

/**
 * 获取指定断点下应该显示的频道数量
 */
export function getVisibleCountByBreakpoint(breakpoint: keyof typeof RESPONSIVE_BREAKPOINTS): number {
  return RESPONSIVE_BREAKPOINTS[breakpoint].visibleCount;
}

/**
 * 分组频道：可见频道 vs 更多菜单中的频道
 */
export function splitChannelsByVisibleCount(
  channels: Channel[],
  visibleCount: number
): {
  visibleChannels: Channel[];
  moreChannels: Channel[];
} {
  const sorted = sortChannelsByPriority(channels);
  
  return {
    visibleChannels: sorted.slice(0, visibleCount),
    moreChannels: sorted.slice(visibleCount),
  };
}

/**
 * 生成频道的CSS类名
 * 用于响应式显示/隐藏
 */
export function getChannelItemClassName(index: number, baseClass: string = 'channel-item'): string {
  return `${baseClass} ${baseClass}-${index}`;
}

/**
 * 检查频道是否应该在当前频道之前显示
 * 用于智能重排（当前频道在"更多"菜单中时，移到可见区域）
 */
export function shouldPromoteChannel(
  channel: Channel,
  currentChannelSlug: string,
  visibleChannels: Channel[]
): boolean {
  if (channel.slug !== currentChannelSlug) return false;
  
  // 如果当前频道已经在可见列表中，不需要提升
  const isAlreadyVisible = visibleChannels.some(ch => ch.slug === currentChannelSlug);
  return !isAlreadyVisible;
}

/**
 * 智能重排频道列表
 * 如果当前频道在"更多"菜单中，将其提升到可见区域的最后一个位置
 */
export function reorderChannelsWithCurrentActive(
  channels: Channel[],
  currentChannelSlug: string,
  visibleCount: number
): Channel[] {
  const sorted = sortChannelsByPriority(channels);
  const currentChannelIndex = sorted.findIndex(ch => ch.slug === currentChannelSlug);
  
  // 如果当前频道不存在或已经在可见区域，不重排
  if (currentChannelIndex < 0 || currentChannelIndex < visibleCount) {
    return sorted;
  }
  
  // 将当前频道移到可见区域的最后一个位置
  const currentChannel = sorted[currentChannelIndex];
  const reordered = [...sorted];
  reordered.splice(currentChannelIndex, 1); // 移除当前频道
  reordered.splice(visibleCount - 1, 0, currentChannel); // 插入到倒数第二个位置
  
  return reordered;
}

/**
 * 获取频道的显示标记
 * 用于个性化推荐等场景
 */
export function getChannelBadge(
  channel: Channel,
  channelWeights?: Record<string, number>
): {
  type: 'recommended' | 'hot' | 'new' | null;
  text: string;
} | null {
  // 如果有权重且权重较高，标记为推荐
  if (channelWeights && channelWeights[channel.slug] > 0.05) {
    return {
      type: 'recommended',
      text: '推荐',
    };
  }
  
  // 可以根据其他字段添加更多标记
  // if (channel.isNew) return { type: 'new', text: '新' };
  // if (channel.isHot) return { type: 'hot', text: '热' };
  
  return null;
}

/**
 * 生成面包屑导航数据
 */
export function getBreadcrumbs(currentChannel: Channel | undefined) {
  const items = [
    { name: '首页', slug: '', href: '/portal' },
  ];
  
  if (currentChannel && currentChannel.slug !== 'recommend') {
    items.push({
      name: currentChannel.name,
      slug: currentChannel.slug,
      href: `/portal?channel=${currentChannel.slug}`,
    });
  }
  
  return items;
}

/**
 * 辅助函数：判断是否为移动设备（基于窗口宽度）
 * 注意：这是客户端函数，仅用于交互逻辑
 */
export function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < RESPONSIVE_BREAKPOINTS.tablet.minWidth;
}

/**
 * 辅助函数：获取当前断点
 * 注意：这是客户端函数，仅用于调试
 */
export function getCurrentBreakpoint(): keyof typeof RESPONSIVE_BREAKPOINTS {
  if (typeof window === 'undefined') return 'desktop';
  
  const width = window.innerWidth;
  
  if (width < RESPONSIVE_BREAKPOINTS.tablet.minWidth) return 'mobile';
  if (width < RESPONSIVE_BREAKPOINTS.desktop.minWidth) return 'tablet';
  if (width < RESPONSIVE_BREAKPOINTS.xl.minWidth) return 'desktop';
  return 'xl';
}
