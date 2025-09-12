// 模块组件导出
export { default as Hero } from "./Hero";
export { default as TopNews } from "./TopNews";
export { default as Channels } from "./Channels";
export { default as Ranking } from "./Ranking";
export { default as Advertisement } from "./Advertisement";

// 模块类型定义
export interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  image?: string;
  publishedAt: string;
  category: string;
  slug: string;
}

export interface Channel {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
}

export interface RankingItem {
  id: string;
  title: string;
  views: number;
  rank: number;
  change?: "up" | "down" | "new";
  category?: string;
}
