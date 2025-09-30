/**
 * API 服务统一导出
 * 提供所有API服务的统一入口
 */

// 服务实例导出
export { articleService } from './ArticleService';
export { categoryService } from './CategoryService';
export { channelService } from './ChannelService';
export { topicService } from './TopicService';
export { tagService } from './TagService';
export { retryService } from './RetryService';

// 类型导出
export * from './types';
export * from './taxonomy-types';

// 服务类导出（供需要时使用）
export { ArticleService } from './ArticleService';
export { CategoryService } from './CategoryService';
export { ChannelService } from './ChannelService';
export { TopicService } from './TopicService';
export { RetryService } from './RetryService';

// 响应类型导出
export * from './response';

// ArticleService 类型导出
export type { ArticleListOptions, ArticleListResponse } from './ArticleService';

// ChannelService 类型和便捷函数导出
export type { 
  Channel, 
  ChannelQueryOptions, 
  ChannelServiceError 
} from './ChannelService';
export { 
  getChannels, 
  getChannelBySlug, 
  getHomepageChannels 
} from './ChannelService';
