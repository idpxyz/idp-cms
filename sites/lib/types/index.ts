// 站点配置类型
export interface SiteSettings {
  site_id: string;
  site_name: string;
  hostname: string;
  port: number;
  is_default_site: boolean;
  root_page_id: number;

  // 前端布局配置（核心）
  theme_key: string;
  theme_version: string;
  layout_key: string;
  brand_tokens: BrandTokens;
  modules: ModuleConfig;

  // 品牌配置
  brand: BrandConfig;

  // 兼容性字段 - 直接访问品牌属性
  brand_name: string;
  brand_logo: string;

  // SEO配置
  seo: SEOConfig;

  // 分析配置
  analytics: AnalyticsConfig;

  // 功能开关
  features: FeatureConfig;

  // 页脚配置
  footer: FooterConfig;

  // 其他字段
  customized: boolean;
  primary_color: string;
  cache_timeout: number;
  default_title: string;
  default_description: string;
  updated_at: string;
  is_production: boolean;
}

// 品牌令牌类型
export interface BrandTokens {
  primary: string;
  secondary: string;
  font?: string;
  radius?: string;
  shadow?: string;
  [key: string]: string | undefined;
}

// 模块配置类型
export interface ModuleConfig {
  home: string[];
  sidebar: string[];
  [key: string]: string[];
}

// 品牌配置类型
export interface BrandConfig {
  name: string;
  logo_url: string;
  description: string;
}

// SEO配置类型
export interface SEOConfig {
  default_title: string;
  default_description: string;
  default_keywords: string;
}

// 分析配置类型
export interface AnalyticsConfig {
  google_analytics_id: string;
  track_user_behavior: boolean;
}

// 功能配置类型
export interface FeatureConfig {
  recommendation: boolean;
  search_enabled: boolean;
  comments_enabled: boolean;
  user_registration: boolean;
  social_login: boolean;
  content_moderation: boolean;
  api_access: boolean;
  rss_feed: boolean;
  sitemap: boolean;
}

// 页脚配置类型
export interface FooterConfig {
  links: any[];
  copyright: string;
}

// API响应类型
export interface APIResponse<T> {
  data: T;
  meta: {
    site: string;
    site_id: number;
    theme_key: string;
    layout_key: string;
  };
  error?: string;
}

// 主题类型
export type ThemeKey = "portal" | "localsite-default" | "localsite-shanghai";

// 布局类型
export type LayoutKey =
  | "layout-portal-classic"
  | "layout-localsite-grid"
  | "layout-localsite-magazine";

// 站点信息类型
export interface SiteInfo {
  hostname: string;
  theme_key: ThemeKey;
  layout_key: LayoutKey;
  brand_tokens: BrandTokens;
  modules: ModuleConfig;
}
