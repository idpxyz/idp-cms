/**
 * 内容时间窗口配置管理
 * 统一管理所有与内容时效性相关的参数
 */

export interface ContentTimingConfig {
  // TopStories 相关
  topStories: {
    defaultHours: number;      // 默认时间窗口
    minHours: number;          // 最小时间窗口
    retryHours: number;        // 重试时间窗口
    maxHours: number;          // 最大时间窗口
  };
  
  // Hero Carousel 相关
  hero: {
    defaultHours: number | null; // null = 不限制时间
    maxHours: number;
  };
  
  // Breaking News 相关
  breaking: {
    defaultHours: number;      // 突发新闻时效性要求高
    maxHours: number;
  };
  
  // Channel 相关
  channel: {
    defaultHours: number;      // 频道内容默认窗口
    infiniteScrollHours: number; // 无限滚动窗口
  };
  
  // News Content 相关
  news: {
    categoryHours: number;     // 分类页面
    channelHours: number;      // 频道页面
    tagHours: number;          // 标签页面
  };
  
  // API 相关
  api: {
    headlinesDefaultHours: number;
    topicsDefaultHours: number;
    topicDetailHours: number;
  };
}

/**
 * 默认配置 - 统一的内容时间窗口设置
 */
export const DEFAULT_CONTENT_TIMING: ContentTimingConfig = {
  topStories: {
    defaultHours: 24*7,          // 🎯 统一设置：TopStories默认72小时
    minHours: 24,              // 最少24小时
    retryHours: 168,           // 重试时用7天
    maxHours: 720,             // 最多30天
  },
  
  hero: {
    defaultHours: null,        // Hero不限制时间，展示最优质内容
    maxHours: 720,
  },
  
  breaking: {
    defaultHours: 720,          // 突发新闻24小时内
    maxHours: 72,
  },
  
  channel: {
    defaultHours: 168,         // 频道内容7天
    infiniteScrollHours: 168,  // 无限滚动7天
  },
  
  news: {
    categoryHours: 24,         // 分类页面24小时
    channelHours: 24,          // 频道页面24小时  
    tagHours: 168,             // 标签页面7天
  },
  
  api: {
    headlinesDefaultHours: 24, // Headlines API默认24小时
    topicsDefaultHours: 48,    // Topics API默认48小时
    topicDetailHours: 72,      // Topic详情72小时
  },
};

/**
 * 获取配置的便捷函数
 */
export class ContentTimingManager {
  private static config: ContentTimingConfig = DEFAULT_CONTENT_TIMING;
  
  /**
   * 获取TopStories相关配置
   */
  static getTopStoriesConfig() {
    return this.config.topStories;
  }
  
  /**
   * 获取TopStories默认时间窗口
   */
  static getTopStoriesDefaultHours(): number {
    return this.config.topStories.defaultHours;
  }
  
  /**
   * 获取TopStories重试时间窗口
   */
  static getTopStoriesRetryHours(originalHours?: number): number {
    const retryHours = this.config.topStories.retryHours;
    return originalHours ? Math.max(originalHours, retryHours) : retryHours;
  }
  
  /**
   * 获取Hero配置
   */
  static getHeroDefaultHours(): number | null {
    return this.config.hero.defaultHours;
  }
  
  /**
   * 获取Breaking News配置
   */
  static getBreakingNewsHours(): number {
    return this.config.breaking.defaultHours;
  }
  
  /**
   * 获取频道配置
   */
  static getChannelDefaultHours(): number {
    return this.config.channel.defaultHours;
  }
  
  /**
   * 获取无限滚动配置
   */
  static getInfiniteScrollHours(): number {
    return this.config.channel.infiniteScrollHours;
  }
  
  /**
   * 获取News配置
   */
  static getNewsConfig() {
    return this.config.news;
  }
  
  /**
   * 获取API配置
   */
  static getApiConfig() {
    return this.config.api;
  }
  
  /**
   * 动态更新配置（用于A/B测试或运行时调整）
   */
  static updateConfig(updates: Partial<ContentTimingConfig>) {
    this.config = { ...this.config, ...updates };
  }
  
  /**
   * 验证时间窗口是否合理
   */
  static validateHours(hours: number, type: keyof ContentTimingConfig): boolean {
    const typeConfig = this.config[type];
    if (typeof typeConfig === 'object' && 'maxHours' in typeConfig) {
      return hours > 0 && hours <= typeConfig.maxHours;
    }
    return hours > 0 && hours <= 720; // 默认最大30天
  }
  
  /**
   * 获取调试信息
   */
  static getDebugInfo() {
    return {
      config: this.config,
      topStoriesDefault: this.getTopStoriesDefaultHours(),
      breakingHours: this.getBreakingNewsHours(),
      channelHours: this.getChannelDefaultHours(),
    };
  }
}

/**
 * 便捷的导出函数
 */
export const getTopStoriesDefaultHours = () => ContentTimingManager.getTopStoriesDefaultHours();
export const getTopStoriesRetryHours = (originalHours?: number) => ContentTimingManager.getTopStoriesRetryHours(originalHours);
export const getBreakingNewsHours = () => ContentTimingManager.getBreakingNewsHours();
export const getChannelDefaultHours = () => ContentTimingManager.getChannelDefaultHours();
export const getInfiniteScrollHours = () => ContentTimingManager.getInfiniteScrollHours();

export default ContentTimingManager;
