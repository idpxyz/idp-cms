/**
 * 📁 频道模板管理器
 * 负责模板的导入、映射和动态选择
 */

import DefaultTemplate from './DefaultTemplate';
import RecommendTemplate from './RecommendTemplate';
import SocialTemplate from './SocialTemplate';
import CultureTemplate from './CultureTemplate';
import TechTemplate from './TechTemplate';
import FashionTemplate from './FashionTemplate';

// 模板映射表 - 只列出需要特殊模板的频道
const CHANNEL_TEMPLATES = {
  'recommend': RecommendTemplate, // 推荐频道（包含 Hero 和头条）
  'society': SocialTemplate,
  'social': SocialTemplate,     // 别名支持
  'culture': CultureTemplate,
  'tech': TechTemplate,
  'technology': TechTemplate,   // 别名支持
  'fashion': FashionTemplate,   // 时尚频道
} as const;

/**
 * 动态获取频道模板
 * @param channel 频道对象，包含模板信息
 * @returns 对应的模板组件
 */
export function getChannelTemplate(channel: any) {
  // 优先使用数据库中的模板配置
  if (channel?.template?.file_name) {
    const templateName = channel.template.file_name.replace('.tsx', '');
    
    // 根据模板文件名动态选择
    switch (templateName) {
      case 'DefaultTemplate':
        return DefaultTemplate;
      case 'RecommendTemplate':
        return RecommendTemplate;
      case 'SocialTemplate':
        return SocialTemplate;
      case 'CultureTemplate':
        return CultureTemplate;
      case 'TechTemplate':
        return TechTemplate;
      case 'FashionTemplate':
        return FashionTemplate;
      default:
        console.warn(`Unknown template: ${templateName}, using DefaultTemplate`);
        return DefaultTemplate;
    }
  }
  
  // 回退到基于slug的硬编码映射（向后兼容）
  const channelSlug = channel?.slug || '';
  return CHANNEL_TEMPLATES[channelSlug as keyof typeof CHANNEL_TEMPLATES] || DefaultTemplate;
}

// 简化导出
export { DefaultTemplate, RecommendTemplate, SocialTemplate, CultureTemplate, TechTemplate, FashionTemplate };
