/**
 * 统一缓存标签管理系统
 *
 * 实施 BestThemeOptimize.md 的缓存治理策略：
 * - 限制标签种类 ≤ 5
 * - 固定枚举，防止标签泛滥
 * - 提供类型安全的标签生成
 */

/**
 * 缓存标签类型枚举（固定5类）
 */
export const CACHE_TAG_TYPES = {
  SITE: "site",
  PAGE: "page",
  CHANNEL: "channel",
  REGION: "region",
  THEME: "theme",
} as const;

export type CacheTagType =
  (typeof CACHE_TAG_TYPES)[keyof typeof CACHE_TAG_TYPES];

/**
 * 缓存标签生成器
 * 提供类型安全的标签生成，防止拼写错误
 */
export const CACHE_TAGS = {
  /**
   * 站点级别缓存标签
   */
  site: (host: string) => `${CACHE_TAG_TYPES.SITE}:${host}`,

  /**
   * 页面级别缓存标签
   */
  page: (pageId: string) => `${CACHE_TAG_TYPES.PAGE}:${pageId}`,

  /**
   * 频道级别缓存标签
   */
  channel: (channelSlug: string) => `${CACHE_TAG_TYPES.CHANNEL}:${channelSlug}`,

  /**
   * 地区级别缓存标签
   */
  region: (regionSlug: string) => `${CACHE_TAG_TYPES.REGION}:${regionSlug}`,

  /**
   * 主题级别缓存标签
   */
  theme: (themeKey: string, version?: string) =>
    version
      ? `${CACHE_TAG_TYPES.THEME}:${themeKey}@${version}`
      : `${CACHE_TAG_TYPES.THEME}:${themeKey}`,

  /**
   * 设置级别缓存标签
   */
  settings: (host: string) => `settings:${host}`,
} as const;

/**
 * 缓存标签验证器
 * 确保标签符合规范
 */
export function validateCacheTag(tag: string): boolean {
  const validPrefixes = Object.values(CACHE_TAG_TYPES);
  const hasValidPrefix = validPrefixes.some((prefix) =>
    tag.startsWith(`${prefix}:`)
  );

  // 特殊处理 settings 标签（历史兼容）
  const isSettingsTag = tag.startsWith("settings:");

  return hasValidPrefix || isSettingsTag;
}

/**
 * 批量生成缓存标签
 * 用于复杂页面的多标签场景
 */
export interface CacheTagOptions {
  host: string;
  pageId?: string;
  channelSlug?: string;
  regionSlug?: string;
  themeKey?: string;
  themeVersion?: string;
}

export function generateCacheTags(options: CacheTagOptions): string[] {
  const tags: string[] = [CACHE_TAGS.site(options.host)];

  if (options.pageId) {
    tags.push(CACHE_TAGS.page(options.pageId));
  }

  if (options.channelSlug) {
    tags.push(CACHE_TAGS.channel(options.channelSlug));
  }

  if (options.regionSlug) {
    tags.push(CACHE_TAGS.region(options.regionSlug));
  }

  if (options.themeKey) {
    tags.push(CACHE_TAGS.theme(options.themeKey, options.themeVersion));
  }

  // 添加设置标签
  tags.push(CACHE_TAGS.settings(options.host));

  return tags;
}

/**
 * 标签统计和监控
 */
export interface CacheTagStats {
  totalTags: number;
  byType: Record<CacheTagType, number>;
  invalidTags: string[];
}

export function analyzeCacheTags(tags: string[]): CacheTagStats {
  const stats: CacheTagStats = {
    totalTags: tags.length,
    byType: {
      [CACHE_TAG_TYPES.SITE]: 0,
      [CACHE_TAG_TYPES.PAGE]: 0,
      [CACHE_TAG_TYPES.CHANNEL]: 0,
      [CACHE_TAG_TYPES.REGION]: 0,
      [CACHE_TAG_TYPES.THEME]: 0,
    },
    invalidTags: [],
  };

  for (const tag of tags) {
    if (!validateCacheTag(tag)) {
      stats.invalidTags.push(tag);
      continue;
    }

    for (const [type, prefix] of Object.entries(CACHE_TAG_TYPES)) {
      if (tag.startsWith(`${prefix}:`)) {
        stats.byType[prefix as CacheTagType]++;
        break;
      }
    }
  }

  return stats;
}

/**
 * 缓存失效事件类型
 */
export const REVALIDATION_EVENTS = {
  PAGE_PUBLISH: "page.publish",
  PAGE_UPDATE: "page.update",
  PAGE_UNPUBLISH: "page.unpublish",
  SETTINGS_UPDATE: "settings.update",
  THEME_UPDATE: "theme.update",
} as const;

export type RevalidationEvent =
  (typeof REVALIDATION_EVENTS)[keyof typeof REVALIDATION_EVENTS];

/**
 * 事件到标签的映射策略
 */
export function getTagsForEvent(
  event: RevalidationEvent,
  payload: {
    site: string;
    pageId?: string;
    slug?: string;
    channel?: string;
    region?: string;
    themeKey?: string;
  }
): string[] {
  const baseTags = [CACHE_TAGS.site(payload.site)];

  switch (event) {
    case REVALIDATION_EVENTS.PAGE_PUBLISH:
    case REVALIDATION_EVENTS.PAGE_UPDATE:
    case REVALIDATION_EVENTS.PAGE_UNPUBLISH:
      if (payload.pageId) baseTags.push(CACHE_TAGS.page(payload.pageId));
      if (payload.channel) baseTags.push(CACHE_TAGS.channel(payload.channel));
      if (payload.region) baseTags.push(CACHE_TAGS.region(payload.region));
      break;

    case REVALIDATION_EVENTS.SETTINGS_UPDATE:
      baseTags.push(CACHE_TAGS.settings(payload.site));
      break;

    case REVALIDATION_EVENTS.THEME_UPDATE:
      if (payload.themeKey) baseTags.push(CACHE_TAGS.theme(payload.themeKey));
      break;
  }

  return baseTags;
}
