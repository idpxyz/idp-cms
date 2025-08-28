export interface AITool {
  id: number;
  title: string;
  description: string;
  category: AIToolCategory;
  tool_url: string;
  logo_url?: string;
  pricing: 'free' | 'freemium' | 'paid' | 'enterprise';
  features: string[];
  rating: number;
  usage_count: number;
  tags: string[];
  is_hot: boolean;
  is_new: boolean;
  url: string;
  last_published_at?: string;
}

export type AIToolCategory = 
  | 'text-generation'    // 文字生成
  | 'image-generation'   // 绘画/图像
  | 'video-generation'   // 视频生成
  | 'code-generation'    // 编程/代码
  | 'audio-generation'   // 音频生成
  | 'data-analysis'      // 数据分析
  | 'chatbot'           // 聊天机器人
  | 'translation'       // 翻译工具
  | 'productivity'      // 生产力工具
  | 'research'          // 研究工具
  | 'other';            // 其他

export interface AINews {
  id: number;
  title: string;
  introduction: string;
  body?: string;
  source: string;
  source_url: string;
  category: AINewsCategory;
  tags: string[];
  last_published_at?: string;
  is_hot: boolean;
  is_top: boolean;
  read_count: number;
  image_url?: string;
  url: string;
  author_name: string;
  has_video: boolean;
}

export type AINewsCategory = 
  | 'industry'          // 行业动态
  | 'technology'        // 技术突破
  | 'product'           // 产品发布
  | 'research'          // 研究进展
  | 'policy'            // 政策法规
  | 'investment'        // 投资融资
  | 'company'           // 公司动态
  | 'other';            // 其他

export interface AICategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  toolCount: number;
  isActive: boolean;
}

export interface AITutorial {
  id: number;
  title: string;
  introduction: string;
  body?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration?: string;
  category: string;
  is_hot: boolean;
  is_free: boolean;
  student_count: number;
  rating: number;
  tags: string[];
  url: string;
  last_published_at?: string;
  author_name: string;
}

export interface SearchFilters {
  category?: AIToolCategory;
  pricing?: AITool['pricing'];
  tags?: string[];
  query?: string;
  newsCategory?: AINewsCategory;
  difficulty?: AITutorial['difficulty'];
}

export interface User {
  id: string;
  name: string;
  email: string;
  favorites: string[]; // 收藏的工具ID
  preferences: {
    categories: AIToolCategory[];
    newsCategories: AINewsCategory[];
  };
}
