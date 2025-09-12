/**
 * 上海站主题演示页面
 *
 * 展示地方站如何使用主题系统
 */

import React from "react";
import { headers } from "next/headers";
import { loadTheme, pickLayout } from "@/lib/theme-loader";
import { TokenStyle } from "@/lib/tokens";

// 模拟获取站点配置
async function getSiteSettings(host: string) {
  return {
    theme_key: "localsite-default",
    theme_version: "1.0.0",
    layout_key: "layout-localsite-grid",
    brand_tokens: {
      primary: "#059669", // 上海站特有的绿色
      secondary: "#6B7280",
      "font-family-heading": "PingFang SC, Helvetica Neue, sans-serif",
    },
    modules: {
      home: ["local-hero", "local-news"],
      sidebar: ["weather", "services", "contact"],
    },
    customized: true, // 启用站点覆盖
  };
}

export const revalidate = 120;

export default async function ShanghaiThemeDemoPage() {
  const headersList = await headers();
  const host = headersList.get("host") || "shanghai.aivoya.com";

  try {
    const settings = await getSiteSettings(host);
    const theme = await loadTheme(settings.theme_key, settings.theme_version);
    const Layout = await pickLayout(theme, settings.layout_key, host);
    const tokens = theme.tokens(settings.brand_tokens);

    return (
      <Layout>
        <TokenStyle tokens={tokens} />

        <div className="space-y-8">
          {/* 本地特色横幅 */}
          <section
            className="relative py-16 px-6 rounded-lg text-white text-center"
            style={{ backgroundColor: `var(--primary)` }}
          >
            <h1 className="text-4xl font-bold mb-4">上海本地新闻</h1>
            <p className="text-xl opacity-90 max-w-2xl mx-auto">
              关注上海最新动态，服务本地社区
            </p>
          </section>

          {/* 主题信息卡片 */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              地方站主题配置
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">主题信息</h3>
                <p className="text-sm text-gray-600">主题: {theme.key}</p>
                <p className="text-sm text-gray-600">版本: {theme.version}</p>
                <p className="text-sm text-gray-600">
                  布局: {settings.layout_key}
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">站点配置</h3>
                <p className="text-sm text-gray-600">主机: {host}</p>
                <p className="text-sm text-gray-600">
                  定制覆盖: {settings.customized ? "启用" : "禁用"}
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">品牌色彩</h3>
                <div className="flex space-x-2">
                  <div
                    className="w-8 h-8 rounded"
                    style={{ backgroundColor: tokens.primary }}
                    title={`Primary: ${tokens.primary}`}
                  ></div>
                  <div
                    className="w-8 h-8 rounded"
                    style={{ backgroundColor: tokens.secondary }}
                    title={`Secondary: ${tokens.secondary}`}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* 本地新闻模拟 */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-900">
                上海本地资讯
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  {
                    title: "上海地铁新线路开通",
                    time: "2小时前",
                    category: "交通",
                  },
                  {
                    title: "浦东新区政策更新",
                    time: "4小时前",
                    category: "政务",
                  },
                  {
                    title: "上海天气预报",
                    time: "6小时前",
                    category: "生活",
                  },
                  {
                    title: "本地活动推荐",
                    time: "8小时前",
                    category: "文化",
                  },
                ].map((news, index) => (
                  <div key={index} className="flex space-x-3">
                    <div
                      className="flex-shrink-0 w-2 h-16 rounded"
                      style={{ backgroundColor: `var(--primary)` }}
                    ></div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-1">
                        {news.title}
                      </h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <span
                          className="px-2 py-1 rounded text-white text-xs"
                          style={{ backgroundColor: `var(--secondary)` }}
                        >
                          {news.category}
                        </span>
                        <span>{news.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 主题对比 */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              主题对比演示
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  当前主题 (地方站)
                </h3>
                <div className="space-y-3">
                  <button
                    className="w-full px-4 py-2 rounded-md text-white font-medium"
                    style={{ backgroundColor: `var(--primary)` }}
                  >
                    地方站按钮
                  </button>
                  <div
                    className="p-4 rounded-lg border-l-4 bg-gray-50"
                    style={{ borderLeftColor: `var(--primary)` }}
                  >
                    <p className="text-sm text-gray-600">
                      地方站特色卡片，使用温和的绿色调
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  门户主题对比
                </h3>
                <div className="space-y-3">
                  <button className="w-full px-4 py-2 rounded-md text-white font-medium bg-blue-600">
                    门户站按钮
                  </button>
                  <div className="p-4 rounded-lg border-l-4 border-blue-600 bg-gray-50">
                    <p className="text-sm text-gray-600">
                      门户站卡片，使用现代的蓝色调
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 技术信息 */}
          <details className="bg-gray-50 rounded-lg p-6">
            <summary className="cursor-pointer text-lg font-medium text-gray-900 mb-4">
              技术实现详情
            </summary>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  主题加载流程:
                </h4>
                <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                  <li>从 SiteSettings 获取主题配置</li>
                  <li>通过 ThemeRegistry 动态加载主题模块</li>
                  <li>解析语义化版本到目录版本</li>
                  <li>选择布局组件 (含 overrides 支持)</li>
                  <li>生成和注入 CSS 变量</li>
                </ol>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">当前配置:</h4>
                <pre className="bg-white p-3 rounded border text-xs overflow-x-auto">
                  {JSON.stringify(
                    {
                      host,
                      theme_key: settings.theme_key,
                      layout_key: settings.layout_key,
                      brand_tokens: settings.brand_tokens,
                      customized: settings.customized,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          </details>
        </div>
      </Layout>
    );
  } catch (error) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-6">
          <div className="text-red-500 text-4xl mb-4">🚫</div>
          <h1 className="text-xl font-bold text-red-900 mb-2">
            上海站主题加载失败
          </h1>
          <p className="text-red-700 text-sm">
            {error instanceof Error ? error.message : "未知错误"}
          </p>
        </div>
      </div>
    );
  }
}
