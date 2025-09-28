/**
 * 📁 专题模板管理器
 * 负责专题模板的导入、映射和动态选择
 * 完全参考 Channel 模板管理器的设计
 */

import DefaultTopicTemplate from './DefaultTopicTemplate';
import BreakingTopicTemplate from './BreakingTopicTemplate';
import NationalTopicTemplate from './NationalTopicTemplate';
import TimelineTopicTemplate from './TimelineTopicTemplate';

// 模板映射表 - 基于专题标签的映射
const TOPIC_TEMPLATES = {
  // 突发事件相关标签
  'breaking': BreakingTopicTemplate,
  'emergency': BreakingTopicTemplate,
  '突发事件': BreakingTopicTemplate,
  '紧急事件': BreakingTopicTemplate,
  '地震': BreakingTopicTemplate,
  '灾害': BreakingTopicTemplate,
  
  // 国家级事件相关标签
  'national': NationalTopicTemplate,
  'national_celebration': NationalTopicTemplate,
  '国庆节': NationalTopicTemplate,
  '国家庆典': NationalTopicTemplate,
  '建党节': NationalTopicTemplate,
  '两会': NationalTopicTemplate,
  '国家级': NationalTopicTemplate,
  
  // 时间线类专题标签
  'timeline': TimelineTopicTemplate,
  'memorial': TimelineTopicTemplate,
  '纪念活动': TimelineTopicTemplate,
  '历史回顾': TimelineTopicTemplate,
  '周年纪念': TimelineTopicTemplate,
} as const;

/**
 * 动态获取专题模板
 * @param topic 专题对象，包含模板和标签信息
 * @returns 对应的模板组件
 */
export function getTopicTemplate(topic: any) {
  // 🎯 第一优先级：数据库中的模板配置
  if (topic?.template?.file_name) {
    const templateName = topic.template.file_name.replace('.tsx', '');
    
    // 根据模板文件名动态选择
    switch (templateName) {
      case 'BreakingTopicTemplate':
        return BreakingTopicTemplate;
      case 'NationalTopicTemplate':
        return NationalTopicTemplate;
      case 'TimelineTopicTemplate':
        return TimelineTopicTemplate;
      case 'DefaultTopicTemplate':
      default:
        return DefaultTopicTemplate;
    }
  }
  
  // 🎯 第二优先级：基于专题标签的映射
  if (topic?.tags && Array.isArray(topic.tags)) {
    for (const tag of topic.tags) {
      const templateName = typeof tag === 'string' ? tag : tag.name;
      if (TOPIC_TEMPLATES[templateName as keyof typeof TOPIC_TEMPLATES]) {
        return TOPIC_TEMPLATES[templateName as keyof typeof TOPIC_TEMPLATES];
      }
    }
  }
  
  // 🎯 第三优先级：基于专题重要程度和状态的默认映射
  if (topic?.is_breaking) {
    return BreakingTopicTemplate;
  }
  
  if (topic?.importance_level === 'national' && topic?.status === 'ongoing') {
    return NationalTopicTemplate;
  }
  
  if (topic?.status === 'memorial') {
    return TimelineTopicTemplate;
  }
  
  // 🎯 默认兜底：使用默认模板
  return DefaultTopicTemplate;
}

/**
 * 获取模板类型标识
 * @param topic 专题对象
 * @returns 模板类型字符串
 */
export function getTopicTemplateType(topic: any): string {
  const TemplateComponent = getTopicTemplate(topic);
  
  switch (TemplateComponent) {
    case BreakingTopicTemplate:
      return 'breaking';
    case NationalTopicTemplate:
      return 'national';
    case TimelineTopicTemplate:
      return 'timeline';
    case DefaultTopicTemplate:
    default:
      return 'default';
  }
}

// 简化导出
export { 
  DefaultTopicTemplate, 
  BreakingTopicTemplate, 
  NationalTopicTemplate, 
  TimelineTopicTemplate 
};
