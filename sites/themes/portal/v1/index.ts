/**
 * Portal 主题 v1
 *
 * 门户站点主题，适用于主要的门户网站
 */

import {
  createTokenGenerator,
  defaultTokens,
  DesignTokens,
} from "@/lib/tokens";

// Portal 主题特定的令牌
const portalTokens: DesignTokens = {
  ...defaultTokens,
  // 门户主题色彩
  primary: "#0A7EFA",
  secondary: "#1E40AF",
  accent: "#7C3AED",
  background: "#FFFFFF",
  surface: "#F8FAFC",

  // 门户文本颜色
  "text-primary": "#1E293B",
  "text-secondary": "#475569",
  "text-muted": "#64748B",

  // 门户字体
  "font-family-base":
    "Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  "font-family-heading":
    "Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",

  // 门户圆角（更现代化）
  "radius-sm": "0.375rem",
  "radius-md": "0.5rem",
  "radius-lg": "0.75rem",
  "radius-xl": "1rem",
};

// 主题元数据
export const meta = {
  key: "portal",
  version: "1.0.0",
  name: "门户主题",
  description: "适用于门户站点的现代化主题",

  // 令牌生成器
  tokens: createTokenGenerator(portalTokens),

  // 可用布局
  layouts: {
    "layout-portal-classic": () => import("./layouts/layout-portal-classic"),
    "layout-portal-modern": () => import("./layouts/layout-portal-modern"),
    "layout-portal-magazine": () => import("./layouts/layout-portal-magazine"),
  },

  // 可用组件（可选）
  components: {
    "hero-banner": () => import("./components/hero-banner"),
    "news-grid": () => import("./components/news-grid"),
    "featured-carousel": () => import("./components/featured-carousel"),
  },
};
