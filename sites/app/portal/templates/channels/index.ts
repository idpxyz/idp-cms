/**
 * 📁 频道模板管理器
 * 负责模板的导入、映射和动态选择
 */

import DefaultTemplate from './DefaultTemplate';
import SocialTemplate from './SocialTemplate';
import CultureTemplate from './CultureTemplate';
import TechTemplate from './TechTemplate';
import FashionTemplate from './FashionTemplate';

// 模板映射表 - 只列出需要特殊模板的频道
const CHANNEL_TEMPLATES = {
  'society': SocialTemplate,
  'social': SocialTemplate,     // 别名支持
  'culture': CultureTemplate,
  'tech': TechTemplate,
  'technology': TechTemplate,   // 别名支持
  'fashion': FashionTemplate,   // 时尚频道
} as const;

/**
 * 动态获取频道模板
 * @param channelSlug 频道标识
 * @returns 对应的模板组件
 */
export function getChannelTemplate(channelSlug: string) {
  return CHANNEL_TEMPLATES[channelSlug as keyof typeof CHANNEL_TEMPLATES] || DefaultTemplate;
}

// 简化导出
export { DefaultTemplate, SocialTemplate, CultureTemplate, TechTemplate, FashionTemplate };
