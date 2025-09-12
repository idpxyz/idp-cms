/**
 * 通用地方站主题 v1
 *
 * 适用于地方站点的通用主题
 */

import {
  createTokenGenerator,
  defaultTokens,
  DesignTokens,
} from "@/lib/tokens";

// 地方站主题特定的令牌
const localsiteTokens: DesignTokens = {
  ...defaultTokens,
  // 地方站主题色彩（更温和的色调）
  primary: "#059669",
  secondary: "#6B7280",
  accent: "#8B5CF6",
  background: "#FFFFFF",
  surface: "#F9FAFB",

  // 地方站文本颜色
  "text-primary": "#111827",
  "text-secondary": "#6B7280",
  "text-muted": "#9CA3AF",

  // 地方站字体
  "font-family-base":
    "Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  "font-family-heading":
    "Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",

  // 地方站圆角（传统一些）
  "radius-sm": "0.25rem",
  "radius-md": "0.375rem",
  "radius-lg": "0.5rem",
  "radius-xl": "0.75rem",
};

// 主题元数据
export const meta = {
  key: "localsite-default",
  version: "1.0.0",
  name: "通用地方站主题",
  description: "适用于地方站点的通用主题",

  // 令牌生成器
  tokens: createTokenGenerator(localsiteTokens),

  // 可用布局
  layouts: {
    "layout-localsite-grid": () => import("./layouts/layout-localsite-grid"),
    "layout-localsite-list": () => import("./layouts/layout-localsite-list"),
    "layout-localsite-masonry": () =>
      import("./layouts/layout-localsite-masonry"),
  },

  // 可用组件（可选）
  components: {
    "local-hero": () => import("./components/local-hero"),
    "local-news": () => import("./components/local-news"),
    "local-sidebar": () => import("./components/local-sidebar"),
  },
};
