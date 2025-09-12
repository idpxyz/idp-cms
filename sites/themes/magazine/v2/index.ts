/**
 * 杂志主题 v2
 *
 * 杂志风格的现代化主题
 */

import {
  createTokenGenerator,
  defaultTokens,
  DesignTokens,
} from "@/lib/tokens";

// 杂志主题特定的令牌
const magazineTokens: DesignTokens = {
  ...defaultTokens,
  // 杂志主题色彩（高对比度、现代化）
  primary: "#DC2626",
  secondary: "#1F2937",
  accent: "#F59E0B",
  background: "#FFFFFF",
  surface: "#F7F8FA",

  // 杂志文本颜色
  "text-primary": "#111827",
  "text-secondary": "#374151",
  "text-muted": "#6B7280",

  // 杂志字体（更具表现力）
  "font-family-base":
    "Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  "font-family-heading": "Playfair Display, Georgia, serif",

  // 杂志圆角（混合现代和经典）
  "radius-sm": "0.125rem",
  "radius-md": "0.25rem",
  "radius-lg": "0.5rem",
  "radius-xl": "1rem",

  // 杂志特有的间距（更紧凑）
  "spacing-xs": "0.125rem",
  "spacing-sm": "0.375rem",
  "spacing-md": "0.75rem",
  "spacing-lg": "1.25rem",
  "spacing-xl": "2rem",
  "spacing-2xl": "3.5rem",
};

// 主题元数据
export const meta = {
  key: "magazine",
  version: "2.0.0",
  name: "杂志主题",
  description: "杂志风格的现代化主题",

  // 令牌生成器
  tokens: createTokenGenerator(magazineTokens),

  // 可用布局
  layouts: {
    "layout-magazine": () => import("./layouts/layout-magazine"),
    "layout-magazine-minimal": () =>
      import("./layouts/layout-magazine-minimal"),
    "layout-magazine-editorial": () =>
      import("./layouts/layout-magazine-editorial"),
  },

  // 可用组件（可选）
  components: {
    "magazine-hero": () => import("./components/magazine-hero"),
    "magazine-grid": () => import("./components/magazine-grid"),
    "magazine-feature": () => import("./components/magazine-feature"),
  },
};
