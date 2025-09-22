// 📁 频道模板导出文件
// 这里集中管理所有频道的自定义模板

import DefaultTemplate from './DefaultTemplate';
import SocialTemplate from './SocialTemplate';
import CultureTemplate from './CultureTemplate';
import TechTemplate from './TechTemplate';

// 频道模板映射表
// key: 频道slug, value: 对应的模板组件
export const CHANNEL_TEMPLATES = {
  // 🏘️ 社会频道
  'society': SocialTemplate,     // 数据库中的实际slug
  'social': SocialTemplate,      // 兼容性别名
  
  // 🎭 文化频道
  'culture': CultureTemplate,
  
  // 💻 科技频道
  'tech': TechTemplate,
  'technology': TechTemplate,  // 兼容不同命名
  
  // 🏃 体育频道 (可以继续添加)
  // 'sports': SportsTemplate,
  
  // 🎬 娱乐频道
  // 'entertainment': EntertainmentTemplate,
  
  // 🏛️ 政治频道
  // 'politics': PoliticsTemplate,
  
  // 💰 财经频道
  // 'finance': FinanceTemplate,
  
  // 🏥 健康频道
  // 'health': HealthTemplate,
  
  // 🌍 国际频道
  // 'international': InternationalTemplate,
};

// 默认模板
export const DEFAULT_TEMPLATE = DefaultTemplate;

/**
 * 根据频道slug获取对应的模板组件
 * @param channelSlug 频道标识
 * @returns 模板组件
 */
export function getChannelTemplate(channelSlug: string) {
  return CHANNEL_TEMPLATES[channelSlug as keyof typeof CHANNEL_TEMPLATES] || DEFAULT_TEMPLATE;
}

/**
 * 获取所有已定义的频道模板列表
 * @returns 频道模板列表
 */
export function getAvailableChannelTemplates() {
  return Object.keys(CHANNEL_TEMPLATES);
}

export {
  DefaultTemplate,
  SocialTemplate,
  CultureTemplate,
  TechTemplate,
};
