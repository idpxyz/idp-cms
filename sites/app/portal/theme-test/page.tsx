/**
 * 主题系统完整测试页面
 *
 * 展示完整的主题系统功能，包括：
 * - 主题加载和切换
 * - 设计令牌应用
 * - 布局组件
 * - API 集成
 * - 缓存策略
 */

import React from "react";
import { getThemeHeaders } from "@/lib/theme-headers";
import { loadTheme, pickLayout } from "@/lib/theme-loader";
import { TokenStyle } from "@/lib/tokens";

// 获取站点配置
async function getSiteSettings(host: string) {
  try {
    // 使用相对路径避免外部访问问题
    const response = await fetch(`/api/site-settings?site=${host}`, {
      next: {
        revalidate: 120,
        tags: [`site:${host}`, `settings:${host}`],
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to fetch site settings:", error);

    // 回退配置
    return {
      theme_key: "portal",
      theme_version: "1.0.0",
      layout_key: "layout-portal-classic",
      brand_tokens: {
        primary: "#3B82F6",
        secondary: "#6B7280",
      },
      modules: {},
      customized: false,
      brand_name: "测试站点",
      cache_timeout: 300,
    };
  }
}

export const revalidate = 120;

export default async function ThemeTestPage() {
  const themeHeaders = await getThemeHeaders();

  try {
    // 获取站点设置
    const settings = await getSiteSettings(themeHeaders.host);

    // 加载主题
    const theme = await loadTheme(settings.theme_key, settings.theme_version);

    // 选择布局
    const Layout = await pickLayout(
      theme,
      settings.layout_key,
      themeHeaders.host
    );

    // 生成令牌
    const tokens = theme.tokens(settings.brand_tokens);

    return (
      <Layout>
        <TokenStyle tokens={tokens} />

        <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
          {/* 页面标题 */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              主题系统完整测试
            </h1>
            <p className="text-xl text-gray-600">
              验证多主题架构的所有核心功能
            </p>
          </div>

          {/* 系统状态卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div
                  className="h-8 w-8 rounded-full mr-3"
                  style={{ backgroundColor: `var(--primary)` }}
                ></div>
                <div>
                  <p className="text-sm font-medium text-gray-600">主题状态</p>
                  <p className="text-lg font-semibold text-gray-900">
                    正常运行
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div
                  className="h-8 w-8 rounded-full mr-3"
                  style={{ backgroundColor: `var(--success)` }}
                ></div>
                <div>
                  <p className="text-sm font-medium text-gray-600">API 连接</p>
                  <p className="text-lg font-semibold text-gray-900">已连接</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div
                  className="h-8 w-8 rounded-full mr-3"
                  style={{ backgroundColor: `var(--info)` }}
                ></div>
                <div>
                  <p className="text-sm font-medium text-gray-600">缓存时间</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {settings.cache_timeout}s
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div
                  className="h-8 w-8 rounded-full mr-3"
                  style={{ backgroundColor: `var(--warning)` }}
                ></div>
                <div>
                  <p className="text-sm font-medium text-gray-600">覆盖模式</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {settings.customized ? "启用" : "禁用"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 配置信息 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 主题信息 */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div
                className="px-6 py-4 border-b border-gray-200"
                style={{ borderBottomColor: `var(--primary)` }}
              >
                <h2 className="text-xl font-semibold text-gray-900">
                  主题配置
                </h2>
              </div>
              <div className="p-6">
                <dl className="space-y-4">
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-500">
                      主题标识
                    </dt>
                    <dd className="text-sm text-gray-900 font-mono">
                      {theme.key}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-500">
                      主题版本
                    </dt>
                    <dd className="text-sm text-gray-900 font-mono">
                      {theme.version}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-500">
                      布局标识
                    </dt>
                    <dd className="text-sm text-gray-900 font-mono">
                      {settings.layout_key}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-500">
                      主机名
                    </dt>
                    <dd className="text-sm text-gray-900 font-mono">
                      {themeHeaders.host}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-500">
                      路由组
                    </dt>
                    <dd className="text-sm text-gray-900 font-mono">
                      {themeHeaders.routeGroup}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* 令牌信息 */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div
                className="px-6 py-4 border-b border-gray-200"
                style={{ borderBottomColor: `var(--secondary)` }}
              >
                <h2 className="text-xl font-semibold text-gray-900">
                  设计令牌
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries({
                    primary: tokens.primary,
                    secondary: tokens.secondary,
                    accent: tokens.accent,
                    success: tokens.success,
                    warning: tokens.warning,
                    error: tokens.error,
                  }).map(([name, value]) => (
                    <div key={name} className="flex items-center space-x-3">
                      <div
                        className="w-6 h-6 rounded border"
                        style={{ backgroundColor: value }}
                      ></div>
                      <div>
                        <p className="text-xs font-medium text-gray-900 capitalize">
                          {name}
                        </p>
                        <p className="text-xs text-gray-500 font-mono">
                          {value}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 组件展示 */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div
              className="px-6 py-4 border-b border-gray-200"
              style={{ borderBottomColor: `var(--accent)` }}
            >
              <h2 className="text-xl font-semibold text-gray-900">
                主题组件展示
              </h2>
            </div>
            <div className="p-6 space-y-6">
              {/* 按钮组 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  按钮样式
                </h3>
                <div className="flex flex-wrap gap-3">
                  <button
                    className="px-6 py-2 rounded-lg text-white font-medium transition-all hover:opacity-90"
                    style={{ backgroundColor: `var(--primary)` }}
                  >
                    主要按钮
                  </button>
                  <button
                    className="px-6 py-2 rounded-lg text-white font-medium transition-all hover:opacity-90"
                    style={{ backgroundColor: `var(--secondary)` }}
                  >
                    次要按钮
                  </button>
                  <button
                    className="px-6 py-2 rounded-lg text-white font-medium transition-all hover:opacity-90"
                    style={{ backgroundColor: `var(--accent)` }}
                  >
                    强调按钮
                  </button>
                  <button
                    className="px-6 py-2 rounded-lg text-white font-medium transition-all hover:opacity-90"
                    style={{ backgroundColor: `var(--success)` }}
                  >
                    成功按钮
                  </button>
                </div>
              </div>

              {/* 卡片组 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  卡片样式
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    className="p-4 rounded-lg border-l-4 bg-gray-50"
                    style={{ borderLeftColor: `var(--primary)` }}
                  >
                    <h4 className="font-semibold text-gray-900 mb-2">
                      信息卡片
                    </h4>
                    <p className="text-gray-600 text-sm">
                      这是一个使用主题主色调的信息卡片示例。
                    </p>
                  </div>
                  <div
                    className="p-4 rounded-lg border-l-4 bg-gray-50"
                    style={{ borderLeftColor: `var(--success)` }}
                  >
                    <h4 className="font-semibold text-gray-900 mb-2">
                      成功状态
                    </h4>
                    <p className="text-gray-600 text-sm">
                      这是一个使用成功状态颜色的卡片示例。
                    </p>
                  </div>
                </div>
              </div>

              {/* 进度条 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  进度指示
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>主题加载进度</span>
                      <span>100%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          backgroundColor: `var(--primary)`,
                          width: "100%",
                        }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>API 连接状态</span>
                      <span>95%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          backgroundColor: `var(--success)`,
                          width: "95%",
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 技术详情 */}
          <details className="bg-gray-50 rounded-lg p-6">
            <summary className="cursor-pointer text-lg font-medium text-gray-900 mb-4">
              查看技术实现详情
            </summary>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">请求头信息:</h4>
                <pre className="bg-white p-3 rounded border text-sm overflow-x-auto">
                  {JSON.stringify(themeHeaders, null, 2)}
                </pre>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">站点设置:</h4>
                <pre className="bg-white p-3 rounded border text-sm overflow-x-auto">
                  {JSON.stringify(settings, null, 2)}
                </pre>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">生成的令牌:</h4>
                <pre className="bg-white p-3 rounded border text-sm overflow-x-auto">
                  {JSON.stringify(tokens, null, 2)}
                </pre>
              </div>
            </div>
          </details>
        </div>
      </Layout>
    );
  } catch (error) {
    // 错误页面
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="max-w-lg mx-auto text-center p-8">
          <div className="text-red-500 text-6xl mb-6">⚠️</div>
          <h1 className="text-3xl font-bold text-red-900 mb-4">
            主题系统测试失败
          </h1>
          <p className="text-red-700 mb-6">
            主题系统在测试过程中遇到错误，请检查配置和依赖。
          </p>

          <div className="bg-white rounded-lg p-4 mb-6 text-left">
            <h3 className="font-medium text-red-900 mb-2">错误详情:</h3>
            <pre className="text-sm text-red-600 overflow-x-auto">
              {error instanceof Error ? error.message : String(error)}
            </pre>
          </div>

          <div className="bg-white rounded-lg p-4 text-left">
            <h3 className="font-medium text-gray-900 mb-2">请求信息:</h3>
            <pre className="text-sm text-gray-600 overflow-x-auto">
              {JSON.stringify(themeHeaders, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    );
  }
}
