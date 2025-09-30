/**
 * Zod Schema 验证系统
 *
 * 实施 BestThemeOptimize.md 的前端类型安全策略：
 * - 强校验 brand_tokens 和 modules
 * - 异常配置回退到默认值
 * - 错误上报到监控系统
 */

import { z } from "zod";

/**
 * 颜色值验证（十六进制）
 */
const ColorSchema = z
  .string()
  .regex(
    /^#([0-9A-Fa-f]{3}){1,2}$/,
    "必须是有效的十六进制颜色值（如 #FF0000 或 #F00）"
  );

/**
 * CSS 单位值验证
 */
const CSSUnitSchema = z
  .string()
  .regex(
    /^[0-9]+(\.[0-9]+)?(px|rem|em|%|vh|vw)$/,
    "必须是有效的CSS单位值（如 1rem, 10px, 100%）"
  );

/**
 * 字体家族验证
 */
const FontFamilySchema = z.string().min(1).max(200);

/**
 * 品牌设计令牌 Schema
 */
export const BrandTokensSchema = z
  .object({
    // 颜色令牌
    primary: ColorSchema.optional(),
    secondary: ColorSchema.optional(),
    accent: ColorSchema.optional(),
    background: ColorSchema.optional(),
    surface: ColorSchema.optional(),
    error: ColorSchema.optional(),
    warning: ColorSchema.optional(),
    success: ColorSchema.optional(),
    info: ColorSchema.optional(),

    // 文本颜色
    "text-primary": ColorSchema.optional(),
    "text-secondary": ColorSchema.optional(),
    "text-muted": ColorSchema.optional(),
    "text-inverse": ColorSchema.optional(),

    // 间距令牌
    "spacing-xs": CSSUnitSchema.optional(),
    "spacing-sm": CSSUnitSchema.optional(),
    "spacing-md": CSSUnitSchema.optional(),
    "spacing-lg": CSSUnitSchema.optional(),
    "spacing-xl": CSSUnitSchema.optional(),
    "spacing-2xl": CSSUnitSchema.optional(),

    // 字体令牌
    "font-family-base": FontFamilySchema.optional(),
    "font-family-heading": FontFamilySchema.optional(),
    "font-family-mono": FontFamilySchema.optional(),

    // 字号令牌
    "font-size-xs": CSSUnitSchema.optional(),
    "font-size-sm": CSSUnitSchema.optional(),
    "font-size-base": CSSUnitSchema.optional(),
    "font-size-lg": CSSUnitSchema.optional(),
    "font-size-xl": CSSUnitSchema.optional(),
    "font-size-2xl": CSSUnitSchema.optional(),
    "font-size-3xl": CSSUnitSchema.optional(),

    // 圆角令牌
    "radius-sm": CSSUnitSchema.optional(),
    "radius-md": CSSUnitSchema.optional(),
    "radius-lg": CSSUnitSchema.optional(),
    "radius-xl": CSSUnitSchema.optional(),
    "radius-full": CSSUnitSchema.optional(),
  })
  .strict(); // 严格模式，不允许额外属性

export type BrandTokens = z.infer<typeof BrandTokensSchema>;

/**
 * 模块名称白名单
 */
const ALLOWED_MODULES = [
  // 门户模块
  "hero",
  "stats",
  "features",
  "news-grid",
  "featured-carousel",
  "cta",

  // 地方站模块
  "local-hero",
  "local-news",
  "local-events",

  // 侧边栏模块
  "weather",
  "traffic",
  "services",
  "contact",
  "trending",
  "categories",
  "newsletter",
  "ranking",
  "ads",
] as const;

type AllowedModule = (typeof ALLOWED_MODULES)[number];

/**
 * 模块配置 Schema
 */
export const ModulesSchema = z
  .object({
    home: z.array(z.enum(ALLOWED_MODULES)).optional(),
    sidebar: z.array(z.enum(ALLOWED_MODULES)).optional(),
    header: z.array(z.enum(ALLOWED_MODULES)).optional(),
    footer: z.array(z.enum(ALLOWED_MODULES)).optional(),
  })
  .strict();

export type Modules = z.infer<typeof ModulesSchema>;

/**
 * 站点设置 Schema（完整版）
 */
export const SiteSettingsSchema = z.object({
  // 基本信息
  site_name: z.string().min(1).max(100),
  theme_key: z.enum(["portal", "localsite-default", "magazine"]),
  theme_version: z.string().regex(/^\d+\.\d+\.\d+$/, "必须是语义化版本号"),
  layout_key: z.string().min(1).max(64),

  // 主题配置
  brand_tokens: BrandTokensSchema,
  modules: ModulesSchema,
  customized: z.boolean(),

  // 品牌信息
  brand_name: z.string().max(200).optional(),
  default_title: z.string().max(200).optional(),
  default_description: z.string().max(500).optional(),
  primary_color: ColorSchema.optional(),

  // 性能配置
  cache_timeout: z.number().min(60).max(86400),

  // 元数据
  hostname: z.string(),
  updated_at: z.string().datetime(),
  is_production: z.boolean(),
});

export type SiteSettings = z.infer<typeof SiteSettingsSchema>;

/**
 * 验证品牌令牌
 */
export function validateBrandTokens(data: unknown): BrandTokens {
  try {
    return BrandTokensSchema.parse(data);
  } catch (error) {
    console.warn("Invalid brand tokens, using defaults:", error);

    // 上报错误到监控系统
    reportValidationError("brand_tokens", error, data);

    // 返回安全的默认值
    return {};
  }
}

/**
 * 验证模块配置
 */
export function validateModules(data: unknown): Modules {
  try {
    return ModulesSchema.parse(data);
  } catch (error) {
    console.warn("Invalid modules config, using defaults:", error);

    // 上报错误到监控系统
    reportValidationError("modules", error, data);

    // 返回安全的默认值
    return {
      home: ["hero"],
      sidebar: [],
    };
  }
}

/**
 * 验证完整站点设置
 */
export function validateSiteSettings(data: unknown): SiteSettings | null {
  try {
    return SiteSettingsSchema.parse(data);
  } catch (error) {
    console.error("Critical: Invalid site settings:", error);

    // 站点设置验证失败是严重问题，需要立即上报
    reportValidationError("site_settings", error, data, true);

    return null;
  }
}

/**
 * 错误上报函数
 */
function reportValidationError(
  field: string,
  error: unknown,
  data: unknown,
  critical: boolean = false
): void {
  const errorInfo = {
    type: "validation_error",
    field,
    error: error instanceof Error ? error.message : String(error),
    data: typeof data === "object" ? JSON.stringify(data) : String(data),
    timestamp: new Date().toISOString(),
    critical,
  };

  // 开发环境：控制台输出
  if (process.env.NODE_ENV === "development") {
    console.error("Validation Error:", errorInfo);
  }

  // 生产环境：上报到监控系统
  if (typeof window !== "undefined") {
    // Google Analytics
    if (window.gtag) {
      window.gtag("event", "validation_error", {
        field_name: field,
        error_type: critical ? "critical" : "warning",
        custom_parameter: errorInfo.error,
      });
    }

    // Sentry（如果集成了）
    if (window.Sentry) {
      if (critical) {
        window.Sentry.captureException(
          new Error(`Critical validation error in ${field}`),
          {
            extra: errorInfo,
          }
        );
      } else {
        window.Sentry.addBreadcrumb({
          category: "validation",
          message: `Validation warning in ${field}`,
          level: "warning",
          data: errorInfo,
        });
      }
    }

    // 自定义监控端点
    if (process.env.NEXT_PUBLIC_MONITORING_ENDPOINT) {
      fetch(process.env.NEXT_PUBLIC_MONITORING_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "validation_error",
          payload: errorInfo,
        }),
      }).catch((err) => {
        console.warn("Failed to report validation error:", err);
      });
    }
  }
}

/**
 * 获取默认品牌令牌
 */
export function getDefaultBrandTokens(): BrandTokens {
  return {
    primary: "#3B82F6",
    secondary: "#6B7280",
    accent: "#8B5CF6",
    background: "#FFFFFF",
    surface: "#F8FAFC",
  };
}

/**
 * 获取默认模块配置
 */
export function getDefaultModules(): Modules {
  return {
    home: ["hero"],
    sidebar: [],
  };
}

/**
 * 合并令牌（安全版本）
 */
export function mergeTokensSafely(
  baseTokens: BrandTokens,
  userTokens: unknown
): BrandTokens {
  const validatedUserTokens = validateBrandTokens(userTokens);
  return { ...baseTokens, ...validatedUserTokens };
}

/**
 * 检查模块是否被允许
 */
export function isAllowedModule(
  moduleName: string
): moduleName is AllowedModule {
  return ALLOWED_MODULES.includes(moduleName as AllowedModule);
}

/**
 * 过滤无效模块
 */
export function filterValidModules(modules: string[]): AllowedModule[] {
  return modules.filter(isAllowedModule);
}

// 类型声明扩展
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    Sentry?: {
      captureException: (error: Error, context?: any) => void;
      addBreadcrumb: (breadcrumb: any) => void;
    };
  }
}
