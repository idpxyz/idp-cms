/**
 * CSS 变量和设计令牌系统
 *
 * 提供动态 CSS 变量注入和设计令牌管理
 * 支持主题切换和品牌定制
 */

import React from "react";

/**
 * 设计令牌接口
 */
export interface DesignTokens {
  // 颜色令牌
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  surface?: string;
  error?: string;
  warning?: string;
  success?: string;
  info?: string;

  // 文本颜色
  "text-primary"?: string;
  "text-secondary"?: string;
  "text-muted"?: string;
  "text-inverse"?: string;

  // 间距令牌
  "spacing-xs"?: string;
  "spacing-sm"?: string;
  "spacing-md"?: string;
  "spacing-lg"?: string;
  "spacing-xl"?: string;
  "spacing-2xl"?: string;

  // 字体令牌
  "font-family-base"?: string;
  "font-family-heading"?: string;
  "font-family-mono"?: string;

  // 字号令牌
  "font-size-xs"?: string;
  "font-size-sm"?: string;
  "font-size-base"?: string;
  "font-size-lg"?: string;
  "font-size-xl"?: string;
  "font-size-2xl"?: string;
  "font-size-3xl"?: string;

  // 圆角令牌
  "radius-sm"?: string;
  "radius-md"?: string;
  "radius-lg"?: string;
  "radius-xl"?: string;
  "radius-full"?: string;

  // 阴影令牌
  "shadow-sm"?: string;
  "shadow-md"?: string;
  "shadow-lg"?: string;
  "shadow-xl"?: string;

  // 断点令牌
  "breakpoint-sm"?: string;
  "breakpoint-md"?: string;
  "breakpoint-lg"?: string;
  "breakpoint-xl"?: string;
  "breakpoint-2xl"?: string;

  // 动画令牌
  "transition-fast"?: string;
  "transition-normal"?: string;
  "transition-slow"?: string;

  // 层级令牌
  "z-dropdown"?: string;
  "z-sticky"?: string;
  "z-fixed"?: string;
  "z-modal"?: string;
  "z-popover"?: string;
  "z-tooltip"?: string;
}

/**
 * 默认设计令牌
 */
export const defaultTokens: DesignTokens = {
  // 颜色
  primary: "#3B82F6",
  secondary: "#6B7280",
  accent: "#8B5CF6",
  background: "#FFFFFF",
  surface: "#F8FAFC",
  error: "#EF4444",
  warning: "#F59E0B",
  success: "#10B981",
  info: "#06B6D4",

  // 文本颜色
  "text-primary": "#111827",
  "text-secondary": "#6B7280",
  "text-muted": "#9CA3AF",
  "text-inverse": "#FFFFFF",

  // 间距 (rem)
  "spacing-xs": "0.25rem",
  "spacing-sm": "0.5rem",
  "spacing-md": "1rem",
  "spacing-lg": "1.5rem",
  "spacing-xl": "2rem",
  "spacing-2xl": "3rem",

  // 字体
  "font-family-base":
    "Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  "font-family-heading":
    "Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  "font-family-mono": "JetBrains Mono, Menlo, Monaco, monospace",

  // 字号
  "font-size-xs": "0.75rem",
  "font-size-sm": "0.875rem",
  "font-size-base": "1rem",
  "font-size-lg": "1.125rem",
  "font-size-xl": "1.25rem",
  "font-size-2xl": "1.5rem",
  "font-size-3xl": "1.875rem",

  // 圆角
  "radius-sm": "0.25rem",
  "radius-md": "0.375rem",
  "radius-lg": "0.5rem",
  "radius-xl": "0.75rem",
  "radius-full": "9999px",

  // 阴影
  "shadow-sm": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  "shadow-md":
    "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  "shadow-lg":
    "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  "shadow-xl":
    "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",

  // 断点
  "breakpoint-sm": "640px",
  "breakpoint-md": "768px",
  "breakpoint-lg": "1024px",
  "breakpoint-xl": "1280px",
  "breakpoint-2xl": "1536px",

  // 动画
  "transition-fast": "150ms ease",
  "transition-normal": "250ms ease",
  "transition-slow": "350ms ease",

  // 层级
  "z-dropdown": "1000",
  "z-sticky": "1020",
  "z-fixed": "1030",
  "z-modal": "1040",
  "z-popover": "1050",
  "z-tooltip": "1060",
};

/**
 * 合并设计令牌
 *
 * @param baseTokens 基础令牌
 * @param overrideTokens 覆盖令牌
 * @returns 合并后的令牌
 */
export function mergeTokens(
  baseTokens: DesignTokens,
  overrideTokens?: Partial<DesignTokens>
): DesignTokens {
  return { ...baseTokens, ...overrideTokens };
}

/**
 * 将设计令牌转换为 CSS 变量
 *
 * @param tokens 设计令牌
 * @returns CSS 变量字符串
 */
export function tokensToCSS(tokens: DesignTokens): string {
  return Object.entries(tokens)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => `--${key}: ${value};`)
    .join(" ");
}

/**
 * TokenStyle 组件
 *
 * 将设计令牌注入到页面的 CSS 变量中
 */
export interface TokenStyleProps {
  tokens: DesignTokens;
  selector?: string;
}

export function TokenStyle({ tokens, selector = ":root" }: TokenStyleProps) {
  const cssText = `${selector} { ${tokensToCSS(tokens)} }`;

  return React.createElement("style", {
    dangerouslySetInnerHTML: { __html: cssText },
    "data-theme-tokens": true,
  });
}

/**
 * 主题特定的令牌生成器工厂
 *
 * @param baseTokens 基础令牌
 * @returns 令牌生成器函数
 */
export function createTokenGenerator(baseTokens: DesignTokens) {
  return function generateTokens(
    siteTokens?: Partial<DesignTokens>
  ): DesignTokens {
    return mergeTokens(baseTokens, siteTokens);
  };
}

/**
 * 从 CSS 变量获取令牌值
 *
 * @param tokenName 令牌名称
 * @param element 元素（可选，默认为 document.documentElement）
 * @returns 令牌值
 */
export function getTokenValue(
  tokenName: string,
  element?: HTMLElement
): string | null {
  if (typeof window === "undefined") return null;

  const el = element || document.documentElement;
  return getComputedStyle(el).getPropertyValue(`--${tokenName}`).trim();
}

/**
 * 设置 CSS 变量值
 *
 * @param tokenName 令牌名称
 * @param value 令牌值
 * @param element 元素（可选，默认为 document.documentElement）
 */
export function setTokenValue(
  tokenName: string,
  value: string,
  element?: HTMLElement
): void {
  if (typeof window === "undefined") return;

  const el = element || document.documentElement;
  el.style.setProperty(`--${tokenName}`, value);
}

/**
 * 批量设置令牌值
 *
 * @param tokens 令牌对象
 * @param element 元素（可选，默认为 document.documentElement）
 */
export function setTokens(
  tokens: Partial<DesignTokens>,
  element?: HTMLElement
): void {
  if (typeof window === "undefined") return;

  Object.entries(tokens).forEach(([key, value]) => {
    if (value !== undefined) {
      setTokenValue(key, value, element);
    }
  });
}

/**
 * 清除所有主题令牌
 *
 * @param element 元素（可选，默认为 document.documentElement）
 */
export function clearTokens(element?: HTMLElement): void {
  if (typeof window === "undefined") return;

  const el = element || document.documentElement;

  Object.keys(defaultTokens).forEach((key) => {
    el.style.removeProperty(`--${key}`);
  });
}
