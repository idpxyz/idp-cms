/**
 * 主题演示页面
 *
 * 展示如何使用新的主题系统
 */

import React from "react";
import { headers } from "next/headers";
import { loadTheme, pickLayout } from "@/lib/theme-loader";
import { TokenStyle } from "@/lib/tokens";

// 模拟获取站点配置（实际应该从 API 获取）
async function getSiteSettings(host: string) {
  // 这里应该调用实际的 API
  return {
    theme_key: "portal",
    theme_version: "1.0.0",
    layout_key: "layout-portal-classic",
    brand_tokens: {
      primary: "#0A7EFA",
      secondary: "#1E40AF",
    },
    modules: {
      home: ["hero", "stats", "features"],
      sidebar: ["news", "weather"],
    },
  };
}

export const revalidate = 120; // ISR 缓存 2 分钟

export default async function ThemeDemoPage() {
  // 获取主机名
  const headersList = await headers();
  const host = headersList.get("host") || "localhost";

  try {
    // 获取站点配置
    const settings = await getSiteSettings(host);

    // 加载主题
    const theme = await loadTheme(settings.theme_key, settings.theme_version);

    // 选择布局
    const Layout = await pickLayout(theme, settings.layout_key, host);

    // 生成设计令牌
    const tokens = theme.tokens(settings.brand_tokens);

    return (
      <Layout>
        {/* 注入 CSS 变量 */}
        <TokenStyle tokens={tokens} />

        {/* 页面内容 */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">
            主题系统演示
          </h1>

          {/* 主题信息 */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              当前主题信息
            </h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">主题标识</dt>
                <dd className="mt-1 text-sm text-gray-900">{theme.key}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">主题版本</dt>
                <dd className="mt-1 text-sm text-gray-900">{theme.version}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">布局标识</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {settings.layout_key}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">主机名</dt>
                <dd className="mt-1 text-sm text-gray-900">{host}</dd>
              </div>
            </dl>
          </div>

          {/* 设计令牌展示 */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              设计令牌演示
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div
                  className="w-16 h-16 mx-auto rounded-lg mb-2"
                  style={{ backgroundColor: `var(--primary)` }}
                ></div>
                <p className="text-sm font-medium">Primary</p>
                <p className="text-xs text-gray-500">{tokens.primary}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div
                  className="w-16 h-16 mx-auto rounded-lg mb-2"
                  style={{ backgroundColor: `var(--secondary)` }}
                ></div>
                <p className="text-sm font-medium">Secondary</p>
                <p className="text-xs text-gray-500">{tokens.secondary}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div
                  className="w-16 h-16 mx-auto rounded-lg mb-2"
                  style={{ backgroundColor: `var(--accent)` }}
                ></div>
                <p className="text-sm font-medium">Accent</p>
                <p className="text-xs text-gray-500">{tokens.accent}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div
                  className="w-16 h-16 mx-auto rounded-lg mb-2"
                  style={{ backgroundColor: `var(--success)` }}
                ></div>
                <p className="text-sm font-medium">Success</p>
                <p className="text-xs text-gray-500">{tokens.success}</p>
              </div>
            </div>
          </div>

          {/* 组件示例 */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              组件示例
            </h2>
            <div className="space-y-4">
              {/* 按钮组 */}
              <div className="flex flex-wrap gap-3">
                <button
                  className="px-4 py-2 rounded-md text-white font-medium transition-colors"
                  style={{ backgroundColor: `var(--primary)` }}
                >
                  Primary Button
                </button>
                <button
                  className="px-4 py-2 rounded-md text-white font-medium transition-colors"
                  style={{ backgroundColor: `var(--secondary)` }}
                >
                  Secondary Button
                </button>
                <button
                  className="px-4 py-2 rounded-md text-white font-medium transition-colors"
                  style={{ backgroundColor: `var(--accent)` }}
                >
                  Accent Button
                </button>
              </div>

              {/* 卡片 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  className="p-4 rounded-lg border-l-4"
                  style={{ borderLeftColor: `var(--primary)` }}
                >
                  <h3 className="font-semibold text-gray-900 mb-2">信息卡片</h3>
                  <p className="text-gray-600 text-sm">
                    这是一个使用主题颜色的信息卡片示例。
                  </p>
                </div>
                <div
                  className="p-4 rounded-lg border-l-4"
                  style={{ borderLeftColor: `var(--success)` }}
                >
                  <h3 className="font-semibold text-gray-900 mb-2">成功状态</h3>
                  <p className="text-gray-600 text-sm">
                    这是一个使用成功状态颜色的卡片示例。
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 配置信息 */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              配置信息
            </h2>
            <details className="text-sm">
              <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                查看完整配置 (JSON)
              </summary>
              <pre className="bg-white p-4 rounded border overflow-x-auto text-xs">
                {JSON.stringify(
                  {
                    theme: theme,
                    settings: settings,
                    tokens: tokens,
                  },
                  null,
                  2
                )}
              </pre>
            </details>
          </div>
        </div>
      </Layout>
    );
  } catch (error) {
    console.error("Failed to load theme:", error);

    // 错误回退页面
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-red-900 mb-2">主题加载失败</h1>
          <p className="text-red-700 mb-4">
            无法加载主题配置，请检查主题注册表和配置文件。
          </p>
          <details className="text-left text-sm text-red-600">
            <summary className="cursor-pointer">错误详情</summary>
            <pre className="mt-2 p-2 bg-white rounded border text-xs overflow-x-auto">
              {error instanceof Error ? error.message : String(error)}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}
